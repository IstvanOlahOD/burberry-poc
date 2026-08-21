/**
 * Warms the CDN from inside the deployment's own region.
 *
 * Why this exists: a CDN PoP is only populated by requests that actually arrive
 * at it. Running `scripts/prewarm.mjs` from a laptop warms whichever PoP is
 * nearest that laptop — from Bucharest that is `fra1`, so every run had been
 * filling Frankfurt while the audience for this build is in London.
 *
 * Functions run in `lhr1` (see `vercel.json` → `regions`), so this route's own
 * outbound `fetch` calls leave from London and are served by the London edge,
 * which is what populates it. `preferredRegion` is deprecated in this version of
 * Next and must not be used — the region comes from `vercel.json` alone.
 *
 * The URL list is not rebuilt here: it is read from `/api/prewarm`, which is
 * already the single source of truth for what the app requests. Duplicating the
 * builders would let the two drift.
 *
 * Paged deliberately. A function has a wall-clock limit, so `offset`/`limit`
 * make a long job a sequence of short calls rather than one that dies at the
 * timeout with no report of what it managed.
 *
 * NOTE ON EXPOSURE: this endpoint performs work on request. `/api/prewarm` only
 * lists URLs, which is cheap; this one fetches them, and a cache miss can reach
 * the upstream render service. `MAX_LIMIT` bounds a single call, but if this is
 * kept past the demo it should sit behind a shared secret rather than being open.
 */

const CONCURRENCY = 6;

/** Bounds the work one call can start. */
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 100;

/** Leaves headroom under the function's wall clock to still return a report. */
export const maxDuration = 60;

/** Never prerender: the whole point is the request-time side effect. */
export const dynamic = "force-dynamic";

type Outcome = {
  ok: boolean;
  status: number;
  cache: string;
  source: string;
  /** First segment of `x-vercel-id` — the edge PoP that served it. */
  pop: string;
  bytes: number;
};

async function warmOne(url: string): Promise<Outcome> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { accept: "image/avif,image/webp,image/*" },
    });
    // Read the body so the edge stores a complete response rather than aborting.
    const body = await response.arrayBuffer();
    return {
      ok: response.ok,
      status: response.status,
      cache: response.headers.get("x-vercel-cache") ?? "n/a",
      source: response.headers.get("x-render-source") ?? "n/a",
      pop: (response.headers.get("x-vercel-id") ?? "n/a").split("::")[0],
      bytes: body.byteLength,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      cache: "error",
      source: error instanceof Error ? error.message.slice(0, 60) : "error",
      pop: "n/a",
      bytes: 0,
    };
  }
}

async function pool<T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<Outcome>,
): Promise<Outcome[]> {
  const results: Outcome[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await task(items[index]);
      }
    }),
  );
  return results;
}

function reject(reason: string): Response {
  return Response.json(
    { error: reason },
    { status: 400, headers: { "cache-control": "no-store" } },
  );
}

export async function GET(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const params = requestUrl.searchParams;

  const scope = params.get("scope") ?? "deploy";
  if (scope !== "deploy" && scope !== "variants") {
    return reject("scope must be 'deploy' or 'variants'");
  }

  const offset = Number(params.get("offset") ?? 0);
  const limit = Number(params.get("limit") ?? DEFAULT_LIMIT);
  if (!Number.isInteger(offset) || offset < 0) {
    return reject("offset must be a non-negative integer");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return reject(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }

  // Same origin as the request, so warming the production alias warms the alias
  // — cache keys include the host, and the alias is what visitors reach.
  const origin = requestUrl.origin;

  const listQuery = new URLSearchParams({ scope });
  for (const key of ["stride", "sizes"]) {
    const value = params.get(key);
    if (value) listQuery.set(key, value);
  }

  const listResponse = await fetch(`${origin}/api/prewarm?${listQuery}`, {
    cache: "no-store",
  });
  if (!listResponse.ok) {
    return Response.json(
      { error: `could not read the warm list: HTTP ${listResponse.status}` },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }

  const list = (await listResponse.json()) as { count: number; urls: string[] };
  const batch = list.urls.slice(offset, offset + limit).map((path) => `${origin}${path}`);

  const started = Date.now();
  const results = await pool(batch, CONCURRENCY, warmOne);

  const tally = (key: "cache" | "source" | "pop") =>
    results.reduce<Record<string, number>>((acc, result) => {
      acc[result[key]] = (acc[result[key]] ?? 0) + 1;
      return acc;
    }, {});

  const failed = results.filter((result) => !result.ok);

  return Response.json(
    {
      scope,
      offset,
      requested: batch.length,
      total: list.count,
      remaining: Math.max(0, list.count - (offset + batch.length)),
      warmed: results.length - failed.length,
      failed: failed.length,
      // The PoP tally is the point: it is the proof of which edge was filled.
      pop: tally("pop"),
      cache: tally("cache"),
      source: tally("source"),
      bytes: results.reduce((sum, result) => sum + result.bytes, 0),
      ms: Date.now() - started,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

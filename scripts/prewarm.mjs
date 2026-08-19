#!/usr/bin/env node
/**
 * Warms the render cache for a deployment.
 *
 * Vercel's CDN cache is per-deployment, so a fresh deploy serves every image
 * cold: ~830ms upstream render plus a transcode, 72 frames to a turntable. This
 * requests the whole default configuration once so the first real visitor gets
 * cache hits.
 *
 * Usage:
 *   node scripts/prewarm.mjs                       # defaults to production
 *   node scripts/prewarm.mjs http://localhost:3000
 *   BASE_URL=https://… node scripts/prewarm.mjs
 */

const BASE = (
  process.argv[2] ||
  process.env.BASE_URL ||
  "https://burberry-poc.vercel.app"
).replace(/\/$/, "");

/** Matches the client's warm pool; the render service multiplexes these fine. */
const CONCURRENCY = 6;

/** A cold frame is ~1.3s, so this only trips on something genuinely wrong. */
const REQUEST_TIMEOUT_MS = 30_000;

/** A deploy's alias can take a moment to point at the new build. */
const READY_TIMEOUT_MS = 90_000;
const READY_INTERVAL_MS = 3_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWarmList() {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let lastError = "never responded";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/api/prewarm`, {
        cache: "no-store",
      });
      if (response.ok) return await response.json();
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error.message;
    }
    process.stdout.write(`  waiting for ${BASE} (${lastError})\n`);
    await sleep(READY_INTERVAL_MS);
  }
  throw new Error(`${BASE} not ready after ${READY_TIMEOUT_MS}ms: ${lastError}`);
}

async function warm(path) {
  const started = Date.now();
  try {
    const response = await fetch(`${BASE}${path}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      // Read the body so the CDN stores a complete response.
      headers: { accept: "image/avif,image/webp,image/*" },
    });
    const body = await response.arrayBuffer();
    return {
      ok: response.ok,
      status: response.status,
      cache: response.headers.get("x-vercel-cache") ?? "n/a",
      bytes: body.byteLength,
      ms: Date.now() - started,
      path,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      cache: "error",
      bytes: 0,
      ms: Date.now() - started,
      path,
      error: error.message,
    };
  }
}

/** Runs `task` over every item with a fixed number of workers in flight. */
async function pool(items, limit, task) {
  const results = [];
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

const started = Date.now();
console.log(`Pre-warming ${BASE}`);

const list = await fetchWarmList();
console.log(`  revision ${list.revision}, ${list.count} URLs, ${CONCURRENCY} at a time\n`);

const results = await pool(list.urls, CONCURRENCY, warm);

const failed = results.filter((r) => !r.ok);
const byCache = results.reduce((acc, r) => {
  acc[r.cache] = (acc[r.cache] ?? 0) + 1;
  return acc;
}, {});
const totalBytes = results.reduce((acc, r) => acc + r.bytes, 0);
const slowest = results.reduce((a, b) => (b.ms > a.ms ? b : a));

console.log(`  warmed:   ${results.length - failed.length}/${results.length}`);
console.log(`  cache:    ${JSON.stringify(byCache)}`);
console.log(`  transfer: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`  slowest:  ${slowest.ms}ms`);
console.log(`  elapsed:  ${((Date.now() - started) / 1000).toFixed(1)}s`);

if (failed.length) {
  console.error(`\n${failed.length} request(s) failed:`);
  for (const f of failed.slice(0, 10)) {
    console.error(`  ${f.status || f.error} ${f.path}`);
  }
  process.exit(1);
}

console.log("\nCache warm.");

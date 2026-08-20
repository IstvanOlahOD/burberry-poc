import { createHash } from "node:crypto";
import { BlobNotFoundError, head, put } from "@vercel/blob";
import { RENDER_REVISION } from "./ripe";

/**
 * Durable store for finished renders.
 *
 * Vercel's CDN cache is scoped to a deployment, so without this every deploy
 * re-pays the upstream render (~830ms a frame) plus a transcode for every image
 * anyone looks at. Blob outlives deployments, so a render is produced once and
 * then served from storage.
 *
 * Authentication is OIDC: Vercel injects `VERCEL_OIDC_TOKEN` at runtime and
 * authorises the project against whichever store is *connected* to it. Merely
 * naming a store is not enough — an unconnected store rejects every call.
 *
 * Connecting a store through the dashboard can be given a prefix, which yields
 * `BLOB_<PREFIX>_STORE_ID` rather than the plain `BLOB_STORE_ID` the SDK looks
 * for. The id is therefore resolved here and passed explicitly, so the code
 * follows whatever Vercel provisioned instead of requiring one exact name.
 *
 * With no store id present this degrades to a no-op and the route behaves as it
 * did before, which keeps local development working.
 */

/**
 * Prefers the SDK's own name, then any prefixed variant Vercel created. Sorted
 * so the choice is stable when several exist.
 */
function resolveStoreId(): string | undefined {
  const explicit = process.env.BLOB_STORE_ID;
  if (explicit) return explicit;

  const prefixed = Object.keys(process.env)
    .filter((name) => /^BLOB_.+_STORE_ID$/.test(name))
    .sort();
  return prefixed.length ? process.env[prefixed[0]] : undefined;
}

const STORE_ID = resolveStoreId();

export function storeEnabled(): boolean {
  return Boolean(STORE_ID);
}

/**
 * Content-addressed key. The upstream URL fully determines the bytes, so
 * hashing it gives a stable name, and `RENDER_REVISION` prefixes the path so a
 * revision bump starts a clean namespace instead of colliding with superseded
 * encodings.
 */
export function renderKey(upstreamUrl: string, extension: string): string {
  const digest = createHash("sha256")
    .update(upstreamUrl)
    .digest("hex")
    .slice(0, 32);
  return `renders/v${RENDER_REVISION}/${digest}.${extension}`;
}

/**
 * `error` is kept distinct from `miss` on purpose. Treating them alike is how a
 * misconfigured store hid once already: every call failed, the route quietly
 * rendered upstream, and nothing said the store was doing no work at all.
 */
export type StoreRead =
  | { status: "hit"; bytes: ArrayBuffer }
  | { status: "miss" }
  | { status: "error" };

export async function readRender(key: string): Promise<StoreRead> {
  if (!STORE_ID) return { status: "miss" };
  try {
    const meta = await head(key, { storeId: STORE_ID });
    const response = await fetch(meta.url, { cache: "no-store" });
    if (!response.ok) return { status: "error" };
    return { status: "hit", bytes: await response.arrayBuffer() };
  } catch (error) {
    if (error instanceof BlobNotFoundError) return { status: "miss" };
    console.error("render store read failed", error);
    return { status: "error" };
  }
}

/**
 * Stores a render. Best-effort by design — the response has already been sent
 * by the time this runs — but failures are logged rather than swallowed, so a
 * store that is unreachable, unauthorised or full is visible in the logs.
 */
export async function writeRender(
  key: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  if (!STORE_ID) return;
  try {
    await put(key, Buffer.from(bytes), {
      storeId: STORE_ID,
      access: "public",
      contentType,
      // The key is already content-addressed, so a suffix would only create
      // duplicates that can never be found again.
      addRandomSuffix: false,
      // Harmless if the same render is produced twice concurrently.
      allowOverwrite: true,
      cacheControlMaxAge: 31_536_000,
    });
  } catch (error) {
    console.error("render store write failed", key, error);
  }
}

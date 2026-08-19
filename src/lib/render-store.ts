import { createHash } from "node:crypto";
import { head, put } from "@vercel/blob";
import { RENDER_REVISION } from "./ripe";

/**
 * Durable store for finished renders.
 *
 * Vercel's CDN cache is scoped to a deployment, so without this every deploy
 * re-pays the upstream render (~830ms a frame) plus a transcode for every image
 * anyone looks at. Blob outlives deployments, so a render is produced once and
 * then served from storage — measured in tens of milliseconds rather than
 * seconds.
 *
 * Absent a `BLOB_READ_WRITE_TOKEN` this degrades to a no-op and the route
 * behaves exactly as it did before, which keeps local development and any
 * deployment without a connected store working.
 */

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

export function storeEnabled(): boolean {
  return Boolean(TOKEN);
}

/**
 * Content-addressed key. The upstream URL fully determines the bytes, so
 * hashing it gives a stable name, and `RENDER_REVISION` prefixes the path so a
 * revision bump starts a clean namespace instead of colliding with superseded
 * encodings.
 */
export function renderKey(upstreamUrl: string, extension: string): string {
  const digest = createHash("sha256").update(upstreamUrl).digest("hex").slice(0, 32);
  return `renders/v${RENDER_REVISION}/${digest}.${extension}`;
}

/** The stored render, or null when absent, unconfigured, or unreachable. */
export async function readRender(key: string): Promise<ArrayBuffer | null> {
  if (!TOKEN) return null;
  try {
    // `head` throws BlobNotFoundError when the key has never been written.
    const meta = await head(key, { token: TOKEN });
    const response = await fetch(meta.url, { cache: "no-store" });
    if (!response.ok) return null;
    return await response.arrayBuffer();
  } catch {
    // A miss, or the store being unavailable, must never fail the request —
    // the caller falls back to rendering upstream.
    return null;
  }
}

/**
 * Stores a render. Failures are swallowed: the response has already been served
 * by the time this runs, and a store that is full or erroring should degrade to
 * "no durable cache", not to a broken image.
 */
export async function writeRender(
  key: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  if (!TOKEN) return;
  try {
    await put(key, Buffer.from(bytes), {
      token: TOKEN,
      access: "public",
      contentType,
      // The key is already content-addressed, so a suffix would only create
      // duplicates that can never be found again.
      addRandomSuffix: false,
      // Harmless if the same render is produced twice concurrently.
      allowOverwrite: true,
      cacheControlMaxAge: 31_536_000,
    });
  } catch {
    /* durable caching is best-effort */
  }
}

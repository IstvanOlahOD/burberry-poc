import { after } from "next/server";
import sharp from "sharp";
import {
  ALLOWED_SIZES,
  FALLBACK_FORMAT,
  RENDER_REVISION,
  FRAME_COUNT,
  PARTS,
  PART_ORDER,
  getPart,
  isFormat,
  normalizeInitials,
  upstreamComposeUrl,
  upstreamPreviewUrl,
  upstreamSwatchUrl,
  type Parts,
} from "@/lib/ripe";
import { readRender, renderKey, writeRender } from "@/lib/render-store";

/**
 * Image cache in front of the compose service.
 *
 * The service renders on demand — measured at ~830ms cold and ~230ms warm — and
 * has no shared cache in front of it, so every visitor otherwise pays that cost
 * themselves. Each render is fully determined by its parameters, which makes the
 * responses content-addressed and safe to cache forever: a different
 * configuration is simply a different URL. Serving them from this app's own
 * origin lets the CDN hold them, and drops a cross-origin TLS handshake.
 *
 * Parameters are validated against the model and the upstream URL is rebuilt
 * from the validated values, so this cannot be used as an open image proxy.
 *
 * AVIF is produced here rather than requested from the service, whose AVIF
 * encoder discards the alpha channel and returns cutouts on opaque black. We
 * fetch the WebP, which keeps its alpha, and re-encode. Measured at ~70ms per
 * frame for roughly half the bytes — negligible beside the ~830ms the upstream
 * render itself costs, and it only happens on a cache miss.
 *
 * Finished renders are also kept in Blob (see src/lib/render-store.ts), because
 * the CDN cache is per-deployment: without it every deploy re-pays the upstream
 * render for every image. With it, a render is produced once and afterwards read
 * from storage.
 */

/** RMSE against the source is ~1.1/255 here: no visible loss at half the size. */
const AVIF_QUALITY = 70;

/** Lower effort keeps encode near 70ms; higher settings buy very little. */
const AVIF_EFFORT = 2;

const IMMUTABLE = "public, max-age=31536000, s-maxage=31536000, immutable";

/** Errors are held briefly so an upstream blip isn't cached for a year. */
const ERROR_CACHE = "public, max-age=0, s-maxage=10";

function badRequest(reason: string): Response {
  return new Response(reason, {
    status: 400,
    headers: { "cache-control": "no-store" },
  });
}

/** Accepts the repeated `p=part:material:color` form, rejecting anything unknown. */
function parseParts(values: string[]): Parts | null {
  const parts: Parts = {};
  for (const name of PART_ORDER) parts[name] = null;

  for (const value of values) {
    const [name, material, color] = value.split(":");
    const definition = getPart(name);
    if (!definition) return null;
    const materialDefinition = definition.materials.find((m) => m.name === material);
    if (!materialDefinition) return null;
    if (!materialDefinition.colors.some((c) => c.name === color)) return null;
    parts[name] = { material, color };
  }
  return parts;
}

function parseFrame(value: string | null): string | null {
  const match = /^side-(\d{1,2})$/.exec(value ?? "");
  if (!match) return null;
  const index = Number(match[1]);
  return index < FRAME_COUNT ? `side-${index}` : null;
}

type Target = {
  url: string;
  /** True when the upstream WebP must be re-encoded to AVIF before serving. */
  transcode: boolean;
};

/** Resolves the request to an upstream URL, or null if anything fails validation. */
function resolveTarget(params: URLSearchParams): Target | null {
  // Stale revisions are refused rather than served, so a superseded encoding
  // cannot linger behind an immutable cache entry.
  if (params.get("v") !== RENDER_REVISION) return null;

  const kind = params.get("kind");

  // Carried in the URL rather than negotiated from `Accept`: Vercel's `Vary`
  // handling is limited, and an AVIF served to a client that cannot decode it
  // is a blank viewer. An explicit parameter keeps the cache key deterministic.
  const fmt = params.get("fmt") ?? "";

  if (kind === "swatch") {
    const material = params.get("material") ?? "";
    const color = params.get("color") ?? "";
    const known = PARTS.flatMap((part) => part.materials).find(
      (candidate) => candidate.name === material,
    );
    if (!known?.colors.some((c) => c.name === color)) return null;
    // Swatches are flat PNG and pass through untouched.
    return { url: upstreamSwatchUrl(material, color), transcode: false };
  }

  const parts = parseParts(params.getAll("p"));
  if (!parts) return null;

  if (!isFormat(fmt)) return null;

  // AVIF is always sourced from the WebP, because that is the only variant the
  // service returns with an alpha channel.
  const transcode = fmt !== FALLBACK_FORMAT;
  const upstreamFormat = FALLBACK_FORMAT;

  if (kind === "initials") {
    return {
      url: upstreamPreviewUrl(
        parts,
        normalizeInitials(params.get("initials") ?? ""),
        upstreamFormat,
      ),
      transcode,
    };
  }

  if (kind === "frame") {
    const frame = parseFrame(params.get("frame"));
    if (!frame) return null;
    const size = Number(params.get("size"));
    if (!ALLOWED_SIZES.includes(size)) return null;
    return {
      url: upstreamComposeUrl(parts, frame, size, upstreamFormat),
      transcode,
    };
  }

  return null;
}

export async function GET(request: Request): Promise<Response> {
  const target = resolveTarget(new URL(request.url).searchParams);
  if (!target) return badRequest("unrecognised render request");

  const contentType = target.transcode ? "image/avif" : "image/webp";
  const key = renderKey(target.url, target.transcode ? "avif" : "webp");

  const stored = await readRender(key);
  if (stored) {
    return new Response(stored, {
      headers: {
        "content-type": contentType,
        "cache-control": IMMUTABLE,
        "x-render-source": "store",
      },
    });
  }

  let upstream: Response;
  try {
    // The CDN holds the result, so this request is the cache miss path.
    upstream = await fetch(target.url, {
      cache: "no-store",
      headers: { accept: "image/webp,image/*" },
    });
  } catch {
    return new Response("render service unreachable", {
      status: 502,
      headers: { "cache-control": ERROR_CACHE },
    });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response("render service error", {
      status: 502,
      headers: { "cache-control": ERROR_CACHE },
    });
  }

  if (!target.transcode) {
    const passthrough = new Uint8Array(await upstream.arrayBuffer());
    // Writing after the response keeps the store off the critical path.
    after(async () => {
      await writeRender(key, passthrough, contentType);
    });
    return new Response(passthrough, {
      headers: {
        "content-type": upstream.headers.get("content-type") ?? contentType,
        "cache-control": IMMUTABLE,
        "x-render-source": "upstream",
      },
    });
  }

  // Transcoding needs the whole image, so the body is buffered rather than
  // streamed. At ~50KB a frame that costs nothing worth measuring.
  try {
    const source = Buffer.from(await upstream.arrayBuffer());
    const encoded = new Uint8Array(
      await sharp(source)
        .avif({ quality: AVIF_QUALITY, effort: AVIF_EFFORT })
        .toBuffer(),
    );
    after(async () => {
      await writeRender(key, encoded, contentType);
    });
    return new Response(encoded, {
      headers: {
        "content-type": contentType,
        "cache-control": IMMUTABLE,
        "x-render-source": "upstream",
      },
    });
  } catch {
    return new Response("could not transcode render", {
      status: 502,
      headers: { "cache-control": ERROR_CACHE },
    });
  }
}

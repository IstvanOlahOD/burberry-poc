import {
  ALLOWED_SIZES,
  FRAME_COUNT,
  PARTS,
  PART_ORDER,
  getPart,
  normalizeInitials,
  upstreamComposeUrl,
  upstreamPreviewUrl,
  upstreamSwatchUrl,
  type Parts,
} from "@/lib/ripe";

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
 */

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

/** Resolves the request to an upstream URL, or null if anything fails validation. */
function resolveTarget(params: URLSearchParams): string | null {
  const kind = params.get("kind");

  if (kind === "swatch") {
    const material = params.get("material") ?? "";
    const color = params.get("color") ?? "";
    const known = PARTS.flatMap((part) => part.materials).find(
      (candidate) => candidate.name === material,
    );
    if (!known?.colors.some((c) => c.name === color)) return null;
    return upstreamSwatchUrl(material, color);
  }

  const parts = parseParts(params.getAll("p"));
  if (!parts) return null;

  if (kind === "initials") {
    return upstreamPreviewUrl(parts, normalizeInitials(params.get("initials") ?? ""));
  }

  if (kind === "frame") {
    const frame = parseFrame(params.get("frame"));
    if (!frame) return null;
    const size = Number(params.get("size"));
    if (!ALLOWED_SIZES.includes(size)) return null;
    return upstreamComposeUrl(parts, frame, size);
  }

  return null;
}

export async function GET(request: Request): Promise<Response> {
  const target = resolveTarget(new URL(request.url).searchParams);
  if (!target) return badRequest("unrecognised render request");

  let upstream: Response;
  try {
    // The CDN holds the result, so this request is the cache miss path.
    upstream = await fetch(target, {
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

  return new Response(upstream.body, {
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "image/webp",
      "cache-control": IMMUTABLE,
    },
  });
}

import {
  DEFAULT_PARTS,
  FRAME_COUNT,
  PARTS,
  RENDER_REVISION,
  THUMBNAIL_FRAMES,
  THUMBNAIL_SIZE,
  VIEWER_SIZE,
  VIEWER_SIZE_RETINA,
  composeUrl,
  frameName,
  personalizationPreviewUrl,
  swatchUrl,
  type Parts,
  type Selection,
} from "@/lib/ripe";

/**
 * The render URLs worth having cached before anyone looks.
 *
 * The list is built from the same URL builders the components call, so it cannot
 * drift from what the app actually requests. That matters most for
 * `RENDER_REVISION`: a hand-maintained list would warm superseded URLs after
 * every bump and warm nothing useful.
 *
 * Two scopes, because they answer different problems:
 *
 * - `deploy` — the landing configuration in full. Vercel's CDN cache is scoped
 *   to a deployment, so this runs after every deploy to warm the edge.
 * - `variants` — every combination the filters can produce, at the twelve frames
 *   that cover a full turn. Renders live in Blob and outlive deployments, so
 *   this is a one-time job rather than a per-deploy one.
 */

const LIST_CACHE = "public, max-age=0, s-maxage=60";

/** Every sixth frame: twelve points covering the turn, matching the viewer's warm order. */
const COARSE_STRIDE = 6;

/**
 * Each combination the picker can reach. Optional parts contribute an extra
 * "unset" state, which is why this is larger than the colour counts suggest.
 */
function allConfigurations(): Parts[] {
  let configurations: Parts[] = [{}];

  for (const part of PARTS) {
    const choices: (Selection | null)[] = part.materials.flatMap((material) =>
      material.colors.map((color) => ({
        material: material.name,
        color: color.name,
      })),
    );
    if (part.optional) choices.push(null);

    configurations = configurations.flatMap((base) =>
      choices.map((choice) => ({ ...base, [part.name]: choice })),
    );
  }
  return configurations;
}

function deployScope(): string[] {
  const urls: string[] = [];

  // Both offered resolutions, since srcSet lets the browser pick either.
  for (let frame = 0; frame < FRAME_COUNT; frame++) {
    for (const size of [VIEWER_SIZE, VIEWER_SIZE_RETINA]) {
      urls.push(
        composeUrl({ parts: DEFAULT_PARTS, frame: frameName(frame), size }),
      );
    }
  }

  for (const frame of THUMBNAIL_FRAMES) {
    urls.push(
      composeUrl({ parts: DEFAULT_PARTS, frame, size: THUMBNAIL_SIZE }),
    );
  }

  // Every swatch in the picker; they all render when the panel first opens.
  for (const part of PARTS) {
    for (const material of part.materials) {
      for (const color of material.colors) {
        urls.push(swatchUrl(material.name, color.name));
      }
    }
  }

  urls.push(personalizationPreviewUrl(DEFAULT_PARTS, ""));
  return urls;
}

function variantScope(): string[] {
  const urls: string[] = [];

  for (const parts of allConfigurations()) {
    for (let frame = 0; frame < FRAME_COUNT; frame += COARSE_STRIDE) {
      urls.push(
        composeUrl({ parts, frame: frameName(frame), size: VIEWER_SIZE }),
      );
    }
    for (const frame of THUMBNAIL_FRAMES) {
      urls.push(composeUrl({ parts, frame, size: THUMBNAIL_SIZE }));
    }
  }
  return urls;
}

export async function GET(request: Request): Promise<Response> {
  const scope = new URL(request.url).searchParams.get("scope") ?? "deploy";

  if (scope !== "deploy" && scope !== "variants") {
    return new Response("scope must be 'deploy' or 'variants'", {
      status: 400,
      headers: { "cache-control": "no-store" },
    });
  }

  const urls = scope === "variants" ? variantScope() : deployScope();

  return Response.json(
    {
      scope,
      revision: RENDER_REVISION,
      configurations: scope === "variants" ? allConfigurations().length : 1,
      count: urls.length,
      urls,
    },
    { headers: { "cache-control": LIST_CACHE } },
  );
}

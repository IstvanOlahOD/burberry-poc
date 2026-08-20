import {
  DEFAULT_PARTS,
  FRAME_COUNT,
  PARTS,
  RENDER_REVISION,
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
 * How much of each turntable the `variants` scope covers. A stride of 6 gives
 * the twelve frames the viewer warms first; 1 covers all 72. Constrained to an
 * allowlist so the parameter cannot be used to mint unbounded URL sets.
 */
const ALLOWED_STRIDES = [1, 2, 3, 4, 6, 8, 12, 24];

/**
 * Resolutions the variants scope may be asked for, matching `srcSet`. Keyed off
 * the constants rather than written out, so the accepted `sizes` values cannot
 * drift from what the viewer actually requests.
 */
const ALLOWED_SIZE_SETS: Record<string, number[]> = {
  [String(VIEWER_SIZE)]: [VIEWER_SIZE],
  [String(VIEWER_SIZE_RETINA)]: [VIEWER_SIZE_RETINA],
  [`${VIEWER_SIZE},${VIEWER_SIZE_RETINA}`]: [VIEWER_SIZE, VIEWER_SIZE_RETINA],
};

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

  // Every swatch on the option cards; they all render when the column paints.
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

function variantScope(stride: number, sizes: number[]): string[] {
  const urls: string[] = [];

  for (const parts of allConfigurations()) {
    for (let frame = 0; frame < FRAME_COUNT; frame += stride) {
      for (const size of sizes) {
        urls.push(composeUrl({ parts, frame: frameName(frame), size }));
      }
    }
  }
  return urls;
}

function reject(reason: string): Response {
  return new Response(reason, {
    status: 400,
    headers: { "cache-control": "no-store" },
  });
}

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const scope = params.get("scope") ?? "deploy";

  if (scope !== "deploy" && scope !== "variants") {
    return reject("scope must be 'deploy' or 'variants'");
  }

  const stride = Number(params.get("stride") ?? COARSE_STRIDE);
  if (!ALLOWED_STRIDES.includes(stride)) {
    return reject(`stride must be one of ${ALLOWED_STRIDES.join(", ")}`);
  }

  const sizeKey = params.get("sizes") ?? String(VIEWER_SIZE);
  const sizes = ALLOWED_SIZE_SETS[sizeKey];
  if (!sizes) {
    return reject(
      `sizes must be one of ${Object.keys(ALLOWED_SIZE_SETS).join(" | ")}`,
    );
  }

  const urls =
    scope === "variants" ? variantScope(stride, sizes) : deployScope();

  return Response.json(
    {
      scope,
      revision: RENDER_REVISION,
      configurations: scope === "variants" ? allConfigurations().length : 1,
      ...(scope === "variants" ? { stride, sizes } : {}),
      count: urls.length,
      urls,
    },
    { headers: { "cache-control": LIST_CACHE } },
  );
}

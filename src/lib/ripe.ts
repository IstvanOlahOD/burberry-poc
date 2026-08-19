/**
 * Product model + image endpoints for the trench configurator.
 *
 * Renders and swatches come from the public Platforme sandbox compose service,
 * so no product imagery is bundled with this repo. The model definition below
 * mirrors the `parts` / `order` / `thumbnails` blocks the source configurator
 * receives from its config endpoint.
 */

export const RIPE_API = "https://ripe-core-sbx.platforme.com/api";

export const BRAND = "burberry_tech";
export const MODEL = "trench";
/**
 * WebP, not AVIF.
 *
 * The service's AVIF is ~4x smaller, but it carries no alpha channel — the
 * bitstream has no auxiliary alpha image, and transparent pixels come back
 * opaque black. These renders are cutouts that have to composite over the page
 * (the picker panel is translucent over the coat), so transparency is not
 * optional. Its `background` parameter only flattens to a chosen colour, which
 * would bake the page background into the product imagery.
 *
 * Getting the AVIF saving would mean re-encoding their WebP ourselves, alpha
 * intact, rather than asking the service for AVIF.
 */
export const FORMATS = ["avif", "webp"] as const;
export type Format = (typeof FORMATS)[number];

export const DEFAULT_FORMAT: Format = "webp";

export function isFormat(value: string): value is Format {
  return (FORMATS as readonly string[]).includes(value);
}

/** Number of rotation frames on the `side` face. */
export const FRAME_COUNT = 72;

/**
 * The viewer box is 720 CSS px, so a 1x display needs 720 and a 2x display
 * 1440. Requesting a flat 1000 over-fetched on the former and under-sampled on
 * the latter.
 */
export const VIEWER_SIZE = 720;
export const VIEWER_SIZE_RETINA = 1440;

/** Resolution for the current display; falls back to 1x during SSR. */
export function viewerSize(): number {
  if (typeof window === "undefined") return VIEWER_SIZE;
  return window.devicePixelRatio >= 2 ? VIEWER_SIZE_RETINA : VIEWER_SIZE;
}

/** Resolution requested for the left rail thumbnails (2x of the 76px box). */
export const THUMBNAIL_SIZE = 204;

export type Selection = { material: string; color: string };
export type Parts = Record<string, Selection | null>;

export type ColorDef = { name: string; label: string };
export type MaterialDef = { name: string; label: string; colors: ColorDef[] };

export type PartDef = {
  name: string;
  label: string;
  /** Optional parts may be left unselected, and show a "No <part>" option. */
  optional: boolean;
  materials: MaterialDef[];
};

const TRIM_COLORS: ColorDef[] = [
  { name: "honey", label: "Honey" },
  { name: "oxford", label: "Oxford" },
  { name: "umber", label: "Umber" },
];

export const PARTS: PartDef[] = [
  {
    name: "body",
    label: "Body",
    optional: false,
    materials: [
      { name: "gabardine", label: "Gabardine", colors: TRIM_COLORS },
    ],
  },
  {
    name: "buttons",
    label: "Buttons",
    optional: false,
    materials: [{ name: "buttons", label: "Buttons", colors: TRIM_COLORS }],
  },
  {
    name: "stitching",
    label: "Stitching",
    optional: false,
    materials: [{ name: "stitching", label: "Stitching", colors: TRIM_COLORS }],
  },
  {
    name: "lining",
    label: "Lining",
    optional: false,
    materials: [{ name: "lining", label: "Lining", colors: TRIM_COLORS }],
  },
  {
    name: "embroidery",
    label: "Embroidery",
    optional: true,
    materials: [
      {
        name: "embroidery",
        label: "Embroidery",
        colors: [
          { name: "burberry", label: "Burberry" },
          { name: "horse", label: "Horse" },
        ],
      },
    ],
  },
  {
    name: "label_patch",
    label: "Label Patch",
    optional: true,
    materials: [
      {
        name: "label_patch",
        label: "Label Patch",
        colors: [{ name: "label_patch", label: "Label Patch" }],
      },
    ],
  },
];

export const PART_ORDER = PARTS.map((part) => part.name);

export function getPart(name: string): PartDef | undefined {
  return PARTS.find((part) => part.name === name);
}

/** Frames offered in the left rail, as configured for this model. */
export const THUMBNAIL_FRAMES = ["side-0", "side-4", "side-12"];

export const DEFAULT_PARTS: Parts = {
  body: { material: "gabardine", color: "oxford" },
  buttons: { material: "buttons", color: "honey" },
  stitching: { material: "stitching", color: "honey" },
  lining: { material: "lining", color: "honey" },
  embroidery: null,
  label_patch: null,
};

/**
 * Native sizes for `eu:female`, and the EU value each one is presented as.
 * Native 19 maps to 35 and every step adds half a size.
 */
export const NATIVE_SIZES = Array.from({ length: 15 }, (_, i) => 19 + i);

export const DEFAULT_SIZE = 30;
export const SCALE = "eu";
export const GENDER = "female";

export function sizeLabel(native: number): string {
  const value = 35 + (native - 19) * 0.5;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function fullSizeLabel(native: number): string {
  return `${sizeLabel(native)} ${SCALE.toUpperCase()}`;
}

/** Longest initials string the model accepts, per its config. */
export const INITIALS_MAX = 8;

/** The model only renders these characters, so anything else is dropped. */
const INITIALS_ALLOWED = /[^0-9A-Z]/g;

export function normalizeInitials(value: string): string {
  return value.toUpperCase().replace(INITIALS_ALLOWED, "").slice(0, INITIALS_MAX);
}

/** Sentinel the compose service expects when no initials have been entered. */
const EMPTY_INITIALS = "$empty";

/**
 * Viewport profile that crops the preview to the initials area. Taken verbatim
 * from the request the source configurator issues for this model.
 */
const INITIALS_PROFILE = [
  "main:group::main",
  "main:main",
  "step::personalization:main:group::main",
  "step::personalization:main:main",
  "step::personalization:group::main",
  "step::personalization:main",
  "viewport::partial:group::main",
  "viewport::partial:main",
  "group::main",
  "main",
  "main",
  "step::personalization:main",
  "step::personalization",
  "viewport::partial",
].join(",");

/** Serialises the selected parts into the repeated `p=part:material:color` form. */
function appendParts(params: URLSearchParams, parts: Parts): void {
  for (const name of PART_ORDER) {
    const selection = parts[name];
    if (!selection) continue;
    params.append("p", `${name}:${selection.material}:${selection.color}`);
  }
}

/**
 * Every image the app renders is fetched through this app's own route handler
 * rather than straight from the compose service. The service renders on demand
 * (~830ms cold, ~230ms warm from here) and sits behind no shared cache, so the
 * proxy exists to put a CDN in front of it. See src/app/api/render/route.ts.
 */
const RENDER_PROXY = "/api/render";

/** Only the resolutions the app asks for, so the cache can't be flooded. 1000
 * is retained because URLs at that size are already cached from before the
 * switch to DPR-aware sizing. */
export const ALLOWED_SIZES = [
  THUMBNAIL_SIZE,
  VIEWER_SIZE,
  1000,
  VIEWER_SIZE_RETINA,
];

/** Size for the personalisation preview, shown in a 300px box. */
export const PREVIEW_SIZE = 600;

export type RenderKind = "frame" | "swatch" | "initials";

export function composeUrl(options: {
  parts: Parts;
  frame: string;
  size: number;
  format?: Format;
}): string {
  const params = new URLSearchParams({
    kind: "frame",
    fmt: options.format ?? DEFAULT_FORMAT,
    frame: options.frame,
    size: String(options.size),
  });
  appendParts(params, options.parts);
  return `${RENDER_PROXY}?${params.toString()}`;
}

/**
 * Preview for the personalisation dialog: a partial viewport focused on the
 * initials area, requested without `frame` or `size` exactly as the source
 * configurator does.
 */
export function personalizationPreviewUrl(
  parts: Parts,
  initials: string,
  format: Format = DEFAULT_FORMAT,
): string {
  const params = new URLSearchParams({ kind: "initials", fmt: format, initials });
  appendParts(params, parts);
  return `${RENDER_PROXY}?${params.toString()}`;
}

export function swatchUrl(material: string, color: string): string {
  const params = new URLSearchParams({ kind: "swatch", material, color });
  // Swatches stay PNG: they are flat colour and the service ignores format here.
  return `${RENDER_PROXY}?${params.toString()}`;
}

/*
 * Upstream builders below are for the route handler only. They take values the
 * handler has already validated against the model, so nothing a caller supplies
 * is forwarded verbatim.
 */

export function upstreamComposeUrl(
  parts: Parts,
  frame: string,
  size: number,
  format: Format,
): string {
  const params = new URLSearchParams({
    brand: BRAND,
    model: MODEL,
    format,
    frame,
    size: String(size),
  });
  appendParts(params, parts);
  return `${RIPE_API}/compose?${params.toString()}`;
}

export function upstreamPreviewUrl(
  parts: Parts,
  initials: string,
  format: Format,
): string {
  const params = new URLSearchParams({
    brand: BRAND,
    model: MODEL,
    format,
    size: String(PREVIEW_SIZE),
    initials: initials || EMPTY_INITIALS,
    initials_profile: INITIALS_PROFILE,
  });
  appendParts(params, parts);
  return `${RIPE_API}/compose?${params.toString()}`;
}

export function upstreamSwatchUrl(material: string, color: string): string {
  const params = new URLSearchParams({
    brand: BRAND,
    model: MODEL,
    material,
    color,
    retina: "1",
  });
  return `${RIPE_API}/swatch?${params.toString()}`;
}

/** Rotation frames are `side-0` … `side-71`; the index wraps in both directions. */
export function frameName(index: number): string {
  const wrapped = ((index % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT;
  return `side-${wrapped}`;
}

export function frameIndex(frame: string): number {
  const parsed = Number.parseInt(frame.replace("side-", ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

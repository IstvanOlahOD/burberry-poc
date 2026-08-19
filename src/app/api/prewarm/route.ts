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
} from "@/lib/ripe";

/**
 * The set of render URLs worth having cached before the first visitor arrives.
 *
 * Vercel's CDN cache is scoped to a deployment, so every deploy starts cold and
 * the first person through pays the upstream render — ~830ms a frame, 72 frames
 * to a turntable. A post-deploy job walks this list to absorb that.
 *
 * The list is built from the same URL builders the components call, so it cannot
 * drift from what the app actually requests. That matters most for
 * `RENDER_REVISION`: a hand-maintained list would warm superseded URLs after
 * every bump and silently warm nothing useful.
 */

/** Short cache: the list is cheap to rebuild and must not go stale across deploys. */
const LIST_CACHE = "public, max-age=0, s-maxage=60";

export async function GET(): Promise<Response> {
  const urls: string[] = [];

  // The turntable at both offered resolutions, since srcSet lets the browser
  // pick either depending on the display.
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

  // Every swatch in the picker, which all render on first paint of the panel.
  for (const part of PARTS) {
    for (const material of part.materials) {
      for (const color of material.colors) {
        urls.push(swatchUrl(material.name, color.name));
      }
    }
  }

  // The personalisation dialog's empty-initials state.
  urls.push(personalizationPreviewUrl(DEFAULT_PARTS, ""));

  return Response.json(
    { revision: RENDER_REVISION, count: urls.length, urls },
    { headers: { "cache-control": LIST_CACHE } },
  );
}

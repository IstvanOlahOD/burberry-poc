# burberry-poc

A Next.js replica of the Platforme "RIPE White" trench coat configurator, minus the
site header.

Reference page:
`https://ripe-white-sbx.platforme.com/?brand=burberry_tech&model=trench&locale=en_us&format=webp&gender=female&size=30&scale=eu&p=body:gabardine:oxford&p=buttons:buttons:honey&p=lining:lining:honey&p=stitching:stitching:honey`

## What it does

- Three-column stage: frame thumbnails, turntable viewer, controls column
- 72-frame drag rotation over the `side` face, at the same ~6px-per-frame
  sensitivity as the reference, with the rest of the turntable warmed in the
  background one frame at a time
- Bottom picker: body, buttons, stitching, lining, plus the optional embroidery and
  label patch, each with its swatch rail and a "No <part>" option
- Initials, size (EU 35–42), undo/redo, start over, fullscreen and show/hide filters
- The query string tracks the customization, so a configuration stays shareable

## Product imagery

Renders and swatches are requested from the public Platforme sandbox at
`ripe-core-sbx.platforme.com` (`/api/compose`, `/api/swatch`) — the same endpoints the
reference page uses. No product imagery is bundled with this repo, and there is no
build-time dependency on that service. The model definition (parts, materials,
colours, thumbnail frames, size scale) lives in [`src/lib/ripe.ts`](src/lib/ripe.ts).

Because the frames are hand-swapped for the turntable, the viewer uses plain `<img>`
elements rather than `next/image`.

## Image caching

The compose service renders on demand and has no shared cache in front of it —
measured from here at ~830ms for a cold render and ~230ms once it is warm, with
no CDN (`server: openresty`, no `ETag`). Left alone, every visitor pays that
cost themselves.

So nothing is requested from it directly. All renders and swatches go through
[`/api/render`](src/app/api/render/route.ts), which validates the parameters
against the model, rebuilds the upstream URL from the validated values, and
re-emits the bytes with:

    Cache-Control: public, max-age=31536000, s-maxage=31536000, immutable

A render is fully determined by its parameters, so the responses are
content-addressed and caching them forever is safe: a different configuration is
simply a different URL. On Vercel the edge network holds them, so only the first
visitor anywhere pays the cold render. Being same-origin also drops a
cross-origin TLS handshake (~155ms to their origin).

Because the upstream URL is rebuilt rather than forwarded, the route cannot be
used as an open image proxy. Unknown parts, colours, frames outside the
turntable and resolutions outside `ALLOWED_SIZES` are rejected with a 400.
Upstream failures return 502 with a 10-second cache so a blip is not held for a
year.

The viewer warms the turntable through a pool of parallel requests
(`WARM_CONCURRENCY`) rather than one at a time — the service multiplexes over
HTTP/2, so six concurrent frames cost barely more than one. Warming visits every
sixth frame first (`WARM_STRIDE`), so all twelve points of the turn are covered
in about a second and a drag is usable long before the remaining sixty arrive.

## Image format and size

Frames are served as **AVIF, transcoded by this app** rather than requested from
the render service.

The service will emit AVIF at roughly a quarter of the bytes, but its encoder
discards the alpha channel — no auxiliary alpha image in the bitstream, and
transparent pixels arrive opaque black. These renders are cutouts that composite
over the page and under a translucent picker panel, so transparency is not
optional. Its `background` parameter only flattens to a chosen colour, which
would bake the page background into the product imagery.

So [`/api/render`](src/app/api/render/route.ts) fetches the WebP, which keeps
its `ALPH` chunk, and re-encodes with `sharp` at quality 70. Alpha survives, and
encoding costs ~70ms — negligible beside the ~830ms the upstream render itself
takes, and it only happens on a cache miss.

Quality 70 was chosen by measurement; RMSE is against the source composited over
the page background:

| AVIF quality | Bytes | vs WebP | RMSE |
| --- | --- | --- | --- |
| 40 | 11.2 KB | −77% | 2.25 |
| 50 | 15.5 KB | −68% | 1.72 |
| **70** | **23.9 KB** | **−51%** | **1.14** |
| 80 | 29.9 KB | −38% | 0.94 |

Resolution follows the display. The viewer box is 720 CSS px, so a flat 1000
over-fetched on 1x and under-sampled on 2x; both are offered via `srcSet`
(`1x`/`2x`) and the browser picks. Offering them through `srcSet` rather than
reading `devicePixelRatio` during render keeps server and client markup
identical, which hydration requires.

Measured in the browser, a full 72-frame turntable:

| | Total |
| --- | --- |
| WebP @1000 (originally, all clients) | ~5200 KB |
| WebP @720 | 2498 KB |
| AVIF @720, transcoded | **1188 KB** |

Format travels in the URL rather than behind `Vary: Accept`, because Vercel's
`Vary` handling is limited and a mis-negotiated format is a broken image. Clients
that cannot decode AVIF fall back per image: an `onError` switches that
component to `FALLBACK_FORMAT`.

### The revision token

Every render URL carries `v=${RENDER_REVISION}`, and the route refuses anything
that is not the current revision.

Responses are `immutable` for a year, so the bytes behind a URL must never
change. Revision 1 was AVIF straight from the service — the alpha-less version
above. After switching to transcoding, clients that had cached revision 1 kept
serving black backgrounds from their own caches, because the URL was identical.
**Bump `RENDER_REVISION` in [src/lib/ripe.ts](src/lib/ripe.ts) whenever the
encoder, quality, or anything else affecting the output bytes changes.**

Note that render *time* upstream is almost independent of the requested size
(~715ms at 250px vs ~938ms at 2000px), so right-sizing buys bytes and decode
time, not a faster cold render.

## Development

Requires Node 24 (see `.nvmrc` and `engines` in `package.json`; Vercel builds on the same major).

```bash
npm run dev
```

Then open http://localhost:3000.

```bash
npm run build
```

## Deployment

Vercel auto-detects the framework; no `vercel.json` is needed. The build's Node
version comes from the `engines.node` field in `package.json`.

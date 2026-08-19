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
HTTP/2, so six concurrent frames cost barely more than one. Warming all 72
frames takes ~9.5s uncached, against roughly a minute serially.

Note that render cost is almost independent of the requested size (~715ms at
250px vs ~938ms at 2000px), so requesting smaller frames during a drag is not
worth doing — the time goes on compositing, not transfer.

## Development

Requires Node 20.9+ (see `.nvmrc`).

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

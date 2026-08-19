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

## Durable render store

Vercel's CDN cache is scoped to a deployment, so on its own every deploy re-pays
the upstream render — ~830ms a frame plus a transcode — for every image anyone
looks at.

[`src/lib/render-store.ts`](src/lib/render-store.ts) keeps finished renders in
Vercel Blob, which outlives deployments. A render is produced once and afterwards
read from storage. Keys are content-addressed: the upstream URL fully determines
the bytes, so it is hashed, under a `renders/v{REVISION}/` prefix so a revision
bump starts a clean namespace rather than colliding with superseded encodings.

Responses carry `x-render-source: store | upstream` so which path served a
request is visible from `curl`.

Writes happen in `after()`, so storing never delays the response, and every
store operation is best-effort — a store that is missing, full, or erroring
degrades to "no durable cache", never to a broken image.

**Setup.** The store exists (`burberry-renders`) but must be connected to the
project once, in the Vercel dashboard under Storage → Blob → Connect to Project.
That injects `BLOB_READ_WRITE_TOKEN`. Until it is connected,
`storeEnabled()` is false and the route behaves exactly as it did before.

## Pre-warming

[`scripts/prewarm.mjs`](scripts/prewarm.mjs) walks a list of render URLs. It asks
[`/api/prewarm`](src/app/api/prewarm/route.ts) what to fetch rather than
hardcoding it, so the warm set is built by the same URL builders the components
call and cannot drift from what the app requests — which matters most across
`RENDER_REVISION` bumps, where a hand-maintained list would warm superseded URLs
and nothing else.

Two scopes, answering different problems:

| Scope | Covers | URLs | Runs |
| --- | --- | --- | --- |
| `deploy` | landing configuration, all 72 frames at both resolutions, thumbnails, every swatch, empty preview | 163 | manually, after a deploy |
| `variants` | all 486 filter combinations, frames per `stride` + thumbnails | 7,290 at stride 6 | once |

`deploy` warms the CDN edge, which is what a deployment resets. `variants`
populates the durable store so any colour combination is fast permanently — a
one-time job, not a per-deploy one, which is only sensible because renders now
survive deploys.

**Automatic warming is currently disabled.**
[`.github/workflows/prewarm.yml`](.github/workflows/prewarm.yml) still exists and
still works, but its `deployment_status` trigger is commented out, so it only
runs when started by hand from the Actions tab. Re-enabling is two uncommented
lines in that file — the trigger and the event guard — and nothing else changes.

Either scope can be run manually from the Actions tab, or locally:

```bash
npm run prewarm                                       # production, deploy scope
node scripts/prewarm.mjs https://burberry-poc.vercel.app variants
node scripts/prewarm.mjs http://localhost:3000        # anywhere else
```

Coverage of the `variants` scope is a dial: `stride` picks how many of the 72
frames each configuration gets (6 gives the twelve the viewer warms first, 1 gives
all of them) and `sizes` picks which of the `srcSet` resolutions to cover. Both are
allowlisted so the parameter cannot mint unbounded URL sets.

```bash
STRIDE=1 node scripts/prewarm.mjs https://burberry-poc.vercel.app variants
STRIDE=1 SIZES=720,1440 node scripts/prewarm.mjs https://burberry-poc.vercel.app variants
```

It exits non-zero if any URL fails, so a broken render surfaces in CI rather than
in front of a visitor, and reports a tally of `x-vercel-cache` and
`x-render-source` so you can see what actually happened.

One caveat: Vercel's edge cache is regional, so a run from a CI runner primarily
warms the PoP nearest it. The durable store has no such limitation — once a render
is in Blob it is fast from anywhere, which is the more important half.

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

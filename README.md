# burberry-poc

An in-store **advisor configurator** for the bespoke trench: a Next.js app that
drives the Platforme "RIPE White" trench model from a consultation layout, with
every option backed by a real call to the RIPE sandbox.

Reference page for the underlying model:
`https://ripe-white-sbx.platforme.com/?brand=burberry_tech&model=trench&locale=en_us&format=webp&gender=female&size=30&scale=eu&p=body:gabardine:oxford&p=buttons:buttons:honey&p=lining:lining:honey&p=stitching:stitching:honey`

## What it does

- Masthead with the wordmark and appointment context, over a three-column stage:
  `172px` consultation rail, render canvas, `292px` options column
- **Consultation rail** — one step per option card, so it never points at a panel
  that is not there; a tick means a choice is recorded, and clicking a step
  scrolls to its panel
- **Canvas** — the 72-frame turntable, drag to rotate at the reference's
  ~6px-per-frame, with named views (front, three-quarter, side, back) and the
  rest of the turn warmed in the background
- **Options column** — style, outer colour, buttons and stitching, each with
  rendered swatch chips, over an indicative price panel
- **RIPE API inspector** — the render and swatch calls the app actually fires,
  each expandable to the upstream URL it rebuilds
- **Order sheet** — the configuration read back as a summary plus the payload an
  order import would carry
- The query string tracks the configuration, so a consultation stays shareable

The model also exposes lining, embroidery and label patch, and the state carries
initials and a size. Those have no card in this layout: they keep their model
defaults — a honey lining, no embroidery, no patch — and still travel in the
render URL and the order payload. Adding one back means adding its name to
`VISIBLE_PARTS` in [`options.tsx`](src/components/options.tsx) and a matching
entry to `STEPS` in [`steps-nav.tsx`](src/components/steps-nav.tsx).

## Layout

The stage follows the advisor-configurator design: a warm paper ground
(`#f7f4ee`), white panels on `#e4dfd6` hairlines, a honey accent (`#c9a876`) on
the primary action, and letterspaced uppercase labels.

That is a deliberate departure from burberry.com, which is the opposite on every
one of those axes. The measurements below are kept because they are the public
site's actual behaviour and are what to come back to if this ever has to read as
a shop page rather than a store tool.

<details>
<summary>Measured from us.burberry.com — the public site's own system</summary>

Sampled across the homepage and a trench coat PDP, every rendered element that
carries its own text:

| | Value |
| --- | --- |
| Headings, nav, part names, price | Serif, weight 400, **20px/24px** (16px for nav) |
| Buttons, labels, body, spec rows | Sans, weight **350**, 14–16px |
| Text | `#000` |
| Page | `#fff` |
| Secondary-control hover | `#f6f6f6` — the grey their PDPs put product imagery on |
| Hairline | `1px solid #dedede` |
| Primary action | `#0006cf` — Knight blue, the site's only accent |
| `letter-spacing` | `normal`, on all 845 elements sampled |
| `text-transform` | `none`, on all 845 elements sampled |
| `border-radius` | `0` |

Two things stand out. First, **nothing is uppercased or letterspaced anywhere on
burberry.com** — `letter-spacing: normal` and `text-transform: none` on all 845
elements sampled. Second, **the site leads with its serif and demotes the sans to
utility**; even the price is set in the serif at 20px, and no heading anywhere,
including the homepage hero, is larger than that.

The advisor design goes the other way on both counts, which is a reasonable
choice for a tool used across a desk rather than a page used by a customer — but
worth knowing it is a choice, not an inheritance.

</details>

## The faces

The brand's own fonts are self-hosted from [`src/app/fonts`](src/app/fonts) and
registered with `next/font/local` in [`layout.tsx`](src/app/layout.tsx). The
wordmark is their served artwork, in
[`burberry-wordmark.tsx`](src/components/burberry-wordmark.tsx).

> **These are Burberry's assets, not ours.** The fonts are licensed to them and
> the wordmark is their trademark. They are appropriate in a POC built for
> Burberry; they must not be copied into another project, and anything
> public-facing needs their sign-off.

The 190 `@font-face` rules their site declares resolve to only three files:

| File | Family | Weights | Size |
| --- | --- | --- | --- |
| `burberry-house-regular.woff2` | BurberrySerif | 300, 400, 500, 700 | 30 KB |
| `burberry-oracle-book.woff2` | BurberrySansSerif | 300, 350, 400 | 59 KB |
| `oracle-book-medium.woff2` | BurberrySansSerif | 500, 700 | 64 KB |

So **the serif is a single cut** that every weight points at, and the sans has
exactly two — Oracle Book and Oracle Book Medium. Verified in the browser after
forcing every declared weight to load: all five serif weights render at identical
widths, the sans 300/350/400 group is identical, 500/700 is identical, and the two
sans groups differ from each other.

Those aliases are reproduced here rather than collapsed to one weight each,
because it matches what the brand declares — and because pointing 700 at the
regular cut is what stops a stray `font-bold` on serif text from asking the
browser to synthesise a bold the brand does not own.

One correction to an earlier draft of this file: weight 350 is **not** a
variable-font axis position. It is a plain alias onto the same static Book file
as 400, so it renders identically to 400 — the distinction is nominal, not
optical. Keeping the interface on 350 is still right, because that is the weight
the brand names.

## Product imagery

Renders and swatches are requested from the public Platforme sandbox at
`ripe-core-sbx.platforme.com` (`/api/compose`, `/api/swatch`) — the same endpoints the
reference page uses. No product imagery is bundled with this repo, and there is no
build-time dependency on that service. The model definition (parts, materials,
colours, size scale) lives in [`src/lib/ripe.ts`](src/lib/ripe.ts). `THUMBNAIL_FRAMES`
and `THUMBNAIL_SIZE` are still exported and still allowed by the render route, so
old thumbnail URLs resolve, but nothing requests or pre-warms them any more — the
thumbnail rail was replaced by the canvas's named views.

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

Those figures were measured when the page background was a warm `#faf9f7`; it is
now `#ffffff`. That is a small enough move to leave the ranking intact and
quality 70 is still the right pick, though the numbers are worth re-taking if the
encoder is ever revisited. Note that changing the background does **not** call
for a `RENDER_REVISION` bump: the bytes behind a render URL are unchanged, only
what they composite over.

Resolution follows the display. The render sits in `.render-wrap`, which caps at
**380 CSS px**, so 380 and 760 are offered via `srcSet` (`1x`/`2x`) and the
browser picks. Offering them through `srcSet` rather than reading
`devicePixelRatio` during render keeps server and client markup identical, which
hydration requires.

This pair was 720/1440 while the stage filled a 720px column. Against a 380px box
that was about four times the pixels needed, on every frame of a 72-frame turn —
the largest single waste in the app. Measured per frame against the dev server:

| Requested | Bytes | vs before |
| --- | --- | --- |
| 380 (1x, was 720) | 12.4 KB | −55% |
| 760 (2x, was 1440) | 30.1 KB | −60% |

**Keep `VIEWER_SIZE` in step with `.render-wrap`'s max-width.** They are two
halves of one decision, and if the box grows past the requested size the render
starts upscaling.

Superseded sizes stay in `ALLOWED_SIZES` rather than being removed: responses are
`immutable` for a year, so URLs already in the store and on the CDN have to keep
resolving. The new sizes are new URLs, so this needed no `RENDER_REVISION` bump —
but it does start a cold namespace, so **re-run the pre-warm** or the first
visitor pays the upstream render for every frame.

Measured in the browser, a full 72-frame turntable:

| | Total |
| --- | --- |
| WebP @1000 (originally, all clients) | ~5200 KB |
| WebP @720 | 2498 KB |
| AVIF @720, transcoded | 1188 KB |
| AVIF @380, right-sized for the box | **663 KB** |

The last row is the 72 frames the viewer actually warms on a 1x display, read off
the Resource Timing entries rather than estimated — so a full turn now costs
about a quarter of what it did before the transcode and the right-sizing.

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
| `deploy` | landing configuration, all 72 frames at both resolutions, every swatch, empty preview | 160 | manually, after a deploy |
| `variants` | all 486 option combinations, frames per `stride` | 5,832 at stride 6 | once |

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
STRIDE=1 SIZES=380,760 node scripts/prewarm.mjs https://burberry-poc.vercel.app variants
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

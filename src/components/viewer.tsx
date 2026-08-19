"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_FORMAT,
  FALLBACK_FORMAT,
  FRAME_COUNT,
  VIEWER_SIZE,
  VIEWER_SIZE_RETINA,
  composeUrl,
  frameName,
  type Format,
  type Parts,
} from "@/lib/ripe";
import { DragHintGraphic } from "./icons";

/** Horizontal drag distance that advances the turntable by one frame. */
const PIXELS_PER_FRAME = 6;

/** Frames requested at once while warming the turntable. */
const WARM_CONCURRENCY = 6;

/**
 * Warming visits every sixth frame first, so all twelve points of the turn are
 * covered within about a second and a drag is usable long before the remaining
 * sixty frames arrive.
 */
const WARM_STRIDE = 6;

/** How long a configuration change takes to dissolve. */
const CROSSFADE_MS = 450;

type Sources = { src: string; srcSet: string };

type ViewerProps = {
  parts: Parts;
  index: number;
  onIndexChange: (index: number) => void;
  showHint: boolean;
  onHintDismiss: () => void;
};

function wrap(frame: number): number {
  return ((frame % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT;
}

export function Viewer({
  parts,
  index,
  onIndexChange,
  showHint,
  onHintDismiss,
}: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startIndex: number;
  } | null>(null);

  /**
   * AVIF for everyone, dropping to WebP the first time an image fails to load.
   * Falling back on error rather than probing support up front keeps the server
   * and client markup identical, which hydration requires.
   */
  const [format, setFormat] = useState<Format>(DEFAULT_FORMAT);

  const onFormatError = () => {
    if (format === DEFAULT_FORMAT) setFormat(FALLBACK_FORMAT);
  };

  /**
   * Both resolutions are offered and the browser picks by device pixel ratio, so
   * the markup stays deterministic between server and client. A flat size would
   * either over-fetch on 1x or under-sample on 2x.
   */
  /** Sources for any configuration at any frame, both offered resolutions. */
  const sourcesFor = useCallback(
    (forParts: Parts, forFormat: Format, frame: number): Sources => {
      const at = (size: number) =>
        composeUrl({
          parts: forParts,
          format: forFormat,
          size,
          frame: frameName(frame),
        });
      return {
        src: at(VIEWER_SIZE),
        srcSet: `${at(VIEWER_SIZE)} 1x, ${at(VIEWER_SIZE_RETINA)} 2x`,
      };
    },
    [],
  );

  const frameSources = useCallback(
    (frame: number): Sources => sourcesFor(parts, format, frame),
    [sourcesFor, parts, format],
  );

  /** Frame 0's URL encodes parts and format, so it identifies the configuration. */
  const configKey = useMemo(() => frameSources(0).src, [frameSources]);

  const target = frameSources(index);

  /**
   * The configuration currently painted — not a resolved frame. Storing the
   * configuration rather than one frame's URLs is what lets the viewer keep
   * showing the *current* frame while a new configuration loads. Holding
   * resolved sources instead froze them at the last promote, so rotating and
   * then changing a colour jumped back to whichever frame was showing when the
   * configuration last settled, held, then snapped forward.
   */
  const [paintedConfig, setPaintedConfig] = useState<{
    key: string;
    parts: Parts;
    format: Format;
  }>(() => ({ key: configKey, parts, format }));

  /**
   * The configuration being replaced, kept on top and fading out. A colour
   * change dissolves instead of cutting, which is most of why this reads as a
   * product shot rather than an image swap. Frame changes are never crossfaded —
   * at rotation speed that would smear the turn.
   */
  const [outgoing, setOutgoing] = useState<Sources | null>(null);
  const fadeTimer = useRef<number | null>(null);

  /**
   * Within a configuration the visible element just follows the target. Browsers
   * keep the current frame painted until the next one decodes, so there is
   * nothing to gate on — and gating meant remounting an <img> per frame and
   * waiting on its load event, which made rotation trail the pointer.
   *
   * Load gating survives only across configurations, where a cold render really
   * could flash, and where the dissolve covers the wait anyway.
   */
  const sameConfig = paintedConfig.key === configKey;

  /**
   * While a new configuration loads, hold the outgoing one **at the current
   * frame**, so rotating and then changing a colour does not move the garment.
   */
  const painted = sameConfig
    ? target
    : sourcesFor(paintedConfig.parts, paintedConfig.format, index);

  /** Promotes the loaded target, dissolving from the old configuration if any. */
  const promote = () => {
    if (!sameConfig) {
      setOutgoing(sourcesFor(paintedConfig.parts, paintedConfig.format, index));
      if (fadeTimer.current !== null) window.clearTimeout(fadeTimer.current);
      fadeTimer.current = window.setTimeout(() => {
        setOutgoing(null);
        fadeTimer.current = null;
      }, CROSSFADE_MS);
    }
    setPaintedConfig({ key: configKey, parts, format });
  };

  useEffect(() => {
    return () => {
      if (fadeTimer.current !== null) window.clearTimeout(fadeTimer.current);
    };
  }, []);

  // Warm the turntable through a small pool of parallel requests. The service
  // multiplexes over HTTP/2 — six concurrent frames cost barely more than one —
  // so warming serially would leave a drag waiting the better part of a minute
  // for frames that arrive in a few seconds here.
  useEffect(() => {
    let cancelled = false;
    const order: number[] = [];
    for (let offset = 0; offset < WARM_STRIDE; offset++) {
      for (let frame = offset; frame < FRAME_COUNT; frame += WARM_STRIDE) {
        order.push(frame);
      }
    }
    let cursor = 0;

    const pump = () => {
      if (cancelled || cursor >= order.length) return;
      const sources = frameSources(order[cursor++]);
      const image = new window.Image();
      image.decoding = "async";
      // Background frames must not compete with the visible one for bandwidth.
      image.fetchPriority = "low";
      const advance = () => {
        if (!cancelled) pump();
      };
      image.onload = advance;
      image.onerror = advance;
      image.srcset = sources.srcSet;
      image.src = sources.src;
    };

    const handle = window.setTimeout(() => {
      for (let worker = 0; worker < WARM_CONCURRENCY; worker++) pump();
    }, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [frameSources]);

  // Capture keeps the rotation alive when the cursor leaves the viewer, but it
  // throws once the pointer is no longer active, so failures are ignored.
  const capture = (pointerId: number, on: boolean) => {
    try {
      if (on) containerRef.current?.setPointerCapture(pointerId);
      else containerRef.current?.releasePointerCapture(pointerId);
    } catch {
      /* the pointer already went away */
    }
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    capture(event.pointerId, true);
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startIndex: index,
    };
    onHintDismiss();
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;

    const offset = Math.round(
      (event.clientX - state.startX) / PIXELS_PER_FRAME,
    );
    const next = wrap(state.startIndex + offset);
    if (next !== index) onIndexChange(next);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    capture(event.pointerId, false);
    drag.current = null;
  };

  /** Arrow keys step the turn, so the viewer is not pointer-only. */
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    onHintDismiss();
    onIndexChange(wrap(index + step));
  };

  return (
    /* The columns row is as tall as the right column, which now runs past the
       viewport — centring inside it pushed the garment below the fold and behind
       the picker. Sticking to the top and sizing against the visible area keeps
       the whole coat in view while the specification scrolls past it. */
    <div className="sticky top-0 flex h-[calc(100dvh-var(--picker-height))] min-w-0 flex-1 items-center justify-center self-start">
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="group"
        aria-label="Trench coat, 360 degree view. Drag or use the arrow keys to rotate."
        /* Fixed 720px square, as in the source; it only shrinks when the
           window is too short to hold it rather than cropping the render. */
        className="relative aspect-square h-[min(720px,100%)] max-w-full cursor-grab touch-none select-none active:cursor-grabbing"
      >
        {/* Sits behind the garment and shows only outside its silhouette, since
            the renders carry alpha. Grounds the coat instead of letting it float
            on the page. */}
        <div className="viewer-contact-shadow" aria-hidden />

        {/* Deliberately unkeyed: one element for the whole turn, so rotation is a
            src swap rather than a remount. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- turntable frames
            are swapped by hand and must bypass the image optimiser. */}
        <img
          src={painted.src}
          srcSet={painted.srcSet}
          alt={`Trench coat, frame ${index + 1} of ${FRAME_COUNT}`}
          draggable={false}
          fetchPriority="high"
          onError={onFormatError}
          className="relative h-full w-full object-contain"
        />

        {/* The configuration being replaced, dissolving on top. */}
        {outgoing ? (
          // eslint-disable-next-line @next/next/no-img-element -- crossfade layer.
          <img
            key={outgoing.src}
            src={outgoing.src}
            srcSet={outgoing.srcSet}
            alt=""
            aria-hidden
            draggable={false}
            className="viewer-dissolve pointer-events-none absolute inset-0 h-full w-full object-contain"
          />
        ) : null}

        {/* Only across configurations: loads the new render off screen and
            promotes it once ready, so a colour change never shows a blank. */}
        {sameConfig ? null : (
          // eslint-disable-next-line @next/next/no-img-element -- preloader only.
          <img
            key={target.src}
            src={target.src}
            srcSet={target.srcSet}
            alt=""
            aria-hidden
            onLoad={promote}
            onError={onFormatError}
            className="pointer-events-none absolute size-0 opacity-0"
          />
        )}

        {/* Turntable hint: a 52px band overhanging the foot of the render,
            with the dotted ring straddling it. Offsets and the 1s fade are the
            source's. */}
        <div
          className={`pointer-events-none absolute inset-x-0 -bottom-[23px] h-[52px] transition-opacity duration-1000 ${
            showHint ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="absolute inset-x-0 top-0 text-center text-[10px] leading-[13px] font-semibold tracking-[2px] text-[#afafaf] uppercase">
            Drag
          </span>
          <DragHintGraphic className="absolute -top-[42px] left-1/2 h-[77px] w-[543px] max-w-full -translate-x-1/2 text-[#afafaf]" />
          <span className="absolute inset-x-0 bottom-0 text-center text-[10px] leading-[13px] font-semibold tracking-[2px] text-[#afafaf] uppercase">
            3D
          </span>
        </div>
      </div>
    </div>
  );
}

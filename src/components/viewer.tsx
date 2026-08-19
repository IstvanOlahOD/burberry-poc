"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

function warmOrder(): number[] {
  const order: number[] = [];
  for (let offset = 0; offset < WARM_STRIDE; offset++) {
    for (let frame = offset; frame < FRAME_COUNT; frame += WARM_STRIDE) {
      order.push(frame);
    }
  }
  return order;
}

type Sources = { src: string; srcSet: string };

type ViewerProps = {
  parts: Parts;
  index: number;
  onIndexChange: (index: number) => void;
  showHint: boolean;
  onHintDismiss: () => void;
};

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
  const frameSources = useCallback(
    (frame: number): Sources => {
      const at = (size: number) =>
        composeUrl({ parts, format, size, frame: frameName(frame) });
      return {
        src: at(VIEWER_SIZE),
        srcSet: `${at(VIEWER_SIZE)} 1x, ${at(VIEWER_SIZE_RETINA)} 2x`,
      };
    },
    [parts, format],
  );

  const target = frameSources(index);

  /**
   * What is on screen now. Held as resolved sources so it survives both rotation
   * and configuration changes: the new render only replaces it once loaded,
   * which is what keeps a drag from flashing an empty viewer.
   */
  const [rendered, setRendered] = useState<Sources>(target);
  const showingTarget = rendered.src === target.src;

  // Warm the turntable through a small pool of parallel requests. The service
  // multiplexes over HTTP/2 — six concurrent frames cost barely more than one —
  // so warming serially would leave a drag waiting the better part of a minute
  // for frames that arrive in a few seconds here.
  useEffect(() => {
    let cancelled = false;
    const order = warmOrder();
    let position = 0;

    const pump = () => {
      if (cancelled || position >= order.length) return;
      const frame = order[position++];
      const sources = frameSources(frame);
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
    const next =
      (((state.startIndex + offset) % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT;
    if (next !== index) onIndexChange(next);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    capture(event.pointerId, false);
    drag.current = null;
  };

  return (
    <div className="flex h-full min-w-0 flex-1 items-center justify-center">
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        /* Fixed 720px square, as in the source; it only shrinks when the
           window is too short to hold it rather than cropping the render. */
        className="relative aspect-square h-[min(720px,100%)] max-w-full cursor-grab touch-none select-none active:cursor-grabbing"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- turntable frames
            are swapped by hand and must bypass the image optimiser. */}
        <img
          src={rendered.src}
          srcSet={rendered.srcSet}
          alt={`Trench coat, frame ${index + 1} of ${FRAME_COUNT}`}
          draggable={false}
          fetchPriority="high"
          onError={onFormatError}
          className="h-full w-full object-contain"
        />

        {/* Loads the requested frame off screen and promotes it once ready. */}
        {showingTarget ? null : (
          // eslint-disable-next-line @next/next/no-img-element -- preloader only.
          <img
            key={target.src}
            src={target.src}
            srcSet={target.srcSet}
            alt=""
            aria-hidden
            onLoad={() => setRendered(target)}
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

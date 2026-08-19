"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FRAME_COUNT,
  VIEWER_SIZE,
  composeUrl,
  frameName,
  type Parts,
} from "@/lib/ripe";
import { DragHintGraphic } from "./icons";

/** Horizontal drag distance that advances the turntable by one frame. */
const PIXELS_PER_FRAME = 6;

/** Frames requested at once while warming the turntable. */
const WARM_CONCURRENCY = 6;

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

  const frameUrl = useCallback(
    (frame: number) =>
      composeUrl({
        parts,
        frame: frameName(frame),
        size: VIEWER_SIZE,
      }),
    [parts],
  );

  const target = frameUrl(index);

  /**
   * The frame on screen, held as a URL so it survives both rotation and
   * configuration changes: the new render only replaces it once it has loaded,
   * which is what keeps a drag from flashing an empty viewer.
   */
  const [renderedUrl, setRenderedUrl] = useState(target);

  // Warm the rest of the turntable through a small pool of parallel requests.
  // The render service multiplexes these over HTTP/2 — six concurrent frames
  // cost barely more than one — so warming serially would leave a drag waiting
  // the better part of a minute for frames that arrive in a few seconds here.
  useEffect(() => {
    let cancelled = false;
    let nextFrame = 0;
    const pump = () => {
      if (cancelled || nextFrame >= FRAME_COUNT) return;
      const frame = nextFrame++;
      const image = new window.Image();
      image.decoding = "async";
      const advance = () => {
        if (!cancelled) pump();
      };
      image.onload = advance;
      image.onerror = advance;
      image.src = frameUrl(frame);
    };
    const handle = window.setTimeout(() => {
      for (let worker = 0; worker < WARM_CONCURRENCY; worker++) pump();
    }, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [frameUrl]);

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
          src={renderedUrl}
          alt={`Trench coat, frame ${index + 1} of ${FRAME_COUNT}`}
          draggable={false}
          className="h-full w-full object-contain"
        />

        {/* Loads the requested frame off screen and promotes it once ready. */}
        {target === renderedUrl ? null : (
          // eslint-disable-next-line @next/next/no-img-element -- preloader only.
          <img
            key={target}
            src={target}
            alt=""
            aria-hidden
            onLoad={() => setRenderedUrl(target)}
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

"use client";

import { useState } from "react";
import {
  DEFAULT_FORMAT,
  FALLBACK_FORMAT,
  THUMBNAIL_FRAMES,
  THUMBNAIL_SIZE,
  composeUrl,
  frameIndex,
  type Format,
  type Parts,
} from "@/lib/ripe";

type ThumbnailsProps = {
  parts: Parts;
  index: number;
  onIndexChange: (index: number) => void;
};

export function Thumbnails({ parts, index, onIndexChange }: ThumbnailsProps) {
  // Matches the viewer: AVIF by default, dropping to WebP on the first failure
  // rather than probing what the browser supports before rendering.
  const [format, setFormat] = useState<Format>(DEFAULT_FORMAT);

  return (
    <div className="flex w-[250px] flex-col">
      {THUMBNAIL_FRAMES.map((frame, position) => {
        const target = frameIndex(frame);
        const active = target === index;
        return (
          <button
            key={frame}
            type="button"
            onClick={() => onIndexChange(target)}
            aria-label={`View ${frame}`}
            aria-pressed={active}
            className={`block size-[76px] shrink-0 overflow-hidden p-1 transition-[opacity,box-shadow] ${
              position > 0 ? "mt-[10px]" : ""
            } ${
              active
                ? "opacity-100 shadow-[1px_1px_2px_0_rgba(34,34,34,0.25)]"
                : "opacity-40 shadow-[1px_1px_1px_0_rgba(34,34,34,0.05)]"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- rendered by
                the remote compose service, already sized for this box. */}
            <img
              src={composeUrl({ parts, frame, format, size: THUMBNAIL_SIZE })}
              alt=""
              draggable={false}
              onError={() => {
                if (format === DEFAULT_FORMAT) setFormat(FALLBACK_FORMAT);
              }}
              className="size-full object-contain"
            />
          </button>
        );
      })}
    </div>
  );
}

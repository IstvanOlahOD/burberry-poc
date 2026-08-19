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
  // Same rule as the viewer: AVIF, dropping to WebP on the first failure.
  const [format, setFormat] = useState<Format>(DEFAULT_FORMAT);

  return (
    <div className="flex w-[250px] flex-col">
      {/* The rail was three unlabelled images. A caps header names it, and the
          active view gets an ink marker rather than relying on opacity alone. */}
      <h2 className="label-caps mb-4 text-muted">Views</h2>
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
            className={`relative block size-[76px] shrink-0 overflow-hidden p-1 transition-[opacity,box-shadow] before:absolute before:top-1/2 before:left-0 before:h-6 before:w-px before:-translate-y-1/2 before:bg-ink before:transition-opacity ${
              active ? "before:opacity-100" : "before:opacity-0"
            } ${
              position > 0 ? "mt-[10px]" : ""
            } ${
              active
                ? "opacity-100 shadow-[0_2px_10px_-2px_rgba(21,21,21,0.18)]"
                : "opacity-40 hover:opacity-70"
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

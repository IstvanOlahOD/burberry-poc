"use client";

import { FRAME_COUNT, MODEL_SUBTITLE, MODEL_TITLE, type Parts } from "@/lib/ripe";
import { Viewer } from "./viewer";

/**
 * The named views offered under the render.
 *
 * The design offered Front / Back / Cuff detail. There are no detail frames in
 * the turntable — it is 72 evenly spaced frames of a full turn — so the third is
 * dropped and the rest are placed on the real frames: 72 frames over 360° puts
 * the quarter turn at 18 and the back at 36.
 */
const VIEWS = [
  { label: "Front", index: 0 },
  { label: "Three-quarter", index: Math.round(FRAME_COUNT / 8) },
  { label: "Side", index: Math.round(FRAME_COUNT / 4) },
  { label: "Back", index: Math.round(FRAME_COUNT / 2) },
];

type CanvasProps = {
  parts: Parts;
  index: number;
  onIndexChange: (index: number) => void;
  showHint: boolean;
  onHintDismiss: () => void;
};

export function Canvas({
  parts,
  index,
  onIndexChange,
  showHint,
  onHintDismiss,
}: CanvasProps) {
  return (
    <section className="canvas">
      <div className="style-name">{MODEL_TITLE}</div>
      <div className="style-sub">{MODEL_SUBTITLE}</div>

      <div className="render-wrap">
        <Viewer
          parts={parts}
          index={index}
          onIndexChange={onIndexChange}
          showHint={showHint}
          onHintDismiss={onHintDismiss}
        />
      </div>

      <div className="frame-ctl">
        {VIEWS.map((view) => (
          <button
            key={view.label}
            type="button"
            onClick={() => {
              onHintDismiss();
              onIndexChange(view.index);
            }}
            aria-pressed={index === view.index}
            className={index === view.index ? "on" : ""}
          >
            {view.label}
          </button>
        ))}
      </div>

      <p className="render-cap">
        Frames are composed server-side by <code>GET /api/compose</code> and
        served through this app&rsquo;s own <code>/api/render</code>, which
        validates, transcodes to AVIF and caches them. Drag the coat to rotate
        through all {FRAME_COUNT} frames, or use the arrow keys.
      </p>
    </section>
  );
}

"use client";

import {
  MODEL_SUBTITLE,
  MODEL_TITLE,
  PARTS,
  swatchUrl,
  type PartDef,
  type Selection,
} from "@/lib/ripe";
import type { Customization } from "@/lib/state";

/**
 * Which parts get a card.
 *
 * The model exposes six, but only these three are offered here. The rest keep
 * their model defaults — a honey lining, no embroidery and no label patch — and
 * still travel in the render URL and the order payload; they simply have no
 * control in this layout. Adding one back is adding its name to this list.
 */
const VISIBLE_PARTS = ["body", "buttons", "stitching"];

type OptionsProps = {
  current: Customization;
  onSelect: (name: string, selection: Selection | null) => void;
};

/**
 * A part's colour chips.
 *
 * The design's chips carried a flat hex swatch. These carry the real rendered
 * swatch from the compose service instead, so what the advisor points at is the
 * actual gabardine rather than a hand-picked approximation of it.
 */
function PartPanel({
  part,
  current,
  onSelect,
}: {
  part: PartDef;
  current: Customization;
  onSelect: (name: string, selection: Selection | null) => void;
}) {
  const selection = current.parts[part.name] ?? null;
  // Every part in the sandbox model has exactly one material; the lookup is kept
  // so a part that gains more does not silently show only the first.
  const material =
    part.materials.find((entry) => entry.name === selection?.material) ??
    part.materials[0];

  return (
    <div className="opt-panel" id={`p-${part.name}`}>
      <h3>{part.name === "body" ? "Outer colour" : part.label}</h3>
      <p className="hint">
        Part <code>{part.name}</code> · material <code>{material.name}</code>
        {part.optional ? " · optional" : ""}
      </p>
      <div className="chips">
        {material.colors.map((color) => {
          const on =
            selection?.material === material.name && selection?.color === color.name;
          return (
            <button
              key={color.name}
              type="button"
              aria-pressed={on}
              onClick={() =>
                onSelect(part.name, { material: material.name, color: color.name })
              }
              className={`chip ${on ? "on" : ""}`}
            >
              <span className="sw">
                {/* eslint-disable-next-line @next/next/no-img-element -- remote swatch render. */}
                <img src={swatchUrl(material.name, color.name)} alt="" />
              </span>
              <span>{color.label}</span>
            </button>
          );
        })}

        {part.optional ? (
          <button
            type="button"
            aria-pressed={!selection}
            onClick={() => onSelect(part.name, null)}
            className={`chip ${!selection ? "on" : ""}`}
          >
            <span className="sw" style={{ borderStyle: "dashed" }} />
            <span>None</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function Options({ current, onSelect }: OptionsProps) {
  return (
    <div>
      <h2 className="eyebrow mb-[10px]">Options</h2>

      {/* The design offered two styles. The sandbox exposes one model, so the
          panel keeps its place in the running order and says so rather than
          inventing a second. */}
      <div className="opt-panel" id="p-style">
        <h3>Style</h3>
        <p className="hint">
          Loads a new model spec on change — one build exists in the sandbox
          today
        </p>
        <div className="chips">
          <button type="button" aria-pressed className="chip on">
            <span>
              {MODEL_TITLE}
              <small>{MODEL_SUBTITLE}</small>
            </span>
          </button>
        </div>
      </div>

      {PARTS.filter((part) => VISIBLE_PARTS.includes(part.name)).map((part) => (
        <PartPanel
          key={part.name}
          part={part}
          current={current}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

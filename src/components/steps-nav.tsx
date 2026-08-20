"use client";

import type { Customization } from "@/lib/state";

/**
 * The consultation running order.
 *
 * One entry per option card, so the rail never points at a panel that is not
 * there. The model exposes three more parts — lining, embroidery, label patch —
 * plus personalisation and size; those keep their defaults and have no card in
 * this layout, so they are absent here too. Keep this list and `VISIBLE_PARTS`
 * in [options.tsx](options.tsx) in step.
 */
export type Step = {
  id: string;
  label: string;
  done: (current: Customization) => boolean;
};

export const STEPS: Step[] = [
  { id: "p-style", label: "Style", done: () => true },
  { id: "p-body", label: "Outer colour", done: (c) => !!c.parts.body },
  { id: "p-buttons", label: "Buttons", done: (c) => !!c.parts.buttons },
  { id: "p-stitching", label: "Stitching", done: (c) => !!c.parts.stitching },
];

type StepsNavProps = {
  current: Customization;
  activeId: string;
  onSelect: (id: string) => void;
};

export function StepsNav({ current, activeId, onSelect }: StepsNavProps) {
  return (
    <nav className="steps">
      <h2 className="eyebrow mb-3">Consultation</h2>
      {STEPS.map((step) => (
        <button
          key={step.id}
          type="button"
          onClick={() => onSelect(step.id)}
          aria-current={step.id === activeId ? "step" : undefined}
          className={`step ${step.id === activeId ? "active" : ""}`}
        >
          <span className="tick" aria-hidden>
            {step.done(current) ? "✓" : ""}
          </span>
          {step.label}
        </button>
      ))}
      <p className="step-note">
        A tick means the step has a choice recorded. Every step here is driven by
        the model spec, so the rail follows whatever the sandbox exposes.
      </p>
    </nav>
  );
}

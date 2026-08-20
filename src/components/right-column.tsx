"use client";

import {
  MODEL_SUBTITLE,
  MODEL_TITLE,
  PARTS,
  fullSizeLabel,
  selectionLabel,
  type Parts,
} from "@/lib/ripe";
import {
  FullscreenIcon,
  RedoIcon,
  StartOverIcon,
  UndoIcon,
} from "./icons";

type RightColumnProps = {
  parts: Parts;
  size: number;
  initials: string;
  expanded: boolean;
  canUndo: boolean;
  canRedo: boolean;
  canStartOver: boolean;
  onOpenInitials: () => void;
  onOpenSize: () => void;
  onToggleFilters: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onStartOver: () => void;
  onFullscreen: () => void;
};

/**
 * A secondary control in the brand's idiom: 40px — the height of "Add to Bag"
 * on a PDP — square, hairline-bordered, label in the sans at weight 350 in
 * sentence case. The previous version filled to solid black on hover, which is
 * how the brand marks a *primary* action; a secondary control settling onto the
 * #f6f6f6 stage grey is the quieter, more accurate move.
 */
function OutlinedButton({
  children,
  onClick,
  trailing,
}: {
  children: React.ReactNode;
  onClick: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-[10px] flex h-10 w-full items-center justify-between border border-hairline px-4 text-ink transition-colors duration-200 ease-[var(--ease-editorial)] hover:border-ink hover:bg-stage"
    >
      <span className="brand-label">{children}</span>
      {trailing}
    </button>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`grid size-[35px] place-items-center text-ink transition-opacity ${
        disabled ? "cursor-default opacity-20" : "opacity-70 hover:opacity-100"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Reads the configuration back as a specification list, in the shape of the
 * "Product Details" block on a Burberry PDP: a serif heading over hairline-
 * separated rows, label in grey and value in black, both in the sans at 350.
 */
function Specification({ parts }: { parts: Parts }) {
  return (
    <div className="mt-8">
      <h3 className="brand-heading mb-2">Specification</h3>
      <dl>
        {PARTS.map((part) => {
          const chosen = selectionLabel(part.name, parts[part.name] ?? null);
          return (
            <div
              key={part.name}
              className="flex items-baseline justify-between border-b border-hairline py-2 last:border-b-0"
            >
              <dt className="brand-label text-muted">{part.label}</dt>
              <dd className={`brand-label ${chosen ? "text-ink" : "text-muted"}`}>
                {chosen ?? "None"}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

export function RightColumn({
  parts,
  size,
  initials,
  expanded,
  canUndo,
  canRedo,
  canStartOver,
  onOpenInitials,
  onOpenSize,
  onToggleFilters,
  onUndo,
  onRedo,
  onStartOver,
  onFullscreen,
}: RightColumnProps) {
  return (
    <div className="w-full">
      {/* The product title sits at the same 20px/24px serif as a PDP h1 — the
          brand does not scale headings up for emphasis, and the 30px light serif
          that was here read as a different house entirely. */}
      <div className="mb-6">
        <h1 className="brand-heading">{MODEL_TITLE}</h1>
        <p className="brand-label mt-1 text-muted">{MODEL_SUBTITLE}</p>
      </div>

      <OutlinedButton onClick={onOpenInitials}>
        {initials ? `Initials — ${initials}` : "Add initials"}
      </OutlinedButton>

      <OutlinedButton onClick={onOpenSize}>
        {`Size — ${fullSizeLabel(size)}`}
      </OutlinedButton>

      <OutlinedButton
        onClick={onToggleFilters}
        trailing={
          <span className="brand-label leading-none">{expanded ? "−" : "+"}</span>
        }
      >
        {expanded ? "Hide filters" : "Show filters"}
      </OutlinedButton>

      <div className="my-3 flex h-[35px] items-center justify-between">
        <div className="flex">
          <IconButton label="Undo" disabled={!canUndo} onClick={onUndo}>
            <UndoIcon className="size-5" />
          </IconButton>
          <IconButton label="Redo" disabled={!canRedo} onClick={onRedo}>
            <RedoIcon className="size-5" />
          </IconButton>
        </div>
        <div className="flex">
          <IconButton label="Start over" disabled={!canStartOver} onClick={onStartOver}>
            <StartOverIcon className="size-5" />
          </IconButton>
          <IconButton label="Fullscreen" onClick={onFullscreen}>
            <FullscreenIcon className="size-[18px]" />
          </IconButton>
        </div>
      </div>

      <Specification parts={parts} />
    </div>
  );
}

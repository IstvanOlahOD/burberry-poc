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
      /* Squared with a hairline edge, and the hover fills to ink rather than
         tinting — a definite state change reads more considered than a wash. */
      className="group mb-[10px] flex h-[46px] w-full items-center justify-between border border-hairline px-5 text-ink transition-colors duration-300 ease-[var(--ease-editorial)] hover:border-ink hover:bg-ink hover:text-white"
    >
      <span className="label-caps">{children}</span>
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
 * Reads the configuration back as a specification list. The column had a lot of
 * empty space below Details, and a spec sheet is what a considered product page
 * puts there — it also means the current choices are legible without opening
 * the picker.
 */
function Specification({ parts }: { parts: Parts }) {
  return (
    <div className="mt-6 border-t border-hairline pt-5">
      <h3 className="label-caps mb-1 text-ink">Specification</h3>
      <dl>
        {PARTS.map((part) => {
          const chosen = selectionLabel(part.name, parts[part.name] ?? null);
          return (
            <div
              key={part.name}
              className="flex items-baseline justify-between border-b border-hairline py-[7px] last:border-b-0"
            >
              <dt className="text-[12px] tracking-[0.04em] text-foreground">
                {part.label}
              </dt>
              <dd
                className={`text-[12px] tracking-[0.04em] ${
                  chosen ? "text-ink" : "text-muted"
                }`}
              >
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
      {/* The page never named the garment. A configurator without a product
          title reads as a tool; with one it reads as a product page. */}
      <div className="mb-7">
        <h1 className="font-serif text-[30px] leading-[1.1] font-light text-ink">
          {MODEL_TITLE}
        </h1>
        <p className="label-caps mt-[10px] text-muted">{MODEL_SUBTITLE}</p>
      </div>

      <OutlinedButton onClick={onOpenInitials}>
        {initials ? `Initials - ${initials}` : "Add initials"}
      </OutlinedButton>

      <OutlinedButton onClick={onOpenSize}>
        {`Size - ${fullSizeLabel(size)}`}
      </OutlinedButton>

      <OutlinedButton
        onClick={onToggleFilters}
        trailing={<span className="text-[16px] leading-none">{expanded ? "-" : "+"}</span>}
      >
        {expanded ? "Hide filters" : "Show filters"}
      </OutlinedButton>

      <div className="my-4 flex h-[35px] items-center justify-between">
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

      {/* A hairline above the section replaces the bare heading, giving the
          column a base line to sit on. */}
      <div className="mt-6 border-t border-hairline pt-5">
        <h3 className="label-caps mb-[14px] text-ink">Details</h3>
        <p className="mb-[10px] text-[12px] leading-[18px] text-foreground">
          The image serves as an indication, and the final product may have small
          differences in the shades of color or material.
        </p>
        <p className="text-[12px] leading-[18px] text-foreground">
          Once a product is personalized, it cannot be returned.
        </p>
      </div>
    </div>
  );
}

"use client";

import { fullSizeLabel } from "@/lib/ripe";
import {
  FullscreenIcon,
  RedoIcon,
  StartOverIcon,
  UndoIcon,
} from "./icons";

type RightColumnProps = {
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
      className="mb-[10px] flex h-[46px] w-full items-center justify-between rounded-[4px] border border-ink px-5 text-[14px] font-medium text-ink transition-colors hover:bg-ink/5"
    >
      <span>{children}</span>
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

export function RightColumn({
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
    <div className="w-[250px]">
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

      <div className="mt-4">
        <h3 className="mb-[10px] text-[15px] font-medium tracking-[0.25px] text-foreground">
          Details
        </h3>
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

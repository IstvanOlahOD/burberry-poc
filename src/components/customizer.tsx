"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PARTS, frameIndex, type Selection } from "@/lib/ripe";
import {
  DEFAULT_CUSTOMIZATION,
  queryFromCustomization,
  sameCustomization,
  type Customization,
} from "@/lib/state";
import { InitialsModal } from "./initials-modal";
import { PickerPanel } from "./picker-panel";
import { RightColumn } from "./right-column";
import { SizeModal } from "./size-modal";
import { StartOverModal } from "./start-over-modal";
import { Thumbnails } from "./thumbnails";
import { Viewer } from "./viewer";

type CustomizerProps = {
  initial: Customization;
  initialFrame: string;
};

export function Customizer({ initial, initialFrame }: CustomizerProps) {
  const [history, setHistory] = useState({ entries: [initial], cursor: 0 });
  const [index, setIndex] = useState(() => frameIndex(initialFrame));
  const [selectedPart, setSelectedPart] = useState<string | null>(
    PARTS[0].name,
  );
  const [expanded, setExpanded] = useState(false);
  const [modal, setModal] = useState<"initials" | "size" | "start-over" | null>(
    null,
  );
  const [showHint, setShowHint] = useState(true);
  const fullscreenRef = useRef<HTMLDivElement>(null);

  const current = history.entries[history.cursor];
  const canUndo = history.cursor > 0;
  const canRedo = history.cursor < history.entries.length - 1;

  /** Pushes a new state, dropping anything that was ahead of the cursor. */
  const commit = useCallback((next: Customization) => {
    setHistory(({ entries, cursor }) => {
      const trimmed = entries.slice(0, cursor + 1);
      if (sameCustomization(trimmed[trimmed.length - 1], next)) {
        return { entries: trimmed, cursor: trimmed.length - 1 };
      }
      return { entries: [...trimmed, next], cursor: trimmed.length };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((state) => ({
      ...state,
      cursor: Math.max(0, state.cursor - 1),
    }));
  }, []);

  const redo = useCallback(() => {
    setHistory((state) => ({
      ...state,
      cursor: Math.min(state.entries.length - 1, state.cursor + 1),
    }));
  }, []);

  // Keep the address bar in step with the customization, as the source
  // configurator does, so a configuration stays shareable.
  useEffect(() => {
    window.history.replaceState(null, "", queryFromCustomization(current));
  }, [current]);

  // The turntable hint fades on its own if the model is never dragged.
  useEffect(() => {
    const handle = window.setTimeout(() => setShowHint(false), 2000);
    return () => window.clearTimeout(handle);
  }, []);

  const onSelectPart = (name: string) => {
    setSelectedPart(name);
    setExpanded(true);
  };

  const onSelect = (name: string, selection: Selection | null) => {
    commit({ ...current, parts: { ...current.parts, [name]: selection } });
  };

  const onFullscreen = () => {
    // Fullscreen renders only the target's subtree, so this has to be the root
    // that also holds the picker panel and the dialogs. Targeting the columns
    // alone left the filters — and every modal — invisible.
    const root = fullscreenRef.current;
    if (!root) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void root.requestFullscreen();
  };

  return (
    <div
      ref={fullscreenRef}
      className="flex min-h-dvh flex-col bg-background"
    >
      <div className="flex min-h-0 flex-1 justify-center bg-background">
        {/* The source caps the stage at 1500px of content behind a 12px left
            inset and centres it; the rails hold 250px and the viewer column
            takes whatever is left. */}
        <div className="flex w-full max-w-[1512px] pl-3">
          <aside className="w-[250px] shrink-0 pt-[110px] pb-[53px]">
            <Thumbnails
              parts={current.parts}
              index={index}
              onIndexChange={setIndex}
            />
          </aside>

          <Viewer
            parts={current.parts}
            index={index}
            onIndexChange={setIndex}
            showHint={showHint}
            onHintDismiss={() => setShowHint(false)}
          />

          <aside className="w-[262px] shrink-0 pt-[110px] pr-3 pb-[53px]">
            <RightColumn
              parts={current.parts}
              size={current.size}
              initials={current.initials}
              expanded={expanded}
              canUndo={canUndo}
              canRedo={canRedo}
              canStartOver={!sameCustomization(current, DEFAULT_CUSTOMIZATION)}
              onOpenInitials={() => setModal("initials")}
              onOpenSize={() => setModal("size")}
              onToggleFilters={() => setExpanded((value) => !value)}
              onUndo={undo}
              onRedo={redo}
              onStartOver={() => setModal("start-over")}
              onFullscreen={onFullscreen}
            />
          </aside>
        </div>
      </div>

      <PickerPanel
        parts={current.parts}
        selectedPart={selectedPart}
        expanded={expanded}
        onSelectPart={onSelectPart}
        onSelect={onSelect}
        onClose={() => setExpanded(false)}
      />

      {modal === "initials" ? (
        <InitialsModal
          parts={current.parts}
          initials={current.initials}
          onClose={() => setModal(null)}
          onApply={(initials) => commit({ ...current, initials })}
        />
      ) : null}

      {modal === "size" ? (
        <SizeModal
          size={current.size}
          onClose={() => setModal(null)}
          onSelect={(size) => commit({ ...current, size })}
        />
      ) : null}

      {modal === "start-over" ? (
        <StartOverModal
          onClose={() => setModal(null)}
          onConfirm={() => commit(DEFAULT_CUSTOMIZATION)}
        />
      ) : null}
    </div>
  );
}

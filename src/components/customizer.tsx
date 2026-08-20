"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  composeUrl,
  frameIndex,
  frameName,
  swatchUrl,
  upstreamComposeUrl,
  upstreamSwatchUrl,
  VIEWER_SIZE,
  type Selection,
} from "@/lib/ripe";
import {
  queryFromCustomization,
  sameCustomization,
  type Customization,
} from "@/lib/state";
import { AdvisorBar } from "./advisor-bar";
import { ApiInspector, type LogEntry } from "./api-inspector";
import { Canvas } from "./canvas";
import { Options } from "./options";
import { OrderSheet, orderPayload } from "./order-sheet";
import { PricePanel } from "./price-panel";
import { StepsNav } from "./steps-nav";

type CustomizerProps = {
  initial: Customization;
  initialFrame: string;
};

/** Newest first, and bounded so a long consultation cannot grow without limit. */
const LOG_LIMIT = 40;

export function Customizer({ initial, initialFrame }: CustomizerProps) {
  /**
   * The configuration, kept as a history even though nothing steps through it
   * any more: the undo/redo controls are gone from the canvas. Holding the trail
   * costs one entry per change and means restoring those controls is a matter of
   * re-adding the buttons, not rebuilding the state.
   */
  const [history, setHistory] = useState({ entries: [initial], cursor: 0 });
  const [index, setIndex] = useState(() => frameIndex(initialFrame));
  const [orderOpen, setOrderOpen] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [activeStep, setActiveStep] = useState("p-body");
  const [log, setLog] = useState<LogEntry[]>([]);
  const logId = useRef(0);

  const current = history.entries[history.cursor];

  /**
   * Records a call in the inspector. These are the requests the app really
   * makes — the app's own `/api/render`, with the upstream RIPE URL it rebuilds
   * shown in the expanded detail — except where `hypothetical` says otherwise.
   */
  const record = useCallback((entry: Omit<LogEntry, "id">) => {
    setLog((entries) => {
      const next = [{ ...entry, id: logId.current++ }, ...entries];
      return next.slice(0, LOG_LIMIT);
    });
  }, []);

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

  // Keep the address bar in step with the configuration, so it stays shareable.
  useEffect(() => {
    window.history.replaceState(null, "", queryFromCustomization(current));
  }, [current]);

  // The turntable hint fades on its own if the coat is never dragged.
  useEffect(() => {
    const handle = window.setTimeout(() => setShowHint(false), 2400);
    return () => window.clearTimeout(handle);
  }, []);

  // The frame request the page opens with. Guarded against StrictMode's double
  // invoke so the log does not start with the same line twice.
  const loggedInitial = useRef(false);
  useEffect(() => {
    if (loggedInitial.current) return;
    loggedInitial.current = true;
    const frame = frameName(index);
    record({
      method: "GET",
      url: composeUrl({ parts: current.parts, frame, size: VIEWER_SIZE }),
      why: "initial frame",
      detail: `rebuilt upstream →\n${upstreamComposeUrl(
        current.parts,
        frame,
        VIEWER_SIZE,
        "webp",
      )}`,
    });
    // Intentionally once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSelect = (name: string, selection: Selection | null) => {
    commit({ ...current, parts: { ...current.parts, [name]: selection } });

    if (selection) {
      record({
        method: "GET",
        url: swatchUrl(selection.material, selection.color),
        why: `${name} swatch`,
        detail: `rebuilt upstream →\n${upstreamSwatchUrl(
          selection.material,
          selection.color,
        )}`,
      });
    }

    const nextParts = { ...current.parts, [name]: selection };
    const frame = frameName(index);
    record({
      method: "GET",
      url: composeUrl({ parts: nextParts, frame, size: VIEWER_SIZE }),
      why: "re-render viewport",
      detail: `rebuilt upstream →\n${upstreamComposeUrl(
        nextParts,
        frame,
        VIEWER_SIZE,
        "webp",
      )}`,
    });
  };

  const onFrame = (next: number) => {
    setIndex(next);
    const frame = frameName(next);
    record({
      method: "GET",
      url: composeUrl({ parts: current.parts, frame, size: VIEWER_SIZE }),
      why: `frame ${frame}`,
      detail: `rebuilt upstream →\n${upstreamComposeUrl(
        current.parts,
        frame,
        VIEWER_SIZE,
        "webp",
      )}`,
    });
  };

  const onReview = () => {
    record({
      method: "POST",
      url: "/api/orders/import",
      why: "create production order",
      hypothetical: true,
      detail: JSON.stringify(orderPayload(current), null, 1),
    });
    setOrderOpen(true);
  };

  const onStepSelect = (id: string) => {
    setActiveStep(id);
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  return (
    <div className="frame">
      <AdvisorBar />

      <div className="stage">
        <StepsNav
          current={current}
          activeId={activeStep}
          onSelect={onStepSelect}
        />

        <Canvas
          parts={current.parts}
          index={index}
          onIndexChange={onFrame}
          showHint={showHint}
          onHintDismiss={() => setShowHint(false)}
        />

        <aside>
          <Options current={current} onSelect={onSelect} />
          <PricePanel current={current} onReview={onReview} />
        </aside>
      </div>

      <ApiInspector entries={log} />

      {orderOpen ? (
        <OrderSheet current={current} onClose={() => setOrderOpen(false)} />
      ) : null}
    </div>
  );
}

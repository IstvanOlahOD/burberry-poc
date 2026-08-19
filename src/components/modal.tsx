"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CloseIcon } from "./icons";

/**
 * How long the leave animation runs before the dialog is unmounted: the panel
 * goes first, then the overlay fades after its delay.
 */
const LEAVE_MS = 450;

const ModalCloseContext = createContext<() => void>(() => {});

/** Lets dialog content (Apply, Select, …) dismiss through the leave animation. */
export function useModalClose(): () => void {
  return useContext(ModalCloseContext);
}

type ModalProps = {
  /** Unmounts the dialog; called once the leave animation has finished. */
  onClose: () => void;
  title: string;
  /** Content width, matching the source; the container adds 40px either side. */
  width: number;
  children: React.ReactNode;
};

export function Modal({ onClose, title, width, children }: ModalProps) {
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number | null>(null);

  const requestClose = useCallback(() => {
    if (timer.current !== null) return;
    setLeaving(true);
    timer.current = window.setTimeout(onClose, LEAVE_MS);
  }, [onClose]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [requestClose]);

  // Kept apart from the listener above: that effect re-runs whenever the parent
  // re-renders, and tearing the timer down there would cancel a leave already
  // in flight — which is exactly what happens when Apply or Select commits
  // state on its way out.
  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <div className={`modal-root ${leaving ? "modal-leave" : "modal-enter"}`}>
      <div className="modal-overlay" onClick={requestClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ width }}
        className="modal-container"
      >
        <button type="button" onClick={requestClose} aria-label="Close" className="modal-close">
          <CloseIcon className="size-[25px]" />
        </button>

        <div className="pt-10">
          <h3 className="modal-title">{title}</h3>
          <div className="modal-rule" />
          <ModalCloseContext.Provider value={requestClose}>{children}</ModalCloseContext.Provider>
        </div>

        <div className="h-10" />
      </div>
    </div>
  );
}

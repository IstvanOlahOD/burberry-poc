"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/**
 * How long the leave animation runs before the dialog is unmounted: the panel
 * goes first, then the overlay fades after its delay.
 */
const LEAVE_MS = 450;

const ModalCloseContext = createContext<() => void>(() => {});

/** Lets dialog content dismiss through the leave animation. */
export function useModalClose(): () => void {
  return useContext(ModalCloseContext);
}

type ModalProps = {
  /** Unmounts the dialog; called once the leave animation has finished. */
  onClose: () => void;
  /** Labels the dialog for assistive tech; the visible heading is in `children`. */
  label: string;
  /** Content width; the container's 30px padding sits outside it. */
  width: number;
  children: React.ReactNode;
};

/**
 * A bare dialog shell. The design's sheet supplies its own heading, sub-line and
 * button row, so this contributes only the overlay, the container, escape-to-
 * close and the enter/leave animation.
 */
export function Modal({ onClose, label, width, children }: ModalProps) {
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
  // re-renders, and tearing the timer down there would cancel a leave already in
  // flight — which is exactly what happens when a button commits state on its
  // way out.
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
        aria-label={label}
        style={{ width, maxWidth: "92%" }}
        className="modal-container"
      >
        <ModalCloseContext.Provider value={requestClose}>
          {children}
        </ModalCloseContext.Provider>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_FORMAT,
  FALLBACK_FORMAT,
  INITIALS_MAX,
  normalizeInitials,
  personalizationPreviewUrl,
  type Format,
  type Parts,
} from "@/lib/ripe";
import { Modal, useModalClose } from "./modal";

/** Typing must not fire a render request per keystroke. */
const PREVIEW_DEBOUNCE_MS = 250;

type InitialsModalProps = {
  parts: Parts;
  initials: string;
  onClose: () => void;
  onApply: (initials: string) => void;
};

function InitialsForm({
  parts,
  initials,
  onApply,
}: {
  parts: Parts;
  initials: string;
  onApply: (initials: string) => void;
}) {
  const [draft, setDraft] = useState(initials);
  const [previewInitials, setPreviewInitials] = useState(initials);
  const [format, setFormat] = useState<Format>(DEFAULT_FORMAT);
  const close = useModalClose();

  // The input keeps `draft` so typing stays responsive; only the preview URL
  // waits, so a burst of keystrokes costs one render instead of one each.
  useEffect(() => {
    const handle = window.setTimeout(
      () => setPreviewInitials(draft),
      PREVIEW_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(handle);
  }, [draft]);

  return (
    <>
      <div className="h-[300px] text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote compose render. */}
        <img
          src={personalizationPreviewUrl(parts, previewInitials, format)}
          alt="Preview of the personalised trench coat"
          onError={() => {
            if (format === DEFAULT_FORMAT) setFormat(FALLBACK_FORMAT);
          }}
          width={300}
          height={300}
          className="inline-block size-[300px]"
        />
      </div>

      <div>
        <label
          htmlFor="initials"
          className="mb-[10px] block text-[14px] leading-4 font-medium text-[#1d1d1d]"
        >
          Initials
        </label>
        <input
          id="initials"
          value={draft}
          onChange={(event) => setDraft(normalizeInitials(event.target.value))}
          placeholder="Add initials"
          maxLength={INITIALS_MAX}
          className="h-11 w-full border border-hairline bg-white px-[14px] py-px text-[16px] tracking-[0.08em] text-ink transition-colors duration-200 ease-[var(--ease-editorial)] placeholder:tracking-normal placeholder:text-muted focus:border-ink focus:outline-none"
        />
      </div>

      <div className="mt-10 flex justify-evenly">
        <button
          type="button"
          onClick={() => setDraft("")}
          className="label-caps h-11 border border-hairline text-ink transition-colors duration-300 ease-[var(--ease-editorial)] hover:border-ink hover:bg-ink hover:text-white w-[250px]"
        >
          Clear initials
        </button>
        <button
          type="button"
          onClick={() => {
            onApply(draft);
            close();
          }}
          className="label-caps h-11 border border-ink bg-ink text-white transition-colors duration-300 ease-[var(--ease-editorial)] hover:bg-[#2e2e2e] w-[250px]"
        >
          Apply
        </button>
      </div>
    </>
  );
}

export function InitialsModal({ parts, initials, onClose, onApply }: InitialsModalProps) {
  return (
    <Modal onClose={onClose} title="Personalisation" width={600}>
      <InitialsForm parts={parts} initials={initials} onApply={onApply} />
    </Modal>
  );
}

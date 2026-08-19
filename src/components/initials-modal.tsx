"use client";

import { useState } from "react";
import { INITIALS_MAX, normalizeInitials, personalizationPreviewUrl, type Parts } from "@/lib/ripe";
import { Modal, useModalClose } from "./modal";

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
  const close = useModalClose();

  return (
    <>
      <div className="h-[300px] text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote compose render. */}
        <img
          src={personalizationPreviewUrl(parts, draft)}
          alt="Preview of the personalised trench coat"
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
          className="h-11 w-full rounded-[4px] border border-[#ccc] bg-white px-[14px] py-px text-[14px] text-ink placeholder:text-muted focus:border-[#151515] focus:outline-none"
        />
      </div>

      <div className="mt-10 flex justify-evenly">
        <button
          type="button"
          onClick={() => setDraft("")}
          className="h-11 w-[250px] rounded-[4px] border border-[#ccc] text-[15px] font-medium text-[#0d0d0d]"
        >
          Clear initials
        </button>
        <button
          type="button"
          onClick={() => {
            onApply(draft);
            close();
          }}
          className="h-11 w-[250px] rounded-[4px] border border-[#151515] bg-[#151515] text-[15px] font-medium text-white"
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

"use client";

import { useState } from "react";
import { NATIVE_SIZES, sizeLabel } from "@/lib/ripe";
import { Modal, useModalClose } from "./modal";

type SizeModalProps = {
  size: number;
  onClose: () => void;
  onSelect: (size: number) => void;
};

function SizeForm({ size, onSelect }: { size: number; onSelect: (size: number) => void }) {
  const [draft, setDraft] = useState(size);
  const close = useModalClose();

  return (
    <>
      {/* 58px tiles, each carrying the source’s trailing 10px margin — that
          margin is what offsets the centred rows by 5px. */}
      <div className="pt-8">
        <ul className="mt-[10px] flex flex-wrap justify-center">
          {NATIVE_SIZES.map((native) => {
            const active = native === draft;
            return (
              <li key={native} className="mr-[10px] mb-[10px]">
                <button
                  type="button"
                  onClick={() => setDraft(native)}
                  aria-pressed={active}
                  className={`brand-label-lg size-[58px] border transition-colors duration-200 ease-[var(--ease-editorial)] ${
                    active
                      ? "border-ink bg-ink text-white"
                      : "border-hairline bg-white text-ink hover:border-ink hover:bg-stage"
                  }`}
                >
                  {sizeLabel(native)}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-10 text-center">
        <button
          type="button"
          onClick={() => {
            onSelect(draft);
            close();
          }}
          className="brand-label-lg h-10 border border-knight bg-knight text-white transition-colors duration-200 ease-[var(--ease-editorial)] hover:bg-[#000399] w-[46%]"
        >
          Select
        </button>
      </div>
    </>
  );
}

export function SizeModal({ size, onClose, onSelect }: SizeModalProps) {
  return (
    <Modal onClose={onClose} title="Size" width={492}>
      <SizeForm size={size} onSelect={onSelect} />
    </Modal>
  );
}

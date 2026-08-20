"use client";

import { Modal, useModalClose } from "./modal";

type StartOverModalProps = {
  onClose: () => void;
  onConfirm: () => void;
};

function StartOverBody({ onConfirm }: { onConfirm: () => void }) {
  const close = useModalClose();

  return (
    <>
      <h4 className="brand-label-lg text-center text-ink">
        You&rsquo;re about to start a new customization.
      </h4>
      <p className="brand-label mx-auto mt-4 max-w-[420px] text-center text-muted">
        By starting a customization the current configuration is going to be reverted. You
        won&rsquo;t be able to recover it.
      </p>

      <div className="mt-8 flex justify-evenly">
        <button
          type="button"
          onClick={close}
          className="brand-label-lg h-10 border border-hairline text-ink transition-colors duration-200 ease-[var(--ease-editorial)] hover:border-ink hover:bg-stage w-[250px]"
        >
          Continue customizing
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            close();
          }}
          className="brand-label-lg h-10 border border-knight bg-knight text-white transition-colors duration-200 ease-[var(--ease-editorial)] hover:bg-[#000399] w-[250px]"
        >
          Reset customization
        </button>
      </div>
    </>
  );
}

export function StartOverModal({ onClose, onConfirm }: StartOverModalProps) {
  return (
    <Modal onClose={onClose} title="Start Over" width={580}>
      <StartOverBody onConfirm={onConfirm} />
    </Modal>
  );
}

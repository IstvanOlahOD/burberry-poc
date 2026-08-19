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
      <h4 className="text-center text-[16px] font-medium text-ink">
        You&rsquo;re about to start a new customization.
      </h4>
      <p className="mx-auto mt-4 max-w-[420px] text-center text-[12px] leading-[18px] text-foreground">
        By starting a customization the current configuration is going to be reverted. You
        won&rsquo;t be able to recover it.
      </p>

      <div className="mt-8 flex justify-evenly">
        <button
          type="button"
          onClick={close}
          className="label-caps h-11 border border-hairline text-ink transition-colors duration-300 ease-[var(--ease-editorial)] hover:border-ink hover:bg-ink hover:text-white w-[250px]"
        >
          Continue customizing
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            close();
          }}
          className="label-caps h-11 border border-ink bg-ink text-white transition-colors duration-300 ease-[var(--ease-editorial)] hover:bg-[#2e2e2e] w-[250px]"
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

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
          className="h-11 w-[250px] rounded-[4px] border border-[#ccc] text-[15px] font-medium text-[#0d0d0d]"
        >
          Continue customizing
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            close();
          }}
          className="h-11 w-[250px] rounded-[4px] border border-[#151515] bg-[#151515] text-[15px] font-medium text-white"
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

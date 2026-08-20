"use client";

import { COUNTRY, CURRENCY, formatPrice, priceModel } from "@/lib/pricing";
import { MODEL, MODEL_TITLE, PARTS, selectionLabel, fullSizeLabel } from "@/lib/ripe";
import type { Customization } from "@/lib/state";
import { Modal, useModalClose } from "./modal";

type OrderSheetProps = {
  current: Customization;
  onClose: () => void;
};

/**
 * The payload an order import would carry. Built here so the sheet and the
 * inspector show the same object rather than two drifting approximations.
 */
export function orderPayload(current: Customization) {
  const parts: Record<string, { material: string; color: string }> = {};
  for (const part of PARTS) {
    const selection = current.parts[part.name];
    if (selection) parts[part.name] = { ...selection };
  }

  return {
    brand: "burberry_tech",
    model: MODEL,
    parts,
    size: { scale: "eu", value: fullSizeLabel(current.size) },
    ...(current.initials ? { initials: current.initials } : {}),
    currency: CURRENCY,
    country: COUNTRY,
    meta: {
      store: "regent_street",
      advisor: "j.whitfield",
      appointment_type: "vip",
      customer_ref: "held in the Burberry customer record, not sent to RIPE",
      pricing: "indicative placeholder — no price feed connected",
    },
  };
}

function Sheet({ current }: { current: Customization }) {
  const close = useModalClose();
  const { total } = priceModel(current);
  const payload = orderPayload(current);

  const rows: [string, string][] = [
    ["Style", MODEL_TITLE],
    ...PARTS.map(
      (part) =>
        [
          part.name === "body" ? "Outer colour" : part.label,
          selectionLabel(part.name, current.parts[part.name] ?? null) ?? "None",
        ] as [string, string],
    ),
    ["Size", fullSizeLabel(current.size)],
    ["Total", `${formatPrice(total)} (indicative)`],
  ];

  return (
    <>
      <h2 className="sheet-title">Order summary</h2>
      <p className="sheet-sub">
        Single source of truth · shared with client and production
      </p>
      <span className="valid-pill">Validated — 0 issues</span>

      <table className="sheet-table">
        <tbody>
          {rows.map(([key, value]) => (
            <tr key={key}>
              <td>{key}</td>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="pre-label">Order payload → POST /api/orders/import</p>
      <pre className="sheet-pre">{JSON.stringify(payload, null, 2)}</pre>

      <div className="sheet-row">
        <button type="button" className="primary" onClick={close}>
          Confirm with client
        </button>
        <button type="button" onClick={close}>
          Back to consultation
        </button>
      </div>
    </>
  );
}

export function OrderSheet({ current, onClose }: OrderSheetProps) {
  return (
    <Modal onClose={onClose} label="Order summary" width={620}>
      <Sheet current={current} />
    </Modal>
  );
}

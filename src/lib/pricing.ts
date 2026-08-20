import { MODEL_TITLE, PARTS, selectionLabel } from "./ripe";
import type { Customization } from "./state";

/**
 * Indicative placeholder pricing.
 *
 * There is no price feed behind this. RIPE exposes `GET /api/config/price`, which
 * returns a per-part breakdown for a brand/model/country/currency, but the
 * Burberry trench builds do not exist in the sandbox yet, so nothing real can be
 * asked for. These figures exist so the panel has the right shape and the totals
 * move when the configuration moves — they must not be quoted to a customer.
 *
 * When the builds land, replace `priceModel` with a fetch of that endpoint; the
 * `PriceLine[]` shape is deliberately what its `components` array reduces to.
 */
export const INDICATIVE = true;

const BASE = 2590;
const PERSONALISATION = 150;
const LABEL_PATCH = 90;

export const CURRENCY = "GBP";
export const COUNTRY = "GB";

export type PriceLine = { label: string; amount: number };

export function formatPrice(amount: number): string {
  return `£${amount.toLocaleString("en-GB")}`;
}

export function priceModel(current: Customization): {
  lines: PriceLine[];
  total: number;
} {
  const lines: PriceLine[] = [{ label: `Style — ${MODEL_TITLE}`, amount: BASE }];

  // Colour choices carry no uplift; they are listed so the advisor can read the
  // configuration back off the price panel.
  for (const part of PARTS) {
    if (part.name === "label_patch") continue;
    const chosen = selectionLabel(part.name, current.parts[part.name] ?? null);
    if (!chosen) continue;
    lines.push({ label: `${part.label} — ${chosen}`, amount: 0 });
  }

  if (current.parts.label_patch) {
    lines.push({ label: "Label patch", amount: LABEL_PATCH });
  }

  if (current.initials) {
    lines.push({
      label: `Personalisation — ${current.initials}`,
      amount: PERSONALISATION,
    });
  }

  return {
    lines,
    total: lines.reduce((sum, line) => sum + line.amount, 0),
  };
}

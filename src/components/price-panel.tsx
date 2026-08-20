"use client";

import { COUNTRY, CURRENCY, formatPrice, priceModel } from "@/lib/pricing";
import type { Customization } from "@/lib/state";

type PricePanelProps = {
  current: Customization;
  onReview: () => void;
};

export function PricePanel({ current, onReview }: PricePanelProps) {
  const { lines, total } = priceModel(current);

  return (
    <>
      <div className="price-panel">
        <h3>Configuration price</h3>
        {lines.map((line) => (
          <div key={line.label} className="pl">
            <span>{line.label}</span>
            <span>{line.amount ? `+${formatPrice(line.amount)}` : "Included"}</span>
          </div>
        ))}
        <div className="pl total">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
        <p className="price-src">
          Indicative only. Would mirror{" "}
          <span>GET /api/config/price</span> · {CURRENCY} · {COUNTRY}
        </p>
        <button type="button" className="cta" onClick={onReview}>
          Review order
        </button>
      </div>

      <p className="step-note">
        The render is an indication; the finished coat may differ slightly in
        shade or material. Personalised pieces cannot be returned.
      </p>
    </>
  );
}

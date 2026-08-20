import { BurberryWordmark } from "./burberry-wordmark";

/**
 * Appointment context for the masthead.
 *
 * Placeholder detail, as in the design. A real deployment would take these from
 * the store's appointment system — they are not RIPE's to hold, and the customer
 * record deliberately stays on the Burberry side.
 */
const APPOINTMENT = [
  { label: "Store", value: "Regent Street" },
  { label: "Appointment", value: "VIP · 14:30" },
  { label: "Client", value: "A. Moreau" },
  { label: "Advisor", value: "J. Whitfield" },
];

export function AdvisorBar() {
  return (
    <>
      <header className="bar">
        {/* The design set the wordmark as letterspaced serif capitals; the real
            artwork is available, so it is used instead, with the tool's own name
            beside it behind a hairline. */}
        <div className="flex items-baseline gap-4">
          <BurberryWordmark className="h-[18px] w-[112px] shrink-0 text-ink" />
          <span
            className="display border-l border-hairline pl-4 text-[15px] tracking-[0.2em] uppercase"
            style={{ lineHeight: 1 }}
          >
            Bespoke Trench
          </span>
        </div>

        <div className="bar-meta">
          {APPOINTMENT.map((entry) => (
            <div key={entry.label}>
              {entry.label} <b>{entry.value}</b>
            </div>
          ))}
        </div>
      </header>

      <p className="proto-note">
        Working prototype v0.2 —{" "}
        <span>
          pricing is an indicative placeholder and the appointment details are
          dummy data.
        </span>{" "}
        The options and the render are live: every swatch and every frame is a
        real call to the RIPE sandbox, shown in the inspector below.
      </p>
    </>
  );
}

"use client";

export type LogEntry = {
  id: number;
  method: "GET" | "POST";
  url: string;
  why: string;
  /** Expanded detail — the upstream URL, or a request payload. */
  detail?: string;
  /**
   * True for calls this prototype does *not* make: the order import has no
   * endpoint behind it yet. Marked in the log rather than dressed up as real,
   * because the whole point of this panel is to be trustworthy about what fires.
   */
  hypothetical?: boolean;
};

type ApiInspectorProps = {
  entries: LogEntry[];
};

export function ApiInspector({ entries }: ApiInspectorProps) {
  return (
    <div className="inspector">
      <div className="inspector-head">
        <h2>RIPE API inspector</h2>
        <span>
          real calls this prototype fires · newest first · anything marked
          &ldquo;would fire&rdquo; has no endpoint yet
        </span>
      </div>
      <div className="log">
        {entries.length === 0 ? (
          <p className="body-pre" style={{ margin: "8px 16px" }}>
            No calls yet.
          </p>
        ) : (
          entries.map((entry) => (
            <details key={entry.id}>
              <summary>
                <span className={`m ${entry.method}`}>{entry.method}</span>
                <span className="u">{entry.url}</span>
                <span className="why">
                  {entry.hypothetical ? `${entry.why} · would fire` : entry.why}
                </span>
              </summary>
              <div className="body-pre">{entry.detail ?? entry.url}</div>
            </details>
          ))
        )}
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDownWideShort,
  faArrowUpShortWide,
  faCaretDown,
  faCaretUp,
  faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";
import "../main_page/PastPrintsLog.css";
import { DEFAULT_ESTIMATED_REMAINING_MINUTES } from "./logConstants";
import "./LogsPage.css";

function startedAtMs(entry) {
  const ms = Date.parse(entry.startedAt ?? "");
  return Number.isNaN(ms) ? 0 : ms;
}

function formatLocalDate(entry) {
  const ms = startedAtMs(entry);
  if (!ms) return entry.date || "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(new Date(ms))
    .replaceAll("/", "-");
}

export default function LogsPage({ entries = [], onSelectPrint, loading = false, error = "" }) {
  const [query, setQuery] = useState("");
  const [sortDir, setSortDir] = useState("desc");
  const [showLiveSheet, setShowLiveSheet] = useState(true);

  const featuredRows = useMemo(() => {
    return entries
      .filter((entry) => entry.status === "running")
      .map((entry) => ({ ...entry, realId: entry.id }));
  }, [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = entries.filter((entry) => entry.status !== "running");

    if (q) {
      list = list.filter((entry) =>
        (entry.projectName || "").toLowerCase().includes(q) ||
        formatLocalDate(entry).toLowerCase().includes(q) ||
        (entry.device || "").toLowerCase().includes(q) ||
        (entry.tag || "").toLowerCase().includes(q)
      );
    }

    list.sort((a, b) =>
      sortDir === "asc"
        ? startedAtMs(a) - startedAtMs(b)
        : startedAtMs(b) - startedAtMs(a)
    );

    return list;
  }, [entries, query, sortDir]);

  const toggleSort = () => setSortDir((current) => (current === "asc" ? "desc" : "asc"));

  return (
    <div className="logs-page">
      <div className="logs-page__header-row">
        <div className="logs-page__controls">
          <div className="logs-page__search-wrap">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="logs-page__search-icon" />
            <input
              className="logs-page__search"
              placeholder="Search logs"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search logs"
            />
          </div>
        </div>
      </div>

      {loading && <p role="status">Loading print logs...</p>}
      {error && <p role="alert">{error}</p>}

      {featuredRows.length > 0 && (
        <section className="logs-section">
          <div className="logs-section__header">
            <div className="logs-section__heading">
              <h3 className="logs-section__title">Current logs</h3>

              <span className="logs-section__count logs-section__count--live">
                <strong>{featuredRows.length}</strong> running
              </span>

              <button
                type="button"
                className="logs-section__toggle"
                onClick={() => setShowLiveSheet((current) => !current)}
                aria-label={showLiveSheet ? "Hide live spreadsheet" : "Show live spreadsheet"}
                aria-expanded={showLiveSheet}
              >
                <FontAwesomeIcon icon={showLiveSheet ? faCaretUp : faCaretDown} />
              </button>
            </div>
          </div>

          {showLiveSheet && (
            <div className="logs-table logs-table--featured">
              <div className="logs-table__header">
                <div className="logs-table__col logs-table__col--date">
                  <span>Status</span>
                </div>
                <div className="logs-table__col logs-table__col--title">Title</div>
                <div className="logs-table__col logs-table__col--device">Device</div>
                <div className="logs-table__col logs-table__col--tag">Status</div>
              </div>

              <div className="logs-table__body">
                {featuredRows.map((entry) => (
                    <button
                      type="button"
                      key={entry.id}
                      className="logs-table__row"
                      onClick={() => {
                        if (entry.realId != null && typeof onSelectPrint === "function") {
                          onSelectPrint(entry.realId);
                        }
                      }}
                    >
                      <div className="logs-table__cell logs-table__cell--date">
                        <span className="logs-table__live-badge">
                          <span className="logs-table__live-dot" aria-hidden="true" />
                          Live
                        </span>
                      </div>

                      <div className="logs-table__cell logs-table__cell--title">
                        <span className="logs-table__title-text">{entry.projectName}</span>
                      </div>

                      <div className="logs-table__cell logs-table__cell--device">
                        <span className="logs-table__device-text">{entry.device || "Unknown device"}</span>
                      </div>

                      <div className="logs-table__cell logs-table__cell--tag">
                        <span className="logs-table__tag logs-table__tag--running">
                          Running · ETA ~{entry.estimatedRemainingMinutes ?? DEFAULT_ESTIMATED_REMAINING_MINUTES} min
                        </span>
                      </div>
                    </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="logs-section">
        <div className="logs-section__header">
          <div className="logs-section__heading">
            <h3 className="logs-section__title">Previous logs</h3>
            <span className="logs-section__count">
              <strong>{filtered.length}</strong> {filtered.length === 1 ? "print" : "prints"}
            </span>
          </div>
        </div>

        <div className="logs-table">
          <div className="logs-table__header">
            <div className="logs-table__col logs-table__col--date">
              <span>Date</span>
              <button type="button" className="logs-table__sort" onClick={toggleSort} aria-label="Sort by date">
                <FontAwesomeIcon icon={sortDir === "asc" ? faArrowUpShortWide : faArrowDownWideShort} />
              </button>
            </div>
            <div className="logs-table__col logs-table__col--title">Title</div>
            <div className="logs-table__col logs-table__col--device">Device</div>
            <div className="logs-table__col logs-table__col--tag">Tag</div>
          </div>

          <div className="logs-table__body">
            {!loading && !error && filtered.length === 0 && (
              <p className="logs-table__empty">No previous print logs found.</p>
            )}
            {filtered.map((entry) => (
              <button type="button" key={entry.id} className="logs-table__row" onClick={() => onSelectPrint(entry.id)}>
                <div className="logs-table__cell logs-table__cell--date">{formatLocalDate(entry)}</div>
                <div className="logs-table__cell logs-table__cell--title">
                  <span className="logs-table__title-text">{entry.projectName}</span>
                </div>
                <div className="logs-table__cell logs-table__cell--device">
                  <span className="logs-table__device-text">{entry.device || "Unknown device"}</span>
                </div>
                <div className="logs-table__cell logs-table__cell--tag">
                  <span
                    className="logs-table__tag"
                    style={{
                      background:
                        entry.tag === "completed"
                          ? "var(--status-online)"
                          : entry.tag === "issue"
                          ? "var(--status-idle)"
                          : "var(--status-error)",
                      borderColor: "transparent",
                    }}
                  >
                    {entry.tag}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}


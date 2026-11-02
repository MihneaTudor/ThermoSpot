import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDownWideShort,
  faArrowUpShortWide,
  faCaretDown,
  faCaretUp,
  faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";
import ProgressBar from "../ProgressBar";
import "../main_page/PastPrintsLog.css";
import "./LogsPage.css";

function parseDateString(d) {
  if (!d) return new Date(0);
  const parts = d.split("-");
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts.map((p) => parseInt(p, 10));
    if (!isNaN(dd) && !isNaN(mm) && !isNaN(yyyy)) {
      return new Date(yyyy, mm - 1, dd);
    }
  }
  const parsed = Date.parse(d);
  return isNaN(parsed) ? new Date(0) : new Date(parsed);
}

export default function LogsPage({ entries = [], project, onSelectPrint }) {
  const [query, setQuery] = useState("");
  const [sortDir, setSortDir] = useState("desc");
  const [showLiveSheet, setShowLiveSheet] = useState(true);

  const featuredRows = useMemo(() => {
    const featured = [];

    if (project) {
      featured.push({
        id: "live-project",
        date: entries[0]?.date ?? "Current",
        projectName: project.name,
        device: entries[0]?.device ?? "ThermSpot Prototype",
        progress: project.progress ?? 0,
        realId: entries[0]?.id ?? null,
        live: true,
      });
    }

    const additional = entries.slice(0, 1).filter((entry) => entry.id !== featured[0]?.realId);
    additional.forEach((entry) => {
      featured.push({
        id: `live-${entry.id}`,
        date: entry.date,
        projectName: entry.projectName,
        device: entry.device,
        progress: Math.min(100, Math.max(0, Number(entry.progress ?? project?.progress ?? 0))),
        realId: entry.id,
        live: true,
      });
    });

    return featured.slice(0, 2);
  }, [entries, project]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = entries.slice();

    if (q) {
      list = list.filter((entry) =>
        (entry.projectName || "").toLowerCase().includes(q) ||
        (entry.date || "").toLowerCase().includes(q) ||
        (entry.device || "").toLowerCase().includes(q) ||
        (entry.tag || "").toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      const da = parseDateString(a.date);
      const db = parseDateString(b.date);
      if (da < db) return sortDir === "asc" ? -1 : 1;
      if (da > db) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

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
                <div className="logs-table__col logs-table__col--tag">Progress</div>
              </div>

              <div className="logs-table__body">
                {featuredRows.map((entry) => {
                  const pct = Math.min(100, Math.max(0, Number(entry.progress) || 0));
                  return (
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
                        <div className="logs-table__progress-wrapper">
                          <ProgressBar value={pct} position="above" />
                        </div>
                      </div>
                    </button>
                  );
                })}
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
            {filtered.map((entry) => (
              <button type="button" key={entry.id} className="logs-table__row" onClick={() => onSelectPrint(entry.id)}>
                <div className="logs-table__cell logs-table__cell--date">{entry.date}</div>
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


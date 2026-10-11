import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDownWideShort, faArrowUpShortWide } from "@fortawesome/free-solid-svg-icons";
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

export default function LogsPage({ entries = [], onSelectPrint }) {
  const [query, setQuery] = useState("");
  const [sortDir, setSortDir] = useState("desc");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = entries.slice();

    if (q) {
      list = list.filter((entry) =>
        (entry.projectName || "").toLowerCase().includes(q) ||
        (entry.date || "").toLowerCase().includes(q) ||
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
        <h2 className="logs-page__title">Print logs</h2>

        <div className="logs-page__controls">
          <input
            className="logs-page__search"
            placeholder="Search logs"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search logs"
          />
        </div>
      </div>

      <div className="logs-table">
        <div className="logs-table__header">
          <div className="logs-table__col logs-table__col--date">
            <span>Date</span>
            <button type="button" className="logs-table__sort" onClick={toggleSort} aria-label="Sort by date">
              <FontAwesomeIcon icon={sortDir === "asc" ? faArrowUpShortWide : faArrowDownWideShort}/>
            </button>
          </div>
          <div className="logs-table__col logs-table__col--title">Title</div>
        </div>

        <div className="logs-table__body">
          {filtered.map((entry) => (
            <button type="button" key={entry.id} className="logs-table__row" onClick={() => onSelectPrint(entry.id)}>
              <div className="logs-table__cell logs-table__cell--date">{entry.date}</div>
              <div className="logs-table__cell logs-table__cell--title">
                <span className="logs-table__title-text">{entry.projectName}</span>
                <span className="logs-table__tag" style={{ background: entry.tag === "completed" ? "var(--status-online)" : entry.tag === "issue" ? "var(--status-idle)" : "var(--status-error)", borderColor: "transparent" }}>{entry.tag}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

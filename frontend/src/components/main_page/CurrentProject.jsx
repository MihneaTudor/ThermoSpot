import ProgressBar from "../ProgressBar";
import { useNow, minutesUntil, formatEta } from "../logs_page/logUtils";
import "./CurrentProject.css";

function progressPercent(print, now) {
  const start = Date.parse(print.startedAt ?? "");
  const end = Date.parse(print.estimatedEndAt ?? "");
  if (!now || Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  const pct = Math.round(((now - start) / (end - start)) * 100);
  return Math.min(99, Math.max(0, pct)); 
}

export default function CurrentProjectCard({ project, onOpenDetails }) {
  const now = useNow(15_000);

  if (!project) {
    return (
      <div className="project-status">
        <p className="device-card__label">Current project:</p>
        <div className="project-card">
          <p className="project-card__name">No print is running</p>
        </div>
      </div>
    );
  }

  const eta = formatEta(minutesUntil(project.estimatedEndAt, now));

  return (
    <div className="project-status">
      <p className="device-card__label">Current project:</p>

      <div className="project-card">
        <p className="project-card__name">{project.projectName}</p>

        <div className="project-card__row">
          <span className="project-card__row-label">Progress</span>
          <ProgressBar value={progressPercent(project, now)} />
        </div>

        <div className="project-card__row">
          <span className="project-card__row-label">{eta}</span>
        </div>

        <div className="project-card__footer">
          <span className="project-card__tag">
            <span className="project-card__tag-dot" aria-hidden="true" />
            Live
          </span>

          <button
            type="button"
            className="project-card__details-btn"
            onClick={onOpenDetails}
            aria-label="View full project details"
          >
            Details →
          </button>
        </div>
      </div>
    </div>
  );
}
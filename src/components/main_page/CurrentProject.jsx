import ProgressBar from "../ProgressBar";
import "./CurrentProject.css";

export default function CurrentProjectCard({ project, onOpenDetails }) {
  const { name, progress, eta, live } = project;

  return (
    <div className="project-status">
      <p className="device-card__label">Current project:</p>

      <div className="project-card">
        <p className="project-card__name">{name}</p>

        <div className="project-card__row">
          <span className="project-card__row-label">Progress</span>
          <ProgressBar value={progress} />
        </div>

        <div className="project-card__row">
          <span className="project-card__row-label">ETA: {eta}</span>
        </div>

        <div className="project-card__footer">
          {live && (
            <span className="project-card__tag">
              <span className="project-card__tag-dot" aria-hidden="true" />
              Live
            </span>
          )}

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
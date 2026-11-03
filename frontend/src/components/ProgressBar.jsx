import "./ProgressBar.css";

export default function ProgressBar({ value, position = "right" }) {
  const clamped = Math.min(100, Math.max(0, Number(value) || 0));

  if (position === "above") {
    return (
      <div className="progress-bar progress-bar--vertical" aria-hidden={false}>
        <span className="progress-bar__value progress-bar__value--above">{clamped}%</span>
        <div className="progress-bar__track">
          <div className="progress-bar__fill" style={{ width: `${clamped}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="progress-bar"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="progress-bar__track">
        <div className="progress-bar__fill" style={{ width: `${clamped}%` }} />
      </div>
      <span className="progress-bar__value">{clamped}%</span>
    </div>
  );
}
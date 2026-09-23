import "./ProgressBar.css";

export default function ProgressBar({ value }) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className="progress-bar"
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
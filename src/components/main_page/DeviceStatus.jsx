import "./DeviceStatus.css";

const STATUS_LABELS = {
  online: "Online",
  offline: "Offline",
  idle: "Idle",
  error: "Error",
};

export default function DeviceStatus({ device }) {
  const { name, status, detail } = device;
  const label = STATUS_LABELS[status] ?? status;

  return (
    <div>
      <p className="device-card__label">Current device:</p>
      <div className="device-card" data-status={status}>
        <p className="device-card__name">{name}</p>
        <div className="device-card__status-row">
          <span className="device-card__dot" aria-hidden="true" />
          <span className="device-card__status">{label}</span>
          {detail && (
            <>
              <span className="device-card__separator">–</span>
              <span className="device-card__detail">{detail}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
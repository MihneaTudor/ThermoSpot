import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faPen, faFloppyDisk, faXmark } from "@fortawesome/free-solid-svg-icons";
import "./DeviceStatus.css";

const LABELS = {
  currentDevice: "Current device:",
  deviceManagement: "Device management",
  deviceList: "Device list",
  deviceInformation: "Device information",
  noDevices: "No devices",
  noDevicesConnected: "No devices connected yet",
  addDevice: "+ Add device",
  addSmall: "+ Add",
  edit: "Edit",
  cancel: "Cancel",
  delete: "Delete",
  saveChanges: "Save changes",
};

const STATUS_LABELS = {
  online: "Online",
  idle: "Idle",
  offline: "Offline",
  error: "Error",
};

export function DeviceDetailsPage(props) {
  const { selectedDevice } = props;
  return <DeviceDetailsContent key={selectedDevice?.id ?? "none"} {...props} />;
}

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleString() : "—";
}

function DeviceDetailsContent({ devices, selectedDevice, onSelectDevice, onAddDevice, onDeleteDevice, onSaveDevice, error }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [nameDraft, setNameDraft] = useState(selectedDevice?.name ?? "");

  useEffect(() => {
    if (!isConfirmingDelete) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setIsConfirmingDelete(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isConfirmingDelete]);

  if (!selectedDevice) {
    return (
      <div className="device-page device-page--empty">
        <div className="device-page__empty-card">
          <p className="device-card__label">{LABELS.noDevices}</p>
          <h2 className="device-page__title">{LABELS.noDevicesConnected}</h2>
          {error && <p role="alert">{error}</p>}
          <button type="button" className="device-page__add" onClick={onAddDevice}>
            {LABELS.addDevice}
          </button>
        </div>
      </div>
    );
  }

  const { id, name, status, detail, createdAt, printCount, lastPrintAt } = selectedDevice;
  const label = STATUS_LABELS[status] ?? status;

  const handleSave = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    if (trimmed === name || (await onSaveDevice(id, { name: trimmed }))) {
      setIsEditing(false);
    }
  };

  return (
    <div className="device-page">
      <div className="device-page__header">
        <div className="device-page__header-copy">
          <p className="device-card__label">{LABELS.deviceManagement}</p>
        </div>
      </div>

      <div className="device-page__layout">
        <aside className="device-page__sidebar">
          <div className="device-page__sidebar-header">
            <p className="device-card__label">{LABELS.deviceList}</p>
            <button type="button" className="device-page__small-add" onClick={onAddDevice}>
              {LABELS.addSmall}
            </button>
          </div>
          <div className="device-page__list">
            {devices.map((device) => (
              <button
                key={device.id}
                type="button"
                className={`device-page__item ${selectedDevice.id === device.id ? "is-active" : ""}`}
                onClick={() => onSelectDevice(device.id)}
              >
                <span className="device-page__item-name">{device.name}</span>
                <span className="device-page__item-status" data-status={device.status}>
                  {STATUS_LABELS[device.status] ?? device.status}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <main className="device-page__content" data-status={status}>
          <div className="device-page__title-row">
            <div className="device-page__title-block">
              <p className="device-card__label">{LABELS.deviceInformation}</p>
              {isEditing ? (
                <input
                  className="device-page__title-input"
                  maxLength={100}
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                />
              ) : (
                <h2 className="device-page__title">{name}</h2>
              )}
            </div>
            <div className="device-page__actions">
              <button
                type="button"
                className="device-page__action"
                onClick={() => {
                  setNameDraft(name);
                  setIsEditing((value) => !value);
                }}
              >
                <FontAwesomeIcon icon={isEditing ? faXmark : faPen} />
                {isEditing ? LABELS.cancel : LABELS.edit}
              </button>

              {isEditing && (
                <button type="button" className="device-page__action device-page__action--primary" onClick={handleSave}>
                  <FontAwesomeIcon icon={faFloppyDisk} />
                  {LABELS.saveChanges}
                </button>
              )}

              <button
                type="button"
                className="device-page__action device-page__action--danger"
                onClick={() => setIsConfirmingDelete(true)}
              >
                <FontAwesomeIcon icon={faTrash} />
                {LABELS.delete}
              </button>
            </div>
          </div>

          <div className="device-card__status-row device-card__status-row--modal">
            <span className="device-card__dot" aria-hidden="true" />
            <span className="device-card__status">{label}</span>
            {detail && (
              <>
                <span className="device-card__separator">–</span>
                <span className="device-card__detail">{detail}</span>
              </>
            )}
          </div>

          {error && <p role="alert" className="device-page__error">{error}</p>}

          <div className="device-page__grid">
            <div className="device-modal__item">
              <span>Added</span>
              <strong>{formatDate(createdAt)}</strong>
            </div>
            <div className="device-modal__item">
              <span>Print logs</span>
              <strong>{printCount}</strong>
            </div>
            <div className="device-modal__item">
              <span>Last print</span>
              <strong>{formatDate(lastPrintAt)}</strong>
            </div>
          </div>
        </main>
      </div>

      {isConfirmingDelete && (
        <div className="device-modal__backdrop" onClick={() => setIsConfirmingDelete(false)}>
          <div
            className="device-modal device-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-desc"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="device-confirm__icon" aria-hidden="true">
              <FontAwesomeIcon icon={faTrash} />
            </div>
            <h3 id="delete-title" className="device-confirm__title">Delete device?</h3>
            <p id="delete-desc" className="device-confirm__text">
              <strong>{name}</strong> will be permanently removed. This can't be undone.
            </p>
            <div className="device-confirm__actions">
              <button type="button" className="device-page__action" onClick={() => setIsConfirmingDelete(false)} autoFocus>
                {LABELS.cancel}
              </button>
              <button
                type="button"
                className="device-page__action device-page__action--danger-solid"
                onClick={() => {
                  setIsConfirmingDelete(false);
                  onDeleteDevice(id);
                }}
              >
                <FontAwesomeIcon icon={faTrash} />
                {LABELS.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DeviceStatus({ device, onOpenDetails }) {
  if (!device) {
    return null;
  }

  const { name, status, detail } = device;
  const label = STATUS_LABELS[status] ?? status;

  return (
    <div id="device">
      <p className="device-card__label">{LABELS.currentDevice}</p>
      <button type="button" className="device-card" data-status={status} onClick={onOpenDetails}>
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
      </button>
    </div>
  );
}
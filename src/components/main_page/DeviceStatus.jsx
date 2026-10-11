import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {faTrash,faPen,faFloppyDisk,faXmark,faChevronDown} from "@fortawesome/free-solid-svg-icons";
import dashboardContent from "../../data/dashboardContent.json";
import "./DeviceStatus.css";

const STATUS_LABELS = dashboardContent.labels.status;

export function DeviceDetailsPage({ devices, selectedDevice, onSelectDevice, onAddDevice, onDeleteDevice, onStatusChange, onSaveDevice }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [formData, setFormData] = useState({
    name: selectedDevice?.name ?? "",
    model: selectedDevice?.model ?? "",
    boardSerialNumber: selectedDevice?.boardSerialNumber ?? "",
    location: selectedDevice?.location ?? "",
    uptime: selectedDevice?.uptime ?? "",
    boardTemperature: selectedDevice?.boardTemperature ?? "",
    lastMaintenance: selectedDevice?.lastMaintenance ?? "",
    notes: selectedDevice?.notes ?? "",
  });

  useEffect(() => {
    if (!isConfirmingDelete) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setIsConfirmingDelete(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isConfirmingDelete]);

  useEffect(() => {
    if (!selectedDevice) {
      return;
    }

    setFormData({
      name: selectedDevice.name,
      model: selectedDevice.model,
      boardSerialNumber: selectedDevice.boardSerialNumber,
      location: selectedDevice.location,
      uptime: selectedDevice.uptime,
      boardTemperature: selectedDevice.boardTemperature,
      lastMaintenance: selectedDevice.lastMaintenance,
      notes: selectedDevice.notes,
    });
    setIsEditing(false);
    setIsConfirmingDelete(false);
  }, [selectedDevice]);

  if (!selectedDevice) {
    return (
      <div className="device-page device-page--empty">
        <div className="device-page__empty-card">
          <p className="device-card__label">{dashboardContent.labels.noDevices}</p>
          <h2 className="device-page__title">{dashboardContent.labels.noDevicesConnected}</h2>
          <button type="button" className="device-page__add" onClick={onAddDevice}>
            {dashboardContent.labels.addDevice}
          </button>
        </div>
      </div>
    );
  }

  const { id, name, status, detail, model, boardSerialNumber, location, uptime, boardTemperature, lastMaintenance, notes } = selectedDevice;
  const label = STATUS_LABELS[status] ?? status;

  const handleFieldChange = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSave = () => {
    onSaveDevice(id, {
      ...selectedDevice,
      ...formData,
      name: formData.name,
    });
    setIsEditing(false);
  };

  const handleConfirmDelete = () => {
    setIsConfirmingDelete(false);
    onDeleteDevice(id);
  };

  return (
    <div className="device-page">
      <div className="device-page__header">
        <div className="device-page__header-copy">
          <p className="device-card__label">{dashboardContent.labels.deviceManagement}</p>
        </div>
      </div>

      <div className="device-page__layout">
        <aside className="device-page__sidebar">
          <div className="device-page__sidebar-header">
            <p className="device-card__label">{dashboardContent.labels.deviceList}</p>
            <button type="button" className="device-page__small-add" onClick={onAddDevice}>
              {dashboardContent.labels.addSmall}
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
              <p className="device-card__label">{dashboardContent.labels.deviceInformation}</p>
              {isEditing ? (
                <input
                  className="device-page__title-input"
                  value={formData.name}
                  onChange={(event) => handleFieldChange("name", event.target.value)}
                />
              ) : (
                <h2 className="device-page__title">{name}</h2>
              )}
            </div>
            <div className="device-page__actions">
              <div className="device-page__status-wrap" data-status={status}>
                <span className="device-page__status-dot" aria-hidden="true" />
                <select
                  className="device-page__status-select"
                  value={status}
                  onChange={(event) => onStatusChange(id, event.target.value)}
                  aria-label="Update device status"
                >
                  <option value="online">Online</option>
                  <option value="idle">Idle</option>
                  <option value="offline">Offline</option>
                  <option value="error">Error</option>
                </select>
                <FontAwesomeIcon icon={faChevronDown} className="device-page__status-chevron" />
              </div>

              <button type="button" className="device-page__action" onClick={() => setIsEditing((value) => !value)}>
                <FontAwesomeIcon icon={isEditing ? faXmark : faPen} />
                {isEditing ? dashboardContent.labels.cancel : dashboardContent.labels.edit}
              </button>

              {isEditing && (
                <button type="button" className="device-page__action device-page__action--primary" onClick={handleSave}>
                  <FontAwesomeIcon icon={faFloppyDisk} />
                  {dashboardContent.labels.saveChanges}
                </button>
              )}

              <button
                type="button"
                className="device-page__action device-page__action--danger"
                onClick={() => setIsConfirmingDelete(true)}
              >
                <FontAwesomeIcon icon={faTrash} />
                {dashboardContent.labels.delete}
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

          <div className="device-page__grid">
            <div className="device-modal__item">
              <span>Model</span>
              {isEditing ? (
                <input value={formData.model} onChange={(event) => handleFieldChange("model", event.target.value)} />
              ) : (
                <strong>{model}</strong>
              )}
            </div>
            <div className="device-modal__item">
              <span>Board serial number</span>
              {isEditing ? (
                <input maxLength={128} value={formData.boardSerialNumber} onChange={(event) => handleFieldChange("boardSerialNumber", event.target.value)} />
              ) : (
                <strong>{boardSerialNumber}</strong>
              )}
            </div>
            <div className="device-modal__item">
              <span>Location</span>
              {isEditing ? (
                <input value={formData.location} onChange={(event) => handleFieldChange("location", event.target.value)} />
              ) : (
                <strong>{location}</strong>
              )}
            </div>
            <div className="device-modal__item">
              <span>Uptime</span>
              {isEditing ? (
                <input value={formData.uptime} onChange={(event) => handleFieldChange("uptime", event.target.value)} />
              ) : (
                <strong>{uptime}</strong>
              )}
            </div>
            <div className="device-modal__item">
              <span>Board temperature</span>
              {isEditing ? (
                <input value={formData.boardTemperature} onChange={(event) => handleFieldChange("boardTemperature", event.target.value)} />
              ) : (
                <strong>{boardTemperature}</strong>
              )}
            </div>
            <div className="device-modal__item">
              <span>Last maintenance</span>
              {isEditing ? (
                <input value={formData.lastMaintenance} onChange={(event) => handleFieldChange("lastMaintenance", event.target.value)} />
              ) : (
                <strong>{lastMaintenance}</strong>
              )}
            </div>
          </div>

          <div className="device-modal__notes">
            <span className="device-modal__notes-label">Notes</span>
            {isEditing ? (
              <textarea value={formData.notes} onChange={(event) => handleFieldChange("notes", event.target.value)} rows={4} />
            ) : (
              <p>{notes}</p>
            )}
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
                {dashboardContent.labels.cancel}
              </button>
              <button type="button" className="device-page__action device-page__action--danger-solid" onClick={handleConfirmDelete}>
                <FontAwesomeIcon icon={faTrash} />
                {dashboardContent.labels.delete}
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
      <p className="device-card__label">{dashboardContent.labels.currentDevice}</p>
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
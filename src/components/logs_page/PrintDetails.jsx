import { useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faXmark, faFloppyDisk, faDownload, faUpload } from "@fortawesome/free-solid-svg-icons";
import dashboardContent from "../../data/dashboardContent.json";
import "./PrintDetails.css";

const EMPTY_NOTES = "No notes saved for this print yet.";
const LABELS = dashboardContent.labels;

/* ---------- device data (template JSON) ---------- */
const DEVICE = dashboardContent.devices?.[0] ?? null;
const BASE_TEMP = parseInt(DEVICE?.boardTemperature, 10) || 70; // "73°C" -> 73

const TAG_CONFIG = {
  completed: { label: "Completed", color: "var(--status-online)" },
  issue: { label: "Issue", color: "var(--status-idle)" },
  error: { label: "Error", color: "var(--status-error)" },
};

/* ---------- temperature scale ---------- */
const TEMP_MIN = 50;
const TEMP_MAX = 150;
const COLD = [59, 183, 255]; // #3bb7ff (complement of the orange)
const MID = [255, 255, 255]; // white
const HOT = [255, 131, 59]; // #ff833b

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function tempToColor(temp) {
  const t = clamp((temp - TEMP_MIN) / (TEMP_MAX - TEMP_MIN), 0, 1);
  const [r, g, b] = t < 0.5 ? mix(COLD, MID, t / 0.5) : mix(MID, HOT, (t - 0.5) / 0.5);
  return `rgb(${r}, ${g}, ${b})`;
}

// legend ticks: one every 5°, a number every 10°
const TICKS = Array.from({ length: (TEMP_MAX - TEMP_MIN) / 5 + 1 }, (_, i) => {
  const value = TEMP_MIN + i * 5;
  return {
    value,
    pct: ((value - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)) * 100,
    major: value % 10 === 0,
  };
});

/* ---------- sensors + time frames ---------- */
const SENSORS = Array.from({ length: 64 }, (_, index) => ({
  id: `sensor-${index + 1}`,
  name: `Sensor ${index + 1}`,
  type: "Temperature",
}));

const FRAME_COUNT = 61;
const FRAME_STEP_SECONDS = 30;
const START_SECONDS = 14 * 3600; // placeholder start time: 14:00:00

const pad = (n) => String(n).padStart(2, "0");
function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600) % 24;
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// A hotspot that moves across the grid, heats up, then cools down.
// The background level comes from the device's board temperature.
function buildFrames(date) {
  return Array.from({ length: FRAME_COUNT }, (_, f) => {
    const progress = f / (FRAME_COUNT - 1);
    const intensity = 0.3 + 0.7 * Math.sin(Math.PI * progress);
    const cx = 2 + 3 * progress;
    const cy = 5 - 3 * progress;
    const floor = BASE_TEMP - 20;

    const readings = SENSORS.map((_, index) => {
      const row = Math.floor(index / 8);
      const col = index % 8;
      const dist2 = (col - cx) ** 2 + (row - cy) ** 2;
      const raw = floor + (TEMP_MAX - floor) * intensity * Math.exp(-dist2 / 18);
      const tempC = Math.round(clamp(raw, TEMP_MIN, TEMP_MAX));
      return { tempC, temp: `${tempC}°C`, color: tempToColor(tempC) };
    });

    const time = formatTime(START_SECONDS + f * FRAME_STEP_SECONDS);
    return { time, stamp: date ? `${date} · ${time}` : time, readings };
  });
}

export default function PrintDetails({ entry }) {
  if (!entry) return null;
  // key resets internal state when a different print is shown
  return <PrintDetailsContent key={entry.id ?? entry.projectName} entry={entry} />;
}

function PrintDetailsContent({ entry }) {
  const [notes, setNotes] = useState(entry.notes ?? EMPTY_NOTES);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [draftNotes, setDraftNotes] = useState(notes);

  const frames = useMemo(() => buildFrames(entry.date), [entry.date]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const gridWrapRef = useRef(null);
  const [tooltip, setTooltip] = useState(null); // { index, left, top, below }

  const frame = frames[frameIndex];

  const selectedSensor = selectedIndex !== null ? SENSORS[selectedIndex] : null;
  const selectedReading = selectedIndex !== null ? frame.readings[selectedIndex] : null;

  const tipSensor = tooltip ? SENSORS[tooltip.index] : null;
  const tipReading = tooltip ? frame.readings[tooltip.index] : null;

  const tag = TAG_CONFIG[entry.tag] ?? {
    label: entry.tag ?? "Unknown",
    color: "var(--status-idle)",
  };

  const handleSaveNotes = () => {
    setNotes(draftNotes.trim() || EMPTY_NOTES);
    setIsEditingNotes(false);
  };

  const handleCancelNotes = () => {
    setDraftNotes(notes);
    setIsEditingNotes(false);
  };

  const showTooltip = (event, index) => {
    const wrap = gridWrapRef.current?.getBoundingClientRect();
    if (!wrap) return;
    const cell = event.currentTarget.getBoundingClientRect();
    const below = cell.top - wrap.top < 76; // flip for the top rows
    setTooltip({
      index,
      left: cell.left - wrap.left + cell.width / 2,
      top: below ? cell.bottom - wrap.top : cell.top - wrap.top,
      below,
    });
  };

  const hideTooltip = () => setTooltip(null);

  return (
    <div className="print-details">
      <div className="logs-page__header">
        <p className="device-card__label">Print details</p>
      </div>

      <div className="print-details__card">
        <div className="print-details__header-card">
          <div className="print-details__title-block">
            <h2 className="print-details__name">{entry.projectName}</h2>
            <div className="print-details__meta">
              <span className="print-details__chip">{entry.date}</span>
              <span className="print-details__meta-divider" aria-hidden="true" />
              <span
                className="print-details__chip print-details__tag"
                style={{ "--tag-color": tag.color }}>
                {tag.label}
              </span>
            </div>
          </div>

          <div className="print-details__io">
            <button type="button" className="print-details__io-button print-details__io-button--import">
              <FontAwesomeIcon icon={faDownload} />
              Import
            </button>
            <button type="button" className="print-details__io-button print-details__io-button--export">
              <FontAwesomeIcon icon={faUpload} />
              Export
            </button>
          </div>
        </div>

        <div className="print-details__notes">
          <div className="print-details__notes-header">
            <span>Notes</span>
            <div className="print-details__notes-actions">
              {isEditingNotes ? (
                <>
                  <button type="button" className="print-details__notes-button" onClick={handleCancelNotes}>
                    <FontAwesomeIcon icon={faXmark} />
                    {LABELS.cancel}
                  </button>
                  <button type="button" className="print-details__notes-save" onClick={handleSaveNotes}>
                    <FontAwesomeIcon icon={faFloppyDisk} />
                    {LABELS.saveChanges}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="print-details__notes-button"
                  onClick={() => {
                    setDraftNotes(notes);
                    setIsEditingNotes(true);
                  }}
                >
                  <FontAwesomeIcon icon={faPen} />
                  {LABELS.edit}
                </button>
              )}
            </div>
          </div>

          {isEditingNotes ? (
            <textarea
              value={draftNotes}
              onChange={(event) => setDraftNotes(event.target.value)}
              aria-label="Print notes"
            />
          ) : (
            <p>{notes}</p>
          )}
        </div>

        <div className="print-details__content">
          <div className="print-details__panel print-details__panel--grid">
            <div className="print-details__grid-block">
              <div className="print-details__grid-area">
                {/* thermometer-style legend */}
                <div className="print-details__legend" aria-label="Temperature legend">
                  <div className="print-details__legend-scale">
                    {TICKS.map((tick) => (
                      <div
                        key={tick.value}
                        className={`print-details__tick ${tick.major ? "is-major" : ""}`}
                        style={{ bottom: `${tick.pct}%` }}
                      >
                        {tick.major && <span className="print-details__tick-label">{tick.value}°</span>}
                        <span className="print-details__tick-line" />
                      </div>
                    ))}
                  </div>
                  <div className="print-details__legend-bar" />
                </div>

                {/* wrapper is NOT clipped, so the tooltip can overflow the grid */}
                <div className="print-details__grid-wrap" ref={gridWrapRef}>
                  <div className="print-details__grid" role="group" aria-label="Sensor grid">
                    {SENSORS.map((sensor, index) => {
                      const reading = frame.readings[index];
                      return (
                        <button
                          key={sensor.id}
                          type="button"
                          className={`print-details__sensor ${
                            selectedIndex === index ? "is-selected" : ""
                          }`}
                          style={{ "--cell": reading.color }}
                          aria-label={`${sensor.name} | ${sensor.type} | ${reading.temp} | ${frame.stamp}`}
                          aria-pressed={selectedIndex === index}
                          onClick={() =>
                            setSelectedIndex((current) => (current === index ? null : index))
                          }
                          onMouseEnter={(e) => showTooltip(e, index)}
                          onMouseLeave={hideTooltip}
                          onFocus={(e) => showTooltip(e, index)}
                          onBlur={hideTooltip}
                        />
                      );
                    })}
                  </div>

                  {tooltip && (
                    <div
                      className={`print-details__hover-tooltip ${tooltip.below ? "is-below" : ""}`}
                      style={{ left: tooltip.left, top: tooltip.top }}
                      role="tooltip"
                    >
                      <strong>{tipSensor.name}</strong>
                      <span>
                        {tipSensor.type} · {tipReading.temp}
                      </span>
                      <span>{frame.stamp}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* time slider */}
              <div className="print-details__timeline">
                <div className="print-details__timestamp">
                  <span className="print-details__timestamp-date">{entry.date}</span>
                  <span className="print-details__timestamp-time">{frame.time}</span>
                </div>
                <input
                  className="print-details__slider"
                  type="range"
                  min={0}
                  max={frames.length - 1}
                  step={1}
                  value={frameIndex}
                  onChange={(event) => setFrameIndex(Number(event.target.value))}
                  aria-label="Time"
                  aria-valuetext={frame.stamp}
                />
              </div>
            </div>
          </div>

          <div className="print-details__panel print-details__panel--detail">
            <div className="print-details__detail-card">
              <span className="print-details__detail-label">Selected sensor</span>
              {selectedSensor ? (
                <>
                  <h3>{selectedSensor.name}</h3>
                  <p>{selectedSensor.type}</p>
                  <p
                    className="print-details__detail-value"
                    style={{ color: selectedReading.color }}
                  >
                    {selectedReading.temp}
                  </p>
                  <p className="print-details__detail-time">at {frame.stamp}</p>
                </>
              ) : (
                <p>Click a sensor in the grid to see its details.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
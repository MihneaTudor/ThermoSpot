import { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faPen, faXmark, faFloppyDisk, faDownload, faUpload } from "@fortawesome/free-solid-svg-icons";
import { fetchPrintDetails, savePrintNotes } from "../../api";
import { useNow, minutesUntil, formatEta } from "./logUtils";
import "./PrintDetails.css";

const EMPTY_NOTES = "No notes saved for this print yet.";
const LABELS = { edit: "Edit", cancel: "Cancel", saveChanges: "Save changes" };

const TAG_CONFIG = {
  running: { label: "Running", color: "var(--status-online)" },
  completed: { label: "Completed", color: "var(--status-online)" },
  issue: { label: "Issue", color: "var(--status-idle)" },
  error: { label: "Error", color: "var(--status-error)" },
};

/* ---------- temperature scale ---------- */
const TEMP_MIN = 50;
const TEMP_MAX = 150;
const POLL_INTERVAL_MS = 5_000;
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

/* ---------- sensors + recorded time frames ---------- */
const SENSORS = Array.from({ length: 64 }, (_, index) => ({
  id: `sensor-${index + 1}`,
  name: `Sensor ${index + 1}`,
  type: "Temperature",
}));

const pad = (n) => String(n).padStart(2, "0");

function formatDateTime(date) {
  return {
    date: new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(date),
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  };
}

function toFrame(reading) {
  const formatted = formatDateTime(new Date(reading.recordedAt));
  return {
    time: formatted.time,
    date: formatted.date,
    stamp: `${formatted.date} · ${formatted.time}`,
    readings: reading.values.map((value) => {
      const tempC = Math.round(Number(value));
      return { tempC, temp: `${tempC}°C`, color: tempToColor(tempC) };
    }),
  };
}

export default function PrintDetails({ entry, onBack }) {
  if (!entry) return null;
  // key resets internal state when a different print is shown
  return <PrintDetailsContent key={entry.id ?? entry.projectName} entry={entry} onBack={onBack} />;
}

function PrintDetailsContent({ entry, onBack }) {
  const [detail, setDetail] = useState(entry);
  const [readings, setReadings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [draftNotes, setDraftNotes] = useState(notes);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesError, setNotesError] = useState("");
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(null); // null = follow the latest reading
  const [selectedIndex, setSelectedIndex] = useState(null);
  const now = useNow(15_000);

  // remembers the newest reading we have, so polling only asks for newer ones
  const lastRecordedAtRef = useRef(null);
  useEffect(() => {
    lastRecordedAtRef.current = readings.at(-1)?.recordedAt ?? null;
  }, [readings]);

  // initial load: the whole print
  useEffect(() => {
    let cancelled = false;
    fetchPrintDetails(entry.id)
      .then(({ readings: all, ...rest }) => {
        if (cancelled) return;
        setDetail(rest);
        setReadings(all ?? []);
        setNotes(rest.notes ?? "");
        setDraftNotes(rest.notes ?? "");
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [entry.id]);

  // live refresh: only while the print is running, and only new readings
  useEffect(() => {
    if (detail.status !== "running" || isLoading) return undefined;

    let cancelled = false;
    const timer = window.setInterval(() => {
      fetchPrintDetails(entry.id, { since: lastRecordedAtRef.current })
        .then(({ readings: fresh, ...rest }) => {
          if (cancelled) return;
          // update status/ETA, but do NOT touch notes: the user may be editing them
          setDetail(rest);
          setLoadError("");
          if (fresh?.length) {
            setReadings((current) => {
              const known = new Set(current.map((r) => r.recordedAt));
              return [...current, ...fresh.filter((r) => !known.has(r.recordedAt))];
            });
          }
        })
        .catch((error) => {
          // keep showing the last good data; just surface the problem
          if (!cancelled) setLoadError(error.message);
        });
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [detail.status, entry.id, isLoading]);

  const isRunning = detail.status === "running";
  const etaLabel = formatEta(minutesUntil(detail.estimatedEndAt, now));
  const hasRecordedReadings = readings.length > 0;

  // the slider walks through the real readings: first upload -> latest upload
  const lastIndex = readings.length - 1;
  const frameIndex = Math.max(
    0,
    Math.min(selectedFrameIndex ?? (isRunning ? lastIndex : 0), lastIndex)
  );
  const frame = useMemo(
    () => (readings[frameIndex] ? toFrame(readings[frameIndex]) : null),
    [readings, frameIndex]
  );

  const gridWrapRef = useRef(null);
  const [tooltip, setTooltip] = useState(null); // { index, left, top, below }

  const selectedSensor = selectedIndex !== null ? SENSORS[selectedIndex] : null;
  const selectedReading = selectedIndex !== null && frame ? frame.readings[selectedIndex] : null;

  const tipSensor = tooltip ? SENSORS[tooltip.index] : null;
  const tipReading = tooltip && frame ? frame.readings[tooltip.index] : null;

  const tag = TAG_CONFIG[detail.tag] ?? {
    label: detail.tag ?? "Unknown",
    color: "var(--status-idle)",
  };

  const handleSaveNotes = async () => {
    const nextNotes = draftNotes.trim();
    setIsSavingNotes(true);
    setNotesError("");
    try {
      await savePrintNotes(entry.id, nextNotes);
      setNotes(nextNotes);
      setIsEditingNotes(false);
    } catch (error) {
      setNotesError(error.message);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const draftNotesLength = draftNotes.length;

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
      <div className="print-details__page-header">
        <p className="device-card__label">Print details</p>
        {onBack && (
          <button type="button" className="print-details__back-button" onClick={onBack}>
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Back to logs</span>
          </button>
        )}
      </div>

      <div className="print-details__card">
        <div className="print-details__header-card">
          <div className="print-details__title-block">
            <h2 className="print-details__name">{detail.projectName}</h2>
            <div className="print-details__meta">
              <span className="print-details__chip">{entry.date}</span>
              <span className="print-details__meta-divider" aria-hidden="true" />
              <span className="print-details__chip print-details__device-chip">
                {detail.device || "Unknown device"}
              </span>
              <span className="print-details__meta-divider" aria-hidden="true" />
              <span
                className="print-details__chip print-details__tag"
                style={{ "--tag-color": tag.color }}>
                {tag.label}
              </span>
              {isRunning && (
                <span className="print-details__eta" aria-live="polite">
                  {etaLabel}
                </span>
              )}
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
                  <button type="button" className="print-details__notes-save" onClick={handleSaveNotes} disabled={isSavingNotes}>
                    <FontAwesomeIcon icon={faFloppyDisk} />
                    {isSavingNotes ? "Saving..." : LABELS.saveChanges}
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
            <>
              <textarea
                maxLength={128}
                value={draftNotes}
                onChange={(event) => setDraftNotes(event.target.value)}
                aria-label="Print notes"
              />
              <div className="print-details__notes-counter" aria-live="polite">
                {draftNotesLength}/128
              </div>
            </>
          ) : (
            <p className="print-details__notes-text">{notes || EMPTY_NOTES}</p>
          )}
          {notesError && <p role="alert">{notesError}</p>}
        </div>

        {isLoading && <p role="status">Loading print readings...</p>}
        {loadError && <p role="alert">{loadError}</p>}
        {!isLoading && !loadError && !hasRecordedReadings && (
          <p className="print-details__demo-notice" role="status">
            {isRunning
              ? "Waiting for the first readings from the device..."
              : "No readings were recorded for this print."}
          </p>
        )}
        {frame && <div className="print-details__content">
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
                  <span className="print-details__timestamp-date">{frame.date}</span>
                  <span className="print-details__timestamp-time">{frame.time}</span>
                </div>
                {isRunning && selectedFrameIndex !== null && frameIndex < lastIndex && (
                  <button
                    type="button"
                    className="print-details__now-button"
                    onClick={() => setSelectedFrameIndex(null)}
                  >
                    Now
                  </button>
                )}
                <input
                  className="print-details__slider"
                  type="range"
                  min={0}
                  max={Math.max(lastIndex, 0)}
                  step={1}
                  value={frameIndex}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    // dragging to the end of a running print goes back to following the latest data
                    setSelectedFrameIndex(isRunning && value >= lastIndex ? null : value);
                  }}
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
        </div>}
      </div>
    </div>
  );
}
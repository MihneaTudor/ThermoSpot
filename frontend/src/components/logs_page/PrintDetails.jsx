import { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faPen, faXmark, faFloppyDisk, faDownload, faUpload } from "@fortawesome/free-solid-svg-icons";
import dashboardContent from "../../data/dashboardContent.json";
import { fetchPrintDetails, savePrintNotes } from "../../api";
import { DEFAULT_ESTIMATED_REMAINING_MINUTES } from "./logConstants";
import "./PrintDetails.css";

const EMPTY_NOTES = "No notes saved for this print yet.";
const LABELS = dashboardContent.labels;

const TAG_CONFIG = {
  running: { label: "Running", color: "var(--status-online)" },
  completed: { label: "Completed", color: "var(--status-online)" },
  issue: { label: "Issue", color: "var(--status-idle)" },
  error: { label: "Error", color: "var(--status-error)" },
};

/* ---------- temperature scale ---------- */
const TEMP_MIN = 50;
const TEMP_MAX = 150;
const TIMELINE_STEP_MS = 60_000;
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

function buildDemoReadings(progress) {
  const centerX = 1.5 + 4.5 * progress;
  const centerY = 5 - 3 * progress;
  const wave = 0.5 + 0.5 * Math.sin(progress * Math.PI * 2);

  return SENSORS.map((_, index) => {
    const row = Math.floor(index / 8);
    const column = index % 8;
    const distance = (column - centerX) ** 2 + (row - centerY) ** 2;
    const tempC = Math.round(clamp(58 + wave * 68 * Math.exp(-distance / 15) + ((index * 7) % 13), TEMP_MIN, TEMP_MAX));
    return { tempC, temp: `${tempC}°C`, color: tempToColor(tempC) };
  });
}

function buildDemoFrames(entry) {
  const startedAt = new Date(entry.startedAt || `${entry.date.split("-").reverse().join("-")}T14:00:00`);
  const endedAt = entry.endedAt ? new Date(entry.endedAt) : new Date(startedAt.getTime() + 30 * 60 * 1000);
  const duration = Math.max(30 * 60 * 1000, endedAt.getTime() - startedAt.getTime());
  const frameCount = 31;

  return Array.from({ length: frameCount }, (_, frameIndex) => {
    const progress = frameIndex / (frameCount - 1);
    const timestamp = new Date(startedAt.getTime() + duration * progress);
    const formatted = formatDateTime(timestamp);

    return {
      time: formatted.time,
      date: formatted.date,
      stamp: `${formatted.date} · ${formatted.time}`,
      readings: buildDemoReadings(progress),
    };
  });
}

export default function PrintDetails({ entry, onBack }) {
  if (!entry) return null;
  // key resets internal state when a different print is shown
  return <PrintDetailsContent key={entry.id ?? entry.projectName} entry={entry} onBack={onBack} />;
}

function PrintDetailsContent({ entry, onBack }) {
  const [detail, setDetail] = useState(entry);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [draftNotes, setDraftNotes] = useState(notes);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesError, setNotesError] = useState("");
  const [liveNow, setLiveNow] = useState(() => Date.parse(entry.startedAt ?? "") || 0);

  useEffect(() => {
    if (detail.status !== "running") return undefined;
    const initialRefresh = window.setTimeout(() => setLiveNow(Date.now()), 0);
    const timer = window.setInterval(() => setLiveNow(Date.now()), 15_000);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(timer);
    };
  }, [detail.status]);

  // initial load
  useEffect(() => {
    let cancelled = false;
    fetchPrintDetails(entry.id)
      .then((result) => {
        if (cancelled) return;
        setDetail(result);
        setNotes(result.notes ?? "");
        setDraftNotes(result.notes ?? "");
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

  // live refresh: only while the print is running
  useEffect(() => {
    if (detail.status !== "running" || isLoading) return undefined;

    let cancelled = false;
    const timer = window.setInterval(() => {
      fetchPrintDetails(entry.id)
        .then((result) => {
          if (cancelled) return;
          // update data, but do NOT touch notes: the user may be editing them
          setDetail(result);
          setLoadError("");
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
  const estimatedRemainingMinutes = Math.max(
    1,
    Number(detail.estimatedRemainingMinutes ?? DEFAULT_ESTIMATED_REMAINING_MINUTES)
  );
  const etaMinutes = estimatedRemainingMinutes;
  const hasRecordedReadings = (detail.readings ?? []).length > 0;
  const timeline = useMemo(() => {
    if (isRunning && !isLoading && !loadError) {
      const startedAt = new Date(detail.startedAt);
      const elapsedMs = Math.max(0, liveNow - startedAt.getTime());
      const currentIndex = Math.ceil(elapsedMs / TIMELINE_STEP_MS);
      const plannedIndex = currentIndex + Math.ceil(
        (estimatedRemainingMinutes * 60_000) / TIMELINE_STEP_MS
      );
      const actualReadings = (detail.readings ?? []).map((reading) => ({
        timestamp: new Date(reading.recordedAt).getTime(),
        readings: reading.values.map((value) => {
          const tempC = Math.round(Number(value));
          return { tempC, temp: `${tempC}°C`, color: tempToColor(tempC) };
        }),
      }));

      const frames = Array.from({ length: currentIndex + 1 }, (_, index) => {
        const timestamp = new Date(Math.min(startedAt.getTime() + index * TIMELINE_STEP_MS, liveNow));
        const formatted = formatDateTime(timestamp);
        const latestReading = actualReadings.findLast((reading) => reading.timestamp <= timestamp.getTime());
        const readings = latestReading?.readings ?? actualReadings[0]?.readings ?? buildDemoReadings(
          currentIndex > 0 ? index / currentIndex : 0
        );

        return {
          time: formatted.time,
          date: formatted.date,
          stamp: `${formatted.date} · ${formatted.time}`,
          readings,
        };
      });

      return { frames, currentIndex, sliderMax: plannedIndex };
    }

    if (!hasRecordedReadings) {
      const frames = !isLoading && !loadError ? buildDemoFrames(detail) : [];
      return { frames, currentIndex: frames.length - 1, sliderMax: frames.length - 1 };
    }

    const frames = (detail.readings ?? []).map((reading) => {
      const recordedAt = new Date(reading.recordedAt);
      const formatted = formatDateTime(recordedAt);
      return {
        time: formatted.time,
        date: formatted.date,
        stamp: `${formatted.date} · ${formatted.time}`,
        readings: reading.values.map((value) => {
          const tempC = Math.round(Number(value));
          return { tempC, temp: `${tempC}°C`, color: tempToColor(tempC) };
        }),
      };
    });
    return { frames, currentIndex: frames.length - 1, sliderMax: frames.length - 1 };
  }, [detail, estimatedRemainingMinutes, hasRecordedReadings, isLoading, isRunning, liveNow, loadError]);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(null);
  const frameIndex = selectedFrameIndex ?? (isRunning ? timeline.currentIndex : 0);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const gridWrapRef = useRef(null);
  const timeInputRef = useRef(null);
  const pendingTimeCaret = useRef(null);
  const [tooltip, setTooltip] = useState(null); // { index, left, top, below }

  const frame = timeline.frames[Math.min(frameIndex, timeline.frames.length - 1)] ?? null;

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
                  ETA ~{etaMinutes} min
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
            Showing sample sensor data because this print has no recorded readings.
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
                {isRunning && selectedFrameIndex !== null && frameIndex < timeline.currentIndex && (
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
                  max={timeline.sliderMax}
                  step={1}
                  value={frameIndex}
                  onChange={(event) => setSelectedFrameIndex(Math.min(Number(event.target.value), timeline.currentIndex))}
                  aria-label="Time"
                  aria-valuetext={frame.stamp}
                />
                <label className="print-details__time-input">
                  <span className="print-details__timestamp-date">Jump to time</span>
                  <input
                    type="text"
                    ref={timeInputRef}
                    maxLength={8}
                    inputMode="numeric"
                    placeholder="00:00:00"
                    value={timeInput}
                    onChange={handleTimeInputChange}
                    onBlur={handleTimeInputBlur}
                    aria-label="Enter a time as six digits, hours minutes seconds"
                  />
                </label>
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
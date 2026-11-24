import { useEffect, useState } from "react";

// Returns the current time in ms and re-renders the caller every `intervalMs`.
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, intervalMs);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [intervalMs]);
  return now;
}

export function minutesUntil(iso, now) {
  const end = Date.parse(iso ?? "");
  if (Number.isNaN(end) || !now) return null;
  return Math.max(0, Math.ceil((end - now) / 60_000));
}

export function formatEta(minutes) {
  if (minutes === null) return "ETA unknown";
  if (minutes === 0) return "Finishing up";
  if (minutes < 60) return `ETA ~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `ETA ~${h} h ${m} min` : `ETA ~${h} h`;
}
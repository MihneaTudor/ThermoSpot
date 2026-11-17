const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new Error("Cannot reach the server. Is the backend running?");
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") message = body.detail;
    } catch {
      // response had no JSON body; keep the generic message
    }
    throw new Error(message);
  }

  return response.json();
}

export function fetchPrints() {
  return request("/api/prints");
}

export function fetchPrintDetails(id) {
  return request(`/api/prints/${id}`);
}

export function savePrintNotes(id, notes) {
  return request(`/api/prints/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ notes }),
  });
}

export function createPrint({ name, status = "completed", machineName = null }) {
  return request("/api/prints", {
    method: "POST",
    body: JSON.stringify({ name, status, machine_name: machineName }),
  });
}
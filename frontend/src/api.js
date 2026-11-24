const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "thermospot_token";


export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// App.jsx can register a callback to send the user back to the login page
// when the server rejects the token (expired or invalid).
let onUnauthorized = null;
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

// FastAPI sends detail as a string (HTTPException) or an array (422 validation errors)
function readDetail(body, fallback) {
  if (typeof body?.detail === "string") return body.detail;
  if (Array.isArray(body?.detail)) return body.detail.map((d) => d.msg).join(" ");
  return fallback;
}

async function request(path, { headers, ...options } = {}) {
  const token = getToken();
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
    });
  } catch {
    throw new ApiError("Cannot reach the server. Is the backend running?", 0);
  }

  if (!response.ok) {
    let body = null;
    try {
      body = await response.json();
    } catch {
      // no JSON body; keep the generic message
    }
    // A 401 on a protected request means the token is no longer valid.
    // (A failed login also returns 401, but there is no token yet at that point.)
    if (response.status === 401 && token) {
      clearToken();
      onUnauthorized?.();
    }
    throw new ApiError(readDetail(body, `Request failed (${response.status})`), response.status);
  }

  return response.json();
}

export const apiFetch = request;

// ---- auth ----
export async function login(email, password) {
  const data = await request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: email, password }),
  });
  setToken(data.access_token);
  return data; // { access_token, token_type, user: { id, email, display_name } }
}

export function signup({ name, email, password }) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ display_name: name, email, password }),
  });
}

export function fetchCurrentUser() {
  return request("/auth/me");
}

export function logout() {
  clearToken();
}

export function fetchPrints() {
  return request("/api/prints");
}

export function fetchPrintDetails(id, { since } = {}) {
  const query = since ? `?since=${encodeURIComponent(since)}` : "";
  return request(`/api/prints/${id}${query}`);
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

// ---- machines ----
export function fetchMachines() {
  return request("/machines/");
}

export function createMachine(name) {
  return request("/machines/", { method: "POST", body: JSON.stringify({ name }) });
}

export function updateMachine(id, { name }) {
  return request(`/machines/${id}`, { method: "PUT", body: JSON.stringify({ name }) });
}

export function deleteMachine(id) {
  return request(`/machines/${id}`, { method: "DELETE" });
}
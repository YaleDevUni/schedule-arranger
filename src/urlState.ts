import type { AvailabilityState } from "./types";

const PARAM_KEY = "state";

export function decodeStateFromUrl(): AvailabilityState | null {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get(PARAM_KEY);
  if (!raw) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded) as AvailabilityState;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildUrlWithState(state: AvailabilityState): string {
  const params = new URLSearchParams(window.location.search);
  const encoded = encodeURIComponent(JSON.stringify(state));
  params.set(PARAM_KEY, encoded);
  return `${window.location.origin}${window.location.pathname}?${params.toString()}${window.location.hash}`;
}

export function encodeStateToUrl(state: AvailabilityState) {
  const newUrl = buildUrlWithState(state);
  window.history.replaceState({}, "", newUrl);
}

export function buildDefaultState(): AvailabilityState {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const base_month = firstOfMonth.toISOString();

  return {
    total: 2,
    base_month,
    people: [
      {
        name: "Alice",
        available_time: []
      },
      {
        name: "Bob",
        available_time: []
      }
    ]
  };
}



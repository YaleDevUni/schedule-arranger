import type { AvailabilityState, PersonAvailability } from "./types";

const PARAM_KEY = "state";

const SLOT_MAP: Record<string, number> = {
  morning: 0,
  lunch: 1,
  evening: 2
};
const SLOT_MAP_REVERSE = Object.fromEntries(
  Object.entries(SLOT_MAP).map(([k, v]) => [v, k])
);

type CompactPerson = {
  n: string;
  a: [number, number][];
};

type CompactState = {
  m: string;
  p: CompactPerson[];
};

function compactState(state: AvailabilityState): CompactState {
  return {
    m: state.base_month,
    p: state.people.map((person) => ({
      n: person.name,
      a: person.available_time.map((time) => {
        const [day, slot] = time.split("|");
        const dayOfMonth = new Date(day).getDate();
        return [dayOfMonth, SLOT_MAP[slot]];
      })
    }))
  };
}

function expandState(compact: CompactState): AvailabilityState {
  const baseDate = new Date(compact.m);
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  return {
    base_month: compact.m,
    total: compact.p.length,
    people: compact.p.map((person) => ({
      name: person.n,
      available_time: person.a.map(([dayOfMonth, slot]) => {
        const date = new Date(year, month, dayOfMonth);
        return `${date.toISOString().split("T")[0]}|${SLOT_MAP_REVERSE[slot]}`;
      })
    }))
  };
}

export function decodeStateFromUrl(): AvailabilityState | null {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get(PARAM_KEY);
  if (!raw) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== "object") return null;

    // Check for new compact format
    if ("p" in parsed && "m" in parsed) {
      return expandState(parsed as CompactState);
    }

    // Assume old format
    return parsed as AvailabilityState;
  } catch {
    return null;
  }
}

export function buildUrlWithState(state: AvailabilityState): string {
  const params = new URLSearchParams(window.location.search);
  const compact = compactState(state);
  const encoded = encodeURIComponent(JSON.stringify(compact));
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


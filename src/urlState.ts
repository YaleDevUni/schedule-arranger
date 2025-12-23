import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent
} from "lz-string";
import type { AvailabilityState, PersonAvailability } from "./types";

const PARAM_KEY = "state";

const SLOT_MAP: Record<string, number> = {
  am: 0,
  pm: 1,
};
const SLOT_MAP_REVERSE = Object.fromEntries(
  Object.entries(SLOT_MAP).map(([k, v]) => [v, k])
);

type CompactPerson = {
  n: string;
  a: ([number, number] | [string, number])[]; // v1: [day, slot], v2: [yyy-mm-dd, slot]
};

type CompactState = {
  v?: 3;
  m: string;
  p: CompactPerson[];
};

function compactState(state: AvailabilityState): CompactState {
  return {
    v: 3,
    m: state.base_month,
    p: state.people.map((person) => ({
      n: person.name,
      a: person.available_time.map((time) => {
        const [day, slot] = time.split("|");
        return [day, SLOT_MAP[slot]];
      }),
    })),
  };
}

function expandState(compact: CompactState): AvailabilityState {
  // v3 is the latest, with 2 slots
  if (compact.v === 3) {
    return {
      base_month: compact.m,
      total: compact.p.length,
      people: compact.p.map((person) => ({
        name: person.n,
        available_time: person.a.map(([day, slot]) => {
          return `${day as string}|${SLOT_MAP_REVERSE[slot as number]}`;
        }),
      })),
    };
  }

  // Legacy expand for v1, v2, and older formats
  const LEGACY_SLOT_MAP_REVERSE: Record<number, string> = {
    0: "am", // morning
    1: "pm", // lunch
    2: "pm", // evening
  };

  // V2 stores absolute dates
  if (compact.v === 2) {
    return {
      base_month: compact.m,
      total: compact.p.length,
      people: compact.p.map((person) => ({
        name: person.n,
        available_time: person.a.map(([day, slot]) => {
          const slotValue = slot as number;
          return `${day as string}|${LEGACY_SLOT_MAP_REVERSE[slotValue]}`;
        }),
      })),
    };
  }

  // V1 (and older) stored day-of-month, so it was coupled to base_month
  const baseDate = new Date(compact.m);
  const year = baseDate.getUTCFullYear();
  const month = baseDate.getUTCMonth();

  return {
    base_month: compact.m,
    total: compact.p.length,
    people: compact.p.map((person) => ({
      name: person.n,
      available_time: person.a.map(([dayOfMonth, slot]) => {
        const slotValue = slot as number;
        const date = new Date(Date.UTC(year, month, dayOfMonth as number));
        return `${date.toISOString().split("T")[0]}|${
          LEGACY_SLOT_MAP_REVERSE[slotValue]
        }`;
      }),
    })),
  };
}

export function decodeStateFromUrl(): AvailabilityState | null {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get(PARAM_KEY);
  if (!raw) {
    return null;
  }

  // Attempt to decompress with lz-string first.
  // It should not throw, but returns null on failure.
  try {
    const decompressed = decompressFromEncodedURIComponent(raw);
    if (decompressed) {
      const parsed = JSON.parse(decompressed);
      if (parsed && typeof parsed === "object") {
        return expandState(parsed as CompactState);
      }
    }
  } catch (e) {
    // This catch block is for JSON.parse or expandState errors with lz-string data
    console.error("Failed to decode lz-string state:", e);
  }

  // If lz-string fails, try legacy formats.
  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== "object") return null;

    if ("p" in parsed && "m" in parsed) {
      return expandState(parsed as CompactState);
    }
    return parsed as AvailabilityState;
  } catch (e) {
    console.error("Failed to decode legacy state:", e);
  }

  return null;
}

export function buildUrlWithState(state: AvailabilityState): string {
  const params = new URLSearchParams(window.location.search);
  const compact = compactState(state);
  const encoded = compressToEncodedURIComponent(JSON.stringify(compact));
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


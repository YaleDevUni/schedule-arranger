import type { AvailabilityState } from "./types";

export function getMonthDays(baseMonthIso: string): Date[] {
  const base = new Date(baseMonthIso);
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const days: Date[] = [];

  let current = first;
  while (current.getUTCMonth() === month) {
    days.push(new Date(current));
    current = new Date(Date.UTC(year, month, current.getUTCDate() + 1));
  }

  return days;
}

export function formatDateKey(d: Date): string {
  // Use just the date portion in ISO format (YYYY-MM-DD)
  const year = d.getUTCFullYear();
  const month = `${d.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${d.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isDayAvailable(
  state: AvailabilityState,
  personIndex: number,
  day: Date
): boolean {
  const key = formatDateKey(day);
  const person = state.people[personIndex];
  return person.available_time.some((entry) => entry.startsWith(`${key}|`));
}

export type DaySlot = "am" | "pm";

export function hasDaySlot(
  state: AvailabilityState,
  personIndex: number,
  day: Date,
  slot: DaySlot
): boolean {
  const key = formatDateKey(day);
  const person = state.people[personIndex];
  const slotKey = `${key}|${slot}`;
  return person.available_time.includes(slotKey);
}

export function toggleDaySlot(
  state: AvailabilityState,
  personIndex: number,
  day: Date,
  slot: DaySlot
): AvailabilityState {
  const key = formatDateKey(day);
  const person = state.people[personIndex];
  const slotKey = `${key}|${slot}`;
  const current = person.available_time;
  const has = current.includes(slotKey);

  const nextPerson = {
    ...person,
    available_time: has
      ? current.filter((entry) => entry !== slotKey)
      : [...current, slotKey]
  };

  const nextPeople = state.people.slice();
  nextPeople[personIndex] = nextPerson;

  return {
    ...state,
    people: nextPeople
  };
}


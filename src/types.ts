export type AvailabilityState = {
  total: number;
  /** ISO string for the first day of the month, e.g. "2025-12-01T00:00:00.000Z" */
  base_month: string;
  people: PersonAvailability[];
};

export type PersonAvailability = {
  name: string;
  /**
   * Keys representing available slots in "YYYY-MM-DD|slot" format,
   * where slot is one of "morning" | "lunch" | "evening".
   */
  available_time: string[];
};



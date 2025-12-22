import { useEffect, useMemo, useState } from "react";
import type { AvailabilityState } from "./types";
import {
  buildDefaultState,
  decodeStateFromUrl,
  encodeStateToUrl,
} from "./urlState";
import {
  DaySlot,
  formatDateKey,
  getMonthDays,
  hasDaySlot,
  isDayAvailable,
  toggleDaySlot,
} from "./calendarUtils";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const personColors = [
  "#ef4444",
  "#f97316",
  "#facc15",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#f973ab",
];

export function App() {
  const [state, setState] = useState<AvailabilityState>(() => {
    return decodeStateFromUrl() ?? buildDefaultState();
  });
  const [activePersonIndex, setActivePersonIndex] = useState(0);
  const [newPersonName, setNewPersonName] = useState("");
  const [viewMode, setViewMode] = useState<"person" | "overall">("person");
  const [slotEditorDay, setSlotEditorDay] = useState<Date | null>(null);
  const [overallDetailDay, setOverallDetailDay] = useState<Date | null>(null);

  useEffect(() => {
    encodeStateToUrl(state);
  }, [state]);

  const days = useMemo(
    () => getMonthDays(state.base_month),
    [state.base_month]
  );

  const firstDayOfWeek = days[0]?.getDay() ?? 0;

  const monthLabel = useMemo(() => {
    const base = new Date(state.base_month);
    return base.toLocaleString(undefined, { month: "long", year: "numeric" });
  }, [state.base_month]);

  const monthInputValue = useMemo(() => {
    const base = new Date(state.base_month);
    const y = base.getFullYear();
    const m = `${base.getMonth() + 1}`.padStart(2, "0");
    return `${y}-${m}`;
  }, [state.base_month]);

  const shareUrl = useMemo(() => window.location.href, [state]);

  const handleAddPerson = () => {
    const name = newPersonName.trim();
    if (!name) return;
    // Avoid duplicate names to keep keys stable
    if (state.people.some((p) => p.name === name)) {
      setNewPersonName("");
      return;
    }

    setState((prev) => ({
      ...prev,
      total: prev.total + 1,
      people: [...prev.people, { name, available_time: [] }],
    }));
    setActivePersonIndex(state.people.length);
    setViewMode("person");
    setNewPersonName("");
  };

  const handleRemovePerson = (index: number) => {
    if (state.people.length <= 1) {
      return;
    }
    setState((prev) => {
      const nextPeople = prev.people.filter((_, i) => i !== index);
      let nextActive = activePersonIndex;
      if (index === activePersonIndex) {
        nextActive = Math.max(0, activePersonIndex - 1);
      } else if (index < activePersonIndex) {
        nextActive = Math.max(0, activePersonIndex - 1);
      }
      setActivePersonIndex(nextActive);
      return {
        ...prev,
        total: Math.max(0, prev.total - 1),
        people: nextPeople,
      };
    });
    setViewMode("person");
  };

  const handleMonthChange = (value: string) => {
    if (!value) return;
    const [yearStr, monthStr] = value.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return;
    const firstOfMonth = new Date(year, month - 1, 1);
    setState((prev) => ({
      ...prev,
      base_month: firstOfMonth.toISOString(),
    }));
  };

  const shiftMonth = (delta: number) => {
    const base = new Date(state.base_month);
    const next = new Date(base.getFullYear(), base.getMonth() + delta, 1);
    setState((prev) => ({
      ...prev,
      base_month: next.toISOString(),
    }));
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Schedule Arranger</h1>
        <p className="app-subtitle">
          State is stored in the URL. Edit availability and share this link.
        </p>
      </header>

      <main className="app-main">
        <section className="sidebar">
          <h2>People</h2>
          <ul className="people-list">
            {state.people.map((person, index) => (
              <li key={index} className="people-list-item">
                <button
                  type="button"
                  className={
                    index === activePersonIndex
                      ? "person-button person-button--active"
                      : "person-button"
                  }
                  onClick={() => {
                    setActivePersonIndex(index);
                    setViewMode("person");
                    setOverallDetailDay(null);
                  }}
                >
                  <span
                    className="person-color-dot"
                    style={{
                      backgroundColor:
                        personColors[index % personColors.length],
                    }}
                  />
                  {person.name}
                </button>
                <button
                  type="button"
                  className="person-remove-button"
                  onClick={() => handleRemovePerson(index)}
                  aria-label={`Remove ${person.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="add-person-row">
            <input
              className="add-person-input"
              placeholder="Add person…"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              onKeyDown={(e) => {
                const anyEvent = e as unknown as {
                  key: string;
                  nativeEvent?: { isComposing?: boolean };
                };
                const isComposing = anyEvent.nativeEvent?.isComposing;
                if (e.key === "Enter" && !isComposing) {
                  e.preventDefault();
                  handleAddPerson();
                }
              }}
            />
            <button
              type="button"
              className="add-person-button"
              onClick={handleAddPerson}
            >
              +
            </button>
          </div>
          <div className="color-legend">
            <span className="color-legend-title">색상 안내</span>
            <ul className="color-legend-list">
              {state.people.map((person, index) => (
                <li key={`legend-${index}`} className="color-legend-item">
                  <span
                    className="person-color-dot"
                    style={{
                      backgroundColor:
                        personColors[index % personColors.length],
                    }}
                  />
                  <span className="color-legend-name">{person.name}</span>
                </li>
              ))}
            </ul>
            <span className="color-legend-caption">
              위 색상은 전체 보기의 점 색과 동일합니다.
            </span>
          </div>

          <div className="share-box">
            <h3>Share this schedule</h3>
            <input
              readOnly
              className="share-input"
              value={shareUrl}
              onFocus={(e) => e.target.select()}
            />
            <p className="share-hint">Copy this URL and send it to others.</p>
          </div>
          <p className="overall-guide">
            전체 보기에서 각 날짜 칸의 점 줄은 위에서부터 아침 · 점심 · 저녁
            순서입니다.
          </p>
        </section>

        <section className="calendar-section">
          <header className="calendar-header">
            <h2>{monthLabel}</h2>
            <div className="calendar-header-controls">
              <div className="calendar-month-controls">
                <button
                  type="button"
                  className="month-nav-button"
                  onClick={() => shiftMonth(-1)}
                  aria-label="Previous month"
                >
                  ‹
                </button>
                <input
                  type="month"
                  className="month-input"
                  value={monthInputValue}
                  onChange={(e) => handleMonthChange(e.target.value)}
                />
                <button
                  type="button"
                  className="month-nav-button"
                  onClick={() => shiftMonth(1)}
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>
              <div className="calendar-view-toggle">
                <button
                  type="button"
                  className={
                    viewMode === "person"
                      ? "view-toggle-button view-toggle-button--active"
                      : "view-toggle-button"
                  }
                  onClick={() => {
                    setViewMode("person");
                    setOverallDetailDay(null);
                  }}
                  title="개인별로 아침/점심/저녁 가능 시간을 설정합니다."
                >
                  Per-person
                </button>
                <button
                  type="button"
                  className={
                    viewMode === "overall"
                      ? "view-toggle-button view-toggle-button--active"
                      : "view-toggle-button"
                  }
                  onClick={() => {
                    setViewMode("overall");
                    setSlotEditorDay(null);
                  }}
                  title="모든 사람의 공통 가능 시간을 한눈에 봅니다."
                >
                  Overall
                </button>
              </div>
            </div>
          </header>

          <div className="calendar-grid">
            {weekdayLabels.map((label) => (
              <div key={label} className="calendar-weekday">
                {label}
              </div>
            ))}

            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="calendar-cell calendar-cell--empty"
              />
            ))}

            {days.map((day) => {
              if (viewMode === "person") {
                const available = isDayAvailable(state, activePersonIndex, day);
                const isSelected =
                  slotEditorDay &&
                  formatDateKey(slotEditorDay) === formatDateKey(day);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    className={
                      available
                        ? `calendar-cell calendar-cell--available${
                            isSelected ? " calendar-cell--selected" : ""
                          }`
                        : `calendar-cell calendar-cell--unavailable${
                            isSelected ? " calendar-cell--selected" : ""
                          }`
                    }
                    onClick={() => {
                      setSlotEditorDay(day);
                    }}
                    title={(() => {
                      const slotsForTooltip: { key: DaySlot; label: string }[] =
                        [
                          { key: "morning", label: "아침" },
                          { key: "lunch", label: "점심" },
                          { key: "evening", label: "저녁" },
                        ];
                      const activeLabels = slotsForTooltip
                        .filter(({ key }) =>
                          hasDaySlot(state, activePersonIndex, day, key)
                        )
                        .map(({ label }) => label);
                      const personName =
                        state.people[activePersonIndex]?.name ?? "이 사람";
                      if (activeLabels.length === 0) {
                        return `${personName}: 선택된 시간 없음`;
                      }
                      return `${personName}: ${activeLabels.join(", ")}`;
                    })()}
                  >
                    <span className="calendar-cell-day">{day.getDate()}</span>
                    <div className="person-slot-dots">
                      {(["morning", "lunch", "evening"] as DaySlot[]).map(
                        (slot) => {
                          const active = hasDaySlot(
                            state,
                            activePersonIndex,
                            day,
                            slot
                          );
                          return (
                            <span
                              key={slot}
                              className={
                                active
                                  ? "person-slot-dot person-slot-dot--active"
                                  : "person-slot-dot"
                              }
                            />
                          );
                        }
                      )}
                    </div>
                  </button>
                );
              }

              const dayKey = formatDateKey(day);
              const slots: DaySlot[] = ["morning", "lunch", "evening"];
              const totalPeople = state.people.length || 1;
              const hasCommon = slots.some((slot) => {
                const slotKey = `${dayKey}|${slot}`;
                const count = state.people.filter((p) =>
                  p.available_time.includes(slotKey)
                ).length;
                return count === totalPeople && totalPeople > 0;
              });

              return (
                <div
                  key={day.toISOString()}
                  className={
                    hasCommon
                      ? "calendar-cell calendar-cell--overall calendar-cell--overall-common calendar-cell--readonly"
                      : "calendar-cell calendar-cell--overall calendar-cell--readonly"
                  }
                  role="button"
                  tabIndex={0}
                  onClick={() => setOverallDetailDay(day)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setOverallDetailDay(day);
                    }
                  }}
                  title={(() => {
                    const slotsForTooltip: { key: DaySlot; label: string }[] = [
                      { key: "morning", label: "아침" },
                      { key: "lunch", label: "점심" },
                      { key: "evening", label: "저녁" },
                    ];
                    const keyForDay = formatDateKey(day);
                    const allLabels: string[] = [];
                    const someLabels: string[] = [];
                    slotsForTooltip.forEach(({ key, label }) => {
                      const slotKey = `${keyForDay}|${key}`;
                      const count = state.people.filter((p) =>
                        p.available_time.includes(slotKey)
                      ).length;
                      if (count === totalPeople && totalPeople > 0) {
                        allLabels.push(label);
                      } else if (count > 0) {
                        someLabels.push(label);
                      }
                    });
                    const parts: string[] = [];
                    if (allLabels.length > 0) {
                      parts.push(`모두 가능: ${allLabels.join(", ")}`);
                    }
                    if (someLabels.length > 0) {
                      parts.push(`일부 가능: ${someLabels.join(", ")}`);
                    }
                    if (parts.length === 0) {
                      return "이 날짜에는 아무도 선택된 시간이 없습니다.";
                    }
                    return parts.join(" / ");
                  })()}
                >
                  <span className="calendar-cell-day">{day.getDate()}</span>
                  <div className="calendar-cell-slots">
                    {slots.map((slot) => {
                      const slotKey = `${dayKey}|${slot}`;
                      const availablePeople = state.people
                        .map((p, index) => ({ person: p, index }))
                        .filter(({ person }) =>
                          person.available_time.includes(slotKey)
                        );
                      const total = state.people.length || 1;
                      const availableCount = availablePeople.length;
                      const all = availableCount === total && total > 0;

                      return (
                        <div
                          key={slot}
                          className={
                            all
                              ? "calendar-slot-row calendar-slot-row--all"
                              : "calendar-slot-row"
                          }
                        >
                          <div className="calendar-cell-dots">
                            {availablePeople.map(({ index }) => (
                              <span
                                key={index}
                                className="calendar-cell-dot"
                                style={{
                                  backgroundColor:
                                    personColors[index % personColors.length],
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {viewMode === "overall" && overallDetailDay && (
            <div className="overall-detail">
              <div className="overall-detail-header">
                <span className="overall-detail-title">
                  {overallDetailDay.getMonth() + 1}월{" "}
                  {overallDetailDay.getDate()}일
                </span>
                <button
                  type="button"
                  className="overall-detail-close"
                  onClick={() => setOverallDetailDay(null)}
                >
                  ×
                </button>
              </div>
              <div className="overall-detail-body">
                {(["morning", "lunch", "evening"] as DaySlot[]).map((slot) => {
                  const dayKey = formatDateKey(overallDetailDay);
                  const slotKey = `${dayKey}|${slot}`;
                  const label =
                    slot === "morning"
                      ? "아침"
                      : slot === "lunch"
                      ? "점심"
                      : "저녁";
                  const people = state.people
                    .map((p, index) => ({ person: p, index }))
                    .filter(({ person }) =>
                      person.available_time.includes(slotKey)
                    );

                  return (
                    <div key={slot} className="overall-detail-slot-row">
                      <span className="overall-detail-slot-label">{label}</span>
                      <div className="overall-detail-slot-people">
                        {people.length === 0 ? (
                          <span className="overall-detail-none">없음</span>
                        ) : (
                          people.map(({ person, index }) => (
                            <span
                              key={person.name + index}
                              className="overall-detail-chip"
                            >
                              <span
                                className="overall-detail-chip-dot"
                                style={{
                                  backgroundColor:
                                    personColors[index % personColors.length],
                                }}
                              />
                              {person.name}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {viewMode === "person" && slotEditorDay && (
            <div className="slot-editor">
              <div className="slot-editor-header">
                <span className="slot-editor-title">
                  {slotEditorDay.getMonth() + 1}월 {slotEditorDay.getDate()}일 ·{" "}
                  {state.people[activePersonIndex]?.name}
                </span>
                <button
                  type="button"
                  className="slot-editor-close"
                  onClick={() => setSlotEditorDay(null)}
                >
                  ×
                </button>
              </div>
              <div className="slot-editor-buttons">
                {(["morning", "lunch", "evening"] as DaySlot[]).map((slot) => {
                  const active = hasDaySlot(
                    state,
                    activePersonIndex,
                    slotEditorDay,
                    slot
                  );
                  const label =
                    slot === "morning"
                      ? "아침"
                      : slot === "lunch"
                      ? "점심"
                      : "저녁";
                  return (
                    <button
                      key={slot}
                      type="button"
                      className={
                        active
                          ? "slot-button slot-button--active"
                          : "slot-button"
                      }
                      onClick={() =>
                        setState((prev) =>
                          toggleDaySlot(
                            prev,
                            activePersonIndex,
                            slotEditorDay,
                            slot
                          )
                        )
                      }
                    >
                      {label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="slot-button slot-button--all"
                  onClick={() => {
                    setState((prev) => {
                      if (!slotEditorDay) return prev;
                      const dayKey = formatDateKey(slotEditorDay);
                      const slots: DaySlot[] = ["morning", "lunch", "evening"];
                      const person = prev.people[activePersonIndex];
                      if (!person) return prev;

                      const allSelected = slots.every((slot) =>
                        person.available_time.includes(`${dayKey}|${slot}`)
                      );

                      let next = prev;
                      const updatedPerson = { ...person };

                      if (allSelected) {
                        // All three are on → clear all three for that day
                        updatedPerson.available_time =
                          person.available_time.filter(
                            (entry) => !entry.startsWith(`${dayKey}|`)
                          );
                      } else {
                        // Not all selected → ensure all three are set to true
                        const neededKeys = slots.map(
                          (slot) => `${dayKey}|${slot}`
                        );
                        const set = new Set(updatedPerson.available_time);
                        neededKeys.forEach((k) => set.add(k));
                        updatedPerson.available_time = Array.from(set);
                      }

                      const nextPeople = prev.people.slice();
                      nextPeople[activePersonIndex] = updatedPerson;

                      next = {
                        ...prev,
                        people: nextPeople,
                      };

                      return next;
                    });
                  }}
                >
                  하루종일
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

schedule-arranger
=================

Simple schedule arranger based on URL-encoded JSON state.

### Development

1. Install dependencies:

```bash
cd schedule-arranger
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Open the printed URL (usually `http://localhost:5173`).

### URL format

The application reads and writes a `state` query parameter:

- **Encoding**: `state=${encodeURIComponent(JSON.stringify(jsonState))}`
- **JSON shape**:

```json
{
  "total": 2,
  "base_month": "2025-12-01T00:00:00.000Z",
  "people": [
    {
      "name": "John Doe",
      "available_time": [
        "2025-12-03|morning",
        "2025-12-03|lunch",
        "2025-12-05|evening"
      ]
    }
  ]
}
```

Each `available_time` entry is a string of the form `YYYY-MM-DD|slot`, where **slot** is one of:

- `morning` (아침)
- `lunch` (점심)
- `evening` (저녁)

### Legend / UI meaning

- **Available**: In *Per-person* view, dates this person can do at least one slot (green cells).
- **Unavailable**: In *Per-person* view, dates this person has no slot selected (gray cells).
- **Everyone available**: In *Overall* view, days where at least one slot has every person available (day cell gets a green border).
- **Some available**: In *Overall* view, dot rows where only some people are available for that slot (colored dots, but no full-cell highlight).



# Competitive Programming Tracker (Single Page App)

A lightweight single-page web application to track competitive programming practice: rating-wise & topic-wise problems, upcoming 4-week learning topics, and upsolve backlog — all stored locally in your browser via `localStorage` (no backend needed).

> Status: Initial scaffold committed. Core rating problem CRUD implemented. Other sections are placeholders and will be expanded.

## Features (Planned / Partial)

- Dashboard overview with progress summary
- Rating-wise next month problems (CRUD, solved toggle, grouping)
- Topic-wise next month problems (planned)
- 4-week topics planner with resources (planned)
- Upsolve tracker (planned)
- Global search across entries (basic implementation)
- Simple calendar view placeholder
- Export / Import JSON backup
- Dark mode toggle (persisted)
- Responsive design (Bootstrap 5 + light custom CSS)

## Data Structure
```json
{
  "nextMonthRating": [],
  "nextMonthTopic": [],
  "topics4Weeks": [],
  "upsolve": []
}
```
Each list will contain objects with generated `id` plus relevant fields (e.g., `name`, `link`, `rating`, `topic`, `status`, `resources`, etc.).

## Getting Started
Just open `index.html` in a modern browser (Chrome, Firefox, Edge). All data stays in your browser.

## Development Notes
- No build step required.
- Uses Bootstrap 5 CDN.
- Extend modal helpers in `app.js` for additional CRUD forms.

## Roadmap
- Implement remaining CRUD forms (topic problems, 4-week topics, upsolve)
- Add progress donut chart (canvas placeholder exists)
- Enhanced calendar (show due dates & spans)
- Filtering & sorting improvements
- Better search result highlighting
- Optional Problem deadlines

## Export / Import
- Export: Click the Export button to download `cp-tracker-backup.json`.
- Import: Click Import and choose a previously exported JSON file.

## License
MIT (feel free to adapt).

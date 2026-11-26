# The Floor Plan — Hall Booking &amp; Layout Planner

A hall/banquet-room booking page. The customer enters the room's dimensions,
chooses whether they are planning a restaurant, hotel dining area, banquet
hall, or cafe, and sets how many tables and chairs per table they want. The
page draws a to-scale blueprint of the room live in the browser and tells the
customer whether their tables and chairs actually fit — before they submit
anything.

## What's inside

```
hall-booking/
├── public/
│   ├── index.html      the booking form + live layout preview
│   ├── styles.css       
│   └── script.js        canvas drawing + fit calculation + API calls
├── server.js             Node/Express backend
├── data/
│   └── bookings.json     where submitted requests are saved
├── package.json
└── README.md
```

## How it works

- **Frontend (HTML/CSS/JS only, no framework):** the customer picks a room
  size (a preset or custom length × width), a space type for restaurant or
  hotel planning, a window view, number of tables, chairs per table, and
  table shape. A `<canvas>` blueprint redraws on every change — grid lines to
  scale, the room outline, and tables with their chairs arranged in a grid.
  A readout under the canvas says whether the requested tables fit the hall,
  and if not, how many actually would.
- **Fit logic:** each table gets a footprint (its own diameter plus 0.9m of
  clearance on every side for chairs and walking space). The hall's usable
  area (inside a 0.5m margin from the walls) is divided by that footprint
  to get a grid of columns × rows — that's the true table capacity.
- **Backend (Node.js/Express):** `POST /api/bookings` validates the
  submission, assigns an auto-incrementing request ID (`REQ-0001`,
  `REQ-0002`, …) the way an admin-assigned serial would work, and appends
  the record to `data/bookings.json`. `GET /api/bookings` lists everything
  saved so far, which the page uses to populate the "Saved requests" table
  at the bottom.

## Running it

```bash
npm install
npm start
```

Then open **http://localhost:3000**.

Without the server running, the form and live blueprint still work fully in
the browser — you just won't be able to save a request or see the saved
list, since that part lives in `bookings.json` on the server.

## Extending it

- **Booking/date conflicts:** right now any date can be requested more than
  once. Add a check in the `POST /api/bookings` route in `server.js` that
  rejects a request if another saved record has the same `eventDate`.
- **Admin view:** `GET /api/bookings/:reqid` already exists for looking up
  a single request — a simple admin page could list all of them with a
  cancel/delete action (`DELETE /api/bookings/:reqid`, not yet implemented).
- **Rectangular table sizing:** the rectangular option currently reuses the
  round table's footprint for spacing math; if you want tighter packing for
  rectangular tables, give them their own footprint formula in
  `TABLE_DIAMETER`/`computeFit()` in `script.js`.
- **Restaurant or hotel presets:** the new `Space type` dropdown in
  `public/index.html` pre-fills a practical table count, chair count, and
  table shape for restaurant, hotel, banquet, and cafe layouts.

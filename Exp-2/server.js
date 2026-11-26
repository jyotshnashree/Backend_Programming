const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data", "bookings.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- helpers ----------
function readBookings() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

function writeBookings(list) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), "utf-8");
}

function nextReqId(list) {
  // admin-style auto serial number: REQ-0001, REQ-0002, ...
  const n = list.length + 1;
  return `REQ-${String(n).padStart(4, "0")}`;
}

function normalizeTableShape(shape) {
  if (typeof shape !== "string") return "round";
  const normalized = shape.trim().toLowerCase();
  const aliases = {
    circle: "round",
    round: "round",
    rectangle: "rectangle",
    rectangular: "rectangle",
    square: "square",
    oval: "oval",
    hexagon: "hexagon",
    triangle: "triangle"
  };
  return aliases[normalized] || "round";
}

function isFutureDate(value) {
  if (typeof value !== "string" || !value.trim()) return true;
  const chosen = new Date(`${value}T00:00:00`);
  if (Number.isNaN(chosen.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return chosen >= today;
}

function isValidBooking(b) {
  const allowedVenueTypes = new Set(["restaurant", "hotel", "banquet", "cafe"]);
  const allowedTableShapes = new Set(["round", "circle", "square", "rectangle", "rectangular", "oval", "hexagon", "triangle"]);

  return (
    b &&
    typeof b.customerName === "string" && b.customerName.trim() &&
    typeof b.phone === "string" && b.phone.trim() &&
    typeof b.email === "string" && b.email.trim() &&
    typeof b.venueType === "string" && allowedVenueTypes.has(b.venueType) &&
    b.hall && typeof b.hall.length === "number" && typeof b.hall.width === "number" &&
    typeof b.numTables === "number" &&
    typeof b.chairsPerTable === "number" &&
    typeof b.tableShape === "string" && allowedTableShapes.has(b.tableShape.trim().toLowerCase()) &&
    isFutureDate(b.eventDate)
  );
}

// ---------- routes ----------

// list all saved booking requests
app.get("/api/bookings", (req, res) => {
  res.json(readBookings());
});

// create a new booking request
app.post("/api/bookings", (req, res) => {
  const body = req.body;
  if (!isValidBooking(body)) {
    return res.status(400).json({ error: "Missing or invalid booking fields." });
  }

  const list = readBookings();
  const record = {
    reqid: nextReqId(list),
    customerName: body.customerName.trim(),
    phone: body.phone.trim(),
    email: body.email.trim(),
    venueType: body.venueType,
    hall: { length: body.hall.length, width: body.hall.width },
    numTables: body.numTables,
    chairsPerTable: body.chairsPerTable,
    tableShape: normalizeTableShape(body.tableShape),
    eventDate: body.eventDate || null,
    remarks: body.remarks || "",
    windowView: body.windowView || "none",
    fit: body.fit || null,
    submittedAt: new Date().toISOString()
  };

  list.push(record);
  writeBookings(list);
  res.status(201).json(record);
});

// fetch a single booking by reqid
app.get("/api/bookings/:reqid", (req, res) => {
  const list = readBookings();
  const found = list.find((b) => b.reqid === req.params.reqid);
  if (!found) return res.status(404).json({ error: "Not found" });
  res.json(found);
});

app.listen(PORT, () => {
  console.log(`The Floor Plan server running at http://localhost:${PORT}`);
});

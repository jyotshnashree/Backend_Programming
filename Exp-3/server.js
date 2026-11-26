const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3001;
const STATIC_ROOT = __dirname;
const DATA_FILE = path.join(__dirname, "..", "Exp-2", "data", "bookings.json");
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

function readBookings() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8") || "[]");
  } catch {
    return [];
  }
}

function writeBookings(bookings) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2), "utf8");
}

function normalizeTableShape(shape) {
  const value = typeof shape === "string" ? shape.trim().toLowerCase() : "round";
  if (value === "circle") return "round";
  if (value === "rectangular") return "rectangle";
  return ["round", "square", "rectangle", "oval", "hexagon", "triangle"].includes(value) ? value : "round";
}

function isFutureDate(value) {
  if (typeof value !== "string" || !value.trim()) return true;
  const chosen = new Date(`${value}T00:00:00`);
  if (Number.isNaN(chosen.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return chosen >= today;
}

function isValidBooking(booking) {
  return Boolean(
    booking &&
    typeof booking.customerName === "string" && booking.customerName.trim() &&
    typeof booking.phone === "string" && booking.phone.trim() &&
    typeof booking.email === "string" && booking.email.trim() &&
    ["restaurant", "hotel", "banquet", "cafe"].includes(booking.venueType) &&
    booking.hall && typeof booking.hall.length === "number" && typeof booking.hall.width === "number" &&
    typeof booking.numTables === "number" && typeof booking.chairsPerTable === "number" &&
    typeof booking.tableShape === "string" && isFutureDate(booking.eventDate)
  );
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  });
  response.end(JSON.stringify(value));
}

function getRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    request.on("error", reject);
  });
}

function createRecord(body, reqid) {
  return {
    reqid,
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
    updateCount: 0
  };
}

function getNextRequestId(bookings) {
  const highestId = bookings.reduce((highest, booking) => {
    const match = /^REQ-(\d+)$/.exec(String(booking.reqid || ""));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `REQ-${String(highestId + 1).padStart(4, "0")}`;
}

async function handleApi(request, response, pathname) {
  const parts = pathname.split("/").filter(Boolean);
  const reqid = parts[2] ? decodeURIComponent(parts[2]) : null;
  let bookings = readBookings();

  if (request.method === "GET" && !reqid) return sendJson(response, 200, bookings);
  if (request.method === "GET" && reqid) {
    const booking = bookings.find((item) => item.reqid === reqid);
    return booking ? sendJson(response, 200, booking) : sendJson(response, 404, { error: "Not found" });
  }

  if (request.method === "POST" || request.method === "PUT") {
    let body;
    try {
      body = await getRequestBody(request);
    } catch {
      return sendJson(response, 400, { error: "Invalid JSON" });
    }
    if (!isValidBooking(body)) return sendJson(response, 400, { error: "Missing or invalid booking fields." });

    if (request.method === "POST") {
      const newRecord = createRecord(body, getNextRequestId(bookings));
      bookings.push({ ...newRecord, submittedAt: new Date().toISOString() });
      writeBookings(bookings);
      return sendJson(response, 201, bookings[bookings.length - 1]);
    }

    const index = bookings.findIndex((item) => item.reqid === reqid);
    if (index === -1) return sendJson(response, 404, { error: "Not found" });
    bookings[index] = {
      ...bookings[index],
      ...createRecord(body, reqid),
      updateCount: (Number(bookings[index].updateCount) || 0) + 1,
      updatedAt: new Date().toISOString()
    };
    writeBookings(bookings);
    return sendJson(response, 200, bookings[index]);
  }

  if (request.method === "DELETE" && reqid) {
    const index = bookings.findIndex((item) => item.reqid === reqid);
    if (index === -1) return sendJson(response, 404, { error: "Not found" });
    const [removed] = bookings.splice(index, 1);
    writeBookings(bookings);
    return sendJson(response, 200, removed);
  }

  if (request.method === "PATCH" && reqid && parts[3] === "fields") {
    let body;
    try {
      body = await getRequestBody(request);
    } catch {
      return sendJson(response, 400, { error: "Invalid JSON" });
    }
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return sendJson(response, 400, { error: "Field name is required." });
    const index = bookings.findIndex((item) => item.reqid === reqid);
    if (index === -1) return sendJson(response, 404, { error: "Not found" });
    const customFields = { ...(bookings[index].customFields || {}) };
    const standardFields = ["customerName", "phone", "email", "venueType", "eventDate", "remarks", "windowView"];
    const updatedBooking = { ...bookings[index] };
    if (body.remove && standardFields.includes(name)) {
      delete updatedBooking[name];
    } else if (body.remove) {
      delete customFields[name];
      updatedBooking.customFields = customFields;
    } else {
      customFields[name] = String(body.value || "").trim();
      updatedBooking.customFields = customFields;
    }
    bookings[index] = {
      ...updatedBooking,
      updateCount: (Number(bookings[index].updateCount) || 0) + 1,
      updatedAt: new Date().toISOString()
    };
    writeBookings(bookings);
    return sendJson(response, 200, bookings[index]);
  }

  sendJson(response, 405, { error: "Method not allowed" });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/bookings")) {
    return handleApi(request, response, url.pathname);
  }
  if (request.method !== "GET") return sendJson(response, 405, { error: "Method not allowed" });

  const relativePath = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  const filePath = path.resolve(STATIC_ROOT, relativePath);
  if (!filePath.startsWith(path.resolve(STATIC_ROOT))) {
    return sendJson(response, 403, { error: "Forbidden" });
  }
  try {
    const content = fs.readFileSync(filePath);
    response.writeHead(200, { "Content-Type": MIME_TYPES[path.extname(filePath)] || "text/plain; charset=utf-8" });
    response.end(content);
  } catch {
    sendJson(response, 404, { error: "Not found" });
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the existing server before starting another copy.`);
    process.exitCode = 1;
    return;
  }
  throw error;
});

server.listen(PORT, () => {
  console.log(`Exp-3 server running at http://localhost:${PORT}`);
  console.log(`Connected data file: ${DATA_FILE}`);
});

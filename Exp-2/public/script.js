// ---------- Table sizing reference (metres) ----------
// diameter of the table itself, by chair count
const TABLE_DIAMETER = { 4: 1.2, 6: 1.5, 8: 1.8, 10: 2.1, 12: 2.4 };
const TABLE_SHAPES = {
  round: { label: "Round / Circle", footprint: 1 },
  circle: { label: "Round / Circle", footprint: 1 },
  square: { label: "Square", footprint: 1.2 },
  rectangle: { label: "Rectangle", footprint: 1.5 },
  rectangular: { label: "Rectangle", footprint: 1.5 },
  oval: { label: "Oval", footprint: 1.35 },
  hexagon: { label: "Hexagon", footprint: 1.25 },
  triangle: { label: "Triangle", footprint: 1.3 }
};
// clearance added around each table for chairs + walking space
const CLEARANCE = 0.9;
const BORDER_MARGIN = 0.5; // gap kept from the hall walls

const presetSizes = {
  "9x6":  { length: 9,  width: 6  },
  "15x10":{ length: 15, width: 10 },
  "24x15":{ length: 24, width: 15 },
  "30x20":{ length: 30, width: 20 }
};

const windowLabels = {
  none: "No window",
  garden: "View — Garden",
  pool: "View — Pool",
  street: "View — Street",
  sea: "View — Sea"
};

const venuePresets = {
  restaurant: {
    label: "Restaurant dining room",
    note: "Optimized for tighter guest spacing and quicker service flow.",
    tables: 10,
    chairs: 4,
    shape: "rectangle"
  },
  hotel: {
    label: "Hotel breakfast / dining area",
    note: "Balanced for a mixed guest flow with more comfortable circulation.",
    tables: 8,
    chairs: 4,
    shape: "round"
  },
  banquet: {
    label: "Banquet / event hall",
    note: "Keeps the current event-hall style layout and fuller seating plan.",
    tables: 12,
    chairs: 6,
    shape: "round"
  },
  cafe: {
    label: "Cafe / lounge",
    note: "Smaller table clusters for informal seating and wider walkways.",
    tables: 6,
    chairs: 4,
    shape: "rectangle"
  }
};

const el = (id) => document.getElementById(id);

const dimMode = el("dimMode");
const presetRow = el("presetRow");
const customRow = el("customRow");
const hallPreset = el("hallPreset");
const hallLength = el("hallLength");
const hallWidth = el("hallWidth");
const windowView = el("windowView");
const venueType = el("venueType");
const venueHelp = el("venueHelp");
const numTables = el("numTables");
const chairsPerTable = el("chairsPerTable");
const tableShape = el("tableShape");
const canvas = el("blueprintCanvas");
const ctx = canvas.getContext("2d");
const fitDot = el("fitDot");
const fitText = el("fitText");
const specList = el("specList");
const windowTag = el("windowTag");
const reqidField = el("reqid");
const saveNote = el("saveNote");
const eventDateInput = el("eventDate");
const eventDateHelp = el("eventDateHelp");

function setMinimumEventDate() {
  const today = new Date();
  const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  const minDate = local.toISOString().split("T")[0];
  eventDateInput.min = minDate;

  if (eventDateInput.value && eventDateInput.value < minDate) {
    eventDateInput.value = "";
    eventDateHelp.textContent = "You can't choose the previous date.";
    eventDateHelp.style.color = "#b9474a";
    return;
  }

  eventDateHelp.textContent = "You can't choose the previous date.";
  eventDateHelp.style.color = "#6f7d86";
}

[eventDateInput].forEach((input) => {
  input.addEventListener("input", setMinimumEventDate);
  input.addEventListener("change", setMinimumEventDate);
});

function currentHallDims() {
  if (dimMode.value === "preset") {
    return presetSizes[hallPreset.value];
  }
  return {
    length: Math.max(3, Number(hallLength.value) || 3),
    width: Math.max(3, Number(hallWidth.value) || 3)
  };
}

function applyVenuePreset() {
  const preset = venuePresets[venueType.value] || venuePresets.banquet;
  numTables.value = preset.tables;
  chairsPerTable.value = String(preset.chairs);
  tableShape.value = normalizeTableShape(preset.shape);
  venueHelp.textContent = preset.note;
}

function normalizeTableShape(shape) {
  if (typeof shape !== "string") return "round";
  const value = shape.trim().toLowerCase();
  if (value === "circle") return "round";
  if (value === "rectangular") return "rectangle";
  return TABLE_SHAPES[value] ? value : "round";
}

function getTableFootprint(chairs, shape) {
  const tableDia = TABLE_DIAMETER[chairs] || 1.5;
  const normalized = normalizeTableShape(shape);
  const baseFactor = TABLE_SHAPES[normalized]?.footprint || 1;

  switch (normalized) {
    case "square":
      return (tableDia * 1.15 + CLEARANCE * 2) * baseFactor;
    case "rectangle":
      return (tableDia * 1.6 + CLEARANCE * 2) * baseFactor;
    case "oval":
      return (tableDia * 1.45 + CLEARANCE * 2) * baseFactor;
    case "hexagon":
      return (tableDia * 1.3 + CLEARANCE * 2) * baseFactor;
    case "triangle":
      return (tableDia * 1.35 + CLEARANCE * 2) * baseFactor;
    default:
      return tableDia + CLEARANCE * 2;
  }
}

function computeFit() {
  const { length, width } = currentHallDims();
  const chairs = Number(chairsPerTable.value);
  const shape = normalizeTableShape(tableShape.value);
  const tableDia = TABLE_DIAMETER[chairs] || 1.5;
  const footprint = getTableFootprint(chairs, shape);

  const usableLength = Math.max(0, length - BORDER_MARGIN * 2);
  const usableWidth = Math.max(0, width - BORDER_MARGIN * 2);

  const cols = Math.max(0, Math.floor(usableLength / footprint));
  const rows = Math.max(0, Math.floor(usableWidth / footprint));
  const capacity = cols * rows;

  const requested = Math.max(0, Number(numTables.value) || 0);
  const fits = capacity >= requested && requested > 0;

  return { length, width, chairs, tableDia, footprint, cols, rows, capacity, requested, fits, shape };
}

function drawBlueprint(fit) {
  const { length, width, tableDia, footprint, cols, rows, requested } = fit;
  const W = canvas.width, H = canvas.height;
  const pad = 40;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#1B2430";
  ctx.fillRect(0, 0, W, H);

  const scale = Math.min((W - pad * 2) / length, (H - pad * 2) / width);
  const drawW = length * scale;
  const drawH = width * scale;
  const ox = (W - drawW) / 2;
  const oy = (H - drawH) / 2;

  // grid, every metre
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= length; x++) {
    ctx.beginPath();
    ctx.moveTo(ox + x * scale, oy);
    ctx.lineTo(ox + x * scale, oy + drawH);
    ctx.stroke();
  }
  for (let y = 0; y <= width; y++) {
    ctx.beginPath();
    ctx.moveTo(ox, oy + y * scale);
    ctx.lineTo(ox + drawW, oy + y * scale);
    ctx.stroke();
  }

  // hall outline
  ctx.strokeStyle = "#B8901F";
  ctx.lineWidth = 2;
  ctx.strokeRect(ox, oy, drawW, drawH);

  // window mark on the top wall
  if (windowView.value !== "none") {
    ctx.strokeStyle = "#7fb2d9";
    ctx.lineWidth = 4;
    const winW = Math.min(drawW * 0.3, 60);
    ctx.beginPath();
    ctx.moveTo(ox + drawW / 2 - winW / 2, oy);
    ctx.lineTo(ox + drawW / 2 + winW / 2, oy);
    ctx.stroke();
  }

  // tables + chairs, laid out in a grid, capped at what actually fits
  const toDraw = Math.min(requested, cols * rows);
  const tableRadiusPx = (tableDia / 2) * scale;
  const chairCount = fit.chairs;
  const shape = normalizeTableShape(tableShape.value);

  let placed = 0;
  for (let r = 0; r < rows && placed < toDraw; r++) {
    for (let c = 0; c < cols && placed < toDraw; c++) {
      const cx = ox + BORDER_MARGIN * scale + footprint * scale * c + (footprint / 2) * scale;
      const cy = oy + BORDER_MARGIN * scale + footprint * scale * r + (footprint / 2) * scale;

      // chairs
      ctx.fillStyle = "#6B2737";
      for (let i = 0; i < chairCount; i++) {
        const angle = (i / chairCount) * Math.PI * 2;
        const chx = cx + Math.cos(angle) * (tableRadiusPx + 8);
        const chy = cy + Math.sin(angle) * (tableRadiusPx + 8);
        ctx.beginPath();
        ctx.arc(chx, chy, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // table
      ctx.fillStyle = "rgba(184,144,31,0.18)";
      ctx.strokeStyle = "#D8CFBB";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (shape === "rectangle") {
        const rw = tableRadiusPx * 2.2, rh = tableRadiusPx * 1.25;
        ctx.rect(cx - rw / 2, cy - rh / 2, rw, rh);
      } else if (shape === "square") {
        const side = tableRadiusPx * 1.8;
        ctx.rect(cx - side / 2, cy - side / 2, side, side);
      } else if (shape === "oval") {
        ctx.ellipse(cx, cy, tableRadiusPx * 1.25, tableRadiusPx * 0.75, 0, 0, Math.PI * 2);
      } else if (shape === "hexagon") {
        const sides = 6;
        ctx.moveTo(cx + tableRadiusPx * Math.cos(0), cy + tableRadiusPx * Math.sin(0));
        for (let i = 1; i <= sides; i++) {
          const angle = (i / sides) * Math.PI * 2 - Math.PI / 6;
          ctx.lineTo(cx + tableRadiusPx * Math.cos(angle), cy + tableRadiusPx * Math.sin(angle));
        }
      } else if (shape === "triangle") {
        for (let i = 0; i < 3; i++) {
          const angle = (i / 3) * Math.PI * 2 + Math.PI / 6;
          const x = cx + Math.cos(angle) * tableRadiusPx;
          const y = cy + Math.sin(angle) * tableRadiusPx;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      } else {
        ctx.arc(cx, cy, tableRadiusPx, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();

      placed++;
    }
  }

  // overflow notice drawn on canvas if not everything fit
  if (requested > toDraw) {
    ctx.fillStyle = "#E7B7AE";
    ctx.font = "12px monospace";
    ctx.fillText(`+${requested - toDraw} tables don't fit`, ox + 8, oy + drawH - 10);
  }
}

function renderFit(fit) {
  fitDot.classList.remove("good", "bad");
  if (fit.requested === 0) {
    fitText.textContent = "Enter a number of tables to check the layout.";
  } else if (fit.fits) {
    fitDot.classList.add("good");
    fitText.textContent = `Fits — room for up to ${fit.capacity} tables at this size.`;
  } else {
    fitDot.classList.add("bad");
    fitText.textContent = `Doesn't fit — this hall only takes ${fit.capacity} tables of that size. Reduce tables, use fewer chairs per table, or choose a larger hall.`;
  }

  windowTag.textContent = windowLabels[windowView.value];

  const shapeLabel = TABLE_SHAPES[fit.shape]?.label || "Round / Circle";
  specList.innerHTML = `
    <div><dt>Space type</dt><dd>${venuePresets[venueType.value]?.label || "Banquet / event hall"}</dd></div>
    <div><dt>Hall</dt><dd>${fit.length}m × ${fit.width}m</dd></div>
    <div><dt>Area</dt><dd>${(fit.length * fit.width).toFixed(0)} m²</dd></div>
    <div><dt>Table shape</dt><dd>${shapeLabel}</dd></div>
    <div><dt>Table diameter</dt><dd>${fit.tableDia.toFixed(1)} m</dd></div>
    <div><dt>Footprint / table</dt><dd>${fit.footprint.toFixed(1)} m</dd></div>
    <div><dt>Grid</dt><dd>${fit.cols} × ${fit.rows}</dd></div>
    <div><dt>Requested</dt><dd>${fit.requested} tables</dd></div>
  `;
}

function refresh() {
  const fit = computeFit();
  drawBlueprint(fit);
  renderFit(fit);
  return fit;
}

// ---------- input wiring ----------
dimMode.addEventListener("change", () => {
  const isPreset = dimMode.value === "preset";
  presetRow.hidden = !isPreset;
  customRow.hidden = isPreset;
  refresh();
});
[venueType].forEach((input) => {
  input.addEventListener("change", () => {
    applyVenuePreset();
    refresh();
  });
});
[hallPreset, hallLength, hallWidth, windowView, numTables, chairsPerTable, tableShape].forEach((input) => {
  input.addEventListener("input", refresh);
  input.addEventListener("change", refresh);
});

// ---------- submission ----------
const form = el("planForm");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fit = computeFit();

  const custName = el("custName").value.trim();
  const custPhone = el("custPhone").value.trim();
  const custEmail = el("custEmail").value.trim();

  if (!custName || !custPhone || !custEmail) {
    saveNote.textContent = "Name, phone and email are required.";
    saveNote.classList.add("err");
    return;
  }

  const payload = {
    customerName: custName,
    phone: custPhone,
    email: custEmail,
    venueType: venueType.value,
    hall: { length: fit.length, width: fit.width },
    numTables: fit.requested,
    chairsPerTable: fit.chairs,
    tableShape: tableShape.value,
    eventDate: el("eventDate").value,
    remarks: el("remarks").value.trim(),
    windowView: windowView.value,
    fit: { ok: fit.fits, capacity: fit.capacity }
  };

  saveNote.classList.remove("err");
  saveNote.textContent = "Saving…";

  try {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Server responded with an error");
    const saved = await res.json();
    reqidField.value = saved.reqid;
    saveNote.textContent = `Saved as ${saved.reqid}`;
    saveNote.classList.remove("err");
    loadBookings();
  } catch (err) {
    saveNote.textContent = "Could not reach the server — start it with `node server.js`.";
    saveNote.classList.add("err");
  }
});

// ---------- bookings table ----------
async function loadBookings() {
  const body = el("bookingsBody");
  try {
    const res = await fetch("/api/bookings");
    if (!res.ok) throw new Error();
    const rows = await res.json();
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="7" class="empty-row">No requests saved yet.</td></tr>`;
      return;
    }
    body.innerHTML = rows.slice().reverse().map((b) => `
      <tr>
        <td>${b.reqid}</td>
        <td>${escapeHtml(b.customerName)}</td>
        <td>${b.eventDate || "—"}</td>
        <td>${escapeHtml(venuePresets[b.venueType]?.label || "Banquet / event hall")}</td>
        <td>${b.hall.length}×${b.hall.width}m</td>
        <td>${b.numTables}</td>
        <td>${b.fit && b.fit.ok ? "fits" : "over capacity"}</td>
      </tr>
    `).join("");
  } catch {
    // server not running yet — leave the placeholder row as-is
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// ---------- init ----------
setMinimumEventDate();
applyVenuePreset();
refresh();
loadBookings();

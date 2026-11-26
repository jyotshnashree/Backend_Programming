const bookingForm = document.getElementById('booking-form');
const customerNameInput = document.getElementById('customer-name');
const phoneNoInput = document.getElementById('phone-no');
const bookingDateInput = document.getElementById('booking-date');
const customerIdInput = document.getElementById('customer-id');
const remarksInput = document.getElementById('remarks');
const tableCountInput = document.getElementById('table-count');
const chairCountInput = document.getElementById('chair-count');
const resetBookingButton = document.getElementById('reset-booking-btn');
const bookingSummary = document.getElementById('booking-summary');
const customerIdPreview = document.getElementById('customer-id-preview');
const fitTitle = document.getElementById('fit-title');
const fitNote = document.getElementById('fit-note');
const layoutResults = document.getElementById('layout-results');
const savedBookingsList = document.getElementById('saved-bookings-list');

const hallCheckboxes = Array.from(document.querySelectorAll('input[name="hall-size"]'));
const HALL_SIZES = {
  small: { label: 'Small Hall', width: 10, height: 10, capacity: 4 },
  medium: { label: 'Medium Hall', width: 14, height: 12, capacity: 8 },
  large: { label: 'Large Hall', width: 20, height: 16, capacity: 14 },
};

const STORAGE_KEY = 'hotel-room-management-bookings';

function generateCustomerId() {
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `CUST-${Date.now().toString().slice(-6)}-${suffix}`;
}

function getSelectedHallSize() {
  const checked = hallCheckboxes.find(input => input.checked);
  return checked ? checked.value : 'small';
}

function setExclusiveHallSelection(selectedInput) {
  hallCheckboxes.forEach(input => {
    input.checked = input === selectedInput;
    input.closest('.choice-card').classList.toggle('is-selected', input.checked);
  });
}

function updateChoiceStyles() {
  hallCheckboxes.forEach(input => {
    input.closest('.choice-card').classList.toggle('is-selected', input.checked);
  });
}

function readStoredBookings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

function writeStoredBookings(bookings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

function renderBookingSummary(booking) {
  if (!booking) {
    bookingSummary.innerHTML = '<p>Fill the form and save the booking to store it in JSON.</p>';
    customerIdPreview.textContent = 'Will generate automatically';
    return;
  }

  bookingSummary.innerHTML = `
    <div><strong>Customer:</strong> ${booking.customerName}</div>
    <div><strong>Phone:</strong> ${booking.phoneNo}</div>
    <div><strong>Date:</strong> ${booking.date}</div>
    <div><strong>Hall:</strong> ${booking.hallSizeLabel}</div>
    <div><strong>Tables:</strong> ${booking.tables}</div>
    <div><strong>Chairs:</strong> ${booking.chairs}</div>
    <div><strong>Remarks:</strong> ${booking.remarks || 'No remarks'}</div>
  `;
  customerIdPreview.textContent = booking.customerId;
  customerIdInput.value = booking.customerId;
}

function updateLiveSummary() {
  const hallSize = getSelectedHallSize();
  if (!customerIdInput.value) {
    customerIdInput.value = generateCustomerId();
  }

  renderBookingSummary({
    customerName: customerNameInput.value.trim() || 'Customer name not entered',
    phoneNo: phoneNoInput.value.trim() || 'Phone no not entered',
    date: bookingDateInput.value || 'Date not chosen',
    hallSizeLabel: HALL_SIZES[hallSize].label,
    tables: tableCountInput.value || '1',
    chairs: chairCountInput.value || '4',
    remarks: remarksInput.value.trim(),
    customerId: customerIdInput.value,
  });
}

function buildLayoutPlan(layoutType, hall, tables, chairs) {
  const miniHallWidth = 100;
  const miniHallHeight = 70;
  const tableWidth = 18;
  const tableHeight = 12;
  const totalChairs = tables * chairs;
  const demand = (tables * 12) + (totalChairs * 2.2);
  const hallArea = hall.width * hall.height;

  const positions = [];

  if (layoutType === 'row') {
    const gap = Math.max(4, (miniHallWidth - tables * tableWidth) / (tables + 1));
    for (let i = 0; i < tables; i++) {
      positions.push({ left: gap + i * (tableWidth + gap), top: 28 });
    }
  } else if (layoutType === 'grid') {
    const columns = Math.ceil(Math.sqrt(tables));
    const rows = Math.ceil(tables / columns);
    const gapX = (miniHallWidth - columns * tableWidth) / (columns + 1);
    const gapY = (miniHallHeight - rows * tableHeight) / (rows + 1);
    for (let i = 0; i < tables; i++) {
      const row = Math.floor(i / columns);
      const column = i % columns;
      positions.push({
        left: gapX + column * (tableWidth + gapX),
        top: 10 + gapY + row * (tableHeight + gapY),
      });
    }
  } else {
    const edgePositions = [
      { left: 10, top: 6 },
      { left: 50, top: 6 },
      { left: 76, top: 26 },
      { left: 50, top: 46 },
      { left: 10, top: 46 },
      { left: 24, top: 26 },
    ];
    for (let i = 0; i < tables; i++) {
      positions.push(edgePositions[i % edgePositions.length]);
    }
  }

  const fit = hallArea >= demand * (layoutType === 'row' ? 4.5 : layoutType === 'grid' ? 4.0 : 3.5);

  return {
    layoutType,
    label: layoutType === 'row' ? 'Row Layout' : layoutType === 'grid' ? 'Grid Layout' : 'Perimeter Layout',
    fit,
    demand,
    hallArea,
    positions,
  };
}

function renderMiniHall(container, plan, chairs) {
  container.innerHTML = '';
  plan.positions.forEach(position => {
    const table = document.createElement('div');
    table.className = 'mini-table';
    table.style.left = `${position.left}%`;
    table.style.top = `${position.top}%`;
    container.appendChild(table);

    for (let i = 0; i < chairs; i++) {
      const angle = (Math.PI * 2 * i) / chairs - Math.PI / 2;
      const chair = document.createElement('span');
      chair.className = 'mini-chair';
      chair.style.left = `${position.left + 10 + Math.cos(angle) * 10}%`;
      chair.style.top = `${position.top + 6 + Math.sin(angle) * 10}%`;
      container.appendChild(chair);
    }
  });
}

function renderLayouts() {
  const hallSize = getSelectedHallSize();
  const hall = HALL_SIZES[hallSize];
  const tables = Number(tableCountInput.value) || 1;
  const chairs = Number(chairCountInput.value) || 4;
  const plans = ['row', 'grid', 'perimeter'].map(layoutType => buildLayoutPlan(layoutType, hall, tables, chairs));

  const possiblePlans = plans.filter(plan => plan.fit);
  const recommendedPlan = possiblePlans[0] || plans.reduce((best, plan) => (plan.demand < best.demand ? plan : best), plans[0]);

  if (possiblePlans.length === 0) {
    fitTitle.textContent = 'Booking needs adjustment';
    fitNote.textContent = 'No layout fits this booking as entered. Reduce tables/chairs or choose a larger hall.';
  } else if (possiblePlans.length === 1) {
    fitTitle.textContent = 'One layout fits';
    fitNote.textContent = 'Only one arrangement fits the current booking comfortably.';
  } else {
    fitTitle.textContent = 'Multiple layouts available';
    fitNote.textContent = 'The booking can fit in several arrangements. Pick the one you prefer before saving.';
  }

  layoutResults.innerHTML = '';
  plans.forEach(plan => {
    const card = document.createElement('article');
    card.className = `layout-card ${plan.fit ? 'layout-card--fit' : 'layout-card--warn'}`;
    card.innerHTML = `
      <div class="layout-card__header">
        <h3>${plan.label}</h3>
        <span class="layout-card__badge ${plan.fit ? 'layout-card__badge--fit' : 'layout-card__badge--warn'}">${plan.fit ? 'Fits' : 'Tight'}</span>
      </div>
      <div class="layout-card__body">
        <div>Hall capacity score: ${plan.hallArea.toFixed(0)}</div>
        <div>Space demand score: ${plan.demand.toFixed(1)}</div>
        <div>${plan.fit ? 'This arrangement is possible.' : 'This arrangement is not comfortable enough.'}</div>
      </div>
      <div class="mini-hall"></div>
    `;
    const miniHall = card.querySelector('.mini-hall');
    renderMiniHall(miniHall, plan, chairs);
    layoutResults.appendChild(card);
  });

  return { plans, possiblePlans, recommendedPlan };
}

function renderSavedBookings(bookings = readStoredBookings()) {
  savedBookingsList.innerHTML = '';

  if (bookings.length === 0) {
    savedBookingsList.innerHTML = '<p class="setting-note">No bookings saved yet.</p>';
    return;
  }

  bookings.slice().reverse().forEach(booking => {
    const card = document.createElement('article');
    const badgeClass = booking.layoutsPossible > 0 ? 'saved-booking__badge--fit' : 'saved-booking__badge--fail';
    card.className = 'saved-booking';
    card.innerHTML = `
      <div class="saved-booking__header">
        <h3>${booking.customerName}</h3>
        <span class="saved-booking__badge ${badgeClass}">${booking.layoutsPossible > 0 ? 'Saved' : 'Needs changes'}</span>
      </div>
      <div class="saved-booking__body">
        <div><strong>ID:</strong> ${booking.customerId}</div>
        <div><strong>Phone:</strong> ${booking.phoneNo}</div>
        <div><strong>Date:</strong> ${booking.date}</div>
        <div><strong>Hall:</strong> ${booking.hallSizeLabel}</div>
        <div><strong>Tables/Chairs:</strong> ${booking.tables} / ${booking.chairs}</div>
        <div><strong>Layouts fit:</strong> ${booking.layoutsPossible}</div>
      </div>
    `;
    savedBookingsList.appendChild(card);
  });
}

async function saveBooking(event) {
  event.preventDefault();

  const hallSize = getSelectedHallSize();
  const hall = HALL_SIZES[hallSize];
  const tables = Number(tableCountInput.value) || 1;
  const chairs = Number(chairCountInput.value) || 4;
  const layoutState = renderLayouts();
  const booking = {
    customerName: customerNameInput.value.trim(),
    phoneNo: phoneNoInput.value.trim(),
    hallSize,
    hallSizeLabel: hall.label,
    hallDimensions: `${hall.width} x ${hall.height}`,
    tables,
    chairs,
    date: bookingDateInput.value,
    customerId: customerIdInput.value || generateCustomerId(),
    remarks: remarksInput.value.trim(),
    layoutsPossible: layoutState.possiblePlans.length,
    recommendedLayout: layoutState.recommendedPlan ? layoutState.recommendedPlan.label : 'No fit',
  };

  const response = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(booking),
  });

  if (!response.ok) {
    alert('Booking could not be saved.');
    return;
  }

  const savedBooking = await response.json();
  const storedBookings = readStoredBookings();
  storedBookings.push(savedBooking);
  writeStoredBookings(storedBookings);
  customerIdInput.value = savedBooking.customerId;
  customerIdPreview.textContent = savedBooking.customerId;
  renderBookingSummary(savedBooking);
  renderSavedBookings(storedBookings);
}

function resetBooking() {
  bookingForm.reset();
  customerIdInput.value = generateCustomerId();
  setExclusiveHallSelection(hallCheckboxes[0]);
  updateLiveSummary();
  renderLayouts();
}

async function loadBookings() {
  customerIdInput.value = generateCustomerId();
  const response = await fetch('/api/bookings');
  if (response.ok) {
    const bookings = await response.json();
    writeStoredBookings(bookings);
    renderSavedBookings(bookings);
    if (bookings.length > 0) {
      renderBookingSummary(bookings[bookings.length - 1]);
      customerIdInput.value = bookings[bookings.length - 1].customerId;
      customerIdPreview.textContent = bookings[bookings.length - 1].customerId;
    }
  } else {
    renderSavedBookings();
  }
}

hallCheckboxes.forEach(input => {
  input.addEventListener('change', () => {
    if (input.checked) {
      setExclusiveHallSelection(input);
    } else {
      input.checked = true;
      setExclusiveHallSelection(input);
    }
    renderLayouts();
    updateLiveSummary();
  });
});

[customerNameInput, phoneNoInput, bookingDateInput, tableCountInput, chairCountInput, remarksInput].forEach(input => {
  input.addEventListener('input', () => {
    updateLiveSummary();
    renderLayouts();
  });
});

bookingForm.addEventListener('submit', saveBooking);
resetBookingButton.addEventListener('click', resetBooking);

customerIdInput.value = generateCustomerId();
updateChoiceStyles();
updateLiveSummary();
renderLayouts();
loadBookings();

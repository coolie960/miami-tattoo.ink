const SHOP_INFO = {
  name: "Miami Ink & Art Studio",
  address: "10990 Biscayne Blvd, Suite 10, Miami, FL 33161, United States",
  mapUrl:
    "https://www.google.com/maps/search/?api=1&query=10990+Biscayne+Blvd,+Suite+10,+Miami,+FL+33161,+United+States",
  email: "miamitatto817@gmail.com",
  depositAmount: 50.0,
};

const TATTOO_CATALOG = [
  { name: "Name Tattoo", price: 140.0 },
  { name: "Quarter Sleeve", price: 157.5 },
  { name: "Half Sleeve", price: 385.0 },
  { name: "Full Sleeve", price: 595.0 },
  { name: "Calf Piece", price: 700.0 },
  { name: "Half Leg Sleeve", price: 840.0 },
  { name: "Full Leg Sleeve", price: 1050.0 },
  { name: "Stomach Piece", price: 1330.0 },
  { name: "Neck Piece", price: 1400.0 },
  { name: "Spine Piece", price: 1540.0 },
  { name: "Half Chest Piece", price: 1750.0 },
  { name: "Thigh Piece", price: 1750.0 },
  { name: "Full Chest Piece", price: 2100.0 },
];

const TIME_SLOTS = ["11:00 AM", "1:30 PM", "4:00 PM", "6:30 PM"];
const STORAGE_KEY = "miami_ink_booked_slots_v1";

// Application State
let currentViewDate = new Date();
currentViewDate.setDate(1);

let selectedDateISO = null;
let selectedTime = null;
let attachedFiles = [];
let emailDispatched = false;
let confirmedReceiptData = null;

// Helpers
function formatUSD(amount) {
  return (
    "$" +
    Number(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function toISODate(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getStartOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getBookedSlots() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveBookedSlot(dateISO, timeSlot) {
  const booked = getBookedSlots();
  if (!booked[dateISO]) booked[dateISO] = [];
  if (!booked[dateISO].includes(timeSlot)) {
    booked[dateISO].push(timeSlot);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(booked));
}

// Initialize Catalog Dropdown
function initTattooSelect() {
  const select = document.getElementById("tattoo-type");
  TATTOO_CATALOG.forEach((item, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `${item.name} — ${formatUSD(item.price)}`;
    select.appendChild(option);
  });

  select.addEventListener("change", updateSummary);
}

// Render Visual Calendar (First 3 Days Occupied)
function renderCalendar() {
  const grid = document.getElementById("calendar-grid");
  const label = document.getElementById("calendar-month-label");
  grid.innerHTML = "";

  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();

  label.textContent = currentViewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = getStartOfToday();
  const firstAvailableDate = new Date(today);
  firstAvailableDate.setDate(today.getDate() + 3); // Days 0, 1, 2 are occupied

  // Auto-select earliest open date on initial load
  if (!selectedDateISO) {
    selectedDateISO = toISODate(firstAvailableDate);
  }

  for (let i = 0; i < firstDayOfWeek; i++) {
    const blank = document.createElement("div");
    blank.className = "cal-day empty";
    grid.appendChild(blank);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(year, month, day);
    const iso = toISODate(cellDate);
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cal-day";

    if (cellDate < today) {
      cell.classList.add("past");
      cell.textContent = day;
      cell.disabled = true;
    } else if (cellDate < firstAvailableDate) {
      cell.classList.add("occupied");
      cell.innerHTML = `<span>${day}</span><small>Occupied</small>`;
      cell.disabled = true;
    } else {
      cell.classList.add("available");
      cell.textContent = day;
      if (iso === selectedDateISO) {
        cell.classList.add("selected");
      }
      cell.addEventListener("click", () => {
        selectedDateISO = iso;
        selectedTime = null;
        renderCalendar();
        renderTimeSlots();
        updateSummary();
      });
    }

    grid.appendChild(cell);
  }
}

// Render Time Slots
function renderTimeSlots() {
  const container = document.getElementById("time-slots-grid");
  const dateDisplay = document.getElementById("selected-date-display");
  container.innerHTML = "";

  if (!selectedDateISO) {
    dateDisplay.textContent = "Select a date";
    return;
  }

  const [y, m, d] = selectedDateISO.split("-").map(Number);
  const readableDate = new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  dateDisplay.textContent = readableDate;

  const booked = getBookedSlots()[selectedDateISO] || [];

  TIME_SLOTS.forEach((slot) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "time-btn";
    const isBooked = booked.includes(slot);

    btn.textContent = isBooked ? `${slot} (Booked)` : slot;
    btn.disabled = isBooked;

    if (!isBooked && !selectedTime) {
      selectedTime = slot;
    }

    if (slot === selectedTime && !isBooked) {
      btn.classList.add("selected");
    }

    btn.addEventListener("click", () => {
      selectedTime = slot;
      renderTimeSlots();
      updateSummary();
    });

    container.appendChild(btn);
  });
}

// Reference Photos Upload & Mailto Dispatch
function initPhotoUpload() {
  const fileInput = document.getElementById("reference-photos");
  const previewGrid = document.getElementById("photo-preview-grid");
  const sendBtn = document.getElementById("send-email-btn");
  const statusBadge = document.getElementById("email-status-badge");

  fileInput.addEventListener("change", (e) => {
    attachedFiles = Array.from(e.target.files || []);
    previewGrid.innerHTML = "";

    attachedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = document.createElement("img");
        img.src = ev.target.result;
        img.alt = file.name;
        previewGrid.appendChild(img);
      };
      reader.readAsDataURL(file);
    });

    if (attachedFiles.length > 0) {
      sendBtn.disabled = false;
      statusBadge.textContent = `${attachedFiles.length} photo(s) attached. Click above to email ${SHOP_INFO.email}.`;
    } else {
      sendBtn.disabled = true;
      emailDispatched = false;
      statusBadge.textContent = "Waiting for photo upload...";
    }

    updateSummary();
  });

  sendBtn.addEventListener("click", () => {
    const tattoo = getSelectedTattoo();
    const clientName =
      document.getElementById("client-name").value.trim() || "Online Client";
    const fileNames = attachedFiles.map((f) => f.name).join(", ");

    const subject = encodeURIComponent(
      `Tattoo Reference Photos - ${clientName} (${tattoo.name})`
    );
    const body = encodeURIComponent(
      `Hello Miami Ink & Art Studio,\n\n` +
        `Name: ${clientName}\n` +
        `Tattoo Type: ${tattoo.name} (${formatUSD(tattoo.price)})\n` +
        `Preferred Date & Time: ${selectedDateISO || "TBD"} at ${ selectedTime || "TBD" }\n` +
        `Attached Reference Files: ${fileNames}\n\n` +
        `(Please ensure your reference images are attached to this email before sending.)`
    );

    window.location.href = `mailto:${SHOP_INFO.email}?subject=${subject}&body=${body}`;
    emailDispatched = true;
    statusBadge.textContent = `Email draft opened for ${SHOP_INFO.email} (${attachedFiles.length} file(s) ready).`;
    updateSummary();
  });
}

function getSelectedTattoo() {
  const idx = parseInt(document.getElementById("tattoo-type").value, 10) || 0;
  return TATTOO_CATALOG[idx];
}

// Update Summary & Unlock PayPal Button (Only Date & Time Required)
function updateSummary() {
  const tattoo = getSelectedTattoo();
  const balance = Math.max(0, tattoo.price - SHOP_INFO.depositAmount);
  const txId = document.getElementById("paypal-tx-id").value.trim();

  document.getElementById("summary-tattoo").textContent = tattoo.name;
  document.getElementById("summary-datetime").textContent =
    selectedDateISO && selectedTime
      ? `${selectedDateISO} • ${selectedTime}`
      : "Select date & time";
  document.getElementById("summary-photos").textContent =
    attachedFiles.length > 0 ? `${attachedFiles.length} attached` : "Optional";
  document.getElementById("summary-total").textContent = formatUSD(
    tattoo.price
  );
  document.getElementById("summary-balance").textContent = formatUSD(balance);

  const hasDateAndTime = Boolean(selectedDateISO) && Boolean(selectedTime);

  const gateMsg = document.getElementById("paypal-gate-message");
  const paypalWrapper = document.getElementById("paypal-wrapper");
  const confirmBtn = document.getElementById("confirm-booking-btn");

  if (hasDateAndTime) {
    gateMsg.style.display = "none";
    paypalWrapper.classList.remove("locked");
  } else {
    gateMsg.textContent =
      "Please select an appointment date and time to unlock the $50.00 PayPal checkout.";
    gateMsg.style.display = "block";
    paypalWrapper.classList.add("locked");
  }

  // Only Date, Time, and PayPal Transaction ID are required to confirm
  confirmBtn.disabled = !(hasDateAndTime && txId.length >= 4);
}

// Generate Downloadable PDF Receipt
function generatePDFReceipt(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFillColor(15, 15, 18);
  doc.rect(0, 0, 210, 40, "F");

  doc.setTextColor(212, 175, 55);
  doc.setFontSize(20);
  doc.text(SHOP_INFO.name.toUpperCase(), 14, 20);

  doc.setTextColor(230, 230, 230);
  doc.setFontSize(10);
  doc.text("OFFICIAL DEPOSIT & APPOINTMENT RECEIPT", 14, 29);

  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  let y = 54;

  const lines = [
    ["Booking ID:", data.bookingId],
    ["PayPal Transaction ID:", data.transactionId],
    ["Client Name:", data.clientName],
    ["Client Email:", data.clientEmail],
    ["Shop Name:", SHOP_INFO.name],
    ["Shop Location:", SHOP_INFO.address],
    ["Appointment Date & Time:", `${data.date} at ${data.time}`],
    ["Tattoo Type:", data.tattooName],
    ["Total Tattoo Price:", formatUSD(data.totalPrice)],
    ["Paid Deposit:", `${formatUSD(SHOP_INFO.depositAmount)} USD (PAID)`],
    ["Remaining Balance Due:", formatUSD(data.balanceDue)],
  ];

  lines.forEach(([label, val]) => {
    doc.setFont(undefined, "bold");
    doc.text(label, 14, y);
    doc.setFont(undefined, "normal");
    doc.text(String(val), 72, y);
    y += 10;
  });

  y += 6;
  doc.setTextColor(0, 102, 204);
  doc.textWithLink("Open Shop Location on Google Maps", 14, y, {
    url: SHOP_INFO.mapUrl,
  });

  doc.save(`Miami_Ink_Receipt_${data.bookingId}.pdf`);
}

// Initialize Live PayPal Hosted Button & Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  initTattooSelect();
  renderCalendar();
  renderTimeSlots();
  initPhotoUpload();
  updateSummary();

  // Render Live PayPal Hosted Button
  if (window.paypal && window.paypal.HostedButtons) {
    window.paypal
      .HostedButtons({
        hostedButtonId: "9CWF927DRN8KC",
      })
      .render("#paypal-container-9CWF927DRN8KC");
  }

  document.getElementById("prev-month-btn").addEventListener("click", () => {
    currentViewDate.setMonth(currentViewDate.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById("next-month-btn").addEventListener("click", () => {
    currentViewDate.setMonth(currentViewDate.getMonth() + 1);
    renderCalendar();
  });

  ["client-name", "client-email", "paypal-tx-id"].forEach((id) => {
    document.getElementById(id).addEventListener("input", updateSummary);
  });

  document
    .getElementById("confirm-booking-btn")
    .addEventListener("click", () => {
      const tattoo = getSelectedTattoo();
      const clientName =
        document.getElementById("client-name").value.trim() ||
        "Walk-In / Online Client";
      const clientEmail =
        document.getElementById("client-email").value.trim() || "Not provided";
      const transactionId = document
        .getElementById("paypal-tx-id")
        .value.trim();

      saveBookedSlot(selectedDateISO, selectedTime);

      confirmedReceiptData = {
        bookingId: "MIA-" + Date.now().toString().slice(-6),
        transactionId,
        clientName,
        clientEmail,
        date: selectedDateISO,
        time: selectedTime,
        tattooName: tattoo.name,
        totalPrice: tattoo.price,
        balanceDue: Math.max(0, tattoo.price - SHOP_INFO.depositAmount),
      };

      renderTimeSlots();
      document
        .getElementById("receipt-success-panel")
        .classList.remove("hidden");
      generatePDFReceipt(confirmedReceiptData);
    });

  document
    .getElementById("download-receipt-btn")
    .addEventListener("click", () => {
      if (confirmedReceiptData) {
        generatePDFReceipt(confirmedReceiptData);
      }
    });
});

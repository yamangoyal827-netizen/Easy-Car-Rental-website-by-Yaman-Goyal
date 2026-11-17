const KEY = "easyrentdata2";
const saved = JSON.parse(localStorage.getItem(KEY)) || {};

let vehicles = saved.vehicles || [
  { id: 1, name: "Maruti swift", type: "Hatchback", price: 1500, status: "Available", icon: "🚗" },
  { id: 2, name: "Hyundai i20", type: "Hatchback", price: 1700, status: "Available", icon: "🚙" },
  { id: 3, name: "Honda City", type: "Sedan", price: 2400, status: "Rented", icon: "🚘" },
  { id: 4, name: "Kia Seltos", type: "SUV", price: 3000, status: "Available", icon: "🚙" },
  { id: 5, name: "Tata Nexon EV", type: "Electric", price: 3100, status: "Available", icon: "⚡" },
  { id: 6, name: "Toyota Innova", type: "SUV", price: 3800, status: "Maintenance", icon: "🚐" }
];

let bookings = saved.bookings || [
  { id: 101, customer: "Aman Sharma", phone: "9876543210", carId: 3,
    pickup: "2026-10-18", returned: "2026-10-21", status: "Active",
    log: [{ status: "Confirmed", time: "17/10/2026, 6:00 pm" }, { status: "Active", time: "18/10/2026, 10:30 am" }] },
  { id: 102, customer: "Simran Kaur", phone: "9876501234", carId: 1,
    pickup: "2026-10-24", returned: "2026-10-26", status: "Confirmed",
    log: [{ status: "Confirmed", time: "20/10/2026, 11:15 am" }] }
];

let damageReports = saved.damageReports || [];
let nextCarId = saved.nextCarId || 7;
let nextBookingId = saved.nextBookingId || 103;

function save() {
  localStorage.setItem(KEY, JSON.stringify({ vehicles, bookings, damageReports, nextCarId, nextBookingId }));
  renderAll();
}


const byId = id => document.getElementById(id);
const now = () => new Date().toLocaleString("en-IN");
const carById = id => vehicles.find(car => car.id === Number(id));
const carName = id => (carById(id) ? carById(id).name : "Removed car");
const tag = text => `<span class="tag ${text.toLowerCase()}">${text}</span>`;
const money = amount => "₹" + Number(amount).toLocaleString("en-IN");


function safe(value) {
  return String(value).replace(/[&<>"']/g, ch =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function showMessage(id, message, good) {
  const box = byId(id);
  box.textContent = message;
  box.className = "notice show " + (good ? "good" : "bad");
}

function rentalDays(b) {
  return Math.max(1, Math.round((new Date(b.returned) - new Date(b.pickup)) / 86400000));
}

function table(head, rows, emptyText) {
  if (!rows.length) return `<p class="empty">${emptyText}</p>`;
  return `<table><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead>
          <tbody>${rows.join("")}</tbody></table>`;
}

function fillSelect(id, cars) {
  const select = byId(id);
  const keep = select.value;
  select.innerHTML = cars.map(c => `<option value="${c.id}">${safe(c.name)} - ${money(c.price)}/day</option>`).join("");
  if (keep && cars.some(c => c.id === Number(keep))) select.value = keep;
}


const titles = {
  dashboard: "Dashboard", vehicles: "Vehicles", reservations: "Reservations",
  history: "Rental History", track: "Track Rental", damage: "Damage Report"
};

function goTo(page) {
  document.querySelectorAll(".section").forEach(s => s.classList.toggle("active", s.id === page));
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  byId("pageTitle").textContent = titles[page];
}

document.querySelectorAll("nav button").forEach(b => b.addEventListener("click", () => goTo(b.dataset.page)));
document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => goTo(b.dataset.go)));


byId("showAddCar").addEventListener("click", () => { byId("addCarPanel").style.display = "block"; });
byId("cancelCar").addEventListener("click", () => { byId("addCarPanel").style.display = "none"; });
byId("vehicleSearch").addEventListener("input", renderVehicles);
byId("vehicleFilter").addEventListener("change", renderVehicles);

byId("carForm").addEventListener("submit", e => {
  e.preventDefault();
  vehicles.push({
    id: nextCarId++, name: byId("carName").value, type: byId("carType").value,
    price: Number(byId("carPrice").value), status: byId("carStatus").value, icon: "🚘"
  });
  e.target.reset();
  showMessage("carMessage", "Vehicle saved.", true);
  save();
});

function bookCar(id) {
  goTo("reservations");
  byId("bookingCar").value = id;
}


byId("bookingSearch").addEventListener("input", renderBookings);

byId("bookingForm").addEventListener("submit", e => {
  e.preventDefault();
  const carId = Number(byId("bookingCar").value);
  const pickup = byId("pickupDate").value;
  const returned = byId("returnDate").value;

  if (returned < pickup) {
    showMessage("bookingMessage", "Return date pickup date se pehle nahi ho sakti.", false);
    return;
  }
  
  const clash = bookings.some(b => b.carId === carId &&
    (b.status === "Confirmed" || b.status === "Active") &&
    pickup <= b.returned && returned >= b.pickup);
  if (clash) {
    showMessage("bookingMessage", "Ye car in dates par pehle se booked hai.", false);
    return;
  }

  const id = nextBookingId++;
  bookings.push({
    id, customer: byId("customerName").value, phone: byId("customerPhone").value,
    carId, pickup, returned, status: "Confirmed",
    log: [{ status: "Confirmed", time: now() }]
  });
  e.target.reset();
  showMessage("bookingMessage", "Reservation confirmed. Booking ID: #" + id, true);
  save();
});


function changeStatus(id, status) {
  const b = bookings.find(x => x.id === id);
  b.status = status;
  b.log.push({ status, time: now() });

  const car = carById(b.carId);
  if (car) {
    if (status === "Active") car.status = "Rented";
    if ((status === "Completed" || status === "Cancelled") && car.status === "Rented") car.status = "Available";
  }
  save();
}

function trackBooking(id) {
  goTo("track");
  byId("trackSelect").value = id;
  renderTrack();
}

byId("trackSelect").addEventListener("change", renderTrack);

function renderTrack() {
  const select = byId("trackSelect");
  const keep = select.value;
  select.innerHTML = bookings.map(b =>
    `<option value="${b.id}">#${b.id} - ${safe(b.customer)} (${safe(carName(b.carId))})</option>`).join("");
  if (keep && bookings.some(b => b.id === Number(keep))) select.value = keep;

  const b = bookings.find(x => x.id === Number(select.value));
  if (!b) {
    byId("trackView").innerHTML = '<p class="empty">No bookings to track yet.</p>';
    return;
  }

  const steps = [["Confirmed", "Reserved"], ["Active", "Picked up"], ["Completed", "Returned"]];
  const current = steps.findIndex(s => s[0] === b.status);
  const stepsHtml = steps.map((s, i) =>
    `<div class="step ${current >= i ? "done" : ""}">${s[1]}</div>`).join("");

  let buttons = "";
  if (b.status === "Confirmed") {
    buttons = `<button class="btn yellow" onclick="changeStatus(${b.id}, 'Active')">Car picked up</button>
               <button class="btn light" onclick="changeStatus(${b.id}, 'Cancelled')">Cancel booking</button>`;
  } else if (b.status === "Active") {
    buttons = `<button class="btn" onclick="changeStatus(${b.id}, 'Completed')">Car returned</button>`;
  }

  byId("trackView").innerHTML = `
    ${b.status === "Cancelled" ? '<div class="notice show bad">This booking was cancelled.</div>' : '<div class="steps">' + stepsHtml + "</div>"}
    <p><b>${safe(b.customer)}</b> (${safe(b.phone)}) | ${safe(carName(b.carId))}<br>
       ${b.pickup} to ${b.returned} | ${tag(b.status)}</p>
    <div class="form-actions">${buttons}</div>
    <ul class="log">${b.log.map(l => `<li>${tag(l.status)} ${l.time}</li>`).join("")}</ul>`;
}


byId("damageForm").addEventListener("submit", e => {
  e.preventDefault();
  damageReports.push({
    id: Date.now(), carId: Number(byId("damageCar").value),
    date: byId("damageDate").value, details: byId("damageDetails").value
  });
  e.target.reset();
  showMessage("damageMessage", "Damage report submitted.", true);
  save();
});


byId("resetData").addEventListener("click", () => {
  if (confirm("Saara saved data delete ho jayega. Continue?")) {
    localStorage.removeItem(KEY);
    location.reload();
  }
});


function renderDashboard() {
  byId("totalCars").textContent = vehicles.length;
  byId("availableCars").textContent = vehicles.filter(c => c.status === "Available").length;
  byId("activeRentals").textContent = bookings.filter(b => b.status === "Active").length;
  byId("totalBookings").textContent = bookings.length;

  const recent = bookings.slice(-5).reverse().map(b =>
    `<tr><td>${safe(b.customer)}</td><td>${safe(carName(b.carId))}</td>
     <td>${b.pickup} to ${b.returned}</td><td>${tag(b.status)}</td></tr>`);
  byId("recentActivity").innerHTML = table(["Customer", "Vehicle", "Dates", "Status"], recent, "No rentals yet.");
}

function renderVehicles() {
  const q = byId("vehicleSearch").value.toLowerCase();
  const f = byId("vehicleFilter").value;
  const shown = vehicles.filter(c =>
    (c.name + " " + c.type).toLowerCase().includes(q) && (f === "All" || c.status === f));

  byId("vehicleGrid").innerHTML = shown.length ? shown.map(c => `
    <div class="car-card">
      <div class="car-top">${c.icon}</div>
      <div class="car-info">
        <h3>${safe(c.name)}</h3>
        <p class="muted">${safe(c.type)}</p>
        ${tag(c.status)}
        <div class="car-bottom">
          <span class="price">${money(c.price)} / day</span>
          <button class="btn small-btn" ${c.status === "Available" ? "" : "disabled"}
            onclick="bookCar(${c.id})">Book</button>
        </div>
      </div>
    </div>`).join("") : '<p class="empty">No vehicles found.</p>';
}

function renderBookings() {
  const q = byId("bookingSearch").value.toLowerCase();
  const rows = bookings
    .filter(b => (b.customer + " " + carName(b.carId)).toLowerCase().includes(q))
    .reverse()
    .map(b => `<tr><td>#${b.id}</td><td>${safe(b.customer)}</td><td>${safe(b.phone)}</td>
      <td>${safe(carName(b.carId))}</td><td>${b.pickup} to ${b.returned}</td><td>${tag(b.status)}</td></tr>`);
  byId("bookingTable").innerHTML = table(["ID", "Customer", "Phone", "Vehicle", "Dates", "Status"], rows, "No reservations found.");
}

function renderHistory() {
  const rows = bookings.slice().reverse().map(b => {
    const car = carById(b.carId);
    const total = car ? money(car.price * rentalDays(b)) : "-";
    return `<tr><td>#${b.id}</td><td>${safe(b.customer)}</td><td>${safe(carName(b.carId))}</td>
      <td>${b.pickup} to ${b.returned}</td><td>${total}</td><td>${tag(b.status)}</td>
      <td><button class="btn small-btn" onclick="trackBooking(${b.id})">Track</button></td></tr>`;
  });
  byId("historyTable").innerHTML = table(["ID", "Customer", "Vehicle", "Dates", "Total", "Status", ""], rows, "No rental history yet.");
}

function renderDamage() {
  const rows = damageReports.slice().reverse().map(d =>
    `<tr><td>${safe(carName(d.carId))}</td><td>${d.date}</td><td>${safe(d.details)}</td></tr>`);
  byId("damageTable").innerHTML = table(["Vehicle", "Date", "Details"], rows, "No damage reports yet.");
}

function renderAll() {
  renderDashboard();
  renderVehicles();
  fillSelect("bookingCar", vehicles.filter(c => c.status !== "Maintenance"));
  fillSelect("damageCar", vehicles);
  renderBookings();
  renderHistory();
  renderTrack();
  renderDamage();
}

renderAll();
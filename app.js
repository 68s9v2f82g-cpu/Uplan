const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const storageKey = "brown-schedule-studio-v2";
const campusLocations = [
  { name: "Main Green", lat: 41.8263, lon: -71.4036 },
  { name: "CIT", lat: 41.8270, lon: -71.4017 },
  { name: "Salomon Center", lat: 41.8266, lon: -71.4038 },
  { name: "Sayles Hall", lat: 41.8262, lon: -71.4039 },
  { name: "MacMillan Hall", lat: 41.8253, lon: -71.4022 },
  { name: "Sciences Library", lat: 41.8265, lon: -71.4011 },
  { name: "Rockefeller Library", lat: 41.8269, lon: -71.4026 },
  { name: "List Art Center", lat: 41.8260, lon: -71.4019 },
  { name: "Friedman Hall", lat: 41.8268, lon: -71.4033 },
  { name: "Wilson Hall", lat: 41.8265, lon: -71.4036 },
  { name: "Metcalf Research Building", lat: 41.8271, lon: -71.4014 },
  { name: "Kassar House", lat: 41.8256, lon: -71.4035 },
  { name: "Granoff Center", lat: 41.8243, lon: -71.4007 },
  { name: "Pembroke Hall", lat: 41.8291, lon: -71.4029 },
  { name: "Nelson Fitness Center", lat: 41.8292, lon: -71.3989 }
];
const diningHalls = [
  { name: "Sharpe Refectory", nickname: "The Ratty", type: "Dining hall" },
  { name: "Verney-Woolley", nickname: "V-Dub", type: "Dining hall" },
  { name: "Andrews Commons", nickname: "Andrews", type: "Dining hall" },
  { name: "Ivy Room", nickname: "Ivy Room", type: "Cafe / retail" },
  { name: "Josiah's", nickname: "Jo's", type: "Late-night / retail" },
  { name: "Blue Room", nickname: "Blue Room", type: "Cafe / retail" }
];
const brownMenusUrl = "https://dining.brown.edu/cafes-markets-restaurants/menus";

const mapBounds = {
  minLat: 41.8238,
  maxLat: 41.8297,
  minLon: -71.4050,
  maxLon: -71.3984
};

let selectedClassId = null;
let userPosition = null;
let calendarCursor = startOfMonth(new Date());
let selectedDate = toDateInput(new Date());

const emptyState = {
  classes: [],
  homework: [],
  gym: [],
  nutritionNote: ""
};

let state = loadState();

const els = {
  todayLabel: document.querySelector("#todayLabel"),
  nextUp: document.querySelector("#nextUp"),
  homeworkList: document.querySelector("#homeworkList"),
  calendarTitle: document.querySelector("#calendarTitle"),
  calendarGrid: document.querySelector("#calendarGrid"),
  selectedDayAgenda: document.querySelector("#selectedDayAgenda"),
  classRoster: document.querySelector("#classRoster"),
  brownLocations: document.querySelector("#brownLocations"),
  classForm: document.querySelector("#classForm"),
  homeworkForm: document.querySelector("#homeworkForm"),
  gymForm: document.querySelector("#gymForm"),
  diningMenus: document.querySelector("#diningMenus"),
  saveNutritionNote: document.querySelector("#saveNutritionNote"),
  resetDemo: document.querySelector("#resetDemo"),
  prevMonth: document.querySelector("#prevMonth"),
  todayButton: document.querySelector("#todayButton"),
  nextMonth: document.querySelector("#nextMonth"),
  campusMap: document.querySelector("#campusMap"),
  currentLocation: document.querySelector("#currentLocation"),
  useMyLocation: document.querySelector("#useMyLocation"),
  mapBuildings: document.querySelector("#mapBuildings"),
  mapRoute: document.querySelector("#mapRoute"),
  mapPins: document.querySelector("#mapPins"),
  currentPin: document.querySelector("#currentPin"),
  mapDetails: document.querySelector("#mapDetails")
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(emptyState);

  try {
    const parsed = JSON.parse(saved);
    return {
      classes: Array.isArray(parsed.classes) ? parsed.classes : [],
      homework: Array.isArray(parsed.homework) ? parsed.homework : [],
      gym: Array.isArray(parsed.gym) ? parsed.gym : [],
      nutritionNote: typeof parsed.nutritionNote === "string" ? parsed.nutritionNote : ""
    };
  } catch {
    return structuredClone(emptyState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromInput(input) {
  return new Date(`${input}T12:00:00`);
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTimeRange(start, end) {
  return `${formatTime(start)}-${formatTime(end)}`;
}

function formatTime(time) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDate(input) {
  const date = new Date(`${input}T12:00:00`);
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function priorityRank(priority) {
  return { High: 0, Medium: 1, Low: 2 }[priority] ?? 3;
}

function classById(id) {
  return state.classes.find((item) => item.id === id);
}

function fillCampusLocationControls() {
  const options = campusLocations.map((place) => `<option value="${escapeHtml(place.name)}">${escapeHtml(place.name)}</option>`).join("");
  els.currentLocation.innerHTML = options;
  els.currentLocation.value = "Main Green";
  els.brownLocations.innerHTML = options;
}

function fillDaySelects() {
  document.querySelectorAll('select[name="day"]').forEach((select) => {
    select.innerHTML = days.map((day) => `<option>${day}</option>`).join("");
  });
}

function refreshHomeworkClassOptions() {
  const select = els.homeworkForm.elements.classId;
  if (!state.classes.length) {
    select.innerHTML = '<option value="">Add a class first</option>';
    select.disabled = true;
    return;
  }

  select.disabled = false;
  select.innerHTML = state.classes.map((course) => `<option value="${course.id}">${escapeHtml(course.name)}</option>`).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function render() {
  saveState();
  refreshHomeworkClassOptions();
  renderToday();
  renderHomework();
  renderCalendar();
  renderDiningMenus();
  renderMap();
  renderRoster();
}

function renderToday() {
  const now = new Date();
  const todayName = days[now.getDay() - 1] || "Monday";
  els.todayLabel.textContent = now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });

  const events = [
    ...state.classes.map((course) => ({ ...course, kind: "Class", accent: course.color })),
    ...state.gym.map((workout) => ({ ...workout, kind: "Gym", accent: "#236b5a" }))
  ]
    .filter((event) => event.day === todayName)
    .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const upcoming = events.filter((event) => timeToMinutes(event.end) >= currentMinutes).slice(0, 3);
  const list = upcoming.length ? upcoming : events.slice(0, 3);

  els.nextUp.innerHTML = list.length
    ? list.map((event) => `
      <div class="event-card" style="--accent:${event.accent}">
        <strong>${escapeHtml(event.name)}</strong>
        <p class="meta">${event.kind} · ${formatTimeRange(event.start, event.end)} · ${escapeHtml(event.location || "No location")}</p>
      </div>
    `).join("")
    : '<div class="empty-state">Add your classes or fitness blocks to see what is next today.</div>';
}

function renderHomework() {
  const upcoming = [...state.homework]
    .filter((task) => !task.done)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || priorityRank(a.priority) - priorityRank(b.priority));

  els.homeworkList.innerHTML = upcoming.length
    ? upcoming.map((task) => {
      const course = classById(task.classId);
      return `
        <div class="homework-card" style="--accent:${course?.color || "#5c4a72"}">
          <strong>${escapeHtml(task.title)}</strong>
          <p class="meta">${escapeHtml(course?.name || "Class removed")} · Due ${formatDate(task.dueDate)} · ${task.priority}</p>
          <button class="danger-button" type="button" data-action="done-homework" data-id="${task.id}">Mark done</button>
        </div>
      `;
    }).join("")
    : '<div class="empty-state">Add homework from the Homework tab to track what is due.</div>';
}

function renderDiningMenus() {
  if (!els.diningMenus) return;
  els.diningMenus.innerHTML = diningHalls.map((hall) => `
    <article class="dining-card">
      <div>
        <strong>${escapeHtml(hall.nickname)}</strong>
        <p class="meta">${escapeHtml(hall.name)} · ${escapeHtml(hall.type)}</p>
      </div>
      <a href="${brownMenusUrl}" target="_blank" rel="noreferrer">Open menu</a>
    </article>
  `).join("");
  els.gymForm.elements.nutritionNote.value = state.nutritionNote || "";
}

function renderCalendar() {
  const monthStart = startOfMonth(calendarCursor);
  const firstCell = new Date(monthStart);
  firstCell.setDate(firstCell.getDate() - firstCell.getDay());
  const todayKey = toDateInput(new Date());

  els.calendarTitle.textContent = monthStart.toLocaleDateString([], { month: "long", year: "numeric" });

  const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  const header = weekdayLabels.map((label) => `<div class="calendar-weekday">${label}</div>`).join("");
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCell);
    date.setDate(firstCell.getDate() + index);
    const dateKey = toDateInput(date);
    const events = eventsForDate(dateKey);
    const outside = date.getMonth() !== monthStart.getMonth();
    const selected = dateKey === selectedDate;
    const today = dateKey === todayKey;

    return `
      <button class="calendar-day ${outside ? "outside-month" : ""} ${selected ? "selected" : ""} ${today ? "today" : ""}" type="button" data-action="select-date" data-date="${dateKey}">
        <span class="date-number">${date.getDate()}</span>
        <span class="calendar-dots" aria-label="${events.length} items">${events.slice(0, 4).map((event) => `<i style="background:${event.accent}"></i>`).join("")}</span>
      </button>
    `;
  }).join("");

  els.calendarGrid.innerHTML = header + cells;
  renderSelectedDayAgenda();
}

function scheduleItem(event) {
  const action = event.kind === "class" ? "delete-class" : event.kind === "gym" ? "delete-gym" : "done-homework";
  return `
    <div class="schedule-item" data-kind="${event.kind}" style="--accent:${event.accent}">
      <span class="item-kind">${event.kind}</span>
      <strong>${escapeHtml(event.title)}</strong>
      <span class="meta">${escapeHtml(event.meta)}</span>
      <button class="delete-mini" type="button" aria-label="Remove ${escapeHtml(event.title)}" data-action="${action}" data-id="${event.id}">×</button>
    </div>
  `;
}

function dayFromDate(input) {
  const date = dateFromInput(input);
  return days[date.getDay() - 1] || "";
}

function eventsForDate(dateKey) {
  const dayName = dayFromDate(dateKey);
  const classEvents = state.classes
    .filter((course) => course.day === dayName)
    .map((course) => ({ id: course.id, title: course.name, meta: `${formatTimeRange(course.start, course.end)} · ${course.location || "No location"}`, start: course.start, kind: "class", accent: course.color }));

  const gymEvents = state.gym
    .filter((workout) => workout.day === dayName)
    .map((workout) => ({ id: workout.id, title: workout.name, meta: `${formatTimeRange(workout.start, workout.end)} · ${workout.location || "Gym"}`, start: workout.start, kind: "gym", accent: "#b3202a" }));

  const homeworkEvents = state.homework
    .filter((task) => !task.done && task.dueDate === dateKey)
    .map((task) => {
      const course = classById(task.classId);
      return { id: task.id, title: task.title, meta: `Due · ${course?.name || "Class removed"} · ${task.priority}`, start: "23:59", kind: "homework", accent: course?.color || "#5c4a72" };
    });

  return [...classEvents, ...gymEvents, ...homeworkEvents].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
}

function renderSelectedDayAgenda() {
  const selected = dateFromInput(selectedDate);
  const events = eventsForDate(selectedDate);
  els.selectedDayAgenda.innerHTML = `
    <div>
      <p class="eyebrow">${selected.toLocaleDateString([], { weekday: "long" })}</p>
      <h3>${selected.toLocaleDateString([], { month: "long", day: "numeric" })}</h3>
    </div>
    <div class="selected-events">
      ${events.length ? events.map(scheduleItem).join("") : '<div class="empty-state">Nothing scheduled for this day.</div>'}
    </div>
  `;
}

function normalizeLocation(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b(room|hall|building|center|centre)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function findCampusLocation(value) {
  const normalized = normalizeLocation(value);
  if (!normalized) return null;
  return campusLocations.find((place) => {
    const placeKey = normalizeLocation(place.name);
    return normalized.includes(placeKey) || placeKey.includes(normalized);
  }) || null;
}

function getCurrentOrigin() {
  if (userPosition) return userPosition;
  return campusLocations.find((place) => place.name === els.currentLocation.value) || campusLocations[0];
}

function mapPosition(place) {
  const lonSpan = mapBounds.maxLon - mapBounds.minLon;
  const latSpan = mapBounds.maxLat - mapBounds.minLat;
  const x = Math.min(95, Math.max(5, 8 + ((place.lon - mapBounds.minLon) / lonSpan) * 84));
  const y = Math.min(95, Math.max(5, 8 + ((mapBounds.maxLat - place.lat) / latSpan) * 84));
  return { x, y };
}

function distanceFeet(from, to) {
  const earthFeet = 20902231;
  const toRad = (value) => value * Math.PI / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthFeet * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(feet) {
  if (feet >= 528) return `${(feet / 5280).toFixed(2)} mi`;
  return `${Math.round(feet)} ft`;
}

function formatWalkTime(feet) {
  return `${Math.max(1, Math.round(feet / 264))} min`;
}

function classHomework(courseId) {
  return state.homework
    .filter((task) => !task.done && task.classId === courseId)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || priorityRank(a.priority) - priorityRank(b.priority));
}

function renderMap() {
  const mappedClasses = state.classes
    .map((course) => ({ course, place: findCampusLocation(course.location) }))
    .filter((item) => item.place);
  const unmappedClasses = state.classes.filter((course) => !findCampusLocation(course.location));

  if (!selectedClassId || !mappedClasses.some((item) => item.course.id === selectedClassId)) {
    selectedClassId = mappedClasses[0]?.course.id || null;
  }

  els.mapPins.innerHTML = mappedClasses.map(({ course, place }) => {
    const position = mapPosition(place);
    return `
      <button class="map-pin ${course.id === selectedClassId ? "active" : ""}" type="button" style="left:${position.x}%; top:${position.y}%; --accent:${course.color}" data-action="select-map-class" data-id="${course.id}" aria-label="${escapeHtml(course.name)} at ${escapeHtml(place.name)}">
        <span>${escapeHtml(course.name.slice(0, 2).toUpperCase())}</span>
      </button>
    `;
  }).join("");

  const origin = getCurrentOrigin();
  const originPosition = mapPosition(origin);
  els.currentPin.style.left = `${originPosition.x}%`;
  els.currentPin.style.top = `${originPosition.y}%`;
  els.currentPin.hidden = !userPosition;
  els.currentPin.textContent = userPosition ? "You" : "";

  renderMapBuildings(mappedClasses);
  renderMapRoute(mappedClasses, originPosition);
  renderMapDetails(mappedClasses, unmappedClasses, origin);
}

function renderMapBuildings(mappedClasses) {
  const classPlaces = new Map(mappedClasses.map(({ place }) => [place.name, place]));
  const selected = mappedClasses.find((item) => item.course.id === selectedClassId) || mappedClasses[0];
  els.mapBuildings.innerHTML = [...classPlaces.values()].map((place) => {
    const position = mapPosition(place);
    return `
      <div class="map-building major ${selected?.place.name === place.name ? "selected-building" : ""}" style="left:${position.x}%; top:${position.y}%;">
        ${escapeHtml(place.name)}
      </div>
    `;
  }).join("");
}

function renderMapRoute(mappedClasses, originPosition) {
  const selected = mappedClasses.find((item) => item.course.id === selectedClassId) || mappedClasses[0];
  if (!selected) {
    els.mapRoute.hidden = true;
    return;
  }

  const targetPosition = mapPosition(selected.place);
  const dx = targetPosition.x - originPosition.x;
  const dy = targetPosition.y - originPosition.y;
  const length = Math.sqrt(dx ** 2 + dy ** 2);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  els.mapRoute.hidden = false;
  els.mapRoute.style.left = `${originPosition.x}%`;
  els.mapRoute.style.top = `${originPosition.y}%`;
  els.mapRoute.style.width = `${length}%`;
  els.mapRoute.style.rotate = `${angle}deg`;
}

function renderMapDetails(mappedClasses, unmappedClasses, origin) {
  if (!mappedClasses.length) {
    els.mapDetails.innerHTML = `
      <div class="empty-state">Add classes with Brown building names to place them on the map.</div>
    `;
    return;
  }

  const selected = mappedClasses.find((item) => item.course.id === selectedClassId) || mappedClasses[0];
  const { course, place } = selected;
  const feet = distanceFeet(origin, place);
  const homework = classHomework(course.id);

  els.mapDetails.innerHTML = `
    <div>
      <p class="eyebrow">${escapeHtml(place.name)}</p>
      <h3>${escapeHtml(course.name)}</h3>
      <p class="meta">${course.day} · ${formatTimeRange(course.start, course.end)}</p>
    </div>
    <div class="distance-readout">
      <div class="distance-card">
        <span class="meta">Away from ${escapeHtml(userPosition ? "your location" : origin.name)}</span>
        <strong>${formatDistance(feet)}</strong>
      </div>
      <div class="distance-card">
        <span class="meta">Estimated walk</span>
        <strong>${formatWalkTime(feet)}</strong>
      </div>
    </div>
    <div>
      <p class="eyebrow">Homework</p>
      ${homework.length ? `
        <ul class="detail-list">
          ${homework.map((task) => `<li><strong>${escapeHtml(task.title)}</strong><p class="meta">Due ${formatDate(task.dueDate)} · ${task.priority}</p></li>`).join("")}
        </ul>
      ` : '<div class="empty-state">No open homework for this class.</div>'}
    </div>
    ${unmappedClasses.length ? `<p class="unmapped-list">Not mapped yet: ${unmappedClasses.map((item) => escapeHtml(item.name)).join(", ")}. Use a known Brown building name in Location.</p>` : ""}
  `;
}

function renderRoster() {
  els.classRoster.innerHTML = state.classes.length
    ? state.classes.map((course) => `
      <div class="class-card" style="--accent:${course.color}">
        <strong>${escapeHtml(course.name)}</strong>
        <p class="meta">${course.day} · ${formatTimeRange(course.start, course.end)} · ${escapeHtml(course.location || "No location")}</p>
        <button class="danger-button" type="button" data-action="delete-class" data-id="${course.id}">Remove</button>
      </div>
    `).join("")
    : '<div class="empty-state">Add your Brown classes to start building your planner.</div>';
}

function handleForm(form, builder) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const item = builder(data);
    if (!item) return;
    form.reset();
    form.querySelector('input[type="time"]')?.dispatchEvent(new Event("change"));
    render();
  });
}

function isValidTimeRange(start, end) {
  return timeToMinutes(end) > timeToMinutes(start);
}

function wireEvents() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach((tab) => tab.classList.toggle("active", tab === button));
      document.querySelectorAll(".entry-form").forEach((form) => form.classList.toggle("active", form.dataset.form === button.dataset.tab));
    });
  });

  document.querySelectorAll(".fitness-switch-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".fitness-switch-button").forEach((tab) => tab.classList.toggle("active", tab === button));
      document.querySelectorAll(".fitness-panel").forEach((panel) => panel.classList.toggle("active", panel.dataset.fitnessPanel === button.dataset.fitnessTab));
    });
  });

  handleForm(els.classForm, (data) => {
    if (!isValidTimeRange(data.start, data.end)) return alert("End time needs to be after start time.");
    state.classes.push({ id: crypto.randomUUID(), ...data });
    return true;
  });

  handleForm(els.homeworkForm, (data) => {
    if (!data.classId) return alert("Add a class before adding homework.");
    state.homework.push({ id: crypto.randomUUID(), ...data, done: false });
    return true;
  });

  handleForm(els.gymForm, (data) => {
    if (!isValidTimeRange(data.start, data.end)) return alert("End time needs to be after start time.");
    state.gym.push({ id: crypto.randomUUID(), ...data });
    return true;
  });

  els.saveNutritionNote.addEventListener("click", () => {
    state.nutritionNote = els.gymForm.elements.nutritionNote.value.trim();
    saveState();
    els.saveNutritionNote.textContent = "Saved";
    window.setTimeout(() => {
      els.saveNutritionNote.textContent = "Save note";
    }, 1200);
  });

  document.body.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const { action, id } = button.dataset;

    if (action === "select-date") {
      selectedDate = button.dataset.date;
      calendarCursor = startOfMonth(dateFromInput(selectedDate));
      renderCalendar();
      return;
    }
    if (action === "select-map-class") selectedClassId = id;
    if (action === "delete-class") {
      state.classes = state.classes.filter((item) => item.id !== id);
      state.homework = state.homework.filter((item) => item.classId !== id);
      if (selectedClassId === id) selectedClassId = null;
    }
    if (action === "delete-gym") state.gym = state.gym.filter((item) => item.id !== id);
    if (action === "done-homework") {
      state.homework = state.homework.map((item) => item.id === id ? { ...item, done: true } : item);
    }
    render();
  });

  els.resetDemo.addEventListener("click", () => {
    if (!confirm("Clear all classes, homework, fitness blocks, and nutrition notes?")) return;
    localStorage.removeItem(storageKey);
    state = structuredClone(emptyState);
    selectedClassId = null;
    userPosition = null;
    calendarCursor = startOfMonth(new Date());
    selectedDate = toDateInput(new Date());
    render();
  });

  els.prevMonth.addEventListener("click", () => {
    calendarCursor = addMonths(calendarCursor, -1);
    renderCalendar();
  });

  els.nextMonth.addEventListener("click", () => {
    calendarCursor = addMonths(calendarCursor, 1);
    renderCalendar();
  });

  els.todayButton.addEventListener("click", () => {
    selectedDate = toDateInput(new Date());
    calendarCursor = startOfMonth(new Date());
    renderCalendar();
  });

  els.currentLocation.addEventListener("change", () => {
    userPosition = null;
    renderMap();
  });

  els.useMyLocation.addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("Your browser does not support location sharing.");
      return;
    }

    els.useMyLocation.textContent = "Locating...";
    navigator.geolocation.getCurrentPosition((position) => {
      userPosition = {
        name: "Your location",
        lat: position.coords.latitude,
        lon: position.coords.longitude
      };
      els.useMyLocation.textContent = "Use my location";
      renderMap();
    }, () => {
      els.useMyLocation.textContent = "Use my location";
      alert("I could not get your location. You can still choose a starting point.");
    }, { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 });
  });
}

fillCampusLocationControls();
fillDaySelects();
els.homeworkForm.elements.dueDate.value = toDateInput(new Date());
wireEvents();
render();

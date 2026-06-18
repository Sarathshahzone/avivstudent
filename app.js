// --- GOOGLE SHEETS COLUMN CONFIGURATION ---
// Specify the column indexes (0-based: 0 is A, 1 is B, 2 is C, etc.) if your future sheet is a raw CSV:
const COLUMN_MAPPINGS = {
  nameIndex: 2,    // Student Name column (Column C)
  dateIndex: 0,    // Date column (Column A)
  statusIndex: 3   // Attendance Status column (Column D)
};

// Default Google Apps Script URL
const DEFAULT_SHEET_URL = 'https://script.google.com/macros/s/AKfycbypSdHO4fv7J9rg-ZZK5w8H4v4r4Qa8vXO35kIadzXxe4HkTkL5gphNdpfLkvsAsP2aRQ/exec';

// State Management
const state = {
  googleSheetCsvUrl: localStorage.getItem('student_attendance_sheet_url') || DEFAULT_SHEET_URL,
  selectedDate: null,         // Standardized date string YYYY-MM-DD
  attendanceData: {},         // DateString -> Array of {name, status}
  dateOrder: [],              // List of dates in order they appeared in file
  modalMode: 'connect',       // 'connect' or 'disconnect'
  studentCourses: {},         // studentName (lowercase) -> course type
  
  // Calendar View State
  currentCalendarYear: new Date().getFullYear(),
  currentCalendarMonth: new Date().getMonth()
};

// DOM Elements
const views = {
  viewer: document.getElementById('view-viewer'),
  loading: document.getElementById('view-loading')
};

const elements = {
  loadingText: document.getElementById('loading-text'),
  btnMenuToggle: document.getElementById('btn-menu-toggle'),
  menuDropdown: document.getElementById('menu-dropdown'),
  btnRefresh: document.getElementById('btn-refresh'),
  btnConnectTrigger: document.getElementById('btn-connect-trigger'),
  txtConnectTrigger: document.getElementById('txt-connect-trigger'),
  dateDisplay: document.getElementById('viewer-date-display'),
  presentContainer: document.getElementById('container-present-pills'),
  absentContainer: document.getElementById('container-absent-pills'),
  presentCount: document.getElementById('badge-count-present'),
  absentCount: document.getElementById('badge-count-absent'),
  
  // Connect Modal DOM
  configModal: document.getElementById('config-modal'),
  configForm: document.getElementById('config-form'),
  modalCsvUrl: document.getElementById('modal-csv-url'),
  modalPassword: document.getElementById('modal-password'),
  modalErrorText: document.getElementById('modal-error-text'),
  btnModalCancel: document.getElementById('btn-modal-cancel'),
  modalTitle: document.getElementById('modal-title'),
  modalSubtitle: document.getElementById('modal-subtitle'),
  groupCsvUrl: document.getElementById('group-csv-url'),
  btnModalSubmit: document.getElementById('btn-modal-submit'),
  
  // Calendar DOM
  btnCalendarToggle: document.getElementById('btn-calendar-toggle'),
  calendarModal: document.getElementById('calendar-modal'),
  btnCalPrev: document.getElementById('btn-cal-prev'),
  btnCalNext: document.getElementById('btn-cal-next'),
  calendarMonthYear: document.getElementById('calendar-month-year'),
  calendarDaysGrid: document.getElementById('calendar-days-grid'),
  btnCalClose: document.getElementById('btn-cal-close'),
  
  // Student Details Modal DOM
  studentModal: document.getElementById('student-modal'),
  studentModalCard: document.getElementById('student-modal-card'),
  studentModalName: document.getElementById('student-modal-name'),
  studentModalPercent: document.getElementById('student-modal-percent'),
  btnStudentClose: document.getElementById('btn-student-close')
};

// Hardcoded Dummy Data matching sheet structure: Date, StudentID, Student Name, Status, Timestamp
const DUMMY_CSV_DATA = `Date,StudentID,Student Name,Status,Timestamp
2026-06-05,st-17806779405,Abhay,present,6/6/2026 10:14:43
2026-06-05,st-17806781861,Anjana,present,6/6/2026 10:14:43
2026-06-05,st-17806830538,Anuvind Ram,present,6/6/2026 10:14:43
2026-06-05,st-17806830709,Mufna,present,6/6/2026 10:14:43
2026-06-05,st-17806830915,Melvin,present,6/6/2026 10:14:43
2026-06-05,st-17806831048,Vaishnav,present,6/6/2026 10:14:43
2026-06-05,st-17806831190,Aysha,present,6/6/2026 10:14:43
2026-06-05,st-17806831386,Basil,present,6/6/2026 10:14:43
2026-06-05,st-17806832031,Nasmal,present,6/6/2026 10:14:43
2026-06-05,st-17806832222,Sarah,absent,6/6/2026 10:14:43

2026-06-06,st-17806779405,Abhay,present,6/7/2026 09:20:11
2026-06-06,st-17806781861,Anjana,absent,6/7/2026 09:20:11
2026-06-06,st-17806830538,Anuvind Ram,present,6/7/2026 09:20:11
2026-06-06,st-17806830709,Mufna,present,6/7/2026 09:20:11
2026-06-06,st-17806830915,Melvin,absent,6/7/2026 09:20:11
2026-06-06,st-17806831048,Vaishnav,present,6/7/2026 09:20:11
2026-06-06,st-17806831190,Aysha,present,6/7/2026 09:20:11
2026-06-06,st-17806831386,Basil,present,6/7/2026 09:20:11
2026-06-06,st-17806832031,Nasmal,present,6/7/2026 09:20:11
2026-06-06,st-17806832222,Sarah,present,6/7/2026 09:20:11

2026-06-07,st-17806779405,Abhay,present,6/8/2026 11:32:04
2026-06-07,st-17806781861,Anjana,present,6/8/2026 11:32:04
2026-06-07,st-17806830538,Anuvind Ram,present,6/8/2026 11:32:04
2026-06-07,st-17806830709,Mufna,absent,6/8/2026 11:32:04
2026-06-07,st-17806830915,Melvin,present,6/8/2026 11:32:04
2026-06-07,st-17806831048,Vaishnav,present,6/8/2026 11:32:04
2026-06-07,st-17806831190,Aysha,absent,6/8/2026 11:32:04
2026-06-07,st-17806831386,Basil,present,6/8/2026 11:32:04
2026-06-07,st-17806832031,Nasmal,present,6/8/2026 11:32:04
2026-06-07,st-17806832222,Sarah,present,6/8/2026 11:32:04`;

/* ----------------------------------------------------
   INITIALIZATION & EVENT LISTENERS
---------------------------------------------------- */
function init() {
  setupEventListeners();
  updateConnectButtonText();
  fetchBoardData();
}

function setupEventListeners() {
  // Toggle 3-dot dropdown menu
  elements.btnMenuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = elements.menuDropdown.classList.contains('hidden');
    if (isHidden) {
      elements.menuDropdown.classList.remove('hidden');
      elements.btnMenuToggle.setAttribute('aria-expanded', 'true');
    } else {
      elements.menuDropdown.classList.add('hidden');
      elements.btnMenuToggle.setAttribute('aria-expanded', 'false');
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    elements.menuDropdown.classList.add('hidden');
    elements.btnMenuToggle.setAttribute('aria-expanded', 'false');
  });

  // Refresh Board click
  elements.btnRefresh.addEventListener('click', () => {
    elements.menuDropdown.classList.add('hidden');
    fetchBoardData();
  });

  // Connect/Disconnect Sheet button click
  elements.btnConnectTrigger.addEventListener('click', () => {
    elements.menuDropdown.classList.add('hidden');
    
    if (state.googleSheetCsvUrl) {
      // Set to disconnect mode
      state.modalMode = 'disconnect';
      elements.modalTitle.textContent = 'Disconnect Google Sheet';
      elements.modalSubtitle.textContent = 'Enter your admin password to disconnect and revert to dummy data.';
      elements.groupCsvUrl.style.display = 'none';
      elements.btnModalSubmit.textContent = 'Disconnect Sheet';
      openModal();
    } else {
      // Set to connect mode
      state.modalMode = 'connect';
      elements.modalTitle.textContent = 'Connect Google Sheet';
      elements.modalSubtitle.textContent = 'Enter your published CSV URL and credentials to link your spreadsheet.';
      elements.groupCsvUrl.style.display = 'flex';
      elements.btnModalSubmit.textContent = 'Connect Sheet';
      openModal();
    }
  });

  // Cancel Connect Modal
  elements.btnModalCancel.addEventListener('click', closeModal);

  // Form Submit for connection / disconnection
  elements.configForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = elements.modalCsvUrl.value.trim();
    const password = elements.modalPassword.value;

    elements.modalErrorText.classList.add('hidden');

    if (state.modalMode === 'connect') {
      if (!url) {
        alert('Please enter a Google Sheets CSV or API URL.');
        return;
      }

      if (password === 'sarathanjo') {
        state.googleSheetCsvUrl = url;
        localStorage.setItem('student_attendance_sheet_url', url);
        closeModal();
        updateConnectButtonText();
        fetchBoardData();
      } else {
        elements.modalErrorText.classList.remove('hidden');
      }
    } else if (state.modalMode === 'disconnect') {
      if (password === 'sarathanjo') {
        state.googleSheetCsvUrl = '';
        localStorage.removeItem('student_attendance_sheet_url');
        closeModal();
        updateConnectButtonText();
        fetchBoardData();
      } else {
        elements.modalErrorText.classList.remove('hidden');
      }
    }
  });

  // Calendar toggle click
  elements.btnCalendarToggle.addEventListener('click', () => {
    if (state.selectedDate && state.selectedDate !== 'Unknown Date') {
      const d = new Date(state.selectedDate + 'T12:00:00');
      if (!isNaN(d.getTime())) {
        state.currentCalendarYear = d.getFullYear();
        state.currentCalendarMonth = d.getMonth();
      }
    }
    openCalendar();
  });

  // Close Calendar click
  elements.btnCalClose.addEventListener('click', closeCalendar);

  // Prev Month click
  elements.btnCalPrev.addEventListener('click', () => {
    state.currentCalendarMonth--;
    if (state.currentCalendarMonth < 0) {
      state.currentCalendarMonth = 11;
      state.currentCalendarYear--;
    }
    drawCalendarGrid();
  });

  // Next Month click
  elements.btnCalNext.addEventListener('click', () => {
    state.currentCalendarMonth++;
    if (state.currentCalendarMonth > 11) {
      state.currentCalendarMonth = 0;
      state.currentCalendarYear++;
    }
    drawCalendarGrid();
  });

  // Close Student Modal
  elements.btnStudentClose.addEventListener('click', () => {
    elements.studentModal.classList.add('hidden');
  });

  // Close student modal when clicking the overlay background
  elements.studentModal.addEventListener('click', (e) => {
    if (e.target === elements.studentModal) {
      elements.studentModal.classList.add('hidden');
    }
  });

  // Event Delegation for Student Name Pills in Present/Absent Containers
  elements.presentContainer.addEventListener('click', (e) => {
    const pill = e.target.closest('.student-pill');
    if (pill) {
      openStudentDetails(pill.textContent.trim());
    }
  });

  elements.absentContainer.addEventListener('click', (e) => {
    const pill = e.target.closest('.student-pill');
    if (pill) {
      openStudentDetails(pill.textContent.trim());
    }
  });
}

function updateConnectButtonText() {
  if (state.googleSheetCsvUrl) {
    elements.txtConnectTrigger.textContent = 'Disconnect Sheet';
  } else {
    elements.txtConnectTrigger.textContent = 'Connect Sheet';
  }
}

/* ----------------------------------------------------
   MODAL & CALENDAR CONTROLS
---------------------------------------------------- */
function openModal() {
  elements.modalCsvUrl.value = state.googleSheetCsvUrl;
  elements.modalPassword.value = '';
  elements.modalErrorText.classList.add('hidden');
  elements.configModal.classList.remove('hidden');
  
  if (state.modalMode === 'connect') {
    elements.modalCsvUrl.focus();
  } else {
    elements.modalPassword.focus();
  }
}

function closeModal() {
  elements.configModal.classList.add('hidden');
}

function openCalendar() {
  drawCalendarGrid();
  elements.calendarModal.classList.remove('hidden');
}

function closeCalendar() {
  elements.calendarModal.classList.add('hidden');
}

/* ----------------------------------------------------
   DATA FETCHING
---------------------------------------------------- */
function fetchBoardData() {
  showView('loading');

  if (!state.googleSheetCsvUrl) {
    elements.loadingText.textContent = 'Loading dummy board data...';
    setTimeout(() => {
      processCsvContent(DUMMY_CSV_DATA);
    }, 450);
    return;
  }

  elements.loadingText.textContent = 'Fetching sheet data...';

  // Format link if user pasted regular sheet URL instead of CSV
  let fetchUrl = state.googleSheetCsvUrl;
  if (state.googleSheetCsvUrl.includes('docs.google.com/spreadsheets') && !state.googleSheetCsvUrl.includes('output=csv')) {
    const matches = state.googleSheetCsvUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (matches && matches[1]) {
      fetchUrl = `https://docs.google.com/spreadsheets/d/${matches[1]}/pub?output=csv`;
    }
  }

  fetch(fetchUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch from Google Sheets. Loading dummy data instead...');
      }
      return response.text();
    })
    .then(text => {
      const trimmed = text.trim();
      // Auto-detect JSON response from Apps Script vs Raw CSV
      if (trimmed.startsWith('{')) {
        const jsonData = JSON.parse(trimmed);
        processJsonContent(jsonData);
      } else {
        processCsvContent(trimmed);
      }
    })
    .catch(error => {
      console.warn(error.message);
      alert('Error fetching from Google Sheets. Reverting back to dummy data.');
      state.googleSheetCsvUrl = '';
      localStorage.removeItem('student_attendance_sheet_url');
      updateConnectButtonText();
      processCsvContent(DUMMY_CSV_DATA);
    });
}

/* ----------------------------------------------------
   JSON DATA PROCESSING
---------------------------------------------------- */
function processJsonContent(jsonData) {
  try {
    const students = jsonData.students || [];
    const attendance = jsonData.attendance || {};

    // Map student IDs to Names and Courses
    const studentMap = {};
    state.studentCourses = {};
    students.forEach(s => {
      studentMap[s.id] = s.name;
      if (s.name && s.course) {
        state.studentCourses[s.name.trim().toLowerCase()] = s.course;
      }
    });

    state.attendanceData = {};
    state.dateOrder = [];

    const dateKeys = Object.keys(attendance);
    if (dateKeys.length === 0) {
      throw new Error('No dates found in attendance JSON.');
    }

    dateKeys.forEach(dateKey => {
      const records = attendance[dateKey] || {};
      state.attendanceData[dateKey] = [];
      state.dateOrder.push(dateKey);

      Object.keys(records).forEach(studentId => {
        const studentName = studentMap[studentId] || studentId;
        const rawStatus = records[studentId] || 'absent';
        let status = 'Absent';
        
        if (rawStatus.trim().toLowerCase() === 'present') {
          status = 'Present';
        } else if (rawStatus.trim().toLowerCase() === 'half') {
          status = 'Half';
        }

        state.attendanceData[dateKey].push({
          name: studentName,
          status: status
        });
      });
    });

    // Chronological date keys sorting
    dateKeys.sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
        return state.dateOrder.indexOf(a) - state.dateOrder.indexOf(b);
      }
      return dateA.getTime() - dateB.getTime();
    });

    // Default to the latest date
    state.selectedDate = dateKeys[dateKeys.length - 1];

    // Set calendar month/year to match selected date
    const defaultDate = new Date(state.selectedDate + 'T12:00:00');
    if (!isNaN(defaultDate.getTime())) {
      state.currentCalendarYear = defaultDate.getFullYear();
      state.currentCalendarMonth = defaultDate.getMonth();
    }

    renderBoard();
    showView('viewer');
  } catch (err) {
    elements.loadingText.textContent = 'Error parsing JSON data.';
    alert('Error loading attendance JSON:\n' + err.message);
  }
}

/* ----------------------------------------------------
   CSV PROCESSING & REGEX PARSER
---------------------------------------------------- */
function processCsvContent(csvText) {
  try {
    const parsedRows = parseCSV(csvText);
    if (!parsedRows || parsedRows.length === 0) {
      throw new Error('The CSV data source is empty.');
    }

    let nameIdx = COLUMN_MAPPINGS.nameIndex;
    let dateIdx = COLUMN_MAPPINGS.dateIndex;
    let statusIdx = COLUMN_MAPPINGS.statusIndex;

    let headerRow = null;
    let startIndex = 0;

    for (let i = 0; i < parsedRows.length; i++) {
      if (!parsedRows[i].isBlank) {
        headerRow = parsedRows[i].data;
        startIndex = i;
        break;
      }
    }

    if (headerRow) {
      const isHeader = headerRow.some(col => {
        const c = col.toLowerCase();
        return c.includes('name') || c.includes('student') || c.includes('date') || c.includes('status') || c.includes('attendance');
      });

      if (isHeader) {
        startIndex++;
      }
    }

    state.attendanceData = {};
    state.dateOrder = [];

    for (let i = startIndex; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      if (row.isBlank) continue;

      const cols = row.data;
      if (cols.length <= Math.max(nameIdx, dateIdx, statusIdx)) continue;

      const rawName = cols[nameIdx] ? cols[nameIdx].trim() : '';
      const rawDate = cols[dateIdx] ? cols[dateIdx].trim() : '';
      const rawStatus = cols[statusIdx] ? cols[statusIdx].trim() : '';

      if (!rawName) continue;

      const dateKey = normalizeDate(rawDate);
      if (!state.attendanceData[dateKey]) {
        state.attendanceData[dateKey] = [];
        state.dateOrder.push(dateKey);
      }

      let status = 'Absent';
      const cleanStatus = rawStatus.trim().toLowerCase();
      if (cleanStatus === 'present') {
        status = 'Present';
      } else if (cleanStatus === 'half') {
        status = 'Half';
      }

      state.attendanceData[dateKey].push({
        name: rawName,
        status: status
      });
    }

    const dateKeys = Object.keys(state.attendanceData);
    if (dateKeys.length === 0) {
      throw new Error('No valid attendance rows found.');
    }

    dateKeys.sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
        return state.dateOrder.indexOf(a) - state.dateOrder.indexOf(b);
      }
      return dateA.getTime() - dateB.getTime();
    });

    // Default to the latest date
    state.selectedDate = dateKeys[dateKeys.length - 1];

    // Set calendar month/year to match selected date
    const defaultDate = new Date(state.selectedDate + 'T12:00:00');
    if (!isNaN(defaultDate.getTime())) {
      state.currentCalendarYear = defaultDate.getFullYear();
      state.currentCalendarMonth = defaultDate.getMonth();
    }

    renderBoard();
    showView('viewer');
  } catch (err) {
    elements.loadingText.textContent = 'Error parsing data.';
    alert('Error loading attendance file:\n' + err.message + '\n\nPlease check your CSV formatting.');
  }
}

// Split CSV lines accurately, handling quotes and commas
function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  const parsedRows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      parsedRows.push({ isBlank: true });
      continue;
    }

    const cols = [];
    let current = '';
    let inQuotes = false;

    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cols.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    cols.push(current.trim().replace(/^"|"$/g, ''));

    parsedRows.push({ isBlank: false, data: cols });
  }

  return parsedRows;
}

// Normalize various date-time strings to YYYY-MM-DD
function normalizeDate(dateStr) {
  if (!dateStr) return 'Unknown Date';

  if (dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }

  const token = dateStr.split(' ')[0];
  const slashParts = token.split('/');
  const dashParts = token.split('-');
  const parts = slashParts.length === 3 ? slashParts : (dashParts.length === 3 ? dashParts : []);

  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);

    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    }

    if (year > 1000) {
      if (month > 12) {
        const temp = month;
        month = day;
        day = temp;
      }
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return token || 'Unknown Date';
}

// Format date string for the viewer header
function getDisplayDate(dateKey) {
  if (dateKey === 'Unknown Date') return dateKey;
  
  const d = new Date(dateKey + 'T12:00:00');
  if (!isNaN(d.getTime())) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return d.toLocaleDateString('en-US', options);
  }
  return dateKey;
}

/* ----------------------------------------------------
   CALENDAR DRAWING LOGIC
---------------------------------------------------- */
function drawCalendarGrid() {
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  elements.calendarMonthYear.textContent = `${monthNames[state.currentCalendarMonth]} ${state.currentCalendarYear}`;

  const firstDayIndex = new Date(state.currentCalendarYear, state.currentCalendarMonth, 1).getDay();
  const totalDays = new Date(state.currentCalendarYear, state.currentCalendarMonth + 1, 0).getDate();
  const prevTotalDays = new Date(state.currentCalendarYear, state.currentCalendarMonth, 0).getDate();

  let dayCellsHTML = '';

  // Leading days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = prevTotalDays - i;
    dayCellsHTML += `<button class="calendar-day-cell inactive">${dayNum}</button>`;
  }

  // Active month days
  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    const dateKey = `${state.currentCalendarYear}-${String(state.currentCalendarMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const isSelected = dateKey === state.selectedDate;
    
    // Check if today
    const today = new Date();
    const isToday = today.getFullYear() === state.currentCalendarYear && 
                    today.getMonth() === state.currentCalendarMonth && 
                    today.getDate() === dayNum;
    
    // Check if there is data for this date
    const hasData = !!state.attendanceData[dateKey];
    
    let classes = 'calendar-day-cell';
    if (isSelected) classes += ' selected';
    if (isToday) classes += ' today';
    if (hasData) classes += ' has-data';

    dayCellsHTML += `<button class="${classes}" data-date="${dateKey}">${dayNum}</button>`;
  }

  // Trailing days from next month to fill grid (6 rows * 7 columns = 42 cells)
  const totalCellsSoFar = firstDayIndex + totalDays;
  const remainingCells = 42 - totalCellsSoFar;
  for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
    dayCellsHTML += `<button class="calendar-day-cell inactive">${dayNum}</button>`;
  }

  elements.calendarDaysGrid.innerHTML = dayCellsHTML;

  // Add click handlers to active month day cells
  const dayButtons = elements.calendarDaysGrid.querySelectorAll('.calendar-day-cell:not(.inactive)');
  dayButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const date = btn.dataset.date;
      
      // Update State & Select Date
      state.selectedDate = date;
      closeCalendar();
      renderBoard();
    });
  });
}

/* ----------------------------------------------------
   RENDER UI
---------------------------------------------------- */
function renderBoard() {
  const records = state.attendanceData[state.selectedDate] || [];

  // Update Header Date Display
  elements.dateDisplay.textContent = getDisplayDate(state.selectedDate);

  // Group Students
  const presentList = [];
  const absentList = [];
  let presentSum = 0;
  let absentSum = 0;

  records.forEach(r => {
    if (r.status === 'Present') {
      presentSum += 1;
      presentList.push({ name: r.name, label: '' });
    } else if (r.status === 'Half') {
      presentSum += 0.5;
      absentSum += 0.5;
      presentList.push({ name: r.name, label: ' (Half Day)' });
      absentList.push({ name: r.name, label: ' (Half Day)' });
    } else {
      absentSum += 1;
      absentList.push({ name: r.name, label: '' });
    }
  });

  presentList.sort((a, b) => a.name.localeCompare(b.name));
  absentList.sort((a, b) => a.name.localeCompare(b.name));

  // Render Present
  elements.presentCount.textContent = presentSum;
  if (presentList.length === 0) {
    elements.presentContainer.innerHTML = '<div class="empty-group-text">No students marked present.</div>';
  } else {
    elements.presentContainer.innerHTML = presentList
      .map((item, idx) => `<span class="student-pill" style="animation-delay: ${idx * 0.03}s">${escapeHTML(item.name + item.label)}</span>`)
      .join('');
  }

  // Render Absent
  elements.absentCount.textContent = absentSum;
  if (absentList.length === 0) {
    elements.absentContainer.innerHTML = '<div class="empty-group-text">No students marked absent.</div>';
  } else {
    elements.absentContainer.innerHTML = absentList
      .map((item, idx) => `<span class="student-pill" style="animation-delay: ${idx * 0.03}s">${escapeHTML(item.name + item.label)}</span>`)
      .join('');
  }
}

function showView(viewName) {
  Object.keys(views).forEach(key => {
    if (key === viewName) {
      views[key].classList.remove('hidden');
    } else {
      views[key].classList.add('hidden');
    }
  });
}

// Open and populate student attendance summary details modal
function openStudentDetails(studentNameInput) {
  const studentName = studentNameInput.replace(/\s*\(Half Day\)\s*$/, '').trim();
  let totalDays = 0;
  let presentDays = 0;

  const studentCourse = state.studentCourses ? state.studentCourses[studentName.toLowerCase()] : '6 Month';

  // Traverse all dates in the parsed attendance dataset
  Object.keys(state.attendanceData).forEach(dateKey => {
    // Skip Saturdays for 1 Year students
    if (studentCourse === '1 Year' && isSaturday(dateKey)) {
      return;
    }

    const records = state.attendanceData[dateKey] || [];
    const record = records.find(r => r.name.trim().toLowerCase() === studentName.toLowerCase());
    if (record) {
      totalDays++;
      if (record.status === 'Present') {
        presentDays++;
      } else if (record.status === 'Half') {
        presentDays += 0.5;
      }
    }
  });

  const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  // Populate HTML elements inside student modal
  elements.studentModalName.textContent = studentName;
  elements.studentModalPercent.textContent = `${percentage}%`;

  // Apply visual theme based on the 90% attendance criteria
  if (percentage < 90) {
    elements.studentModalCard.classList.add('danger-vibe');
    elements.studentModalCard.classList.remove('safe-vibe');
  } else {
    elements.studentModalCard.classList.add('safe-vibe');
    elements.studentModalCard.classList.remove('danger-vibe');
  }

  // Display the modal
  elements.studentModal.classList.remove('hidden');
}

// HTML Escaping to prevent XSS injection
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Check if a date string represents a Saturday (YYYY-MM-DD format)
function isSaturday(dateStr) {
  if (!dateStr || dateStr === 'Unknown Date') return false;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return false;
  const [year, month, day] = parts.map(Number);
  const dateObj = new Date(year, month - 1, day);
  return dateObj.getDay() === 6; // 6 is Saturday
}

// DOM content loaded entry
document.addEventListener('DOMContentLoaded', init);

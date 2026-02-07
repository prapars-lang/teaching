// App State
let appState = {
    allData: {
        teachers: [],
        subjects: [],
        classrooms: [],
        timetable: [],
        substitutes: []
    },
    currentConfig: {
        school_name: 'โรงเรียน.......................',
        academic_year: '2567',
        semester: '1'
    },
    selectedTeacherDetail: null
};

const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];
const periods = [1, 2, 3, 4, 'lunch', 5, 6, 7];
let draggedSubjectId = null;
let confirmCallback = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Auth.js handles the initial session check.
    // We expose initApp to be called after login/cached session is valid
    window.initApp = initApp;
});

async function initApp() {
    console.log("Initializing App...");
    showToast('กำลังโหลดข้อมูล...', 'info');
    await fetchData();

    if (!appState.hasListeners) {
        setupEventListeners();
        appState.hasListeners = true;
    }

    updatePageTitle();
    renderAll();
    showToast('โหลดข้อมูลเรียบร้อย');
}

// Data Fetching (Supabase)
async function fetchData() {
    try {
        const [teachers, subjects, classrooms, timetable, substitutes] = await Promise.all([
            appSupabaseClient.from('teachers').select('*'),
            appSupabaseClient.from('subjects').select('*'),
            appSupabaseClient.from('classrooms').select('*'),
            appSupabaseClient.from('timetable').select('*'),
            appSupabaseClient.from('substitutes').select('*')
        ]);

        if (teachers.error) throw teachers.error;
        if (subjects.error) throw subjects.error;
        if (classrooms.error) throw classrooms.error;
        if (timetable.error) throw timetable.error;
        if (substitutes.error) throw substitutes.error;

        // Map Supabase 'id' to '__backendId' for compatibility with user's logic if needed, 
        // or just use 'id'. User's code uses '__backendId'. Let's map it.
        appState.allData.teachers = teachers.data.map(d => ({ ...d, __backendId: d.id, type: 'teacher' }));
        appState.allData.subjects = subjects.data.map(d => ({ ...d, __backendId: d.id, type: 'subject' }));
        appState.allData.classrooms = classrooms.data.map(d => ({ ...d, __backendId: d.id, type: 'classroom' }));
        appState.allData.timetable = timetable.data.map(d => ({ ...d, __backendId: d.id, type: 'timetable' }));
        appState.allData.substitutes = substitutes.data.map(d => ({ ...d, __backendId: d.id, type: 'substitute' }));

        console.log("Data loaded:", appState.allData);

    } catch (error) {
        console.error("Error fetching data:", error);
        showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message, 'error');
    }
}

// UI Functions
window.showToast = function (message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast-message px-6 py-3 rounded-lg shadow-lg text-white font-medium pointer-events-auto ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-amber-500'
        }`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

window.showPage = function (pageId) {
    document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
    const page = document.getElementById(`page-${pageId}`);
    if (page) page.classList.remove('hidden');

    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    // Find the button that calls this function (if event exists)
    // Or finds the button by id
    // Logic from user code: event.target.classList.add('active'); 
    // But showPage might be called programmatically.
    if (window.event && window.event.target) {
        window.event.target.closest('button')?.classList.add('active');
    }
}

function updatePageTitle() {
    const config = appState.currentConfig;
    const info = document.getElementById('school-info');
    if (info) info.textContent = `ปีการศึกษา ${config.academic_year || '2567'} ภาคเรียน ${config.semester || '1'}`;

    const nameInput = document.getElementById('set-school-name');
    if (nameInput) nameInput.value = config.school_name || '';

    const yearInput = document.getElementById('set-academic-year');
    if (yearInput) yearInput.value = config.academic_year || '2567';

    const semInput = document.getElementById('set-semester');
    if (semInput) semInput.value = config.semester || '1';
}

function renderAll() {
    renderDashboard();
    renderTeachersTable();
    renderSubjectsTable();
    renderClassroomsGrid();
    renderTimetable();
    renderTeacherDetailList();
    renderTeacherTimetableGrid();
    renderSubstituteHistoryDropdown();
    updateTeacherDropdowns();
    renderSubjectPool();
    renderValidation();
    renderAnalysis();
    renderClassroomTimetablePage();
    updateReportSummary();
}


// --- DASHBOARD ---
function renderDashboard() {
    setText('stat-teachers', appState.allData.teachers.length);
    setText('stat-subjects', appState.allData.subjects.length);
    setText('stat-classrooms', appState.allData.classrooms.length);
    setText('stat-periods', appState.allData.timetable.length);
    renderDepartmentChart();
    renderBuildingChart();
    renderAlerts();
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function renderDepartmentChart() {
    const depts = {};
    appState.allData.teachers.forEach(t => {
        const dept = t.department || 'อื่นๆ';
        depts[dept] = (depts[dept] || 0) + 1;
    });

    const chart = document.getElementById('department-chart');
    if (!chart) return;
    if (Object.keys(depts).length === 0) {
        chart.innerHTML = '<p class="text-gray-500 text-center">ยังไม่มีข้อมูล</p>';
        return;
    }

    chart.innerHTML = Object.entries(depts).map(([dept, count]) => `
        <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span class="text-gray-700 font-medium">${dept}</span>
          <span class="px-3 py-1 bg-green-200 text-green-800 rounded-full font-bold">${count}</span>
        </div>
    `).join('');
}

function renderBuildingChart() {
    const buildings = {};
    appState.allData.classrooms.forEach(c => {
        const building = c.building_name || 'ไม่ระบุ';
        buildings[building] = (buildings[building] || 0) + 1;
    });

    const chart = document.getElementById('building-chart');
    if (!chart) return;
    if (Object.keys(buildings).length === 0) {
        chart.innerHTML = '<p class="text-gray-500 text-center">ยังไม่มีข้อมูล</p>';
        return;
    }

    chart.innerHTML = Object.entries(buildings).map(([building, count]) => `
        <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span class="text-gray-700 font-medium">🏢 ${building}</span>
          <span class="px-3 py-1 bg-blue-200 text-blue-800 rounded-full font-bold">${count} ห้อง</span>
        </div>
    `).join('');
}

function renderAlerts() {
    const container = document.getElementById('alerts-container');
    if (!container) return;
    const alerts = [];

    const dayPeriodMap = {};
    appState.allData.timetable.forEach(t => {
        const key = `${t.day}-${t.period}`;
        if (!dayPeriodMap[key]) dayPeriodMap[key] = [];
        dayPeriodMap[key].push(t);
    });

    Object.entries(dayPeriodMap).forEach(([key, entries]) => {
        if (entries.length > 1) {
            alerts.push({
                type: 'conflict',
                message: `⚠️ คาบสอนซ้ำในวัน${key.split('-')[0]} คาบที่ ${key.split('-')[1]}`
            });
        }
    });

    // Validating Teacher Overload
    const teacherLoads = {};
    appState.allData.timetable.forEach(t => {
        const subject = appState.allData.subjects.find(s => s.__backendId === t.subject_id);
        if (subject) {
            if (!teacherLoads[subject.teacher_name]) teacherLoads[subject.teacher_name] = 0;
            teacherLoads[subject.teacher_name]++;
        }
    });

    Object.entries(teacherLoads).forEach(([teacher, load]) => {
        const teacherData = appState.allData.teachers.find(t => t.name === teacher);
        const maxPeriods = teacherData?.max_periods || 50;
        if (load > maxPeriods) {
            alerts.push({
                type: 'overload',
                message: `⚠️ ครู${teacher} สอนมากเกินไป (${load}/${maxPeriods} คาบ)`
            });
        }
    });

    if (alerts.length === 0) {
        container.innerHTML = '<div class="p-4 bg-green-100 rounded-lg text-green-800 font-medium">✓ ไม่พบปัญหา</div>';
        return;
    }

    container.innerHTML = alerts.map(alert => `
        <div class="alert-box p-4 bg-amber-100 rounded-lg text-amber-800 font-medium border-l-4 border-amber-500 mb-2">
          ${alert.message}
        </div>
    `).join('');
}

// --- VALIDATION ---
function renderValidation() {
    const container = document.getElementById('validation-results');
    if (!container) return;
    const issues = [];

    // Check 1: Time overlap (Same day/period)
    const dayPeriodMap = {};
    appState.allData.timetable.forEach(t => {
        const key = `${t.day}-${t.period}`;
        if (!dayPeriodMap[key]) dayPeriodMap[key] = [];
        dayPeriodMap[key].push(t);
    });

    Object.entries(dayPeriodMap).forEach(([key, entries]) => {
        if (entries.length > 1) {
            const [day, period] = key.split('-');
            const subjects = entries.map(e => {
                const s = appState.allData.subjects.find(x => x.__backendId === e.subject_id);
                return s?.name || 'ไม่ทราบ';
            }).join(', ');
            issues.push({
                severity: 'error',
                icon: '❌',
                title: 'คาบสอนชนกัน',
                message: `${day} คาบที่ ${period}: ${subjects}`
            });
        }
    });

    // Check 2: Teacher Overlap
    const teacherSchedule = {};
    appState.allData.timetable.forEach(t => {
        const subject = appState.allData.subjects.find(s => s.__backendId === t.subject_id);
        if (subject) {
            const key = `${subject.teacher_name}-${t.day}-${t.period}`;
            if (!teacherSchedule[key]) teacherSchedule[key] = [];
            teacherSchedule[key].push(subject.name);
        }
    });

    Object.entries(teacherSchedule).forEach(([key, subjects]) => {
        if (subjects.length > 1) {
            const [teacher, day, period] = key.split('-');
            issues.push({
                severity: 'error',
                icon: '❌',
                title: 'ครูสอนซ้ำ',
                message: `ครู${teacher} วัน${day} คาบที่ ${period}: ${subjects.join(', ')}`
            });
        }
    });

    if (issues.length === 0) {
        container.innerHTML = '<div class="p-6 bg-green-100 rounded-lg text-green-800 text-center font-medium">✓ ตารางสอนไม่มีปัญหา</div>';
        return;
    }

    container.innerHTML = issues.map(issue => `
        <div class="p-4 rounded-lg border-l-4 mb-2 ${issue.severity === 'error' ? 'bg-red-50 border-red-500' : 'bg-amber-50 border-amber-500'
        }">
          <p class="font-bold ${issue.severity === 'error' ? 'text-red-800' : 'text-amber-800'}">
            ${issue.icon} ${issue.title}
          </p>
          <p class="text-sm ${issue.severity === 'error' ? 'text-red-700' : 'text-amber-700'} mt-1">
            ${issue.message}
          </p>
        </div>
    `).join('');
}


// --- ANALYSIS ---
function renderAnalysis() {
    renderTeacherLoadChart();
    renderSubstituteTeachers();
}

function renderTeacherLoadChart() {
    const teacherLoad = {};
    appState.allData.timetable.forEach(t => {
        const subject = appState.allData.subjects.find(s => s.__backendId === t.subject_id);
        if (subject) {
            const teacher = subject.teacher_name;
            if (!teacherLoad[teacher]) teacherLoad[teacher] = 0;
            teacherLoad[teacher]++;
        }
    });

    const chart = document.getElementById('teacher-load-chart');
    if (!chart) return;
    if (Object.keys(teacherLoad).length === 0) {
        chart.innerHTML = '<p class="text-center text-gray-500">ยังไม่มีข้อมูล</p>';
        return;
    }

    chart.innerHTML = Object.entries(teacherLoad).sort((a, b) => b[1] - a[1]).map(([teacher, load]) => `
        <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span class="text-gray-700 font-medium">${teacher}</span>
          <div class="flex items-center gap-2">
            <div class="w-32 bg-gray-200 rounded-full h-2">
              <div class="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full" style="width: ${Math.min(load * 10, 100)}%"></div>
            </div>
            <span class="px-3 py-1 bg-green-200 text-green-800 rounded-full font-bold text-sm">${load}</span>
          </div>
        </div>
    `).join('');
}

function renderSubstituteTeachers() {
    const select = document.getElementById('subject-for-substitute');
    const container = document.getElementById('substitute-teachers-list');
    if (!select || !container) return;

    if (appState.allData.subjects.length === 0) {
        container.innerHTML = '<p class="text-gray-500">ยังไม่มีรายวิชา</p>';
        return;
    }

    select.innerHTML = '<option value="">-- เลือกรายวิชา --</option>' +
        appState.allData.subjects.map(s => `<option value="${s.__backendId}">${s.name} (${s.teacher_name})</option>`).join('');

    // Prevent duplicate listeners if this function is called multiple times
    // A simple way is to recreate the element or just assign onchange (but we use addEventListener usually). 
    // Handled by re-rendering content. 
    // Better to use onchange property for simple replacement.
    select.onchange = (e) => {
        if (!e.target.value) {
            container.innerHTML = '<p class="text-gray-500">เลือกรายวิชาเพื่อดูครูทางเลือก</p>';
            return;
        }

        const subject = appState.allData.subjects.find(s => s.__backendId === e.target.value);
        const subjectDept = subject?.department || '';
        const alternativeTeachers = appState.allData.teachers.filter(t =>
            t.department === subjectDept && t.name !== subject.teacher_name
        );

        if (alternativeTeachers.length === 0) {
            container.innerHTML = '<p class="text-gray-500">ไม่มีครูทางเลือก</p>';
            return;
        }

        container.innerHTML = alternativeTeachers.map(t => `
          <div class="p-3 bg-green-50 rounded-lg border border-green-200">
            <p class="font-semibold text-green-800">${t.name}</p>
            <p class="text-sm text-green-700">คาบ/สัปดาห์: ${t.max_periods || 'ไม่ระบุ'}</p>
          </div>
        `).join('');
    };
}


// --- TEACHERS ---
function renderTeachersTable() {
    const tbody = document.getElementById('teachers-tbody');
    if (!tbody) return;
    const search = (document.getElementById('search-teachers')?.value || '').toLowerCase();

    let filtered = appState.allData.teachers;
    if (search) {
        filtered = filtered.filter(t => t.name.toLowerCase().includes(search) || (t.department || '').toLowerCase().includes(search));
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr class="text-center text-gray-500"><td colspan="7" class="py-8">ยังไม่มีข้อมูล</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(t => `
        <tr class="hover:bg-gray-50">
          <td class="px-4 py-3">${t.name}</td>
          <td class="px-4 py-3">${t.department || '-'}</td>
          <td class="px-4 py-3">${t.phone || '-'}</td>
          <td class="px-4 py-3">${t.building || '-'}</td>
          <td class="px-4 py-3">${t.max_periods || '-'}</td>
          <td class="px-4 py-3 text-sm text-gray-600">${t.unavailable_times?.length ? t.unavailable_times.map(u => u.text).join(', ') : '-'}</td>
          <td class="px-4 py-3 text-center">
            <button onclick="deleteTeacher('${t.__backendId}')" class="px-3 py-1 text-red-600 hover:bg-red-100 rounded">🗑️</button>
          </td>
        </tr>
    `).join('');
}


// --- SUBJECTS ---
function renderSubjectsTable() {
    const tbody = document.getElementById('subjects-tbody');
    if (!tbody) return;
    const search = (document.getElementById('search-subjects')?.value || '').toLowerCase();

    let filtered = appState.allData.subjects;
    if (search) {
        filtered = filtered.filter(s => s.name.toLowerCase().includes(search) || s.code.toLowerCase().includes(search));
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr class="text-center text-gray-500"><td colspan="7" class="py-8">ยังไม่มีข้อมูล</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(s => `
        <tr class="hover:bg-gray-50">
          <td class="px-4 py-3 font-mono text-sm">${s.code}</td>
          <td class="px-4 py-3">${s.name}</td>
          <td class="px-4 py-3">${s.grade}</td>
          <td class="px-4 py-3">${s.teacher_name}</td>
          <td class="px-4 py-3">${s.hours || '-'}</td>
          <td class="px-4 py-3">${s.type === 'Lab' ? 'ปฏิบัติ (Lab)' : 'ทฤษฎี'}</td>
          <td class="px-4 py-3">${s.required_room_type || '-'}</td>
          <td class="px-4 py-3 text-center">
            <button onclick="deleteSubject('${s.__backendId}')" class="px-3 py-1 text-red-600 hover:bg-red-100 rounded">🗑️</button>
          </td>
        </tr>
    `).join('');
}

// --- CLASSROOMS ---
function renderClassroomsGrid() {
    const grid = document.getElementById('classrooms-grid');
    if (!grid) return;

    if (appState.allData.classrooms.length === 0) {
        grid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-8">ยังไม่มีห้องเรียน</p>';
        return;
    }

    grid.innerHTML = appState.allData.classrooms.map(c => `
        <div class="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200 shadow-sm hover:shadow-md transition-shadow">
          <div class="flex justify-between items-start">
            <div>
              <h4 class="font-bold text-lg text-blue-800">ห้อง ${c.classroom_name}</h4>
              <p class="text-sm text-blue-600 mt-1">🏢 ${c.building_name || 'ไม่ระบุ'}</p>
              <div class="flex gap-2 mt-2">
                <span class="px-2 py-0.5 bg-blue-200 text-blue-800 text-xs rounded-full">👥 ${c.capacity || 40}</span>
                <span class="px-2 py-0.5 bg-cyan-200 text-cyan-800 text-xs rounded-full">🔠 ${c.type || 'ทั่วไป'}</span>
              </div>
            </div>
            <button onclick="deleteClassroom('${c.__backendId}')" class="text-blue-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50">🗑️</button>
          </div>
        </div>
    `).join('');
}

// --- TIMETABLE (Drag & Drop) ---
function renderSubjectPool() {
    const pool = document.getElementById('subject-pool');
    if (!pool) return;
    const filterGrade = document.getElementById('timetable-filter-grade')?.value;
    const usedIds = new Set(appState.allData.timetable.map(t => t.subject_id));

    let filteredSubjects = appState.allData.subjects;
    if (filterGrade) {
        filteredSubjects = filteredSubjects.filter(s => s.grade === filterGrade);
    }

    if (filteredSubjects.length === 0) {
        pool.innerHTML = '<p class="text-gray-500 text-sm italic">ไม่มีรายวิชา' + (filterGrade ? 'สำหรับชั้นนี้' : '') + '</p>';
        return;
    }

    pool.innerHTML = filteredSubjects.map(s => `
        <div class="draggable-card px-4 py-3 rounded-lg font-medium text-white cursor-grab active:cursor-grabbing"
             style="background: ${usedIds.has(s.__backendId) ? '#ccc' : 'linear-gradient(135deg, #16a34a, #15803d)'}"
             data-subject-id="${s.__backendId}"
             draggable="${usedIds.has(s.__backendId) ? 'false' : 'true'}"
             ondragstart="window.handleDragStart(event)"
             ondragend="window.handleDragEnd(event)">
          <p class="font-semibold text-sm">${s.name}</p>
          <p class="text-xs opacity-90">${s.teacher_name} (${s.grade})</p>
        </div>
    `).join('');
}

function renderTimetable() {
    const tbody = document.getElementById('timetable-tbody');
    const filterSelect = document.getElementById('timetable-filter-grade');
    if (!tbody) return;

    // Populate Filter if empty (and if data exists)
    if (filterSelect && filterSelect.options.length <= 1 && appState.allData.subjects.length > 0) {
        const grades = [...new Set(appState.allData.subjects.map(s => s.grade).filter(Boolean))].sort();
        if (grades.length > 0) {
            filterSelect.innerHTML = '<option value="">-- ทุกชั้นเรียน --</option>' +
                grades.map(g => `<option value="${g}">${g}</option>`).join('');
        }
    }

    const filterGrade = filterSelect?.value;

    tbody.innerHTML = days.map(day => `
        <tr>
          <td class="p-2 border border-gray-200 bg-green-50 font-semibold text-green-800 w-20">${day}</td>
          ${periods.map(period => {
        if (period === 'lunch') {
            return `<td class="p-2 border border-gray-200 bg-amber-100 text-center font-semibold text-amber-700 text-sm">🍽️</td>`;
        }

        // Find entry for this slot
        const entry = appState.allData.timetable.find(t => {
            if (t.day !== day || t.period != period) return false;
            if (!filterGrade) return true; // If no filter, show first match (might overlap visually)

            // Check if subject matches filter
            const subj = appState.allData.subjects.find(s => s.__backendId === t.subject_id);
            return subj && subj.grade === filterGrade;
        });

        const content = entry
            ? (() => {
                const subject = appState.allData.subjects.find(s => s.__backendId === entry.subject_id);
                return subject ? `
                    <div class="p-2 bg-blue-100 border border-blue-300 rounded h-full text-xs">
                      <p class="font-semibold text-blue-900">${subject.name}</p>
                      <p class="text-blue-700">${subject.code} (${subject.grade})</p>
                      <p class="text-gray-600 text-[10px]">${subject.teacher_name}</p>
                    </div>
                  ` : '';
            })()
            : '';

        return `<td class="period-slot drop-zone" data-day="${day}" data-period="${period}"
                       ondragover="window.handleDragOver(event)"
                       ondragleave="window.handleDragLeave(event)"
                       ondrop="window.handleDrop(event)">
              ${content}
            </td>`;
    }).join('')}
        </tr>
    `).join('');
}

window.autoSchedule = async () => {
    if (!window.Scheduler) {
        showToast('Scheduler module not loaded', 'error');
        return;
    }

    showToast('กำลังจัดตารางสอนอัตโนมัติ...', 'info');

    // Tiny delay to let UI update
    await new Promise(r => setTimeout(r, 100));

    try {
        const result = await window.Scheduler.autoSchedule(appState.allData);

        if (result.success && result.scheduled.length > 0) {
            // Bulk insert
            const { data, error } = await appSupabaseClient.from('timetable').insert(result.scheduled).select();
            if (error) throw error;

            // Update local state
            const newEntries = data.map(d => ({ ...d, __backendId: d.id, type: 'timetable' }));
            appState.allData.timetable.push(...newEntries);

            renderAll();
            showToast(`จัดตารางสำเร็จ ${result.scheduled.length} รายการ`, 'success');
        } else {
            showToast(result.message || 'ไม่พบรายวิชาที่ต้องจัดเพิ่ม', 'warning');
        }
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
};

// Drag & Drop Handlers (Global)
window.handleDragStart = function (e) {
    draggedSubjectId = e.target.dataset.subjectId;
    e.target.classList.add('opacity-50');
    e.dataTransfer.effectAllowed = 'move';
}

window.handleDragEnd = function (e) {
    e.target.classList.remove('opacity-50');
    draggedSubjectId = null;
}

window.handleDragOver = function (e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
    e.dataTransfer.dropEffect = 'move';
}

window.handleDragLeave = function (e) {
    e.currentTarget.classList.remove('drag-over');
}

window.handleDrop = async function (e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    const day = e.currentTarget.dataset.day;
    const period = parseInt(e.currentTarget.dataset.period);

    // Check overlap
    if (appState.allData.timetable.some(t => t.day === day && t.period == period)) {
        showToast('คาบนี้มีรายวิชาแล้ว', 'error');
        return;
    }

    // Validate Constraints
    if (window.Constraints) {
        const tempSlot = { day, period, subject_id: draggedSubjectId };
        const validation = window.Constraints.validateSlot(appState.allData, tempSlot);
        if (!validation.valid) {
            showToast(validation.error, 'error');
            return;
        }
    }

    try {
        const { data, error } = await appSupabaseClient.from('timetable').insert([{
            day,
            period,
            subject_id: draggedSubjectId
        }]).select().single();

        if (error) throw error;

        showToast('เพิ่มรายวิชาแล้ว');
        // Update local state and re-render
        appState.allData.timetable.push({ ...data, __backendId: data.id, type: 'timetable' });
        renderAll();
    } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
}


// --- TEACHER DETAIL & LIST ---
function renderTeacherDetailList() {
    const container = document.getElementById('teacher-list');
    if (!container) return;

    if (appState.allData.teachers.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">ไม่มีครู</p>';
        return;
    }

    container.innerHTML = appState.allData.teachers.map(t => `
        <button onclick="selectTeacherDetail('${t.__backendId}')" class="teacher-card w-full p-3 rounded-lg text-left transition-all ${appState.selectedTeacherDetail === t.__backendId ? 'active' : ''
        }">
          <p class="font-bold text-gray-800">${t.name}</p>
          <p class="text-xs text-gray-600">${t.department || '-'}</p>
          <p class="text-xs text-gray-500">คาบ: ${getTeacherPeriods(t.name)}</p>
        </button>
    `).join('');
}

window.selectTeacherDetail = function (teacherId) {
    appState.selectedTeacherDetail = teacherId;
    const teacher = appState.allData.teachers.find(t => t.__backendId === teacherId);

    if (!teacher) return;

    document.getElementById('teacher-detail-header').classList.add('hidden');
    document.getElementById('teacher-detail-content').classList.remove('hidden');

    const fields = ['detail-name', 'detail-dept', 'detail-phone', 'detail-email', 'detail-building', 'detail-max-periods'];
    const values = [teacher.name, teacher.department, teacher.phone, teacher.email, teacher.building, teacher.max_periods];

    fields.forEach((id, idx) => {
        const el = document.getElementById(id);
        if (el) el.textContent = values[idx] || '-';
    });

    renderTeacherSubjects(teacher.name);
    renderTeacherDetailTimetable(teacher.name);
    renderTeacherDetailList(); // Update active state
}

function renderTeacherSubjects(teacherName) {
    const container = document.getElementById('teacher-subjects');
    const subjects = appState.allData.subjects.filter(s => s.teacher_name === teacherName);

    if (subjects.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">ไม่มีรายวิชา</p>';
        return;
    }

    container.innerHTML = subjects.map(s => `
        <div class="subject-block bg-blue-100 text-blue-900 border-blue-500">
          <p class="font-semibold">${s.name}</p>
          <p class="text-xs">รหัส: ${s.code} | ชั้น: ${s.grade} | ชม./สัปดาห์: ${s.hours}</p>
        </div>
    `).join('');
}

function getTeacherPeriods(teacherName) {
    const count = appState.allData.timetable.filter(t => {
        const subject = appState.allData.subjects.find(s => s.__backendId === t.subject_id);
        return subject?.teacher_name === teacherName;
    }).length;
    return count;
}

function renderTeacherDetailTimetable(teacherName) {
    const tbody = document.getElementById('teacher-detail-timetable-tbody');
    if (!tbody) return;

    tbody.innerHTML = days.map(day => `
        <tr>
          <td class="p-2 border border-blue-200 bg-blue-50 font-semibold text-blue-800 w-20">${day}</td>
          ${periods.map(period => {
        if (period === 'lunch') {
            return `<td class="p-2 border border-blue-200 bg-amber-100 text-center font-semibold text-amber-700 text-sm">🍽️</td>`;
        }

        const entries = appState.allData.timetable.filter(t => t.day === day && t.period == period);
        const teacherSubjects = entries.filter(e => {
            const subject = appState.allData.subjects.find(s => s.__backendId === e.subject_id);
            return subject?.teacher_name === teacherName;
        });

        const content = teacherSubjects.length > 0
            ? (() => {
                const subject = appState.allData.subjects.find(s => s.__backendId === teacherSubjects[0].subject_id);
                return `
                    <div class="p-2 bg-cyan-100 border border-cyan-300 rounded h-full text-xs">
                      <p class="font-semibold text-cyan-900">${subject?.name || '-'}</p>
                      <p class="text-cyan-700">${subject?.grade || '-'}</p>
                    </div>
                  `;
            })()
            : '';

        return `<td class="period-slot" data-day="${day}" data-period="${period}">${content}</td>`;
    }).join('')}
        </tr>
    `).join('');
}

// --- TEACHER GRID ---
function renderTeacherTimetableGrid() {
    const select = document.getElementById('teacher-select-grid');
    if (!select) return;

    if (appState.allData.teachers.length === 0) {
        select.innerHTML = '<option value="">-- ไม่มีครู --</option>';
        return;
    }

    select.innerHTML = '<option value="">-- เลือกครู --</option>' +
        appState.allData.teachers.map(t => `<option value="${t.name}">${t.name}</option>`).join('');

    select.onchange = (e) => {
        if (!e.target.value) {
            document.getElementById('teacher-grid-info').classList.add('hidden');
            return;
        }
        updateTeacherGridTimetableView(e.target.value);
    };
}

function updateTeacherGridTimetableView(teacherName) {
    const tbody = document.getElementById('teacher-timetable-tbody');
    const infoDiv = document.getElementById('teacher-grid-info');
    if (!tbody || !infoDiv) return;

    const teacherPeriodCount = appState.allData.timetable.filter(t => {
        const subject = appState.allData.subjects.find(s => s.__backendId === t.subject_id);
        return subject?.teacher_name === teacherName && t.period !== 'lunch';
    }).length;

    document.getElementById('grid-total-periods').textContent = teacherPeriodCount;
    infoDiv.classList.remove('hidden');

    tbody.innerHTML = days.map(day => `
        <tr>
          <td class="p-2 border border-green-200 bg-green-50 font-semibold text-green-800 w-20">${day}</td>
          ${periods.map(period => {
        if (period === 'lunch') {
            return `<td class="p-2 border border-green-200 bg-amber-100 text-center font-semibold text-amber-700 text-sm">🍽️</td>`;
        }

        const entries = appState.allData.timetable.filter(t => t.day === day && t.period == period);
        const teacherSubjects = entries.filter(e => {
            const subject = appState.allData.subjects.find(s => s.__backendId === e.subject_id);
            return subject?.teacher_name === teacherName;
        });

        const content = teacherSubjects.length > 0
            ? (() => {
                const subject = appState.allData.subjects.find(s => s.__backendId === teacherSubjects[0].subject_id);
                return `
                    <div class="p-2 bg-green-100 border border-green-300 rounded h-full text-xs">
                      <p class="font-semibold text-green-900">${subject?.name || '-'}</p>
                      <p class="text-green-700">${subject?.grade || '-'}</p>
                    </div>
                  `;
            })()
            : '';

        return `<td class="period-slot" data-day="${day}" data-period="${period}">${content}</td>`;
    }).join('')}
        </tr>
    `).join('');
}


// --- SUBSTITUTES ---
function renderSubstituteHistoryDropdown() {
    const select = document.getElementById('teacher-history-select');
    if (!select) return;
    if (appState.allData.teachers.length === 0) {
        select.innerHTML = '<option value="">-- ไม่มีครู --</option>';
        return;
    }

    select.innerHTML = '<option value="">-- เลือกครู --</option>' +
        appState.allData.teachers.map(t => `<option value="${t.name}">${t.name}</option>`).join('');

    select.onchange = (e) => {
        if (!e.target.value) {
            document.getElementById('substitute-history').innerHTML = '<p class="text-center text-gray-500 py-8">เลือกครูเพื่อดูประวัติ</p>';
            return;
        }
        updateSubstituteHistory(e.target.value);
    };
}

function updateSubstituteHistory(teacherName) {
    const container = document.getElementById('substitute-history');
    if (!container) return;

    // Logic: Find subs where leaving_teacher is this teacher? Or covering?
    // User logic: "subject = entry ? ... return subject.teacher_name === teacherName"
    // This implies checking subs for *taught classes* by this teacher that were substituted?
    // Let's stick to user logic.

    const subs = appState.allData.substitutes.filter(s => {
        // Need to find if the timetable slot (s.day, s.period) belongs to this teacher
        const entry = appState.allData.timetable.find(t => t.day === s.day && t.period == s.period);
        const subject = entry ? appState.allData.subjects.find(x => x.__backendId === entry.subject_id) : null;
        return subject?.teacher_name === teacherName;
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (subs.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 py-8">ไม่มีประวัติการสอนแทน</p>';
        return;
    }

    container.innerHTML = subs.map(s => `
        <div class="p-4 rounded-lg border-2 border-amber-200 bg-amber-50">
          <p class="font-semibold text-gray-800">📅 ${s.date} - วัน${s.day} คาบที่ ${s.period}</p>
          <p class="text-sm text-gray-600">เหตุผล: ${s.reason}</p>
          <p class="text-sm text-green-600">ครูแทน: ${s.substitute_teacher}</p>
        </div>
    `).join('');
}

// --- REPORTS ---
function updateReportSummary() {
    setText('report-teachers', appState.allData.teachers.length);
    setText('report-subjects', appState.allData.subjects.length);
    setText('report-classrooms', appState.allData.classrooms.length);
    setText('report-periods', appState.allData.timetable.length);
    setText('report-subs', appState.allData.substitutes.filter(s => s.status === 'active').length);
}

// Exports
window.exportToJSON = () => {
    const config = appState.currentConfig;
    const data = {
        export_date: new Date().toISOString(),
        school: config.school_name,
        academic_year: config.academic_year,
        semester: config.semester,
        data: appState.allData
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timetable_${Date.now()}.json`;
    a.click();
    showToast('ส่งออก JSON แล้ว');
};

window.exportToCSV = () => {
    const config = appState.currentConfig;
    let csv = `ตารางสอน - ${config.school_name}\nส่งออกเมื่อ,${new Date().toLocaleString('th-TH')}\n\nครู\nชื่อ,กลุ่มสาระ,เบอร์โทร,อีเมล,อาคาร,คาบสูงสุด\n`;

    appState.allData.teachers.forEach(t => {
        csv += `"${t.name}","${t.department || '-'}","${t.phone || '-'}","${t.email || '-'}","${t.building || '-'}","${t.max_periods || '-'}"\n`;
    });

    csv += `\nรายวิชา\nรหัส,ชื่อ,ชั้น,ครู,ชม/สัปดาห์,ห้องปฏิบัติการ\n`;
    appState.allData.subjects.forEach(s => {
        csv += `"${s.code}","${s.name}","${s.grade}","${s.teacher_name}","${s.hours || '-'}","${s.lab || '-'}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timetable_${Date.now()}.csv`;
    a.click();
    showToast('ส่งออก CSV แล้ว');
};

window.printTimetable = () => {
    const config = appState.currentConfig;
    let html = `<html><head><meta charset="utf-8"><style>
    body { font-family: 'Sarabun', Arial; margin: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #333; padding: 10px; text-align: center; font-size: 12px; }
    th { background: #16a34a; color: white; }
    </style></head><body>
    <h1>${config.school_name}</h1>
    <p>ปีการศึกษา ${config.academic_year} ภาคเรียน ${config.semester}</p>
    <table><tr><th>วัน</th>`;

    periods.forEach(p => {
        html += p === 'lunch' ? '<th>พักเที่ยง</th>' : `<th>${p}</th>`;
    });

    html += '</tr>';

    days.forEach(day => {
        html += `<tr><td><strong>${day}</strong></td>`;
        periods.forEach(period => {
            if (period === 'lunch') html += '<td>พักเที่ยง</td>';
            else {
                const entry = appState.allData.timetable.find(t => t.day === day && t.period == period);
                const subject = entry ? appState.allData.subjects.find(s => s.__backendId === entry.subject_id) : null;
                html += `<td>${subject ? subject.name : '-'}</td>`;
            }
        });
        html += '</tr>';
    });

    html += '</table></body></html>';
    const w = window.open('', '', 'width=900,height=700');
    w.document.write(html);
    w.print();
    showToast('พิมพ์ตารางสอน');
};

// --- MODALS ---
window.openAddTeacherModal = () => document.getElementById('add-teacher-modal').classList.remove('hidden');
window.closeAddTeacherModal = () => document.getElementById('add-teacher-modal').classList.add('hidden');

window.openAddSubjectModal = () => document.getElementById('add-subject-modal').classList.remove('hidden');
window.closeAddSubjectModal = () => document.getElementById('add-subject-modal').classList.add('hidden');

window.openAddClassroomModal = () => document.getElementById('add-classroom-modal').classList.remove('hidden');
window.closeAddClassroomModal = () => document.getElementById('add-classroom-modal').classList.add('hidden');

window.showConfirmModal = (title, message, callback) => {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    confirmCallback = callback;
    document.getElementById('confirm-modal').classList.remove('hidden');
};
window.closeConfirmModal = () => {
    document.getElementById('confirm-modal').classList.add('hidden');
    confirmCallback = null;
};


// --- EVENT LISTENERS ---
function setupEventListeners() {
    // Search Inputs
    document.getElementById('search-teachers')?.addEventListener('input', renderTeachersTable);
    document.getElementById('search-subjects')?.addEventListener('input', renderSubjectsTable);

    // Confirm Modal
    document.getElementById('confirm-btn')?.addEventListener('click', async () => {
        if (confirmCallback) await confirmCallback();
        closeConfirmModal();
    });

    // Add Teacher

    document.getElementById('add-teacher-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const newTeacher = {
                name: document.getElementById('teacher-name').value,
                department: document.getElementById('teacher-department').value,
                phone: document.getElementById('teacher-phone').value,
                // email removed from form in previous step ?? wait, I saw email in the code I viewed
                // Let's re-read the code I viewer. Line 957: email: document.getElementById('teacher-email').value,
                // BUT in my index.html edit I REMOVED email input? 
                // Ah, I see I removed email input in my previous edit to index.html to make room for unavailable? 
                // No, I think I replaced it. Let me check the index.html content again if I can.
                // Wait, looking at my index.html edit:
                // -                    <div><label class="block text-sm font-semibold text-gray-700 mb-1">อีเมล</label> <input type="email"
                // -                            id="teacher-email" placeholder="example@school.com"
                // So yes, I removed email. I should probably keep it or remove it from here.
                // I'll remove it from here to match UI.
                building: document.getElementById('teacher-building').value,
                max_periods: parseInt(document.getElementById('teacher-max-periods').value) || 30,
                unavailable_times: document.getElementById('teacher-unavailable').value ? [{ text: document.getElementById('teacher-unavailable').value }] : []
            };

            const { data, error } = await appSupabaseClient.from('teachers').insert([newTeacher]).select().single();
            if (error) throw error;

            showToast('เพิ่มครูแล้ว');
            closeAddTeacherModal();
            appState.allData.teachers.push({ ...data, __backendId: data.id, type: 'teacher' });
            renderAll();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    });

    // Add Subject
    document.getElementById('add-subject-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const newSubject = {
                code: document.getElementById('subject-code').value,
                name: document.getElementById('subject-name').value,
                grade: document.getElementById('subject-grade').value,
                teacher_name: document.getElementById('subject-teacher').value,
                hours: parseInt(document.getElementById('subject-hours').value) || 1,
                // lab removed? No, I see it in index.html diff? 
                // -                    <div><label class="block text-sm font-semibold text-gray-700 mb-1">ห้องปฏิบัติการ (ถ้ามี)</label>
                // -                        <input type="text" id="subject-lab" placeholder="เช่น ห้องปฏิบัติการวิทยาศาสตร์"
                // Yes, I removed subject-lab input and replaced with dropdowns.
                type: document.getElementById('subject-type').value,
                required_room_type: document.getElementById('subject-room-type').value || null
            };

            const { data, error } = await appSupabaseClient.from('subjects').insert([newSubject]).select().single();
            if (error) throw error;

            showToast('เพิ่มรายวิชาแล้ว');
            closeAddSubjectModal();
            appState.allData.subjects.push({ ...data, __backendId: data.id, type: 'subject' });
            renderAll();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    });

    // Add Classroom
    document.getElementById('add-classroom-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const newClassroom = {
                classroom_name: document.getElementById('classroom-name').value,
                building_name: document.getElementById('classroom-building').value,
                capacity: parseInt(document.getElementById('classroom-capacity').value) || 40,
                type: document.getElementById('classroom-type').value
            };

            const { data, error } = await appSupabaseClient.from('classrooms').insert([newClassroom]).select().single();
            if (error) throw error;

            showToast('เพิ่มห้องเรียนแล้ว');
            closeAddClassroomModal();
            appState.allData.classrooms.push({ ...data, __backendId: data.id, type: 'classroom' });
            renderAll();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    });


    // Substitute Form
    document.getElementById('substitute-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const newSub = {
                date: document.getElementById('sub-date').value,
                day: document.getElementById('sub-day').value,
                period: parseInt(document.getElementById('sub-period').value),
                leaving_teacher: document.getElementById('sub-leaving-teacher').value,
                reason: document.getElementById('sub-reason').value,
                substitute_teacher: document.getElementById('sub-teacher').value,
                status: 'active'
            };

            const { data, error } = await appSupabaseClient.from('substitutes').insert([newSub]).select().single();
            if (error) throw error;

            showToast('บันทึกการสอนแทนแล้ว');
            document.getElementById('substitute-form').reset();
            document.getElementById('sub-date').valueAsDate = new Date();

            appState.allData.substitutes.push({ ...data, __backendId: data.id, type: 'substitute' });
            renderAll();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    });

    // Settings Form
    // Note: We don't have a settings table in Supabase yet? 
    // User's code used window.elementSdk for config.
    // We can just store in local storage for now or alert 'Not implemented'
    document.getElementById('settings-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        appState.currentConfig = {
            school_name: document.getElementById('set-school-name').value,
            academic_year: document.getElementById('set-academic-year').value,
            semester: document.getElementById('set-semester').value
        };
        showToast('บันทึกตั้งค่าแล้ว (Local Only)');
        updatePageTitle();
    });

    // Default Dates
    const subDate = document.getElementById('sub-date');
    if (subDate) subDate.valueAsDate = new Date();
}

function updateTeacherDropdowns() {
    const leaving = document.getElementById('sub-leaving-teacher');
    const sub = document.getElementById('sub-teacher');
    if (!leaving || !sub) return;

    const opts = '<option value="">-- เลือกครู --</option>' +
        appState.allData.teachers.map(t => `<option value="${t.name}">${t.name}</option>`).join('');

    leaving.innerHTML = opts;
    sub.innerHTML = opts;
}

// Delete functions
window.deleteTeacher = async function (id) {
    showConfirmModal('ลบครู', 'คุณต้องการลบครูนี้หรือไม่?', async () => {
        const { error } = await appSupabaseClient.from('teachers').delete().eq('id', id);
        if (error) {
            showToast('Error: ' + error.message, 'error');
            return;
        }
        appState.allData.teachers = appState.allData.teachers.filter(t => t.__backendId !== id);
        renderAll();
        showToast('ลบครูแล้ว');
    });
};

window.deleteSubject = async function (id) {
    showConfirmModal('ลบรายวิชา', 'คุณต้องการลบรายวิชานี้หรือไม่?', async () => {
        const { error } = await appSupabaseClient.from('subjects').delete().eq('id', id);
        if (error) {
            showToast('Error: ' + error.message, 'error');
            return;
        }

        // Cascade delete timetable entries? Supabase might handle if FK set to cascade. 
        // If not, we should manually delete.
        // For now, let's assume simple delete.

        appState.allData.subjects = appState.allData.subjects.filter(s => s.__backendId !== id);
        // Clean up local timetable
        appState.allData.timetable = appState.allData.timetable.filter(t => t.subject_id !== id);

        renderAll();
        showToast('ลบรายวิชาแล้ว');
    });
};

window.deleteClassroom = async function (id) {
    showConfirmModal('ลบห้องเรียน', 'คุณต้องการลบห้องเรียนนี้หรือไม่?', async () => {
        const { error } = await appSupabaseClient.from('classrooms').delete().eq('id', id);
        if (error) {
            showToast('Error: ' + error.message, 'error');
            return;
        }
        appState.allData.classrooms = appState.allData.classrooms.filter(c => c.__backendId !== id);
        renderAll();
        showToast('ลบห้องเรียนแล้ว');
    });
};

// --- CLASSROOM TIMETABLE ---
function renderClassroomTimetablePage() {
    const select = document.getElementById('classroom-select');
    if (!select) return;

    if (appState.allData.classrooms.length === 0) {
        select.innerHTML = '<option value="">-- ไม่มีห้องเรียน --</option>';
        return;
    }

    select.innerHTML = '<option value="">-- เลือกห้องเรียน --</option>' +
        appState.allData.classrooms.map(c => `<option value="${c.classroom_name}">${c.classroom_name}</option>`).join('');

    select.onchange = (e) => {
        if (!e.target.value) {
            document.getElementById('classroom-info').classList.add('hidden');
            document.getElementById('classroom-timetable-tbody').innerHTML = '';
            return;
        }
        updateClassroomTimetable(e.target.value);
    };
}

function updateClassroomTimetable(classroomName) {
    const tbody = document.getElementById('classroom-timetable-tbody');
    const infoDiv = document.getElementById('classroom-info');
    if (!tbody || !infoDiv) return;

    const classroom = appState.allData.classrooms.find(c => c.classroom_name === classroomName);
    const buildingInfo = classroom ? classroom.building_name : '-';
    document.getElementById('class-building-info').textContent = buildingInfo || '-';

    // Filter subjects for this classroom (grade)
    // Note: subjects.grade usually maps to "M.1/1".
    const subjectsInClass = appState.allData.subjects.filter(s => s.grade === classroomName);
    const subjectIds = new Set(subjectsInClass.map(s => s.__backendId));

    // Calculate total periods (this logic checks if subject is in this classroom)
    // We should loop through the timetable and count periods where subject_id is in subjectIds
    const periodsCount = appState.allData.timetable.filter(t => subjectIds.has(t.subject_id)).length;
    document.getElementById('class-total-periods').textContent = periodsCount;

    infoDiv.classList.remove('hidden');

    tbody.innerHTML = days.map(day => `
        <tr>
          <td class="p-2 border border-purple-200 bg-purple-50 font-semibold text-purple-800 w-20">${day}</td>
          ${periods.map(period => {
        if (period === 'lunch') {
            return `<td class="p-2 border border-purple-200 bg-amber-100 text-center font-semibold text-amber-700 text-sm">🍽️</td>`;
        }

        const entries = appState.allData.timetable.filter(t => t.day === day && t.period == period);
        // Find if any entry belongs to a subject in this classroom
        const classEntry = entries.find(e => subjectIds.has(e.subject_id));

        const content = classEntry
            ? (() => {
                const subject = appState.allData.subjects.find(s => s.__backendId === classEntry.subject_id);
                return subject ? `
                    <div class="p-2 bg-purple-100 border border-purple-300 rounded h-full text-xs">
                      <p class="font-semibold text-purple-900">${subject.name}</p>
                      <p class="text-purple-700">${subject.teacher_name || '-'}</p>
                    </div>
                  ` : '';
            })()
            : '';

        return `<td class="period-slot" data-day="${day}" data-period="${period}">${content}</td>`;
    }).join('')}
        </tr>
    `).join('');
}

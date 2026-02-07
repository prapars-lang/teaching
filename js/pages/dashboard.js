// Dashboard Page Logic

window.renderPage = function () {
    renderDashboard();
    // Re-render periodically? No, only on data load.
}

function renderDashboard() {
    setText('stat-teachers', appState.allData.teachers.length);
    setText('stat-subjects', appState.allData.subjects.length);
    setText('stat-classrooms', appState.allData.classrooms.length);
    setText('stat-periods', appState.allData.timetable.length);
    renderDepartmentChart();
    renderBuildingChart();
    renderAlerts();
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
        chart.innerHTML = '<p class="text-gray-500 text-center py-4">ยังไม่มีข้อมูล</p>';
        return;
    }

    // Sort by count desc
    const sorted = Object.entries(depts).sort((a, b) => b[1] - a[1]);

    chart.innerHTML = sorted.map(([dept, count]) => `
        <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          <span class="text-gray-700 font-medium">${dept}</span>
          <span class="px-3 py-1 bg-green-200 text-green-800 rounded-full font-bold shadow-sm">${count}</span>
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
        chart.innerHTML = '<p class="text-gray-500 text-center py-4">ยังไม่มีข้อมูล</p>';
        return;
    }

    const sorted = Object.entries(buildings).sort((a, b) => b[1] - a[1]);

    chart.innerHTML = sorted.map(([building, count]) => `
        <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          <span class="text-gray-700 font-medium flex items-center gap-2">
            <span>🏢</span> ${building}
          </span>
          <span class="px-3 py-1 bg-blue-200 text-blue-800 rounded-full font-bold shadow-sm">${count} ห้อง</span>
        </div>
    `).join('');
}

function renderAlerts() {
    const container = document.getElementById('alerts-container');
    if (!container) return;
    const alerts = [];

    // Conflict Check
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
                message: `⚠️ คาบสอนซ้ำซ้อนในวัน${key.split('-')[0]} คาบที่ ${key.split('-')[1]} (${entries.length} วิชา)`
            });
        }
    });

    // Teacher Load Check
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
        const maxPeriods = teacherData?.max_periods || 30; // Default to 30 if not set
        if (load > maxPeriods) {
            alerts.push({
                type: 'overload',
                message: `⚠️ ครู${teacher} มีคาบสอนเกินกำหนด (${load}/${maxPeriods} คาบ)`
            });
        }
    });

    if (alerts.length === 0) {
        // Optional: clear or show success
        container.innerHTML = '';
        return;
    }

    container.innerHTML = alerts.map(alert => `
        <div class="alert-box p-4 bg-amber-100 rounded-lg text-amber-800 font-medium border-l-4 border-amber-500 mb-2 flex items-start gap-2 shadow-sm">
          <span>${alert.type === 'conflict' ? '🔥' : '⚡'}</span>
          <span>${alert.message}</span>
        </div>
    `).join('');
}

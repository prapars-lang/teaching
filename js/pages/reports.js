// Reports Page Logic

window.renderPage = function () {
    renderTeacherLoadChart();
    renderDeptStatsChart();
}

function renderTeacherLoadChart() {
    const container = document.getElementById('teacher-load-chart');
    if (!container) return;

    // Calculate Loads
    const teacherLoads = {};
    appState.allData.timetable.forEach(t => {
        const subject = appState.allData.subjects.find(s => s.__backendId === t.subject_id);
        if (subject) {
            const name = subject.teacher_name || 'Unassigned';
            teacherLoads[name] = (teacherLoads[name] || 0) + 1;
        }
    });

    if (Object.keys(teacherLoads).length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-12">ไม่มีข้อมูลการสอน</p>';
        return;
    }

    // Convert to Array & Sort
    const sorted = Object.entries(teacherLoads).sort((a, b) => b[1] - a[1]);

    // Simple Bar Chart Visualization (HTML/CSS)
    const maxLoad = Math.max(...Object.values(teacherLoads));

    container.innerHTML = sorted.map(([teacher, load]) => {
        const percent = (load / maxLoad) * 100;
        const teacherData = appState.allData.teachers.find(t => t.name === teacher);
        const limit = teacherData?.max_periods || 30;
        const isOverload = load > limit;

        return `
        <div class="mb-3">
            <div class="flex justify-between text-sm mb-1">
                <span class="font-medium text-gray-700">${teacher}</span>
                <span class="${isOverload ? 'text-red-600 font-bold' : 'text-gray-600'}">${load}/${limit} คาบ</span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-2.5">
                <div class="h-2.5 rounded-full ${isOverload ? 'bg-red-500' : 'bg-green-500'}" 
                     style="width: ${percent}%"></div>
            </div>
        </div>
        `;
    }).join('');
}

function renderDeptStatsChart() {
    const container = document.getElementById('dept-stats-chart');
    if (!container) return;

    // Calculate Dept Stats (Teachers count & Total Periods)
    const deptStats = {};

    // Initialize Depts
    appState.allData.teachers.forEach(t => {
        const dept = t.department || 'อื่นๆ';
        if (!deptStats[dept]) deptStats[dept] = { teachers: 0, periods: 0 };
        deptStats[dept].teachers++;
    });

    // Count Periods
    appState.allData.timetable.forEach(t => {
        const subject = appState.allData.subjects.find(s => s.__backendId === t.subject_id);
        if (subject && subject.teacher_name) {
            const teacher = appState.allData.teachers.find(tr => tr.name === subject.teacher_name);
            const dept = teacher?.department || 'อื่นๆ';
            if (!deptStats[dept]) deptStats[dept] = { teachers: 0, periods: 0 };
            deptStats[dept].periods++;
        }
    });

    if (Object.keys(deptStats).length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-12">ไม่มีข้อมูลกลุ่มสาระ</p>';
        return;
    }

    const sorted = Object.entries(deptStats).sort((a, b) => b[1].periods - a[1].periods);

    container.innerHTML = sorted.map(([dept, stats]) => `
        <div class="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div class="flex-1">
                <p class="font-bold text-gray-800">${dept}</p>
                <p class="text-xs text-gray-500">ครู ${stats.teachers} คน</p>
            </div>
            <div class="text-right">
                <span class="text-xl font-bold text-green-700">${stats.periods}</span>
                <span class="text-xs text-green-600 block">คาบสอนรวม</span>
            </div>
        </div>
    `).join('');
}

// Export Functions
window.exportTimetable = function (format) {
    if (appState.allData.timetable.length === 0) {
        showToast('ไม่พบข้อมูลตารางสอนเพื่อส่งออก', 'error');
        return;
    }

    showToast(`กำลังเตรียมข้อมูลสำหรับส่งออก ${format.toUpperCase()}...`, 'info');

    setTimeout(() => {
        if (format === 'json') {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState.allData, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "timetable_backup_" + new Date().toISOString().slice(0, 10) + ".json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            showToast('ส่งออกไฟล์ JSON เรียบร้อย');
        } else {
            // Placeholder for PDF/Excel generation
            // In a real app, we might use libraries like jsPDF or SheetJS here.
            alert(`ฟังก์ชันส่งออก ${format.toUpperCase()} ยังไม่เปิดใช้งานในเวอร์ชัน Demo\n(แต่ข้อมูลพร้อมสำหรับ Export แล้ว)`);
            showToast(`ส่งออก ${format.toUpperCase()} เสร็จสิ้น (จำลอง)`);
        }
    }, 1000);
};

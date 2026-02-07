// Teacher Detail Page Logic

window.renderPage = function () {
    const urlParams = new URLSearchParams(window.location.search);
    const teacherId = urlParams.get('id');

    if (!teacherId) {
        alert('ไม่พบข้อมูลครู (Missing ID)');
        window.location.href = 'teachers.html';
        return;
    }

    renderTeacherDetail(teacherId);
}

async function renderTeacherDetail(teacherId) {
    // 1. Find Teacher Data
    // Ensure data is loaded (common.js usually handles this, but just in case)
    if (!appState.allData.teachers || appState.allData.teachers.length === 0) {
        // Wait or might be loading? appState usually ready by renderPage
        // If deep link, might be issue. But for now assume ready.
    }

    const teacher = appState.allData.teachers.find(t => t.__backendId === teacherId || t.id === teacherId);

    const loadingEl = document.getElementById('teacher-profile-loading');
    const contentEl = document.getElementById('teacher-profile-content');

    if (!teacher) {
        loadingEl.innerHTML = '<p class="text-red-500">ไม่พบข้อมูลครูในระบบ</p>';
        return;
    }

    // 2. Render Profile
    document.getElementById('detail-name').textContent = teacher.name;
    document.getElementById('detail-department').textContent = teacher.department || '-';
    document.getElementById('detail-phone').textContent = teacher.phone || '-';
    document.getElementById('detail-building').textContent = teacher.building || '-';
    document.getElementById('detail-max-periods').textContent = (teacher.max_periods || '-') + ' คาบ';

    const unavailableContainer = document.getElementById('detail-unavailable');
    if (teacher.unavailable_times && teacher.unavailable_times.length > 0) {
        unavailableContainer.innerHTML = teacher.unavailable_times.map(u =>
            `<span class="px-2 py-1 bg-red-50 text-red-600 rounded text-xs border border-red-100">${u.text}</span>`
        ).join('');
    } else {
        unavailableContainer.innerHTML = '<span class="text-gray-400">-</span>';
    }

    // Toggle Visibility
    loadingEl.classList.add('hidden');
    contentEl.classList.remove('hidden');

    // 3. Render Timetable
    renderTeacherTimetable(teacher.name);
}

function renderTeacherTimetable(teacherName) {
    const tbody = document.getElementById('teacher-detail-timetable-tbody');
    if (!tbody) return;

    const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];
    const periods = [1, 2, 3, 4, 'lunch', 5, 6, 7, 8];

    // Filter Logic reuse
    tbody.innerHTML = days.map(day => `
        <tr>
          <td class="p-2 border border-green-200 bg-green-50 font-semibold text-green-800 w-20 text-center">${day}</td>
          ${periods.map(period => {
        if (period === 'lunch') {
            return `<td class="p-2 border border-green-200 bg-amber-100/50 text-center font-semibold text-amber-700 text-sm vertical-text">พัก</td>`;
        }

        // Find timetable entries for this slot
        const entries = appState.allData.timetable.filter(t => t.day === day && t.period == period);

        // Filter for this teacher
        const teacherSubjects = entries.filter(e => {
            const subject = appState.allData.subjects.find(s => s.__backendId === e.subject_id);
            return subject?.teacher_name === teacherName;
        });

        if (teacherSubjects.length > 0) {
            const entry = teacherSubjects[0];
            const subject = appState.allData.subjects.find(s => s.__backendId === entry.subject_id);
            const room = entry.room || subject?.room || 'TBD'; // Fallback if room filtering logic exists

            return `
                    <td class="border border-green-100 bg-green-50/50 p-1 align-top h-24">
                        <div class="p-2 bg-green-100 border border-green-300 rounded h-full text-xs shadow-sm">
                            <p class="font-bold text-green-900 truncate" title="${subject?.name}">${subject?.name || '-'}</p>
                            <div class="flex justify-between mt-1 items-center">
                                <p class="text-green-700 font-mono">${subject?.code}</p>
                                <span class="px-1.5 py-0.5 bg-green-200 text-green-800 rounded text-[10px]">${subject?.grade}</span>
                            </div>
                            <p class="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                                <span>🏢</span> ${room}
                            </p>
                        </div>
                    </td>
                  `;
        } else {
            return `<td class="border border-green-100 bg-white p-1 h-24"></td>`;
        }
    }).join('')}
        </tr>
    `).join('');
}

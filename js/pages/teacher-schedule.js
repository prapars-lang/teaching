// Teacher Schedule Page Logic

window.renderPage = function () {
    renderTeacherSelect();
}

function renderTeacherSelect() {
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
            document.getElementById('teacher-timetable-tbody').innerHTML = '<tr class="text-center text-gray-400"><td colspan="9" class="py-12">กรุณาเลือกครูผู้สอน</td></tr>';
            return;
        }
        renderTeacherGrid(e.target.value);
    };
}

function renderTeacherGrid(teacherName) {
    const tbody = document.getElementById('teacher-timetable-tbody');
    const infoDiv = document.getElementById('teacher-grid-info');
    if (!tbody || !infoDiv) return;

    // Filter Logic
    const teacherPeriodCount = appState.allData.timetable.filter(t => {
        const subject = appState.allData.subjects.find(s => s.__backendId === t.subject_id);
        return subject?.teacher_name === teacherName && t.period !== 'lunch';
    }).length;

    document.getElementById('grid-total-periods').textContent = teacherPeriodCount;
    infoDiv.classList.remove('hidden');

    tbody.innerHTML = days.map(day => `
        <tr>
          <td class="p-2 border border-green-200 bg-green-50 font-semibold text-green-800 w-20 text-center">${day}</td>
          ${periods.map(period => {
        if (period === 'lunch') {
            return `<td class="p-2 border border-green-200 bg-amber-100/50 text-center font-semibold text-amber-700 text-sm vertical-text">พัก</td>`;
        }

        const entries = appState.allData.timetable.filter(t => t.day === day && t.period == period);
        const teacherSubjects = entries.filter(e => {
            const subject = appState.allData.subjects.find(s => s.__backendId === e.subject_id);
            return subject?.teacher_name === teacherName;
        });

        const content = teacherSubjects.length > 0
            ? (() => {
                const subject = appState.allData.subjects.find(s => s.__backendId === teacherSubjects[0].subject_id);
                // Also get room from timetable if available? Assuming 'room' field in timetable or classroom lookup
                const room = teacherSubjects[0].room || 'TBD';

                return `
                    <div class="p-2 bg-green-100 border border-green-300 rounded h-full text-xs">
                      <p class="font-bold text-green-900 truncate">${subject?.name || '-'}</p>
                      <div class="flex justify-between mt-1">
                          <p class="text-green-700">${subject?.code}</p>
                          <p class="text-green-700 font-medium">${subject?.grade}</p>
                      </div>
                      <p class="text-[10px] text-gray-500 mt-0.5">ห้อง: ${room}</p>
                    </div>
                  `;
            })()
            : '';

        return `<td class="period-slot border border-green-100 bg-white/50 p-1 align-top h-24" data-day="${day}" data-period="${period}">${content}</td>`;
    }).join('')}
        </tr>
    `).join('');
}

// Classroom Schedule Page Logic

window.renderPage = function () {
    renderClassroomSelect();
}

function renderClassroomSelect() {
    const select = document.getElementById('classroom-select-grid');
    if (!select) return;

    if (appState.allData.classrooms.length === 0) {
        select.innerHTML = '<option value="">-- ไม่มีห้องเรียน --</option>';
        return;
    }

    select.innerHTML = '<option value="">-- เลือกห้องเรียน --</option>' +
        appState.allData.classrooms.map(c => `<option value="${c.__backendId}">${c.classroom_name}</option>`).join('');

    select.onchange = (e) => {
        if (!e.target.value) {
            document.getElementById('classroom-grid-info').classList.add('hidden');
            document.getElementById('classroom-timetable-tbody').innerHTML = '<tr class="text-center text-gray-400"><td colspan="9" class="py-12">กรุณาเลือกห้องเรียน</td></tr>';
            return;
        }
        renderClassroomGrid(e.target.value);
    };
}

function renderClassroomGrid(classroomId) {
    const tbody = document.getElementById('classroom-timetable-tbody');
    const infoDiv = document.getElementById('classroom-grid-info');
    if (!tbody || !infoDiv) return;

    // Need to find classroom name for filtering? 
    // Or filter by ID? 
    // The Timetable store usually has 'room' field string or ID?
    // In `handleDrop` we set `room: 'TBD'`.
    // So current data might not have room info linked correctly yet unless we implemented room assignment.
    // BUT, if we assume we filter by `room` field matching classroom name (legacy logic maybe?)
    // Let's check `classrooms` data.
    const classroom = appState.allData.classrooms.find(c => c.__backendId === classroomId);
    if (!classroom) return;

    // Filter Logic: Match `room` field in timetable with classroom name
    const classroomPeriodCount = appState.allData.timetable.filter(t => {
        return t.room === classroom.classroom_name && t.period !== 'lunch';
    }).length;

    document.getElementById('classroom-total-periods').textContent = classroomPeriodCount;
    infoDiv.classList.remove('hidden');

    tbody.innerHTML = days.map(day => `
        <tr>
          <td class="p-2 border border-blue-200 bg-blue-50 font-semibold text-blue-800 w-20 text-center">${day}</td>
          ${periods.map(period => {
        if (period === 'lunch') {
            return `<td class="p-2 border border-blue-200 bg-amber-100/50 text-center font-semibold text-amber-700 text-sm vertical-text">พัก</td>`;
        }

        const entries = appState.allData.timetable.filter(t => t.day === day && t.period == period && t.room === classroom.classroom_name);

        const content = entries.length > 0
            ? (() => {
                const subject = appState.allData.subjects.find(s => s.__backendId === entries[0].subject_id);
                return `
                    <div class="p-2 bg-blue-100 border border-blue-300 rounded h-full text-xs">
                      <p class="font-bold text-blue-900 truncate">${subject?.name || '-'}</p>
                      <div class="flex justify-between mt-1">
                          <p class="text-blue-700">${subject?.code}</p>
                          <p class="text-blue-700 font-medium">${subject?.grade}</p>
                      </div>
                      <p class="text-[10px] text-gray-500 mt-0.5">ครู: ${subject?.teacher_name || '-'}</p>
                    </div>
                  `;
            })()
            : '';

        return `<td class="period-slot border border-blue-100 bg-white/50 p-1 align-top h-24" data-day="${day}" data-period="${period}">${content}</td>`;
    }).join('')}
        </tr>
    `).join('');
}

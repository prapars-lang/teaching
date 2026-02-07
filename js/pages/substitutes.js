// Substitutes Page Logic

window.renderPage = function () {
    renderSubstituteFormDropdowns();
    renderSubstituteHistoryDropdown();
}

function renderSubstituteFormDropdowns() {
    const teacherSelect = document.getElementById('sub-leaving-teacher');
    const subTeacherSelect = document.getElementById('sub-teacher');

    if (!teacherSelect || !subTeacherSelect) return;

    if (appState.allData.teachers.length === 0) {
        teacherSelect.innerHTML = '<option value="">-- ไม่มีข้อมูลครู --</option>';
        return;
    }

    const options = appState.allData.teachers.map(t => `<option value="${t.name}">${t.name}</option>`).join('');
    teacherSelect.innerHTML = '<option value="">-- เลือกครูที่ลา --</option>' + options;
    subTeacherSelect.innerHTML = '<option value="">-- เลือกครูสอนแทน --</option>' + options;

    // Logic to suggest teachers based on availability when date/period/teacher is selected
    // For now, basic list.
}

function renderSubstituteHistoryDropdown() {
    const select = document.getElementById('teacher-history-select');
    if (!select) return;

    if (appState.allData.teachers.length === 0) {
        select.innerHTML = '<option value="">-- ไม่มีข้อมูลครู --</option>';
        return;
    }

    select.innerHTML = '<option value="">-- เลือกครูเพื่อดูประวัติ --</option>' +
        appState.allData.teachers.map(t => `<option value="${t.name}">${t.name}</option>`).join('');

    select.onchange = (e) => {
        if (!e.target.value) {
            document.getElementById('substitute-history').innerHTML = '<p class="text-center text-gray-500 py-8">เลือกครูเพื่อดูประวัติ</p>';
            return;
        }
        renderSubstituteHistory(e.target.value);
    };
}

function renderSubstituteHistory(teacherName) {
    const container = document.getElementById('substitute-history');
    if (!container) return;

    // Filter substitutes where 'teacherName' is the LEAVING teacher
    // We need to store who is leaving.
    // In our current simple schema, we might not have a dedicated 'substitutes' table in backend with structure.
    // Let's assume there is one or we are simulating it.
    // app.js simulated it via `appState.allData.substitutes`.

    // Check if 'substitutes' exists in appState
    if (!appState.allData.substitutes) appState.allData.substitutes = [];

    const subs = appState.allData.substitutes.filter(s => s.leaving_teacher === teacherName)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Note: If we don't have 'leaving_teacher' field in data, we can't filter accurately.
    // For now, let's assume we save it.

    if (subs.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 py-8">ไม่มีประวัติการสอนแทน</p>';
        return;
    }

    container.innerHTML = subs.map(s => `
        <div class="p-4 rounded-lg border border-amber-200 bg-amber-50 shadow-sm">
          <div class="flex justify-between items-start">
            <div>
                 <p class="font-bold text-gray-800">📅 ${s.date}</p>
                 <p class="text-sm text-gray-600">คาบ ${s.period} (${s.day})</p>
                 <p class="text-sm text-red-600 mt-1">เหตุผล: ${s.reason}</p>
            </div>
            <div class="text-right">
                <p class="text-xs text-gray-500">ครูแทน</p>
                <p class="font-bold text-green-700">${s.substitute_teacher}</p>
            </div>
          </div>
        </div>
    `).join('');
}

// Form Handling
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('substitute-form');
    if (form) {
        form.addEventListener('submit', handleAddSubstitute);
    }
});

async function handleAddSubstitute(e) {
    e.preventDefault();

    const leavingTeacher = document.getElementById('sub-leaving-teacher').value;
    const subTeacher = document.getElementById('sub-teacher').value;
    const date = document.getElementById('sub-date').value;
    const day = document.getElementById('sub-day').value;
    const period = document.getElementById('sub-period').value;
    const reason = document.getElementById('sub-reason').value;

    if (leavingTeacher === subTeacher) {
        showToast('ครูที่ลาและครูสอนแทนต้องเป็นคนละคนกัน', 'error');
        return;
    }

    const newSub = {
        date,
        day,
        period,
        leaving_teacher: leavingTeacher,
        substitute_teacher: subTeacher,
        reason
    };

    try {
        // Backend Insert (If table exists)
        const { data, error } = await appSupabaseClient.from('substitutes').insert([newSub]).select().single();
        if (error) throw error;

        // Update Local
        if (!appState.allData.substitutes) appState.allData.substitutes = [];
        appState.allData.substitutes.push({ ...data, __backendId: data.id });

        showToast('บันทึกการสอนแทนเรียบร้อย');
        document.getElementById('substitute-form').reset();

        // Refresh History if viewing same teacher
        const historySelect = document.getElementById('teacher-history-select');
        if (historySelect.value === leavingTeacher) {
            renderSubstituteHistory(leavingTeacher);
        }

    } catch (err) {
        console.error(err); // Likely table missing if we didn't create it
        showToast('บันทึกไม่สำเร็จ (อาจยังไม่มีตาราง substitutes ในฐานข้อมูล)', 'error');

        // Fallback for demo: just push to state
        if (!appState.allData.substitutes) appState.allData.substitutes = [];
        appState.allData.substitutes.push(newSub);
        renderSubstituteHistory(leavingTeacher);
    }
}

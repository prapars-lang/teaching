// Subjects Page Logic

window.renderPage = function () {
    renderSubjectsTable();
    populateTeacherSelect();
}

function renderSubjectsTable() {
    const tbody = document.getElementById('subjects-tbody');
    if (!tbody) return;
    const search = (document.getElementById('search-subjects')?.value || '').toLowerCase();

    let filtered = appState.allData.subjects;
    if (search) {
        filtered = filtered.filter(s =>
            s.code.toLowerCase().includes(search) ||
            s.name.toLowerCase().includes(search) ||
            (s.teacher_name || '').toLowerCase().includes(search)
        );
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr class="text-center text-gray-500"><td colspan="7" class="py-8">ยังไม่มีข้อมูล</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(s => `
        <tr class="hover:bg-gray-50 transition-colors">
          <td class="px-4 py-3 font-medium text-gray-900">${s.code}</td>
          <td class="px-4 py-3">${s.name}</td>
          <td class="px-4 py-3 text-gray-600">${s.teacher_name || '-'}</td>
          <td class="px-4 py-3"><span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">${s.grade || '-'}</span></td>
          <td class="px-4 py-3 text-center">${s.hours || 1}</td>
          <td class="px-4 py-3 text-sm text-gray-500">${s.required_room_type || 'ทั่วไป'}</td>
          <td class="px-4 py-3 text-center">
            <button onclick="deleteSubject('${s.__backendId}')" class="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200">
                🗑️ ลบ
            </button>
          </td>
        </tr>
    `).join('');
}

function populateTeacherSelect() {
    const select = document.getElementById('subject-teacher');
    if (!select) return;

    // Check if teachers loaded
    if (appState.allData.teachers.length === 0) {
        select.innerHTML = '<option value="">ไม่พบข้อมูลครู</option>';
        return;
    }

    select.innerHTML = '<option value="">-- เลือกครูผู้สอน --</option>' +
        appState.allData.teachers.map(t => `<option value="${t.name}">${t.name}</option>`).join('');
}

// Global Modals
window.openAddSubjectModal = () => {
    populateTeacherSelect(); // Ensure fresh list
    document.getElementById('add-subject-modal').classList.remove('hidden');
}
window.closeAddSubjectModal = () => document.getElementById('add-subject-modal').classList.add('hidden');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Add Subject Form
    const form = document.getElementById('add-subject-form');
    if (form) {
        form.addEventListener('submit', handleAddSubject);
    }

    // Search
    const search = document.getElementById('search-subjects');
    if (search) {
        search.addEventListener('input', renderSubjectsTable);
    }
});

async function handleAddSubject(e) {
    e.preventDefault();
    try {
        const newSubject = {
            code: document.getElementById('subject-code').value,
            name: document.getElementById('subject-name').value,
            grade: document.getElementById('subject-grade').value,
            teacher_name: document.getElementById('subject-teacher').value,
            hours: parseInt(document.getElementById('subject-hours').value) || 1,
            type: document.getElementById('subject-type').value,
            required_room_type: document.getElementById('subject-room-type').value || null
        };

        showToast('กำลังบันทึก...', 'info');
        const { data, error } = await appSupabaseClient.from('subjects').insert([newSubject]).select().single();
        if (error) throw error;

        showToast('เพิ่มรายวิชาเรียบร้อยแล้ว');
        closeAddSubjectModal();
        document.getElementById('add-subject-form').reset();

        // Update Local State
        appState.allData.subjects.push({ ...data, __backendId: data.id, type: 'subject' });
        renderSubjectsTable();

    } catch (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
}

window.deleteSubject = async function (id) {
    showConfirmModal('ลบรายวิชา', 'คุณต้องการลบรายวิชานี้หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้', async () => {
        try {
            showToast('กำลังลบ...', 'info');
            const { error } = await appSupabaseClient.from('subjects').delete().eq('id', id);
            if (error) throw error;

            appState.allData.subjects = appState.allData.subjects.filter(s => s.__backendId !== id);
            renderSubjectsTable();
            showToast('ลบรายวิชาเรียบร้อยแล้ว');
        } catch (err) {
            console.error(err);
            showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
        }
    });
};

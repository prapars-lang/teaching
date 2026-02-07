// Teachers Page Logic

window.renderPage = function () {
    renderTeachersTable();
}

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
        <tr class="hover:bg-gray-50 transition-colors">
          <td class="px-4 py-3 font-medium text-gray-900">${t.name}</td>
          <td class="px-4 py-3"><span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">${t.department || '-'}</span></td>
          <td class="px-4 py-3 text-gray-600">${t.phone || '-'}</td>
          <td class="px-4 py-3 text-gray-600">${t.building || '-'}</td>
          <td class="px-4 py-3 text-gray-600">${t.max_periods || '-'}</td>
          <td class="px-4 py-3 text-sm text-gray-500">${t.unavailable_times?.length ? t.unavailable_times.map(u => u.text).join(', ') : '-'}</td>
          <td class="px-4 py-3 text-center">
            <button onclick="deleteTeacher('${t.__backendId}')" class="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200">
                🗑️ ลบ
            </button>
          </td>
        </tr>
    `).join('');
}

// Global Modals
window.openAddTeacherModal = () => document.getElementById('add-teacher-modal').classList.remove('hidden');
window.closeAddTeacherModal = () => document.getElementById('add-teacher-modal').classList.add('hidden');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Add Teacher Form
    const form = document.getElementById('add-teacher-form');
    if (form) {
        form.addEventListener('submit', handleAddTeacher);
    }

    // Search
    const search = document.getElementById('search-teachers');
    if (search) {
        search.addEventListener('input', renderTeachersTable);
    }
});

async function handleAddTeacher(e) {
    e.preventDefault();
    try {
        const newTeacher = {
            name: document.getElementById('teacher-name').value,
            department: document.getElementById('teacher-department').value,
            phone: document.getElementById('teacher-phone').value,
            building: document.getElementById('teacher-building').value,
            max_periods: parseInt(document.getElementById('teacher-max-periods').value) || 30,
            unavailable_times: document.getElementById('teacher-unavailable').value ? [{ text: document.getElementById('teacher-unavailable').value }] : []
        };

        showToast('กำลังบันทึก...', 'info');
        const { data, error } = await appSupabaseClient.from('teachers').insert([newTeacher]).select().single();
        if (error) throw error;

        showToast('เพิ่มครูเรียบร้อยแล้ว');
        closeAddTeacherModal();
        document.getElementById('add-teacher-form').reset();

        // Update Local State
        appState.allData.teachers.push({ ...data, __backendId: data.id, type: 'teacher' });
        renderTeachersTable();

    } catch (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
}

window.deleteTeacher = async function (id) {
    showConfirmModal('ลบข้อมูลครู', 'คุณต้องการลบรายชื่อครูนี้หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้', async () => {
        try {
            showToast('กำลังลบ...', 'info');
            const { error } = await appSupabaseClient.from('teachers').delete().eq('id', id);
            if (error) throw error;

            appState.allData.teachers = appState.allData.teachers.filter(t => t.__backendId !== id);
            renderTeachersTable();
            showToast('ลบครูเรียบร้อยแล้ว');
        } catch (err) {
            console.error(err);
            showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
        }
    });
};

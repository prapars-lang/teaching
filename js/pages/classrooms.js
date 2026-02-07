// Classrooms Page Logic

window.renderPage = function () {
    renderClassroomsTable();
}

function renderClassroomsTable() {
    const tbody = document.getElementById('classrooms-tbody');
    if (!tbody) return;
    const search = (document.getElementById('search-classrooms')?.value || '').toLowerCase();

    let filtered = appState.allData.classrooms;
    if (search) {
        filtered = filtered.filter(c =>
            c.classroom_name.toLowerCase().includes(search) ||
            (c.building_name || '').toLowerCase().includes(search)
        );
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr class="text-center text-gray-500"><td colspan="5" class="py-8">ยังไม่มีข้อมูล</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(c => `
        <tr class="hover:bg-gray-50 transition-colors">
          <td class="px-4 py-3 font-medium text-gray-900">${c.classroom_name}</td>
          <td class="px-4 py-3 text-gray-600">${c.building_name || '-'}</td>
          <td class="px-4 py-3 text-center">${c.capacity || 40}</td>
          <td class="px-4 py-3 text-gray-500">${c.type || 'Normal'}</td>
          <td class="px-4 py-3 text-center">
            <button onclick="deleteClassroom('${c.__backendId}')" class="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200">
                🗑️ ลบ
            </button>
          </td>
        </tr>
    `).join('');
}

// Global Modals
window.openAddClassroomModal = () => document.getElementById('add-classroom-modal').classList.remove('hidden');
window.closeAddClassroomModal = () => document.getElementById('add-classroom-modal').classList.add('hidden');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Add Classroom Form
    const form = document.getElementById('add-classroom-form');
    if (form) {
        form.addEventListener('submit', handleAddClassroom);
    }

    // Search
    const search = document.getElementById('search-classrooms');
    if (search) {
        search.addEventListener('input', renderClassroomsTable);
    }
});

async function handleAddClassroom(e) {
    e.preventDefault();
    try {
        const newClassroom = {
            classroom_name: document.getElementById('classroom-name').value,
            building_name: document.getElementById('classroom-building').value,
            capacity: parseInt(document.getElementById('classroom-capacity').value) || 40,
            type: document.getElementById('classroom-type').value
        };

        showToast('กำลังบันทึก...', 'info');
        const { data, error } = await appSupabaseClient.from('classrooms').insert([newClassroom]).select().single();
        if (error) throw error;

        showToast('เพิ่มห้องเรียนเรียบร้อยแล้ว');
        closeAddClassroomModal();
        document.getElementById('add-classroom-form').reset();

        // Update Local State
        appState.allData.classrooms.push({ ...data, __backendId: data.id, type: 'classroom' });
        renderClassroomsTable();

    } catch (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
}

window.deleteClassroom = async function (id) {
    showConfirmModal('ลบห้องเรียน', 'คุณต้องการลบห้องเรียนนี้หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้', async () => {
        try {
            showToast('กำลังลบ...', 'info');
            const { error } = await appSupabaseClient.from('classrooms').delete().eq('id', id);
            if (error) throw error;

            appState.allData.classrooms = appState.allData.classrooms.filter(c => c.__backendId !== id);
            renderClassroomsTable();
            showToast('ลบห้องเรียนเรียบร้อยแล้ว');
        } catch (err) {
            console.error(err);
            showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
        }
    });
};

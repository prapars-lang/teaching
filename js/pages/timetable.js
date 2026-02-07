// Timetable Page Logic (Drag & Drop + Scheduler)

let dragSrcEl = null;
let draggedSubjectId = null;

window.renderPage = function () {
    renderTimetable();
    renderSubjectPool();
}

// --- DRAG & DROP HANDLERS ---
window.handleDragStart = function (e) {
    dragSrcEl = e.target;
    draggedSubjectId = e.target.getAttribute('data-subject-id');
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', draggedSubjectId);
    e.target.classList.add('opacity-50');
};

window.handleDragEnd = function (e) {
    e.target.classList.remove('opacity-50');
    document.querySelectorAll('.drop-zone').forEach(zone => {
        zone.classList.remove('drag-over');
    });
    dragSrcEl = null;
    draggedSubjectId = null;
};

window.handleDragOver = function (e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    // Highlight drop zone
    e.currentTarget.classList.add('drag-over');
    return false;
};

window.handleDragLeave = function (e) {
    e.currentTarget.classList.remove('drag-over');
};

window.handleDrop = async function (e) {
    if (e.stopPropagation) e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');

    const subjectId = e.dataTransfer.getData('text/plain');
    const day = e.currentTarget.getAttribute('data-day');
    const period = parseInt(e.currentTarget.getAttribute('data-period'));

    if (!subjectId || !day || !period) return false;

    // Check if slot is occupied
    const existing = appState.allData.timetable.find(t => t.day === day && t.period == period);
    if (existing) {
        // Optional: Confirm replacement?
        if (!confirm('สล็อตนี้มีวิชาอยู่แล้ว ต้องการแทนที่หรือไม่?')) return false;
        // Delete existing first if implementing replacement logic, or update
        // For now, let's just proceed to Update/Upsert
    }

    // Identify Subject & Teacher
    const subject = appState.allData.subjects.find(s => s.__backendId === subjectId);
    if (!subject) return false;

    // CONSTRAINT CHECK (New Phase 2 Feature)
    if (window.Constraints) {
        const validation = window.Constraints.validateSlot(subject, day, period, appState.allData.timetable);
        if (!validation.valid) {
            showToast(`ไม่สามารถลงวิชาได้: ${validation.reason}`, 'error');
            return false;
        }
    }

    // Optimistic UI Update
    // showToast('กำลังบันทึก...', 'info'); // Too noisy?

    try {
        // Delete any existing entry for this slot (to be safe/clean)
        if (existing) {
            await appSupabaseClient.from('timetable').delete().eq('id', existing.__backendId);
        }

        const newEntry = {
            day: day,
            period: period,
            subject_id: subjectId,
            room: 'TBD' // Default, or handle room assignment later
            // We need to store teacher_id or name? 
            // In original app, we just stored subject_id and joined.
        };

        const { data, error } = await appSupabaseClient.from('timetable').insert([newEntry]).select().single();
        if (error) throw error;

        // Update Local State
        if (existing) {
            appState.allData.timetable = appState.allData.timetable.filter(t => t.__backendId !== existing.__backendId);
        }
        appState.allData.timetable.push({ ...data, __backendId: data.id, type: 'timetable' });

        renderTimetable();
        renderSubjectPool(); // Update availability visual
        showToast('บันทึกตารางสอนเรียบร้อย');

    } catch (err) {
        console.error(err);
        showToast('บันทึกไม่สำเร็จ: ' + err.message, 'error');
        renderTimetable(); // Revert UI
    }

    return false;
};

// --- RENDERERS ---

function renderSubjectPool() {
    const pool = document.getElementById('subject-pool');
    if (!pool) return;
    const filterGrade = document.getElementById('timetable-filter-grade')?.value;

    // Calculate Usage
    const subjectUsage = {};
    appState.allData.timetable.forEach(t => {
        subjectUsage[t.subject_id] = (subjectUsage[t.subject_id] || 0) + 1;
    });

    let filteredSubjects = appState.allData.subjects;
    if (filterGrade) {
        filteredSubjects = filteredSubjects.filter(s => s.grade === filterGrade);
    }

    // Sort: Available first
    filteredSubjects.sort((a, b) => {
        const aFull = (subjectUsage[a.__backendId] || 0) >= (a.hours || 1);
        const bFull = (subjectUsage[b.__backendId] || 0) >= (b.hours || 1);
        return aFull - bFull;
    });


    if (filteredSubjects.length === 0) {
        pool.innerHTML = '<p class="text-gray-500 text-sm italic text-center p-4">ไม่มีรายวิชา' + (filterGrade ? 'สำหรับชั้นนี้' : '') + '</p>';
        return;
    }

    pool.innerHTML = filteredSubjects.map(s => {
        const used = subjectUsage[s.__backendId] || 0;
        const total = s.hours || 1;
        const isFull = used >= total;

        return `
        <div class="draggable-card px-4 py-3 rounded-lg font-medium text-white cursor-grab active:cursor-grabbing mb-2 shadow-sm relative overflow-hidden"
             style="background: ${isFull ? '#9ca3af' : 'linear-gradient(135deg, #16a34a, #15803d)'}"
             data-subject-id="${s.__backendId}"
             draggable="${isFull ? 'false' : 'true'}"
             ondragstart="window.handleDragStart(event)"
             ondragend="window.handleDragEnd(event)">
             
          <div class="flex justify-between items-start relative z-10">
              <div>
                <p class="font-bold text-sm leading-tight">${s.name}</p>
                <p class="text-xs opacity-90 mt-0.5">${s.code} • ${s.grade}</p>
                <p class="text-[10px] opacity-80 mt-1">ครู${s.teacher_name}</p>
              </div>
              <span class="text-xs font-bold bg-white/20 px-1.5 py-0.5 rounded">${used}/${total}</span>
          </div>
          
          ${isFull ? '<div class="absolute inset-0 bg-white/10 flex items-center justify-center font-bold text-white/90 text-lg tracking-widest rotate-12">ครบแล้ว</div>' : ''}
        </div>
    `}).join('');
}

function renderTimetable() {
    const tbody = document.getElementById('timetable-tbody');
    const filterSelect = document.getElementById('timetable-filter-grade');
    if (!tbody) return;

    // Populate Filter if empty (and if data exists)
    if (filterSelect && filterSelect.options.length <= 1 && appState.allData.subjects.length > 0) {
        const grades = [...new Set(appState.allData.subjects.map(s => s.grade).filter(Boolean))].sort();
        if (grades.length > 0) {
            filterSelect.innerHTML = '<option value="">-- กรองระดับชั้น --</option>' +
                grades.map(g => `<option value="${g}">${g}</option>`).join('');

            // Add listener to re-render
            filterSelect.onchange = () => {
                renderTimetable();
                renderSubjectPool();
            };
        }
    }

    const filterGrade = filterSelect?.value;

    tbody.innerHTML = days.map(day => `
        <tr>
          <td class="p-2 border border-gray-200 bg-green-50 font-semibold text-green-800 w-20 text-center">${day}</td>
          ${periods.map(period => {
        if (period === 'lunch') {
            return `<td class="p-2 border border-white bg-amber-100/50 text-center font-semibold text-amber-700 text-sm vertical-text">พักกลางวัน</td>`;
        }

        // Find entry for this slot
        // Filter logic: If filtering by grade, only show slots for that grade
        // If not filtering, show all (might overlap visually in this simple view, but backend supports multiple)
        // Ideally, if not filtering, we show a Summary or "Multiple" indicator?
        // Or we just show the first one found (simple prototype behavior).

        const entries = appState.allData.timetable.filter(t => t.day === day && t.period == period);

        let displayEntry = null;
        if (filterGrade) {
            displayEntry = entries.find(t => {
                const s = appState.allData.subjects.find(sub => sub.__backendId === t.subject_id);
                return s && s.grade === filterGrade;
            });
        } else {
            // Show first one? Or show count?
            if (entries.length > 0) displayEntry = entries[0];
        }

        const content = displayEntry
            ? (() => {
                const subject = appState.allData.subjects.find(s => s.__backendId === displayEntry.subject_id);
                if (!subject) return '<span class="text-xs text-red-500">Error Data</span>';

                // Clicking to delete
                return `
                    <div class="relative group w-full h-full p-2 bg-white border-l-4 border-blue-500 rounded shadow-sm hover:shadow-md transition-all cursor-pointer"
                         onclick="confirmDeleteSlot('${displayEntry.__backendId}')">
                      <p class="font-bold text-blue-900 text-sm truncate">${subject.name}</p>
                      <div class="flex justify-between items-end mt-1">
                          <p class="text-xs text-blue-600 font-medium">${subject.grade}</p>
                          <p class="text-[10px] text-gray-400">${subject.teacher_name}</p>
                      </div>
                      <div class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span class="text-red-500 bg-white rounded-full p-0.5 shadow-sm">🗑️</span>
                      </div>
                    </div>
                  `;
            })()
            : '';

        return `<td class="period-slot drop-zone border border-gray-100 bg-gray-50/30 hover:bg-green-50/50 transition-colors p-1 align-top relative" 
                       data-day="${day}" data-period="${period}"
                       ondragover="window.handleDragOver(event)"
                       ondragleave="window.handleDragLeave(event)"
                       ondrop="window.handleDrop(event)">
              ${content}
            </td>`;
    }).join('')}
        </tr>
    `).join('');
}


// --- UTILITIES ---
window.confirmDeleteSlot = function (id) {
    if (confirm('ต้องการลบวิชานี้ออกจากตารางหรือไม่?')) {
        deleteTimetableSlot(id);
    }
    // Prevent bubbling if necessary? Div has onclick.
}

async function deleteTimetableSlot(id) {
    try {
        const { error } = await appSupabaseClient.from('timetable').delete().eq('id', id);
        if (error) throw error;

        appState.allData.timetable = appState.allData.timetable.filter(t => t.__backendId !== id);
        renderTimetable();
        renderSubjectPool();
        showToast('ลบวิชาออกแล้ว');
    } catch (err) {
        console.error(err);
        showToast('ผิดพลาด: ' + err.message, 'error');
    }
}

window.clearTimetable = async function () {
    if (!confirm('ยืนยันล้างตารางสอนทั้งหมด? การกระทำนี้ไม่สามารถกู้คืนได้')) return;

    showToast('กำลังล้างตาราง...', 'info');
    try {
        const { error } = await appSupabaseClient.from('timetable').delete().neq('id', 0); // Delete all
        if (error) throw error;

        appState.allData.timetable = [];
        renderTimetable();
        renderSubjectPool();
        showToast('ล้างตารางเรียบร้อย');
    } catch (err) {
        console.error(err);
        showToast('ผิดพลาด: ' + err.message, 'error');
    }
};

window.autoSchedule = async function () {
    if (!window.Scheduler) {
        showToast('Scheduler module not loaded', 'error');
        return;
    }

    showToast('กำลังจัดตารางสอนอัตโนมัติ...', 'info');
    await new Promise(r => setTimeout(r, 100)); // Render UI

    try {
        const result = window.Scheduler.autoSchedule(appState.allData);

        if (result.success && result.scheduled.length > 0) {
            // Bulk Insert
            const { data, error } = await appSupabaseClient.from('timetable').insert(result.scheduled).select();
            if (error) throw error;

            const newEntries = data.map(d => ({ ...d, __backendId: d.id, type: 'timetable' }));
            appState.allData.timetable = [...appState.allData.timetable, ...newEntries];

            renderTimetable();
            renderSubjectPool();
            showToast(`จัดตารางสำเร็จ ${result.scheduled.length} วิชา (ข้าม ${result.failed.length})`);
        } else {
            showToast('ไม่สามารถจัดตารางได้เพิ่มเติม (หรือไม่มีวิชา)', 'warning');
        }
    } catch (err) {
        console.error(err);
        showToast('Auto Schedule Error: ' + err.message, 'error');
    }
};

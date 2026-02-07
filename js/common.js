// Shared App State
window.appState = {
    allData: {
        teachers: [],
        subjects: [],
        classrooms: [],
        timetable: [],
        substitutes: []
    },
    currentConfig: {
        school_name: 'โรงเรียน.......................',
        academic_year: '2567',
        semester: '1'
    },
    hasListeners: false
};

// Common Constants
window.days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];
window.periods = [1, 2, 3, 4, 'lunch', 5, 6, 7];

// Initialization Logic (Called by specific pages)
window.initApp = async function () {
    console.log("Initializing App (MPA)...");

    // Auth check is handled by auth.js usually, but we ensure data here.
    if (window.auth && !window.auth.user && !window.location.pathname.includes('login.html')) {
        // Not logged in and not on login page?
        // auth.js should handle redirection or modal.
        // For now, proceed to fetch data if auth calls initApp?
        // Actually auth.init() calls initApp().
    }

    showToast('กำลังโหลดข้อมูล...', 'info');
    await fetchData();

    updatePageTitle();

    // Call page specific render if it exists
    if (window.renderPage) {
        window.renderPage();
    }

    // Render Layout (Sidebar/Header)
    const path = window.location.pathname;
    let pageId = 'dashboard';
    if (path.includes('teachers.html')) pageId = 'teachers';
    if (path.includes('subjects.html')) pageId = 'subjects';
    if (path.includes('classrooms.html')) pageId = 'classrooms';
    if (path.includes('timetable.html')) pageId = 'timetable';
    if (path.includes('teacher-schedule.html')) pageId = 'teacher-schedule';
    if (path.includes('teacher-detail.html')) pageId = 'teacher-detail';
    if (path.includes('classroom-schedule.html')) pageId = 'classroom-schedule';
    if (path.includes('substitutes.html')) pageId = 'substitutes';
    if (path.includes('reports.html')) pageId = 'reports';
    if (path.includes('validation.html')) pageId = 'validation';
    if (path.includes('analysis.html')) pageId = 'analysis';
    if (path.includes('settings.html')) pageId = 'settings';

    if (window.Layout) {
        window.Layout.render(pageId);
    }

    // Initialize common event listeners (like Confirm Modal)
    initCommonListeners();

    showToast('โหลดข้อมูลเรียบร้อย');
};

// Data Fetching
window.fetchData = async function () {
    try {
        if (!window.appSupabaseClient) {
            console.error("Supabase client not initialized");
            return;
        }

        const [teachers, subjects, classrooms, timetable, substitutes] = await Promise.all([
            appSupabaseClient.from('teachers').select('*'),
            appSupabaseClient.from('subjects').select('*'),
            appSupabaseClient.from('classrooms').select('*'),
            appSupabaseClient.from('timetable').select('*'),
            appSupabaseClient.from('substitutes').select('*')
        ]);

        if (teachers.error) throw teachers.error;
        if (subjects.error) throw subjects.error;
        if (classrooms.error) throw classrooms.error;
        if (timetable.error) throw timetable.error;
        if (substitutes.error) throw substitutes.error;

        appState.allData.teachers = teachers.data.map(d => ({ ...d, __backendId: d.id, type: 'teacher' }));
        appState.allData.subjects = subjects.data.map(d => ({ ...d, __backendId: d.id, type: 'subject' }));
        appState.allData.classrooms = classrooms.data.map(d => ({ ...d, __backendId: d.id, type: 'classroom' }));
        appState.allData.timetable = timetable.data.map(d => ({ ...d, __backendId: d.id, type: 'timetable' }));
        appState.allData.substitutes = substitutes.data.map(d => ({ ...d, __backendId: d.id, type: 'substitute' }));

        console.log("Data loaded:", appState.allData);

    } catch (error) {
        console.error("Error fetching data:", error);
        showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message, 'error');
    }
};

// UI Helpers
window.showToast = function (message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return; // Layout.js creates this, keep safe
    const toast = document.createElement('div');
    toast.className = `toast-message px-6 py-3 rounded-lg shadow-lg text-white font-medium pointer-events-auto ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-amber-500'}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
};

window.updatePageTitle = function () {
    const config = appState.currentConfig;
    const info = document.getElementById('school-info');
    if (info) info.textContent = `ปีการศึกษา ${config.academic_year || '2567'} ภาคเรียน ${config.semester || '1'}`;
};

window.setText = function (id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
};

// Start Confim Modal Logic
let confirmCallback = null;

window.showConfirmModal = (title, message, callback) => {
    const modal = document.getElementById('confirm-modal');
    if (!modal) return;
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    confirmCallback = callback;
    modal.classList.remove('hidden');
};

window.closeConfirmModal = () => {
    const modal = document.getElementById('confirm-modal');
    if (modal) modal.classList.add('hidden');
    confirmCallback = null;
};

function initCommonListeners() {
    const confirmBtn = document.getElementById('confirm-btn');
    if (confirmBtn) {
        // Prevent Adding multiple listeners if initApp is called multiple times?
        // We can use a flag on appState
        if (!appState.commonListenersAttached) {
            confirmBtn.addEventListener('click', async () => {
                if (confirmCallback) await confirmCallback();
                closeConfirmModal();
            });
            appState.commonListenersAttached = true;
        }
    }
}

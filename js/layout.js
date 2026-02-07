const Layout = {
    render: (activePageId) => {
        const appContainer = document.getElementById('app');
        if (!appContainer) return;

        // Header HTML
        const headerHtml = `
        <header class="sticky top-0 z-40 bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-lg">
            <div class="max-w-full px-4 py-6">
                <div class="flex justify-between items-center mb-4">
                    <div class="flex items-center gap-2">
                        <div class="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                            <span class="text-2xl">📅</span>
                        </div>
                        <div>
                            <h1 class="text-2xl font-bold">ระบบจัดตารางสอน Pro</h1>
                            <p id="school-info" class="text-green-100 text-sm">ปีการศึกษา 2567 ภาคเรียน 1</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <span id="user-display-name" class="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">User</span>
                        <button onclick="auth.logout()" class="px-3 py-1 bg-red-500/80 hover:bg-red-600 text-white text-sm rounded-lg transition-colors">ออกจากระบบ</button>
                        <button onclick="window.location.href='settings.html'" class="px-4 py-2 bg-green-700 hover:bg-green-800 rounded-lg font-medium transition-colors">⚙️ ตั้งค่า</button>
                    </div>
                </div>
                
                <!-- Navigation Tabs -->
                <nav class="flex flex-wrap gap-1 overflow-x-auto pb-2">
                    <a href="index.html" class="nav-tab ${activePageId === 'dashboard' ? 'active' : ''} px-3 py-2 text-sm whitespace-nowrap">📊 แดชบอร์ด</a>
                    <a href="validation.html" class="nav-tab ${activePageId === 'validation' ? 'active' : ''} px-3 py-2 text-sm whitespace-nowrap">✓ ตรวจสอบปัญหา</a>
                    <a href="analysis.html" class="nav-tab ${activePageId === 'analysis' ? 'active' : ''} px-3 py-2 text-sm whitespace-nowrap">📈 วิเคราะห์</a>
                    <a href="teachers.html" class="nav-tab ${activePageId === 'teachers' ? 'active' : ''} px-3 py-2 text-sm whitespace-nowrap">👨🏫 ครู</a>
                    <a href="subjects.html" class="nav-tab ${activePageId === 'subjects' ? 'active' : ''} px-3 py-2 text-sm whitespace-nowrap">📚 รายวิชา</a>
                    <a href="classrooms.html" class="nav-tab ${activePageId === 'classrooms' ? 'active' : ''} px-3 py-2 text-sm whitespace-nowrap">🏢 ห้องเรียน</a>
                    <a href="timetable.html" class="nav-tab ${activePageId === 'timetable' ? 'active' : ''} px-3 py-2 text-sm whitespace-nowrap">📅 ตารางสอน</a>
                    <a href="teacher-schedule.html" class="nav-tab ${activePageId === 'teacher-schedule' ? 'active' : ''} px-3 py-2 text-sm whitespace-nowrap">👨🏫 ตารางรายครู</a>
                    <a href="teacher-detail.html" class="nav-tab ${activePageId === 'teacher-detail' ? 'active' : ''} px-3 py-2 text-sm whitespace-nowrap">📋 รายละเอียดครู</a>
                    <a href="classroom-schedule.html" class="nav-tab ${activePageId === 'classroom-schedule' ? 'active' : ''} px-3 py-2 text-sm whitespace-nowrap">🏫 ตารางห้องเรียน</a>
                    <a href="substitutes.html" class="nav-tab ${activePageId === 'substitutes' ? 'active' : ''} px-3 py-2 text-sm whitespace-nowrap">🔄 สอนแทน</a>
                    <a href="reports.html" class="nav-tab ${activePageId === 'reports' ? 'active' : ''} px-3 py-2 text-sm whitespace-nowrap">📊 รายงาน</a>
                </nav>
            </div>
        </header>

        <div id="toast-container" class="fixed top-32 right-4 z-50 flex flex-col gap-2 pointer-events-none"></div>

        <!-- Confirm Modal -->
        <div id="confirm-modal" class="fixed inset-0 bg-black/50 z-[60] hidden flex items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 transform scale-100">
                <h3 id="confirm-title" class="text-lg font-bold text-gray-800 mb-2">ยืนยัน</h3>
                <p id="confirm-message" class="text-gray-600 mb-6">คุณต้องการดำเนินการนี้หรือไม่?</p>
                <div class="flex justify-end gap-3">
                    <button onclick="window.closeConfirmModal()" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">ยกเลิก</button>
                    <button id="confirm-btn" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">ยืนยัน</button>
                </div>
            </div>
        </div>
        `;

        // Prepend Header to App Container
        appContainer.insertAdjacentHTML('afterbegin', headerHtml);
    }
};

window.Layout = Layout;

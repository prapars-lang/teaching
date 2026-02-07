// Settings Page Logic
window.renderPage = function () {
    const config = appState.currentConfig;
    if (document.getElementById('school-name')) document.getElementById('school-name').value = config.school_name;
    if (document.getElementById('academic-year')) document.getElementById('academic-year').value = config.academic_year;
    if (document.getElementById('semester')) document.getElementById('semester').value = config.semester;
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('settings-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            appState.currentConfig.school_name = document.getElementById('school-name').value;
            appState.currentConfig.academic_year = document.getElementById('academic-year').value;
            appState.currentConfig.semester = document.getElementById('semester').value;
            if (window.updatePageTitle) window.updatePageTitle();
            if (window.showToast) window.showToast('บันทึกการตั้งค่าเรียบร้อย');
        });
    }
});

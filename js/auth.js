
const auth = {
    user: null,
    profile: null,
    currentSchool: null,

    async init() {
        const isLoginPage = window.location.pathname.includes('login.html');

        // 1. Authenticate with Platform
        const { data: { session } } = await platformClient.auth.getSession();

        if (session?.user) {
            this.user = session.user;
            await this.connectToSchool();

            // Redirect if on login page
            if (isLoginPage) {
                window.location.href = 'index.html';
                return;
            }
        } else {
            // No session
            if (!isLoginPage) {
                // Save current URL for redirect back?
                // For now, simplicity:
                window.location.href = 'login.html';
                return;
            }
        }

        // Auth State Listener (Platform)
        platformClient.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                this.user = session.user;
                if (!this.currentSchool) await this.connectToSchool();

                if (window.location.pathname.includes('login.html')) {
                    window.location.href = 'index.html';
                }
            } else {
                this.user = null;
                this.profile = null;
                this.currentSchool = null;

                if (!window.location.pathname.includes('login.html')) {
                    window.location.href = 'login.html';
                }
            }
            this.updateUI(); // For RBAC mainly
        });

        // If we are here, we are either:
        // 1. Logged in and on a content page (or just redirected)
        // 2. Not logged in and on login page

        // If logged in, initialize app
        if (this.user && this.currentSchool) {
            if (window.initApp) {
                window.initApp();
            }
        }
    },

    async connectToSchool() {
        if (!this.user) return;

        // 2. Resolve School
        const schools = await PlatformService.resolveUserSchools(this.user.email);
        if (schools.length === 0) {
            alert('No school found for this user.');
            await this.logout();
            return;
        }

        const school = schools[0];
        this.currentSchool = school;
        console.log(`Resource Resolved: ${school.name}`);

        // 3. Initialize School DB Connection
        initSchoolClient(school.db_config.url, school.db_config.key);

        // 4. Load Profile from School DB
        await this.fetchProfile();
    },

    async login(email, password) {
        const { data, error } = await platformClient.auth.signInWithPassword({ email, password });
        if (error) {
            console.error("Login Failed:", error);
            if (error.message.includes('Invalid login credentials')) {
                alert('ไม่พบผู้ใช้งาน หรือ รหัสผ่านไม่ถูกต้อง');
            } else {
                alert('Login failed: ' + error.message);
            }
            return false;
        }
        return true;
    },

    async register(email, password, role = 'teacher', name = '') {
        const { data, error } = await platformClient.auth.signUp({
            email,
            password,
            options: {
                data: { display_name: name, role: role }
            }
        });

        if (error) {
            alert('Register failed: ' + error.message);
            return false;
        }

        if (data.user) {
            alert('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
            return true;
        }
        return false;
    },

    async logout() {
        await platformClient.auth.signOut();
        // Listener will handle redirect
    },

    async fetchProfile() {
        if (!this.user) return;
        try {
            const { data, error } = await appSupabaseClient.from('profiles').select('*').eq('id', this.user.id).maybeSingle();
            if (data) {
                this.profile = data;
                this.updateUI();
            }
        } catch (e) {
            console.error(e);
        }
    },

    updateUI() {
        const userInfo = document.getElementById('user-display-name');

        if (this.user && this.currentSchool && userInfo) {
            userInfo.textContent = `${this.profile?.full_name || this.user.email} (${this.currentSchool.name})`;

            // Role Based Access Control
            const role = this.profile?.role || 'teacher';
            document.querySelectorAll('.admin-only').forEach(el => {
                if (role === 'admin') {
                    el.classList.remove('hidden');
                } else {
                    el.classList.add('hidden');
                }
            });
        }
    }
};

window.auth = auth;

// Auto init auth logic
document.addEventListener('DOMContentLoaded', () => {
    // Only auto-init if not already handled by manual script call (login.html)
    // But login.html also includes auth.js.
    // We should rely on browser default behavior.
    auth.init();
});

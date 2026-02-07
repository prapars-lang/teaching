
const auth = {
    user: null,
    profile: null,
    currentSchool: null,

    async init() {
        // 1. Authenticate with Platform
        const { data: { session } } = await platformClient.auth.getSession();

        if (session?.user) {
            this.user = session.user;
            await this.connectToSchool();
        }

        // Auth State Listener (Platform)
        platformClient.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                this.user = session.user;
                await this.connectToSchool();
            } else {
                this.user = null;
                this.profile = null;
                this.currentSchool = null;
                // Reset to specific client null or default? 
                // Currently appSupabaseClient resets to platform via reload usually, 
                // but here we might want to reload page on logout.
            }
            this.updateUI();
        });

        this.updateUI();
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

        // For prototype, auto-select first school
        const school = schools[0];
        this.currentSchool = school;
        console.log(`Resource Resolved: ${school.name}`);

        // 3. Initialize School DB Connection
        // This updates the global 'appSupabaseClient' used by app.js and dataSdk
        initSchoolClient(school.db_config.url, school.db_config.key);

        // 4. Load Profile from School DB
        await this.fetchProfile();

        // 5. Initialize App Logic (if getting data)
        if (window.initApp) {
            // Reset listeners flag if strictly needed, or reliance on reload
            // If switching users without reload, we might need to reset appState
        }
    },

    async login(email, password) {
        const { data, error } = await platformClient.auth.signInWithPassword({ email, password });
        if (error) {
            alert('Login failed: ' + error.message);
            return false;
        }
        return true;
    },

    async register(email, password, role = 'teacher', name = '') {
        // Register on Platform
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
            alert('Registration successful! You can now login.');
            return true;
        }
        return false;
    },

    async logout() {
        await platformClient.auth.signOut();
        window.location.reload();
    },

    async fetchProfile() {
        if (!this.user) return;
        try {
            // This query runs against the SCHOOL DB (appSupabaseClient)
            const { data, error } = await appSupabaseClient.from('profiles').select('*').eq('id', this.user.id).maybeSingle();
            if (data) {
                this.profile = data;
            }
        } catch (e) {
            console.error(e);
        }
    },

    updateUI() {
        const loginModal = document.getElementById('login-modal');
        const appContent = document.getElementById('app');
        const userInfo = document.getElementById('user-display-name');

        if (this.user && this.currentSchool) {
            if (loginModal) loginModal.classList.add('hidden');
            if (appContent) {
                appContent.classList.remove('hidden');

                // Initialize Data if not loaded
                if (window.initApp && (appState.allData.teachers.length === 0 && appState.allData.subjects.length === 0)) {
                    window.initApp();
                }
            }

            if (userInfo) {
                userInfo.textContent = `${this.profile?.full_name || this.user.email} (${this.currentSchool.name})`;
            }

            // Role Based Access Control
            const role = this.profile?.role || 'teacher';
            document.querySelectorAll('.admin-only').forEach(el => {
                if (role === 'admin') {
                    el.classList.remove('hidden');
                } else {
                    el.classList.add('hidden');
                }
            });

        } else {
            if (loginModal) loginModal.classList.remove('hidden');
            if (appContent) appContent.classList.add('hidden');
        }
    }
};

window.auth = auth;

// UI Helpers
window.showRegister = () => {
    document.getElementById('login-modal')?.classList.add('hidden');
    document.getElementById('register-modal')?.classList.remove('hidden');
};

window.showLogin = () => {
    document.getElementById('register-modal')?.classList.add('hidden');
    document.getElementById('login-modal')?.classList.remove('hidden');
};

// Auto init auth logic
document.addEventListener('DOMContentLoaded', () => {
    auth.init();

    // Bind Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            await auth.login(email, password);
        });
    }

    // Bind Register Form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            await auth.register(email, password, 'teacher', name);
            // After register success, show login or auto login?
            // current register logic alerts and returns true. 
            // It doesn't auto login (Supabase might, but we didn't handle that explicitly in auth.register return).
            // Let's assume user needs to login or we switch to login view.
            window.showLogin();
        });
    }
});


const auth = {
    user: null,
    profile: null,

    async init() {
        const { data: { session } } = await appSupabaseClient.auth.getSession();
        if (session?.user) {
            this.user = session.user;
            await this.fetchProfile();
        }

        // Auth State Listener
        appSupabaseClient.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                this.user = session.user;
                await this.fetchProfile();
            } else {
                this.user = null;
                this.profile = null;
            }
            this.updateUI();
        });

        this.updateUI();
    },

    async login(email, password) {
        const { data, error } = await appSupabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
            alert('Login failed: ' + error.message);
            return false;
        }
        return true;
    },

    async register(email, password, role = 'teacher', name = '') {
        const { data, error } = await appSupabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: { display_name: name, role: role } // Metadata
            }
        });

        if (error) {
            alert('Register failed: ' + error.message);
            return false;
        }

        if (data.user) {
            // Create Profile
            const { error: profileError } = await appSupabaseClient.from('profiles').insert({
                id: data.user.id,
                role: role,
                full_name: name
            });
            if (profileError) console.error('Profile creation failed:', profileError);

            alert('Registration successful! You can now login.');
            return true;
        }
        return false;
    },

    async logout() {
        await appSupabaseClient.auth.signOut();
        window.location.reload();
    },

    async fetchProfile() {
        if (!this.user) return;
        try {
            const { data, error } = await appSupabaseClient.from('profiles').select('*').eq('id', this.user.id).maybeSingle();
            if (data) {
                this.profile = data;
            } else if (!error) {
                // If no profile exists (e.g. manual creation), try to infer or create logic? 
                // For now, assume teacher if not found or restricted.
            }
        } catch (e) {
            console.error(e);
        }
    },

    updateUI() {
        // IDs matched to new index.html
        const loginModal = document.getElementById('login-modal');
        const appContent = document.getElementById('app');
        const userInfo = document.getElementById('user-display-name');

        if (this.user) {
            if (loginModal) loginModal.classList.add('hidden');
            if (appContent) {
                appContent.classList.remove('hidden');
                // Trigger Data Load if not already loaded? 
                // Better to call it only once or check if appState is empty?
                // initApp checks for data, or we can just call it (it fetches). 
                // Logic: initialization is separate from just showing UI. 
                if (window.initApp) {
                    // Check if data is loaded to avoid double fetch on re-auth? 
                    // appState is global. 
                    if (appState.allData.teachers.length === 0 && appState.allData.subjects.length === 0) {
                        window.initApp();
                    } else {
                        // Just render if data exists
                        // window.renderAll(); 
                    }
                }
            }

            // Update User Info Display
            if (userInfo) {
                userInfo.textContent = `${this.profile?.full_name || this.user.email} (${this.profile?.role || 'User'})`;
            }

            // Role Based Access Control
            const role = this.profile?.role || 'teacher';

            // Admin Only Elements
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


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
                name: name
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
            const { data, error } = await appSupabaseClient.from('profiles').select('*').eq('id', this.user.id).single();
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
        const loginModal = document.getElementById('login-screen');
        const appContent = document.getElementById('app-content');
        const userInfo = document.getElementById('user-info-display');

        if (this.user) {
            if (loginModal) loginModal.classList.add('hidden');
            if (appContent) appContent.classList.remove('hidden');

            // Update User Info Display
            if (userInfo) {
                userInfo.textContent = `${this.profile?.name || this.user.email} (${this.profile?.role || 'User'})`;
            }

            // Role Based Access Control
            const role = this.profile?.role || 'teacher';

            // Admin Only Elements
            document.querySelectorAll('.admin-only').forEach(el => {
                if (role === 'admin') {
                    el.classList.remove('hidden');
                } else {
                    el.classList.add('hidden');
                    if (el.tagName === 'BUTTON' || el.tagName === 'A') {
                        // Double ensure it's not clickable if simple hidden class isn't enough (it is with tailwind but safety first)
                    }
                }
            });

            // Teacher specific logic
            if (role === 'teacher') {
                // Auto-redirect to teacher timetable if on dashboard?
                // For now, just hide the other tabs via the .admin-only class on the nav items
            }

        } else {
            if (loginModal) loginModal.classList.remove('hidden');
            if (appContent) appContent.classList.add('hidden');
        }
    }
};

window.auth = auth;

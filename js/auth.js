
const auth = {
    user: null,
    profile: null,
    currentSchool: null,

    async init() {
        const isLoginPage = window.location.pathname.includes('login.html');

        // 1. Authenticate with Platform
        let sessionUser = null;

        // Check Supabase Session
        const { data: { session } } = await platformClient.auth.getSession();
        if (session?.user) {
            sessionUser = session.user;
        } else {
            // Check Local Mock Session (Fallback for Rate Limits)
            const mockUserStr = localStorage.getItem('demo_user_session');
            if (mockUserStr) {
                sessionUser = JSON.parse(mockUserStr);
                console.warn('Using Local Demo Session (Offline Mode)');
            }
        }

        if (sessionUser) {
            this.user = sessionUser;
            await this.connectToSchool();

            // Redirect if on login page
            if (isLoginPage) {
                window.location.href = 'index.html';
                return;
            }
        } else {
            // No session
            if (!isLoginPage) {
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
            } else if (!localStorage.getItem('demo_user_session')) {
                // Only clear if NOT in demo mode
                this.user = null;
                this.profile = null;
                this.currentSchool = null;

                if (!window.location.pathname.includes('login.html')) {
                    window.location.href = 'login.html';
                }
            }
            this.updateUI();
        });

        // Initialize App if Logged In
        if (this.user && this.currentSchool) {
            if (window.initApp) {
                window.initApp();
            }
        }
    },

    async connectToSchool() {
        if (!this.user) return;

        // 2. Resolve School
        const schools = await window.PlatformService.resolveUserSchools(this.user.email);
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

        // 4. Load Profile from School DB (skip if mock user)
        if (!this.user.is_mock) {
            await this.fetchProfile();
        } else {
            this.profile = { full_name: this.user.user_metadata.display_name, role: 'teacher' };
            this.updateUI();
        }
    },

    async login(email, password) {
        const { data, error } = await platformClient.auth.signInWithPassword({ email, password });
        if (error) {
            console.error("Login Failed:", error);

            // Fallback: Check local demo users
            const mockUserStr = localStorage.getItem('demo_user_session');
            if (mockUserStr) {
                const mockUser = JSON.parse(mockUserStr);
                if (mockUser.email === email) {
                    alert('เข้าสู่ระบบแบบ Offline (Demo Mode) สำเร็จ');
                    window.location.reload();
                    return true;
                }
            }

            if (error.message.includes('Invalid login credentials')) {
                alert('ไม่พบผู้ใช้งาน หรือ รหัสผ่านไม่ถูกต้อง');
            } else {
                alert('Login failed: ' + error.message);
            }
            return false;
        }

        // Clear demo session if real login succeeds
        localStorage.removeItem('demo_user_session');
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
            console.error("Register Error:", error);

            // Rate Limit Logic -> Switch to Demo
            if (error.message.includes('rate limit') || error.status === 429) {
                const proceedMock = confirm(
                    'Server แจ้งเตือน: "Email Rate Limit Exceeded"\n\n' +
                    'ระบบไม่สามารถส่งอีเมลยืนยันได้เนื่องจากโควต้าเต็ม (Free Tier Constraints)\n' +
                    'คุณต้องการเปิดใช้งาน "Demo Mode" เพื่อเข้าใช้งานทันทีโดยไม่ผ่าน Server หรือไม่?'
                );

                if (proceedMock) {
                    const mockUser = {
                        id: 'mock-' + Date.now(),
                        email: email,
                        is_mock: true,
                        user_metadata: { display_name: name, role: role }
                    };
                    localStorage.setItem('demo_user_session', JSON.stringify(mockUser));
                    alert('เปิดใช้งาน Demo Mode สำเร็จ! กำลังเข้าสู่ระบบ...');
                    window.location.reload();
                    return true;
                }
                return false;
            }

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
        localStorage.removeItem('demo_user_session');
        window.location.href = 'login.html';
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

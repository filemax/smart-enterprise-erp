// Smart Enterprise ERP - Supabase Authentication
// Uses public.user_profiles for role + shop information.

const AUTH_SESSION_KEY = 'erp_user_session';
const ERP_USER_KEY = 'erp_user';

async function checkSupabaseSession() {
    const client = initSupabase();
    if (!client) return null;

    const { data, error } = await client.auth.getSession();
    if (error) {
        console.warn('Session check failed:', error.message);
        return null;
    }
    return data.session || null;
}

async function loadUserProfile(userId) {
    const client = initSupabase();
    if (!client || !userId) return null;

    const { data, error } = await client
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        console.warn('User profile load failed:', error.message);
        return null;
    }

    return data || null;
}

function saveCurrentERPUser(session, profile) {
    const user = session?.user || null;
    if (!user) return;

    const erpUser = {
        id: user.id,
        email: user.email || '',
        role: profile?.role || 'staff',
        shop_id: profile?.shop_id ?? null
    };

    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
    localStorage.setItem(ERP_USER_KEY, JSON.stringify(erpUser));

    window.currentUser = user;
    window.currentProfile = profile || {
        id: user.id,
        role: 'staff',
        shop_id: null
    };
}

async function openERP(session) {
    if (!session?.user) return false;

    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');

    const profile = await loadUserProfile(session.user.id);

    saveCurrentERPUser(session, profile);

    if (loginContainer) loginContainer.classList.add('hidden');
    if (appContainer) appContainer.classList.remove('hidden');

    if (typeof initApp === 'function') {
        initApp();
    }

    return true;
}

document.addEventListener('DOMContentLoaded', async () => {
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const rememberMe = document.getElementById('remember-me');
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');

    if (loginContainer) loginContainer.classList.remove('hidden');
    if (appContainer) appContainer.classList.add('hidden');

    const rememberedUser = localStorage.getItem('erp_remember_user');
    if (rememberedUser && usernameInput) {
        usernameInput.value = rememberedUser;
    }

    const existing = await checkSupabaseSession();
    if (existing) {
        await openERP(existing);
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (loginError) loginError.textContent = '';

            try {
                const email = usernameInput ? usernameInput.value.trim() : '';
                const password = passwordInput ? passwordInput.value : '';

                const { data, error } = await supabaseSignIn(email, password);

                if (error || !data?.session) {
                    if (loginError) {
                        loginError.textContent = '❌ Email හෝ Password වැරදියි';
                    }
                    if (passwordInput) passwordInput.value = '';
                    return;
                }

                if (rememberMe?.checked) {
                    localStorage.setItem('erp_remember_user', email);
                } else {
                    localStorage.removeItem('erp_remember_user');
                }

                await openERP(data.session);

            } catch (err) {
                console.error(err);
                if (loginError) {
                    loginError.textContent = '❌ Login error. Supabase connection check කරන්න.';
                }
            }
        });
    }

    const logout = document.getElementById('logout-btn');
    if (logout) {
        logout.addEventListener('click', async () => {
            try {
                await supabaseSignOut();
            } finally {
                localStorage.removeItem(AUTH_SESSION_KEY);
                localStorage.removeItem(ERP_USER_KEY);

                window.currentUser = null;
                window.currentProfile = null;

                if (appContainer) appContainer.classList.add('hidden');
                if (loginContainer) loginContainer.classList.remove('hidden');
                if (passwordInput) passwordInput.value = '';
            }
        });
    }
});

// Smart Enterprise ERP - Supabase Authentication

const AUTH_SESSION_KEY = 'erp_user_session';

async function checkSupabaseSession() {
    const client = initSupabase();
    if (!client) return null;

    const { data } = await client.auth.getSession();
    return data.session;
}

async function loadUserProfile(userId) {
    const client = initSupabase();
    if (!client) return null;

    const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.warn('Profile not found:', error.message);
        return null;
    }

    return data;
}

async function openERP(session) {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session.user));

    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');

    loginContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');

    window.currentUser = session.user;
    window.currentProfile = await loadUserProfile(session.user.id);

    if (typeof initApp === 'function') {
        initApp();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const rememberMe = document.getElementById('remember-me');

    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');

    loginContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');

    const existing = await checkSupabaseSession();
    if (existing) {
        await openERP(existing);
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.textContent = '';

        try {
            const { data, error } = await supabaseSignIn(
                usernameInput.value.trim(),
                passwordInput.value
            );

            if (error || !data.session) {
                loginError.textContent = '❌ Username හෝ Password වැරදියි';
                passwordInput.value = '';
                return;
            }

            if (rememberMe.checked) {
                localStorage.setItem('erp_remember_user', usernameInput.value.trim());
            }

            await openERP(data.session);

        } catch (err) {
            console.error(err);
            loginError.textContent = '❌ Login error. Supabase connection check කරන්න.';
        }
    });

    const logout = document.getElementById('logout-btn');
    if (logout) {
        logout.addEventListener('click', async () => {
            await supabaseSignOut();
            localStorage.removeItem(AUTH_SESSION_KEY);

            appContainer.classList.add('hidden');
            loginContainer.classList.remove('hidden');
            passwordInput.value = '';
        });
    }
});

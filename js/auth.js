const AUTH_CREDENTIAL_KEY = 'erp_auth_credentials_v2';
const AUTH_ITERATIONS = 120000;
const AUTH_HASH_BITS = 256;

// Compatibility credential for existing installations. The old password itself is NOT stored
// in source code; only its one-way PBKDF2 verification data is kept for the first migration login.
const LEGACY_AUTH = {
    salt: '8Utd+ojfJiYpOk/SfOJDUw==',
    hash: '8LgNbzbKyxuiUmFH/MvFXQSlHqku3T1CHEiUYIaf1Z4=',
    iterations: 120000
};

function bytesToBase64(bytes) {
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary);
}

function base64ToBytes(value) {
    const binary = atob(value);
    return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function secureEqualBase64(a, b) {
    try {
        const aBytes = base64ToBytes(a);
        const bBytes = base64ToBytes(b);
        if (aBytes.length !== bBytes.length) return false;
        let diff = 0;
        for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
        return diff === 0;
    } catch (_) {
        return false;
    }
}

async function derivePasswordHash(password, saltBase64, iterations = AUTH_ITERATIONS) {
    if (!window.crypto || !window.crypto.subtle) {
        throw new Error('Secure password hashing is not supported by this browser.');
    }

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );

    const bits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: base64ToBytes(saltBase64),
            iterations,
            hash: 'SHA-256'
        },
        keyMaterial,
        AUTH_HASH_BITS
    );

    return bytesToBase64(new Uint8Array(bits));
}

function readStoredCredential() {
    try {
        const value = JSON.parse(localStorage.getItem(AUTH_CREDENTIAL_KEY));
        if (!value || typeof value !== 'object') return null;
        if (!value.username || !value.salt || !value.hash || !value.iterations) return null;
        return value;
    } catch (_) {
        return null;
    }
}

async function createCredential(username, password, mustChange = false) {
    const saltBytes = new Uint8Array(16);
    crypto.getRandomValues(saltBytes);
    const salt = bytesToBase64(saltBytes);
    const hash = await derivePasswordHash(password, salt, AUTH_ITERATIONS);
    return {
        version: 2,
        username: username.trim(),
        salt,
        hash,
        iterations: AUTH_ITERATIONS,
        mustChange: !!mustChange,
        updatedAt: new Date().toISOString()
    };
}

async function verifyCredentials(username, password) {

    const email = username.trim();

    if (!email || !password) {
        return { ok: false };
    }


    const {
        data,
        error
    } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });


    if (error || !data.user) {

        console.error(
            'Supabase login error:',
            error
        );

        return {
            ok: false
        };
    }


    // Download latest ERP data
    await loadERPStateFromSupabase();


    return {
        ok: true,
        credential: {
            mustChange: false
        },
        user: data.user
    };
}
    const cleanUser = username.trim();
    if (!cleanUser || !password) return { ok: false };

    const stored = readStoredCredential();
    if (stored) {
        if (stored.username.toLowerCase() !== cleanUser.toLowerCase()) return { ok: false };
        const hash = await derivePasswordHash(password, stored.salt, stored.iterations);
        return { ok: secureEqualBase64(hash, stored.hash), credential: stored };
    }

    // One-time migration path from the previous release.
    const legacyHash = await derivePasswordHash(password, LEGACY_AUTH.salt, LEGACY_AUTH.iterations);
    if (!secureEqualBase64(legacyHash, LEGACY_AUTH.hash)) return { ok: false };

    const migrated = await createCredential(cleanUser, password, true);
    localStorage.setItem(AUTH_CREDENTIAL_KEY, JSON.stringify(migrated));
    return { ok: true, credential: migrated, migrated: true };
}

document.addEventListener("DOMContentLoaded", () => {
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const rememberMe = document.getElementById('remember-me');
    const loginError = document.getElementById('login-error');

    // Check remembered user
    if (localStorage.getItem('erp_remember_user')) {
        usernameInput.value = localStorage.getItem('erp_remember_user');
        rememberMe.checked = true;
    }

    loginContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.textContent = '';

        try {
            const result = await verifyCredentials(usernameInput.value, passwordInput.value);
            if (!result.ok) {
                loginError.textContent = "❌ වැරදි මුරපදයක් හෝ Username එකක්!";
                passwordInput.value = "";
                return;
            }

            if (rememberMe.checked) {
                localStorage.setItem('erp_remember_user', usernameInput.value.trim());
            } else {
                localStorage.removeItem('erp_remember_user');
            }

            loginContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
            initApp();

            if (result.credential && result.credential.mustChange) {
                alert('🔐 ආරක්ෂාව සඳහා Settings > Admin Security වෙත ගොස් default password එක වෙනස් කරන්න.');
            }
        } catch (err) {
            console.error(err);
            loginError.textContent = "❌ ආරක්ෂිත Login සේවාව මෙම browser එකේ ක්‍රියා නොකරයි.";
        }
    });

    document
    .getElementById('logout-btn')
    .addEventListener(
        'click',
        async () => {

            await supabaseClient.auth.signOut();

            erpCloudSyncEnabled = false;

            appContainer.classList.add(
                'hidden'
            );

            loginContainer.classList.remove(
                'hidden'
            );

            passwordInput.value = '';
        }
    );

    const changePasswordForm =
    document.getElementById(
        'change-password-form'
    );


if (changePasswordForm) {

    changePasswordForm.addEventListener(
        'submit',
        async (e) => {

            e.preventDefault();


            const currentPassword =
                document.getElementById(
                    'current-admin-password'
                ).value;


            const newPassword =
                document.getElementById(
                    'new-admin-password'
                ).value;


            const confirmPassword =
                document.getElementById(
                    'confirm-admin-password'
                ).value;


            const status =
                document.getElementById(
                    'password-change-status'
                );


            if (newPassword.length < 6) {

                status.textContent =
                    '❌ නව මුරපදය අවම වශයෙන් අක්ෂර 6ක් විය යුතුය.';

                status.style.color = 'red';

                return;
            }


            if (newPassword !== confirmPassword) {

                status.textContent =
                    '❌ නව මුරපද දෙක එකිනෙකට ගැළපෙන්නේ නැහැ.';

                status.style.color = 'red';

                return;
            }


            try {

                const {
                    data: { user }
                } =
                    await supabaseClient
                        .auth
                        .getUser();


                if (!user || !user.email) {

                    throw new Error(
                        'No logged in user'
                    );
                }


                // Verify current password

                const {
                    error: loginError
                } =
                    await supabaseClient
                        .auth
                        .signInWithPassword({
                            email: user.email,
                            password:
                                currentPassword
                        });


                if (loginError) {

                    status.textContent =
                        '❌ දැනට භාවිතා කරන මුරපදය වැරදියි.';

                    status.style.color =
                        'red';

                    return;
                }


                // Change password

                const {
                    error: updateError
                } =
                    await supabaseClient
                        .auth
                        .updateUser({
                            password:
                                newPassword
                        });


                if (updateError) {

                    throw updateError;
                }


                changePasswordForm.reset();


                status.textContent =
                    '✅ Admin password එක සාර්ථකව වෙනස් කළා.';

                status.style.color =
                    'green';


            } catch (error) {

                console.error(error);

                status.textContent =
                    '❌ Password එක වෙනස් කිරීමට නොහැකි විය.';

                status.style.color =
                    'red';
            }
        }
    );
        }
    setInterval(updateClock, 1000);
    updateClock();
});

// Previous versions visually offered Google login but did not implement real OAuth and therefore
// bypassed the password check. Keep the button for layout compatibility, but never bypass auth.
window.socialAuth = function(provider) {
    alert(`🔒 ${provider} Sign-in මෙම offline ERP version එකට configure කරලා නැහැ. Admin Username සහ Password භාවිතා කරන්න.`);
};

function updateClock() {
    const clock = document.getElementById('live-clock');
    if(!clock) return;
    const now = new Date();
    clock.textContent = now.toLocaleDateString() + " " + now.toLocaleTimeString();
}

window.toggleProfileMenu = function() {
    document.getElementById('profile-menu').classList.toggle('hidden');
};

window.toggleDarkMode = function() {
    document.body.classList.toggle('dark-mode');
};

window.backupData = function() {
    const data = {
        backupVersion: 2,
        createdAt: new Date().toISOString(),
        shopDirectory,
        productsMap,
        salesData,
        expenses,
        stockHistory,
        creditPayments,
        returns: JSON.parse(localStorage.getItem('watalappan_return_damage')) || [],
        orders: JSON.parse(localStorage.getItem('watalappan_orders')) || []
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `erp_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
};

function validateBackupData(data) {
    const errors = [];
    if (!data || typeof data !== 'object' || Array.isArray(data)) return ['Backup file format එක වැරදියි.'];
    if (!Array.isArray(data.shopDirectory)) errors.push('shopDirectory');
    if (!data.productsMap || typeof data.productsMap !== 'object' || Array.isArray(data.productsMap)) errors.push('productsMap');
    if (!Array.isArray(data.salesData)) errors.push('salesData');
    if (!Array.isArray(data.expenses)) errors.push('expenses');
    if (!Array.isArray(data.stockHistory)) errors.push('stockHistory');
    if (!Array.isArray(data.creditPayments)) errors.push('creditPayments');
    if (data.returns !== undefined && !Array.isArray(data.returns)) errors.push('returns');
    if (data.orders !== undefined && !Array.isArray(data.orders)) errors.push('orders');
    return errors;
}

window.triggerRestoreData = function() {
    const input = document.getElementById('restore-file-input');
    if (input) input.click();
};

window.restoreDataFromFile = async function(input) {
    const file = input && input.files ? input.files[0] : null;
    if (!file) return;

    try {
        const text = await file.text();
        const data = JSON.parse(text);
        const errors = validateBackupData(data);
        if (errors.length) {
            alert(`❌ Backup file එක වලංගු නැහැ. වැරදි/අඩු fields: ${errors.join(', ')}`);
            return;
        }

        const saleCount = data.salesData.length;
        const stockCount = data.stockHistory.length;
        const ok = confirm(`Backup එක Restore කළොත් දැනට ERP data replace වෙනවා.\n\nSales: ${saleCount}\nStock records: ${stockCount}\n\nRestore කරන්නද?`);
        if (!ok) return;

        localStorage.setItem('watalappan_shop_directory', JSON.stringify(data.shopDirectory));
        localStorage.setItem('watalappan_products_map', JSON.stringify(data.productsMap));
        localStorage.setItem('watalappan_sales', JSON.stringify(data.salesData));
        localStorage.setItem('watalappan_expenses', JSON.stringify(data.expenses));
        localStorage.setItem('watalappan_stock_history', JSON.stringify(data.stockHistory));
        localStorage.setItem('watalappan_credit_payments', JSON.stringify(data.creditPayments));
        localStorage.setItem('watalappan_return_damage', JSON.stringify(data.returns || []));
        localStorage.setItem('watalappan_orders', JSON.stringify(data.orders || []));

        alert('✅ Backup data සාර්ථකව Restore කළා. ERP එක Reload වෙනවා.');
        location.reload();
    } catch (err) {
        console.error(err);
        alert('❌ Backup file එක කියවීමට නොහැකි විය. නිවැරදි ERP JSON backup එකක් තෝරන්න.');
    } finally {
        if (input) input.value = '';
    }
};

function initApp() {
    document.getElementById('sales-date').value = new Date().toISOString().split('T')[0];
    populateDropdowns();
    renderShops();
    renderProductsSettings();
    renderSalesTable();
    renderStockOverview();
    renderStockHistory();
    renderExpenseTable();
    renderCreditTable();
    renderMonthlyPnL();
    renderExpiryAlerts();
    renderUpcomingOrdersInAnalytics();
    updateFilteredAnalytics();
    updateLiveTotal();
}

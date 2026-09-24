// ======================================================
// SMART ENTERPRISE ERP - SUPABASE CLOUD SYNC
// ======================================================

const SUPABASE_URL = 'https://mptolqigbsayxwtlgrif.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
    'sb_publishable__DkoX7rIQrG5JAwmcbsW_Q_gaPWq3ol';

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true
        }
    }
);


// ------------------------------------------------------
// ERP localStorage keys that must sync to Supabase
// ------------------------------------------------------

const ERP_STORAGE_KEYS = new Set([
    'watalappan_shop_directory',
    'watalappan_products_map',
    'watalappan_sales',
    'watalappan_expenses',
    'watalappan_stock_history',
    'watalappan_credit_payments',
    'watalappan_return_damage',
    'watalappan_orders'
]);

let erpCloudSyncEnabled = true;
let erpCloudSaveTimer = null;


// ------------------------------------------------------
// Read JSON safely
// ------------------------------------------------------

function readERPStorage(key, fallback) {
    try {
        const value = localStorage.getItem(key);

        if (!value) {
            return fallback;
        }

        return JSON.parse(value);

    } catch (error) {
        console.error('Storage read error:', key, error);
        return fallback;
    }
}


// ------------------------------------------------------
// Build one complete ERP cloud object
// ------------------------------------------------------

function collectERPState() {

    return {

        shopDirectory:
            readERPStorage(
                'watalappan_shop_directory',
                []
            ),

        productsMap:
            readERPStorage(
                'watalappan_products_map',
                {}
            ),

        salesData:
            readERPStorage(
                'watalappan_sales',
                []
            ),

        expenses:
            readERPStorage(
                'watalappan_expenses',
                []
            ),

        stockHistory:
            readERPStorage(
                'watalappan_stock_history',
                []
            ),

        creditPayments:
            readERPStorage(
                'watalappan_credit_payments',
                []
            ),

        returns:
            readERPStorage(
                'watalappan_return_damage',
                []
            ),

        orders:
            readERPStorage(
                'watalappan_orders',
                []
            )

    };
}


// ------------------------------------------------------
// Apply downloaded cloud data to ERP
// ------------------------------------------------------

function applyERPState(state) {

    erpCloudSyncEnabled = false;

    const shopData =
        state.shopDirectory || [];

    const productData =
        state.productsMap || {};

    const sales =
        state.salesData || [];

    const expenseData =
        state.expenses || [];

    const stockData =
        state.stockHistory || [];

    const creditData =
        state.creditPayments || [];

    const returnsData =
        state.returns || [];

    const ordersData =
        state.orders || [];


    localStorage.setItem(
        'watalappan_shop_directory',
        JSON.stringify(shopData)
    );

    localStorage.setItem(
        'watalappan_products_map',
        JSON.stringify(productData)
    );

    localStorage.setItem(
        'watalappan_sales',
        JSON.stringify(sales)
    );

    localStorage.setItem(
        'watalappan_expenses',
        JSON.stringify(expenseData)
    );

    localStorage.setItem(
        'watalappan_stock_history',
        JSON.stringify(stockData)
    );

    localStorage.setItem(
        'watalappan_credit_payments',
        JSON.stringify(creditData)
    );

    localStorage.setItem(
        'watalappan_return_damage',
        JSON.stringify(returnsData)
    );

    localStorage.setItem(
        'watalappan_orders',
        JSON.stringify(ordersData)
    );


    // Update current in-memory ERP variables

    shopDirectory = shopData;
    productsMap = productData;
    salesData = sales;
    expenses = expenseData;
    stockHistory = stockData;
    creditPayments = creditData;


    if (typeof returnDamageList !== 'undefined') {
        returnDamageList = returnsData;
    }

    if (typeof ordersList !== 'undefined') {
        ordersList = ordersData;
    }
}


// ------------------------------------------------------
// Download ERP state after login
// ------------------------------------------------------

async function loadERPStateFromSupabase() {

    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();


    if (userError) {
        throw userError;
    }

    if (!user) {
        throw new Error('User is not logged in.');
    }


    const {
        data,
        error
    } = await supabaseClient
        .from('erp_state')
        .select('data')
        .eq('user_id', user.id)
        .maybeSingle();


    if (error) {
        throw error;
    }


    // Existing cloud database
    if (data && data.data) {

        applyERPState(data.data);

    } else {

        // First login:
        // Upload current local ERP state

        const state = collectERPState();

        const {
            error: insertError
        } = await supabaseClient
            .from('erp_state')
            .insert({
                user_id: user.id,
                data: state,
                updated_at: new Date().toISOString()
            });


        if (insertError) {
            throw insertError;
        }
    }


    erpCloudSyncEnabled = true;
}


// ------------------------------------------------------
// Upload ERP state
// ------------------------------------------------------

async function saveERPStateToSupabase() {

    if (!erpCloudSyncEnabled) {
        return;
    }


    const {
        data: { session }
    } = await supabaseClient.auth.getSession();


    if (!session || !session.user) {
        return;
    }


    const state = collectERPState();


    const {
        error
    } = await supabaseClient
        .from('erp_state')
        .upsert(
            {
                user_id: session.user.id,
                data: state,
                updated_at: new Date().toISOString()
            },
            {
                onConflict: 'user_id'
            }
        );


    if (error) {

        console.error(
            'Supabase ERP sync error:',
            error
        );

    } else {

        console.log(
            'ERP cloud sync completed.'
        );
    }
}


// ------------------------------------------------------
// Avoid sending a database request for every tiny change
// ------------------------------------------------------

function scheduleERPCloudSave() {

    clearTimeout(erpCloudSaveTimer);

    erpCloudSaveTimer = setTimeout(
        saveERPStateToSupabase,
        700
    );
}


// ------------------------------------------------------
// Automatically detect ERP localStorage changes
// ------------------------------------------------------

const originalStorageSetItem =
    Storage.prototype.setItem;


Storage.prototype.setItem =
    function(key, value) {

        const result =
            originalStorageSetItem.call(
                this,
                key,
                value
            );


        if (
            this === window.localStorage &&
            ERP_STORAGE_KEYS.has(key) &&
            erpCloudSyncEnabled
        ) {

            scheduleERPCloudSave();

        }


        return result;
    };

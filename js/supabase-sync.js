// ======================================================
// SMART ENTERPRISE ERP - SUPABASE CLOUD SYNC
// ======================================================


// ======================================================
// SUPABASE CONFIG
// ======================================================

const SUPABASE_URL =
    'https://mptolqigbsayxwtlgrif.supabase.co';


const SUPABASE_PUBLISHABLE_KEY =
    'sb_publishable__DkoX7rIQrG5JAwmcbsW_Q_gaPWq3ol';



const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
        {
            auth:{
                persistSession:true,
                autoRefreshToken:true
            }
        }
    );



// ======================================================
// LOCAL STORAGE KEYS
// ======================================================

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



// ======================================================
// SAFE JSON READ
// ======================================================


function readERPStorage(key,fallback){

    try{

        const value =
            localStorage.getItem(key);


        if(!value){

            return fallback;

        }


        return JSON.parse(value);


    }catch(error){

        console.error(
            "Storage error:",
            error
        );


        return fallback;

    }

}




// ======================================================
// COLLECT ERP STATE
// ======================================================


function collectERPState(){


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




// ======================================================
// APPLY CLOUD DATA
// ======================================================


function applyERPState(state){


    erpCloudSyncEnabled = false;



    localStorage.setItem(
        'watalappan_shop_directory',
        JSON.stringify(
            state.shopDirectory || []
        )
    );


    localStorage.setItem(
        'watalappan_products_map',
        JSON.stringify(
            state.productsMap || {}
        )
    );


    localStorage.setItem(
        'watalappan_sales',
        JSON.stringify(
            state.salesData || []
        )
    );


    localStorage.setItem(
        'watalappan_expenses',
        JSON.stringify(
            state.expenses || []
        )
    );


    localStorage.setItem(
        'watalappan_stock_history',
        JSON.stringify(
            state.stockHistory || []
        )
    );


    localStorage.setItem(
        'watalappan_credit_payments',
        JSON.stringify(
            state.creditPayments || []
        )
    );


    localStorage.setItem(
        'watalappan_return_damage',
        JSON.stringify(
            state.returns || []
        )
    );


    localStorage.setItem(
        'watalappan_orders',
        JSON.stringify(
            state.orders || []
        )
    );



    if(typeof shopDirectory !== 'undefined')
        shopDirectory =
            state.shopDirectory || [];



    if(typeof productsMap !== 'undefined')
        productsMap =
            state.productsMap || {};



    if(typeof salesData !== 'undefined')
        salesData =
            state.salesData || {};



    if(typeof expenses !== 'undefined')
        expenses =
            state.expenses || [];



    if(typeof stockHistory !== 'undefined')
        stockHistory =
            state.stockHistory || [];



    if(typeof creditPayments !== 'undefined')
        creditPayments =
            state.creditPayments || [];



}




// ======================================================
// LOAD ERP STATE
// ======================================================


async function loadERPStateFromSupabase(){


    const {

        data:{
            user

        },

        error:userError

    } =
    await supabaseClient.auth.getUser();



    if(userError)
        throw userError;



    if(!user)
        throw new Error(
            "User not logged in"
        );



    const {

        data,

        error

    } =
    await supabaseClient

    .from('erp_state')

    .select('data')

    .eq(
        'user_id',
        user.id
    )

    .maybeSingle();



    if(error)
        throw error;




    if(data && data.data){


        applyERPState(
            data.data
        );


    }

    else{


        const state =
            collectERPState();



        await supabaseClient

        .from('erp_state')

        .insert({

            user_id:user.id,

            data:state,

            updated_at:
                new Date()
                .toISOString()

        });


    }



    erpCloudSyncEnabled = true;


}





// ======================================================
// SAVE ERP STATE
// ======================================================


async function saveERPStateToSupabase(){


    if(!erpCloudSyncEnabled)
        return;



    const {

        data:{
            session

        }

    } =
    await supabaseClient.auth.getSession();



    if(!session)
        return;




    const state =
        collectERPState();



    const {

        error

    } =
    await supabaseClient

    .from('erp_state')

    .upsert({

        user_id:
            session.user.id,


        data:state,


        updated_at:
            new Date()
            .toISOString()


    },

    {

        onConflict:'user_id'

    });



    if(error)

        console.error(
            "Cloud save error",
            error
        );

    else

        console.log(
            "ERP Sync completed"
        );

}





// ======================================================
// AUTO SAVE TIMER
// ======================================================


function scheduleERPCloudSave(){


    clearTimeout(
        erpCloudSaveTimer
    );


    erpCloudSaveTimer =
        setTimeout(

            saveERPStateToSupabase,

            700

        );

}




// ======================================================
// WATCH LOCAL STORAGE
// ======================================================


const originalStorageSetItem =
    Storage.prototype.setItem;



Storage.prototype.setItem =
function(key,value){


    const result =
        originalStorageSetItem.call(
            this,
            key,
            value
        );



    if(

        this === window.localStorage

        &&

        ERP_STORAGE_KEYS.has(key)

        &&

        erpCloudSyncEnabled

    ){

        scheduleERPCloudSave();

    }



    return result;

};





// ======================================================
// DATABASE PRODUCT FUNCTIONS
// ======================================================



async function getProductsFromDB(){


    const {

        data,

        error

    } =

    await supabaseClient

    .from('products')

    .select(`

        *,

        product_units(*),

        product_prices(*),

        product_batches(*)

    `)

    .order(
        'product_name'
    );



    if(error){

        console.error(
            "Products load error:",
            error
        );


        return [];

    }



    return data || [];

}





// ======================================================
// STOCK TRANSACTION LOAD
// ======================================================


async function getStockTransactionsFromDB(){


    const {

        data,

        error

    } =

    await supabaseClient

    .from('stock_transactions')

    .select('*')

    .order(
        'created_at',
        {
            ascending:false
        }
    );



    if(error){

        console.error(error);

        return [];

    }


    return data || [];

}





// ======================================================
// ADD PRODUCT TO DATABASE
// ======================================================


async function saveProductToDB(product){


    const {

        data,

        error

    } =

    await supabaseClient

    .from('products')

    .insert(product)

    .select()

    .single();



    if(error){

        console.error(
            error
        );

        return null;

    }


    return data;

}

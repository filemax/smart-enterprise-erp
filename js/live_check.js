// Smart Enterprise ERP - Phase 12 Live Readiness Helper
async function checkERPConnection(){
    const result = {
        supabase: false,
        session: false,
        time: new Date().toISOString()
    };

    const client = initSupabase();
    if(client){
        result.supabase = true;
        const {data} = await client.auth.getSession();
        result.session = !!data.session;
    }
    console.log("ERP Live Check:", result);
    return result;
}

async function createAuditEvent(action, module, details){
    const client = initSupabase();
    if(!client) return;
    await cloudSave('audit_logs',{
        action,
        module,
        details,
        created_at: new Date().toISOString()
    });
}

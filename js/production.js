
// Smart ERP Production Layer
// Phase 10: production readiness helpers

const ERP_VERSION = "Production Ready";

function getCurrentUser(){
    try {
        return JSON.parse(localStorage.getItem("erp_user")) || null;
    } catch(e){ return null; }
}

function exportERPBackup(){
    const backup = {
        exported_at: new Date().toISOString(),
        products: JSON.parse(localStorage.getItem("watalappan_products_map") || "{}"),
        sales: JSON.parse(localStorage.getItem("watalappan_sales") || "[]"),
        expenses: JSON.parse(localStorage.getItem("watalappan_expenses") || "[]"),
        stock: JSON.parse(localStorage.getItem("watalappan_stock_history") || "[]")
    };

    const blob = new Blob([JSON.stringify(backup,null,2)], {type:"application/json"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="smart_erp_backup_"+Date.now()+".json";
    a.click();
}

async function createAuditLog(action,module,details){
    if(typeof cloudSave==="function"){
        await cloudSave("audit_logs",{
            action,
            module,
            details,
            created_at:new Date().toISOString()
        });
    }
}

// Advanced ERP features
// User permissions, audit logs, barcode helpers

window.ERPAdvanced = {
  async getCurrentRole() {
    const user = JSON.parse(localStorage.getItem("erp_user") || "{}");
    return user.role || "staff";
  },

  hasPermission(permission) {
    const user = JSON.parse(localStorage.getItem("erp_user") || "{}");
    const role = user.role || "staff";
    const permissions = {
      admin: ["sales","purchase","stock","accounting","reports","settings"],
      manager: ["sales","purchase","stock","reports"],
      staff: ["sales"]
    };
    return (permissions[role] || []).includes(permission);
  },

  async audit(action, module, details={}) {
    try {
      if (!window.supabaseClient) return;
      await window.supabaseClient.from("audit_logs").insert([{
        action, module,
        details: JSON.stringify(details)
      }]);
    } catch(e) { console.log("Audit skipped", e); }
  },

  generateBarcodeCode(){
    return "ERP" + Date.now().toString().slice(-8);
  }
};

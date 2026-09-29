// Advanced ERP features
// User permissions, audit logs, barcode helpers

window.ERPAdvanced = {
  getCurrentUser() {
    try {
      if (window.currentUser) {
        return {
          id: window.currentUser.id,
          email: window.currentUser.email || "",
          role: window.currentProfile?.role || "staff",
          shop_id: window.currentProfile?.shop_id ?? null
        };
      }

      return JSON.parse(localStorage.getItem("erp_user") || "null");
    } catch (e) {
      return null;
    }
  },

  async getCurrentRole() {
    const user = this.getCurrentUser();
    return user?.role || "staff";
  },

  hasPermission(permission) {
    const user = this.getCurrentUser();
    const role = user?.role || "staff";

    const permissions = {
      admin: ["sales", "purchase", "stock", "accounting", "reports", "settings"],
      manager: ["sales", "purchase", "stock", "reports"],
      staff: ["sales"]
    };

    return (permissions[role] || []).includes(permission);
  },

  async audit(action, module, details = {}) {
    try {
      const client = typeof initSupabase === "function" ? initSupabase() : null;
      if (!client) return;

      const { error } = await client.from("audit_logs").insert([{
        action,
        module,
        details: JSON.stringify(details),
        created_at: new Date().toISOString()
      }]);

      if (error) {
        console.warn("Audit skipped:", error.message);
      }
    } catch (e) {
      console.warn("Audit skipped:", e);
    }
  },

  generateBarcodeCode() {
    return "ERP" + Date.now().toString().slice(-8);
  }
};

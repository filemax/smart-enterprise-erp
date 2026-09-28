// Smart Enterprise ERP - Phase 8 Reports
// Cloud-ready reporting foundation

async function getReportSummary() {
    const result = {
        sales: 0,
        purchases: 0,
        expenses: 0,
        stockItems: 0
    };

    if (!window.supabaseClient) return result;

    const [sales, purchases, expenses, products] = await Promise.all([
        window.supabaseClient.from('sales').select('total'),
        window.supabaseClient.from('purchases').select('total'),
        window.supabaseClient.from('expenses').select('amount'),
        window.supabaseClient.from('products').select('id')
    ]);

    result.sales = (sales.data || []).reduce((a,b)=>a + Number(b.total || 0),0);
    result.purchases = (purchases.data || []).reduce((a,b)=>a + Number(b.total || 0),0);
    result.expenses = (expenses.data || []).reduce((a,b)=>a + Number(b.amount || 0),0);
    result.stockItems = (products.data || []).length;

    return result;
}

async function renderCloudReports() {
    const data = await getReportSummary();
    const box = document.getElementById('cloud-report-summary');
    if(!box) return;

    box.innerHTML = `
      <div>Sales: Rs. ${data.sales.toFixed(2)}</div>
      <div>Purchases: Rs. ${data.purchases.toFixed(2)}</div>
      <div>Expenses: Rs. ${data.expenses.toFixed(2)}</div>
      <div>Products: ${data.stockItems}</div>
    `;
}

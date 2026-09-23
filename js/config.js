let shopDirectory = JSON.parse(localStorage.getItem('watalappan_shop_directory')) || [
    { name: "Main Shop", location: "Colombo", phone: "0771234567", wa: "0771234567", specials: {} }
];

let productsMap = JSON.parse(localStorage.getItem('watalappan_products_map')) || {
    "වටලප්පන්": { prices: { Small: 100, Medium: 150, Large: 200 }, expiry: 5, date: new Date().toISOString().split('T')[0], img: "" }
};

let salesData = JSON.parse(localStorage.getItem('watalappan_sales')) || [];
let expenses = JSON.parse(localStorage.getItem('watalappan_expenses')) || [];
let stockHistory = JSON.parse(localStorage.getItem('watalappan_stock_history')) || [];
let creditPayments = JSON.parse(localStorage.getItem('watalappan_credit_payments')) || [];

function populateDropdowns() {
    const stockItemSelect = document.getElementById('stock-item-select');
    const filterProductSelect = document.getElementById('filter-product-select');
    const pnlProductFilterSelect = document.getElementById('pnl-product-filter-select');
    const shopSelect = document.getElementById('shop-select');
    const filterShopSelect = document.getElementById('filter-shop-select');
    const retShop = document.getElementById('ret-shop-select');
    const retProd = document.getElementById('ret-prod-select');
    const orderProd = document.getElementById('order-prod-select');

    if(stockItemSelect) stockItemSelect.innerHTML = '';
    if(filterProductSelect) filterProductSelect.innerHTML = '<option value="ALL">== සියලුම භාණ්ඩ ==</option>';
    if(pnlProductFilterSelect) pnlProductFilterSelect.innerHTML = '<option value="ALL">== සියලුම භාණ්ඩ ==</option>';
    if(retProd) retProd.innerHTML = '';
    if(orderProd) orderProd.innerHTML = '';
    
    Object.keys(productsMap).forEach(t => {
        if(stockItemSelect) stockItemSelect.add(new Option(t, t));
        if(filterProductSelect) filterProductSelect.add(new Option(t, t));
        if(pnlProductFilterSelect) pnlProductFilterSelect.add(new Option(t, t));
        if(retProd) retProd.add(new Option(t, t));
        if(orderProd) orderProd.add(new Option(t, t));
    });

    if(shopSelect) shopSelect.innerHTML = '';
    if(filterShopSelect) filterShopSelect.innerHTML = '<option value="ALL">== සියලුම කඩවල් ==</option>';
    if(retShop) retShop.innerHTML = '';

    shopDirectory.forEach(s => {
        if(shopSelect) shopSelect.add(new Option(s.name, s.name));
        if(filterShopSelect) filterShopSelect.add(new Option(s.name, s.name));
        if(retShop) retShop.add(new Option(s.name, s.name));
    });

    if (typeof refreshBatchSelectors === 'function') refreshBatchSelectors();
}

function getLocalDateString(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getUnexpiredBatchRecords(productName = null, size = null, restoreSaleId = 0) {
    if (!productName || typeof getAvailableBatchRecordsForSale !== 'function') return [];
    return getAvailableBatchRecordsForSale(productName, size, restoreSaleId);
}

// Kept for compatibility with older calls. Sales batches now live inside each item row.
window.updateSalesBatchOptions = function() {
    if (typeof refreshSalesRowBatchOptions === 'function') refreshSalesRowBatchOptions();
};

window.refreshBatchSelectors = function() {
    if (typeof refreshSalesRowBatchOptions === 'function') refreshSalesRowBatchOptions();
};



// Smart Enterprise ERP - Purchase Cloud Sync Phase 6

async function savePurchaseToCloud(purchase){
    return await cloudSave('purchases', purchase);
}

async function savePurchaseItemsToCloud(items){
    for (const item of items || []) {
        await cloudSave('purchase_items', item);
    }
}

async function increaseStockFromPurchase(productId, qty, purchaseId){
    return await cloudSave('stock_transactions', {
        transaction_type: 'PURCHASE_IN',
        reference_id: purchaseId || null,
        product_id: productId,
        qty: qty,
        created_at: new Date().toISOString()
    });
}

async function recordPurchaseLedger(purchase){
    return await cloudSave('ledger_entries', {
        account_type: 'supplier',
        account_id: purchase.supplier_id,
        debit: 0,
        credit: purchase.total || 0,
        reference_type: 'purchase'
    });
}

async function createPurchaseCloudTransaction(purchase, items){
    const saved = await savePurchaseToCloud(purchase);
    await savePurchaseItemsToCloud(items);
    for (const item of items || []) {
        await increaseStockFromPurchase(item.product_id, item.qty, purchase.id);
    }
    if (purchase.payment_type === 'credit') {
        await recordPurchaseLedger(purchase);
    }
    return saved;
}

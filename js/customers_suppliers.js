
// Smart Enterprise ERP - Customers & Suppliers Cloud Base
async function saveCustomerToCloud(customer){
    return await cloudSave('customers', customer);
}

async function saveSupplierToCloud(supplier){
    return await cloudSave('suppliers', supplier);
}

async function recordCustomerPayment(payment){
    await cloudSave('customer_payments', payment);
    return await cloudSave('ledger_entries', {
        account_type:'customer',
        account_id:payment.customer_id,
        debit:0,
        credit:payment.amount,
        reference_type:'payment'
    });
}

async function recordSupplierPayment(payment){
    await cloudSave('supplier_payments', payment);
    return await cloudSave('ledger_entries', {
        account_type:'supplier',
        account_id:payment.supplier_id,
        debit:payment.amount,
        credit:0,
        reference_type:'payment'
    });
}

async function loadCustomersCloud(){
    return await cloudLoad('customers');
}

async function loadSuppliersCloud(){
    return await cloudLoad('suppliers');
}

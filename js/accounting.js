// Smart Enterprise ERP - Accounting Core
// Phase 7: Cash Book, Bank Book, Journal and Ledger foundation

async function createJournalEntry(entry) {
    if (!window.supabaseClient) return null;
    const { data, error } = await window.supabaseClient
        .from('journal_entries')
        .insert([{
            description: entry.description || '',
            reference: entry.reference || '',
            entry_date: entry.entry_date || new Date().toISOString()
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

async function addJournalItem(item) {
    if (!window.supabaseClient) return null;
    const { data, error } = await window.supabaseClient
        .from('journal_items')
        .insert([item])
        .select()
        .single();

    if (error) throw error;
    return data;
}

async function addCashTransaction(transaction) {
    const { data, error } = await window.supabaseClient
        .from('cash_transactions')
        .insert([transaction])
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function addBankTransaction(transaction) {
    const { data, error } = await window.supabaseClient
        .from('bank_transactions')
        .insert([transaction])
        .select()
        .single();
    if (error) throw error;
    return data;
}

window.accountingCore = {
    createJournalEntry,
    addJournalItem,
    addCashTransaction,
    addBankTransaction
};

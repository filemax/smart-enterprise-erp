document.getElementById('expense-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const date = document.getElementById('expense-date').value;
    const desc = document.getElementById('expense-desc').value;
    const amount = parseFloat(document.getElementById('expense-amount').value) || 0;
    const editId = document.getElementById('edit-expense-id').value;

    const record = { id: editId ? parseInt(editId) : Date.now(), date, desc, amount };

    if(editId) {
        const idx = expenses.findIndex(ex => ex.id === parseInt(editId));
        if(idx >= 0) expenses[idx] = record;
    } else {
        expenses.push(record);
    }

    localStorage.setItem('watalappan_expenses', JSON.stringify(expenses));
    renderExpenseTable();
    updateFilteredAnalytics();
    resetExpenseForm();
});

function resetExpenseForm() {
    document.getElementById('edit-expense-id').value = '';
    document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('expense-desc').value = '';
    document.getElementById('expense-amount').value = '';
    document.getElementById('expense-submit-btn').textContent = 'වියදම සටහන් කරන්න';
    document.getElementById('expense-cancel-btn').classList.add('hidden');
}

function renderExpenseTable() {
    const tbody = document.getElementById('expense-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    expenses.slice().reverse().forEach(ex => {
        tbody.innerHTML += `
            <tr>
                <td>${ex.date}</td>
                <td>${ex.desc}</td>
                <td>රු. ${ex.amount.toFixed(2)}</td>
                <td>
                    <span class="edit-btn" onclick="editExpense(${ex.id})">✏️</span>
                    <span class="delete-btn" onclick="deleteExpense(${ex.id})">❌</span>
                </td>
            </tr>`;
    });
}

window.editExpense = function(id) {
    const ex = expenses.find(e => e.id === id);
    if(!ex) return;
    document.getElementById('edit-expense-id').value = ex.id;
    document.getElementById('expense-date').value = ex.date;
    document.getElementById('expense-desc').value = ex.desc;
    document.getElementById('expense-amount').value = ex.amount;
    document.getElementById('expense-submit-btn').textContent = 'වෙනස්කම් සුරකින්න';
    document.getElementById('expense-cancel-btn').classList.remove('hidden');
};

window.deleteExpense = function(id) {
    if(confirm("මෙම වියදම ඉවත් කිරීමට අවශ්‍යද?")) {
        expenses = expenses.filter(ex => ex.id !== id);
        localStorage.setItem('watalappan_expenses', JSON.stringify(expenses));
        renderExpenseTable();
        updateFilteredAnalytics();
    }
};

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
    renderExpenseTable();
});
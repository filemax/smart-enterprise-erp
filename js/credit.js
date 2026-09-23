function getShopBalances() {
    let balances = {};

    salesData.forEach(s => {
        if (s.payment === 'Credit') {
            balances[s.shop] = (balances[s.shop] || 0) + s.total;
        }
    });

    creditPayments.forEach(p => {
        if (balances[p.shop] !== undefined) {
            balances[p.shop] -= p.amount;
        }
    });

    return balances;
}

function renderCreditTable() {
    const tbody = document.getElementById('credit-table-body');
    const creditSelect = document.getElementById('credit-shop-select');
    const totalPendingEl = document.getElementById('credit-total-pending');
    const shopCountEl = document.getElementById('credit-shop-count');

    if(!tbody) return;
    tbody.innerHTML = '';
    if(creditSelect) creditSelect.innerHTML = '';

    const balances = getShopBalances();
    let totalPending = 0;
    let countActiveCreditShops = 0;

    Object.keys(balances).forEach(shop => {
        if (balances[shop] > 0.01) {
            countActiveCreditShops++;
            totalPending += balances[shop];

            const shopSales = salesData.filter(s => s.shop === shop && s.payment === 'Credit');
            const firstCreditDate = shopSales.length > 0 ? shopSales[0].date : '-';
            const totalCreditGiven = shopSales.reduce((acc, curr) => acc + curr.total, 0);

            const shopPays = creditPayments.filter(p => p.shop === shop);
            const lastPayDate = shopPays.length > 0 ? shopPays[shopPays.length - 1].date : '-';
            const totalPaid = shopPays.reduce((acc, curr) => acc + curr.amount, 0);

            tbody.innerHTML += `
                <tr>
                    <td>${firstCreditDate}</td>
                    <td><b>${shop}</b></td>
                    <td>රු. ${totalCreditGiven.toFixed(2)}</td>
                    <td>${lastPayDate}</td>
                    <td style="color:green; font-weight:bold;">රු. ${totalPaid.toFixed(2)}</td>
                    <td style="color:red; font-weight:bold;">රු. ${balances[shop].toFixed(2)}</td>
                </tr>`;
            if(creditSelect) creditSelect.add(new Option(`${shop} (රු. ${balances[shop].toFixed(2)})`, shop));
        }
    });

    if(totalPendingEl) totalPendingEl.textContent = `රු. ${totalPending.toFixed(2)}`;
    if(shopCountEl) shopCountEl.textContent = countActiveCreditShops;

    if(countActiveCreditShops === 0 && creditSelect) {
        creditSelect.add(new Option("ණය ඇති කඩවල් නැත", ""));
    }
}

// 4. සම්පූර්ණ ණය ගෙවා ඉවර වන විට විස්තර සහිත පණිවිඩයක් ලබා දීම
document.getElementById('credit-payment-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const date = document.getElementById('credit-pay-date').value;
    const shop = document.getElementById('credit-shop-select').value;
    const amount = parseFloat(document.getElementById('credit-pay-amount').value) || 0;

    if(!shop) {
        alert("කරුණාකර ණය තිබෙන කඩයක් තෝරන්න!");
        return;
    }

    const balances = getShopBalances();
    const currentDebt = balances[shop] || 0;

    creditPayments.push({ id: Date.now(), date, shop, amount });
    localStorage.setItem('watalappan_credit_payments', JSON.stringify(creditPayments));

    renderCreditTable();
    updateFilteredAnalytics();
    document.getElementById('credit-pay-amount').value = '';

    if (amount >= currentDebt) {
        const remainingChange = (amount - currentDebt).toFixed(2);
        alert(`🎉 සුබ ආරංචියක්!\n\n'${shop}' කඩයේ සියලුම ණය මුදල (රු. ${currentDebt.toFixed(2)}) සම්පූර්ණයෙන්ම ගෙවා අවසන් කර ඇත.\n\nඑම කඩය ක්‍රියාකාරී ණය ලැයිස්තුවෙන් ඉවත් කරන ලදී.${remainingChange > 0 ? '\nඅතිරේක ගෙවීම: රු. ' + remainingChange : ''}`);
    } else {
        const remainingDebt = (currentDebt - amount).toFixed(2);
        alert(`✅ රු. ${amount.toFixed(2)} ක ණය පියවීම සාර්ථකව සටහන් කළා!\n\n'${shop}' කඩයේ ඉතිරි ණය ශේෂය: රු. ${remainingDebt}`);
    }
});

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('credit-pay-date').value = new Date().toISOString().split('T')[0];
    renderCreditTable();
});
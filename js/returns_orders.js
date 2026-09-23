let returnDamageList = JSON.parse(localStorage.getItem('watalappan_return_damage')) || [];
let ordersList = JSON.parse(localStorage.getItem('watalappan_orders')) || [];

// --- RETURN & DAMAGE (3. Edit පහසුකම සහිතව) ---
document.getElementById('return-damage-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const date = document.getElementById('ret-date').value;
    const batchNo = document.getElementById('ret-batch').value;
    const shop = document.getElementById('ret-shop-select').value;
    const product = document.getElementById('ret-prod-select').value;
    const s = parseInt(document.getElementById('ret-qty-s').value) || 0;
    const m = parseInt(document.getElementById('ret-qty-m').value) || 0;
    const l = parseInt(document.getElementById('ret-qty-l').value) || 0;
    const type = document.getElementById('ret-type').value;
    const editId = document.getElementById('edit-ret-id').value;

    const record = { 
        id: editId ? parseInt(editId) : Date.now(), 
        date, 
        batchNo, 
        shop, 
        product, 
        qty: { Small: s, Medium: m, Large: l }, 
        type 
    };

    if(editId) {
        const idx = returnDamageList.findIndex(r => r.id === parseInt(editId));
        if(idx >= 0) returnDamageList[idx] = record;
    } else {
        returnDamageList.push(record);
    }

    localStorage.setItem('watalappan_return_damage', JSON.stringify(returnDamageList));
    renderReturnDamageTable();
    renderStockOverview();
    resetReturnDamageForm();
    alert("✅ Return/Damage සටහන සාර්ථකව සුරැකුණා!");
});

function resetReturnDamageForm() {
    document.getElementById('edit-ret-id').value = '';
    document.getElementById('ret-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('ret-batch').value = '';
    document.getElementById('ret-qty-s').value = '0';
    document.getElementById('ret-qty-m').value = '0';
    document.getElementById('ret-qty-l').value = '0';
    document.getElementById('ret-form-title').textContent = '🔄 Return & Damage සටහන් කිරීම';
    document.getElementById('ret-submit-btn').textContent = 'දත්ත සටහන් කරන්න';
    document.getElementById('ret-cancel-btn').classList.add('hidden');
}

function renderReturnDamageTable() {
    const tbody = document.getElementById('return-damage-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    let totalRet = 0, totalDmg = 0;
    returnDamageList.slice().reverse().forEach(rd => {
        let count = (rd.qty.Small || 0) + (rd.qty.Medium || 0) + (rd.qty.Large || 0);
        if(rd.type === 'Return') totalRet += count;
        if(rd.type === 'Damage') totalDmg += count;

        tbody.innerHTML += `
            <tr>
                <td>${rd.date}</td>
                <td>${rd.batchNo || '-'}</td>
                <td>${rd.shop}</td>
                <td>${rd.product}</td>
                <td>S:${rd.qty.Small} | M:${rd.qty.Medium} | L:${rd.qty.Large}</td>
                <td style="color:${rd.type === 'Damage' ? 'red' : 'orange'}; font-weight:bold;">${rd.type}</td>
                <td>
                    <span class="edit-btn" onclick="editReturnDamage(${rd.id})">✏️</span>
                    <span class="delete-btn" onclick="deleteReturnDamage(${rd.id})">❌</span>
                </td>
            </tr>`;
    });

    const retEl = document.getElementById('ret-dash-returns');
    const dmgEl = document.getElementById('ret-dash-damages');
    if(retEl) retEl.textContent = totalRet;
    if(dmgEl) dmgEl.textContent = totalDmg;
}

window.editReturnDamage = function(id) {
    const rd = returnDamageList.find(r => r.id === id);
    if(!rd) return;
    document.getElementById('edit-ret-id').value = rd.id;
    document.getElementById('ret-date').value = rd.date;
    document.getElementById('ret-batch').value = rd.batchNo || '';
    document.getElementById('ret-shop-select').value = rd.shop;
    document.getElementById('ret-prod-select').value = rd.product;
    document.getElementById('ret-qty-s').value = rd.qty.Small || 0;
    document.getElementById('ret-qty-m').value = rd.qty.Medium || 0;
    document.getElementById('ret-qty-l').value = rd.qty.Large || 0;
    document.getElementById('ret-type').value = rd.type;

    document.getElementById('ret-form-title').textContent = '✏️ Return & Damage සංස්කරණය';
    document.getElementById('ret-submit-btn').textContent = 'වෙනස්කම් සුරකින්න';
    document.getElementById('ret-cancel-btn').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteReturnDamage = function(id) {
    if(confirm("මෙම සටහන ඉවත් කිරීමට අවශ්‍යද?")) {
        returnDamageList = returnDamageList.filter(r => r.id !== id);
        localStorage.setItem('watalappan_return_damage', JSON.stringify(returnDamageList));
        renderReturnDamageTable();
        renderStockOverview();
    }
};

// --- NEW ORDERS (2. දුරකථන අංකය, Edit සහ Auto-Empty පහසුකම) ---
document.getElementById('order-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const reqDate = document.getElementById('order-req-date').value;
    const customer = document.getElementById('order-customer').value.trim();
    const product = document.getElementById('order-prod-select').value;
    const s = parseInt(document.getElementById('order-qty-s').value) || 0;
    const m = parseInt(document.getElementById('order-qty-m').value) || 0;
    const l = parseInt(document.getElementById('order-qty-l').value) || 0;
    const tray = parseInt(document.getElementById('order-qty-tray').value) || 0;
    const location = document.getElementById('order-location').value.trim();
    const phone = document.getElementById('order-phone').value.trim();
    const editId = document.getElementById('edit-order-id').value;

    const record = { 
        id: editId ? parseInt(editId) : Date.now(), 
        reqDate, 
        customer, 
        product, 
        qty: { Small: s, Medium: m, Large: l, Tray: tray }, 
        location, 
        phone 
    };

    if(editId) {
        const idx = ordersList.findIndex(o => o.id === parseInt(editId));
        if(idx >= 0) ordersList[idx] = record;
    } else {
        ordersList.push(record);
    }

    localStorage.setItem('watalappan_orders', JSON.stringify(ordersList));
    renderOrdersTable();
    renderUpcomingOrdersInAnalytics();
    resetOrderForm();
    alert("✅ Order එක සාර්ථකව සුරැකුණා!");
});

function resetOrderForm() {
    document.getElementById('edit-order-id').value = '';
    document.getElementById('order-req-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('order-customer').value = '';
    document.getElementById('order-qty-s').value = '0';
    document.getElementById('order-qty-m').value = '0';
    document.getElementById('order-qty-l').value = '0';
    document.getElementById('order-qty-tray').value = '0';
    document.getElementById('order-location').value = '';
    document.getElementById('order-phone').value = '';
    document.getElementById('order-form-title').textContent = '📋 New Orders කළමනාකරණය';
    document.getElementById('order-submit-btn').textContent = 'Order එක සටහන් කරන්න';
    document.getElementById('order-cancel-btn').classList.add('hidden');
}

function renderOrdersTable() {
    const tbody = document.getElementById('orders-table-body');
    const alertsContainer = document.getElementById('order-near-alerts');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    ordersList.sort((a, b) => new Date(a.reqDate) - new Date(b.reqDate));

    if(alertsContainer) {
        alertsContainer.innerHTML = '';
        const today = new Date().toISOString().split('T')[0];
        const near = ordersList.filter(o => o.reqDate >= today).slice(0, 2);
        near.forEach(o => {
            alertsContainer.innerHTML += `
                <div class="card" style="border-left: 5px solid #ff9800; background: #fff3e0; margin-bottom:8px;">
                    <b>⏰ කිට්ටු Order එකක්:</b> ${o.customer} (${o.product}) - අවශ්‍ය දිනය: ${o.reqDate} | Phone: ${o.phone || '-'} | Location: ${o.location || '-'}
                </div>`;
        });
    }

    ordersList.forEach(o => {
        tbody.innerHTML += `
            <tr>
                <td><b>${o.reqDate}</b></td>
                <td>${o.customer}</td>
                <td>${o.phone || '-'}</td>
                <td>${o.product}</td>
                <td>S:${o.qty.Small} | M:${o.qty.Medium} | L:${o.qty.Large} | Tray:${o.qty.Tray}</td>
                <td>${o.location || '-'}</td>
                <td>
                    <span class="edit-btn" onclick="editOrder(${o.id})">✏️</span>
                    <span class="delete-btn" onclick="deleteOrder(${o.id})">❌</span>
                </td>
            </tr>`;
    });
}

window.editOrder = function(id) {
    const o = ordersList.find(ord => ord.id === id);
    if(!o) return;
    document.getElementById('edit-order-id').value = o.id;
    document.getElementById('order-req-date').value = o.reqDate;
    document.getElementById('order-customer').value = o.customer;
    document.getElementById('order-prod-select').value = o.product;
    document.getElementById('order-qty-s').value = o.qty.Small || 0;
    document.getElementById('order-qty-m').value = o.qty.Medium || 0;
    document.getElementById('order-qty-l').value = o.qty.Large || 0;
    document.getElementById('order-qty-tray').value = o.qty.Tray || 0;
    document.getElementById('order-location').value = o.location || '';
    document.getElementById('order-phone').value = o.phone || '';

    document.getElementById('order-form-title').textContent = '✏️ Order එක වෙනස් කිරීම';
    document.getElementById('order-submit-btn').textContent = 'වෙනස්කම් සුරකින්න';
    document.getElementById('order-cancel-btn').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteOrder = function(id) {
    if(confirm("මෙම Order එක ඉවත් කිරීමට අවශ්‍යද?")) {
        ordersList = ordersList.filter(o => o.id !== id);
        localStorage.setItem('watalappan_orders', JSON.stringify(ordersList));
        renderOrdersTable();
        renderUpcomingOrdersInAnalytics();
    }
};

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('ret-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('order-req-date').value = new Date().toISOString().split('T')[0];
    renderReturnDamageTable();
    renderOrdersTable();
});
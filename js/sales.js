let lastCreatedBill = null;

function getEditingSaleId() {
    const el = document.getElementById('edit-sale-id');
    return el ? (parseInt(el.value) || 0) : 0;
}

function getLegacyItemBatch(itemData, fallbackBatch = '') {
    if (itemData && itemData.batchNo) return itemData.batchNo;
    const legacy = (fallbackBatch || '').toString().trim();
    return legacy && !legacy.includes(',') ? legacy : '';
}

window.addSalesItemRow = function(itemData = null, fallbackBatch = '') {
    const container = document.getElementById('sales-items-container');
    const rowId = 'sale_row_' + Date.now() + '_' + Math.floor(Math.random()*1000);

    let prodOptions = '';
    Object.keys(productsMap).forEach(p => {
        const sel = (itemData && itemData.item === p) ? 'selected' : '';
        prodOptions += `<option value="${p}" ${sel}>${p}</option>`;
    });

    const div = document.createElement('div');
    div.className = 'card sales-item-row';
    div.id = rowId;
    div.style.padding = '10px';
    div.style.marginBottom = '10px';

    div.innerHTML = `
        <div style="display:flex; flex-wrap:wrap; gap:6px; justify-content:space-between; align-items:center; margin-bottom:5px;">
            <select class="s-prod-select" onchange="onSalesRowItemChange('${rowId}')" style="flex:1 1 150px;">${prodOptions}</select>
            <select class="s-size-select" onchange="updateSalesRowBatchOptions('${rowId}')" style="flex:0 1 100px;"></select>
            <select class="s-batch-select" required onchange="updateLiveTotal()" style="flex:1 1 210px;">
                <option value="">== Batch No තෝරන්න ==</option>
            </select>
            <span class="s-stock-indicator" style="font-size:0.75rem; font-weight:bold; color:#0288d1; flex:0 1 90px;">ඉතිරි: -</span>
            <span class="delete-btn" onclick="document.getElementById('${rowId}').remove(); updateLiveTotal();">✖</span>
        </div>
        <div class="form-group-row">
            <div class="form-group" style="flex:1;">
                <label>දැමූ Qty:</label>
                <input type="number" class="s-qty" min="0" value="${itemData ? itemData.qty : 0}" oninput="validateRowQty('${rowId}')">
            </div>
            <div class="form-group" style="flex:1;">
                <label>Return Qty:</label>
                <input type="number" class="s-ret" min="0" value="${itemData ? itemData.retQty : 0}" oninput="validateRowQty('${rowId}')">
            </div>
            <div class="form-group" style="flex:1;">
                <label>Free Qty:</label>
                <input type="number" class="s-free" min="0" value="${itemData ? itemData.freeQty : 0}" oninput="updateLiveTotal()">
            </div>
        </div>
        <div style="text-align:right; font-size:0.85rem; font-weight:bold; color:var(--primary-color);" class="s-row-subtotal">එකතුව: රු. 0.00 (@ 0.00)</div>
    `;

    container.appendChild(div);
    const selectedBatch = getLegacyItemBatch(itemData, fallbackBatch);
    onSalesRowItemChange(rowId, itemData ? itemData.size : null, selectedBatch);
};

window.onSalesRowItemChange = function(rowId, selectedSize = null, selectedBatch = '') {
    const row = document.getElementById(rowId);
    if(!row) return;
    const sizeSelect = row.querySelector('.s-size-select');
    sizeSelect.innerHTML = '';

    ['Small', 'Medium', 'Large'].forEach(sz => {
        const isSel = (selectedSize === sz);
        sizeSelect.add(new Option(sz, sz, isSel, isSel));
    });

    updateSalesRowBatchOptions(rowId, selectedBatch);
};

window.updateSalesRowBatchOptions = function(rowId, selectedBatch = null) {
    const row = document.getElementById(rowId);
    if (!row) return;

    const product = row.querySelector('.s-prod-select').value;
    const size = row.querySelector('.s-size-select').value;
    const select = row.querySelector('.s-batch-select');
    const keepValue = selectedBatch !== null ? selectedBatch : (select.value || '');
    const editId = getEditingSaleId();

    select.innerHTML = '';
    select.add(new Option('== Batch No තෝරන්න ==', ''));

    const records = (typeof getAvailableBatchRecordsForSale === 'function')
        ? getAvailableBatchRecordsForSale(product, size, editId)
        : [];

    records.forEach(batch => {
        const available = parseInt(batch.qty && batch.qty[size]) || 0;
        const label = `${batch.batchNo} — Exp: ${batch.expDate || '-'} — ඉතිරි: ${available}`;
        select.add(new Option(label, batch.batchNo));
    });

    if (keepValue) {
        const exists = Array.from(select.options).some(o => o.value === keepValue);
        if (exists) {
            select.value = keepValue;
        } else if (editId && selectedBatch !== null) {
            // Historical sales may reference a batch that is now expired/empty.
            select.add(new Option(`${keepValue} — පරණ සටහන`, keepValue));
            select.value = keepValue;
        }
    }

    updateLiveTotal();
};

window.refreshSalesRowBatchOptions = function() {
    document.querySelectorAll('.sales-item-row').forEach(row => {
        updateSalesRowBatchOptions(row.id);
    });
};

window.validateRowQty = function(rowId) {
    const row = document.getElementById(rowId);
    if(!row) return;
    updateLiveTotal();
};

document.getElementById('shop-select').addEventListener('change', () => {
    updateLiveTotal();
});

function getItemPrice(shopName, prodName, size) {
    const shopObj = shopDirectory.find(s => s.name === shopName);
    if (shopObj && shopObj.specials && shopObj.specials[prodName] && shopObj.specials[prodName].prices && shopObj.specials[prodName].prices[size]) {
        return shopObj.specials[prodName].prices[size];
    }
    if (productsMap[prodName] && productsMap[prodName].prices && productsMap[prodName].prices[size]) {
        return productsMap[prodName].prices[size];
    }
    return 0;
}

function getPlannedSalesConsumption() {
    const planned = {};
    document.querySelectorAll('.sales-item-row').forEach(row => {
        const product = row.querySelector('.s-prod-select').value;
        const size = row.querySelector('.s-size-select').value;
        const batchNo = row.querySelector('.s-batch-select').value;
        if (!batchNo) return;
        if (!planned[product]) planned[product] = {};
        if (!planned[product][batchNo]) planned[product][batchNo] = { Small: 0, Medium: 0, Large: 0 };
        planned[product][batchNo][size] += (parseInt(row.querySelector('.s-qty').value) || 0) + (parseInt(row.querySelector('.s-ret').value) || 0);
    });
    return planned;
}

window.updateLiveTotal = function() {
    const shopName = document.getElementById('shop-select').value;
    const editId = getEditingSaleId();
    let grandTotal = 0;
    const planned = {};

    document.querySelectorAll('.sales-item-row').forEach(row => {
        const product = row.querySelector('.s-prod-select').value;
        const size = row.querySelector('.s-size-select').value;
        const batchNo = row.querySelector('.s-batch-select').value;
        const qty = parseInt(row.querySelector('.s-qty').value) || 0;
        const ret = parseInt(row.querySelector('.s-ret').value) || 0;
        const free = parseInt(row.querySelector('.s-free').value) || 0;

        if (batchNo) {
            if (!planned[product]) planned[product] = {};
            if (!planned[product][batchNo]) planned[product][batchNo] = { Small: 0, Medium: 0, Large: 0 };
            planned[product][batchNo][size] += (qty + ret);
        }

        const unitPrice = getItemPrice(shopName, product, size);
        const netQty = Math.max(0, qty - ret - free);
        const rowTotal = netQty * unitPrice;

        row.querySelector('.s-row-subtotal').textContent = `එකතුව: රු. ${rowTotal.toFixed(2)} (@ ${unitPrice.toFixed(2)})`;
        grandTotal += rowTotal;

        const stockIndicator = row.querySelector('.s-stock-indicator');
        if (stockIndicator) {
            if (!batchNo) {
                stockIndicator.textContent = 'ඉතිරි: -';
                stockIndicator.style.color = '#0288d1';
            } else {
                const available = (typeof getBatchStockQty === 'function') ? getBatchStockQty(product, batchNo, size, editId) : 0;
                const used = planned[product] && planned[product][batchNo] ? planned[product][batchNo][size] : 0;
                const remaining = available - used;
                stockIndicator.textContent = `ඉතිරි: ${remaining}`;
                stockIndicator.style.color = remaining < 0 ? '#c62828' : '#0288d1';
            }
        }
    });

    document.getElementById('total-price-display').textContent = `රු. ${grandTotal.toFixed(2)}`;
};

function isHistoricalBatchAllowedDuringEdit(saleId, item, size, batchNo) {
    if (!saleId || !batchNo) return false;
    const original = salesData.find(s => parseInt(s.id) === parseInt(saleId));
    if (!original || !Array.isArray(original.items)) return false;
    return original.items.some(i => {
        const originalBatch = getLegacyItemBatch(i, original.batchNo || '');
        return i.item === item && i.size === size && originalBatch === batchNo;
    });
}

// SUBMIT SALES
document.getElementById('sales-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const date = document.getElementById('sales-date').value;
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const shop = document.getElementById('shop-select').value;
    const note = document.getElementById('sales-note').value;
    const payment = document.querySelector('input[name="payment-method"]:checked').value;
    const editId = getEditingSaleId();

    const rows = Array.from(document.querySelectorAll('.sales-item-row'));
    const items = [];
    let grandTotal = 0;
    const planned = {};
    let validationError = '';

    rows.forEach(row => {
        if (validationError) return;
        const item = row.querySelector('.s-prod-select').value;
        const size = row.querySelector('.s-size-select').value;
        const batchNo = row.querySelector('.s-batch-select').value;
        const qty = parseInt(row.querySelector('.s-qty').value) || 0;
        const retQty = parseInt(row.querySelector('.s-ret').value) || 0;
        const freeQty = parseInt(row.querySelector('.s-free').value) || 0;

        if (!batchNo) {
            validationError = `⚠️ '${item} (${size})' සඳහා Batch No එකක් තෝරන්න!`;
            return;
        }

        const availableRecords = (typeof getAvailableBatchRecordsForSale === 'function')
            ? getAvailableBatchRecordsForSale(item, size, editId)
            : [];
        const isCurrentValidBatch = availableRecords.some(b => b.batchNo === batchNo);
        const isHistoricalEditBatch = isHistoricalBatchAllowedDuringEdit(editId, item, size, batchNo);
        if (!isCurrentValidBatch && !isHistoricalEditBatch) {
            validationError = `⚠️ '${item} (${size})' සඳහා තෝරාගත් Batch No එක expired, වැරදි, හෝ stock ඉතිරි නොමැති batch එකකි!`;
            return;
        }

        if (!planned[item]) planned[item] = {};
        if (!planned[item][batchNo]) planned[item][batchNo] = { Small: 0, Medium: 0, Large: 0 };
        planned[item][batchNo][size] += (qty + retQty);

        const availableQty = (typeof getBatchStockQty === 'function') ? getBatchStockQty(item, batchNo, size, editId) : 0;
        if (planned[item][batchNo][size] > availableQty) {
            validationError = `⚠️ '${item} (${size})' Batch '${batchNo}' හි ඉතිරි ${availableQty} පමණයි. Sale Qty + Return Qty එකතුව ${planned[item][batchNo][size]} ලෙස සටහන් කළ නොහැක!`;
            return;
        }

        const unitPrice = getItemPrice(shop, item, size);
        const netQty = Math.max(0, qty - retQty - freeQty);
        const total = netQty * unitPrice;
        items.push({ item, size, batchNo, qty, retQty, freeQty, unitPrice, total });
        grandTotal += total;
    });

    if (validationError) {
        alert(validationError);
        updateLiveTotal();
        return;
    }

    const batchNo = [...new Set(items.map(i => i.batchNo).filter(Boolean))].join(', ');
    const record = { id: editId || Date.now(), date, time: currentTime, shop, batchNo, note, payment, items, total: grandTotal };

    if (editId) {
        const idx = salesData.findIndex(s => s.id === editId);
        if (idx >= 0) salesData[idx] = record;
    } else {
        salesData.push(record);
    }

    lastCreatedBill = record;
    localStorage.setItem('watalappan_sales', JSON.stringify(salesData));

    renderSalesTable();
    renderCreditTable();
    renderStockOverview();
    updateFilteredAnalytics();
    renderLiveBill(lastCreatedBill);
    resetSalesForm();
    alert("✅ අලෙවි සටහන සහ බිල සාර්ථකව සාදන ලදී!");
});

function resetSalesForm() {
    document.getElementById('edit-sale-id').value = '';
    document.getElementById('sales-date').value = new Date().toISOString().split('T')[0];
    const legacyBatch = document.getElementById('sales-batch-no');
    if (legacyBatch) legacyBatch.value = '';
    document.getElementById('sales-note').value = '';
    document.getElementById('sales-items-container').innerHTML = '';
    document.getElementById('sales-submit-btn').textContent = 'දත්ත ඇතුළත් කර බිල සාදන්න';
    document.getElementById('sales-cancel-btn').classList.add('hidden');
    addSalesItemRow();
    updateLiveTotal();
}

function renderLiveBill(bill) {
    const wrapper = document.getElementById('bill-preview-wrapper');
    const container = document.getElementById('printable-bill');
    wrapper.classList.remove('hidden');

    let itemsHtml = '';
    bill.items.forEach(i => {
        const itemBatch = i.batchNo || bill.batchNo || '-';
        itemsHtml += `<div><b>${i.item} (${i.size})</b> [Batch: ${itemBatch}]: Qty:${i.qty} | Ret:${i.retQty} | Free:${i.freeQty} = රු. ${i.total.toFixed(2)} (@ ${i.unitPrice.toFixed(2)})</div>`;
    });

    container.innerHTML = `
        <div class="invoice-title">SMART ENTERPRISE ERP INVOICE</div>
        <div style="display:flex; justify-content:space-between;"><span><b>දිනය:</b> ${bill.date}</span> <span><b>වේලාව:</b> ${bill.time || ''}</span></div>
        <div><b>කඩය:</b> ${bill.shop} (${bill.payment})</div>
        <div><b>සටහන:</b> ${bill.note || '-'}</div>
        <hr style="border-top:1px dashed #aaa; margin:5px 0;">
        ${itemsHtml}
        <hr style="border-top:1px dashed #aaa; margin:5px 0;">
        <div style="font-size:1.1rem; font-weight:bold; text-align:right; color:#2e7d32;">මුළු එකතුව: රු. ${bill.total.toFixed(2)}</div>
    `;
}

function shareBillWA() {
    if(!lastCreatedBill) return;
    let text = `*SMART ENTERPRISE INVOICE*\nදිනය: ${lastCreatedBill.date} (${lastCreatedBill.time || ''})\nකඩය: ${lastCreatedBill.shop}\n---\n`;
    lastCreatedBill.items.forEach(i => {
        const itemBatch = i.batchNo || lastCreatedBill.batchNo || '-';
        text += `${i.item} (${i.size}) [Batch:${itemBatch}] x ${i.qty - i.retQty - i.freeQty} = රු. ${i.total.toFixed(2)}\n`;
    });
    text += `*මුළු මුදල: රු. ${lastCreatedBill.total.toFixed(2)}*`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
}

function shareBillSMS() {
    if(!lastCreatedBill) return;
    let text = `SMART ERP BILL: ${lastCreatedBill.shop} | Date: ${lastCreatedBill.date} ${lastCreatedBill.time || ''} | Total: Rs. ${lastCreatedBill.total.toFixed(2)}`;
    window.open(`sms:?body=${encodeURIComponent(text)}`);
}

function downloadBillPDF() {
    window.print();
}

function printBillDirect() {
    window.print();
}

// EDIT SALES
window.editSale = function(id) {
    const sale = salesData.find(s => s.id === id);
    if(!sale) return;
    document.getElementById('edit-sale-id').value = sale.id;
    document.getElementById('sales-date').value = sale.date;
    document.getElementById('shop-select').value = sale.shop;
    document.getElementById('sales-note').value = sale.note || '';

    const container = document.getElementById('sales-items-container');
    container.innerHTML = '';
    sale.items.forEach(it => {
        addSalesItemRow(it, sale.batchNo || '');
    });

    document.getElementById('sales-submit-btn').textContent = 'වෙනස්කම් සුරකින්න';
    document.getElementById('sales-cancel-btn').classList.remove('hidden');
    updateLiveTotal();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteSale = function(id) {
    if(confirm("මෙම සටහන ඉවත් කිරීමට අවශ්‍යද?")) {
        salesData = salesData.filter(s => s.id !== id);
        localStorage.setItem('watalappan_sales', JSON.stringify(salesData));
        renderSalesTable();
        renderCreditTable();
        renderStockOverview();
        updateFilteredAnalytics();
        if (typeof refreshBatchSelectors === 'function') refreshBatchSelectors();
    }
};

function renderSalesTable() {
    const tbody = document.getElementById('sales-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    salesData.slice().reverse().forEach(s => {
        const summary = s.items.map(i => {
            const itemBatch = i.batchNo || ((s.batchNo || '').includes(',') ? '' : s.batchNo) || '-';
            return `${i.item}(${i.size}) [${itemBatch}]:${i.qty}`;
        }).join(', ');
        const totalRet = s.items.reduce((sum, i) => sum + (i.retQty || 0), 0);
        const totalFree = s.items.reduce((sum, i) => sum + (i.freeQty || 0), 0);

        const rowClass = s.payment === 'Credit' ? 'credit-sale-row' : '';
        tbody.innerHTML += `
            <tr class="${rowClass}">
                <td>${s.date}</td>
                <td>${s.time || '-'}</td>
                <td>${s.shop}</td>
                <td><small>${summary}</small></td>
                <td>${totalRet}</td>
                <td>${totalFree}</td>
                <td>රු. ${s.total.toFixed(2)}</td>
                <td>
                    <span class="edit-btn" onclick="editSale(${s.id})">✏️</span>
                    <span class="delete-btn" onclick="deleteSale(${s.id})">❌</span>
                </td>
            </tr>`;
    });
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('sales-date').value = new Date().toISOString().split('T')[0];
    addSalesItemRow();
    renderSalesTable();
});

function getStockTodayString() {
    if (typeof getLocalDateString === 'function') return getLocalDateString();
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function isStockBatchExpired(expDate) {
    const value = (expDate || '').toString().trim();
    if (!value || value === '-') return false;
    return value < getStockTodayString();
}

// Backward compatibility: older records stored Damage Qty as one number.
// Preserve the total by allocating it across S/M/L against the quantities in that record.
function normalizeStockDamageQty(record) {
    const dmg = record ? record.dmgQty : 0;
    if (dmg && typeof dmg === 'object') {
        return {
            Small: parseInt(dmg.Small) || 0,
            Medium: parseInt(dmg.Medium) || 0,
            Large: parseInt(dmg.Large) || 0
        };
    }

    let remaining = parseInt(dmg) || 0;
    const result = { Small: 0, Medium: 0, Large: 0 };
    const qty = (record && record.qty) ? record.qty : {};

    ['Small', 'Medium', 'Large'].forEach(size => {
        if (remaining <= 0) return;
        const capacity = Math.max(0, parseInt(qty[size]) || 0);
        const take = Math.min(capacity, remaining);
        result[size] += take;
        remaining -= take;
    });

    // Very old invalid records may have damage greater than the added total.
    // Keep that historical amount instead of silently losing it.
    if (remaining > 0) result.Small += remaining;
    return result;
}

function addUnassignedDeduction(target, product, size, amount) {
    if (!amount || amount <= 0) return;
    if (!target[product]) target[product] = { Small: 0, Medium: 0, Large: 0 };
    target[product][size] += amount;
}

function buildBatchStockState(restoreSaleId = 0) {
    const batches = {};
    const unassigned = {};

    const ensureBucket = (product, key, batchNo = '', expDate = '') => {
        if (!batches[product]) batches[product] = {};
        if (!batches[product][key]) {
            batches[product][key] = {
                batchNo,
                expDate: expDate || '',
                qty: { Small: 0, Medium: 0, Large: 0 }
            };
        } else if (expDate && (!batches[product][key].expDate || expDate > batches[product][key].expDate)) {
            // Same batch entered more than once: retain the latest recorded expiry date,
            // matching the previous batch selector behaviour.
            batches[product][key].expDate = expDate;
        }
        return batches[product][key];
    };

    stockHistory.forEach((h, index) => {
        if (!h || !h.item) return;
        const batchNo = (h.batchNo || '').toString().trim();
        const key = batchNo || `__LEGACY_NO_BATCH__${h.id || index}`;
        const bucket = ensureBucket(h.item, key, batchNo, (h.expDate || '').toString().trim());
        const damage = normalizeStockDamageQty(h);
        const sample = h.sample || {};

        ['Small', 'Medium', 'Large'].forEach(size => {
            bucket.qty[size] += (parseInt(h.qty && h.qty[size]) || 0);
            bucket.qty[size] -= (parseInt(sample[size]) || 0);
            bucket.qty[size] -= (parseInt(damage[size]) || 0);
        });
    });

    // Keep the existing Return & Damage module behaviour: only Damage reduces stock.
    const returnDamageList = JSON.parse(localStorage.getItem('watalappan_return_damage')) || [];
    returnDamageList.forEach(rd => {
        if (!rd || rd.type !== 'Damage' || !rd.product || !rd.qty) return;
        const batchNo = (rd.batchNo || '').toString().trim();

        ['Small', 'Medium', 'Large'].forEach(size => {
            const amount = parseInt(rd.qty[size]) || 0;
            if (amount <= 0) return;
            if (batchNo && batches[rd.product] && batches[rd.product][batchNo]) {
                batches[rd.product][batchNo].qty[size] -= amount;
            } else {
                addUnassignedDeduction(unassigned, rd.product, size, amount);
            }
        });
    });

    // Sales reduce stock by both Sale Qty and Return Qty as requested.
    salesData.forEach(sale => {
        if (!sale || !Array.isArray(sale.items)) return;
        if (restoreSaleId && parseInt(sale.id) === parseInt(restoreSaleId)) return;

        sale.items.forEach(item => {
            if (!item || !item.item || !item.size) return;
            const consumption = (parseInt(item.qty) || 0) + (parseInt(item.retQty) || 0);
            if (consumption <= 0) return;

            let batchNo = (item.batchNo || '').toString().trim();
            // Backward compatibility for old sales that had one invoice-level batch.
            if (!batchNo) {
                const legacyBatch = (sale.batchNo || '').toString().trim();
                if (legacyBatch && !legacyBatch.includes(',')) batchNo = legacyBatch;
            }

            if (batchNo && batches[item.item] && batches[item.item][batchNo]) {
                batches[item.item][batchNo].qty[item.size] -= consumption;
            } else {
                addUnassignedDeduction(unassigned, item.item, item.size, consumption);
            }
        });
    });

    // Older sales/damages may not have a batch. Deduct them FIFO from the oldest-expiring
    // batches so the available batch list and the overall stock stay consistent.
    Object.keys(unassigned).forEach(product => {
        const productBuckets = batches[product] ? Object.values(batches[product]) : [];
        productBuckets.sort((a, b) => {
            const aExp = a.expDate || '9999-12-31';
            const bExp = b.expDate || '9999-12-31';
            if (aExp !== bExp) return aExp.localeCompare(bExp);
            return (a.batchNo || '').localeCompare(b.batchNo || '');
        });

        ['Small', 'Medium', 'Large'].forEach(size => {
            let remaining = unassigned[product][size] || 0;
            productBuckets.forEach(bucket => {
                if (remaining <= 0) return;
                const available = Math.max(0, bucket.qty[size] || 0);
                const take = Math.min(available, remaining);
                bucket.qty[size] -= take;
                remaining -= take;
            });

            // Preserve any historical over-deduction instead of hiding it.
            if (remaining > 0 && productBuckets.length) {
                productBuckets[productBuckets.length - 1].qty[size] -= remaining;
            }
        });
    });

    return batches;
}

function calculateCurrentStock() {
    const stock = {};
    Object.keys(productsMap).forEach(p => {
        stock[p] = { Small: 0, Medium: 0, Large: 0 };
    });

    const batches = buildBatchStockState();
    Object.keys(batches).forEach(product => {
        if (!stock[product]) stock[product] = { Small: 0, Medium: 0, Large: 0 };
        Object.values(batches[product]).forEach(bucket => {
            // Expired stock is not usable and therefore is excluded from current stock.
            if (isStockBatchExpired(bucket.expDate)) return;
            ['Small', 'Medium', 'Large'].forEach(size => {
                stock[product][size] += parseInt(bucket.qty[size]) || 0;
            });
        });
    });

    return stock;
}

function getBatchStockQty(product, batchNo, size, restoreSaleId = 0) {
    const batches = buildBatchStockState(restoreSaleId);
    if (!batches[product] || !batches[product][batchNo]) return 0;
    return parseInt(batches[product][batchNo].qty[size]) || 0;
}

function getAvailableBatchRecordsForSale(product, size = null, restoreSaleId = 0) {
    const batches = buildBatchStockState(restoreSaleId);
    if (!product || !batches[product]) return [];

    return Object.values(batches[product])
        .filter(bucket => {
            if (!bucket.batchNo || isStockBatchExpired(bucket.expDate)) return false;
            if (size) return (parseInt(bucket.qty[size]) || 0) > 0;
            return ['Small', 'Medium', 'Large'].some(sz => (parseInt(bucket.qty[sz]) || 0) > 0);
        })
        .sort((a, b) => {
            const aExp = a.expDate || '9999-12-31';
            const bExp = b.expDate || '9999-12-31';
            if (aExp !== bExp) return aExp.localeCompare(bExp);
            return a.batchNo.localeCompare(b.batchNo);
        })
        .map(bucket => ({
            batchNo: bucket.batchNo,
            item: product,
            expDate: bucket.expDate,
            qty: { ...bucket.qty }
        }));
}

window.getBatchStockQty = getBatchStockQty;
window.getAvailableBatchRecordsForSale = getAvailableBatchRecordsForSale;
window.isStockBatchExpired = isStockBatchExpired;
window.normalizeStockDamageQty = normalizeStockDamageQty;

window.onStockItemSelectChange = function() {
    const item = document.getElementById('stock-item-select') ? document.getElementById('stock-item-select').value : '';
    const dateInput = document.getElementById('stock-date') ? document.getElementById('stock-date').value : new Date().toISOString().split('T')[0];
    
    if (document.getElementById('stock-qty-s')) document.getElementById('stock-qty-s').value = '0';
    if (document.getElementById('stock-qty-m')) document.getElementById('stock-qty-m').value = '0';
    if (document.getElementById('stock-qty-l')) document.getElementById('stock-qty-l').value = '0';
    if (document.getElementById('stock-cost')) document.getElementById('stock-cost').value = '0';
    if (document.getElementById('stock-dmg-s')) document.getElementById('stock-dmg-s').value = '0';
    if (document.getElementById('stock-dmg-m')) document.getElementById('stock-dmg-m').value = '0';
    if (document.getElementById('stock-dmg-l')) document.getElementById('stock-dmg-l').value = '0';
    if (document.getElementById('stock-sample-s')) document.getElementById('stock-sample-s').value = '0';
    if (document.getElementById('stock-sample-m')) document.getElementById('stock-sample-m').value = '0';
    if (document.getElementById('stock-sample-l')) document.getElementById('stock-sample-l').value = '0';

    if (productsMap[item] && productsMap[item].expiry && document.getElementById('stock-exp-date')) {
        let d = new Date(dateInput);
        d.setDate(d.getDate() + parseInt(productsMap[item].expiry));
        document.getElementById('stock-exp-date').value = d.toISOString().split('T')[0];
    }
};

document.getElementById('stock-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const date = document.getElementById('stock-date').value;
    const batchNo = document.getElementById('stock-batch-no') ? document.getElementById('stock-batch-no').value.trim() : '-';
    const item = document.getElementById('stock-item-select').value;
    const expDate = document.getElementById('stock-exp-date') ? document.getElementById('stock-exp-date').value : '-';
    const s = parseInt(document.getElementById('stock-qty-s').value) || 0;
    const m = parseInt(document.getElementById('stock-qty-m').value) || 0;
    const l = parseInt(document.getElementById('stock-qty-l').value) || 0;
    const cost = document.getElementById('stock-cost') ? (parseFloat(document.getElementById('stock-cost').value) || 0) : 0;
    const dmgS = document.getElementById('stock-dmg-s') ? (parseInt(document.getElementById('stock-dmg-s').value) || 0) : 0;
    const dmgM = document.getElementById('stock-dmg-m') ? (parseInt(document.getElementById('stock-dmg-m').value) || 0) : 0;
    const dmgL = document.getElementById('stock-dmg-l') ? (parseInt(document.getElementById('stock-dmg-l').value) || 0) : 0;
    const sampleS = document.getElementById('stock-sample-s') ? (parseInt(document.getElementById('stock-sample-s').value) || 0) : 0;
    const sampleM = document.getElementById('stock-sample-m') ? (parseInt(document.getElementById('stock-sample-m').value) || 0) : 0;
    const sampleL = document.getElementById('stock-sample-l') ? (parseInt(document.getElementById('stock-sample-l').value) || 0) : 0;
    const editId = document.getElementById('edit-stock-id').value;

    // Prevent Damage + Sample from making the newly added quantity negative.
    const invalidSize = [
        ['Small', s, dmgS, sampleS],
        ['Medium', m, dmgM, sampleM],
        ['Large', l, dmgL, sampleL]
    ].find(([, added, damaged, sampled]) => damaged + sampled > added);

    if (invalidSize) {
        alert(`⚠️ ${invalidSize[0]} සඳහා Damage Qty + Sample Qty එකතු කළ Qty (${invalidSize[1]}) ට වඩා වැඩි විය නොහැක!`);
        return;
    }

    const record = { 
        id: editId ? parseInt(editId) : Date.now(), 
        date, 
        batchNo, 
        item, 
        expDate, 
        qty: { Small: s, Medium: m, Large: l },
        cost,
        dmgQty: { Small: dmgS, Medium: dmgM, Large: dmgL },
        sample: { Small: sampleS, Medium: sampleM, Large: sampleL }
    };

    if(editId) {
        const idx = stockHistory.findIndex(st => st.id === parseInt(editId));
        if(idx >= 0) stockHistory[idx] = record;
    } else {
        stockHistory.push(record);
    }

    localStorage.setItem('watalappan_stock_history', JSON.stringify(stockHistory));
    renderStockOverview();
    renderStockHistory();
    if (typeof renderExpiryAlerts === 'function') renderExpiryAlerts();
    if (typeof refreshBatchSelectors === 'function') refreshBatchSelectors();
    resetStockForm();
    alert(`✅ '${item}' තොගය සාර්ථකව ඇතුළත් විය!`);
});

function resetStockForm() {
    document.getElementById('edit-stock-id').value = '';
    document.getElementById('stock-date').value = new Date().toISOString().split('T')[0];
    if (document.getElementById('stock-batch-no')) document.getElementById('stock-batch-no').value = '';
    document.getElementById('stock-qty-s').value = '0';
    document.getElementById('stock-qty-m').value = '0';
    document.getElementById('stock-qty-l').value = '0';
    if (document.getElementById('stock-cost')) document.getElementById('stock-cost').value = '0';
    if (document.getElementById('stock-dmg-s')) document.getElementById('stock-dmg-s').value = '0';
    if (document.getElementById('stock-dmg-m')) document.getElementById('stock-dmg-m').value = '0';
    if (document.getElementById('stock-dmg-l')) document.getElementById('stock-dmg-l').value = '0';
    if (document.getElementById('stock-sample-s')) document.getElementById('stock-sample-s').value = '0';
    if (document.getElementById('stock-sample-m')) document.getElementById('stock-sample-m').value = '0';
    if (document.getElementById('stock-sample-l')) document.getElementById('stock-sample-l').value = '0';
    document.getElementById('stock-submit-btn').textContent = 'තොගය එකතු කරන්න';
    document.getElementById('stock-cancel-btn').classList.add('hidden');
    onStockItemSelectChange();
}

function renderStockOverview() {
    const tbody = document.getElementById('stock-overview-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    const stock = calculateCurrentStock();

    Object.keys(stock).forEach(p => {
        tbody.innerHTML += `
            <tr>
                <td><b>${p}</b></td>
                <td>${stock[p].Small}</td>
                <td>${stock[p].Medium}</td>
                <td>${stock[p].Large}</td>
            </tr>`;
    });
}

function renderStockHistory() {
    const tbody = document.getElementById('stock-history-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    stockHistory.slice().reverse().forEach(h => {
        const s = (h.qty && h.qty.Small !== undefined) ? h.qty.Small : 0;
        const m = (h.qty && h.qty.Medium !== undefined) ? h.qty.Medium : 0;
        const l = (h.qty && h.qty.Large !== undefined) ? h.qty.Large : 0;
        const damage = normalizeStockDamageQty(h);
        tbody.innerHTML += `
            <tr>
                <td>${h.date}</td>
                <td>${h.batchNo || '-'}</td>
                <td>${h.item}</td>
                <td>${h.expDate || '-'}</td>
                <td>Add S:${s} | M:${m} | L:${l}<br><small>Damage S:${damage.Small} | M:${damage.Medium} | L:${damage.Large}</small></td>
                <td>
                    <span class="edit-btn" onclick="editStock(${h.id})">✏️</span>
                    <span class="delete-btn" onclick="deleteStock(${h.id})">❌</span>
                </td>
            </tr>`;
    });
}

window.editStock = function(id) {
    const h = stockHistory.find(s => s.id === id);
    if(!h) return;
    const damage = normalizeStockDamageQty(h);
    document.getElementById('edit-stock-id').value = h.id;
    document.getElementById('stock-date').value = h.date;
    if (document.getElementById('stock-batch-no')) document.getElementById('stock-batch-no').value = h.batchNo || '';
    document.getElementById('stock-item-select').value = h.item;
    if (document.getElementById('stock-exp-date')) document.getElementById('stock-exp-date').value = h.expDate || '';
    document.getElementById('stock-qty-s').value = (h.qty && h.qty.Small !== undefined) ? h.qty.Small : 0;
    document.getElementById('stock-qty-m').value = (h.qty && h.qty.Medium !== undefined) ? h.qty.Medium : 0;
    document.getElementById('stock-qty-l').value = (h.qty && h.qty.Large !== undefined) ? h.qty.Large : 0;
    if (document.getElementById('stock-cost')) document.getElementById('stock-cost').value = h.cost || 0;
    if (document.getElementById('stock-dmg-s')) document.getElementById('stock-dmg-s').value = damage.Small;
    if (document.getElementById('stock-dmg-m')) document.getElementById('stock-dmg-m').value = damage.Medium;
    if (document.getElementById('stock-dmg-l')) document.getElementById('stock-dmg-l').value = damage.Large;
    if (document.getElementById('stock-sample-s')) document.getElementById('stock-sample-s').value = h.sample ? h.sample.Small : 0;
    if (document.getElementById('stock-sample-m')) document.getElementById('stock-sample-m').value = h.sample ? h.sample.Medium : 0;
    if (document.getElementById('stock-sample-l')) document.getElementById('stock-sample-l').value = h.sample ? h.sample.Large : 0;

    document.getElementById('stock-submit-btn').textContent = 'වෙනස්කම් සුරකින්න';
    document.getElementById('stock-cancel-btn').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteStock = function(id) {
    if(confirm("මෙම සටහන ඉවත් කිරීමට අවශ්‍යද?")) {
        stockHistory = stockHistory.filter(s => s.id !== id);
        localStorage.setItem('watalappan_stock_history', JSON.stringify(stockHistory));
        renderStockOverview();
        renderStockHistory();
        if (typeof renderExpiryAlerts === 'function') renderExpiryAlerts();
        if (typeof refreshBatchSelectors === 'function') refreshBatchSelectors();
    }
};

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('stock-date').value = new Date().toISOString().split('T')[0];
    renderStockOverview();
    renderStockHistory();
    onStockItemSelectChange();
});

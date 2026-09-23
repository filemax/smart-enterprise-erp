// --- PRODUCT SETTINGS ---
document.getElementById('add-product-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const date = document.getElementById('new-prod-date').value;
    const name = document.getElementById('new-prod-name').value.trim();
    const priceS = parseFloat(document.getElementById('new-prod-price-s').value) || 0;
    const priceM = parseFloat(document.getElementById('new-prod-price-m').value) || 0;
    const priceL = parseFloat(document.getElementById('new-prod-price-l').value) || 0;
    const expiry = parseInt(document.getElementById('new-prod-expiry').value) || 0;
    const fileInput = document.getElementById('new-prod-img');
    const keyToEdit = document.getElementById('edit-prod-key').value;

    if (!name) {
        alert("කරුණාකර භාණ්ඩයේ නම ඇතුළත් කරන්න!");
        return;
    }

    let existingImg = (keyToEdit && productsMap[keyToEdit]) ? productsMap[keyToEdit].img : '';

    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function (event) {
            saveProductData(name, { Small: priceS, Medium: priceM, Large: priceL }, expiry, date, event.target.result, keyToEdit);
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        saveProductData(name, { Small: priceS, Medium: priceM, Large: priceL }, expiry, date, existingImg, keyToEdit);
    }
});

function saveProductData(name, prices, expiry, date, imgSrc, keyToEdit) {
    if (keyToEdit && keyToEdit !== name) {
        delete productsMap[keyToEdit];
    }
    
    productsMap[name] = { 
        prices: {
            Small: parseFloat(prices.Small) || 0,
            Medium: parseFloat(prices.Medium) || 0,
            Large: parseFloat(prices.Large) || 0
        }, 
        expiry: expiry, 
        date: date, 
        img: imgSrc || '' 
    };

    localStorage.setItem('watalappan_products_map', JSON.stringify(productsMap));
    
    if (typeof populateDropdowns === 'function') populateDropdowns();
    renderProductsSettings();
    if (typeof renderStockOverview === 'function') renderStockOverview();
    resetProductForm();
    alert(`✅ '${name}' භාණ්ඩය සාර්ථකව සුරැකුණා!`);
}

function resetProductForm() {
    document.getElementById('edit-prod-key').value = '';
    document.getElementById('new-prod-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('new-prod-name').value = '';
    document.getElementById('new-prod-price-s').value = '';
    document.getElementById('new-prod-price-m').value = '';
    document.getElementById('new-prod-price-l').value = '';
    document.getElementById('new-prod-expiry').value = '';
    document.getElementById('new-prod-img').value = '';
    document.getElementById('product-form-title').textContent = '⚙️ නව භාණ්ඩ එකතු කිරීම';
    document.getElementById('add-prod-btn').textContent = 'භාණ්ඩය එකතු කරන්න';
    document.getElementById('cancel-prod-edit').classList.add('hidden');
}

function renderProductsSettings() {
    const tbody = document.getElementById('products-settings-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const keys = Object.keys(productsMap);
    if (keys.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:gray;">භාණ්ඩ කිසිවක් ඇතුළත් කර නැත.</td></tr>';
        return;
    }

    keys.forEach(name => {
        const p = productsMap[name];
        const imgTag = p.img ? `<img src="${p.img}" style="width:30px; height:30px; border-radius:4px; object-fit:cover;">` : '📷';
        const pS = (p.prices && p.prices.Small !== undefined) ? Number(p.prices.Small).toFixed(2) : '0.00';
        const pM = (p.prices && p.prices.Medium !== undefined) ? Number(p.prices.Medium).toFixed(2) : '0.00';
        const pL = (p.prices && p.prices.Large !== undefined) ? Number(p.prices.Large).toFixed(2) : '0.00';

        tbody.innerHTML += `
            <tr>
                <td>${imgTag}</td>
                <td><b>${name}</b><br><small style="color:gray;">${p.date || ''}</small></td>
                <td>S:${pS} | M:${pM} | L:${pL}</td>
                <td>${p.expiry || 0} දින</td>
                <td>
                    <span class="edit-btn" onclick="editProduct('${name}')">✏️</span>
                    <span class="delete-btn" onclick="deleteProduct('${name}')">❌</span>
                </td>
            </tr>`;
    });
}

window.editProduct = function(name) {
    const p = productsMap[name];
    if(!p) return;
    document.getElementById('edit-prod-key').value = name;
    document.getElementById('new-prod-date').value = p.date || new Date().toISOString().split('T')[0];
    document.getElementById('new-prod-name').value = name;
    document.getElementById('new-prod-price-s').value = (p.prices && p.prices.Small !== undefined) ? p.prices.Small : '';
    document.getElementById('new-prod-price-m').value = (p.prices && p.prices.Medium !== undefined) ? p.prices.Medium : '';
    document.getElementById('new-prod-price-l').value = (p.prices && p.prices.Large !== undefined) ? p.prices.Large : '';
    document.getElementById('new-prod-expiry').value = p.expiry || '';
    document.getElementById('product-form-title').textContent = '✏️ භාණ්ඩය වෙනස් කිරීම';
    document.getElementById('add-prod-btn').textContent = 'වෙනස්කම් සුරකින්න';
    document.getElementById('cancel-prod-edit').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteProduct = function(name) {
    if(confirm(`"${name}" පද්ධතියෙන් ඉවත් කිරීමට අවශ්‍යද?`)) {
        delete productsMap[name];
        localStorage.setItem('watalappan_products_map', JSON.stringify(productsMap));
        if (typeof populateDropdowns === 'function') populateDropdowns(); 
        renderProductsSettings(); 
        if (typeof renderStockOverview === 'function') renderStockOverview();
    }
};

// --- SHOP SETTINGS WITH DYNAMIC SPECIAL PRICES, DATE, LOCATION & IMAGE ---
window.addShopSpecialPriceRow = function(prodData = null) {
    const container = document.getElementById('shop-special-prices-container');
    const rowId = 'sp_row_' + Date.now() + '_' + Math.floor(Math.random()*1000);
    
    let prodOptions = '';
    Object.keys(productsMap).forEach(p => {
        const sel = (prodData && prodData.prod === p) ? 'selected' : '';
        prodOptions += `<option value="${p}" ${sel}>${p}</option>`;
    });

    const isS = (prodData && prodData.sizes && prodData.sizes.includes('Small')) ? 'checked' : '';
    const isM = (prodData && prodData.sizes && prodData.sizes.includes('Medium')) ? 'checked' : '';
    const isL = (prodData && prodData.sizes && prodData.sizes.includes('Large')) ? 'checked' : '';
    
    const priceS = (prodData && prodData.prices && prodData.prices.Small !== undefined) ? prodData.prices.Small : '';
    const priceM = (prodData && prodData.prices && prodData.prices.Medium !== undefined) ? prodData.prices.Medium : '';
    const priceL = (prodData && prodData.prices && prodData.prices.Large !== undefined) ? prodData.prices.Large : '';

    const div = document.createElement('div');
    div.className = 'card sp-row-card';
    div.style.padding = '8px';
    div.style.marginBottom = '8px';
    div.id = rowId;
    div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <select class="sp-prod-select" style="width:70%;">${prodOptions}</select>
            <span class="delete-btn" onclick="document.getElementById('${rowId}').remove()">✖</span>
        </div>
        <div style="display:flex; gap:5px; margin-top:5px; font-size:0.75rem;">
            <label><input type="checkbox" class="sp-size-s" ${isS}> S</label>
            <input type="number" class="sp-price-s" step="0.01" value="${priceS}" placeholder="S විශේෂ මිල" style="padding:2px; font-size:0.75rem;">
        </div>
        <div style="display:flex; gap:5px; margin-top:3px; font-size:0.75rem;">
            <label><input type="checkbox" class="sp-size-m" ${isM}> M</label>
            <input type="number" class="sp-price-m" step="0.01" value="${priceM}" placeholder="M විශේෂ මිල" style="padding:2px; font-size:0.75rem;">
        </div>
        <div style="display:flex; gap:5px; margin-top:3px; font-size:0.75rem;">
            <label><input type="checkbox" class="sp-size-l" ${isL}> L</label>
            <input type="number" class="sp-price-l" step="0.01" value="${priceL}" placeholder="L විශේෂ මිල" style="padding:2px; font-size:0.75rem;">
        </div>
    `;
    container.appendChild(div);
};

document.getElementById('add-shop-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const date = document.getElementById('new-shop-date').value;
    const name = document.getElementById('new-shop-name').value.trim();
    const location = document.getElementById('new-shop-location').value.trim();
    const phone = document.getElementById('new-shop-phone').value.trim();
    const wa = document.getElementById('new-shop-wa').value.trim();
    const fileInput = document.getElementById('new-shop-img');
    const index = parseInt(document.getElementById('edit-shop-index').value);

    let existingImg = (index >= 0 && shopDirectory[index]) ? shopDirectory[index].img : '';

    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(event) {
            saveShopData(name, date, location, phone, wa, event.target.result, index);
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        saveShopData(name, date, location, phone, wa, existingImg, index);
    }
});

function saveShopData(name, date, location, phone, wa, imgSrc, index) {
    let specials = {};
    document.querySelectorAll('#shop-special-prices-container .sp-row-card').forEach(row => {
        const prod = row.querySelector('.sp-prod-select').value;
        let sizes = [];
        let prices = {};

        const checkS = row.querySelector('.sp-size-s').checked;
        const valS = parseFloat(row.querySelector('.sp-price-s').value);
        if (checkS || (!isNaN(valS) && valS > 0)) {
            sizes.push('Small');
            prices.Small = !isNaN(valS) ? valS : 0;
        }

        const checkM = row.querySelector('.sp-size-m').checked;
        const valM = parseFloat(row.querySelector('.sp-price-m').value);
        if (checkM || (!isNaN(valM) && valM > 0)) {
            sizes.push('Medium');
            prices.Medium = !isNaN(valM) ? valM : 0;
        }

        const checkL = row.querySelector('.sp-size-l').checked;
        const valL = parseFloat(row.querySelector('.sp-price-l').value);
        if (checkL || (!isNaN(valL) && valL > 0)) {
            sizes.push('Large');
            prices.Large = !isNaN(valL) ? valL : 0;
        }

        if (prod && sizes.length > 0) {
            specials[prod] = { sizes, prices };
        }
    });

    const shopObj = { name, date, location, phone, wa, img: imgSrc || '', specials };

    if (index >= 0) shopDirectory[index] = shopObj;
    else shopDirectory.push(shopObj);

    localStorage.setItem('watalappan_shop_directory', JSON.stringify(shopDirectory));
    if (typeof populateDropdowns === 'function') populateDropdowns();
    renderShops();
    resetShopForm();
    alert(`✅ '${name}' කඩයේ විස්තර සාර්ථකව සුරැකුණා!`);
}

function resetShopForm() {
    document.getElementById('edit-shop-index').value = "-1";
    document.getElementById('new-shop-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('new-shop-name').value = '';
    document.getElementById('new-shop-location').value = '';
    document.getElementById('new-shop-phone').value = '';
    document.getElementById('new-shop-wa').value = '';
    document.getElementById('new-shop-img').value = '';
    document.getElementById('shop-special-prices-container').innerHTML = '';
    document.getElementById('shop-form-title').textContent = '🏪 නව කඩයක් එකතු කිරීම';
    document.getElementById('add-shop-btn').textContent = 'කඩය එකතු කරන්න';
    document.getElementById('cancel-shop-edit').classList.add('hidden');
}

function renderShops() {
    const tbody = document.getElementById('shop-settings-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    shopDirectory.forEach((s, index) => {
        let specialSummary = '';
        if (s.specials && Object.keys(s.specials).length > 0) {
            Object.keys(s.specials).forEach(p => {
                const sp = s.specials[p];
                let priceDetails = Object.keys(sp.prices).map(sz => `${sz}: රු.${Number(sp.prices[sz]).toFixed(2)}`).join(' | ');
                specialSummary += `<div><b>${p}:</b> ${priceDetails}</div>`;
            });
        }
        const imgTag = s.img ? `<img src="${s.img}" style="width:30px; height:30px; border-radius:4px; object-fit:cover;">` : '🏪';
        tbody.innerHTML += `
            <tr>
                <td>${imgTag}</td>
                <td><b>${s.name}</b><br><small style="color:gray;">${s.location || '-'} (${s.date || ''})</small></td>
                <td>P: ${s.phone || '-'}<br>WA: ${s.wa || '-'}</td>
                <td><small>${specialSummary || 'සාමාන්‍ය මිල'}</small></td>
                <td>
                    <span class="edit-btn" onclick="editShop(${index})">✏️</span>
                    <span class="delete-btn" onclick="deleteShop(${index})">❌</span>
                </td>
            </tr>`;
    });
}

window.editShop = function(index) {
    const s = shopDirectory[index];
    if(!s) return;
    document.getElementById('edit-shop-index').value = index;
    document.getElementById('new-shop-date').value = s.date || new Date().toISOString().split('T')[0];
    document.getElementById('new-shop-name').value = s.name;
    document.getElementById('new-shop-location').value = s.location || '';
    document.getElementById('new-shop-phone').value = s.phone || '';
    document.getElementById('new-shop-wa').value = s.wa || '';
    document.getElementById('shop-form-title').textContent = '✏️ කඩයේ විස්තර වෙනස් කිරීම';
    document.getElementById('add-shop-btn').textContent = 'වෙනස්කම් සුරකින්න';
    document.getElementById('cancel-shop-edit').classList.remove('hidden');

    const container = document.getElementById('shop-special-prices-container');
    container.innerHTML = '';
    if (s.specials) {
        Object.keys(s.specials).forEach(p => {
            addShopSpecialPriceRow({
                prod: p,
                sizes: s.specials[p].sizes,
                prices: s.specials[p].prices
            });
        });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteShop = function(index) {
    if(confirm(`මෙම කඩය ඉවත් කිරීමට අවශ්‍යද?`)) {
        shopDirectory.splice(index, 1);
        localStorage.setItem('watalappan_shop_directory', JSON.stringify(shopDirectory));
        if (typeof populateDropdowns === 'function') populateDropdowns();
        renderShops();
    }
};

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('new-prod-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('new-shop-date').value = new Date().toISOString().split('T')[0];
    renderShops();
    renderProductsSettings();
});
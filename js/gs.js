
/* ===== GS TRACKING PAGE ===== */
var GS_DATA = [];
var GS_PRODUCTS = [];
var CURRENT_MONTH_GS = 'M07';

document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    setDefaultMonthGS();

    var selMonth    = document.getElementById('selMonth');
    var filterArea  = document.getElementById('filterArea');
    var filterType  = document.getElementById('filterType');
    var filterSales = document.getElementById('filterSales');
    var filterHK    = document.getElementById('filterHK');
    var filterPola  = document.getElementById('filterPola');
    var filterGS    = document.getElementById('filterGS');
    var searchToko  = document.getElementById('searchToko');
    var themeBtn    = document.getElementById('themeBtn');

    if (selMonth)    selMonth.onchange    = function() { CURRENT_MONTH_GS = this.value; loadGSData(); };
    if (filterArea)  filterArea.onchange  = function() { renderGS(); };
    if (filterType)  filterType.onchange  = function() { renderGS(); };
    if (filterSales) filterSales.onchange = function() { renderGS(); };
    if (filterHK)    filterHK.onchange    = function() { renderGS(); };
    if (filterPola)  filterPola.onchange  = function() { renderGS(); };
    if (filterGS)    filterGS.onchange    = function() { renderGS(); };
    if (searchToko)  searchToko.oninput   = function() { renderGS(); };
    if (themeBtn)    themeBtn.onclick     = togTheme;

    loadGSData();
});

function setDefaultMonthGS() {
    var now = new Date();
    var m = now.getMonth() + 1;
    var key = 'M' + (m < 10 ? '0' + m : m);
    var sel = document.getElementById('selMonth');
    if (!sel) return;
    for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === key) {
            sel.value = key;
            CURRENT_MONTH_GS = key;
            break;
        }
    }
}

/* ===== LOAD DATA ===== */
function loadGSData() {
    var sb = document.getElementById('stBadge');
    var st = document.getElementById('stTxt');
    if (sb) sb.className = 'badge st-load';
    if (st) st.textContent = 'Loading...';

    var url = CONFIG.getURL('GS', CURRENT_MONTH_GS);

    fetch(url)
        .then(function(r) { if (r.ok) return r.text(); return ''; })
        .then(function(txt) {
            if (txt) {
                var parsed = parseGSData(txt);
                GS_DATA     = parsed.data;
                GS_PRODUCTS = parsed.products;

                if (sb) sb.className = 'badge st-conn';
                if (st) st.textContent = 'Live - ' + GS_DATA.length + ' Toko';

                populateFiltersGS();
                renderGS();
            } else {
                if (sb) sb.className = 'badge st-err';
                if (st) st.textContent = 'No Data';
            }
        })
        .catch(function() {
            if (sb) sb.className = 'badge st-err';
            if (st) st.textContent = 'Error';
        });
}

/* ===== PARSE GS CSV =====
   A = KODE SLS
   B = Nama SLS
   C = TYPE SLS
   D = AREA
   E = Store Code
   F = Store Name
   G = Hari
   H = Pola
   I = SKU Target
   J = ACT
   K+ = Produk SKU (1=ada, 0=tidak)
*/
function parseGSData(txt) {
    var NL = String.fromCharCode(10);
    var lines = txt.split(NL);
    var data = [];
    var products = [];

    if (lines.length < 2) return { data: [], products: [] };

    var headers = splitCSVLine(lines[0]);

    var COL_KODE_SLS   = 0;
    var COL_NAMA_SLS   = 1;
    var COL_TYPE_SLS   = 2;
    var COL_AREA       = 3;
    var COL_STORE_CODE = 4;
    var COL_STORE_NAME = 5;
    var COL_HARI       = 6;
    var COL_POLA       = 7;
    var COL_SKU_TGT    = 8;
    var COL_ACT        = 9;
    var COL_PROD_START = 10;

    for (var c = COL_PROD_START; c < headers.length; c++) {
        var pName = headers[c].trim().replace(/\"/g, '');
        if (pName) products.push(pName);
    }

    for (var r = 1; r < lines.length; r++) {
        var line = lines[r].trim();
        if (!line) continue;
        var cols = splitCSVLine(line);

        var storeName = (cols[COL_STORE_NAME] || '').trim().replace(/\"/g, '');
        if (!storeName) continue;

        var skuTgt = parseInt((cols[COL_SKU_TGT] || '0').replace(/\"/g, '')) || 0;
        var act    = parseInt((cols[COL_ACT]     || '0').replace(/\"/g, '')) || 0;
        var gap    = act - skuTgt;
        var gsFlag = (skuTgt > 0 && act >= skuTgt) ? 1 : 0;
        var status = skuTgt > 0 ? (act / skuTgt) : 0;

        var row = {
            kodeSls  : (cols[COL_KODE_SLS]   || '').trim().replace(/\"/g, ''),
            namaSls  : (cols[COL_NAMA_SLS]   || '').trim().replace(/\"/g, ''),
            typeSls  : (cols[COL_TYPE_SLS]   || '').trim().replace(/\"/g, ''),
            area     : (cols[COL_AREA]       || '').trim().replace(/\"/g, ''),
            storeCode: (cols[COL_STORE_CODE] || '').trim().replace(/\"/g, ''),
            storeName: storeName,
            hari     : (cols[COL_HARI]       || '').trim().replace(/\"/g, ''),
            pola     : (cols[COL_POLA]       || '').trim().replace(/\"/g, ''),
            skuTarget: skuTgt,
            act      : act,
            gap      : gap,
            status   : status,
            gsFlag   : gsFlag,
            skus     : {}
        };

        for (var p = 0; p < products.length; p++) {
            var val = parseInt((cols[COL_PROD_START + p] || '0').replace(/\"/g, '')) || 0;
            row.skus[products[p]] = val;
        }

        data.push(row);
    }

    return { data: data, products: products };
}

/* ===== POPULATE FILTERS ===== */
function populateFiltersGS() {
    var areaSet  = {};
    var typeSet  = {};
    var salesSet = {};
    var hkSet    = {};
    var polaSet  = {};

    for (var i = 0; i < GS_DATA.length; i++) {
        var d = GS_DATA[i];
        if (d.area)    areaSet[d.area]    = true;
        if (d.typeSls) typeSet[d.typeSls] = true;
        if (d.namaSls) salesSet[d.namaSls]= true;
        if (d.hari)    hkSet[d.hari]      = true;
        if (d.pola)    polaSet[d.pola]    = true;
    }

    var selArea = document.getElementById('filterArea');
    if (selArea) {
        selArea.innerHTML = '<option value="all">Semua Area</option>';
        Object.keys(areaSet).sort().forEach(function(a) {
            var o = document.createElement('option');
            o.value = a; o.textContent = a;
            selArea.appendChild(o);
        });
    }

    var selType = document.getElementById('filterType');
    if (selType) {
        selType.innerHTML = '<option value="all">Semua Type</option>';
        Object.keys(typeSet).sort().forEach(function(t) {
            var o = document.createElement('option');
            o.value = t; o.textContent = t;
            selType.appendChild(o);
        });
    }

    var selSales = document.getElementById('filterSales');
    if (selSales) {
        selSales.innerHTML = '<option value="all">Semua Salesman</option>';
        Object.keys(salesSet).sort().forEach(function(s) {
            var o = document.createElement('option');
            o.value = s; o.textContent = s;
            selSales.appendChild(o);
        });
    }

    var selHK = document.getElementById('filterHK');
    if (selHK) {
        selHK.innerHTML = '<option value="all">Semua Hari</option>';
        Object.keys(hkSet).sort().forEach(function(h) {
            var o = document.createElement('option');
            o.value = h; o.textContent = h;
            selHK.appendChild(o);
        });
    }

    var selPola = document.getElementById('filterPola');
    if (selPola) {
        selPola.innerHTML = '<option value="all">Semua Pola</option>';
        Object.keys(polaSet).sort().forEach(function(p) {
            var o = document.createElement('option');
            o.value = p; o.textContent = p;
            selPola.appendChild(o);
        });
    }
}

/* ===== GET FILTERED DATA ===== */
function getFilteredGS() {
    var vArea   = document.getElementById('filterArea')  ? document.getElementById('filterArea').value  : 'all';
    var vType   = document.getElementById('filterType')  ? document.getElementById('filterType').value  : 'all';
    var vSales  = document.getElementById('filterSales') ? document.getElementById('filterSales').value : 'all';
    var vHK     = document.getElementById('filterHK')    ? document.getElementById('filterHK').value    : 'all';
    var vPola   = document.getElementById('filterPola')  ? document.getElementById('filterPola').value  : 'all';
    var vGS     = document.getElementById('filterGS')    ? document.getElementById('filterGS').value    : 'all';
    var vSearch = document.getElementById('searchToko')  ? document.getElementById('searchToko').value.toLowerCase().trim() : '';

    var r = [];
    for (var i = 0; i < GS_DATA.length; i++) {
        var d = GS_DATA[i];
        if (vArea  !== 'all' && d.area    !== vArea)  continue;
        if (vType  !== 'all' && d.typeSls !== vType)  continue;
        if (vSales !== 'all' && d.namaSls !== vSales) continue;
        if (vHK    !== 'all' && d.hari    !== vHK)    continue;
        if (vPola  !== 'all' && d.pola    !== vPola)  continue;
        if (vGS    !== 'all' && String(d.gsFlag) !== vGS) continue;
        if (vSearch && d.storeName.toLowerCase().indexOf(vSearch) === -1) continue;
        r.push(d);
    }
    return r;
}

/* ===== RENDER ALL ===== */
function renderGS() {
    var fd = getFilteredGS();
    renderSummary(fd);
    renderSalesSummary(fd);

    var vSales  = document.getElementById('filterSales') ? document.getElementById('filterSales').value : 'all';
    var vSearch = document.getElementById('searchToko')  ? document.getElementById('searchToko').value.trim() : '';

    var el = document.getElementById('storeGrid');

    if (vSales !== 'all' || vSearch.length > 0) {
        renderStoreGrid(fd);
    } else {
        if (el) {
            el.innerHTML = '<div class="store-hint">' +
                '<span>👆</span>' +
                '<p>Pilih <strong>Salesman</strong> atau ketik <strong>Nama Toko</strong> untuk melihat detail per toko.</p>' +
                '</div>';
        }
    }

    var cnt = document.getElementById('tokoCount');
    if (cnt) cnt.textContent = fd.length + ' Toko';
}

/* ===== RENDER SUMMARY CARDS ===== */
function renderSummary(data) {
    var el = document.getElementById('sumCards');
    if (!el) return;

    var totalToko   = data.length;
    var gsYes       = 0;
    var totalSKUTgt = 0;
    var totalACT    = 0;

    for (var i = 0; i < data.length; i++) {
        if (data[i].gsFlag === 1) gsYes++;
        totalSKUTgt += data[i].skuTarget;
        totalACT    += data[i].act;
    }

    var gsP    = totalToko > 0   ? Math.round((gsYes / totalToko) * 100) : 0;
    var skuP   = totalSKUTgt > 0 ? Math.round((totalACT / totalSKUTgt) * 100) : 0;
    var avgSKU = totalToko > 0   ? (totalACT / totalToko).toFixed(1) : '0';
    var gapSKU = totalACT - totalSKUTgt;

    var h = '<div class="gs-sum-grid">';

    h += '<div class="gs-sum-card highlight">';
    h += '<div class="lbl">TOTAL TOKO</div>';
    h += '<div class="val">' + totalToko + '</div>';
    h += '</div>';

    h += '<div class="gs-sum-card">';
    h += '<div class="lbl">GS TERCAPAI</div>';
    h += '<div class="val">' + gsYes + '<small>/' + totalToko + '</small></div>';
    h += '<div class="sub"><span class="pb-b ' + (gsP >= 60 ? 'ph-h' : gsP >= 40 ? 'ph-m' : 'ph-l') + '">' + gsP + '%</span></div>';
    h += '</div>';

    h += '<div class="gs-sum-card">';
    h += '<div class="lbl">GS BELUM</div>';
    h += '<div class="val">' + (totalToko - gsYes) + '</div>';
    h += '<div class="sub"><span class="pb-b ph-l">' + (100 - gsP) + '%</span></div>';
    h += '</div>';

    h += '<div class="gs-sum-card">';
    h += '<div class="lbl">SKU ACT/TARGET</div>';
    h += '<div class="val">' + totalACT + '<small>/' + totalSKUTgt + '</small></div>';
    h += '<div class="sub"><span class="pb-b ' + (skuP >= 70 ? 'ph-h' : skuP >= 40 ? 'ph-m' : 'ph-l') + '">' + skuP + '%</span></div>';
    h += '</div>';

    h += '<div class="gs-sum-card">';
    h += '<div class="lbl">AVG SKU/TOKO</div>';
    h += '<div class="val">' + avgSKU + '</div>';
    h += '</div>';

    h += '<div class="gs-sum-card">';
    h += '<div class="lbl">TOTAL GAP SKU</div>';
    h += '<div class="val" style="color:' + (gapSKU >= 0 ? '#22c55e' : '#ef4444') + '">' + (gapSKU >= 0 ? '+' : '') + gapSKU + '</div>';
    h += '</div>';

    h += '</div>';
    el.innerHTML = h;
}

/* ===== RENDER SALESMAN SUMMARY ===== */
function renderSalesSummary(data) {
    var el = document.getElementById('salesSummary');
    if (!el) return;
    if (data.length === 0) {
        el.innerHTML = '<p style="color:var(--t2)">Tidak ada data</p>';
        return;
    }

    var salesGroup = {};
    for (var i = 0; i < data.length; i++) {
        var d   = data[i];
        var key = d.kodeSls || d.namaSls || 'Unknown';
        if (!salesGroup[key]) {
            salesGroup[key] = {
                kodeSls : d.kodeSls,
                namaSls : d.namaSls,
                typeSls : d.typeSls,
                area    : d.area,
                stores  : [],
                gsYes   : 0,
                totalAct: 0,
                totalTgt: 0
            };
        }
        salesGroup[key].stores.push(d);
        if (d.gsFlag === 1) salesGroup[key].gsYes++;
        salesGroup[key].totalAct += d.act;
        salesGroup[key].totalTgt += d.skuTarget;
    }

    var h = '<div class="sls-summary-grid">';
    var salesKeys = Object.keys(salesGroup).sort();

    for (var s = 0; s < salesKeys.length; s++) {
        var sKey        = salesKeys[s];
        var sg          = salesGroup[sKey];
        var totalStores = sg.stores.length;
        var gsP         = totalStores > 0 ? Math.round((sg.gsYes / totalStores) * 100) : 0;

        var typeLower = (sg.typeSls || '').toLowerCase();
        var tgtPct    = (typeLower === 'whs' || typeLower === 'so') ? 60 : 50;

        var tgtToko = Math.ceil(totalStores * tgtPct / 100);
        var gapToko = sg.gsYes - tgtToko;
        var gapCls  = gapToko >= 0 ? 'ph-h' : 'ph-l';
        var gapTxt  = (gapToko >= 0 ? '+' : '') + gapToko;

        var barCls = gsP >= tgtPct ? 'pg-green' : (gsP >= tgtPct * 0.7 ? 'pg-yellow' : 'pg-red');
        var pctCls = gsP >= tgtPct ? 'ph-h' : (gsP >= tgtPct * 0.7 ? 'ph-m' : 'ph-l');

        h += '<div class="sls-card">';

        h += '<div class="sls-card-head">';
        h += '<div>';
        h += '<div class="nm">' + sg.namaSls + '</div>';
        h += '<div class="sub">' + sg.kodeSls + ' | ' + sg.area + ' | ' + (sg.typeSls || '-') + ' | ' + totalStores + ' Toko</div>';
        h += '</div>';
        h += '<span class="pb-b ' + pctCls + '">' + gsP + '%</span>';
        h += '</div>';

        h += '<div class="sls-card-body">';
        h += '<div class="sls-stats">';

        h += '<div class="sls-stat">';
        h += '<div class="s-lbl">GS ✅</div>';
        h += '<div class="s-val">' + sg.gsYes + '/' + totalStores + '</div>';
        h += '</div>';

        h += '<div class="sls-stat">';
        h += '<div class="s-lbl">TARGET</div>';
        h += '<div class="s-val">' + tgtToko + ' <small>(' + tgtPct + '%)</small></div>';
        h += '</div>';

        h += '<div class="sls-stat">';
        h += '<div class="s-lbl">GAP</div>';
        h += '<div class="s-val"><span class="pb-b ' + gapCls + '">' + gapTxt + ' Toko</span></div>';
        h += '</div>';

        h += '<div class="sls-stat">';
        h += '<div class="s-lbl">GS %</div>';
        h += '<div class="s-val"><span class="pb-b ' + pctCls + '">' + gsP + '%</span></div>';
        h += '</div>';

        h += '</div>';

        h += '<div class="gs-progress-wrap">';
        h += '<div class="gs-progress">';
        h += '<div class="gs-progress-bar ' + barCls + '" style="width:' + Math.min(gsP, 100) + '%"></div>';
        h += '<div class="gs-target-line" style="left:' + tgtPct + '%"></div>';
        h += '</div>';
        h += '<div class="gs-progress-labels">';
        h += '<span>0%</span>';
        h += '<span class="gs-tgt-label" style="left:' + tgtPct + '%">▲' + tgtPct + '%</span>';
        h += '<span>100%</span>';
        h += '</div>';
        h += '</div>';

        h += '</div>';
        h += '</div>';
    }

    h += '</div>';
    el.innerHTML = h;
}

/* ===== RENDER STORE GRID =====
   SORT: Gap terbesar dulu (0, -5, -7)
   → descending: yang paling mendekati target di atas
*/
function renderStoreGrid(data) {
    var el = document.getElementById('storeGrid');
    if (!el) return;
    if (data.length === 0) {
        el.innerHTML = '<p style="color:var(--t2)">Tidak ada data ditemukan</p>';
        return;
    }

    // Sort dari gap terbesar ke terkecil (0 → -5 → -7)
    var sorted = data.slice().sort(function(a, b) {
        return b.gap - a.gap;
    });

    var h = '<div class="store-grid">';
    h += '<div class="store-sort-info">Urutan: Gap terbesar → terkecil ↓</div>';

    for (var i = 0; i < sorted.length; i++) {
        var d       = sorted[i];
        var statusP = d.skuTarget > 0 ? Math.round((d.act / d.skuTarget) * 100) : 0;
        var flagCls = d.gsFlag === 1 ? 'gs-flag-yes' : 'gs-flag-no';
        var flagTxt = d.gsFlag === 1 ? '✅ GS' : '❌ NO';
        var barCls  = statusP >= 100 ? 'pg-green' : (statusP >= 70 ? 'pg-yellow' : 'pg-red');
        var pctCls  = statusP >= 100 ? 'ph-h' : (statusP >= 70 ? 'ph-m' : 'ph-l');

        h += '<div class="store-card">';

        h += '<div class="store-head" onclick="toggleStore(this)">';
        h += '<div class="s-info">';
        h += '<span class="' + flagCls + '">' + flagTxt + '</span>';
        h += '<div>';
        h += '<div class="s-name">' + d.storeName + '</div>';
        h += '<div class="s-code">' + d.storeCode + ' | ' + d.area + ' | Hari:' + (d.hari || '-') + ' | Pola:' + (d.pola || '-') + '</div>';
        h += '<div class="s-code">' + d.namaSls + ' (' + (d.typeSls || '-') + ')</div>';
        h += '</div>';
        h += '</div>';
        h += '<div class="s-metrics">';
        h += '<span><strong>' + d.act + '</strong>/' + d.skuTarget + ' SKU</span>';
        h += '<span class="pb-b ' + pctCls + '">' + statusP + '%</span>';
        h += '<span style="font-size:0.7rem;color:' + (d.gap >= 0 ? '#22c55e' : '#ef4444') + ';font-weight:700">Gap ' + (d.gap >= 0 ? '+' : '') + d.gap + '</span>';
        h += '</div>';
        h += '</div>';

        h += '<div class="store-detail">';
        h += '<div class="sku-legend">';
        h += '<span>✅ = Toko sudah punya SKU</span>';
        h += '<span>❌ = Belum punya (peluang distribusi)</span>';
        h += '</div>';

        h += '<div class="sku-grid">';
        for (var p = 0; p < GS_PRODUCTS.length; p++) {
            var pName  = GS_PRODUCTS[p];
            var skuVal = d.skus[pName] || 0;
            var hasIt  = skuVal >= 1;
            var skuCls = hasIt ? 'sku-item sku-yes' : 'sku-item sku-no';
            var skuIcon= hasIt ? '✅' : '❌';

            h += '<div class="' + skuCls + '">';
            h += '<span class="sku-icon">' + skuIcon + '</span>';
            h += '<span>' + pName + '</span>';
            h += '</div>';
        }
        h += '</div>';

        h += '<div class="store-gap">';
        h += '<span>Gap: <strong style="color:' + (d.gap >= 0 ? '#22c55e' : '#ef4444') + '">' + (d.gap >= 0 ? '+' : '') + d.gap + '</strong></span>';
        h += '<span>Target: ' + d.skuTarget + '</span>';
        h += '<span>Actual: ' + d.act + '</span>';
        h += '</div>';

        h += '<div class="gs-progress" style="margin-top:8px"><div class="gs-progress-bar ' + barCls + '" style="width:' + Math.min(statusP, 100) + '%"></div></div>';
        h += '</div>';

        h += '</div>';
    }

    h += '</div>';
    el.innerHTML = h;
}

/* ===== TOGGLE STORE DETAIL (ACCORDION) ===== */
function toggleStore(el) {
    var detail = el.nextElementSibling;
    if (!detail) return;

    var isOpen = detail.classList.contains('open');

    var allOpen = document.querySelectorAll('.store-detail.open');
    for (var i = 0; i < allOpen.length; i++) {
        allOpen[i].classList.remove('open');
    }

    if (!isOpen) {
        detail.classList.add('open');
    }
}
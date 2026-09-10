
/* ===== GS TRACKING PAGE ===== */
var GS_DATA = [];
var GS_PRODUCTS = [];
var CURRENT_MONTH_GS = 'M07';

document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    setDefaultMonthGS();

    var selMonth    = document.getElementById('selMonth');
    var filterType  = document.getElementById('filterType');
    var filterSales = document.getElementById('filterSales');
    var filterHK    = document.getElementById('filterHK');
    var filterPola  = document.getElementById('filterPola');
    var filterGS    = document.getElementById('filterGS');
    var searchToko  = document.getElementById('searchToko');
    var themeBtn    = document.getElementById('themeBtn');

    if (selMonth)    selMonth.onchange    = function() { CURRENT_MONTH_GS = this.value; loadGSData(); };
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
   AUTO-DETECT header row → produk otomatis ikut Google Sheet tiap bulan.
   Struktur kolom (tanpa AREA):
   KODE SLS | Nama SLS | TYPE SLS | Store Code | Store Name | Hari | Pola | SKU Target | ACT | [produk1] | [produk2] | ...
*/
function parseGSData(txt) {
    var NL = String.fromCharCode(10);
    var lines = txt.split(NL);
    var data = [];
    var products = [];

    if (lines.length < 2) return { data: [], products: [] };

    /* --- Cari header row: baris yang ada "KODE SLS" atau "Store Code" --- */
    var headerIdx = -1;
    for (var i = 0; i < lines.length; i++) {
        var upper = lines[i].toUpperCase();
        if (upper.indexOf('KODE SLS') !== -1 && upper.indexOf('STORE') !== -1) {
            headerIdx = i;
            break;
        }
    }
    /* Fallback: cari baris dengan "SKU TARGET" */
    if (headerIdx === -1) {
        for (var i = 0; i < lines.length; i++) {
            var upper = lines[i].toUpperCase();
            if (upper.indexOf('SKU') !== -1 && upper.indexOf('TARGET') !== -1) {
                headerIdx = i;
                break;
            }
        }
    }
    /* Fallback terakhir: pakai lines[47] seperti sebelumnya */
    if (headerIdx === -1) {
        headerIdx = Math.min(47, lines.length - 1);
    }

    var headers = splitCSVLine(lines[headerIdx]);

    /* --- Cari kolom-kolom utama berdasarkan nama header --- */
    var COL_KODE_SLS   = -1;
    var COL_NAMA_SLS   = -1;
    var COL_TYPE_SLS   = -1;
    var COL_STORE_CODE = -1;
    var COL_STORE_NAME = -1;
    var COL_HARI       = -1;
    var COL_POLA       = -1;
    var COL_SKU_TGT    = -1;
    var COL_ACT        = -1;

    for (var c = 0; c < headers.length; c++) {
        var hu = headers[c].toUpperCase().trim();
        if (hu === 'KODE SLS' || hu === 'KODE_SLS')              COL_KODE_SLS = c;
        else if (hu === 'NAMA SLS' || hu === 'NAMA_SLS')         COL_NAMA_SLS = c;
        else if (hu === 'TYPE SLS' || hu === 'TYPE_SLS' || hu === 'TYPE' || hu === 'TIPE') COL_TYPE_SLS = c;
        else if (hu === 'STORE CODE' || hu === 'STORE_CODE' || hu === 'KODE TOKO') COL_STORE_CODE = c;
        else if (hu === 'STORE NAME' || hu === 'STORE_NAME' || hu === 'NAMA TOKO') COL_STORE_NAME = c;
        else if (hu === 'HARI' || hu === 'DAY')                  COL_HARI = c;
        else if (hu === 'POLA' || hu === 'PATTERN')              COL_POLA = c;
        else if (hu === 'SKU TARGET' || hu === 'SKU_TARGET' || hu === 'TARGET SKU') COL_SKU_TGT = c;
        else if (hu === 'ACT' || hu === 'ACTUAL')                COL_ACT = c;
    }

    /* Fallback: jika kolom tidak ditemukan, pakai posisi default */
    if (COL_KODE_SLS   === -1) COL_KODE_SLS   = 0;
    if (COL_NAMA_SLS   === -1) COL_NAMA_SLS   = 1;
    if (COL_TYPE_SLS   === -1) COL_TYPE_SLS   = 2;
    if (COL_STORE_CODE === -1) COL_STORE_CODE = 3;
    if (COL_STORE_NAME === -1) COL_STORE_NAME = 4;
    if (COL_HARI       === -1) COL_HARI       = 5;
    if (COL_POLA       === -1) COL_POLA       = 6;
    if (COL_SKU_TGT    === -1) COL_SKU_TGT    = 7;
    if (COL_ACT        === -1) COL_ACT        = 8;

    /* Produk = semua kolom setelah ACT */
    var COL_PROD_START = COL_ACT + 1;

    for (var c = COL_PROD_START; c < headers.length; c++) {
        var pName = headers[c].trim().replace(/\"/g, '');
        if (pName) products.push(pName);
    }

    /* --- Parse data: mulai dari baris SETELAH header --- */
    for (var r = headerIdx + 1; r < lines.length; r++) {
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
    var typeSet  = {};
    var salesSet = {};
    var hkSet    = {};
    var polaSet  = {};

    for (var i = 0; i < GS_DATA.length; i++) {
        var d = GS_DATA[i];
        if (d.typeSls) typeSet[d.typeSls] = true;
        if (d.namaSls) salesSet[d.namaSls]= true;
        if (d.hari)    hkSet[d.hari]      = true;
        if (d.pola)    polaSet[d.pola]    = true;
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
    var vType   = document.getElementById('filterType')  ? document.getElementById('filterType').value  : 'all';
    var vSales  = document.getElementById('filterSales') ? document.getElementById('filterSales').value : 'all';
    var vHK     = document.getElementById('filterHK')    ? document.getElementById('filterHK').value    : 'all';
    var vPola   = document.getElementById('filterPola')  ? document.getElementById('filterPola').value  : 'all';
    var vGS     = document.getElementById('filterGS')    ? document.getElementById('filterGS').value    : 'all';
    var vSearch = document.getElementById('searchToko')  ? document.getElementById('searchToko').value.toLowerCase().trim() : '';

    var r = [];
    for (var i = 0; i < GS_DATA.length; i++) {
        var d = GS_DATA[i];
        if (vType  !== 'all' && d.typeSls !== vType)  continue;
        if (vSales !== 'all' && d.namaSls !== vSales) continue;
        if (vHK    !== 'all' && d.hari    !== vHK)    continue;
        if (vPola  !== 'all' && d.pola    !== vPola)  continue;

        /* GS Flag filter: 1=tercapai, 0=belum, hampir=gap -5 s/d -1 */
        if (vGS !== 'all') {
            if (vGS === 'hampir') {
                if (d.gsFlag === 1 || d.gap < -5 || d.gap >= 0) continue;
            } else if (vGS === '1') {
                if (d.gsFlag !== 1) continue;
            } else if (vGS === '0') {
                if (d.gsFlag !== 0) continue;
            }
        }

        /* Search by Store Code OR Store Name */
        if (vSearch) {
            var matchName = d.storeName.toLowerCase().indexOf(vSearch) !== -1;
            var matchCode = d.storeCode.toLowerCase().indexOf(vSearch) !== -1;
            if (!matchName && !matchCode) continue;
        }

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
                '<p>Pilih <strong>Salesman</strong> atau ketik <strong>Kode / Nama Toko</strong> untuk melihat detail per toko.</p>' +
                '</div>';
        }
    }

    var cnt = document.getElementById('tokoCount');
    if (cnt) cnt.textContent = fd.length + ' Toko';
}

/* ===== RENDER SUMMARY CARDS =====
   4 Cards: Total Toko | Target GS (50%) | GS Tercapai | Gap GS ke Target
*/
function renderSummary(data) {
    var el = document.getElementById('sumCards');
    if (!el) return;

    var totalToko = data.length;
    var gsYes     = 0;

    for (var i = 0; i < data.length; i++) {
        if (data[i].gsFlag === 1) gsYes++;
    }

    var targetGS = Math.ceil(totalToko * 50 / 100);
    var gapGS    = gsYes - targetGS;
    var gsP      = totalToko > 0 ? Math.round((gsYes / totalToko) * 100) : 0;

    var h = '<div class="gs-sum-grid gs-sum-4">';

    h += '<div class="gs-sum-card highlight">';
    h += '<div class="lbl">TOTAL TOKO</div>';
    h += '<div class="val">' + totalToko + '</div>';
    h += '</div>';

    h += '<div class="gs-sum-card">';
    h += '<div class="lbl">TARGET GS (50%)</div>';
    h += '<div class="val">' + targetGS + ' <small>Toko</small></div>';
    h += '</div>';

    h += '<div class="gs-sum-card">';
    h += '<div class="lbl">GS TERCAPAI</div>';
    h += '<div class="val">' + gsYes + ' <small>Toko</small></div>';
    h += '<div class="sub"><span class="pb-b ' + (gsP >= 50 ? 'ph-h' : gsP >= 30 ? 'ph-m' : 'ph-l') + '">' + gsP + '%</span></div>';
    h += '</div>';

    h += '<div class="gs-sum-card">';
    h += '<div class="lbl">GAP GS KE TARGET</div>';
    h += '<div class="val" style="color:' + (gapGS >= 0 ? '#22c55e' : '#ef4444') + '">' + (gapGS >= 0 ? '+' : '') + gapGS + ' <small>Toko</small></div>';
    h += '<div class="sub">' + (gapGS >= 0 ? '<span class="pb-b ph-h">Target Tercapai</span>' : '<span class="pb-b ph-l">Kurang ' + Math.abs(gapGS) + ' Toko</span>') + '</div>';
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
        h += '<div class="sub">' + sg.kodeSls + ' | ' + (sg.typeSls || '-') + ' | ' + totalStores + ' Toko</div>';
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

/* ===== RENDER STORE GRID ===== */
function renderStoreGrid(data) {
    var el = document.getElementById('storeGrid');
    if (!el) return;
    if (data.length === 0) {
        el.innerHTML = '<p style="color:var(--t2)">Tidak ada data ditemukan</p>';
        return;
    }

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

        /* Hampir capai: badge kuning jika gap -1 s/d -5 */
        if (d.gsFlag === 0 && d.gap >= -5 && d.gap < 0) {
            flagCls = 'gs-flag-hampir';
            flagTxt = '🟡 -' + Math.abs(d.gap);
        }

        var barCls  = statusP >= 100 ? 'pg-green' : (statusP >= 70 ? 'pg-yellow' : 'pg-red');
        var pctCls  = statusP >= 100 ? 'ph-h' : (statusP >= 70 ? 'ph-m' : 'ph-l');

        h += '<div class="store-card">';

        h += '<div class="store-head" onclick="toggleStore(this)">';
        h += '<div class="s-info">';
        h += '<span class="' + flagCls + '">' + flagTxt + '</span>';
        h += '<div>';
        h += '<div class="s-name">' + d.storeName + '</div>';
        h += '<div class="s-code">' + d.storeCode + ' | Hari:' + (d.hari || '-') + ' | Pola:' + (d.pola || '-') + '</div>';
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
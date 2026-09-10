/* ===== KPI FUNDAMENTAL PAGE ===== */
var FUND_DATA = [];
var FUND_PRODUCTS = [];
var CURRENT_MONTH_FUND = 'M06';

document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    setDefaultMonthFund();

    var selMonth = document.getElementById('selMonth');
    var filterArea = document.getElementById('filterArea');
    var filterType = document.getElementById('filterType');
    var filterSales = document.getElementById('filterSales');
    var actHK = document.getElementById('actHK');
    var totHK = document.getElementById('totHK');

    if (selMonth) selMonth.onchange = function() { CURRENT_MONTH_FUND = this.value; loadFundamentalData(); };
    if (filterArea) filterArea.onchange = function() { renderFundamental(); };
    if (filterType) filterType.onchange = function() { renderFundamental(); };
    if (filterSales) filterSales.onchange = function() { renderFundamental(); };
    if (actHK) { actHK.oninput = function() { renderFundamental(); }; }
    if (totHK) { totHK.oninput = function() { renderFundamental(); }; }

    var themeBtn = document.getElementById('themeBtn');
    if (themeBtn) themeBtn.onclick = togTheme;

    loadFundamentalData();
});

function setDefaultMonthFund() {
    var now = new Date();
    var m = now.getMonth() + 1;
    var key = 'M' + (m < 10 ? '0' + m : m);
    var sel = document.getElementById('selMonth');
    if (!sel) return;
    for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === key) {
            sel.value = key;
            CURRENT_MONTH_FUND = key;
            break;
        }
    }
}

function loadFundamentalData() {
    var sb = document.getElementById('stBadge');
    var st = document.getElementById('stTxt');
    if (sb) sb.className = 'badge st-load';
    if (st) st.textContent = 'Loading...';

    CURRENT_MONTH_FUND = document.getElementById('selMonth') ? document.getElementById('selMonth').value : 'M06';
    var url = CONFIG.getURL('FUND', CURRENT_MONTH_FUND);

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200 && xhr.responseText) {
                var parsed = parseFundCSV(xhr.responseText);
                FUND_DATA = parsed.data;
                FUND_PRODUCTS = parsed.products;
                if (sb) sb.className = 'badge st-conn';
                if (st) st.textContent = 'Live - ' + FUND_DATA.length + ' SLS';
                populateAreaFilterFund();
                populateSalesFilterFund();
                renderFundamental();
            } else {
                if (sb) sb.className = 'badge st-err';
                if (st) st.textContent = 'Error';
            }
        }
    };
    xhr.open('GET', url, true);
    xhr.send();
}



function parseFundCSV(txt) {
    var NL = String.fromCharCode(10);
    var lines = txt.split(NL);
    var data = [];
    var products = [];

    // Find header row
    var headerIdx = -1;
    for (var i = 0; i < lines.length; i++) {
        if (lines[i].indexOf('KODE SLS') !== -1 || lines[i].indexOf('NAMA SLS') !== -1) {
            headerIdx = i;
            break;
        }
    }
    if (headerIdx === -1) return { data: [], products: [] };

    var headers = lines[headerIdx].split(',');

    // Find product columns (ACTUAL PF columns)
    var pfCols = []; // { idx, name, tgtIdx, multiplier }
    for (var c = 0; c < headers.length; c++) {
        var h = headers[c].trim().replace(/"/g, '');
        if (h.indexOf('ACTUAL') !== -1 && h.indexOf('PF') !== -1) {
            // Extract product name from header like "ACTUAL PF1 AO BISKUAT CORE"
            var pName = h.replace(/ACTUAL\s*PF\d+\s*/i, '').replace(/AO\s*/i, '').trim();
            if (!pName) pName = h;
            // Find corresponding TARGET column (should be c-1)
            var tgtIdx = c - 1;
            var tgtH = headers[tgtIdx] ? headers[tgtIdx].trim().replace(/"/g, '') : '';
            var mul = 35; // default
            // Try to read multiplier from target column header or we read from data
            pfCols.push({ idx: c, name: pName, tgtIdx: tgtIdx, tgtHeader: tgtH });
            products.push(pName);
        }
    }

    // Find key column indices
    var colKode = -1, colNama = -1, colArea = -1, colType = -1, colTgtCov = -1;
    for (var c = 0; c < headers.length; c++) {
        var hh = headers[c].trim().replace(/"/g, '').toUpperCase();
        if (hh.indexOf('KODE') !== -1) colKode = c;
        else if (hh.indexOf('NAMA') !== -1) colNama = c;
        else if (hh.indexOf('AREA') !== -1) colArea = c;
        else if (hh === 'TYPE' || hh === 'TIPE') colType = c;
        else if (hh.indexOf('TARGET COVEX') !== -1 || hh.indexOf('TARGET COV') !== -1) colTgtCov = c;
    }

    // Parse data rows
    for (var r = headerIdx + 1; r < lines.length; r++) {
        var line = lines[r].trim();
        if (!line) continue;
        var cols = line.split(',');
        var nama = cols[colNama] ? cols[colNama].trim().replace(/"/g, '') : '';
        if (!nama) continue;

        var row = {
            kode: cols[colKode] ? cols[colKode].trim().replace(/"/g, '') : '',
            nama: nama,
            area: cols[colArea] ? cols[colArea].trim().replace(/"/g, '') : '',
            type: cols[colType] ? cols[colType].trim().replace(/"/g, '') : '',
            tgtCov: parseFloat((cols[colTgtCov] || '0').replace(/"/g, '').replace(/\./g, '').replace(',', '.')) || 0,
            products: {},
            targets: {}
        };

        for (var p = 0; p < pfCols.length; p++) {
            var pf = pfCols[p];
            var actVal = parseFloat((cols[pf.idx] || '0').replace(/"/g, '').replace(/\./g, '').replace(',', '.')) || 0;
            row.products[pf.name] = actVal;

            // Read target % from the TARGET PFx% column
            var tgtPct = parseFloat((cols[pf.tgtIdx] || '0').replace(/"/g, '').replace(/\./g, '').replace(',', '.')) || 0;
            row.targets[pf.name] = tgtPct;
        }

        data.push(row);
    }

    return { data: data, products: products };
}

function populateAreaFilterFund() {
    var sel = document.getElementById('filterArea');
    if (!sel) return;
    var areas = [];
    for (var i = 0; i < FUND_DATA.length; i++) {
        var a = FUND_DATA[i].area;
        if (a && areas.indexOf(a) === -1) areas.push(a);
    }
    areas.sort();
    sel.innerHTML = '<option value="all">Semua Area</option>';
    for (var i = 0; i < areas.length; i++) {
        var o = document.createElement('option');
        o.value = areas[i];
        o.textContent = areas[i];
        sel.appendChild(o);
    }
}

function populateSalesFilterFund() {
    var sel = document.getElementById('filterSales');
    if (!sel) return;
    sel.innerHTML = '<option value="all">Semua Salesman</option>';
    for (var i = 0; i < FUND_DATA.length; i++) {
        var o = document.createElement('option');
        o.value = FUND_DATA[i].nama;
        o.textContent = FUND_DATA[i].nama;
        sel.appendChild(o);
    }
}

function getFilteredFund() {
    var elArea = document.getElementById('filterArea');
    var elType = document.getElementById('filterType');
    var elSales = document.getElementById('filterSales');
    var va = elArea ? elArea.value : 'all';
    var vt = elType ? elType.value : 'all';
    var vs = elSales ? elSales.value : 'all';
    var r = [];
    for (var i = 0; i < FUND_DATA.length; i++) {
        var d = FUND_DATA[i];
        if (va !== 'all' && d.area !== va) continue;
        if (vt !== 'all') {
            var t = d.type.toUpperCase().replace(/[\s\-]/g, '');
            var vtu = vt.toUpperCase().replace(/[\s\-]/g, '');
            if (t.indexOf(vtu) === -1 && vtu.indexOf(t) === -1) continue;
        }
        if (vs !== 'all' && d.nama !== vs) continue;
        r.push(d);
    }
    return r;
}

function getHKFund() {
    var a = parseInt(document.getElementById('actHK') ? document.getElementById('actHK').value : 0) || 0;
    var t = parseInt(document.getElementById('totHK') ? document.getElementById('totHK').value : 0) || 0;
    var sisa = t - a;
    if (sisa < 0) sisa = 0;
    return { actual: a, total: t, sisa: sisa };
}

function pctF(act, tgt) {
    if (!tgt || tgt === 0) return 0;
    return Math.round((act / tgt) * 100);
}


function pcCF(p) {
    if (p >= 100) return 'pct-green';
    if (p >= 80) return 'pct-yellow';
    return 'pct-red';
}

function getTypeBadgeFund(type) {
    var t = type.toUpperCase();
    if (t.indexOf('WHS') !== -1) return 'type-whs';
    if (t.indexOf('RETAIL') !== -1) return 'type-retail';
    if (t.indexOf('RIST') !== -1) return 'type-torist';
    return '';
}

function getTypeLabelFund(type) {
    var t = type.toUpperCase();
    if (t.indexOf('WHS') !== -1) return 'WHS';
    if (t.indexOf('RETAIL') !== -1) return 'Retail';
    if (t.indexOf('RIST') !== -1) return 'TO-RIST';
    return type;
}

function renderFundamental() {
    var fd = getFilteredFund();
    var hk = getHKFund();
    var hkPct = (hk.total > 0) ? Math.round((hk.actual / hk.total) * 100) : 0;

    var elSisa = document.getElementById('hkDisplay');
    var elPct = document.getElementById('hkPct');
    if (elSisa) elSisa.textContent = hk.sisa + ' hari';
    if (elPct) elPct.textContent = hkPct + '%';

    /* ===== SUMMARY CARDS ===== */
    var sumEl = document.getElementById('sumCards');
    if (sumEl) {
        var totTgtCov = 0;
        var prodTotals = {};
        for (var i = 0; i < fd.length; i++) {
            totTgtCov += fd[i].tgtCov;
            for (var p = 0; p < FUND_PRODUCTS.length; p++) {
                var pName = FUND_PRODUCTS[p];
                if (!prodTotals[pName]) prodTotals[pName] = 0;
                prodTotals[pName] += (fd[i].products[pName] || 0);
            }
        }

        var sumH = '';
        for (var p = 0; p < FUND_PRODUCTS.length; p++) {
            var pName = FUND_PRODUCTS[p];
            var totAct = prodTotals[pName] || 0;
            var pp = pctF(totAct, totTgtCov);
            sumH += '<div class="sum-card">';
            sumH += '<div class="lbl">' + pName + '</div>';
            sumH += '<div class="val">' + totAct + '/' + totTgtCov + '</div>';
            sumH += '<div class="pct"><span class="pb-b ' + pcCF(pp) + '">' + pp + '%</span></div>';
            sumH += '</div>';
        }
        sumEl.innerHTML = sumH;
    }

    /* ===== PER SALESMAN CARDS ===== */
    var gridEl = document.getElementById('gridCards');
    if (!gridEl) return;
    if (fd.length === 0) { gridEl.innerHTML = '<p style="color:var(--t2)">Tidak ada data</p>'; return; }

    var gridH = '';
    for (var i = 0; i < fd.length; i++) {
        var d = fd[i];
        var typeLbl = getTypeLabelFund(d.type);
        var typeCls = getTypeBadgeFund(d.type);

        gridH += '<div class="card">';

        /* CARD HEAD */
        gridH += '<div class="card-head">';
        gridH += '<div>';
        gridH += '<div class="nm">' + d.nama + ' <span class="type-badge ' + typeCls + '">' + typeLbl + '</span></div>';
        gridH += '<div class="sub">' + d.kode + ' | ' + d.area + '</div>';
        gridH += '</div>';
        gridH += '<div style="font-size:.7rem;font-weight:700;color:#fff;background:rgba(255,255,255,.18);padding:4px 10px;border-radius:6px">Covex: ' + d.tgtCov + '</div>';
        gridH += '</div>';

        /* CARD BODY */
        gridH += '<div class="card-body">';

        /* --- Target Coverage-Based (Table) --- */
        gridH += '<div class="card-section cov-section">';
        gridH += '<div class="sec-title">&#127919; Target Coverage-Based (Target Covex: ' + d.tgtCov + ')</div>';
        gridH += '<table class="tbl"><thead><tr>';
        gridH += '<th>PRODUK</th><th>PENGALI</th><th>TARGET</th><th>ACTUAL</th><th>%</th><th>GAP</th><th>KEJAR/HARI</th>';
        gridH += '</tr></thead><tbody>';

        for (var p = 0; p < FUND_PRODUCTS.length; p++) {
            var pName = FUND_PRODUCTS[p];
            var mul = d.targets[pName] || 35;
            var tgt = Math.round(d.tgtCov * (mul / 100));
            var act = d.products[pName] || 0;
            var pp = pctF(act, tgt);
            var gap = tgt - act;
            if (gap < 0) gap = 0;
            var kejar = (hk.sisa > 0 && gap > 0) ? Math.ceil(gap / hk.sisa) : 0;

            gridH += '<tr>';
            gridH += '<td>' + pName + '</td>';
            gridH += '<td>' + mul + '%</td>';
            gridH += '<td>' + tgt + '</td>';
            gridH += '<td>' + act + '</td>';
            gridH += '<td><span class="pb-b ' + pcCF(pp) + '">' + pp + '%</span></td>';
            gridH += '<td class="' + (gap > 0 ? 'gap-val' : '') + '">' + (gap > 0 ? gap : '&#10003;') + '</td>';
            gridH += '<td>' + (gap > 0 ? (kejar > 0 ? '<span class="kejar-badge kejar-num">' + kejar + '/hari</span>' : '-') : '<span class="kejar-badge kejar-ok">Tercapai</span>') + '</td>';
            gridH += '</tr>';
        }
        gridH += '</tbody></table>';
        gridH += '</div>';

        /* --- Distribution (Card Grid) --- */
        gridH += '<div class="card-section">';
        gridH += '<div class="sec-title">&#128230; Distribution (Actual / Target Covex)</div>';
        gridH += '<div class="dist-grid">';

        for (var p = 0; p < FUND_PRODUCTS.length; p++) {
            var pName = FUND_PRODUCTS[p];
            var act = d.products[pName] || 0;
            var dp = pctF(act, d.tgtCov);

            gridH += '<div class="dist-item">';
            gridH += '<div class="d-lbl">' + pName + '</div>';
            gridH += '<div class="d-val">' + act + '/' + d.tgtCov + '</div>';
            gridH += '<div class="d-pct"><span class="pb-b ' + pcCF(dp) + '">' + dp + '%</span></div>';
            gridH += '</div>';
        }
        gridH += '</div>';
        gridH += '</div>';

        gridH += '</div>'; /* end card-body */
        gridH += '</div>'; /* end card */
    }
    gridEl.innerHTML = gridH;
}
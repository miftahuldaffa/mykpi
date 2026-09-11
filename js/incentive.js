
/* ===== KPI INCENTIVE PAGE ===== */
var CURRENT_MONTH = 'M06';
var incentiveData = [];
var schemeData = [];
var gsDataForInc = [];   /* GS data for Greenstore summary */

document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    setDefaultMonth();

    var selMonth = document.getElementById('selMonth');
    var selType = document.getElementById('selType');
    var selSales = document.getElementById('selSalesman');
    var inpHK = document.getElementById('inpHK');
    var inpTotHK = document.getElementById('inpTotHK');

    if (selMonth) selMonth.onchange = function() { CURRENT_MONTH = this.value; loadIncentiveData(); };
    if (selType) selType.onchange = function() { renderIncentive(); };
    if (selSales) selSales.onchange = function() { renderIncentive(); };
    if (inpHK) inpHK.oninput = function() { renderIncentive(); };
    if (inpTotHK) inpTotHK.oninput = function() { renderIncentive(); };

    loadIncentiveData();
});

function setDefaultMonth() {
    var now = new Date();
    var m = now.getMonth() + 1;
    var key = 'M' + (m < 10 ? '0' + m : m);
    var sel = document.getElementById('selMonth');
    if (!sel) return;
    for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === key) {
            sel.value = key;
            CURRENT_MONTH = key;
            break;
        }
    }
}

function loadIncentiveData() {
    var btnLoad = document.getElementById('btnLoading');
    if (btnLoad) { btnLoad.className = 'badge st-load'; btnLoad.style.display = ''; }
    var url = CONFIG.getURL('INC', CURRENT_MONTH);
    var schUrl = CONFIG.getURL('SCH', CURRENT_MONTH);
    var gsUrl = CONFIG.getURL('GS', CURRENT_MONTH);
    var done = 0;
    var total = 3;

    function checkRender() {
        done++;
        if (done >= total) {
            if (btnLoad) {
                btnLoad.className = 'badge st-conn';
                btnLoad.textContent = '';
                var dot = document.createElement('span');
                dot.className = 'dot';
                btnLoad.appendChild(dot);
                var txt = document.createElement('span');
                txt.textContent = 'Live - ' + incentiveData.length + ' SLS';
                btnLoad.appendChild(txt);
            }
            populateSalesFilter();
            renderIncentive();
        }
    }

    /* Load Scheme */
    var x1 = new XMLHttpRequest();
    x1.onreadystatechange = function() {
        if (x1.readyState === 4) {
            if (x1.status === 200) schemeData = parseScheme(x1.responseText);
            checkRender();
        }
    };
    x1.open('GET', schUrl, true);
    x1.send();

    /* Load Incentive data */
    var x2 = new XMLHttpRequest();
    x2.onreadystatechange = function() {
        if (x2.readyState === 4) {
            if (x2.status === 200) {
                incentiveData = parseData(x2.responseText);

                /* Baca Last Update dari kolom Y (index 24) */
                var lines = x2.responseText.split(String.fromCharCode(10));
                var lastUpdate = '';
                var COL_LAST_UPDATE = 24;
                for (var i = 0; i < lines.length && i < 5; i++) {
                    var row = lines[i].split(',');
                    if (row.length <= COL_LAST_UPDATE) continue;
                    var cell = row[COL_LAST_UPDATE];
                    cell = cell.replace(/"/g, '').trim();
                    if (cell && cell.toUpperCase().indexOf('LAST UPDATE') === -1 && cell.length > 3) {
                        lastUpdate = cell;
                        break;
                    }
                }
                var elUpdate = document.getElementById('lastUpdate');
                if (elUpdate && lastUpdate) elUpdate.textContent = 'Last Update: ' + lastUpdate;
            }
            checkRender();
        }
    };
    x2.open('GET', url, true);
    x2.send();

    /* Load GS data for Greenstore summary */
    var x3 = new XMLHttpRequest();
    x3.onreadystatechange = function() {
        if (x3.readyState === 4) {
            if (x3.status === 200) {
                gsDataForInc = parseGSForIncentive(x3.responseText);
            }
            checkRender();
        }
    };
    x3.open('GET', gsUrl, true);
    x3.send();
}

/* ===== PARSE GS DATA (LIGHTWEIGHT) for Greenstore summary ===== */
function parseGSForIncentive(txt) {
    var NL = String.fromCharCode(10);
    var lines = txt.split(NL);
    var data = [];

    if (lines.length < 2) return data;

    /* Auto-detect header */
    var headerIdx = -1;
    for (var i = 0; i < lines.length; i++) {
        var upper = lines[i].toUpperCase();
        if (upper.indexOf('KODE SLS') !== -1 && upper.indexOf('STORE') !== -1) {
            headerIdx = i;
            break;
        }
    }
    if (headerIdx === -1) {
        for (var i = 0; i < lines.length; i++) {
            if (lines[i].toUpperCase().indexOf('SKU') !== -1 && lines[i].toUpperCase().indexOf('TARGET') !== -1) {
                headerIdx = i;
                break;
            }
        }
    }
    if (headerIdx === -1) return data;

    var headers = splitCSVLine(lines[headerIdx]);

    var COL_KODE = -1, COL_NAMA = -1, COL_TYPE = -1, COL_STORE = -1, COL_TGT = -1, COL_ACT = -1;
    for (var c = 0; c < headers.length; c++) {
        var hu = headers[c].toUpperCase().trim();
        if (hu === 'KODE SLS' || hu === 'KODE_SLS')              COL_KODE = c;
        else if (hu === 'NAMA SLS' || hu === 'NAMA_SLS')         COL_NAMA = c;
        else if (hu === 'TYPE SLS' || hu === 'TYPE_SLS' || hu === 'TYPE') COL_TYPE = c;
        else if (hu === 'STORE NAME' || hu === 'STORE_NAME' || hu === 'NAMA TOKO') COL_STORE = c;
        else if (hu === 'SKU TARGET' || hu === 'SKU_TARGET')     COL_TGT = c;
        else if (hu === 'ACT' || hu === 'ACTUAL')                COL_ACT = c;
    }

    if (COL_KODE === -1) COL_KODE = 0;
    if (COL_NAMA === -1) COL_NAMA = 1;
    if (COL_TYPE === -1) COL_TYPE = 2;
    if (COL_STORE === -1) COL_STORE = 4;
    if (COL_TGT === -1) COL_TGT = 7;
    if (COL_ACT === -1) COL_ACT = 8;

    for (var r = headerIdx + 1; r < lines.length; r++) {
        var line = lines[r].trim();
        if (!line) continue;
        var cols = splitCSVLine(line);
        var storeName = (cols[COL_STORE] || '').trim().replace(/"/g, '');
        if (!storeName) continue;

        var skuTgt = parseInt((cols[COL_TGT] || '0').replace(/"/g, '')) || 0;
        var act = parseInt((cols[COL_ACT] || '0').replace(/"/g, '')) || 0;

        data.push({
            kodeSls: (cols[COL_KODE] || '').trim().replace(/"/g, ''),
            namaSls: (cols[COL_NAMA] || '').trim().replace(/"/g, ''),
            typeSls: (cols[COL_TYPE] || '').trim().replace(/"/g, ''),
            gsFlag: (skuTgt > 0 && act >= skuTgt) ? 1 : 0
        });
    }
    return data;
}

/* ===== GET GREENSTORE TOTALS (filtered by selected salesman/type) ===== */
function getGSSummary(filtered) {
    var gsMap = {};
    for (var i = 0; i < gsDataForInc.length; i++) {
        var g = gsDataForInc[i];
        var key = g.namaSls;
        if (!gsMap[key]) gsMap[key] = { total: 0, gs: 0 };
        gsMap[key].total++;
        if (g.gsFlag === 1) gsMap[key].gs++;
    }

    var totalToko = 0;
    var totalGS = 0;
    for (var i = 0; i < filtered.length; i++) {
        var nama = filtered[i].nama;
        if (gsMap[nama]) {
            totalToko += gsMap[nama].total;
            totalGS += gsMap[nama].gs;
        }
    }
    return { total: totalToko, gs: totalGS };
}

function populateSalesFilter() {
    var sel = document.getElementById('selSalesman');
    if (!sel) return;
    sel.innerHTML = '<option value="all">Semua Salesman</option>';
    for (var i = 0; i < incentiveData.length; i++) {
        var o = document.createElement('option');
        o.value = incentiveData[i].nama;
        o.textContent = incentiveData[i].nama;
        sel.appendChild(o);
    }
}

function getFilteredIncentive() {
    var elType = document.getElementById('selType');
    var elSales = document.getElementById('selSalesman');
    var vt = elType ? elType.value : 'all';
    var vs = elSales ? elSales.value : 'all';
    var r = [];
    for (var i = 0; i < incentiveData.length; i++) {
        var d = incentiveData[i];
        if (vt !== 'all' && getType(d) !== vt) continue;
        if (vs !== 'all' && d.nama !== vs) continue;
        r.push(d);
    }
    return r;
}

function updateHKDisplay() {
    var elHK = document.getElementById('inpHK');
    var elTotHK = document.getElementById('inpTotHK');
    var actHK = elHK ? (parseInt(elHK.value) || 0) : 0;
    var totHK = elTotHK ? (parseInt(elTotHK.value) || 0) : 0;
    var sisaHK = totHK - actHK;
    if (sisaHK < 0) sisaHK = 0;
    var hkP = totHK > 0 ? Math.round((actHK / totHK) * 100) : 0;
    var elSisa = document.getElementById('sisaHK');
    var elPct = document.getElementById('hkPct');
    if (elSisa) elSisa.textContent = sisaHK + ' hari';
    if (elPct) elPct.textContent = hkP + '%';
}

function renderIncentive() {
    var filtered = getFilteredIncentive();
    updateHKDisplay();
    renderSummaryCards(filtered);
    renderSalesCards(filtered);
}

/* ===== SUMMARY CARDS =====
   Coverage | AO INC | PF1 | PF2 | PF3 | Greenstore
*/
function renderSummaryCards(data) {
    var el = document.getElementById('summaryCards');
    if (!el) return;
    if (data.length === 0) { el.innerHTML = '<p style="color:var(--t2);font-size:.72rem">Tidak ada data</p>'; return; }

    var totActCov = 0, totTgtCov = 0;
    var totAo = 0, totPf1 = 0, totPf2 = 0, totPf3 = 0;
    for (var i = 0; i < data.length; i++) {
        var d = data[i];
        totActCov += d.actCov;
        totTgtCov += d.tgtCov;
        totAo += d.ao;
        totPf1 += d.pf1;
        totPf2 += d.pf2;
        totPf3 += d.pf3;
    }

    /* Greenstore from GS data */
    var gsSummary = getGSSummary(data);
    var gsP = gsSummary.total > 0 ? Math.round((gsSummary.gs / gsSummary.total) * 100) : 0;

    var cards = [
        { lbl: 'COVERAGE',    val: totActCov + '/' + totTgtCov,           p: pct(totActCov, totTgtCov) },
        { lbl: 'AO INC',      val: totAo + '/' + totTgtCov,              p: pct(totAo, totTgtCov) },
        { lbl: PF_NAMES.pf1,  val: totPf1 + '/' + totTgtCov,             p: pct(totPf1, totTgtCov) },
        { lbl: PF_NAMES.pf2,  val: totPf2 + '/' + totTgtCov,             p: pct(totPf2, totTgtCov) },
        { lbl: PF_NAMES.pf3,  val: totPf3 + '/' + totTgtCov,             p: pct(totPf3, totTgtCov) },
        { lbl: 'GREENSTORE',  val: gsSummary.gs + '/' + gsSummary.total,  p: gsP }
    ];

    var h = '';
    for (var c = 0; c < cards.length; c++) {
        var cd = cards[c];
        h += '<div class="sum-card">';
        h += '<div class="lbl">' + cd.lbl + '</div>';
        h += '<div class="val">' + cd.val + '</div>';
        h += '<div class="pct"><span class="pb-b ' + pcC(cd.p) + '">' + cd.p + '%</span></div>';
        h += '</div>';
    }
    el.innerHTML = h;
}

function kejarBadge(sisaHK, gap) {
    if (gap <= 0) return '<span class="kejar-badge kejar-ok">Tercapai</span>';
    if (sisaHK <= 0) return '<span class="kejar-badge kejar-no">-</span>';
    var k = Math.ceil(gap / sisaHK);
    return '<span class="kejar-badge kejar-num">' + k + '</span>';
}

/* ===== SALES CARDS (tanpa Greenstore section) ===== */
function renderSalesCards(data) {
    var el = document.getElementById('salesCards');
    if (!el) return;
    if (data.length === 0) { el.innerHTML = '<p style="color:var(--t2);font-size:.72rem">Tidak ada data</p>'; return; }

    var elHK = document.getElementById('inpHK');
    var elTotHK = document.getElementById('inpTotHK');
    var actHK = elHK ? (parseInt(elHK.value) || 0) : 0;
    var totHK = elTotHK ? (parseInt(elTotHK.value) || 0) : 0;
    var sisaHK = totHK - actHK;
    if (sisaHK < 0) sisaHK = 0;

    var h = '';
    for (var i = 0; i < data.length; i++) {
        var d = data[i];
        var type = getType(d);
        var typeLbl = getTypeLabel(type);
        var typeCls = getTypeBadgeClass(type);
        var inc = calcIncentive(d, schemeData);

        h += '<div class="card">';

        /* ===== CARD HEAD ===== */
        h += '<div class="card-head">';
        h += '<div>';
        h += '<div class="nm">' + d.nama + ' <span class="type-badge ' + typeCls + '">' + typeLbl + '</span></div>';
        h += '<div class="sub">' + d.kode + '</div>';
        h += '</div>';
        h += '<div style="font-size:.78rem;font-weight:800;color:#fff;background:rgba(255,255,255,.18);padding:6px 14px;border-radius:8px;letter-spacing:.3px">' + fmtRp(inc.hangus ? 0 : inc.totalRaw) + '</div>';
        h += '</div>';

        /* ===== CARD BODY ===== */
        h += '<div class="card-body">';

        /* --- ACTIVITY --- */
        h += '<div class="card-section">';
        h += '<div class="sec-title">&#128222; Activity</div>';
        h += '<table class="tbl"><thead><tr>';
        h += '<th>KPI</th><th>TARGET</th><th>ACTUAL</th><th>%</th><th>GAP</th><th>KEJAR/HARI</th>';
        h += '</tr></thead><tbody>';
        var actItems = [
            { lbl: 'Call', tgt: d.tgtCall, act: d.actCall },
            { lbl: 'EC', tgt: d.tgtEC, act: d.actEC },
            { lbl: 'Coverage', tgt: d.tgtCov, act: d.actCov },
            { lbl: 'AO Total', tgt: d.tgtCov, act: d.aoTotal }
        ];
        for (var a = 0; a < actItems.length; a++) {
            var ai = actItems[a];
            var ap = pct(ai.act, ai.tgt);
            var ag = ai.tgt - ai.act;
            if (ag < 0) ag = 0;
            h += '<tr>';
            h += '<td>' + ai.lbl + '</td>';
            h += '<td>' + ai.tgt + '</td>';
            h += '<td>' + ai.act + '</td>';
            h += '<td><span class="pb-b ' + pcC(ap) + '">' + ap + '%</span></td>';
            h += '<td class="' + (ag > 0 ? 'gap-val' : '') + '">' + (ag > 0 ? ag : '&#10003;') + '</td>';
            h += '<td>' + kejarBadge(sisaHK, ag) + '</td>';
            h += '</tr>';
        }
        h += '</tbody></table>';
        h += '</div>';

        /* --- REVENUE (IMS) --- */
        h += '<div class="card-section rev-section">';
        h += '<div class="sec-title">&#128293; Revenue (IMS)</div>';
        h += '<table class="tbl"><thead><tr>';
        h += '<th>KPI</th><th>TARGET</th><th>ACTUAL</th><th>%</th><th>GAP</th><th>KEJAR/HARI</th>';
        h += '</tr></thead><tbody>';
        var imsGap = d.tgtIMS - d.actIMS;
        if (imsGap < 0) imsGap = 0;
        var imsKejar = imsGap > 0 && sisaHK > 0 ? '<span class="kejar-badge kejar-num">' + fmtRp(Math.ceil(imsGap / sisaHK)) + '</span>' : kejarBadge(sisaHK, imsGap);
        h += '<tr>';
        h += '<td>IMS</td>';
        h += '<td>' + fmtRp(d.tgtIMS) + '</td>';
        h += '<td>' + fmtRp(d.actIMS) + '</td>';
        h += '<td><span class="pb-b ' + pcC(inc.imsP) + '">' + inc.imsP + '%</span></td>';
        h += '<td class="' + (imsGap > 0 ? 'gap-val' : '') + '">' + (imsGap > 0 ? fmtRp(imsGap) : '&#10003;') + '</td>';
        h += '<td>' + imsKejar + '</td>';
        h += '</tr>';
        h += '</tbody></table>';
        h += '</div>';

        /* --- TARGET COVERAGE-BASED --- */
        h += '<div class="card-section cov-section">';
        h += '<div class="sec-title">&#127919; Target Coverage-Based (Target Covex: ' + d.tgtCov + ')</div>';
        h += '<table class="tbl"><thead><tr>';
        h += '<th>KPI</th><th>TARGET COV</th><th>ACTUAL</th><th>%</th><th>GAP</th><th>KEJAR/HARI</th>';
        h += '</tr></thead><tbody>';
        var covItems = [
            { lbl: 'AO Inc (Cov x ' + inc.aoMul + '%)', tgt: inc.tgtAoDisp, act: d.ao, p: inc.aoCovP },
            { lbl: PF_NAMES.pf1 + ' (Cov x ' + inc.pf1Mul + '%)', tgt: inc.tgtPf1Disp, act: d.pf1, p: inc.pf1CovP },
            { lbl: PF_NAMES.pf2 + ' (Cov x ' + inc.pf2Mul + '%)', tgt: inc.tgtPf2Disp, act: d.pf2, p: inc.pf2CovP },
            { lbl: PF_NAMES.pf3 + ' (Cov x ' + inc.pf3Mul + '%)', tgt: inc.tgtPf3Disp, act: d.pf3, p: inc.pf3CovP },
            { lbl: 'GC (TGT GC x ' + inc.gcMul + '%)', tgt: inc.tgtGCcov, act: d.actGC, p: inc.gcCovP }
        ];
        for (var ci = 0; ci < covItems.length; ci++) {
            var item = covItems[ci];
            var cg = item.tgt - item.act;
            if (cg < 0) cg = 0;
            h += '<tr>';
            h += '<td>' + item.lbl + '</td>';
            h += '<td>' + item.tgt + '</td>';
            h += '<td>' + item.act + '</td>';
            h += '<td><span class="pb-b ' + pcC(item.p) + '">' + item.p + '%</span></td>';
            h += '<td class="' + (cg > 0 ? 'gap-val' : '') + '">' + (cg > 0 ? cg : '&#10003;') + '</td>';
            h += '<td>' + kejarBadge(sisaHK, cg) + '</td>';
            h += '</tr>';
        }
        h += '</tbody></table>';
        h += '</div>';

        /* --- DISTRIBUTION --- */
        h += '<div class="card-section">';
        h += '<div class="sec-title">&#128230; Distribution</div>';
        h += '<div class="dist-grid">';
        var distItems = [
            { lbl: 'AO Inc', act: d.ao, tgt: d.tgtCov },
            { lbl: PF_NAMES.pf1, act: d.pf1, tgt: d.tgtCov },
            { lbl: PF_NAMES.pf2, act: d.pf2, tgt: d.tgtCov },
            { lbl: PF_NAMES.pf3, act: d.pf3, tgt: d.tgtCov },
            { lbl: 'GC', act: d.actGC, tgt: d.tgtGC }
        ];
        for (var di = 0; di < distItems.length; di++) {
            var dt = distItems[di];
            var dp = pct(dt.act, dt.tgt);
            h += '<div class="dist-item">';
            h += '<div class="d-lbl">' + dt.lbl + '</div>';
            h += '<div class="d-val">' + dt.act + '/' + dt.tgt + '</div>';
            h += '<div class="d-pct"><span class="pb-b ' + pcC(dp) + '">' + dp + '%</span></div>';
            h += '</div>';
        }
        h += '</div>';
        h += '</div>';

        /* --- ESTIMASI INCENTIVE --- */
        var hangusClass = inc.hangus ? ' hangus' : '';
        var sectionClass = inc.hangus ? 'inc-section hangus-section' : 'inc-section';
        h += '<div class="' + sectionClass + '">';
        h += '<div class="sec-title">&#127873; Estimasi Incentive (' + typeLbl + ')';
        if (inc.hangus) {
            h += ' <span style="background:#fbbf24;color:#78350f;padding:2px 8px;border-radius:6px;font-size:.55rem;font-weight:700">HANGUS - Coverage ' + inc.covP + '% &lt; 100%</span>';
        }
        h += '</div>';
        h += '<div class="inc-grid">';
        var incItems = [
            { lbl: 'IMS', pct2: inc.imsP, val: inc.incIMS },
            { lbl: 'AO Inc', pct2: inc.aoP, val: inc.incAO },
            { lbl: PF_NAMES.pf1, pct2: inc.pf1P, val: inc.incPF1 },
            { lbl: PF_NAMES.pf2, pct2: inc.pf2P, val: inc.incPF2 },
            { lbl: 'GC', pct2: inc.gcIncP, val: inc.incGC }
        ];
        for (var ii = 0; ii < incItems.length; ii++) {
            var it = incItems[ii];
            h += '<div class="inc-item' + hangusClass + '">';
            h += '<div class="i-lbl">' + it.lbl + '</div>';
            h += '<div class="i-pct"><span class="pb-b ' + pcC(it.pct2) + '">' + it.pct2 + '%</span></div>';
            h += '<div class="i-val">' + fmtRp(it.val) + '</div>';
            h += '</div>';
        }
        h += '</div>';

        /* TOTAL BAR */
        var totalClass = inc.hangus ? 'inc-total hangus' : 'inc-total';
        h += '<div class="' + totalClass + '">';
        if (inc.hangus) {
            h += '<div class="i-lbl">HANGUS (Coverage ' + inc.covP + '% &lt; 100%)<small>Incentive tidak dihitung</small></div>';
        } else {
            h += '<div class="i-lbl">TOTAL INCENTIVE</div>';
        }
        h += '<div class="i-val">' + fmtRp(inc.hangus ? 0 : inc.totalRaw) + '</div>';
        h += '</div>';

        h += '</div>'; /* end inc-section */
        h += '</div>'; /* end card-body */
        h += '</div>'; /* end card */
    }
    el.innerHTML = h;
}
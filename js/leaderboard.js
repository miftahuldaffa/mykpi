
/* ===== LEADERBOARD - MAIN LOGIC ===== */
var ALL_DATA = {};
var SLABS_ALL = {};

/* ===== LOAD ALL MONTHS ===== */
function loadAllMonths() {
    var sb = document.getElementById('stBadge');
    var st = document.getElementById('stTxt');
    if (sb) sb.className = 'badge st-load';
    if (st) st.textContent = 'Loading all months...';

    var promises = [];

    for (var m = 0; m < MONTHS.length; m++) {
        (function(month) {
            var urlInc = CONFIG.getURL('INC', month);
            var urlSch = CONFIG.getURL('SCH', month);

            promises.push(
                Promise.all([
                    fetch(urlInc).then(function(r) { if (r.ok) return r.text(); return ''; }).catch(function() { return ''; }),
                    fetch(urlSch).then(function(r) { if (r.ok) return r.text(); return ''; }).catch(function() { return ''; })
                ]).then(function(res) {
                    if (res[0] && res[1]) {
                        SLABS_ALL[month] = parseScheme(res[1]);
                        ALL_DATA[month] = parseData(res[0]);
                    }
                })
            );
        })(MONTHS[m]);
    }

    Promise.all(promises).then(function() {
        var loaded = 0;
        for (var k in ALL_DATA) { if (ALL_DATA[k]) loaded++; }
        if (sb) sb.className = 'badge st-conn';
        if (st) st.textContent = 'Live - ' + loaded + ' bulan';
        populateAreaFilterLB();
        setDefaultZeroMonth();
        renderAll();
        renderZeroIncentive();
    }).catch(function(e) {
        if (sb) sb.className = 'badge st-err';
        if (st) st.textContent = 'Error: ' + (e.message || e);
    });
}

/* ===== SET DEFAULT ZERO MONTH ===== */
function setDefaultZeroMonth() {
    var now = new Date();
    var m = now.getMonth() + 1;
    var key = 'M' + (m < 10 ? '0' + m : m);
    var sel = document.getElementById('zeroMonth');
    if (!sel) return;
    for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === key) {
            sel.value = key;
            break;
        }
    }
}

/* ===== POPULATE AREA FILTER ===== */
function populateAreaFilterLB() {
    var areas = {};
    for (var m in ALL_DATA) {
        var data = ALL_DATA[m];
        if (!data) continue;
        for (var i = 0; i < data.length; i++) {
            if (data[i].area) areas[data[i].area] = true;
        }
    }
    var sel = document.getElementById('filterArea');
    if (!sel) return;
    sel.innerHTML = '<option value="all">Semua Area</option>';
    var al = Object.keys(areas).sort();
    for (var a = 0; a < al.length; a++) {
        var o = document.createElement('option');
        o.value = al[a];
        o.textContent = al[a];
        sel.appendChild(o);
    }
}

/* ===== GET FILTERED (for leaderboard) ===== */
function getFilteredLB(data) {
    var elArea = document.getElementById('filterArea');
    var elType = document.getElementById('filterType');
    var va = elArea ? elArea.value : 'all';
    var vt = elType ? elType.value : 'all';
    var r = [];
    for (var i = 0; i < data.length; i++) {
        var d = data[i];
        if (va !== 'all' && d.area !== va) continue;
        if (vt !== 'all' && getType(d) !== vt) continue;
        r.push(d);
    }
    return r;
}

/* ===== GET SORT BY ===== */
function getSortBy() {
    var el = document.getElementById('selSort');
    return el ? el.value : 'ims';
}

/* ===== RENDER ALL ===== */
function renderAll() {
    renderAllRank();
    renderTrendChart();
}

/* ===== RENDER RANKING TABLE ===== */
function renderAllRank() {
    var SORT_BY = getSortBy();
    var elFrom = document.getElementById('fromMonth');
    var elTo = document.getElementById('toMonth');
    var fromM = elFrom ? elFrom.value : 'M01';
    var toM = elTo ? elTo.value : 'M12';
    var fromIdx = MONTHS.indexOf(fromM);
    var toIdx = MONTHS.indexOf(toM);

    if (fromIdx > toIdx) { var tmp = fromIdx; fromIdx = toIdx; toIdx = tmp; }

    var elLabel = document.getElementById('allLabel');
    if (elLabel) elLabel.textContent = MONTH_NAMES[fromIdx] + ' - ' + MONTH_NAMES[toIdx] + ' 2026';

    var sortLabels = {
        ims: 'IMS Revenue',
        incentive: 'Incentive (Total)',
        coverage: 'Coverage %',
        gc: 'GC %',
        pf: 'Product Focus (Avg)'
    };
    var elChart = document.getElementById('chartLabel');
    if (elChart) elChart.textContent = sortLabels[SORT_BY] || 'IMS Revenue';

    /* --- Accumulate data across months --- */
    var accum = {};

    for (var m = fromIdx; m <= toIdx; m++) {
        var data = ALL_DATA[MONTHS[m]];
        var slabs = SLABS_ALL[MONTHS[m]];

        if (data && slabs) {
            var fd = getFilteredLB(data);
            for (var i = 0; i < fd.length; i++) {
                var d = fd[i];
                var inc = calcIncentive(d, slabs);

                var key = d.kode || d.nama;

                if (!accum[key]) {
                    accum[key] = {
                        kode: d.kode || '',
                        nama: d.nama,
                        type: getType(d),
                        imsSum: 0,
                        covSum: 0,
                        gcSum: 0,
                        pfSum: 0,
                        incSum: 0,
                        count: 0,
                        lastMonth: m
                    };
                }

                accum[key].nama = d.nama;
                accum[key].type = getType(d);
                accum[key].lastMonth = m;

                accum[key].imsSum += (d.actIMS || 0);
                accum[key].covSum += (inc.covP || 0);
                accum[key].gcSum += (inc.gcIncP || 0);
                accum[key].incSum += (inc.totalRaw || 0);
                var pfAvg = Math.round(((inc.aoP || 0) + (inc.pf1P || 0) + (inc.pf2P || 0)) / 3);
                accum[key].pfSum += pfAvg;
                accum[key].count++;
            }
        }
    }

    /* --- Convert to array and sort --- */
    var arr = [];
    for (var k in accum) {
        var a = accum[k];
        a.avgIms = a.imsSum;
        a.avgInc = a.incSum;
        a.avgCov = (a.count > 0) ? Math.round(a.covSum / a.count) : 0;
        a.avgGc = (a.count > 0) ? Math.round(a.gcSum / a.count) : 0;
        a.avgPf = (a.count > 0) ? Math.round(a.pfSum / a.count) : 0;
        arr.push(a);
    }

    arr.sort(function(a, b) {
        if (SORT_BY === 'ims') return b.avgIms - a.avgIms;
        if (SORT_BY === 'incentive') return b.avgInc - a.avgInc;
        if (SORT_BY === 'coverage') return b.avgCov - a.avgCov;
        if (SORT_BY === 'gc') return b.avgGc - a.avgGc;
        if (SORT_BY === 'pf') return b.avgPf - a.avgPf;
        return b.avgIms - a.avgIms;
    });

    /* --- Build table --- */
    var colIdx = { ims: 3, incentive: 4, coverage: 5, gc: 6, pf: 7 };
    var activeC = colIdx[SORT_BY] || 3;

    var h = '<table class="lb-table"><thead><tr>';
    h += '<th>#</th><th>SALESMAN</th><th>TIPE</th>';
    h += '<th' + (activeC === 3 ? ' class="active-col"' : '') + '>&#128293; IMS</th>';
    h += '<th' + (activeC === 4 ? ' class="active-col"' : '') + '>&#128176; INC</th>';
    h += '<th' + (activeC === 5 ? ' class="active-col"' : '') + '>&#128200; COV</th>';
    h += '<th' + (activeC === 6 ? ' class="active-col"' : '') + '>&#127811; GC</th>';
    h += '<th' + (activeC === 7 ? ' class="active-col"' : '') + '>&#127919; PF</th>';
    h += '</tr></thead><tbody>';

    for (var i = 0; i < arr.length; i++) {
        var r = arr[i];
        var rc = (i < 3) ? 'top' + (i + 1) : '';
        var rb = (i === 0) ? 'rank-1' : (i === 1) ? 'rank-2' : (i === 2) ? 'rank-3' : 'rank-n';
        var typeStr = r.type || '';
        var typeLbl = typeStr;
        var typeCls = '';
        var tu = String(typeStr).toUpperCase();
        if (tu.indexOf('WHS') !== -1) { typeLbl = 'WHS'; typeCls = 'type-whs'; }
        else if (tu === 'MT' || tu.indexOf('MT') !== -1) { typeLbl = 'MT'; typeCls = 'type-mt'; }
        else if (tu.indexOf('RETAIL') !== -1) { typeLbl = 'Retail'; typeCls = 'type-retail'; }
        else if (tu.indexOf('RIST') !== -1) { typeLbl = 'TO-RIST'; typeCls = 'type-torist'; }

        h += '<tr class="' + rc + '">';
        h += '<td><span class="rank-badge ' + rb + '">' + (i + 1) + '</span></td>';
        h += '<td><span class="sls-kode">' + r.kode + '</span> <strong>' + r.nama + '</strong></td>';
        h += '<td><span class="type-badge ' + typeCls + '">' + typeLbl + '</span></td>';
        h += '<td' + (activeC === 3 ? ' class="active-col"' : '') + '>' + fmtRp(r.avgIms) + '</td>';
        h += '<td' + (activeC === 4 ? ' class="active-col"' : '') + '>' + fmtRp(r.avgInc) + '</td>';
        h += '<td' + (activeC === 5 ? ' class="active-col"' : '') + '><span class="pb-b ' + pcC(r.avgCov) + '">' + r.avgCov + '%</span></td>';
        h += '<td' + (activeC === 6 ? ' class="active-col"' : '') + '><span class="pb-b ' + pcC(r.avgGc) + '">' + r.avgGc + '%</span></td>';
        h += '<td' + (activeC === 7 ? ' class="active-col"' : '') + '><span class="pb-b ' + pcC(r.avgPf) + '">' + r.avgPf + '%</span></td>';
        h += '</tr>';
    }
    h += '</tbody></table>';

    if (arr.length === 0) {
        h = '<p style="color:var(--t2);font-size:.72rem;text-align:center;padding:20px">Tidak ada data untuk periode ini</p>';
    }

    var elRank = document.getElementById('allRank');
    if (elRank) elRank.innerHTML = h;
}

/* ===== RENDER ZERO INCENTIVE SECTION ===== */
function renderZeroIncentive() {
    var selMonth = document.getElementById('zeroMonth');
    var selFilter = document.getElementById('zeroFilter');
    var month = selMonth ? selMonth.value : 'M09';
    var filter = selFilter ? selFilter.value : 'all';

    var data = ALL_DATA[month];
    var slabs = SLABS_ALL[month];

    var elSummary = document.getElementById('zeroSummary');
    var elTable = document.getElementById('zeroTable');

    if (!data || !slabs) {
        if (elSummary) elSummary.innerHTML = '';
        if (elTable) elTable.innerHTML = '<p style="color:var(--t2);font-size:.72rem;text-align:center;padding:20px">Tidak ada data untuk bulan ini</p>';
        return;
    }

    var elLabel = document.getElementById('zeroLabel');
    var mIdx = MONTHS.indexOf(month);
    if (elLabel) elLabel.textContent = MONTH_NAMES[mIdx] + ' 2026';

    var fd = getFilteredLB(data);
    var rows = [];
    var totalGot = 0;
    var totalZero = 0;
    var totalHangus = 0;

    for (var i = 0; i < fd.length; i++) {
        var d = fd[i];
        var inc = calcIncentive(d, slabs);
        var finalInc = inc.hangus ? 0 : inc.totalRaw;
        var isZero = (finalInc === 0);

        /* Determine reason for zero */
        var reason = '';
        if (inc.hangus) {
            reason = 'Coverage ' + inc.covP + '% < 100% (HANGUS)';
            totalHangus++;
        } else if (inc.totalRaw === 0) {
            reason = 'Semua KPI dibawah minimum slab';
        }

        if (isZero) totalZero++;
        else totalGot++;

        /* Apply filter */
        if (filter === 'zero' && !isZero) continue;
        if (filter === 'got' && isZero) continue;

        rows.push({
            kode: d.kode || '',
            nama: d.nama,
            type: getType(d),
            covP: inc.covP,
            imsP: inc.imsP,
            aqPct: inc.aqPct,
            aqMul: inc.aqMul,
            incIMS: inc.incIMS,
            incAO: inc.incAO,
            incPF1: inc.incPF1,
            incPF2: inc.incPF2,
            incGC: inc.incGC,
            totalRaw: inc.totalRaw,
            finalInc: finalInc,
            hangus: inc.hangus,
            reason: reason,
            isZero: isZero
        });
    }

    /* --- Summary badges --- */
    var totalAll = totalGot + totalZero;
    var sumH = '<div class="sum-grid" style="margin-bottom:14px">';
    sumH += '<div class="sum-card"><div class="lbl">TOTAL SALESMAN</div><div class="val" style="font-size:1.3rem;font-weight:700">' + totalAll + '</div></div>';
    sumH += '<div class="sum-card" style="border-left:3px solid var(--hi-c)"><div class="lbl">&#128994; DAPAT INCENTIVE</div><div class="val" style="font-size:1.3rem;font-weight:700;color:var(--hi-c)">' + totalGot + '</div></div>';
    sumH += '<div class="sum-card" style="border-left:3px solid var(--lo-c)"><div class="lbl">&#128308; ZERO INCENTIVE</div><div class="val" style="font-size:1.3rem;font-weight:700;color:var(--lo-c)">' + totalZero + '</div></div>';
    sumH += '<div class="sum-card" style="border-left:3px solid var(--mid-c)"><div class="lbl">&#128683; HANGUS (Cov &lt;100%)</div><div class="val" style="font-size:1.3rem;font-weight:700;color:var(--mid-c)">' + totalHangus + '</div></div>';
    sumH += '</div>';
    if (elSummary) elSummary.innerHTML = sumH;

    /* --- Table --- */
    var h = '<table class="lb-table"><thead><tr>';
    h += '<th>#</th><th>SALESMAN</th><th>TIPE</th>';
    h += '<th>COV %</th><th>IMS %</th><th>AQ</th>';
    h += '<th>IMS</th><th>AO</th><th>' + PF_NAMES.pf1 + '</th><th>' + PF_NAMES.pf2 + '</th><th>GC</th>';
    h += '<th>TOTAL</th><th>STATUS</th>';
    h += '</tr></thead><tbody>';

    /* Sort: zero first, then by totalRaw desc */
    rows.sort(function(a, b) {
        if (a.isZero !== b.isZero) return a.isZero ? -1 : 1;
        return b.finalInc - a.finalInc;
    });

    for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var typeStr = r.type || '';
        var typeLbl = typeStr;
        var typeCls = '';
        var tu = String(typeStr).toUpperCase();
        if (tu.indexOf('WHS') !== -1) { typeLbl = 'WHS'; typeCls = 'type-whs'; }
        else if (tu.indexOf('RETAIL') !== -1) { typeLbl = 'Retail'; typeCls = 'type-retail'; }
        else if (tu.indexOf('RIST') !== -1) { typeLbl = 'TO-RIST'; typeCls = 'type-torist'; }

        var rowCls = r.isZero ? ' style="opacity:.85"' : '';

        h += '<tr' + rowCls + '>';
        h += '<td>' + (i + 1) + '</td>';
        h += '<td><span class="sls-kode">' + r.kode + '</span> <strong>' + r.nama + '</strong></td>';
        h += '<td><span class="type-badge ' + typeCls + '">' + typeLbl + '</span></td>';
        h += '<td><span class="pb-b ' + pcC(r.covP) + '">' + r.covP + '%</span></td>';
        h += '<td><span class="pb-b ' + pcC(r.imsP) + '">' + r.imsP + '%</span></td>';

        /* AQ badge */
        var aqCls = r.aqMul >= 100 ? 'ph-h' : (r.aqMul >= 80 ? 'ph-m' : 'ph-l');
        h += '<td><span class="pb-b ' + aqCls + '">' + r.aqPct + '%</span></td>';

        h += '<td>' + fmtRp(r.incIMS) + '</td>';
        h += '<td>' + fmtRp(r.incAO) + '</td>';
        h += '<td>' + fmtRp(r.incPF1) + '</td>';
        h += '<td>' + fmtRp(r.incPF2) + '</td>';
        h += '<td>' + fmtRp(r.incGC) + '</td>';

        /* Total with hangus styling */
        if (r.hangus) {
            h += '<td style="text-decoration:line-through;color:var(--lo-c)">' + fmtRp(r.totalRaw) + '</td>';
        } else {
            h += '<td style="font-weight:700">' + fmtRp(r.finalInc) + '</td>';
        }

        /* Status badge */
        if (r.hangus) {
            h += '<td><span class="kejar-badge kejar-no" style="font-size:.55rem" title="' + r.reason + '">&#128683; HANGUS</span></td>';
        } else if (r.isZero) {
            h += '<td><span class="kejar-badge kejar-no" style="font-size:.55rem">&#128308; Rp 0</span></td>';
        } else {
            h += '<td><span class="kejar-badge kejar-ok" style="font-size:.55rem">&#128994; ' + fmtRp(r.finalInc) + '</span></td>';
        }

        h += '</tr>';
    }
    h += '</tbody></table>';

    if (rows.length === 0) {
        h = '<p style="color:var(--t2);font-size:.72rem;text-align:center;padding:20px">Tidak ada data sesuai filter</p>';
    }

    if (elTable) elTable.innerHTML = h;
}

/* ===== RENDER TREND CHART (SVG) ===== */
function renderTrendChart() {
    var SORT_BY = getSortBy();
    var salesmen = {};

    for (var m = 0; m < MONTHS.length; m++) {
        var data = ALL_DATA[MONTHS[m]];
        var slabs = SLABS_ALL[MONTHS[m]];
        if (!data || !slabs) continue;
        var fd = getFilteredLB(data);

        for (var i = 0; i < fd.length; i++) {
            var d = fd[i];
            var inc = calcIncentive(d, slabs);

            var key = d.kode || d.nama;

            if (!salesmen[key]) {
                salesmen[key] = { nama: d.nama, data: new Array(12) };
                for (var x = 0; x < 12; x++) salesmen[key].data[x] = null;
            }

            salesmen[key].nama = d.nama;

            var val = 0;
            if (SORT_BY === 'ims') val = (inc.imsP || 0);
            else if (SORT_BY === 'incentive') val = (inc.totalRaw || 0);
            else if (SORT_BY === 'coverage') val = (inc.covP || 0);
            else if (SORT_BY === 'gc') val = (inc.gcIncP || 0);
            else if (SORT_BY === 'pf') val = Math.round(((inc.aoP || 0) + (inc.pf1P || 0) + (inc.pf2P || 0)) / 3);
            else val = (inc.imsP || 0);

            salesmen[key].data[m] = val;
        }
    }

    /* --- Calculate max value for Y axis --- */
    var keys = Object.keys(salesmen);
    var maxVal = 0;
    for (var n = 0; n < keys.length; n++) {
        var dd = salesmen[keys[n]].data;
        for (var v = 0; v < 12; v++) {
            if (dd[v] !== null && dd[v] > maxVal) maxVal = dd[v];
        }
    }
    if (maxVal === 0) maxVal = 100;

    var isRupiah = (SORT_BY === 'incentive');

    /* --- SVG Chart --- */
    var W = 900;
    var H = 300;
    var padL = 70;
    var padR = 20;
    var padT = 20;
    var padB = 35;
    var chartW = W - padL - padR;
    var chartH = H - padT - padB;

    var svgH = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:300px;min-width:600px">';

    /* Grid lines */
    for (var g = 0; g <= 5; g++) {
        var y = padT + (chartH / 5) * g;
        var lbl = maxVal - ((maxVal / 5) * g);
        svgH += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="rgba(128,128,128,.12)" stroke-width="1"/>';
        var lblTxt = isRupiah ? fmtRp(Math.round(lbl)) : Math.round(lbl) + '%';
        svgH += '<text x="' + (padL - 5) + '" y="' + (y + 3) + '" text-anchor="end" font-size="8" fill="currentColor" opacity=".5">' + lblTxt + '</text>';
    }

    /* Month labels */
    for (var m = 0; m < 12; m++) {
        var x = padL + (chartW / 11) * m;
        svgH += '<line x1="' + x + '" y1="' + padT + '" x2="' + x + '" y2="' + (H - padB) + '" stroke="rgba(128,128,128,.06)" stroke-width="1"/>';
        svgH += '<text x="' + x + '" y="' + (H - 10) + '" text-anchor="middle" font-size="9" fill="currentColor" opacity=".5">' + MONTH_NAMES[m] + '</text>';
    }

    /* Lines per salesman */
    for (var n = 0; n < keys.length; n++) {
        var sm = salesmen[keys[n]];
        var dd = sm.data;
        var color = COLORS[n % COLORS.length];
        var points = [];

        for (var m = 0; m < 12; m++) {
            if (dd[m] === null) continue;
            var x = padL + (chartW / 11) * m;
            var y = padT + chartH - (dd[m] / maxVal) * chartH;
            points.push({ x: x, y: y });
        }

        if (points.length > 1) {
            var pathD = 'M' + points[0].x + ',' + points[0].y;
            for (var p = 1; p < points.length; p++) {
                pathD += ' L' + points[p].x + ',' + points[p].y;
            }
            svgH += '<path d="' + pathD + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>';
        }

        for (var p = 0; p < points.length; p++) {
            svgH += '<circle cx="' + points[p].x + '" cy="' + points[p].y + '" r="4" fill="' + color + '" stroke="#fff" stroke-width="1.5"/>';
        }
    }

    svgH += '</svg>';
    var elChartWrap = document.getElementById('chartWrap');
    if (elChartWrap) elChartWrap.innerHTML = svgH;

    /* --- Legend --- */
    var legH = '';
    for (var n = 0; n < keys.length; n++) {
        var displayName = salesmen[keys[n]].nama;
        legH += '<div class="legend-item"><div class="legend-dot" style="background:' + COLORS[n % COLORS.length] + '"></div>' + displayName + '</div>';
    }
    var elLegend = document.getElementById('chartLegend');
    if (elLegend) elLegend.innerHTML = legH;
}

/* ===== EVENT LISTENERS ===== */
document.addEventListener('DOMContentLoaded', function() {
    initTheme();

    var selSort = document.getElementById('selSort');
    var filterArea = document.getElementById('filterArea');
    var filterType = document.getElementById('filterType');
    var fromMonth = document.getElementById('fromMonth');
    var toMonth = document.getElementById('toMonth');
    var zeroMonth = document.getElementById('zeroMonth');
    var zeroFilter = document.getElementById('zeroFilter');

    if (selSort) selSort.onchange = renderAll;
    if (filterArea) filterArea.onchange = function() { renderAll(); renderZeroIncentive(); };
    if (filterType) filterType.onchange = function() { renderAll(); renderZeroIncentive(); };
    if (fromMonth) fromMonth.onchange = renderAll;
    if (toMonth) toMonth.onchange = renderAll;
    if (zeroMonth) zeroMonth.onchange = renderZeroIncentive;
    if (zeroFilter) zeroFilter.onchange = renderZeroIncentive;

    loadAllMonths();
});


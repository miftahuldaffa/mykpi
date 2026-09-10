/* ===== LEADERBOARD - MAIN LOGIC ===== */
var ALL_DATA = {};
var SLABS_ALL = {};
var FUND_DATA_LB = {};
var FUND_PRODUCTS = [];

/* ===== PARSE FUNDAMENTAL CSV FOR LEADERBOARD ===== */
function parseFundCSVForLB(txt) {
    var NL = String.fromCharCode(10);
    var lines = txt.split(NL);
    var data = [];
    var products = [];
    var headerIdx = -1;
    for (var i = 0; i < lines.length; i++) {
        if (lines[i].indexOf('KODE SLS') !== -1 || lines[i].indexOf('NAMA SLS') !== -1) { headerIdx = i; break; }
    }
    if (headerIdx === -1) return { data: [], products: [] };
    var headers = lines[headerIdx].split(',');
    var pfCols = [];
    for (var c = 0; c < headers.length; c++) {
        var h = headers[c].trim().replace(/"/g, '');
        if (h.indexOf('ACTUAL') !== -1 && h.indexOf('PF') !== -1) {
            var pName = h.replace(/ACTUAL\s*PF\d+\s*/i, '').replace(/AO\s*/i, '').trim();
            if (!pName) pName = h;
            pfCols.push({ idx: c, name: pName });
            if (products.indexOf(pName) === -1) products.push(pName);
        }
    }
    var colKode = -1, colNama = -1, colArea = -1, colType = -1, colTgtCov = -1;
    for (var c = 0; c < headers.length; c++) {
        var hh = headers[c].trim().replace(/"/g, '').toUpperCase();
        if (hh.indexOf('KODE') !== -1) colKode = c;
        else if (hh.indexOf('NAMA') !== -1) colNama = c;
        else if (hh.indexOf('AREA') !== -1) colArea = c;
        else if (hh === 'TYPE' || hh === 'TIPE') colType = c;
        else if (hh.indexOf('TARGET COVEX') !== -1 || hh.indexOf('TARGET COV') !== -1) colTgtCov = c;
    }
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
            products: {}
        };
        for (var p = 0; p < pfCols.length; p++) {
            var pf = pfCols[p];
            row.products[pf.name] = parseFloat((cols[pf.idx] || '0').replace(/"/g, '').replace(/\./g, '').replace(',', '.')) || 0;
        }
        data.push(row);
    }
    return { data: data, products: products };
}

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
            var urlFund = CONFIG.getURL('FUND', month);

            promises.push(
                Promise.all([
                    fetch(urlInc).then(function(r) { if (r.ok) return r.text(); return ''; }).catch(function() { return ''; }),
                    fetch(urlSch).then(function(r) { if (r.ok) return r.text(); return ''; }).catch(function() { return ''; }),
                    fetch(urlFund).then(function(r) { if (r.ok) return r.text(); return ''; }).catch(function() { return ''; })
                ]).then(function(res) {
                    if (res[0] && res[1]) {
                        SLABS_ALL[month] = parseScheme(res[1]);
                        ALL_DATA[month] = parseData(res[0]);
                    }
                    if (res[2]) {
                        var parsed = parseFundCSVForLB(res[2]);
                        FUND_DATA_LB[month] = parsed.data;
                        if (parsed.products.length > 0) FUND_PRODUCTS = parsed.products;
                    }
                })
            );
        })(MONTHS[m]);
    }

    Promise.all(promises).then(function() {
        var loaded = 0;
        for (var k in ALL_DATA) { if (ALL_DATA[k]) loaded++; }
        var fundLoaded = 0;
        for (var k in FUND_DATA_LB) { if (FUND_DATA_LB[k]) fundLoaded++; }
        if (sb) sb.className = 'badge st-conn';
        if (st) st.textContent = 'Live - ' + loaded + ' INC + ' + fundLoaded + ' FUND';
        populateAreaFilterLB();
        renderAll();
    }).catch(function(e) {
        if (sb) sb.className = 'badge st-err';
        if (st) st.textContent = 'Error: ' + (e.message || e);
    });
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
    for (var m in FUND_DATA_LB) {
        var data = FUND_DATA_LB[m];
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
        pf: 'Product Focus (Avg)',
        fund: 'Fundamental (Avg)'
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

                /* KEY: Selalu gunakan kode sebagai primary key */
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
                        fundSum: 0,
                        incSum: 0,
                        count: 0,
                        fundCount: 0,
                        lastMonth: m
                    };
                }

                /* Selalu update nama & type ke bulan terbaru */
                accum[key].nama = d.nama;
                accum[key].type = getType(d);
                accum[key].lastMonth = m;

                accum[key].imsSum += (d.actIMS || 0);
                accum[key].covSum += (inc.covP || 0);
                accum[key].gcSum += (inc.gcIncP || 0);
                /* Incentive tanpa cek hangus di leaderboard */
                accum[key].incSum += (inc.totalRaw || 0);
                var pfAvg = Math.round(((inc.aoP || 0) + (inc.pf1P || 0) + (inc.pf2P || 0)) / 3);
                accum[key].pfSum += pfAvg;
                accum[key].count++;
            }
        }

        /* --- Fundamental data --- */
        var fundData = FUND_DATA_LB[MONTHS[m]];
        if (fundData) {
            var elArea = document.getElementById('filterArea');
            var elType = document.getElementById('filterType');
            var va = elArea ? elArea.value : 'all';
            var vt = elType ? elType.value : 'all';

            for (var i = 0; i < fundData.length; i++) {
                var fd2 = fundData[i];
                if (va !== 'all' && fd2.area !== va) continue;
                if (vt !== 'all') {
                    var ft = fd2.type ? fd2.type.toUpperCase() : '';
                    if (vt === 'WHS' && ft.indexOf('WHS') === -1) continue;
                    if (vt === 'Retail' && ft.indexOf('RETAIL') === -1) continue;
                    if (vt === 'TO-RIST' && ft.indexOf('RIST') === -1) continue;
                }

                /* KEY: Gunakan kode sebagai primary key untuk fundamental juga */
                var key2 = fd2.kode || fd2.nama;

                if (!accum[key2]) {
                    accum[key2] = {
                        kode: fd2.kode || '',
                        nama: fd2.nama,
                        type: fd2.type || '',
                        imsSum: 0,
                        covSum: 0,
                        gcSum: 0,
                        pfSum: 0,
                        fundSum: 0,
                        incSum: 0,
                        count: 0,
                        fundCount: 0,
                        lastMonth: m
                    };
                }

                /* Update nama ke bulan terbaru */
                accum[key2].nama = fd2.nama;
                accum[key2].lastMonth = m;

                var prodCount = 0;
                var prodTotal = 0;
                for (var p = 0; p < FUND_PRODUCTS.length; p++) {
                    var act = fd2.products[FUND_PRODUCTS[p]] || 0;
                    var pp = (fd2.tgtCov > 0) ? Math.round((act / fd2.tgtCov) * 100) : 0;
                    prodTotal += pp;
                    prodCount++;
                }
                var fundAvg = (prodCount > 0) ? Math.round(prodTotal / prodCount) : 0;
                accum[key2].fundSum += fundAvg;
                accum[key2].fundCount++;
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
        a.avgFund = (a.fundCount > 0) ? Math.round(a.fundSum / a.fundCount) : 0;
        arr.push(a);
    }

    arr.sort(function(a, b) {
        if (SORT_BY === 'ims') return b.avgIms - a.avgIms;
        if (SORT_BY === 'incentive') return b.avgInc - a.avgInc;
        if (SORT_BY === 'coverage') return b.avgCov - a.avgCov;
        if (SORT_BY === 'gc') return b.avgGc - a.avgGc;
        if (SORT_BY === 'pf') return b.avgPf - a.avgPf;
        if (SORT_BY === 'fund') return b.avgFund - a.avgFund;
        return b.avgIms - a.avgIms;
    });

    /* --- Build table --- */
    var colIdx = { ims: 3, incentive: 4, coverage: 5, gc: 6, pf: 7, fund: 8 };
    var activeC = colIdx[SORT_BY] || 3;

    var h = '<table class="lb-table"><thead><tr>';
    h += '<th>#</th><th>SALESMAN</th><th>TIPE</th>';
    h += '<th' + (activeC === 3 ? ' class="active-col"' : '') + '>&#128293; IMS</th>';
    h += '<th' + (activeC === 4 ? ' class="active-col"' : '') + '>&#128176; INC</th>';
    h += '<th' + (activeC === 5 ? ' class="active-col"' : '') + '>&#128200; COV</th>';
    h += '<th' + (activeC === 6 ? ' class="active-col"' : '') + '>&#127811; GC</th>';
    h += '<th' + (activeC === 7 ? ' class="active-col"' : '') + '>&#127919; PF</th>';
    h += '<th' + (activeC === 8 ? ' class="active-col"' : '') + '>&#128202; FUND</th>';
    h += '</tr></thead><tbody>';

    for (var i = 0; i < arr.length; i++) {
        var r = arr[i];
        var rc = (i < 3) ? 'top' + (i + 1) : '';
        var rb = (i === 0) ? 'rank-1' : (i === 1) ? 'rank-2' : (i === 2) ? 'rank-3' : 'rank-n';
        var typeStr = r.type || '';
        var typeLbl = typeStr;
        var typeCls = '';
        var tu = typeStr.toUpperCase();
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
        h += '<td' + (activeC === 8 ? ' class="active-col"' : '') + '><span class="pb-b ' + pcC(r.avgFund) + '">' + r.avgFund + '%</span></td>';
        h += '</tr>';
    }
    h += '</tbody></table>';

    var elRank = document.getElementById('allRank');
    if (elRank) elRank.innerHTML = h;
}

/* ===== RENDER TREND CHART (SVG) ===== */
function renderTrendChart() {
    var SORT_BY = getSortBy();
    var salesmen = {};

    for (var m = 0; m < MONTHS.length; m++) {
        if (SORT_BY === 'fund') {
            var fundData = FUND_DATA_LB[MONTHS[m]];
            if (!fundData) continue;
            var elArea = document.getElementById('filterArea');
            var elType = document.getElementById('filterType');
            var va = elArea ? elArea.value : 'all';
            var vt = elType ? elType.value : 'all';

            for (var i = 0; i < fundData.length; i++) {
                var fd2 = fundData[i];
                if (va !== 'all' && fd2.area !== va) continue;
                if (vt !== 'all') {
                    var ft = fd2.type ? fd2.type.toUpperCase() : '';
                    if (vt === 'WHS' && ft.indexOf('WHS') === -1) continue;
                    if (vt === 'Retail' && ft.indexOf('RETAIL') === -1) continue;
                    if (vt === 'TO-RIST' && ft.indexOf('RIST') === -1) continue;
                }

                /* KEY: Gunakan kode untuk trend chart fundamental */
                var key = fd2.kode || fd2.nama;

                if (!salesmen[key]) {
                    salesmen[key] = { nama: fd2.nama, data: new Array(12) };
                    for (var x = 0; x < 12; x++) salesmen[key].data[x] = null;
                }

                /* Update nama ke bulan terbaru */
                salesmen[key].nama = fd2.nama;

                var prodCount = 0;
                var prodTotal = 0;
                for (var p = 0; p < FUND_PRODUCTS.length; p++) {
                    var act = fd2.products[FUND_PRODUCTS[p]] || 0;
                    var pp = (fd2.tgtCov > 0) ? Math.round((act / fd2.tgtCov) * 100) : 0;
                    prodTotal += pp;
                    prodCount++;
                }
                salesmen[key].data[m] = (prodCount > 0) ? Math.round(prodTotal / prodCount) : 0;
            }
        } else {
            var data = ALL_DATA[MONTHS[m]];
            var slabs = SLABS_ALL[MONTHS[m]];
            if (!data || !slabs) continue;
            var fd = getFilteredLB(data);

            for (var i = 0; i < fd.length; i++) {
                var d = fd[i];
                var inc = calcIncentive(d, slabs);

                /* KEY: Gunakan kode untuk trend chart */
                var key = d.kode || d.nama;

                if (!salesmen[key]) {
                    salesmen[key] = { nama: d.nama, data: new Array(12) };
                    for (var x = 0; x < 12; x++) salesmen[key].data[x] = null;
                }

                /* Update nama ke bulan terbaru */
                salesmen[key].nama = d.nama;

                var val = 0;
                if (SORT_BY === 'ims') val = (inc.imsP || 0);
                /* Incentive tanpa cek hangus di leaderboard */
                else if (SORT_BY === 'incentive') val = (inc.totalRaw || 0);
                else if (SORT_BY === 'coverage') val = (inc.covP || 0);
                else if (SORT_BY === 'gc') val = (inc.gcIncP || 0);
                else if (SORT_BY === 'pf') val = Math.round(((inc.aoP || 0) + (inc.pf1P || 0) + (inc.pf2P || 0)) / 3);
                else val = (inc.imsP || 0);

                salesmen[key].data[m] = val;
            }
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

    /* --- Legend: Tampilkan nama (bukan kode) --- */
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
    var themeBtn = document.getElementById('themeBtn');

    if (selSort) selSort.onchange = renderAll;
    if (filterArea) filterArea.onchange = renderAll;
    if (filterType) filterType.onchange = renderAll;
    if (fromMonth) fromMonth.onchange = renderAll;
    if (toMonth) toMonth.onchange = renderAll;
    if (themeBtn) themeBtn.onclick = togTheme;

    loadAllMonths();
});
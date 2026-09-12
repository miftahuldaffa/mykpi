
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
        setDefaultMonths();
        renderAll();
        renderZeroIncentive();
    }).catch(function(e) {
        if (sb) sb.className = 'badge st-err';
        if (st) st.textContent = 'Error: ' + (e.message || e);
    });
}

/* ===== SET DEFAULT MONTHS TO CURRENT ===== */
function setDefaultMonths() {
    var now = new Date();
    var m = now.getMonth() + 1;
    var key = 'M' + (m < 10 ? '0' + m : m);

    var zf = document.getElementById('zeroFrom');
    var zt = document.getElementById('zeroTo');
    if (zf) {
        for (var i = 0; i < zf.options.length; i++) {
            if (zf.options[i].value === key) { zf.value = key; break; }
        }
    }
    if (zt) {
        for (var i = 0; i < zt.options.length; i++) {
            if (zt.options[i].value === key) { zt.value = key; break; }
        }
    }
}

/* ===== GET FILTERED BY TYPE ===== */
function getFilteredByType(data, typeFilterId) {
    var elType = document.getElementById(typeFilterId);
    var vt = elType ? elType.value : 'all';
    var r = [];
    for (var i = 0; i < data.length; i++) {
        var d = data[i];
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

/* ===== RENDER ALL (ranking + trend) ===== */
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
            var fd = getFilteredByType(data, 'filterType');
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
                        count: 0
                    };
                }

                accum[key].nama = d.nama;
                accum[key].type = getType(d);

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
        var typeLbl = getTypeLabel(r.type);
        var typeCls = getTypeBadgeClass(r.type);

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

/* ================================================================
   RENDER CEK INCENTIVE - Support range bulan
   - Single month: detail breakdown per KPI
   - Multi month: kolom per bulan + summary
   ================================================================ */
function renderZeroIncentive() {
    var elFrom = document.getElementById('zeroFrom');
    var elTo = document.getElementById('zeroTo');
    var elFilter = document.getElementById('zeroFilter');

    var fromM = elFrom ? elFrom.value : 'M09';
    var toM = elTo ? elTo.value : 'M09';
    var filter = elFilter ? elFilter.value : 'all';

    var fromIdx = MONTHS.indexOf(fromM);
    var toIdx = MONTHS.indexOf(toM);
    if (fromIdx > toIdx) { var tmp = fromIdx; fromIdx = toIdx; toIdx = tmp; }

    var monthCount = toIdx - fromIdx + 1;
    var isSingle = (monthCount === 1);

    var elLabel = document.getElementById('zeroLabel');
    if (elLabel) {
        if (isSingle) {
            elLabel.textContent = MONTH_NAMES[fromIdx] + ' 2026';
        } else {
            elLabel.textContent = MONTH_NAMES[fromIdx] + ' - ' + MONTH_NAMES[toIdx] + ' 2026 (' + monthCount + ' bulan)';
        }
    }

    var elSummary = document.getElementById('zeroSummary');
    var elTable = document.getElementById('zeroTable');

    /* --- Accumulate per salesman across months --- */
    var accum = {};
    var hasData = false;

    for (var m = fromIdx; m <= toIdx; m++) {
        var data = ALL_DATA[MONTHS[m]];
        var slabs = SLABS_ALL[MONTHS[m]];
        if (!data || !slabs) continue;
        hasData = true;

        var fd = getFilteredByType(data, 'zeroType');
        for (var i = 0; i < fd.length; i++) {
            var d = fd[i];
            var inc = calcIncentive(d, slabs);
            var finalInc = inc.hangus ? 0 : inc.totalRaw;
            var isZero = (finalInc === 0);

            var key = d.kode || d.nama;

            if (!accum[key]) {
                accum[key] = {
                    kode: d.kode || '',
                    nama: d.nama,
                    type: getType(d),
                    totalInc: 0,
                    gotMonths: 0,
                    zeroMonths: 0,
                    hangusMonths: 0,
                    monthCount: 0,
                    months: []
                };
            }

            accum[key].nama = d.nama;
            accum[key].type = getType(d);
            accum[key].monthCount++;

            var monthDetail = {
                month: MONTH_NAMES[m],
                monthIdx: m,
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
                isZero: isZero
            };
            accum[key].months.push(monthDetail);

            accum[key].totalInc += finalInc;
            if (inc.hangus) {
                accum[key].hangusMonths++;
                accum[key].zeroMonths++;
            } else if (isZero) {
                accum[key].zeroMonths++;
            } else {
                accum[key].gotMonths++;
            }
        }
    }

    if (!hasData) {
        if (elSummary) elSummary.innerHTML = '';
        if (elTable) elTable.innerHTML = '<p style="color:var(--t2);font-size:.72rem;text-align:center;padding:20px">Tidak ada data untuk periode ini</p>';
        return;
    }

    /* --- Convert to array --- */
    var rows = [];
    var totalSls = 0;
    var totalGotAll = 0;
    var totalHasZero = 0;
    var totalHangusAll = 0;

    for (var k in accum) {
        var a = accum[k];
        totalSls++;
        if (a.zeroMonths === 0) totalGotAll++;
        if (a.zeroMonths > 0) totalHasZero++;
        totalHangusAll += a.hangusMonths;

        var hasHangus = (a.hangusMonths > 0);

        /* Apply filter */
        if (filter === 'zero' && a.zeroMonths === 0) continue;
        if (filter === 'got' && a.gotMonths === 0) continue;
        if (filter === 'hangus' && !hasHangus) continue;

        a.hasHangus = hasHangus;
        rows.push(a);
    }

    /* --- Summary badges --- */
    var sumH = '<div class="sum-grid" style="margin-bottom:14px">';
    sumH += '<div class="sum-card"><div class="lbl">TOTAL SALESMAN</div><div class="val" style="font-size:1.3rem;font-weight:700">' + totalSls + '</div></div>';
    sumH += '<div class="sum-card" style="border-left:3px solid var(--hi-c)"><div class="lbl">&#128994; SELALU DAPAT</div><div class="val" style="font-size:1.3rem;font-weight:700;color:var(--hi-c)">' + totalGotAll + '</div></div>';
    sumH += '<div class="sum-card" style="border-left:3px solid var(--lo-c)"><div class="lbl">&#128308; PERNAH ZERO</div><div class="val" style="font-size:1.3rem;font-weight:700;color:var(--lo-c)">' + totalHasZero + '</div></div>';
    sumH += '<div class="sum-card" style="border-left:3px solid var(--mid-c)"><div class="lbl">&#128683; TOTAL HANGUS</div><div class="val" style="font-size:1.3rem;font-weight:700;color:var(--mid-c)">' + totalHangusAll + 'x</div></div>';
    sumH += '</div>';
    if (elSummary) elSummary.innerHTML = sumH;

    /* --- Sort: most zero months first, then by total incentive asc --- */
    rows.sort(function(a, b) {
        if (b.zeroMonths !== a.zeroMonths) return b.zeroMonths - a.zeroMonths;
        return a.totalInc - b.totalInc;
    });

    /* --- Build table --- */
    var h = '';

    if (isSingle) {
        /* ===== SINGLE MONTH VIEW - detail breakdown ===== */
        h += '<table class="lb-table"><thead><tr>';
        h += '<th>#</th><th>SALESMAN</th><th>TIPE</th>';
        h += '<th>COV %</th><th>IMS %</th><th>AQ</th>';
        h += '<th>IMS</th><th>AO</th><th>' + PF_NAMES.pf1 + '</th><th>' + PF_NAMES.pf2 + '</th><th>GC</th>';
        h += '<th>TOTAL</th><th>STATUS</th>';
        h += '</tr></thead><tbody>';

        for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            var md = r.months[0];
            var typeLbl = getTypeLabel(r.type);
            var typeCls = getTypeBadgeClass(r.type);

            var rowCls = md.isZero ? ' style="opacity:.85"' : '';
            h += '<tr' + rowCls + '>';
            h += '<td>' + (i + 1) + '</td>';
            h += '<td><span class="sls-kode">' + r.kode + '</span> <strong>' + r.nama + '</strong></td>';
            h += '<td><span class="type-badge ' + typeCls + '">' + typeLbl + '</span></td>';
            h += '<td><span class="pb-b ' + pcC(md.covP) + '">' + md.covP + '%</span></td>';
            h += '<td><span class="pb-b ' + pcC(md.imsP) + '">' + md.imsP + '%</span></td>';

            var aqCls = md.aqMul >= 100 ? 'ph-h' : (md.aqMul >= 80 ? 'ph-m' : 'ph-l');
            h += '<td><span class="pb-b ' + aqCls + '">' + md.aqPct + '%</span></td>';

            h += '<td>' + fmtRp(md.incIMS) + '</td>';
            h += '<td>' + fmtRp(md.incAO) + '</td>';
            h += '<td>' + fmtRp(md.incPF1) + '</td>';
            h += '<td>' + fmtRp(md.incPF2) + '</td>';
            h += '<td>' + fmtRp(md.incGC) + '</td>';

            if (md.hangus) {
                h += '<td style="text-decoration:line-through;color:var(--lo-c)">' + fmtRp(md.totalRaw) + '</td>';
            } else {
                h += '<td style="font-weight:700">' + fmtRp(md.finalInc) + '</td>';
            }

            if (md.hangus) {
                h += '<td><span class="kejar-badge kejar-no" style="font-size:.55rem">&#128683; HANGUS</span></td>';
            } else if (md.isZero) {
                h += '<td><span class="kejar-badge kejar-no" style="font-size:.55rem">&#128308; Rp 0</span></td>';
            } else {
                h += '<td><span class="kejar-badge kejar-ok" style="font-size:.55rem">&#128994; ' + fmtRp(md.finalInc) + '</span></td>';
            }
            h += '</tr>';
        }
        h += '</tbody></table>';

    } else {
        /* ===== MULTI MONTH (RANGE) VIEW - kolom per bulan ===== */
        h += '<table class="lb-table"><thead><tr>';
        h += '<th>#</th><th>SALESMAN</th><th>TIPE</th>';

        /* Dynamic month columns */
        for (var m = fromIdx; m <= toIdx; m++) {
            h += '<th>' + MONTH_NAMES[m] + '</th>';
        }

        h += '<th>TOTAL INC</th><th>&#128994;</th><th>&#128308;</th><th>&#128683;</th>';
        h += '</tr></thead><tbody>';

        for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            var typeLbl = getTypeLabel(r.type);
            var typeCls = getTypeBadgeClass(r.type);

            var rowCls = (r.gotMonths === 0) ? ' style="opacity:.85"' : '';
            h += '<tr' + rowCls + '>';
            h += '<td>' + (i + 1) + '</td>';
            h += '<td><span class="sls-kode">' + r.kode + '</span> <strong>' + r.nama + '</strong></td>';
            h += '<td><span class="type-badge ' + typeCls + '">' + typeLbl + '</span></td>';

            /* Build lookup: monthIdx -> monthDetail */
            var monthMap = {};
            for (var mi = 0; mi < r.months.length; mi++) {
                monthMap[r.months[mi].monthIdx] = r.months[mi];
            }

            /* Per-month incentive cells */
            for (var m = fromIdx; m <= toIdx; m++) {
                var md = monthMap[m];
                if (!md) {
                    h += '<td style="font-size:.6rem;text-align:center;color:var(--t2)">-</td>';
                } else if (md.hangus) {
                    h += '<td style="font-size:.6rem;text-align:center"><span class="kejar-badge kejar-no" style="font-size:.5rem">&#128683;</span><br><span style="text-decoration:line-through;color:var(--lo-c)">' + fmtRp(md.totalRaw) + '</span></td>';
                } else if (md.isZero) {
                    h += '<td style="font-size:.6rem;text-align:center;color:var(--lo-c)">Rp 0</td>';
                } else {
                    h += '<td style="font-size:.6rem;text-align:center;color:var(--hi-c);font-weight:600">' + fmtRp(md.finalInc) + '</td>';
                }
            }

            /* Total + counts */
            h += '<td style="font-weight:700">' + fmtRp(r.totalInc) + '</td>';
            h += '<td style="text-align:center;color:var(--hi-c);font-weight:600">' + r.gotMonths + '</td>';
            h += '<td style="text-align:center;color:var(--lo-c);font-weight:600">' + r.zeroMonths + '</td>';
            h += '<td style="text-align:center;color:var(--mid-c);font-weight:600">' + r.hangusMonths + '</td>';
            h += '</tr>';
        }
        h += '</tbody></table>';
    }

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
        var fd = getFilteredByType(data, 'filterType');

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

    /* Ranking section filters */
    var selSort = document.getElementById('selSort');
    var filterType = document.getElementById('filterType');
    var fromMonth = document.getElementById('fromMonth');
    var toMonth = document.getElementById('toMonth');

    if (selSort) selSort.onchange = renderAll;
    if (filterType) filterType.onchange = renderAll;
    if (fromMonth) fromMonth.onchange = renderAll;
    if (toMonth) toMonth.onchange = renderAll;

    /* Cek Incentive section filters (independent) */
    var zeroFrom = document.getElementById('zeroFrom');
    var zeroTo = document.getElementById('zeroTo');
    var zeroType = document.getElementById('zeroType');
    var zeroFilter = document.getElementById('zeroFilter');

    if (zeroFrom) zeroFrom.onchange = renderZeroIncentive;
    if (zeroTo) zeroTo.onchange = renderZeroIncentive;
    if (zeroType) zeroType.onchange = renderZeroIncentive;
    if (zeroFilter) zeroFilter.onchange = renderZeroIncentive;

    loadAllMonths();
});


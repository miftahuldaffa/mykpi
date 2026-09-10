/* ===== CONSTANTS ===== */
var MONTHS = ['M01','M02','M03','M04','M05','M06','M07','M08','M09','M10','M11','M12'];
var MONTH_NAMES = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
var COLORS = ['#7c3aed','#06b6d4','#f59e0b','#10b981','#ef4444','#ec4899','#8b5cf6','#14b8a6','#f97316','#6366f1','#84cc16','#e11d48','#0ea5e9','#a855f7','#22c55e','#eab308'];
var LF = String.fromCharCode(10);
var CR = String.fromCharCode(13);

/* ===== PF NAMES (auto dari header GSheet) ===== */
var PF_NAMES = { pf1: 'PF1', pf2: 'PF2', pf3: 'PF3' };

/* ===== THEME ===== */
function initTheme() {
    var ic = document.getElementById('themeIcon');
    var lb = document.getElementById('themeLabel');
    if (!ic || !lb) return;
    var s = localStorage.getItem('kpi-theme');
    if (s === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        ic.textContent = '\u2600';
        lb.textContent = 'Light';
    }
}
function togTheme() {
    var h = document.documentElement;
    var ic = document.getElementById('themeIcon');
    var lb = document.getElementById('themeLabel');
    if (!ic || !lb) return;
    if (h.getAttribute('data-theme') === 'light') {
        h.setAttribute('data-theme', 'dark');
        ic.textContent = '\u2600';
        lb.textContent = 'Light';
        localStorage.setItem('kpi-theme', 'dark');
    } else {
        h.setAttribute('data-theme', 'light');
        ic.textContent = '\uD83C\uDF19';
        lb.textContent = 'Dark';
        localStorage.setItem('kpi-theme', 'light');
    }
}

/* ===== UTILITY ===== */
function pN(v) {
    if (!v) return 0;
    var s = String(v).trim();
    if (s === '-' || s === '') return 0;
    s = s.replace(/,/g, '');
    s = s.replace(/[^0-9.\-]/g, '');
    var n = parseFloat(s);
    return isNaN(n) ? 0 : n;
}
function pct(a, t) {
    if (!t || t === 0) return 0;
    return Math.round((a / t) * 100);
}
function fmtRp(n) {
    if (!n || n === 0) return 'Rp 0';
    return 'Rp ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function fmtJt(n) {
    if (!n || n === 0) return 'Rp 0';
    var jt = n / 1000000;
    return 'Rp ' + jt.toFixed(1) + 'Jt';
}
function pcC(p) {
    if (p >= 100) return 'ph-h';
    if (p >= 80) return 'ph-m';
    return 'ph-l';
}

/* ===== CSV PARSING ===== */
function splitCSVLine(line) {
    var vals = [];
    var cur = '';
    var inQ = false;
    for (var j = 0; j < line.length; j++) {
        var c = line.charAt(j);
        if (c === '"') {
            inQ = !inQ;
        } else if (c === ',' && !inQ) {
            vals.push(cur.trim().replace(/"/g, ''));
            cur = '';
        } else {
            cur += c;
        }
    }
    vals.push(cur.trim().replace(/"/g, ''));
    return vals;
}
function findCol(headers, keywords) {
    for (var i = 0; i < headers.length; i++) {
        var h = headers[i].toUpperCase();
        for (var k = 0; k < keywords.length; k++) {
            if (h.indexOf(keywords[k]) !== -1) return i;
        }
    }
    return -1;
}

/* ===== TYPE HELPERS ===== */
function getType(d) {
    if (d.slsType) {
        var t = d.slsType.toUpperCase();
        if (t.indexOf('WHS') !== -1) return 'whs';
        if (t.indexOf('MT') !== -1) return 'mt';
        if (t.indexOf('RETAIL') !== -1) return 'retail';
        if (t.indexOf('TO') !== -1 || t.indexOf('RIST') !== -1) return 'torist';
    }
    return 'retail';
}
function getTypeLabel(t) {
    if (t === 'whs') return 'WHS';
    if (t === 'torist') return 'TO-RIST';
    return 'RETAIL';
}
function getTypeBadgeClass(t) {
    if (t === 'whs') return 'type-whs';
    if (t === 'torist') return 'type-torist';
    return 'type-retail';
}
function getSchemeType(t) {
    if (t === 'whs') return 'WHS';
    if (t === 'torist') return 'TO-RIST';
    return 'RETAIL';
}

/* ===== SCHEME PARSER (dengan PER_PCT) ===== */
function parseScheme(txt) {
    var lines = txt.split(LF);
    var slabs = [];
    var hi = -1;
    for (var h = 0; h < lines.length; h++) {
        var ln = lines[h].replace(CR, '').trim().toUpperCase();
        if (ln.indexOf('TYPE') !== -1 && ln.indexOf('KPI') !== -1) {
            hi = h;
            break;
        }
    }
    if (hi === -1) return slabs;
    var headers = splitCSVLine(lines[hi].replace(CR, '').trim());
    var cType = findCol(headers, ['TYPE']);
    var cKpi = findCol(headers, ['KPI']);
    var cMin = findCol(headers, ['MIN_PCT', 'MIN']);
    var cInc = findCol(headers, ['INCENTIVE', 'INC']);
    var cPerPct = findCol(headers, ['PER_PCT', 'PER PCT', 'PERPCT', 'PER_PERCENT']);
    for (var i = hi + 1; i < lines.length; i++) {
        var line = lines[i].replace(CR, '').trim();
        if (line === '') continue;
        var vals = splitCSVLine(line);
        var tp = (cType >= 0) ? (vals[cType] || '').trim().toUpperCase() : '';
        var kpi = (cKpi >= 0) ? (vals[cKpi] || '').trim().toUpperCase() : '';
        var minP = (cMin >= 0) ? pN(vals[cMin]) : 0;
        var inc = (cInc >= 0) ? pN(vals[cInc]) : 0;
        var perPct = (cPerPct >= 0) ? pN(vals[cPerPct]) : 0;
        if (tp && kpi) {
            slabs.push({ type: tp, kpi: kpi, minPct: minP, incentive: inc, perPct: perPct });
        }
    }
    return slabs;
}

/* ===== KPI INCENTIVE DATA PARSER ===== */
function parseData(txt) {
    var lines = txt.split(LF);
    var data = [];
    var hi = -1;
    for (var h = 0; h < lines.length; h++) {
        var ln = lines[h].replace(CR, '').trim().toUpperCase();
        if (ln.indexOf('KODE') !== -1) {
            hi = h;
            break;
        }
    }
    if (hi === -1) return data;
    var headers = splitCSVLine(lines[hi].replace(CR, '').trim());
    var cKode = findCol(headers, ['KODE']);
    var cNama = findCol(headers, ['NAMA']);
    var cArea = findCol(headers, ['AREA']);
    var cType = findCol(headers, ['TYPE']);
    var cTgtCov = findCol(headers, ['TARGET COVEX', 'TGT COVEX', 'TARGET COV']);
    var cActCov = findCol(headers, ['ACTUAL COVEX', 'ACT COVEX', 'ACTUAL COV']);
    var cTgtCall = findCol(headers, ['TARGET CALL']);
    var cActCall = findCol(headers, ['ACTUAL CALL']);
    var cTgtEC = findCol(headers, ['TARGET EC']);
    var cActEC = findCol(headers, ['ACTUAL EC']);
    var cAoTotal = findCol(headers, ['ACTUAL AO TOTAL', 'AO TOTAL']);

    /* AO INC */
    var cAo = -1;
    for (var i = 0; i < headers.length; i++) {
        var hu = headers[i].toUpperCase();
        if (hu.indexOf('ACTUAL') !== -1 && hu.indexOf('AO') !== -1 && hu.indexOf('TOTAL') === -1) {
            cAo = i;
            break;
        }
    }
    if (cAo === -1) {
        cAo = findCol(headers, ['AO INC', 'ACTUAL AO INC', 'ACTUAL AO 100', 'ACTUAL AO 40']);
    }

    /* PF1, PF2, PF3 */
    var cPf1 = -1;
    var cPf2 = -1;
    var cPf3 = -1;
    for (var i = 0; i < headers.length; i++) {
        var hu = headers[i].toUpperCase();
        if (hu.indexOf('ACTUAL') !== -1 && hu.indexOf('TARGET') === -1) {
            if (hu.indexOf('PF1') !== -1 && cPf1 === -1) cPf1 = i;
            if (hu.indexOf('PF2') !== -1 && cPf2 === -1) cPf2 = i;
            if (hu.indexOf('PF3') !== -1 && cPf3 === -1) cPf3 = i;
        }
    }

    /* TARGET GC - EXACT MATCH */
    var cTgtGC = -1;
    for (var i = 0; i < headers.length; i++) {
        var hu = headers[i].toUpperCase().trim();
        if (hu === 'TARGET GC') {
            cTgtGC = i;
            break;
        }
    }

    /* TARGET GC% - EXACT MATCH */
    var cTgtGCPct = -1;
    for (var i = 0; i < headers.length; i++) {
        var hu = headers[i].toUpperCase().trim();
        if (hu === 'TARGET GC%' || hu === 'TGT GC%') {
            cTgtGCPct = i;
            break;
        }
    }

    var cActGC = findCol(headers, ['ACTUAL GC']);
    var cTgtIMS = findCol(headers, ['TARGET IMS']);
    var cActIMS = findCol(headers, ['ACTUAL IMS']);

    /* PENGALI KOLOM */
    var cTgtAoPct = findCol(headers, ['TARGET AO INC%', 'TARGET AO%', 'TGT AO%']);
    var cTgtPf1Pct = findCol(headers, ['TARGET PF1%', 'TGT PF1%']);
    var cTgtPf2Pct = findCol(headers, ['TARGET PF2%', 'TGT PF2%']);
    var cTgtPf3Pct = findCol(headers, ['TARGET PF3%', 'TGT PF3%']);

    /* AUTO DETECT PF NAMES */
    if (cPf1 >= 0) {
        var rawPf1 = headers[cPf1].replace(/ACTUAL /i, '').trim();
        if (rawPf1) PF_NAMES.pf1 = rawPf1;
    }
    if (cPf2 >= 0) {
        var rawPf2 = headers[cPf2].replace(/ACTUAL /i, '').trim();
        if (rawPf2) PF_NAMES.pf2 = rawPf2;
    }
    if (cPf3 >= 0) {
        var rawPf3 = headers[cPf3].replace(/ACTUAL /i, '').trim();
        if (rawPf3) PF_NAMES.pf3 = rawPf3;
    }

    for (var i = hi + 1; i < lines.length; i++) {
        var line = lines[i].replace(CR, '').trim();
        if (line === '') continue;
        var vals = splitCSVLine(line);
        var nama = (cNama >= 0) ? (vals[cNama] || '').trim() : '';
        if (nama === '') continue;
        data.push({
            kode: (cKode >= 0) ? (vals[cKode] || '').trim() : '',
            nama: nama,
            area: (cArea >= 0) ? (vals[cArea] || '').trim() : '',
            slsType: (cType >= 0) ? (vals[cType] || '').trim() : '',
            tgtCov: (cTgtCov >= 0) ? pN(vals[cTgtCov]) : 0,
            actCov: (cActCov >= 0) ? pN(vals[cActCov]) : 0,
            tgtCall: (cTgtCall >= 0) ? pN(vals[cTgtCall]) : 0,
            actCall: (cActCall >= 0) ? pN(vals[cActCall]) : 0,
            tgtEC: (cTgtEC >= 0) ? pN(vals[cTgtEC]) : 0,
            actEC: (cActEC >= 0) ? pN(vals[cActEC]) : 0,
            aoTotal: (cAoTotal >= 0) ? pN(vals[cAoTotal]) : 0,
            ao: (cAo >= 0) ? pN(vals[cAo]) : 0,
            pf1: (cPf1 >= 0) ? pN(vals[cPf1]) : 0,
            pf2: (cPf2 >= 0) ? pN(vals[cPf2]) : 0,
            pf3: (cPf3 >= 0) ? pN(vals[cPf3]) : 0,
            tgtGC: (cTgtGC >= 0) ? pN(vals[cTgtGC]) : 0,
            actGC: (cActGC >= 0) ? pN(vals[cActGC]) : 0,
            tgtIMS: (cTgtIMS >= 0) ? pN(vals[cTgtIMS]) : 0,
            actIMS: (cActIMS >= 0) ? pN(vals[cActIMS]) : 0,
            tgtAoPct: (cTgtAoPct >= 0) ? pN(vals[cTgtAoPct]) : 0,
            tgtPf1Pct: (cTgtPf1Pct >= 0) ? pN(vals[cTgtPf1Pct]) : 0,
            tgtPf2Pct: (cTgtPf2Pct >= 0) ? pN(vals[cTgtPf2Pct]) : 0,
            tgtPf3Pct: (cTgtPf3Pct >= 0) ? pN(vals[cTgtPf3Pct]) : 0,
            tgtGCPct: (cTgtGCPct >= 0) ? pN(vals[cTgtGCPct]) : 0
        });
    }
    return data;
}

/* ===== KPI FUNDAMENTAL DATA PARSER ===== */
var FUND_PRODUCTS = [];
function parseFundamental(txt) {
    var lines = txt.split(LF);
    var data = [];
    var hi = -1;
    for (var h = 0; h < lines.length; h++) {
        var ln = lines[h].replace(CR, '').trim().toUpperCase();
        if (ln.indexOf('KODE') !== -1) {
            hi = h;
            break;
        }
    }
    if (hi === -1) return data;
    var headers = splitCSVLine(lines[hi].replace(CR, '').trim());
    var cNama = findCol(headers, ['NAMA']);
    var cArea = findCol(headers, ['AREA']);
    var cType = findCol(headers, ['TYPE']);
    var cTgtCov = findCol(headers, ['TARGET COVEX', 'TGT COVEX', 'TARGET COV']);
    var prodCols = [];
    for (var i = 0; i < headers.length; i++) {
        var hu = headers[i].toUpperCase();
        if (hu.indexOf('ACTUAL AO') !== -1 || hu.indexOf('ACTUAL ') !== -1) {
            var pName = headers[i].replace(/ACTUAL AO /i, '').replace(/ACTUAL /i, '').trim();
            if (pName && pName.toUpperCase() !== 'COVEX' && pName.toUpperCase() !== 'CALL' && pName.toUpperCase() !== 'EC' && pName.toUpperCase().indexOf('AO') === -1 && pName.toUpperCase().indexOf('IMS') === -1 && pName.toUpperCase().indexOf('GC') === -1) {
                prodCols.push({ idx: i, name: pName });
            }
        }
    }
    FUND_PRODUCTS = [];
    for (var p = 0; p < prodCols.length; p++) {
        FUND_PRODUCTS.push(prodCols[p].name);
    }
    for (var i = hi + 1; i < lines.length; i++) {
        var line = lines[i].replace(CR, '').trim();
        if (line === '') continue;
        var vals = splitCSVLine(line);
        var nama = (cNama >= 0) ? (vals[cNama] || '').trim() : '';
        if (nama === '') continue;
        var row = {
            nama: nama,
            area: (cArea >= 0) ? (vals[cArea] || '').trim() : '',
            slsType: (cType >= 0) ? (vals[cType] || '').trim() : '',
            tgtCov: (cTgtCov >= 0) ? pN(vals[cTgtCov]) : 0,
            products: {}
        };
        for (var p = 0; p < prodCols.length; p++) {
            row.products[prodCols[p].name] = pN(vals[prodCols[p].idx]);
        }
        data.push(row);
    }
    return data;
}

/* ===== INCENTIVE CALCULATION ===== */
function getMaxPct(slabs, type, kpi) {
    var mx = 0;
    for (var i = 0; i < slabs.length; i++) {
        if (slabs[i].type === type && slabs[i].kpi === kpi && slabs[i].minPct > mx) {
            mx = slabs[i].minPct;
        }
    }
    return mx;
}

/* ===== IMS PROGRESSIVE ===== */
function calcIMS(pctVal, type, slabs) {
    var filtered = [];
    for (var i = 0; i < slabs.length; i++) {
        if (slabs[i].type === type && slabs[i].kpi === 'IMS') {
            filtered.push(slabs[i]);
        }
    }
    filtered.sort(function(a, b) { return a.minPct - b.minPct; });
    if (filtered.length === 0) return 0;
    if (pctVal < filtered[0].minPct) return 0;
    var maxTier = filtered[filtered.length - 1];
    if (pctVal >= maxTier.minPct) return maxTier.incentive;
    var base = 0;
    var basePct = 0;
    var perPctVal = 0;
    for (var i = filtered.length - 1; i >= 0; i--) {
        if (pctVal >= filtered[i].minPct) {
            base = filtered[i].incentive;
            basePct = filtered[i].minPct;
            perPctVal = filtered[i].perPct || 0;
            break;
        }
    }
    var extra = Math.floor((pctVal - basePct) * perPctVal);
    var nextInc = 0;
    for (var i = 0; i < filtered.length; i++) {
        if (filtered[i].minPct > basePct) {
            nextInc = filtered[i].incentive;
            break;
        }
    }
    var total = base + extra;
    if (nextInc > 0 && total > nextInc) {
        total = nextInc;
    }
    return total;
}

/* ===== FLAT SLAB (AO, PF1, PF2, GC) ===== */
function calcFlat(pctVal, type, kpi, slabs) {
    var filtered = [];
    for (var i = 0; i < slabs.length; i++) {
        if (slabs[i].type === type && slabs[i].kpi === kpi) {
            filtered.push(slabs[i]);
        }
    }
    filtered.sort(function(a, b) { return a.minPct - b.minPct; });
    var result = 0;
    for (var i = filtered.length - 1; i >= 0; i--) {
        if (pctVal >= filtered[i].minPct) {
            result = filtered[i].incentive;
            break;
        }
    }
    return result;
}

/* ===== CALC INCENTIVE PER SALESMAN ===== */
function calcIncentive(d, slabs) {
    var type = getType(d);
    var schType = getSchemeType(type);
    var covP = pct(d.actCov, d.tgtCov);

    /* PENGALI dari GSheet */
    var aoMul = d.tgtAoPct > 0 ? d.tgtAoPct : 90;
    var pf1Mul = d.tgtPf1Pct > 0 ? d.tgtPf1Pct : 70;
    var pf2Mul = d.tgtPf2Pct > 0 ? d.tgtPf2Pct : 55;
    var pf3Mul = d.tgtPf3Pct > 0 ? d.tgtPf3Pct : 45;
    var gcMul = d.tgtGCPct > 0 ? d.tgtGCPct : 50;

    /* TARGET TAMPILAN di Coverage-Based = Covex x pengali */
    var tgtAoDisp = Math.round(d.tgtCov * (aoMul / 100));
    var tgtPf1Disp = Math.round(d.tgtCov * (pf1Mul / 100));
    var tgtPf2Disp = Math.round(d.tgtCov * (pf2Mul / 100));
    var tgtPf3Disp = Math.round(d.tgtCov * (pf3Mul / 100));

    /* GC target tampilan = TARGET GC% x TARGET GC */
    var tgtGCcov = Math.round(d.tgtGC * (gcMul / 100));

    /* PERSENTASE UNTUK INCENTIVE = Actual / Target Covex LANGSUNG */
    var aoP = pct(d.ao, d.tgtCov);
    var pf1P = pct(d.pf1, d.tgtCov);
    var pf2P = pct(d.pf2, d.tgtCov);
    var pf3P = pct(d.pf3, d.tgtCov);

    /* PERSENTASE UNTUK TAMPILAN Coverage-Based = Actual / (Covex x Pengali%) */
    var aoCovP = (tgtAoDisp > 0) ? pct(d.ao, tgtAoDisp) : 0;
    var pf1CovP = (tgtPf1Disp > 0) ? pct(d.pf1, tgtPf1Disp) : 0;
    var pf2CovP = (tgtPf2Disp > 0) ? pct(d.pf2, tgtPf2Disp) : 0;
    var pf3CovP = (tgtPf3Disp > 0) ? pct(d.pf3, tgtPf3Disp) : 0;

    /* GC Coverage-Based % = Actual GC / (TARGET GC% x TARGET GC) */
    var gcCovP = (tgtGCcov > 0) ? pct(d.actGC, tgtGCcov) : 0;

    /* GC INCENTIVE % = Actual GC / TARGET GC */
    var gcIncP = (d.tgtGC > 0) ? pct(d.actGC, d.tgtGC) : 0;

    /* IMS = Actual IMS / Target IMS */
    var imsP = (d.tgtIMS > 0) ? pct(d.actIMS, d.tgtIMS) : 0;

    /* HITUNG INCENTIVE */
    var incIMS = calcIMS(imsP, schType, slabs);
    var incAO = calcFlat(aoP, schType, 'AO', slabs);
    var incPF1 = calcFlat(pf1P, schType, 'PF1', slabs);
    var incPF2 = calcFlat(pf2P, schType, 'PF2', slabs);
    var incGC = calcFlat(gcIncP, schType, 'GC', slabs);
    var total = incIMS + incAO + incPF1 + incPF2 + incGC;
    var hangus = (covP < 100);

    return {
        imsP: imsP,
        covP: covP,
        aoP: aoP,
        pf1P: pf1P,
        pf2P: pf2P,
        pf3P: pf3P,
        gcCovP: gcCovP,
        gcIncP: gcIncP,
        actIMS: d.actIMS,
        aoMul: aoMul,
        pf1Mul: pf1Mul,
        pf2Mul: pf2Mul,
        pf3Mul: pf3Mul,
        gcMul: gcMul,
        tgtAoDisp: tgtAoDisp,
        tgtPf1Disp: tgtPf1Disp,
        tgtPf2Disp: tgtPf2Disp,
        tgtPf3Disp: tgtPf3Disp,
        tgtGCcov: tgtGCcov,
        incIMS: incIMS,
        incAO: incAO,
        incPF1: incPF1,
        incPF2: incPF2,
        incGC: incGC,
        total: hangus ? 0 : total,
        totalRaw: total,
        hangus: hangus,
        aoCovP: aoCovP,
        pf1CovP: pf1CovP,
        pf2CovP: pf2CovP,
        pf3CovP: pf3CovP,
    };
}

/* ===== FILTER HELPER ===== */
function populateAreaFilter(data, selId) {
    var sel = document.getElementById(selId);
    if (!sel) return;
    var areas = {};
    for (var i = 0; i < data.length; i++) {
        if (data[i].area) areas[data[i].area] = true;
    }
    sel.innerHTML = '<option value="all">Semua Area</option>';
    var al = Object.keys(areas).sort();
    for (var a = 0; a < al.length; a++) {
        var o = document.createElement('option');
        o.value = al[a];
        o.textContent = al[a];
        sel.appendChild(o);
    }
}
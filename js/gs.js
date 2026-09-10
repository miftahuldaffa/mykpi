
/* ===== PARSE GS CSV =====
   DYNAMIC: Auto-detect header row & read products from columns J+
   Setiap bulan produk di Google Sheet bisa beda, website otomatis ikut.
   
   STRUKTUR (tanpa kolom AREA):
   A = KODE SLS      (0)
   B = Nama SLS      (1)
   C = TYPE SLS      (2)
   D = Store Code    (3)
   E = Store Name    (4)
   F = Hari          (5)
   G = Pola          (6)
   H = SKU Target    (7)
   I = ACT           (8)
   J+ = Produk SKU   (9+)  ← DINAMIS, dibaca dari header
*/
function parseGSData(txt) {
    var NL = String.fromCharCode(10);
    var lines = txt.split(NL);
    var data = [];
    var products = [];

    if (lines.length < 2) return { data: [], products: [] };

    /* ===== AUTO-DETECT HEADER ROW ===== */
    var headerIdx = -1;
    for (var i = 0; i < lines.length; i++) {
        var lineUpper = lines[i].toUpperCase();
        if (lineUpper.indexOf('KODE SLS') !== -1 || lineUpper.indexOf('STORE CODE') !== -1 || lineUpper.indexOf('NAMA SLS') !== -1) {
            headerIdx = i;
            break;
        }
    }
    if (headerIdx === -1) return { data: [], products: [] };

    var headers = splitCSVLine(lines[headerIdx]);

    /* ===== FIND KEY COLUMNS DYNAMICALLY ===== */
    var COL_KODE_SLS   = -1;
    var COL_NAMA_SLS   = -1;
    var COL_TYPE_SLS   = -1;
    var COL_STORE_CODE = -1;
    var COL_STORE_NAME = -1;
    var COL_HARI       = -1;
    var COL_POLA       = -1;
    var COL_SKU_TGT    = -1;
    var COL_ACT        = -1;
    var COL_PROD_START = -1;

    for (var c = 0; c < headers.length; c++) {
        var hu = headers[c].trim().replace(/\"/g, '').toUpperCase();
        if (hu.indexOf('KODE') !== -1 && hu.indexOf('SLS') !== -1) COL_KODE_SLS = c;
        else if (hu.indexOf('NAMA') !== -1 && hu.indexOf('SLS') !== -1) COL_NAMA_SLS = c;
        else if (hu === 'TYPE' || hu === 'TYPE SLS' || hu === 'TIPE') COL_TYPE_SLS = c;
        else if (hu.indexOf('STORE') !== -1 && hu.indexOf('CODE') !== -1) COL_STORE_CODE = c;
        else if (hu.indexOf('STORE') !== -1 && hu.indexOf('NAME') !== -1) COL_STORE_NAME = c;
        else if (hu === 'HARI' || hu === 'DAY') COL_HARI = c;
        else if (hu === 'POLA' || hu === 'PATTERN') COL_POLA = c;
        else if (hu.indexOf('SKU') !== -1 && hu.indexOf('TARGET') !== -1) COL_SKU_TGT = c;
        else if (hu === 'ACT' || hu === 'ACTUAL') COL_ACT = c;
    }

    /* Product columns = everything AFTER ACT column */
    COL_PROD_START = (COL_ACT !== -1) ? COL_ACT + 1 : 9;

    for (var c = COL_PROD_START; c < headers.length; c++) {
        var pName = headers[c].trim().replace(/\"/g, '');
        if (pName) products.push(pName);
    }

    /* ===== PARSE DATA ROWS (starting after header) ===== */
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


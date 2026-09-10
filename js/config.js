var CONFIG = {
    BASE_INC: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR01EgaTwk8AqfKitVfDpQSb32q14faTaip_iCM2Ee_Iw2RSbHsSRwQb_gcYFWsIFjHYjZZCpRUc47a/pub',
    BASE_FUND: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR83UpGgwxglWT9mmd9l3_Jl0soYwZKGeRpKt3w38ctE2t1eVlvTK2Q1zq_lZJYvlpL0bQAkxFj9NbM/pub',
    BASE_SCH: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTDeuIhy6RHdjPs6NBMRKrGwsdtpPUFxLVR5X2D8IE5cRT5B4qFtRQXyhZvudg8vXKXzPjbxB6Rokd1/pub',
    BASE_GS: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTYocg_CtRWcAAiALWroeKeXrBdYl2B5TBch0Unf4EG5rlvAUAJQOhv8TFXjHRiqoNk74EFcOz8b9Ck/pub',

    GID_INC: {
        M01: '0',
        M02: '1183207810',
        M03: '515959756',
        M04: '1179805568',
        M05: '195334809',
        M06: '360700062',
        M07: '1051976969',
        M08: '823100451',
        M09: '138589577',
        M10: '1657877561',
        M11: '28230962',
        M12: '2097116614'
    },
    GID_FUND: {
        M01: '0',
        M02: '338418379',
        M03: '1382206582',
        M04: '798715045',
        M05: '2068792702',
        M06: '1819763105',
        M07: '1128012649',
        M08: '1379054371',
        M09: '1620242958',
        M10: '948464378',
        M11: '2025146779',
        M12: '605411050'
    },
    GID_SCH: {
        M01: '0',
        M02: '1451190062',
        M03: '1382856202',
        M04: '1611591478',
        M05: '78305978',
        M06: '452366178',
        M07: '379662211',
        M08: '1132793776',
        M09: '2030205947',
        M10: '1236946275',
        M11: '1821656715',
        M12: '592280108'
    },
    GID_GS: {
        M01: '0',
        M02: '0',
        M03: '0',
        M04: '0',
        M05: '0',
        M06: '0',
        M07: '0',
        M08: '0',
        M09: '580336835',
        M10: '0',
        M11: '0',
        M12: '0'
    },

    getURL: function(type, month) {
        if (type === 'INC') return this.BASE_INC + '?gid=' + this.GID_INC[month] + '&single=true&output=csv';
        if (type === 'FUND') return this.BASE_FUND + '?gid=' + this.GID_FUND[month] + '&single=true&output=csv';
        if (type === 'SCH') return this.BASE_SCH + '?gid=' + this.GID_SCH[month] + '&single=true&output=csv';
        if (type === 'GS') return this.BASE_GS + '?gid=' + this.GID_GS[month] + '&single=true&output=csv';
        return '';
    }
};
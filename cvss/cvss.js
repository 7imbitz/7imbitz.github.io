/* CVSS v4.0 Base Score Calculator
 * Adapted from CVSSjs (https://github.com/cvssjs) by Chandan B.N.
 * Scoring logic based on FIRST CVSS v4.0 specification
 *
 * SPDX-License-Identifier: BSD-2-Clause
 */

// ---- CVSS v4.0 Scoring Lookup Tables ----

var cvssLookupV4 = {
    "000000": 10,   "000001": 9.9,  "000010": 9.8,  "000011": 9.5,
    "000020": 9.5,  "000021": 9.2,  "000100": 10,   "000101": 9.6,
    "000110": 9.3,  "000111": 8.7,  "000120": 9.1,  "000121": 8.1,
    "000200": 9.3,  "000201": 9,    "000210": 8.9,  "000211": 8,
    "000220": 8.1,  "000221": 6.8,  "001000": 9.8,  "001001": 9.5,
    "001010": 9.5,  "001011": 9.2,  "001020": 9,    "001021": 8.4,
    "001100": 9.3,  "001101": 9.2,  "001110": 8.9,  "001111": 8.1,
    "001120": 8.1,  "001121": 6.5,  "001200": 8.8,  "001201": 8,
    "001210": 7.8,  "001211": 7,    "001220": 6.9,  "001221": 4.8,
    "002001": 9.2,  "002011": 8.2,  "002021": 7.2,  "002101": 7.9,
    "002111": 6.9,  "002121": 5,    "002201": 6.9,  "002211": 5.5,
    "002221": 2.7,  "010000": 9.9,  "010001": 9.7,  "010010": 9.5,
    "010011": 9.2,  "010020": 9.2,  "010021": 8.5,  "010100": 9.5,
    "010101": 9.1,  "010110": 9,    "010111": 8.3,  "010120": 8.4,
    "010121": 7.1,  "010200": 9.2,  "010201": 8.1,  "010210": 8.2,
    "010211": 7.1,  "010220": 7.2,  "010221": 5.3,  "011000": 9.5,
    "011001": 9.3,  "011010": 9.2,  "011011": 8.5,  "011020": 8.5,
    "011021": 7.3,  "011100": 9.2,  "011101": 8.2,  "011110": 8,
    "011111": 7.2,  "011120": 7,    "011121": 5.9,  "011200": 8.4,
    "011201": 7,    "011210": 7.1,  "011211": 5.2,  "011220": 5,
    "011221": 3,    "012001": 8.6,  "012011": 7.5,  "012021": 5.2,
    "012101": 7.1,  "012111": 5.2,  "012121": 2.9,  "012201": 6.3,
    "012211": 2.9,  "012221": 1.7,  "100000": 9.8,  "100001": 9.5,
    "100010": 9.4,  "100011": 8.7,  "100020": 9.1,  "100021": 8.1,
    "100100": 9.4,  "100101": 8.9,  "100110": 8.6,  "100111": 7.4,
    "100120": 7.7,  "100121": 6.4,  "100200": 8.7,  "100201": 7.5,
    "100210": 7.4,  "100211": 6.3,  "100220": 6.3,  "100221": 4.9,
    "101000": 9.4,  "101001": 8.9,  "101010": 8.8,  "101011": 7.7,
    "101020": 7.6,  "101021": 6.7,  "101100": 8.6,  "101101": 7.6,
    "101110": 7.4,  "101111": 5.8,  "101120": 5.9,  "101121": 5,
    "101200": 7.2,  "101201": 5.7,  "101210": 5.7,  "101211": 5.2,
    "101220": 5.2,  "101221": 2.5,  "102001": 8.3,  "102011": 7,
    "102021": 5.4,  "102101": 6.5,  "102111": 5.8,  "102121": 2.6,
    "102201": 5.3,  "102211": 2.1,  "102221": 1.3,  "110000": 9.5,
    "110001": 9,    "110010": 8.8,  "110011": 7.6,  "110020": 7.6,
    "110021": 7,    "110100": 9,    "110101": 7.7,  "110110": 7.5,
    "110111": 6.2,  "110120": 6.1,  "110121": 5.3,  "110200": 7.7,
    "110201": 6.6,  "110210": 6.8,  "110211": 5.9,  "110220": 5.2,
    "110221": 3,    "111000": 8.9,  "111001": 7.8,  "111010": 7.6,
    "111011": 6.7,  "111020": 6.2,  "111021": 5.8,  "111100": 7.4,
    "111101": 5.9,  "111110": 5.7,  "111111": 5.7,  "111120": 4.7,
    "111121": 2.3,  "111200": 6.1,  "111201": 5.2,  "111210": 5.7,
    "111211": 2.9,  "111220": 2.4,  "111221": 1.6,  "112001": 7.1,
    "112011": 5.9,  "112021": 3,    "112101": 5.8,  "112111": 2.6,
    "112121": 1.5,  "112201": 2.3,  "112211": 1.3,  "112221": 0.6,
    "200000": 9.3,  "200001": 8.7,  "200010": 8.6,  "200011": 7.2,
    "200020": 7.5,  "200021": 5.8,  "200100": 8.6,  "200101": 7.4,
    "200110": 7.4,  "200111": 6.1,  "200120": 5.6,  "200121": 3.4,
    "200200": 7,    "200201": 5.4,  "200210": 5.2,  "200211": 4,
    "200220": 4,    "200221": 2.2,  "201000": 8.5,  "201001": 7.5,
    "201010": 7.4,  "201011": 5.5,  "201020": 6.2,  "201021": 5.1,
    "201100": 7.2,  "201101": 5.7,  "201110": 5.5,  "201111": 4.1,
    "201120": 4.6,  "201121": 1.9,  "201200": 5.3,  "201201": 3.6,
    "201210": 3.4,  "201211": 1.9,  "201220": 1.9,  "201221": 0.8,
    "202001": 6.4,  "202011": 5.1,  "202021": 2,    "202101": 4.7,
    "202111": 2.1,  "202121": 1.1,  "202201": 2.4,  "202211": 0.9,
    "202221": 0.4,  "210000": 8.8,  "210001": 7.5,  "210010": 7.3,
    "210011": 5.3,  "210020": 6,    "210021": 5,    "210100": 7.3,
    "210101": 5.5,  "210110": 5.9,  "210111": 4,    "210120": 4.1,
    "210121": 2,    "210200": 5.4,  "210201": 4.3,  "210210": 4.5,
    "210211": 2.2,  "210220": 2,    "210221": 1.1,  "211000": 7.5,
    "211001": 5.5,  "211010": 5.8,  "211011": 4.5,  "211020": 4,
    "211021": 2.1,  "211100": 6.1,  "211101": 5.1,  "211110": 4.8,
    "211111": 1.8,  "211120": 2,    "211121": 0.9,  "211200": 4.6,
    "211201": 1.8,  "211210": 1.7,  "211211": 0.7,  "211220": 0.8,
    "211221": 0.2,  "212001": 5.3,  "212011": 2.4,  "212021": 1.4,
    "212101": 2.4,  "212111": 1.2,  "212121": 0.5,  "212201": 1,
    "212211": 0.3,  "212221": 0.1
};

var maxSeverityV4 = {
    "eq1": { 0: 1, 1: 4, 2: 5 },
    "eq2": { 0: 1, 1: 2 },
    "eq3eq6": { 0: { 0: 7, 1: 6 }, 1: { 0: 8, 1: 8 }, 2: { 1: 10 } },
    "eq4": { 0: 6, 1: 5, 2: 4 },
    "eq5": { 0: 1, 1: 1, 2: 1 }
};

var maxComposed = {
    "eq1": {
        0: ["AV:N/PR:N/UI:N/"],
        1: ["AV:A/PR:N/UI:N/", "AV:N/PR:L/UI:N/", "AV:N/PR:N/UI:P/"],
        2: ["AV:P/PR:N/UI:N/", "AV:A/PR:L/UI:P/"]
    },
    "eq2": {
        0: ["AC:L/AT:N/"],
        1: ["AC:H/AT:N/", "AC:L/AT:P/"]
    },
    "eq3": {
        0: { "0": ["VC:H/VI:H/VA:H/CR:H/IR:H/AR:H/"], "1": ["VC:H/VI:H/VA:L/CR:M/IR:M/AR:H/", "VC:H/VI:H/VA:H/CR:M/IR:M/AR:M/"] },
        1: { "0": ["VC:L/VI:H/VA:H/CR:H/IR:H/AR:H/", "VC:H/VI:L/VA:H/CR:H/IR:H/AR:H/"], "1": ["VC:L/VI:H/VA:L/CR:H/IR:M/AR:H/", "VC:L/VI:H/VA:H/CR:H/IR:M/AR:M/", "VC:H/VI:L/VA:H/CR:M/IR:H/AR:M/", "VC:H/VI:L/VA:L/CR:M/IR:H/AR:H/", "VC:L/VI:L/VA:H/CR:H/IR:H/AR:M/"] },
        2: { "1": ["VC:L/VI:L/VA:L/CR:H/IR:H/AR:H/"] }
    },
    "eq4": {
        0: ["SC:H/SI:S/SA:S/"],
        1: ["SC:H/SI:H/SA:H/"],
        2: ["SC:L/SI:L/SA:L/"]
    },
    "eq5": {
        0: ["E:A/"],
        1: ["E:P/"],
        2: ["E:U/"]
    }
};

// ---- CVSS v4.0 Scoring Functions ----

function cvss4_metric(cvssSelected, metric) {
    var selected = cvssSelected[metric];
    if (metric === "E" && selected === "X") return "A";
    if (metric === "CR" && selected === "X") return "H";
    if (metric === "IR" && selected === "X") return "H";
    if (metric === "AR" && selected === "X") return "H";
    if (cvssSelected.hasOwnProperty("M" + metric)) {
        var modified = cvssSelected["M" + metric];
        if (modified !== "X") return modified;
    }
    return selected;
}

function extractValueMetric(metric, str) {
    var extracted = str.slice(str.indexOf(metric) + metric.length + 1);
    var endPos = extracted.indexOf('/');
    return endPos > 0 ? extracted.substring(0, endPos) : extracted;
}

function getEQMaxes(lookup, eq) {
    return maxComposed["eq" + eq][lookup[eq - 1]];
}

function macroVector(cvssSelected) {
    var eq1 = 0, eq2 = 0, eq3 = 0, eq4 = 0, eq5 = 0, eq6 = 0;
    var AV = cvss4_metric(cvssSelected, "AV");
    var PR = cvss4_metric(cvssSelected, "PR");
    var UI = cvss4_metric(cvssSelected, "UI");
    var AC = cvss4_metric(cvssSelected, "AC");
    var AT = cvss4_metric(cvssSelected, "AT");
    var VC = cvss4_metric(cvssSelected, "VC");
    var VI = cvss4_metric(cvssSelected, "VI");
    var VA = cvss4_metric(cvssSelected, "VA");
    var SC = cvss4_metric(cvssSelected, "SC");
    var SI = cvss4_metric(cvssSelected, "SI");
    var SA = cvss4_metric(cvssSelected, "SA");
    var MSI = cvss4_metric(cvssSelected, "MSI");
    var MSA = cvss4_metric(cvssSelected, "MSA");
    var E__ = cvss4_metric(cvssSelected, "E");
    var CR = cvss4_metric(cvssSelected, "CR");
    var IR = cvss4_metric(cvssSelected, "IR");
    var AR = cvss4_metric(cvssSelected, "AR");

    // EQ1
    if (AV === "N" && PR === "N" && UI === "N") {
        eq1 = 0;
    } else if ((AV === "N" || PR === "N" || UI === "N") &&
               !(AV === "N" && PR === "N" && UI === "N") &&
               AV !== "P") {
        eq1 = 1;
    } else {
        eq1 = 2;
    }

    // EQ2
    eq2 = (AC === "L" && AT === "N") ? 0 : 1;

    // EQ3
    if (VC === "H" && VI === "H") {
        eq3 = 0;
    } else if (!(VC === "H" && VI === "H") &&
               (VC === "H" || VI === "H" || VA === "H")) {
        eq3 = 1;
    } else {
        eq3 = 2;
    }

    // EQ4
    if (MSI === "S" || MSA === "S") {
        eq4 = 0;
    } else if (!(MSI === "S" || MSA === "S") &&
               (SC === "H" || SI === "H" || SA === "H")) {
        eq4 = 1;
    } else {
        eq4 = 2;
    }

    // EQ5
    if (E__ === "A") eq5 = 0;
    else if (E__ === "P") eq5 = 1;
    else eq5 = 2;

    // EQ6
    if ((CR === "H" && VC === "H") || (IR === "H" && VI === "H") || (AR === "H" && VA === "H")) {
        eq6 = 0;
    } else {
        eq6 = 1;
    }

    return "" + eq1 + eq2 + eq3 + eq4 + eq5 + eq6;
}

function cvss4_score(cvssSelected, lookup, maxSeverityData, macroVectorResult) {
    var AV_levels = { "N": 0.0, "A": 0.1, "L": 0.2, "P": 0.3 };
    var PR_levels = { "N": 0.0, "L": 0.1, "H": 0.2 };
    var UI_levels = { "N": 0.0, "P": 0.1, "A": 0.2 };
    var AC_levels = { 'L': 0.0, 'H': 0.1 };
    var AT_levels = { 'N': 0.0, 'P': 0.1 };
    var VC_levels = { 'H': 0.0, 'L': 0.1, 'N': 0.2 };
    var VI_levels = { 'H': 0.0, 'L': 0.1, 'N': 0.2 };
    var VA_levels = { 'H': 0.0, 'L': 0.1, 'N': 0.2 };
    var SC_levels = { 'H': 0.1, 'L': 0.2, 'N': 0.3 };
    var SI_levels = { 'S': 0.0, 'H': 0.1, 'L': 0.2, 'N': 0.3 };
    var SA_levels = { 'S': 0.0, 'H': 0.1, 'L': 0.2, 'N': 0.3 };
    var CR_levels = { 'H': 0.0, 'M': 0.1, 'L': 0.2 };
    var IR_levels = { 'H': 0.0, 'M': 0.1, 'L': 0.2 };
    var AR_levels = { 'H': 0.0, 'M': 0.1, 'L': 0.2 };

    // No impact shortcut
    if (["VC","VI","VA","SC","SI","SA"].every(function(m) { return cvss4_metric(cvssSelected, m) === "N"; })) {
        return 0.0;
    }

    var value = lookup[macroVectorResult];
    if (typeof value === 'undefined') return 0.0;

    var eq1 = parseInt(macroVectorResult[0]);
    var eq2 = parseInt(macroVectorResult[1]);
    var eq3 = parseInt(macroVectorResult[2]);
    var eq4 = parseInt(macroVectorResult[3]);
    var eq5 = parseInt(macroVectorResult[4]);
    var eq6 = parseInt(macroVectorResult[5]);

    var eq1_next_lower_macro = "" + (eq1 + 1) + eq2 + eq3 + eq4 + eq5 + eq6;
    var eq2_next_lower_macro = "" + eq1 + (eq2 + 1) + eq3 + eq4 + eq5 + eq6;
    var eq3eq6_next_lower_macro = "";
    var eq3eq6_next_lower_macro_left = "";
    var eq3eq6_next_lower_macro_right = "";

    if (eq3 === 1 && eq6 === 1) {
        eq3eq6_next_lower_macro = "" + eq1 + eq2 + (eq3 + 1) + eq4 + eq5 + (eq6 + 1);
    } else if (eq3 === 0 && eq6 === 1) {
        eq3eq6_next_lower_macro = "" + eq1 + eq2 + (eq3 + 1) + eq4 + eq5 + eq6;
    } else if (eq3 === 1 && eq6 === 0) {
        eq3eq6_next_lower_macro = "" + eq1 + eq2 + eq3 + eq4 + eq5 + (eq6 + 1);
    } else if (eq3 === 0 && eq6 === 0) {
        eq3eq6_next_lower_macro_left = "" + eq1 + eq2 + eq3 + eq4 + eq5 + (eq6 + 1);
        eq3eq6_next_lower_macro_right = "" + eq1 + eq2 + (eq3 + 1) + eq4 + eq5 + eq6;
    } else {
        eq3eq6_next_lower_macro = "" + eq1 + eq2 + (eq3 + 1) + eq4 + eq5 + (eq6 + 1);
    }

    var eq4_next_lower_macro = "" + eq1 + eq2 + eq3 + (eq4 + 1) + eq5 + eq6;
    var eq5_next_lower_macro = "" + eq1 + eq2 + eq3 + eq4 + (eq5 + 1) + eq6;

    var score_eq1_next_lower = lookup[eq1_next_lower_macro];
    var score_eq2_next_lower = lookup[eq2_next_lower_macro];
    var score_eq3eq6_next_lower = NaN;

    if (eq3 === 0 && eq6 === 0) {
        var left = lookup[eq3eq6_next_lower_macro_left] || 0;
        var right = lookup[eq3eq6_next_lower_macro_right] || 0;
        score_eq3eq6_next_lower = left > right ? left : right;
    } else {
        score_eq3eq6_next_lower = lookup[eq3eq6_next_lower_macro];
    }

    var score_eq4_next_lower = lookup[eq4_next_lower_macro];
    var score_eq5_next_lower = lookup[eq5_next_lower_macro];

    var eq1_maxes = getEQMaxes(macroVectorResult, 1);
    var eq2_maxes = getEQMaxes(macroVectorResult, 2);
    var eq3_eq6_maxes = getEQMaxes(macroVectorResult, 3)[macroVectorResult[5]];
    var eq4_maxes = getEQMaxes(macroVectorResult, 4);
    var eq5_maxes = getEQMaxes(macroVectorResult, 5);

    var max_vectors = [];
    for (var a = 0; a < eq1_maxes.length; a++) {
        for (var b = 0; b < eq2_maxes.length; b++) {
            for (var c = 0; c < eq3_eq6_maxes.length; c++) {
                for (var d = 0; d < eq4_maxes.length; d++) {
                    for (var e = 0; e < eq5_maxes.length; e++) {
                        max_vectors.push(eq1_maxes[a] + eq2_maxes[b] + eq3_eq6_maxes[c] + eq4_maxes[d] + eq5_maxes[e]);
                    }
                }
            }
        }
    }

    var sd_AV = 0, sd_PR = 0, sd_UI = 0, sd_AC = 0, sd_AT = 0;
    var sd_VC = 0, sd_VI = 0, sd_VA = 0, sd_SC = 0, sd_SI = 0, sd_SA = 0;
    var sd_CR = 0, sd_IR = 0, sd_AR = 0;

    for (var i = 0; i < max_vectors.length; i++) {
        var mv = max_vectors[i];
        sd_AV = AV_levels[cvss4_metric(cvssSelected, "AV")] - AV_levels[extractValueMetric("AV", mv)];
        sd_PR = PR_levels[cvss4_metric(cvssSelected, "PR")] - PR_levels[extractValueMetric("PR", mv)];
        sd_UI = UI_levels[cvss4_metric(cvssSelected, "UI")] - UI_levels[extractValueMetric("UI", mv)];
        sd_AC = AC_levels[cvss4_metric(cvssSelected, "AC")] - AC_levels[extractValueMetric("AC", mv)];
        sd_AT = AT_levels[cvss4_metric(cvssSelected, "AT")] - AT_levels[extractValueMetric("AT", mv)];
        sd_VC = VC_levels[cvss4_metric(cvssSelected, "VC")] - VC_levels[extractValueMetric("VC", mv)];
        sd_VI = VI_levels[cvss4_metric(cvssSelected, "VI")] - VI_levels[extractValueMetric("VI", mv)];
        sd_VA = VA_levels[cvss4_metric(cvssSelected, "VA")] - VA_levels[extractValueMetric("VA", mv)];
        sd_SC = SC_levels[cvss4_metric(cvssSelected, "SC")] - SC_levels[extractValueMetric("SC", mv)];
        sd_SI = SI_levels[cvss4_metric(cvssSelected, "SI")] - SI_levels[extractValueMetric("SI", mv)];
        sd_SA = SA_levels[cvss4_metric(cvssSelected, "SA")] - SA_levels[extractValueMetric("SA", mv)];
        sd_CR = CR_levels[cvss4_metric(cvssSelected, "CR")] - CR_levels[extractValueMetric("CR", mv)];
        sd_IR = IR_levels[cvss4_metric(cvssSelected, "IR")] - IR_levels[extractValueMetric("IR", mv)];
        sd_AR = AR_levels[cvss4_metric(cvssSelected, "AR")] - AR_levels[extractValueMetric("AR", mv)];

        if ([sd_AV, sd_PR, sd_UI, sd_AC, sd_AT, sd_VC, sd_VI, sd_VA, sd_SC, sd_SI, sd_SA, sd_CR, sd_IR, sd_AR].some(function(m) { return m < 0; })) {
            continue;
        }
        break;
    }

    var csd_eq1 = sd_AV + sd_PR + sd_UI;
    var csd_eq2 = sd_AC + sd_AT;
    var csd_eq3eq6 = sd_VC + sd_VI + sd_VA + sd_CR + sd_IR + sd_AR;
    var csd_eq4 = sd_SC + sd_SI + sd_SA;
    var step = 0.1;

    var ad_eq1 = value - score_eq1_next_lower;
    var ad_eq2 = value - score_eq2_next_lower;
    var ad_eq3eq6 = value - score_eq3eq6_next_lower;
    var ad_eq4 = value - score_eq4_next_lower;
    var ad_eq5 = value - score_eq5_next_lower;

    var n_existing = 0;
    var nsv_eq1 = 0, nsv_eq2 = 0, nsv_eq3eq6 = 0, nsv_eq4 = 0, nsv_eq5 = 0;

    var maxS_eq1 = maxSeverityData["eq1"][eq1] * step;
    var maxS_eq2 = maxSeverityData["eq2"][eq2] * step;
    var maxS_eq3eq6 = maxSeverityData["eq3eq6"][eq3][eq6] * step;
    var maxS_eq4 = maxSeverityData["eq4"][eq4] * step;

    if (!isNaN(ad_eq1)) {
        n_existing++;
        nsv_eq1 = ad_eq1 * (csd_eq1 / maxS_eq1);
    }
    if (!isNaN(ad_eq2)) {
        n_existing++;
        nsv_eq2 = ad_eq2 * (csd_eq2 / maxS_eq2);
    }
    if (!isNaN(ad_eq3eq6)) {
        n_existing++;
        nsv_eq3eq6 = ad_eq3eq6 * (csd_eq3eq6 / maxS_eq3eq6);
    }
    if (!isNaN(ad_eq4)) {
        n_existing++;
        nsv_eq4 = ad_eq4 * (csd_eq4 / maxS_eq4);
    }
    if (!isNaN(ad_eq5)) {
        n_existing++;
        nsv_eq5 = 0;
    }

    var mean_dist = 0;
    if (n_existing > 0) {
        mean_dist = (nsv_eq1 + nsv_eq2 + nsv_eq3eq6 + nsv_eq4 + nsv_eq5) / n_existing;
    }

    value -= mean_dist;
    if (value < 0) value = 0.0;
    if (value > 10) value = 10.0;
    return Math.round(value * 10) / 10;
}

function cvss4_parseVector(vector) {
    var cvssSelected = {};
    var metrics = vector.split('/');
    metrics.shift(); // remove CVSS:4.0
    for (var i = 0; i < metrics.length; i++) {
        var parts = metrics[i].split(':');
        if (parts.length === 2) {
            cvssSelected[parts[0]] = parts[1];
        }
    }
    if (!("E" in cvssSelected)) cvssSelected["E"] = "X";
    if (!("CR" in cvssSelected)) cvssSelected["CR"] = "X";
    if (!("IR" in cvssSelected)) cvssSelected["IR"] = "X";
    if (!("AR" in cvssSelected)) cvssSelected["AR"] = "X";
    // Default supplemental metrics needed by macroVector EQ4
    if (!("MSI" in cvssSelected)) cvssSelected["MSI"] = "X";
    if (!("MSA" in cvssSelected)) cvssSelected["MSA"] = "X";
    // For X values in MSI/MSA, substitute from SI/SA
    if (cvssSelected["MSI"] === "X") cvssSelected["MSI"] = cvssSelected["SI"] || "N";
    if (cvssSelected["MSA"] === "X") cvssSelected["MSA"] = cvssSelected["SA"] || "N";
    return cvssSelected;
}

function cvss4_calculateBaseScore(vectorString) {
    var cvssSelected = cvss4_parseVector(vectorString);
    var macrov = macroVector(cvssSelected);
    return cvss4_score(cvssSelected, cvssLookupV4, maxSeverityV4, macrov);
}

// ---- CVSS v4.0 UI Calculator ----

var CVSS = function (id, options) {
    this.options = options;
    this.wId = id;
    var e = function (tag) { return document.createElement(tag); };

    this.bg = {
        AV: 'Attack Vector',
        AC: 'Attack Complexity',
        AT: 'Attack Requirements',
        PR: 'Privileges Required',
        UI: 'User Interaction',
        VC: 'Conf. (Vuln. System)',
        VI: 'Integ. (Vuln. System)',
        VA: 'Avail. (Vuln. System)',
        SC: 'Conf. (Sub. System)',
        SI: 'Integ. (Sub. System)',
        SA: 'Avail. (Sub. System)'
    };

    this.bm = {
        AV: {
            N: { l: 'Network', d: "<b>Worst:</b> The vulnerable component is bound to the network stack and the set of possible attackers extends beyond the other options, up to and including the entire Internet." },
            A: { l: 'Adjacent', d: "<b>Worse:</b> The vulnerable component is bound to the network stack, but the attack is limited at the protocol level to a logically adjacent topology." },
            L: { l: 'Local', d: "<b>Bad:</b> The vulnerable component is not bound to the network stack and the attacker's path is via read/write/execute capabilities." },
            P: { l: 'Physical', d: "<b>Bad:</b> The attack requires the attacker to physically touch or manipulate the vulnerable component." }
        },
        AC: {
            L: { l: 'Low', d: "<b>Worst:</b> Specialized access conditions or extenuating circumstances do not exist. An attacker can expect repeatable success." },
            H: { l: 'High', d: "<b>Bad:</b> A successful attack depends on conditions beyond the attacker's control." }
        },
        AT: {
            N: { l: 'None', d: "<b>Worst:</b> No specific conditions are required for the attacker to exploit the vulnerability successfully." },
            P: { l: 'Present', d: "<b>Bad:</b> Specific conditions must be present for the attacker to exploit the vulnerability successfully." }
        },
        PR: {
            N: { l: 'None', d: "<b>Worst:</b> The attacker is unauthorized prior to attack, and therefore does not require any access to settings or files." },
            L: { l: 'Low', d: "<b>Worse:</b> The attacker requires privileges that provide basic user capabilities." },
            H: { l: 'High', d: "<b>Bad:</b> The attacker requires privileges that provide significant (e.g., administrative) control over the vulnerable component." }
        },
        UI: {
            N: { l: 'None', d: "<b>Worst:</b> The vulnerable system can be exploited without interaction from any user." },
            P: { l: 'Passive', d: "<b>Worse:</b> Successful exploitation requires limited interaction by the user that does not require the user to actively perform an action." },
            A: { l: 'Active', d: "<b>Bad:</b> Successful exploitation requires the user to perform a specific conscious action." }
        },
        VC: {
            H: { l: 'High', d: "<b>Worst:</b> There is a total loss of confidentiality within the vulnerable component." },
            L: { l: 'Low', d: "<b>Bad:</b> There is some loss of confidentiality within the vulnerable component." },
            N: { l: 'None', d: "<b>Good:</b> There is no loss of confidentiality within the vulnerable component." }
        },
        VI: {
            H: { l: 'High', d: "<b>Worst:</b> There is a total loss of integrity within the vulnerable component." },
            L: { l: 'Low', d: "<b>Bad:</b> There is some loss of integrity within the vulnerable component." },
            N: { l: 'None', d: "<b>Good:</b> There is no loss of integrity within the vulnerable component." }
        },
        VA: {
            H: { l: 'High', d: "<b>Worst:</b> There is a total loss of availability within the vulnerable component." },
            L: { l: 'Low', d: "<b>Bad:</b> Performance is reduced or there are interruptions in resource availability." },
            N: { l: 'None', d: "<b>Good:</b> There is no impact to availability within the vulnerable component." }
        },
        SC: {
            H: { l: 'High', d: "<b>Worst:</b> There is a total loss of confidentiality within the subsequent system." },
            L: { l: 'Low', d: "<b>Bad:</b> There is some loss of confidentiality within the subsequent system." },
            N: { l: 'None', d: "<b>Good:</b> There is no loss of confidentiality within the subsequent system." }
        },
        SI: {
            H: { l: 'High', d: "<b>Worst:</b> There is a total loss of integrity within the subsequent system." },
            L: { l: 'Low', d: "<b>Bad:</b> There is some loss of integrity within the subsequent system." },
            N: { l: 'None', d: "<b>Good:</b> There is no loss of integrity within the subsequent system." }
        },
        SA: {
            H: { l: 'High', d: "<b>Worst:</b> There is a total loss of availability within the subsequent system." },
            L: { l: 'Low', d: "<b>Bad:</b> Performance is reduced or there are interruptions in resource availability." },
            N: { l: 'None', d: "<b>Good:</b> There is no impact to availability within the subsequent system." }
        }
    };

    this.bme = {};
    this.bmgReg = {
        AV: 'NALP', AC: 'LH', AT: 'NP', PR: 'NLH', UI: 'NPA',
        VC: 'HLN', VI: 'HLN', VA: 'HLN',
        SC: 'HLN', SI: 'HLN', SA: 'HLN'
    };

    var s, f, dl, g, dd, l;
    this.el = document.getElementById(id);
    this.el.appendChild(s = e('style'));
    s.innerHTML = '';
    this.el.appendChild(f = e('form'));
    f.className = 'cvssjs';
    this.calc = f;

    for (g in this.bg) {
        f.appendChild(dl = e('dl'));
        dl.setAttribute('class', g);
        var dt = e('dt');
        dt.innerHTML = this.bg[g];
        dl.appendChild(dt);
        for (s in this.bm[g]) {
            dd = e('dd');
            dl.appendChild(dd);
            var inp = e('input');
            inp.setAttribute('name', g);
            inp.setAttribute('value', s);
            inp.setAttribute('id', id + g + s);
            inp.setAttribute('class', g + s);
            inp.setAttribute('type', 'radio');
            this.bme[g + s] = inp;
            var me = this;
            inp.onchange = function () {
                me.setMetric(this);
            };
            dd.appendChild(inp);
            l = e('label');
            dd.appendChild(l);
            l.setAttribute('for', id + g + s);
            l.appendChild(e('span')).setAttribute('class', 'lv');
            l.appendChild(document.createTextNode(this.bm[g][s].l));
            dd.appendChild(e('small')).innerHTML = this.bm[g][s].d;
        }
    }

    f.appendChild(dl = e('dl'));
    dl.className = 'result';
    dl.innerHTML = '<dt>Severity \xB7 Score \xB7 Vector</dt>';
    dd = e('dd');
    dl.appendChild(dd);
    l = dd.appendChild(e('label'));
    l.className = 'results';
    l.appendChild(this.severity = e('span'));
    this.severity.className = 'severity';
    l.appendChild(this.score = e('span'));
    this.score.className = 'score';
    l.appendChild(document.createTextNode(' '));
    l.appendChild(this.vector = e('a'));
    this.vector.className = 'vector';
    this.vector.innerHTML = 'CVSS:4.0/AV:_/AC:_/AT:_/PR:_/UI:_/VC:_/VI:_/VA:_/SC:_/SI:_/SA:_';
};

CVSS.prototype.severityRatings = [
    { name: "None",    bottom: 0.0, top: 0.0 },
    { name: "Low",     bottom: 0.1, top: 3.9 },
    { name: "Medium",  bottom: 4.0, top: 6.9 },
    { name: "High",    bottom: 7.0, top: 8.9 },
    { name: "Critical",bottom: 9.0, top: 10.0 }
];

CVSS.prototype.severityRating = function (score) {
    for (var i = 0; i < this.severityRatings.length; i++) {
        if (score >= this.severityRatings[i].bottom && score <= this.severityRatings[i].top) {
            return this.severityRatings[i];
        }
    }
    return { name: "?", bottom: 'Not', top: 'defined' };
};

CVSS.prototype.valueofradio = function (e) {
    for (var i = 0; i < e.length; i++) {
        if (e[i].checked) return e[i].value;
    }
    return null;
};

CVSS.prototype.calculate = function () {
    var val = {};
    var allSet = true;
    try {
        for (var p in this.bg) {
            val[p] = this.valueofradio(this.calc.elements[p]);
            if (typeof val[p] === "undefined" || val[p] === null) {
                allSet = false;
            }
        }
    } catch (err) {
        return "?";
    }

    if (!allSet) return "?";

    var vectorString = 'CVSS:4.0';
    var sep = '/';
    var v4metrics = ['AV', 'AC', 'AT', 'PR', 'UI', 'VC', 'VI', 'VA', 'SC', 'SI', 'SA'];
    for (var i = 0; i < v4metrics.length; i++) {
        vectorString += sep + v4metrics[i] + ':' + val[v4metrics[i]];
    }

    try {
        return cvss4_calculateBaseScore(vectorString);
    } catch (err) {
        return "?";
    }
};

CVSS.prototype.get = function () {
    return {
        score: this.score.innerHTML,
        vector: this.vector.innerHTML
    };
};

CVSS.prototype.setMetric = function (a) {
    var vectorString = this.vector.innerHTML;
    var re = /AV:.\/AC:.\/AT:.\/PR:.\/UI:.\/VC:.\/VI:.\/VA:.\/SC:.\/SI:.\/SA:./;
    if (!re.test(vectorString)) {
        vectorString = 'AV:_/AC:_/AT:_/PR:_/UI:_/VC:_/VI:_/VA:_/SC:_/SI:_/SA:_';
    }
    var newVec = vectorString.replace(new RegExp('\\b' + a.name + ':.'), a.name + ':' + a.value);
    this.set(newVec);
};

CVSS.prototype.set = function (vec) {
    var newVec = 'CVSS:4.0/';
    var sep = '';
    for (var m in this.bm) {
        var match = (new RegExp('\\b(' + m + ':[' + this.bmgReg[m] + '])')).exec(vec);
        if (match !== null) {
            var check = match[0].replace(':', '');
            this.bme[check].checked = true;
            newVec = newVec + sep + match[0];
        } else {
            newVec = newVec + sep + m + ':_';
            for (var j in this.bm[m]) {
                this.bme[m + j].checked = false;
            }
        }
        sep = '/';
    }
    this.update(newVec);
};

CVSS.prototype.update = function (newVec) {
    this.vector.innerHTML = newVec;
    var s = this.calculate();
    this.score.innerHTML = s;
    var rating = this.severityRating(s);
    this.severity.className = rating.name + ' severity';
    this.severity.innerHTML = rating.name + '<sub>' + rating.bottom + ' - ' + rating.top + '</sub>';
    this.severity.title = rating.bottom + ' - ' + rating.top;
    if (this.options !== undefined && this.options.onchange !== undefined) {
        this.options.onchange();
    }
};

/*
 * Dungeon of Weights - pure puzzle logic for the "What Is AI?" dungeon.
 * No DOM here, so it can be unit-tested and tuned headlessly.
 *
 * A creature is a 6-bit mask of "threat marks". Two golems judge whether a
 * creature is hostile:
 *   - the Rule Golem uses rules a person writes (symbolic / rule-based AI)
 *   - the Learner Golem fits weights to labelled examples (machine learning)
 */
(function (root) {
    'use strict';

    var MARKS = [
        { key: 'spikes', label: 'Spikes' },
        { key: 'horns', label: 'Horns' },
        { key: 'claws', label: 'Claws' },
        { key: 'glow', label: 'Glow' },
        { key: 'scars', label: 'Scars' },
        { key: 'fangs', label: 'Fangs' }
    ];
    var N = MARKS.length;
    var ALL = 1 << N; // 64 possible creatures

    function has(mask, i) { return ((mask >> i) & 1) === 1; }

    function count(mask) {
        var c = 0;
        for (var i = 0; i < N; i++) { if (has(mask, i)) { c++; } }
        return c;
    }

    function mulberry32(a) {
        return function () {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            var t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    function shuffled(arr, rnd) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(rnd() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    function range(n) {
        var r = [];
        for (var i = 0; i < n; i++) { r.push(i); }
        return r;
    }

    /* ---------------- the hidden truths ---------------- */
    // Chamber 1: a pattern simple enough to write down.
    function ruleTruth(m) { return has(m, 0) || (has(m, 1) && has(m, 3)); } // spikes, or horns AND glow
    // Chamber 2: a fuzzy pattern ("enough threat marks") nobody wrote down.
    function countTruth(m) { return count(m) >= 3; }

    /* ---------------- hand-written rules ---------------- */
    // A rule = {a, b}: marks that must ALL be present (-1 = unused). Empty rules never fire.
    function ruleMatches(rule, m) {
        var used = false;
        if (rule.a >= 0) { if (!has(m, rule.a)) { return false; } used = true; }
        if (rule.b >= 0) { if (!has(m, rule.b)) { return false; } used = true; }
        return used;
    }

    function applyRules(rules, m) {
        for (var i = 0; i < rules.length; i++) {
            if (ruleMatches(rules[i], m)) { return true; }
        }
        return false;
    }

    /* ---------------- evaluation ---------------- */
    function evaluate(predictFn, truthFn, masks) {
        var results = [];
        var correct = 0;
        masks.forEach(function (m) {
            var t = truthFn(m);
            var p = predictFn(m);
            var ok = t === p;
            if (ok) { correct++; }
            results.push({ mask: m, truth: t, pred: p, ok: ok });
        });
        return {
            correct: correct,
            total: masks.length,
            pct: masks.length ? Math.round(100 * correct / masks.length) : 0,
            results: results
        };
    }

    /* ---------------- the learner: logistic regression ---------------- */
    function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }

    function trainLogistic(masks, labels) {
        var w = [];
        var i;
        for (i = 0; i < N; i++) { w.push(0); }
        var b = 0;
        var lr = 0.5;
        var epochs = 400;
        var l2 = 0.005;
        var n = masks.length;
        for (var e = 0; e < epochs; e++) {
            var gw = [];
            for (i = 0; i < N; i++) { gw.push(0); }
            var gb = 0;
            for (var k = 0; k < n; k++) {
                var z = b;
                for (i = 0; i < N; i++) { if (has(masks[k], i)) { z += w[i]; } }
                var err = sigmoid(z) - (labels[k] ? 1 : 0);
                for (i = 0; i < N; i++) { if (has(masks[k], i)) { gw[i] += err; } }
                gb += err;
            }
            for (i = 0; i < N; i++) { w[i] -= lr * (gw[i] / n + l2 * w[i]); }
            b -= lr * (gb / n);
        }
        return { w: w, b: b };
    }

    function predictLogistic(model, m) {
        var z = model.b;
        for (var i = 0; i < N; i++) { if (has(m, i)) { z += model.w[i]; } }
        return z > 0;
    }

    /* ---------------- baseline: best hand-written guard ---------------- */
    // Brute-force the best set of up to `maxRules` rules (each: 1-2 marks).
    function bestHandRules(testMasks, truthFn, maxRules) {
        var cand = [];
        var i;
        var j;
        for (i = 0; i < N; i++) { cand.push({ a: i, b: -1 }); }
        for (i = 0; i < N; i++) { for (j = i + 1; j < N; j++) { cand.push({ a: i, b: j }); } }
        var best = { pct: -1, rules: [] };
        function consider(rules) {
            var r = evaluate(function (m) { return applyRules(rules, m); }, truthFn, testMasks);
            if (r.pct > best.pct) { best = { pct: r.pct, rules: rules.slice() }; }
        }
        consider([]);
        for (i = 0; i < cand.length; i++) {
            consider([cand[i]]);
            if (maxRules < 2) { continue; }
            for (j = i + 1; j < cand.length; j++) {
                consider([cand[i], cand[j]]);
                if (maxRules < 3) { continue; }
                for (var k = j + 1; k < cand.length; k++) { consider([cand[i], cand[j], cand[k]]); }
            }
        }
        return best;
    }

    /* ---------------- chamber data ---------------- */
    // Chamber 1: a fixed, hand-picked bestiary that shows the pattern, plus a fresh test stream.
    var RULES_BESTIARY_MASKS = [0, 4, 16, 32, 2, 8, 6, 24, 18, 1, 5, 10, 42, 33];
    var rulesRnd = mulberry32(2024);
    // Horns+glow creatures WITHOUT spikes: the test stream must include several, so a lazy
    // "spikes only" rule is not enough and the second rule is actually needed.
    var HORNS_GLOW_NO_SPIKES = [14, 26, 30, 46, 58, 62];
    var rulesRest = range(ALL).filter(function (m) {
        return RULES_BESTIARY_MASKS.indexOf(m) < 0 && HORNS_GLOW_NO_SPIKES.indexOf(m) < 0;
    });
    var RULES_TEST = shuffled(
        shuffled(HORNS_GLOW_NO_SPIKES, rulesRnd).slice(0, 5).concat(shuffled(rulesRest, rulesRnd).slice(0, 15)),
        rulesRnd
    );

    // Chamber 2: seeded split of all 64 creatures into a bestiary (to train on) and a held-out test set.
    var learnOrder = shuffled(range(ALL), mulberry32(11));
    var LEARN_BESTIARY_MASKS = learnOrder.slice(0, 24);
    var LEARN_TEST = learnOrder.slice(24, 48);

    // Fair comparison for chamber 2: the best 3 hand-written rules a person could tune on the
    // bestiary they can SEE, then scored on creatures they have never seen (it overfits).
    var baselineCache = null;
    function handBaseline() {
        if (baselineCache) { return baselineCache; }
        var best = bestHandRules(LEARN_BESTIARY_MASKS, countTruth, 3);
        var test = evaluate(function (m) { return applyRules(best.rules, m); }, countTruth, LEARN_TEST);
        baselineCache = { trainPct: best.pct, testPct: test.pct, rules: best.rules };
        return baselineCache;
    }

    // Chamber 3: rules or learning?
    var SCENARIOS = [
        { text: 'Decide whether a year is a leap year.', answer: 'rules', why: 'There is an exact definition you can write down. Rules are perfect, and a learned model would only approximate them.' },
        { text: 'Decide whether an email is spam.', answer: 'learn', why: 'Spammers keep changing tricks and "spammy" is fuzzy. It is far easier to learn patterns from thousands of labelled emails.' },
        { text: 'Add the right sales tax to a purchase.', answer: 'rules', why: 'The tax rate is a known number. You want the exact same answer every time, and you can explain it.' },
        { text: 'Recognise a cat in a photo.', answer: 'learn', why: 'Nobody can write rules for every cat in every pose and light. Learning from many labelled photos works.' },
        { text: 'Switch the heating on when it is colder than 18 degrees.', answer: 'rules', why: 'A single clear threshold. A learned model would add complexity and risk for no benefit.' },
        { text: 'Suggest the next song someone will enjoy.', answer: 'learn', why: 'Taste is fuzzy and personal. Patterns in what people actually listened to beat hand-written rules.' }
    ];

    var api = {
        MARKS: MARKS,
        N: N,
        ALL: ALL,
        has: has,
        count: count,
        mulberry32: mulberry32,
        shuffled: shuffled,
        ruleTruth: ruleTruth,
        countTruth: countTruth,
        ruleMatches: ruleMatches,
        applyRules: applyRules,
        evaluate: evaluate,
        trainLogistic: trainLogistic,
        predictLogistic: predictLogistic,
        bestHandRules: bestHandRules,
        handBaseline: handBaseline,
        RULES_BESTIARY_MASKS: RULES_BESTIARY_MASKS,
        RULES_TEST: RULES_TEST,
        LEARN_BESTIARY_MASKS: LEARN_BESTIARY_MASKS,
        LEARN_TEST: LEARN_TEST,
        SCENARIOS: SCENARIOS,
        PASS_PCT: 85,
        LEARN_MIN_PICK: 4,
        LEARN_MAX_PICK: 16,
        QUIZ_PASS: 5
    };

    if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
    root.Puzzles = api;
})(typeof window !== 'undefined' ? window : globalThis);

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

    /* ================================================================ */
    /* Dungeon 2: Kinds of Models                                        */
    /* ================================================================ */
    var KINDS = [
        { id: 'classifier', label: 'Classifier', desc: 'puts things into labelled boxes' },
        { id: 'predictor', label: 'Predictor', desc: 'forecasts a number' },
        { id: 'generator', label: 'Generator', desc: 'creates new text, images or audio' },
        { id: 'recommender', label: 'Recommender', desc: 'suggests what you will like next' },
        { id: 'agent', label: 'Agent', desc: 'uses tools to act toward a goal' }
    ];

    var SORTING_JOBS = [
        { text: 'Decide whether a photo shows a dog or a cat.', answer: 'classifier', why: 'It picks one label from a fixed set of boxes.' },
        { text: 'Forecast next month\'s electricity use.', answer: 'predictor', why: 'The output is a number, not a label and not new content.' },
        { text: 'Write a friendly product description.', answer: 'generator', why: 'It creates new text that did not exist before. Large language models are generators.' },
        { text: 'Suggest the next show someone will enjoy.', answer: 'recommender', why: 'It ranks items by what this particular person is likely to enjoy.' },
        { text: 'Research a topic on the web, then email a summary.', answer: 'agent', why: 'It has to choose and use tools (search, email) over several steps toward a goal.' },
        { text: 'Flag a bank transfer as fraud or not fraud.', answer: 'classifier', why: 'Two labels: fraud or not fraud.' },
        { text: 'Paint a logo from the words "a cat in a space helmet".', answer: 'generator', why: 'It creates a brand-new image from a text description.' },
        { text: 'Estimate a house price from its size and location.', answer: 'predictor', why: 'It estimates a number from inputs. This is often called regression.' }
    ];

    // Token Mill: "you are the language model". Odds are made up for the game.
    var TOKEN_PROMPTS = [
        {
            start: 'The capital of France is',
            steps: [
                [{ t: ' Paris', p: 90 }, { t: ' a', p: 4 }, { t: ' the', p: 3 }, { t: ' Lyon', p: 2 }, { t: ' Berlin', p: 1 }],
                [{ t: '.', p: 84 }, { t: ',', p: 9 }, { t: ' and', p: 5 }, { t: ' known', p: 2 }]
            ],
            note: 'A famous fact, so one token dominates. The model is confident, and here it happens to be right.'
        },
        {
            start: 'The capital of Australia is',
            steps: [
                [{ t: ' Sydney', p: 46, wrong: true }, { t: ' Canberra', p: 41 }, { t: ' Melbourne', p: 9 }, { t: ' a', p: 4 }],
                [{ t: '.', p: 80 }, { t: ',', p: 12 }, { t: ' and', p: 6 }, { t: ' where', p: 2 }]
            ],
            note: 'The most likely token is not the true one. The model fluently continues with what sounds right. Real models are better at famous facts, but they fail the same way on rarer ones.'
        }
    ];

    var TOKEN_QUESTIONS = [
        {
            text: 'What does a language model produce, one piece at a time?',
            options: [{ id: 'a', label: 'Facts it looked up' }, { id: 'b', label: 'Tokens chosen by probability' }, { id: 'c', label: 'Whole answers it stored' }],
            answer: 'b',
            why: 'It builds text one token at a time, picking each from a probability distribution over what could come next.'
        },
        {
            text: 'Why can a model state something false and sound completely sure?',
            options: [{ id: 'a', label: 'Likely text is not the same as true text' }, { id: 'b', label: 'It lies on purpose' }, { id: 'c', label: 'Its database is only out of date' }],
            answer: 'a',
            why: 'It was trained to produce likely text, not verified facts. That is the root of hallucination. Check important claims, or give the model a source.'
        }
    ];

    // Agent's Workshop: give each task only the tools it needs.
    var TOOLS = [
        { id: 'search', label: 'Web search' },
        { id: 'calc', label: 'Calculator' },
        { id: 'files', label: 'File reader' },
        { id: 'email', label: 'Email sender' }
    ];
    var AGENT_TASKS = [
        { text: 'What was a stock\'s closing price yesterday?', needs: ['search'], why: 'A model\'s knowledge stops at its training date. Fresh facts need a search tool.' },
        { text: 'Multiply 48,213 by 7,919 exactly.', needs: ['calc'], why: 'Models predict likely digits. They do not calculate. A calculator is exact.' },
        { text: 'Summarise the attached five-page report.', needs: ['files'], why: 'It must be able to open the file, and nothing more.' },
        { text: 'Write a haiku about autumn.', needs: [], why: 'Pure text generation. Every extra tool adds cost and attack surface, because a tool can be abused through prompt injection.' }
    ];

    function evaluateTools(task, chosen) {
        var missing = task.needs.filter(function (t) { return chosen.indexOf(t) < 0; });
        var extra = chosen.filter(function (t) { return task.needs.indexOf(t) < 0; });
        return { ok: missing.length === 0 && extra.length === 0, missing: missing, extra: extra };
    }

    /* ================================================================ */
    /* Dungeon 3: Local vs Cloud                                         */
    /* ================================================================ */
    // Rough, illustrative numbers: "quality" is a made-up 0-10 score.
    var PACK_OPTIONS = [
        { id: '3b-q4', label: '3B model, quantized (Q4)', gb: 2, quality: 3.5 },
        { id: '3b-fp16', label: '3B model, full precision', gb: 6, quality: 4 },
        { id: '7b-q4', label: '7B model, quantized (Q4)', gb: 4, quality: 6 },
        { id: '7b-fp16', label: '7B model, full precision', gb: 14, quality: 7 },
        { id: '13b-q4', label: '13B model, quantized (Q4)', gb: 8, quality: 8 },
        { id: '13b-fp16', label: '13B model, full precision', gb: 26, quality: 8.5 },
        { id: '70b-q4', label: '70B model, quantized (Q4)', gb: 40, quality: 9.5 }
    ];
    var PACK_ROUNDS = [
        { budget: 4, machine: 'a small laptop GPU with 4 GB of memory' },
        { budget: 8, machine: 'a gaming GPU with 8 GB of memory' },
        { budget: 48, machine: 'a workstation with 48 GB of memory' }
    ];

    function bestPack(budget) {
        var best = null;
        PACK_OPTIONS.forEach(function (o) {
            if (o.gb <= budget && (!best || o.quality > best.quality)) { best = o; }
        });
        return best;
    }

    var DATA_GATE = [
        { text: 'Analyse a client\'s confidential source code under NDA.', answer: 'local', why: 'The code never leaves your machine. Sending it to a third party may break the NDA.' },
        { text: 'Draft an outline for a public blog post.', answer: 'cloud', why: 'Nothing sensitive, and a strong cloud model needs no hardware from you.' },
        { text: 'Summarise patient health records.', answer: 'local', why: 'Health data is heavily regulated. Keeping it on your own systems is far easier to defend.' },
        { text: 'Get help with a document on a flight with no internet.', answer: 'local', why: 'A local model works fully offline. A cloud model needs a connection.' },
        { text: 'Tackle a hard multi-step research problem that needs the strongest model available.', answer: 'cloud', why: 'The largest frontier models are far bigger than any hardware you own.' },
        { text: 'Quietly process 10 million short log lines a day, cheaply.', answer: 'local', why: 'At very high volume a fixed local cost beats paying per token. The next room shows why.' }
    ];

    // Toll Booth: illustrative prices. Cloud is pay-per-use, local is a fixed monthly cost.
    var TOLL = {
        cloudPerRequest: 0.002,   // about 2,000 tokens at $1 per million
        localMonthly: 40,         // hardware (spread over time) plus power
        daysPerMonth: 30,
        sliderMax: 3000,
        sliderStep: 50
    };
    function tollCosts(requestsPerDay) {
        var cloud = requestsPerDay * TOLL.daysPerMonth * TOLL.cloudPerRequest;
        var local = TOLL.localMonthly;
        return { cloud: cloud, local: local, cheaper: cloud < local ? 'cloud' : (cloud > local ? 'local' : 'same') };
    }
    function breakEvenPerDay() { return TOLL.localMonthly / (TOLL.daysPerMonth * TOLL.cloudPerRequest); }
    var TOLL_QUESTIONS = [
        { text: 'At 100 requests a day, which is cheaper per month?', answer: 'cloud', why: 'About $6 on the cloud against a fixed $40 for local. At low volume, paying per use wins.' },
        { text: 'At 2,000 requests a day, which is cheaper per month?', answer: 'local', why: 'About $120 on the cloud against the same fixed $40 locally. At high volume, the fixed cost wins.' }
    ];

    /* ================================================================ */
    /* Dungeon 4: Under the Hood                                         */
    /* ================================================================ */

    // ---- Chamber 1: Speed Run (tokens per second). Illustrative numbers. ----
    var SPEED_SETUPS = [
        { id: 'a', label: '7B quantized on a GPU', tps: 60, ttft: 0.3, local: true },
        { id: 'b', label: '7B quantized, CPU only', tps: 8, ttft: 2, local: true },
        { id: 'c', label: '70B quantized on a big GPU', tps: 15, ttft: 1.5, local: true },
        { id: 'd', label: '13B full precision on a GPU', tps: 25, ttft: 0.8, local: true },
        { id: 'e', label: 'Cloud frontier model (API)', tps: 80, ttft: 0.6, local: false }
    ];
    var SPEED_JOBS = [
        { text: 'Live chat: a 300-token reply must be complete within 10 seconds.', tokens: 300, maxTotal: 10, maxFirst: null, needLocal: false },
        { text: 'Voice assistant: the first words must start within 1 second. Replies are short (50 tokens).', tokens: 50, maxTotal: null, maxFirst: 1, needLocal: false },
        { text: 'Overnight batch: 2,000 documents x 400 tokens (800,000 tokens) must finish within 8 hours, and it has to stay offline.', tokens: 800000, maxTotal: 8 * 3600, maxFirst: null, needLocal: true }
    ];
    function speedResult(setup, job) {
        var total = setup.ttft + job.tokens / setup.tps;
        var reasons = [];
        if (job.maxTotal !== null && total > job.maxTotal) { reasons.push('total time ' + total + ' is over the limit'); }
        if (job.maxFirst !== null && setup.ttft > job.maxFirst) { reasons.push('first token is too slow'); }
        if (job.needLocal && !setup.local) { reasons.push('it is not local'); }
        return { total: total, first: setup.ttft, ok: reasons.length === 0, reasons: reasons };
    }

    // ---- Chamber 2: The Cache Vault (prompt/prefix caching + KV cache) ----
    var CACHE_BLOCKS = [
        { id: 'system', label: 'System prompt', tokens: 1500, changes: false, note: 'same on every request' },
        { id: 'tools', label: 'Tool definitions', tokens: 800, changes: false, note: 'same on every request' },
        { id: 'doc', label: 'Reference document', tokens: 4000, changes: false, note: 'same document all session' },
        { id: 'time', label: 'Current timestamp', tokens: 20, changes: true, note: 'different every request' },
        { id: 'question', label: 'User\'s new question', tokens: 100, changes: true, note: 'different every request' }
    ];
    var CACHE_START_ORDER = ['time', 'question', 'system', 'tools', 'doc'];
    var CACHE_PASS_PCT = 95;
    var CACHED_PRICE = 0.1; // cached tokens cost about 10% of normal (illustrative)

    function cacheBlock(id) { return CACHE_BLOCKS.filter(function (b) { return b.id === id; })[0]; }

    // A prompt cache can only reuse an identical PREFIX: once one block changes,
    // everything after it has to be processed again.
    function cacheReuse(order) {
        var reused = 0;
        var total = 0;
        var broken = false;
        order.forEach(function (id) {
            var b = cacheBlock(id);
            total += b.tokens;
            if (!broken && !b.changes) { reused += b.tokens; } else { broken = true; }
        });
        var costPct = Math.round(100 * (reused * CACHED_PRICE + (total - reused)) / total);
        return { reused: reused, total: total, pct: Math.round(100 * reused / total), costPct: costPct };
    }

    var CACHE_QUESTIONS = [
        {
            text: 'Why does a very long chat use more memory and get slower?',
            options: [{ id: 'a', label: 'The KV cache grows with every token' }, { id: 'b', label: 'The model forgets how to read' }, { id: 'c', label: 'The GPU gets tired' }],
            answer: 'a',
            why: 'The model keeps stored keys and values for every token in the context. That KV cache grows with the context length, which is why a larger context window (num_ctx) needs more memory.'
        },
        {
            text: 'You edit one line at the very start of a long prompt. What happens to the prompt cache?',
            options: [{ id: 'a', label: 'Everything after that line is reprocessed' }, { id: 'b', label: 'Nothing, the cache is unaffected' }, { id: 'c', label: 'Only that one line is reprocessed' }],
            answer: 'a',
            why: 'A prompt cache matches an identical prefix. A change near the start invalidates everything after it. Put stable content first and changing content last.'
        }
    ];

    // ---- Chamber 3: The Guardrail Gate (normal vs uncensored) ----
    var GUARD_PRIMER = [
        { label: 'Normal (aligned) model:', desc: 'trained to refuse clearly harmful requests and to behave safely by default.' },
        { label: 'Uncensored model:', desc: 'a variant with that refusal behaviour reduced or removed. It is not smarter or more accurate, only less likely to say no.' },
        { label: 'Guardrails also live outside the model:', desc: 'system prompts, input and output filters, permissions. Removing the model\'s own refusals makes these outer layers matter more.' }
    ];
    var GUARD_SCENARIOS = [
        { text: 'A public chatbot on your company\'s website.', answer: 'normal', why: 'Anyone can type anything, including attempts to misuse it. Built-in refusals are a first line of defence, and you still add guardrails around the model.' },
        { text: 'A homework helper used by children.', answer: 'normal', why: 'The people using it need protection, so keep the safety training inside the model.' },
        { text: 'A bank\'s customer-support assistant.', answer: 'normal', why: 'A regulated setting where a harmful or wrong answer is costly. You want alignment plus filters, logging and limits.' },
        { text: 'Brainstorming dark themes for a crime novel on your own laptop, where a normal model keeps refusing harmless fiction.', answer: 'uncensored', why: 'Over-refusal is the problem here. You are the only audience and you accept the responsibility, but note there is no safety net.' },
        { text: 'An isolated security lab where analysts study malware and write detection rules on an air-gapped machine.', answer: 'uncensored', why: 'Normal models often refuse legitimate defensive research. In an isolated, controlled setting with trained users, a less restricted local model can be justified. The environment becomes the guardrail.' },
        { text: 'A medical-information assistant for patients.', answer: 'normal', why: 'People may rely on the answers, so you want cautious behaviour and safe defaults.' }
    ];

    var api = {
        SPEED_SETUPS: SPEED_SETUPS,
        SPEED_JOBS: SPEED_JOBS,
        speedResult: speedResult,
        CACHE_BLOCKS: CACHE_BLOCKS,
        CACHE_START_ORDER: CACHE_START_ORDER,
        CACHE_PASS_PCT: CACHE_PASS_PCT,
        cacheBlock: cacheBlock,
        cacheReuse: cacheReuse,
        CACHE_QUESTIONS: CACHE_QUESTIONS,
        GUARD_PRIMER: GUARD_PRIMER,
        GUARD_SCENARIOS: GUARD_SCENARIOS,
        KINDS: KINDS,
        SORTING_JOBS: SORTING_JOBS,
        TOKEN_PROMPTS: TOKEN_PROMPTS,
        TOKEN_QUESTIONS: TOKEN_QUESTIONS,
        TOOLS: TOOLS,
        AGENT_TASKS: AGENT_TASKS,
        evaluateTools: evaluateTools,
        PACK_OPTIONS: PACK_OPTIONS,
        PACK_ROUNDS: PACK_ROUNDS,
        bestPack: bestPack,
        DATA_GATE: DATA_GATE,
        TOLL: TOLL,
        tollCosts: tollCosts,
        breakEvenPerDay: breakEvenPerDay,
        TOLL_QUESTIONS: TOLL_QUESTIONS,
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

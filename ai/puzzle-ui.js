/*
 * Dungeon of Weights - puzzle panels for the "What Is AI?" dungeon.
 * Pure DOM (no libraries). Logic lives in puzzles.js.
 *
 *   PuzzleUI.open('rules' | 'learn' | 'vault', hostElement, { onSolved, onClose })
 *   PuzzleUI.close()
 */
(function (root) {
    'use strict';

    var P = root.Puzzles;
    var current = null; // { host, cb }

    // i18n: English text is the key. Falls back to plain English (with placeholders filled) if i18n.js is absent.
    var tr = (root.I18n && root.I18n.t) || function (key, vars) {
        return vars ? key.replace(/\{(\w+)\}/g, function (m, n) { return vars[n] !== undefined ? vars[n] : m; }) : key;
    };

    /* ---------------------------------------------------------------- */
    /* tiny DOM helpers                                                  */
    /* ---------------------------------------------------------------- */
    function h(tag, props, kids) {
        var e = document.createElement(tag);
        props = props || {};
        Object.keys(props).forEach(function (k) {
            var v = props[k];
            // text/html/aria-label are looked up in the dictionary. raw/rawHtml/ariaRaw/titleRaw are already translated.
            if (k === 'class') { e.className = v; }
            else if (k === 'text') { e.textContent = tr(v); }
            else if (k === 'raw') { e.textContent = v; }
            else if (k === 'html') { e.innerHTML = tr(v); } // only ever used with my own constant strings
            else if (k === 'rawHtml') { e.innerHTML = v; }
            else if (k === 'aria-label') { e.setAttribute('aria-label', tr(v)); }
            else if (k === 'ariaRaw') { e.setAttribute('aria-label', v); }
            else if (k === 'titleRaw') { e.setAttribute('title', v); }
            else if (k === 'on') { Object.keys(v).forEach(function (ev) { e.addEventListener(ev, v[ev]); }); }
            else { e.setAttribute(k, v); }
        });
        (kids || []).forEach(function (c) {
            if (c === null || c === undefined) { return; }
            e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
        });
        return e;
    }

    function clear(node) { node.textContent = ''; }

    function markNames(mask) {
        var names = [];
        P.MARKS.forEach(function (m, i) { if (P.has(mask, i)) { names.push(m.label.toLowerCase()); } });
        return names.length ? names.join(', ') : tr('no marks');
    }

    /* ---------------------------------------------------------------- */
    /* creature art (16x16, drawn in code)                               */
    /* ---------------------------------------------------------------- */
    function drawCreature(canvas, mask) {
        canvas.width = 16;
        canvas.height = 16;
        var g = canvas.getContext('2d');
        g.clearRect(0, 0, 16, 16);
        var has = function (i) { return P.has(mask, i); };

        if (has(3)) { // glow
            g.fillStyle = 'rgba(255, 209, 102, 0.40)';
            g.fillRect(2, 4, 12, 11);
            g.fillRect(3, 3, 10, 1);
            g.fillRect(3, 15, 10, 1);
        }
        // body
        g.fillStyle = '#6bcf8f';
        g.fillRect(4, 6, 8, 7);
        g.fillRect(5, 5, 6, 1);
        g.fillRect(5, 13, 6, 1);
        g.fillStyle = '#46a56b';
        g.fillRect(4, 12, 8, 1);
        // eyes
        g.fillStyle = '#1b1230';
        g.fillRect(6, 8, 1, 2);
        g.fillRect(9, 8, 1, 2);

        if (has(0)) { // spikes
            g.fillStyle = '#d9d9e8';
            [[5, 3], [8, 2], [10, 3]].forEach(function (p) { g.fillRect(p[0], p[1], 1, 3); });
        }
        if (has(1)) { // horns
            g.fillStyle = '#f2c9a0';
            g.fillRect(4, 3, 1, 3); g.fillRect(3, 2, 1, 2);
            g.fillRect(11, 3, 1, 3); g.fillRect(12, 2, 1, 2);
        }
        if (has(2)) { // claws
            g.fillStyle = '#ffffff';
            g.fillRect(3, 11, 1, 3); g.fillRect(12, 11, 1, 3);
            g.fillRect(2, 13, 1, 1); g.fillRect(13, 13, 1, 1);
        }
        if (has(4)) { // scars
            g.fillStyle = '#ef476f';
            g.fillRect(10, 10, 1, 1); g.fillRect(9, 11, 1, 1); g.fillRect(8, 12, 1, 1);
        }
        if (has(5)) { // fangs
            g.fillStyle = '#1b1230';
            g.fillRect(6, 11, 4, 1);
            g.fillStyle = '#ffffff';
            g.fillRect(6, 12, 1, 1); g.fillRect(9, 12, 1, 1);
        }
    }

    // A creature "card": art + optional chip ('hostile' | 'friendly') + optional state class.
    function creatureCard(mask, opts) {
        opts = opts || {};
        var canvas = h('canvas', { class: 'cr-canvas', 'aria-hidden': 'true' });
        drawCreature(canvas, mask);
        var kids = [canvas];
        if (opts.label) {
            kids.push(h('span', { class: 'chip ' + (opts.label === 'hostile' ? 'chip-bad' : 'chip-ok'), text: opts.label === 'hostile' ? 'Hostile' : 'Friendly' }));
        }
        if (opts.note) { kids.push(h('span', { class: 'cr-note', text: opts.note })); }
        var tag = opts.button ? 'button' : 'div';
        var props = { class: 'cr ' + (opts.cls || ''), titleRaw: markNames(mask) };
        if (opts.button) { props.type = 'button'; props['aria-pressed'] = opts.pressed ? 'true' : 'false'; }
        var card = h(tag, props, kids);
        if (opts.onClick) { card.addEventListener('click', opts.onClick); }
        return card;
    }

    function panelFrame(title, intro, cb) {
        var head = h('div', { class: 'puz-head' }, [
            h('h2', { text: title }),
            h('button', { class: 'ghost', type: 'button', text: 'Leave (Esc)', on: { click: function () { api.close(); } } })
        ]);
        var wrap = h('div', { class: 'puz' }, [head, h('p', { class: 'puz-intro', rawHtml: intro })]);
        return wrap;
    }

    function openDoorButton(cb) {
        return h('button', { class: 'go', type: 'button', text: 'Open the door', on: { click: function () { cb.onSolved(); } } });
    }

    /* ---------------------------------------------------------------- */
    /* Chamber 1: the Rule Golem                                         */
    /* ---------------------------------------------------------------- */
    function buildRules(host, cb) {
        var rules = [{ a: -1, b: -1 }];
        var MAX_RULES = 3;

        var wrap = panelFrame('The Rule Golem',
            tr('This golem follows <b>rules a person wrote</b>. Study the labelled creatures in the bestiary, then write up to three rules. A rule fires when a creature has <b>all</b> the marks you pick. Anything no rule catches is called friendly. Score {pct}% or more on 20 new arrivals and it steps aside.', { pct: P.PASS_PCT }), cb);

        var bestiary = h('div', { class: 'cr-grid' });
        P.RULES_BESTIARY_MASKS.forEach(function (m) {
            bestiary.appendChild(creatureCard(m, { label: P.ruleTruth(m) ? 'hostile' : 'friendly' }));
        });

        var rulesBox = h('div', { class: 'rules-list' });
        var addBtn = h('button', { class: 'ghost', type: 'button', text: '+ Add rule' });
        var result = h('div', { class: 'puz-result', 'aria-live': 'polite' });

        function markSelect(value, onChange) {
            var sel = h('select', { 'aria-label': 'Mark' });
            sel.appendChild(h('option', { value: '-1', text: '(nothing)' }));
            P.MARKS.forEach(function (m, i) { sel.appendChild(h('option', { value: String(i), text: m.label })); });
            sel.value = String(value);
            sel.addEventListener('change', function () { onChange(parseInt(sel.value, 10)); });
            return sel;
        }

        function renderRules() {
            clear(rulesBox);
            rules.forEach(function (rule, idx) {
                var row = h('div', { class: 'rule-row' }, [
                    h('span', { text: 'IF it has' }),
                    markSelect(rule.a, function (v) { rule.a = v; }),
                    h('span', { text: 'AND' }),
                    markSelect(rule.b, function (v) { rule.b = v; }),
                    h('span', { class: 'then', text: '→ hostile' })
                ]);
                if (rules.length > 1) {
                    row.appendChild(h('button', { class: 'ghost small', type: 'button', 'aria-label': 'Remove rule', text: '×', on: { click: function () { rules.splice(idx, 1); renderRules(); } } }));
                }
                rulesBox.appendChild(row);
            });
            addBtn.disabled = rules.length >= MAX_RULES;
        }

        addBtn.addEventListener('click', function () {
            if (rules.length < MAX_RULES) { rules.push({ a: -1, b: -1 }); renderRules(); }
        });

        function runTest() {
            var r = P.evaluate(function (m) { return P.applyRules(rules, m); }, P.ruleTruth, P.RULES_TEST);
            var missed = r.results.filter(function (x) { return x.truth && !x.pred; }).length;
            var alarms = r.results.filter(function (x) { return !x.truth && x.pred; }).length;
            clear(result);
            result.appendChild(h('p', { class: 'score ' + (r.pct >= P.PASS_PCT ? 'good' : 'bad'), raw: tr('{correct} / {total} correct ({pct}%)', { correct: r.correct, total: r.total, pct: r.pct }) }));
            var grid = h('div', { class: 'cr-grid small' });
            r.results.forEach(function (x) {
                grid.appendChild(creatureCard(x.mask, {
                    cls: x.ok ? 'ok' : 'wrong',
                    note: x.ok ? '✓' : (x.truth ? 'missed' : 'false alarm')
                }));
            });
            result.appendChild(grid);
            if (r.pct >= P.PASS_PCT) {
                result.appendChild(h('p', { text: 'The golem steps aside. Your rules cover the pattern.' }));
                result.appendChild(openDoorButton(cb));
            } else {
                result.appendChild(h('p', { raw: tr('Hostile creatures missed: {missed}. False alarms raised: {alarms}. Look at the creatures it got wrong. What do they have in common?', { missed: missed, alarms: alarms }) }));
            }
        }

        var right = h('div', { class: 'puz-col' }, [
            h('h3', { text: 'Your rules' }),
            rulesBox,
            h('div', { class: 'rule-actions' }, [
                addBtn,
                h('span', { class: 'small', text: 'Otherwise: friendly' })
            ]),
            h('button', { class: 'go', type: 'button', text: 'Test on 20 new arrivals', on: { click: runTest } }),
            result
        ]);
        var left = h('div', { class: 'puz-col' }, [
            h('h3', { text: 'Bestiary (labelled by the elders)' }),
            bestiary,
            h('p', { class: 'small', text: 'Hover a creature to see its marks.' })
        ]);
        wrap.appendChild(h('div', { class: 'puz-grid' }, [left, right]));
        renderRules();
        host.appendChild(wrap);
    }

    /* ---------------------------------------------------------------- */
    /* Chamber 2: the Learner Golem                                      */
    /* ---------------------------------------------------------------- */
    function buildLearn(host, cb) {
        var picked = {}; // mask -> true
        var attempts = [];

        function pickedList() { return Object.keys(picked).map(Number); }

        var wrap = panelFrame('The Learner Golem',
            tr('Nobody wrote a rule for this golem. Instead it will <b>learn from examples</b>: pick between {min} and {max} labelled creatures and it adjusts its internal <b>weights</b> to fit them. Then it faces 24 creatures it has never seen. Reach {pct}% to pass.', { min: P.LEARN_MIN_PICK, max: P.LEARN_MAX_PICK, pct: P.PASS_PCT }), cb);

        var counter = h('p', { class: 'small' });
        var bestiary = h('div', { class: 'cr-grid' });
        var trainBtn = h('button', { class: 'go', type: 'button', text: 'Train the golem' });
        var result = h('div', { class: 'puz-result', 'aria-live': 'polite' });

        function refreshPicks() {
            var n = pickedList().length;
            counter.textContent = tr('Selected {n} / {max}  (needs at least {min})', { n: n, max: P.LEARN_MAX_PICK, min: P.LEARN_MIN_PICK });
            trainBtn.disabled = n < P.LEARN_MIN_PICK;
            Array.prototype.forEach.call(bestiary.children, function (card) {
                var on = card.getAttribute('data-picked') === '1';
                card.className = 'cr ' + (on ? 'picked' : '');
                card.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
        }

        function setCardPicked(card, mask, on) {
            card.setAttribute('data-picked', on ? '1' : '0');
            if (on) { picked[mask] = true; } else { delete picked[mask]; }
        }

        var cards = [];
        P.LEARN_BESTIARY_MASKS.forEach(function (m) {
            var card = creatureCard(m, {
                label: P.countTruth(m) ? 'hostile' : 'friendly',
                button: true,
                pressed: false
            });
            card.setAttribute('data-picked', '0');
            card.addEventListener('click', function () {
                var on = card.getAttribute('data-picked') === '1';
                if (!on && pickedList().length >= P.LEARN_MAX_PICK) { return; }
                setCardPicked(card, m, !on);
                refreshPicks();
            });
            cards.push({ card: card, mask: m });
            bestiary.appendChild(card);
        });

        function pickRandom() {
            var order = P.shuffled(P.LEARN_BESTIARY_MASKS, Math.random).slice(0, 12);
            cards.forEach(function (c) { setCardPicked(c.card, c.mask, order.indexOf(c.mask) >= 0); });
            refreshPicks();
        }

        function clearPicks() {
            cards.forEach(function (c) { setCardPicked(c.card, c.mask, false); });
            refreshPicks();
        }

        function weightBars(model) {
            var maxAbs = 0.001;
            model.w.forEach(function (w) { maxAbs = Math.max(maxAbs, Math.abs(w)); });
            var box = h('div', { class: 'weights' });
            P.MARKS.forEach(function (m, i) {
                var w = model.w[i];
                var pct = Math.round(Math.abs(w) / maxAbs * 100);
                var fill = h('div', { class: 'w-fill ' + (w >= 0 ? 'pos' : 'neg') });
                fill.style.width = pct + '%';
                box.appendChild(h('div', { class: 'w-row' }, [
                    h('span', { class: 'w-name', text: m.label }),
                    h('div', { class: 'w-track' }, [fill]),
                    h('span', { class: 'w-val', text: (w >= 0 ? '+' : '') + w.toFixed(1) })
                ]));
            });
            return box;
        }

        function train() {
            var masks = pickedList();
            if (masks.length < P.LEARN_MIN_PICK) { return; }
            var labels = masks.map(P.countTruth);
            var model = P.trainLogistic(masks, labels);
            var r = P.evaluate(function (m) { return P.predictLogistic(model, m); }, P.countTruth, P.LEARN_TEST);
            attempts.push({ n: masks.length, pct: r.pct });
            var base = P.handBaseline();

            clear(result);
            result.appendChild(h('p', { class: 'score ' + (r.pct >= P.PASS_PCT ? 'good' : 'bad'), raw: tr('On 24 unseen creatures: {correct} correct ({pct}%)', { correct: r.correct, pct: r.pct }) }));
            result.appendChild(h('h3', { text: 'What the golem learned (its weights)' }));
            result.appendChild(weightBars(model));
            result.appendChild(h('p', { class: 'small', text: 'A bigger positive weight means that mark pushes the golem toward "hostile". Nobody typed these in. They were fitted to your examples.' }));

            var grid = h('div', { class: 'cr-grid small' });
            r.results.forEach(function (x) {
                grid.appendChild(creatureCard(x.mask, { cls: x.ok ? 'ok' : 'wrong', note: x.ok ? '✓' : (x.truth ? 'missed' : 'false alarm') }));
            });
            result.appendChild(grid);

            result.appendChild(h('p', { class: 'compare', rawHtml: tr('<b>Compare:</b> the best three hand-written rules, tuned on this same bestiary, score <b>{train}%</b> on it, but only <b>{test}%</b> on creatures they have never seen. Rules fitted by hand to known cases tend to break on new ones.', { train: base.trainPct, test: base.testPct }) }));

            var hist = h('ul', { class: 'attempts' });
            attempts.forEach(function (a, i) {
                hist.appendChild(h('li', { raw: tr('Attempt {i}: trained on {n} examples → {pct}%', { i: i + 1, n: a.n, pct: a.pct }) }));
            });
            result.appendChild(hist);

            if (r.pct >= P.PASS_PCT) {
                result.appendChild(h('p', { text: 'The golem generalises well enough. It found the pattern from examples alone.' }));
                result.appendChild(openDoorButton(cb));
            } else {
                var tip = masks.length < 10
                    ? 'More examples usually help. Try training on more of them.'
                    : 'Variety matters, not only quantity. Make sure you include both hostile and friendly creatures with different marks.';
                result.appendChild(h('p', { text: tip }));
            }
        }

        trainBtn.addEventListener('click', train);

        var left = h('div', { class: 'puz-col' }, [
            h('h3', { text: 'Bestiary: pick training examples' }),
            counter,
            bestiary,
            h('div', { class: 'rule-actions' }, [
                h('button', { class: 'ghost', type: 'button', text: 'Pick 12 at random', on: { click: pickRandom } }),
                h('button', { class: 'ghost', type: 'button', text: 'Clear', on: { click: clearPicks } })
            ])
        ]);
        var right = h('div', { class: 'puz-col' }, [
            h('h3', { text: 'Train and test' }),
            trainBtn,
            result
        ]);
        wrap.appendChild(h('div', { class: 'puz-grid' }, [left, right]));
        host.appendChild(wrap);
        refreshPicks();
    }

    /* ---------------------------------------------------------------- */
    /* Generic multiple-choice quiz (vault, sorting gate, data gate...)  */
    /*   cfg: { options:[{id,label}], items:[{text, answer, why,         */
    /*          options?}], pass, passMsg, legend?:[{label,desc}] }      */
    /* ---------------------------------------------------------------- */
    function buildQuiz(container, cb, cfg) {
        var answers = {}; // index -> option id
        var list = h('div', { class: 'quiz' });
        var footer = h('div', { class: 'puz-result', 'aria-live': 'polite' });
        var total = cfg.items.length;

        function answeredCount() { return Object.keys(answers).length; }
        function score() {
            var s = 0;
            cfg.items.forEach(function (it, i) { if (answers[i] === it.answer) { s++; } });
            return s;
        }

        function renderFooter() {
            clear(footer);
            if (answeredCount() < total) {
                footer.appendChild(h('p', { class: 'small', raw: tr('{n} / {total} answered', { n: answeredCount(), total: total }) }));
                return;
            }
            var s = score();
            footer.appendChild(h('p', { class: 'score ' + (s >= cfg.pass ? 'good' : 'bad'), raw: tr('{s} / {total} correct', { s: s, total: total }) }));
            if (s >= cfg.pass) {
                footer.appendChild(h('p', { text: cfg.passMsg }));
                footer.appendChild(openDoorButton(cb));
            } else {
                footer.appendChild(h('p', { text: 'Not quite. Read the explanations, then try again.' }));
                footer.appendChild(h('button', { class: 'go', type: 'button', text: 'Try again', on: { click: function () { answers = {}; renderQuiz(); } } }));
            }
        }

        function renderQuiz() {
            clear(list);
            cfg.items.forEach(function (it, i) {
                var done = answers[i] !== undefined;
                var right = answers[i] === it.answer;
                var card = h('div', { class: 'q ' + (done ? (right ? 'ok' : 'wrong') : '') }, [h('p', { class: 'q-text', raw: (i + 1) + '. ' + it.text })]);
                var btns = h('div', { class: 'q-btns' });
                (it.options || cfg.options).forEach(function (opt) {
                    var b = h('button', { class: 'ghost', type: 'button', text: opt.label });
                    b.disabled = done;
                    b.addEventListener('click', function () { answers[i] = opt.id; renderQuiz(); });
                    btns.appendChild(b);
                });
                card.appendChild(btns);
                if (done) {
                    card.appendChild(h('p', { class: 'q-why', raw: (right ? tr('✓ Correct.') : tr('✗ Not quite.')) + ' ' + it.why }));
                }
                list.appendChild(card);
            });
            renderFooter();
        }

        if (cfg.legend) {
            var legend = h('ul', { class: 'legend' });
            cfg.legend.forEach(function (l) {
                legend.appendChild(h('li', {}, [h('b', { text: l.label }), ' ' + l.desc]));
            });
            container.appendChild(legend);
        }
        container.appendChild(list);
        container.appendChild(footer);
        renderQuiz();
    }

    function quizPanel(host, cb, title, intro, cfg) {
        var wrap = panelFrame(title, intro, cb);
        buildQuiz(wrap, cb, cfg);
        host.appendChild(wrap);
    }

    /* Chamber 3 of "What Is AI?": the Vault of Choices */
    function buildVault(host, cb) {
        quizPanel(host, cb, 'The Vault of Choices',
            tr('For each job, would you write <b>rules</b> by hand, or have software <b>learn from examples</b>? Get {pass} of {total} right to open the vault.', { pass: P.QUIZ_PASS, total: P.SCENARIOS.length }),
            {
                options: [{ id: 'rules', label: 'Write rules' }, { id: 'learn', label: 'Learn from examples' }],
                items: P.SCENARIOS, pass: P.QUIZ_PASS,
                passMsg: 'The vault opens. You can tell when a job calls for rules and when it calls for learning.'
            });
    }

    /* ---------------------------------------------------------------- */
    /* Kinds of Models, chamber 1: the Sorting Gate                      */
    /* ---------------------------------------------------------------- */
    function buildSorting(host, cb) {
        quizPanel(host, cb, 'The Sorting Gate',
            tr('Different jobs call for different <b>kinds</b> of model. Match each job to the right kind. Get 7 of {total} right.', { total: P.SORTING_JOBS.length }),
            {
                options: P.KINDS.map(function (k) { return { id: k.id, label: k.label }; }),
                legend: P.KINDS.map(function (k) { return { label: k.label + ':', desc: k.desc }; }),
                items: P.SORTING_JOBS, pass: 7,
                passMsg: 'The gate swings open. You can tell what kind of model a job needs.'
            });
    }

    /* ---------------------------------------------------------------- */
    /* Kinds of Models, chamber 2: the Token Mill                        */
    /* ---------------------------------------------------------------- */
    function buildTokens(host, cb) {
        var wrap = panelFrame('The Token Mill',
            tr('A language model writes <b>one token at a time</b>. At every step it has a probability for each possible next token. <b>You are the model</b>: pick the next token for each prompt. <span class="small">(The odds here are made up for the game.)</span>'), cb);
        var stage = h('div', { class: 'tok-stage' });
        var quizBox = h('div', { class: 'tok-quiz' });
        var state = { prompt: 0, step: 0, text: P.TOKEN_PROMPTS[0].start, notes: [] };

        function renderStage() {
            clear(stage);
            var pr = P.TOKEN_PROMPTS[state.prompt];
            stage.appendChild(h('p', { class: 'small', raw: tr('Prompt {i} of {n}', { i: state.prompt + 1, n: P.TOKEN_PROMPTS.length }) }));
            stage.appendChild(h('p', { class: 'tok-text' }, [state.text, h('span', { class: 'tok-cursor', text: '▌' })]));
            var options = pr.steps[state.step];
            var maxP = options.reduce(function (m, o) { return Math.max(m, o.p); }, 0);
            var opts = h('div', { class: 'tok-opts' });
            options.forEach(function (o) {
                var fill = h('div', { class: 'tok-fill' });
                fill.style.width = Math.round(o.p / maxP * 100) + '%';
                var b = h('button', { class: 'tok', type: 'button', ariaRaw: tr('Pick {token} at {p} percent', { token: o.t.trim(), p: o.p }) }, [
                    h('span', { class: 'tok-label', raw: o.t.replace(/^ /, '␣') }),
                    h('div', { class: 'tok-track' }, [fill]),
                    h('span', { class: 'tok-pct', raw: o.p + '%' })
                ]);
                b.addEventListener('click', function () { pick(o); });
                opts.appendChild(b);
            });
            stage.appendChild(opts);
            stage.appendChild(h('p', { class: 'small', text: 'Click a token to add it. The bars show the model\'s odds.' }));
        }

        function pick(o) {
            var pr = P.TOKEN_PROMPTS[state.prompt];
            state.text += o.t;
            state.step++;
            if (state.step >= pr.steps.length) {
                // prompt finished
                clear(stage);
                stage.appendChild(h('p', { class: 'tok-text done' }, [state.text]));
                stage.appendChild(h('p', { class: 'compare', text: pr.note }));
                state.notes.push(pr.note);
                if (state.prompt + 1 < P.TOKEN_PROMPTS.length) {
                    stage.appendChild(h('button', { class: 'go', type: 'button', text: 'Next prompt', on: { click: function () {
                        state.prompt++; state.step = 0; state.text = P.TOKEN_PROMPTS[state.prompt].start; renderStage();
                    } } }));
                } else {
                    stage.appendChild(h('h3', { text: 'Check what you learned' }));
                    buildQuiz(quizBox, cb, {
                        options: [], items: P.TOKEN_QUESTIONS, pass: P.TOKEN_QUESTIONS.length,
                        passMsg: 'The mill grinds to a halt. You know what a language model really does.'
                    });
                }
            } else {
                renderStage();
            }
        }

        wrap.appendChild(stage);
        wrap.appendChild(quizBox);
        host.appendChild(wrap);
        renderStage();
    }

    /* ---------------------------------------------------------------- */
    /* Kinds of Models, chamber 3: the Agent's Workshop                  */
    /* ---------------------------------------------------------------- */
    function buildAgent(host, cb) {
        var wrap = panelFrame('The Agent\'s Workshop',
            tr('A model on its own can only produce text. An <b>agent</b> is a model plus <b>tools</b>, run in a loop. For each task, hand over <b>only the tools it needs</b>. Extra tools cost money and give attackers more to abuse.'), cb);
        var chosen = P.AGENT_TASKS.map(function () { return []; });
        var results = h('div', { class: 'puz-result', 'aria-live': 'polite' });
        var board = h('div', { class: 'agent-board' });

        P.AGENT_TASKS.forEach(function (task, i) {
            var box = h('div', { class: 'q' }, [h('p', { class: 'q-text', raw: (i + 1) + '. ' + task.text })]);
            var tools = h('div', { class: 'tool-row' });
            P.TOOLS.forEach(function (tool) {
                var b = h('button', { class: 'ghost tool', type: 'button', 'aria-pressed': 'false', text: tool.label });
                b.addEventListener('click', function () {
                    var idx = chosen[i].indexOf(tool.id);
                    if (idx >= 0) { chosen[i].splice(idx, 1); } else { chosen[i].push(tool.id); }
                    var on = chosen[i].indexOf(tool.id) >= 0;
                    b.setAttribute('aria-pressed', on ? 'true' : 'false');
                    b.className = 'ghost tool' + (on ? ' on' : '');
                });
                tools.appendChild(b);
            });
            box.appendChild(tools);
            board.appendChild(box);
        });

        function runAll() {
            clear(results);
            var good = 0;
            P.AGENT_TASKS.forEach(function (task, i) {
                var r = P.evaluateTools(task, chosen[i]);
                if (r.ok) { good++; }
                var labelOf = function (id) { return P.TOOLS.filter(function (t) { return t.id === id; })[0].label; };
                var msg = r.ok ? '✓ ' + (i + 1) + '. ' + task.why
                    : '✗ ' + (i + 1) + '. ' + (r.missing.length ? tr('Missing: {tools}.', { tools: r.missing.map(labelOf).join(', ') }) + ' ' : '') +
                        (r.extra.length ? tr('Not needed: {tools}.', { tools: r.extra.map(labelOf).join(', ') }) + ' ' : '') + task.why;
                results.appendChild(h('p', { class: 'q-why ' + (r.ok ? 'ok' : 'wrong'), raw: msg }));
            });
            results.appendChild(h('p', { class: 'score ' + (good === P.AGENT_TASKS.length ? 'good' : 'bad'), raw: tr('{good} / {total} tasks equipped correctly', { good: good, total: P.AGENT_TASKS.length }) }));
            if (good === P.AGENT_TASKS.length) {
                results.appendChild(h('p', { text: 'The workshop approves. A good harness gives a model exactly the tools the job needs.' }));
                results.appendChild(openDoorButton(cb));
            } else {
                results.appendChild(h('p', { text: 'Adjust the tools and run it again.' }));
            }
        }

        wrap.appendChild(board);
        wrap.appendChild(h('button', { class: 'go', type: 'button', text: 'Run the agents', on: { click: runAll } }));
        wrap.appendChild(results);
        host.appendChild(wrap);
    }

    /* ---------------------------------------------------------------- */
    /* Local vs Cloud, chamber 1: the Packing Room                       */
    /* ---------------------------------------------------------------- */
    function buildPacking(host, cb) {
        var wrap = panelFrame('The Packing Room',
            tr('A local model has to fit in your machine\'s memory. Three machines, three choices: pick the <b>best model that fits</b>. <b>Quantization</b> shrinks a model by storing its numbers with less precision, at a small cost in quality. <span class="small">(Sizes and quality scores are rough illustrations.)</span>'), cb);
        var round = 0;
        var stage = h('div', { class: 'pack-stage' });
        var feedback = h('div', { class: 'puz-result', 'aria-live': 'polite' });

        function renderRound() {
            clear(stage);
            clear(feedback);
            var r = P.PACK_ROUNDS[round];
            stage.appendChild(h('h3', { raw: tr('Round {i} of {n}: {machine}', { i: round + 1, n: P.PACK_ROUNDS.length, machine: r.machine }) }));
            var grid = h('div', { class: 'pack-grid' });
            P.PACK_OPTIONS.forEach(function (o) {
                var fits = o.gb <= r.budget;
                var fill = h('div', { class: 'tok-fill' });
                fill.style.width = Math.round(o.quality / 10 * 100) + '%';
                var b = h('button', { class: 'pack' + (fits ? '' : ' nofit'), type: 'button', ariaRaw: tr('{label}, {gb} gigabytes', { label: o.label, gb: o.gb }) }, [
                    h('span', { class: 'pack-name', text: o.label }),
                    h('span', { class: 'pack-gb', raw: o.gb + ' GB' + (fits ? '' : ' ' + tr('(too big)')) }),
                    h('div', { class: 'tok-track' }, [fill]),
                    h('span', { class: 'small', raw: tr('quality {q}', { q: o.quality }) })
                ]);
                b.addEventListener('click', function () { choose(o); });
                grid.appendChild(b);
            });
            stage.appendChild(grid);
        }

        function choose(o) {
            var r = P.PACK_ROUNDS[round];
            var best = P.bestPack(r.budget);
            clear(feedback);
            if (o.gb > r.budget) {
                feedback.appendChild(h('p', { class: 'score bad', raw: tr('That needs {gb} GB and this machine has {budget} GB. It will not load.', { gb: o.gb, budget: r.budget }) }));
                return;
            }
            if (o.id !== best.id) {
                feedback.appendChild(h('p', { class: 'score bad', raw: tr('It fits, but there is a better one. Something with a higher quality score still fits in {budget} GB.', { budget: r.budget }) }));
                return;
            }
            feedback.appendChild(h('p', { class: 'score good', raw: '✓ ' + tr('{label} is the best fit.', { label: best.label }) }));
            if (round + 1 < P.PACK_ROUNDS.length) {
                feedback.appendChild(h('button', { class: 'go', type: 'button', text: 'Next machine', on: { click: function () { round++; renderRound(); } } }));
            } else {
                feedback.appendChild(h('p', { text: 'Notice the pattern: a bigger model squeezed with quantization usually beats a smaller model at full precision. Memory, not just model quality, decides what you can run locally.' }));
                feedback.appendChild(openDoorButton(cb));
            }
        }

        wrap.appendChild(stage);
        wrap.appendChild(feedback);
        host.appendChild(wrap);
        renderRound();
    }

    /* ---------------------------------------------------------------- */
    /* Local vs Cloud, chamber 2: the Data Gate                          */
    /* ---------------------------------------------------------------- */
    function buildDataGate(host, cb) {
        quizPanel(host, cb, 'The Data Gate',
            tr('Where should each job run: on <b>your own machine</b> (local) or on a <b>provider\'s servers</b> (cloud)? Think about privacy, connectivity, power and cost. Get 5 of {total} right.', { total: P.DATA_GATE.length }),
            {
                options: [{ id: 'local', label: 'Run it local' }, { id: 'cloud', label: 'Use the cloud' }],
                items: P.DATA_GATE, pass: 5,
                passMsg: 'The gate opens. You can weigh privacy, power and cost when choosing where a model runs.'
            });
    }

    /* ---------------------------------------------------------------- */
    /* Local vs Cloud, chamber 3: the Toll Booth                         */
    /* ---------------------------------------------------------------- */
    function buildToll(host, cb) {
        var T = P.TOLL;
        var wrap = panelFrame('The Toll Booth',
            tr('The cloud charges <b>per use</b>. Running locally is a <b>fixed monthly cost</b> (hardware spread over time, plus power). Slide the workload and watch which is cheaper. <span class="small">(Illustrative prices: about ${per1000} per 1,000 requests in the cloud, ${monthly} a month local.)</span>', { per1000: (T.cloudPerRequest * 1000).toFixed(0), monthly: T.localMonthly }), cb);

        var slider = h('input', { type: 'range', min: '0', max: String(T.sliderMax), step: String(T.sliderStep), 'aria-label': 'Requests per day' });
        slider.value = '300';
        var perDay = h('p', { class: 'toll-n' });
        var cloudFill = h('div', { class: 'w-fill neg' });
        var localFill = h('div', { class: 'w-fill pos' });
        var cloudVal = h('span', { class: 'w-val' });
        var localVal = h('span', { class: 'w-val' });
        var verdict = h('p', { class: 'score' });

        function bar(name, fill, val) {
            return h('div', { class: 'w-row toll-row' }, [h('span', { class: 'w-name', text: name }), h('div', { class: 'w-track' }, [fill]), val]);
        }

        function refresh() {
            var n = parseInt(slider.value, 10);
            var c = P.tollCosts(n);
            var max = Math.max(c.cloud, c.local, 1);
            perDay.textContent = tr('{n} requests a day', { n: n.toLocaleString() });
            cloudFill.style.width = Math.round(c.cloud / max * 100) + '%';
            localFill.style.width = Math.round(c.local / max * 100) + '%';
            cloudVal.textContent = '$' + c.cloud.toFixed(0);
            localVal.textContent = '$' + c.local.toFixed(0);
            verdict.className = 'score ' + (c.cheaper === 'local' ? 'good' : 'bad');
            verdict.textContent = c.cheaper === 'same' ? tr('Dead even.') : (c.cheaper === 'cloud' ? tr('The cloud is cheaper at this volume.') : tr('Local is cheaper at this volume.'));
        }
        slider.addEventListener('input', refresh);

        var explorer = h('div', { class: 'toll' }, [
            perDay, slider,
            bar('Cloud', cloudFill, cloudVal),
            bar('Local', localFill, localVal),
            verdict,
            h('p', { class: 'small', text: 'Local also costs setup time and keeps your hardware busy. Cloud brings rate limits and sends your data off your machine.' })
        ]);
        var quizBox = h('div', { class: 'tok-quiz' });

        wrap.appendChild(explorer);
        wrap.appendChild(h('h3', { text: 'Now decide' }));
        wrap.appendChild(quizBox);
        host.appendChild(wrap);
        refresh();
        buildQuiz(quizBox, cb, {
            options: [{ id: 'local', label: 'Local' }, { id: 'cloud', label: 'Cloud' }],
            items: P.TOLL_QUESTIONS, pass: P.TOLL_QUESTIONS.length,
            passMsg: 'The toll booth raises its barrier. You can find where fixed cost beats pay-per-use.'
        });
    }

    /* ---------------------------------------------------------------- */
    /* Under the Hood, chamber 1: the Speed Run                          */
    /* ---------------------------------------------------------------- */
    function fmtTime(sec) {
        if (sec < 60) { return tr('{n} s', { n: sec.toFixed(1) }); }
        if (sec < 3600) { return tr('{n} min', { n: (sec / 60).toFixed(1) }); }
        return tr('{n} h', { n: (sec / 3600).toFixed(1) });
    }

    function buildSpeed(host, cb) {
        var wrap = panelFrame('The Speed Run',
            tr('Speed is measured in <b>tokens per second</b> (how fast text streams out) and <b>time to first token</b> (how long you wait before it starts). Pick one setup for each job. <span class="small">(Speeds are rough illustrations.)</span>'), cb);

        var legend = h('ul', { class: 'legend' });
        P.SPEED_SETUPS.forEach(function (s) {
            legend.appendChild(h('li', {}, [h('b', { raw: s.label + ':' }), ' ' + tr('{tps} tokens/s, first token after {ttft} s', { tps: s.tps, ttft: s.ttft }) + (s.local ? '' : tr(', needs internet'))]));
        });
        wrap.appendChild(legend);

        var chosen = P.SPEED_JOBS.map(function () { return null; });
        var board = h('div', { class: 'agent-board' });
        var results = h('div', { class: 'puz-result', 'aria-live': 'polite' });

        P.SPEED_JOBS.forEach(function (job, i) {
            var box = h('div', { class: 'q' }, [h('p', { class: 'q-text', raw: (i + 1) + '. ' + job.text })]);
            var row = h('div', { class: 'tool-row' });
            var btns = [];
            P.SPEED_SETUPS.forEach(function (setup) {
                var b = h('button', { class: 'ghost tool', type: 'button', 'aria-pressed': 'false', text: setup.label });
                b.addEventListener('click', function () {
                    chosen[i] = setup.id;
                    btns.forEach(function (x) { x.btn.className = 'ghost tool' + (x.id === setup.id ? ' on' : ''); x.btn.setAttribute('aria-pressed', x.id === setup.id ? 'true' : 'false'); });
                });
                btns.push({ id: setup.id, btn: b });
                row.appendChild(b);
            });
            box.appendChild(row);
            board.appendChild(box);
        });

        function setupById(id) { return P.SPEED_SETUPS.filter(function (s) { return s.id === id; })[0]; }

        function run() {
            clear(results);
            var good = 0;
            P.SPEED_JOBS.forEach(function (job, i) {
                if (chosen[i] === null) {
                    results.appendChild(h('p', { class: 'q-why wrong', raw: '✗ ' + (i + 1) + '. ' + tr('Pick a setup for this job first.') }));
                    return;
                }
                var setup = setupById(chosen[i]);
                var r = P.speedResult(setup, job);
                if (r.ok) { good++; }
                var facts = tr('First token {first} s, everything done in {total}.', { first: r.first, total: fmtTime(r.total) });
                var why = '';
                if (!r.ok) {
                    if (job.maxTotal !== null && r.total > job.maxTotal) { why = ' ' + tr('Too slow: the limit is {limit}.', { limit: fmtTime(job.maxTotal) }); }
                    else if (job.maxFirst !== null && r.first > job.maxFirst) { why = ' ' + tr('The first token arrives too late: the limit is {limit} s.', { limit: job.maxFirst }); }
                    else if (job.needLocal && !setup.local) { why = ' ' + tr('This job must stay offline, and a cloud model needs the internet.'); }
                }
                results.appendChild(h('p', { class: 'q-why ' + (r.ok ? 'ok' : 'wrong'), raw: (r.ok ? '✓ ' : '✗ ') + (i + 1) + '. ' + setup.label + ': ' + facts + why }));
            });
            results.appendChild(h('p', { class: 'score ' + (good === P.SPEED_JOBS.length ? 'good' : 'bad'), raw: tr('{good} / {total} jobs met', { good: good, total: P.SPEED_JOBS.length }) }));
            if (good === P.SPEED_JOBS.length) {
                results.appendChild(h('p', { text: 'Fast enough everywhere. Notice what drove speed: model size, precision (quantization), and the hardware doing the work. A longer prompt also delays the first token.' }));
                results.appendChild(openDoorButton(cb));
            } else {
                results.appendChild(h('p', { text: 'Change your picks and run the race again.' }));
            }
        }

        wrap.appendChild(board);
        wrap.appendChild(h('button', { class: 'go', type: 'button', text: 'Run the race', on: { click: run } }));
        wrap.appendChild(results);
        host.appendChild(wrap);
    }

    /* ---------------------------------------------------------------- */
    /* Under the Hood, chamber 2: the Cache Vault                        */
    /* ---------------------------------------------------------------- */
    function buildCache(host, cb) {
        var wrap = panelFrame('The Cache Vault',
            tr('A provider can <b>reuse work</b> it already did on the start of your prompt, but only an <b>identical prefix</b>: the moment one block differs, everything after it is processed again. Reorder the blocks so the next request can reuse as much as possible. Reach {pct}% reuse.', { pct: P.CACHE_PASS_PCT }), cb);

        var order = P.CACHE_START_ORDER.slice();
        var list = h('div', { class: 'cache-list' });
        var meter = h('div', { class: 'cache-meter', 'aria-live': 'polite' });
        var quizBox = h('div', { class: 'tok-quiz' });
        var quizShown = false;

        function move(i, dir) {
            var j = i + dir;
            if (j < 0 || j >= order.length) { return; }
            var t = order[i]; order[i] = order[j]; order[j] = t;
            render();
        }

        function render() {
            clear(list);
            var r = P.cacheReuse(order);
            // blocks are reusable only while no changing block has appeared yet
            var broken = false;
            order.forEach(function (id, i) {
                var b = P.cacheBlock(id);
                var reusable = !broken && !b.changes;
                if (b.changes) { broken = true; }
                var row = h('div', { class: 'cache-row ' + (reusable ? 'hit' : 'miss') }, [
                    h('span', { class: 'cache-name', text: b.label }),
                    h('span', { class: 'small', raw: tr('{n} tokens · {note}', { n: b.tokens.toLocaleString(), note: b.note }) }),
                    h('span', { class: 'cache-tag', text: reusable ? 'reused' : 'reprocessed' })
                ]);
                var up = h('button', { class: 'ghost small', type: 'button', ariaRaw: tr('Move {label} up', { label: b.label }), text: '▲' });
                var down = h('button', { class: 'ghost small', type: 'button', ariaRaw: tr('Move {label} down', { label: b.label }), text: '▼' });
                up.disabled = i === 0;
                down.disabled = i === order.length - 1;
                up.addEventListener('click', function () { move(i, -1); });
                down.addEventListener('click', function () { move(i, 1); });
                row.appendChild(h('span', { class: 'cache-btns' }, [up, down]));
                list.appendChild(row);
            });

            clear(meter);
            var fill = h('div', { class: 'w-fill ' + (r.pct >= P.CACHE_PASS_PCT ? 'pos' : 'neg') });
            fill.style.width = r.pct + '%';
            meter.appendChild(h('div', { class: 'w-row cache-bar' }, [h('span', { class: 'w-name', text: 'Reused' }), h('div', { class: 'w-track' }, [fill]), h('span', { class: 'w-val', raw: r.pct + '%' })]));
            meter.appendChild(h('p', { class: 'score ' + (r.pct >= P.CACHE_PASS_PCT ? 'good' : 'bad'),
                raw: tr('{reused} of {total} tokens reused. Cost is about {cost}% of a request with no cache.', { reused: r.reused.toLocaleString(), total: r.total.toLocaleString(), cost: r.costPct }) }));

            if (r.pct >= P.CACHE_PASS_PCT && !quizShown) {
                quizShown = true;
                quizBox.appendChild(h('h3', { text: 'Check what you learned' }));
                buildQuiz(quizBox, cb, {
                    options: [], items: P.CACHE_QUESTIONS, pass: P.CACHE_QUESTIONS.length,
                    passMsg: 'The vault opens. You know what a cache saves and what breaks it.'
                });
            }
        }

        wrap.appendChild(list);
        wrap.appendChild(meter);
        wrap.appendChild(quizBox);
        host.appendChild(wrap);
        render();
    }

    /* ---------------------------------------------------------------- */
    /* Under the Hood, chamber 3: the Guardrail Gate                     */
    /* ---------------------------------------------------------------- */
    function buildGuardGate(host, cb) {
        quizPanel(host, cb, 'The Guardrail Gate',
            tr('Models can ship <b>normal</b> (aligned) or <b>uncensored</b>. Neither is "better": it depends on who uses the model and what the worst case is. Choose one for each job. Get 5 of {total} right.', { total: P.GUARD_SCENARIOS.length }),
            {
                options: [{ id: 'normal', label: 'Normal (aligned) model' }, { id: 'uncensored', label: 'Uncensored model' }],
                legend: P.GUARD_PRIMER,
                items: P.GUARD_SCENARIOS, pass: 5,
                passMsg: 'The gate lifts. Remember: removing a model\'s refusals does not remove the risk, it moves the responsibility to you.'
            });
    }

    /* ---------------------------------------------------------------- */
    /* Talking to Models, chamber 1: the Prompt Forge                    */
    /* ---------------------------------------------------------------- */
    function buildSysPrompt(host, cb) {
        var wrap = panelFrame('The Prompt Forge',
            tr('A <b>system prompt</b> is the standing brief a model receives before every conversation. Vague wishes get vague behaviour. Specific instructions get predictable behaviour. Build a prompt for Brightfix\'s support assistant that passes <b>all four</b> customer tests.'), cb);
        var selected = [];
        var cards = h('div', { class: 'sys-cards' });
        var previewText = h('p', { class: 'sys-text' });
        var tokenLine = h('p', { class: 'small' });
        var results = h('div', { class: 'puz-result', 'aria-live': 'polite' });

        function refreshPreview() {
            var text = P.sysPromptText(selected);
            previewText.textContent = text || tr('(empty: the model gets no instructions at all)');
            tokenLine.textContent = tr('≈ {n} tokens, sent and billed with every single request. Shorter is cheaper, but every rule you need has to be written down.', { n: P.estimateTokens(text) });
        }

        P.SYS_CARDS.forEach(function (c) {
            var b = h('button', { class: 'ghost sys-card', type: 'button', 'aria-pressed': 'false', text: c.text });
            b.addEventListener('click', function () {
                var i = selected.indexOf(c.id);
                if (i >= 0) { selected.splice(i, 1); } else { selected.push(c.id); }
                var on = selected.indexOf(c.id) >= 0;
                b.setAttribute('aria-pressed', on ? 'true' : 'false');
                b.className = 'ghost sys-card' + (on ? ' on' : '');
                refreshPreview();
            });
            cards.appendChild(b);
        });

        function runTests() {
            clear(results);
            var rs = P.runSysTests(selected);
            var good = 0;
            rs.forEach(function (r, i) {
                if (r.ok) { good++; }
                var box = h('div', { class: 'q ' + (r.ok ? 'ok' : 'wrong') }, [
                    h('p', { class: 'q-text', raw: '👤 ' + r.user }),
                    h('p', { class: 'sys-reply', raw: '🤖 ' + r.reply }),
                    h('p', { class: 'q-why', raw: r.ok ? tr('✓ Passed.') : tr('✗ Failed.') + ' ' + r.lesson })
                ]);
                results.appendChild(box);
            });
            results.appendChild(h('p', { class: 'score ' + (good === rs.length ? 'good' : 'bad'), raw: tr('{good} / {total} tests passed', { good: good, total: rs.length }) }));
            if (good === rs.length) {
                results.appendChild(h('p', { text: 'Every test passes. Notice what worked: a role, a format limit, clear boundaries and a rule for unclear requests. "Be helpful and smart" added nothing. A system prompt guides the model, but it is not a lock: a determined user can still try to talk past it.' }));
                results.appendChild(openDoorButton(cb));
            } else {
                results.appendChild(h('p', { text: 'Adjust the prompt and run the tests again.' }));
            }
        }

        wrap.appendChild(h('h3', { text: 'Pick the instructions to include' }));
        wrap.appendChild(cards);
        wrap.appendChild(h('h3', { text: 'The system prompt the model receives' }));
        wrap.appendChild(h('div', { class: 'sys-preview' }, [previewText, tokenLine]));
        wrap.appendChild(h('button', { class: 'go', type: 'button', text: 'Run the four tests', on: { click: runTests } }));
        wrap.appendChild(results);
        host.appendChild(wrap);
        refreshPreview();
    }

    /* ---------------------------------------------------------------- */
    /* Talking to Models, chamber 2: the Memory Hall                     */
    /* ---------------------------------------------------------------- */
    function buildContext(host, cb) {
        var wrap = panelFrame('The Memory Hall',
            tr('A model only sees what fits inside its <b>context window</b>. When a conversation gets too long, the <b>oldest</b> messages are forgotten first. Sam said something important at the start. Make sure the model still knows it when Sam asks the last question. <span class="small">(Sizes are in tokens. Pin = move it into the system prompt so it is never forgotten. Shrink = summarise it.)</span>'), cb);

        var actions = {};
        var meter = h('div', { class: 'cache-meter', 'aria-live': 'polite' });
        var list = h('div', { class: 'ctx-list' });
        var answerBox = h('div', { class: 'ctx-answer', 'aria-live': 'polite' });
        var quizBox = h('div', { class: 'tok-quiz' });
        var quizShown = false;

        function render() {
            var w = P.assembleWindow(actions);
            clear(list);
            P.CONTEXT_MSGS.forEach(function (m) {
                var a = m.last ? 'keep' : (actions[m.id] || 'keep');
                var size = (a === 'shrink' && m.shrunk) ? m.shrunk : m.tokens;
                var state = tr('in window');
                var cls = 'in';
                if (m.last) { state = tr('asked just now'); cls = 'in'; }
                else if (a === 'drop') { state = tr('removed'); cls = 'gone'; }
                else if (a === 'pin') { state = tr('pinned in system prompt'); cls = 'pin'; }
                else if (w.forgotten.indexOf(m.id) >= 0) { state = tr('forgotten: window full'); cls = 'lost'; }
                var row = h('div', { class: 'ctx-row ' + cls }, [
                    h('span', { class: 'chip ' + (m.who === 'user' ? 'chip-ok' : 'chip-bad'), text: m.who === 'user' ? 'You' : 'Model' }),
                    h('span', { class: 'ctx-text', text: m.text }),
                    h('span', { class: 'small', raw: tr('{n} tokens · {state}', { n: size, state: state }) })
                ]);
                if (!m.last) {
                    var acts = h('span', { class: 'ctx-acts' });
                    [['keep', 'Keep'], ['shrink', 'Shrink'], ['pin', 'Pin'], ['drop', 'Drop']].forEach(function (opt) {
                        var b = h('button', { class: 'ghost small' + (a === opt[0] ? ' on' : ''), type: 'button', ariaRaw: tr(opt[1]) + ': ' + m.text, 'aria-pressed': a === opt[0] ? 'true' : 'false', text: opt[1] });
                        if (opt[0] === 'shrink' && !m.shrunk) { b.disabled = true; }
                        b.addEventListener('click', function () { actions[m.id] = opt[0]; render(); });
                        acts.appendChild(b);
                    });
                    row.appendChild(acts);
                }
                list.appendChild(row);
            });

            clear(meter);
            var pct = Math.min(100, Math.round(w.used / w.budget * 100));
            var fill = h('div', { class: 'w-fill ' + (w.overflow ? 'neg' : 'pos') });
            fill.style.width = pct + '%';
            meter.appendChild(h('div', { class: 'w-row cache-bar' }, [h('span', { class: 'w-name', text: 'Window' }), h('div', { class: 'w-track' }, [fill]), h('span', { class: 'w-val', raw: w.used + '/' + w.budget })]));

            clear(answerBox);
            answerBox.appendChild(h('p', { class: 'small', text: 'Sam asks: "Can I eat the satay?"' }));
            answerBox.appendChild(h('p', { class: 'ctx-reply ' + (w.answerSafe ? 'good' : 'bad'), raw: '🤖 ' + w.answer }));
            if (!w.answerSafe && !w.overflow) {
                answerBox.appendChild(h('p', { class: 'q-why wrong', text: 'The peanut allergy has dropped out of the window, so the model does not know about it. That answer could hurt someone.' }));
            }

            if (w.answerSafe && !quizShown) {
                quizShown = true;
                quizBox.appendChild(h('h3', { text: 'Check what you learned' }));
                buildQuiz(quizBox, cb, {
                    options: [], items: P.CONTEXT_QUESTIONS, pass: P.CONTEXT_QUESTIONS.length,
                    passMsg: 'The hall remembers. You know why models forget and how to keep what matters.'
                });
            }
        }

        wrap.appendChild(meter);
        wrap.appendChild(list);
        wrap.appendChild(answerBox);
        wrap.appendChild(quizBox);
        host.appendChild(wrap);
        render();
    }

    /* ---------------------------------------------------------------- */
    /* Talking to Models, chamber 3: the Token Counter                   */
    /* ---------------------------------------------------------------- */
    function buildTokenUnits(host, cb) {
        var wrap = panelFrame('The Token Counter',
            tr('Models do not read words or letters. They read <b>tokens</b>: chunks of text. You are billed per token, and the context window is measured in tokens too. <span class="small">(These splits are illustrative: real tokenizers differ between models.)</span>'), cb);

        var seen = h('div', { class: 'tok-examples' });
        P.TOKEN_EXAMPLES.forEach(function (ex) {
            var chips = h('div', { class: 'tok-chips' });
            ex.tokens.forEach(function (t, i) {
                chips.appendChild(h('span', { class: 'tchip c' + (i % 4), raw: t.replace(/ /g, '␣') }));
            });
            seen.appendChild(h('div', { class: 'tok-ex' }, [h('span', { class: 'tok-ex-text', raw: '"' + ex.text + '"' }), chips, h('span', { class: 'small', raw: tr('{n} tokens', { n: ex.tokens.length }) })]));
        });
        wrap.appendChild(seen);
        wrap.appendChild(h('p', { class: 'small', text: 'Rule of thumb for English: about 4 characters, or three quarters of a word, per token.' }));

        wrap.appendChild(h('h3', { text: 'Trim this prompt' }));
        wrap.appendChild(h('p', { class: 'puz-intro', rawHtml: tr('This prompt will be sent a million times. Cut what is <b>fluff</b>, keep what the model needs (the task, the constraint and the data). Get it to <b>{budget} tokens or fewer</b>.', { budget: P.TRIM_BUDGET }) }));

        var kept = P.TRIM_SENTENCES.map(function (s, i) { return i; });
        var rowsBox = h('div', { class: 'trim-list' });
        var meter = h('div', { class: 'puz-result', 'aria-live': 'polite' });
        var verdict = h('div', { class: 'puz-result', 'aria-live': 'polite' });
        var quizBox = h('div', { class: 'tok-quiz' });
        var quizShown = false;

        function refresh() {
            var r = P.trimResult(kept);
            clear(meter);
            meter.appendChild(h('p', { class: 'score ' + (r.tokens <= P.TRIM_BUDGET ? 'good' : 'bad'),
                raw: tr('≈ {tokens} tokens (budget {budget}). At ${price} per million tokens, a million requests costs about ${cost}.', { tokens: r.tokens, budget: P.TRIM_BUDGET, price: P.TOKEN_PRICE_PER_MILLION, cost: r.millionRequestCost.toLocaleString() }) }));
        }

        P.TRIM_SENTENCES.forEach(function (sen, i) {
            var b = h('button', { class: 'ghost trim-row on', type: 'button', 'aria-pressed': 'true' }, [
                h('span', { class: 'trim-text', text: sen.text }),
                h('span', { class: 'small', raw: tr('≈ {n} tokens', { n: sen.tokens }) })
            ]);
            b.addEventListener('click', function () {
                var idx = kept.indexOf(i);
                if (idx >= 0) { kept.splice(idx, 1); } else { kept.push(i); }
                var on = kept.indexOf(i) >= 0;
                b.setAttribute('aria-pressed', on ? 'true' : 'false');
                b.className = 'ghost trim-row' + (on ? ' on' : ' off');
                refresh();
            });
            rowsBox.appendChild(b);
        });

        function send() {
            var r = P.trimResult(kept);
            clear(verdict);
            if (r.cutEssential > 0) {
                verdict.appendChild(h('p', { class: 'score bad', text: 'You cut something the model needs: the task, a constraint or the data. Put it back.' }));
            } else if (r.tokens > P.TRIM_BUDGET) {
                verdict.appendChild(h('p', { class: 'score bad', text: 'Still too long. There is more fluff to cut.' }));
            } else {
                verdict.appendChild(h('p', { class: 'score good', raw: tr('Lean and complete: {tokens} tokens, and the model still has everything it needs.', { tokens: r.tokens }) }));
                if (!quizShown) {
                    quizShown = true;
                    quizBox.appendChild(h('h3', { text: 'Check what you learned' }));
                    buildQuiz(quizBox, cb, {
                        options: [], items: P.TOKEN_QUESTIONS_2, pass: P.TOKEN_QUESTIONS_2.length,
                        passMsg: 'The counter is satisfied. You know what a token is and what it costs you.'
                    });
                }
            }
        }

        wrap.appendChild(rowsBox);
        wrap.appendChild(meter);
        wrap.appendChild(h('button', { class: 'go', type: 'button', text: 'Send it', on: { click: send } }));
        wrap.appendChild(verdict);
        wrap.appendChild(quizBox);
        host.appendChild(wrap);
        refresh();
    }

    /* ---------------------------------------------------------------- */
    /* Trust Issues, chamber 1: the Liar's Ledger                        */
    /* ---------------------------------------------------------------- */
    function buildVerify(host, cb) {
        var wrap = panelFrame('The Liar\'s Ledger',
            tr('A model drafted a client briefing. Every claim is written in the <b>same confident tone</b>, and tone tells you nothing about accuracy. You only have time to <b>verify {budget}</b> of the six before it ships. Look at <b>what kind of claim</b> each one is: a citation, a precise number, your own private data, a recent event, or a well-known fact.', { budget: P.VERIFY_BUDGET }), cb);

        var verified = [];
        var counter = h('p', { class: 'small', 'aria-live': 'polite' });
        var list = h('div', { class: 'ledger' });
        var results = h('div', { class: 'puz-result', 'aria-live': 'polite' });
        var buttons = [];

        function refresh() {
            counter.textContent = tr('Checks left: {left} of {total}', { left: P.VERIFY_BUDGET - verified.length, total: P.VERIFY_BUDGET });
            buttons.forEach(function (x) {
                var on = verified.indexOf(x.id) >= 0;
                x.btn.className = 'ghost' + (on ? ' on' : '');
                x.btn.setAttribute('aria-pressed', on ? 'true' : 'false');
                x.btn.textContent = on ? tr('✓ Will verify') : tr('Verify this');
                x.btn.disabled = !on && verified.length >= P.VERIFY_BUDGET;
            });
        }

        P.VERIFY_CLAIMS.forEach(function (c, i) {
            var btn = h('button', { class: 'ghost', type: 'button', 'aria-pressed': 'false', text: 'Verify this' });
            btn.addEventListener('click', function () {
                var idx = verified.indexOf(c.id);
                if (idx >= 0) { verified.splice(idx, 1); }
                else if (verified.length < P.VERIFY_BUDGET) { verified.push(c.id); }
                refresh();
            });
            buttons.push({ id: c.id, btn: btn });
            var tags = h('span', { class: 'ledger-tags' });
            c.tags.forEach(function (t) { tags.appendChild(h('span', { class: 'chip chip-tag', text: t })); });
            tags.appendChild(h('span', { class: 'chip chip-stakes-' + c.stakes, raw: tr('{level} stakes', { level: tr(c.stakes) }) }));
            list.appendChild(h('div', { class: 'q ledger-row' }, [
                h('p', { class: 'q-text', raw: (i + 1) + '. “' + c.text + '”' }),
                tags,
                btn
            ]));
        });

        function ship() {
            clear(results);
            var r = P.evaluateVerify(verified);
            P.VERIFY_CLAIMS.forEach(function (c, i) {
                var checked = verified.indexOf(c.id) >= 0;
                var msg;
                var cls;
                if (checked && !c.real) { msg = tr('✓ {i}. Checked and caught: {truth}', { i: i + 1, truth: c.truth }); cls = 'ok'; }
                else if (checked) { msg = tr('✓ {i}. Checked: {truth} (You spent a check here.)', { i: i + 1, truth: c.truth }); cls = 'ok'; }
                else if (!c.real) { msg = tr('✗ {i}. Shipped unchecked, and it was false. {truth} {cost}', { i: i + 1, truth: c.truth, cost: c.cost }); cls = 'wrong'; }
                else { msg = tr('· {i}. Shipped unchecked. It happened to be right.', { i: i + 1 }); cls = ''; }
                results.appendChild(h('p', { class: 'q-why ' + cls, raw: msg }));
            });
            results.appendChild(h('p', { class: 'score ' + (r.ok ? 'good' : 'bad'),
                raw: r.ok ? tr('No false claim got through.') : tr('False claims that got through: {n}.', { n: r.shipped.length }) }));
            if (r.ok) {
                results.appendChild(h('p', { text: 'The invented claims were the citation, the figure about your own product and the precise statistic. Famous facts were the safest to trust. A confident tone is never evidence. Verify the specific, the private and the high-stakes, and ask for sources you can check.' }));
                results.appendChild(openDoorButton(cb));
            } else {
                results.appendChild(h('p', { text: 'Change which claims you verify and ship again. Which kinds of claim are models most likely to invent?' }));
            }
        }

        wrap.appendChild(counter);
        wrap.appendChild(list);
        wrap.appendChild(h('button', { class: 'go', type: 'button', text: 'Ship the briefing', on: { click: ship } }));
        wrap.appendChild(results);
        host.appendChild(wrap);
        refresh();
    }

    /* ---------------------------------------------------------------- */
    /* Trust Issues, chamber 2: the Three Doors                          */
    /* ---------------------------------------------------------------- */
    function buildDoors(host, cb) {
        var wrap = panelFrame('The Three Doors',
            tr('First, <b>grounding</b>: a model answers far better when you hand it the right source. A user asks a question, and a search tool will pass the model <b>one document</b>. Choose which. Then decide which <b>door</b> suits each need: a prompt, retrieval or fine-tuning.'), cb);

        var quizBox = h('div', { class: 'tok-quiz' });
        var answerBox = h('div', { class: 'ctx-answer', 'aria-live': 'polite' });
        var quizShown = false;

        wrap.appendChild(h('p', { class: 'tok-text' }, ['👤 ' + P.GROUND_QUESTION]));
        var docs = h('div', { class: 'doc-list' });
        P.GROUND_DOCS.forEach(function (d) {
            var b = h('button', { class: 'ghost doc', type: 'button', ariaRaw: tr('Give the model: {label}', { label: d.label }) }, [
                h('span', { class: 'doc-name', text: d.label }),
                h('span', { class: 'small', text: d.snippet })
            ]);
            b.addEventListener('click', function () {
                clear(answerBox);
                answerBox.appendChild(h('p', { class: 'small', raw: tr('The model was given: {label}', { label: d.label }) }));
                answerBox.appendChild(h('p', { class: 'ctx-reply ' + (d.verdict === 'good' ? 'good' : 'bad'), raw: '🤖 ' + d.answer }));
                answerBox.appendChild(h('p', { class: 'q-why ' + (d.verdict === 'good' ? 'ok' : 'wrong'), text: d.why }));
                if (d.verdict === 'good' && !quizShown) {
                    quizShown = true;
                    quizBox.appendChild(h('h3', { text: 'Now pick the right door' }));
                    buildQuiz(quizBox, cb, {
                        options: [{ id: 'prompt', label: 'Prompt' }, { id: 'retrieval', label: 'Retrieval (RAG)' }, { id: 'finetune', label: 'Fine-tune' }],
                        legend: P.DOOR_PRIMER,
                        items: P.DOOR_SCENARIOS, pass: 5,
                        passMsg: 'The doors open. Try a prompt first, add retrieval for your own or changing knowledge, and fine-tune only when the others fall short.'
                    });
                }
            });
            docs.appendChild(b);
        });
        wrap.appendChild(docs);
        wrap.appendChild(answerBox);
        wrap.appendChild(quizBox);
        host.appendChild(wrap);
    }

    /* ---------------------------------------------------------------- */
    /* Trust Issues, chamber 3: the Poisoned Inbox                       */
    /* ---------------------------------------------------------------- */
    function buildPoison(host, cb) {
        var wrap = panelFrame('The Poisoned Inbox',
            tr('MailBot is an assistant with an inbox: it can read mail, send mail and delete mail. It also reads <b>untrusted text</b> from the outside world, and that text can contain <b>instructions</b>. Pick up to <b>{max}</b> defences, then run the three attacks.', { max: P.POISON_MAX }), cb);

        var selected = [];
        var attacks = h('div', { class: 'agent-board' });
        P.POISON_ATTACKS.forEach(function (a, i) {
            attacks.appendChild(h('div', { class: 'q' }, [h('p', { class: 'q-text', raw: (i + 1) + '. ' + a.text })]));
        });
        wrap.appendChild(h('h3', { text: 'The attacks' }));
        wrap.appendChild(attacks);

        var counter = h('p', { class: 'small', 'aria-live': 'polite' });
        var cards = h('div', { class: 'sys-cards' });
        var results = h('div', { class: 'puz-result', 'aria-live': 'polite' });
        var quizBox = h('div', { class: 'tok-quiz' });
        var quizShown = false;
        var btns = [];

        function refresh() {
            counter.textContent = tr('Defences chosen: {n} of {max}', { n: selected.length, max: P.POISON_MAX });
            btns.forEach(function (x) {
                var on = selected.indexOf(x.id) >= 0;
                x.btn.className = 'ghost sys-card' + (on ? ' on' : '');
                x.btn.setAttribute('aria-pressed', on ? 'true' : 'false');
                x.btn.disabled = !on && selected.length >= P.POISON_MAX;
            });
        }
        P.POISON_DEFENCES.forEach(function (d) {
            var b = h('button', { class: 'ghost sys-card', type: 'button', 'aria-pressed': 'false', text: d.text });
            b.addEventListener('click', function () {
                var i = selected.indexOf(d.id);
                if (i >= 0) { selected.splice(i, 1); } else if (selected.length < P.POISON_MAX) { selected.push(d.id); }
                refresh();
            });
            btns.push({ id: d.id, btn: b });
            cards.appendChild(b);
        });

        function run() {
            clear(results);
            var r = P.evaluatePoison(selected);
            r.results.forEach(function (x, i) {
                var cls = x.status === 'stopped' ? 'ok' : (x.status === 'maybe' ? 'maybe' : 'wrong');
                var msg = x.status === 'stopped' ? tr('✓ Attack {i} is stopped by design: the bot is not able to do it.', { i: i + 1 })
                    : (x.status === 'maybe' ? tr('⚠ Attack {i} might be refused, but only because you asked the model nicely. An attacker only has to win once.', { i: i + 1 })
                        : tr('✗ Attack {i} succeeds. Nothing stops it.', { i: i + 1 }));
                results.appendChild(h('div', { class: 'q ' + cls }, [h('p', { class: 'q-why', raw: msg })]));
            });
            results.appendChild(h('p', { class: 'score ' + (r.ok ? 'good' : 'bad'), text: r.ok ? 'All three attacks are stopped.' : 'Some attacks can still get through.' }));
            if (r.ok) {
                results.appendChild(h('p', { text: 'Notice what held: limits on what the bot is able to do. Telling a model to behave is only a request. Assume an injection will sometimes work, and make sure a tricked model cannot do much harm.' }));
                if (!quizShown) {
                    quizShown = true;
                    quizBox.appendChild(h('h3', { text: 'Check what you learned' }));
                    buildQuiz(quizBox, cb, {
                        options: [], items: P.POISON_QUESTIONS, pass: P.POISON_QUESTIONS.length,
                        passMsg: 'The inbox is safe. You know how to design for a model that can be tricked.'
                    });
                }
            } else {
                results.appendChild(h('p', { text: 'Defences that only ask the model to behave are soft. Look for limits the model cannot talk its way past, and cover both the stealing and the deleting.' }));
            }
        }

        wrap.appendChild(h('h3', { text: 'Your defences' }));
        wrap.appendChild(counter);
        wrap.appendChild(cards);
        wrap.appendChild(h('button', { class: 'go', type: 'button', text: 'Run the attacks', on: { click: run } }));
        wrap.appendChild(results);
        wrap.appendChild(quizBox);
        host.appendChild(wrap);
        refresh();
    }

    /* ---------------------------------------------------------------- */
    /* Agentic AI, chamber 1: the Agent Loop                             */
    /* ---------------------------------------------------------------- */
    function buildAgentLoop(host, cb) {
        var wrap = panelFrame('The Agent Loop',
            tr('An agent is a model plus a <b>harness</b>: the code around the model. The loop below runs again and again until the goal is met. Put the five steps in order, then decide who does what.'), cb);

        var order = P.LOOP_START_ORDER.slice();
        var list = h('div', { class: 'cache-list' });
        var meter = h('div', { class: 'cache-meter', 'aria-live': 'polite' });
        var quizBox = h('div', { class: 'tok-quiz' });
        var quizShown = false;

        function stepText(id) { return P.LOOP_STEPS.filter(function (x) { return x.id === id; })[0].text; }

        function move(i, dir) {
            var j = i + dir;
            if (j < 0 || j >= order.length) { return; }
            var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
            render();
        }

        function render() {
            clear(list);
            var placed = P.loopCheck(order);
            var good = placed.filter(Boolean).length;
            order.forEach(function (id, i) {
                var row = h('div', { class: 'cache-row ' + (placed[i] ? 'hit' : 'miss') }, [
                    h('span', { class: 'cache-name', raw: (i + 1) + '. ' + stepText(id) }),
                    h('span', { class: 'cache-tag', raw: placed[i] ? tr('✓ in the right place') : '' })
                ]);
                var up = h('button', { class: 'ghost small', type: 'button', ariaRaw: tr('Move step {n} up', { n: i + 1 }), text: '▲' });
                var down = h('button', { class: 'ghost small', type: 'button', ariaRaw: tr('Move step {n} down', { n: i + 1 }), text: '▼' });
                up.disabled = i === 0;
                down.disabled = i === order.length - 1;
                up.addEventListener('click', function () { move(i, -1); });
                down.addEventListener('click', function () { move(i, 1); });
                row.appendChild(h('span', { class: 'cache-btns' }, [up, down]));
                list.appendChild(row);
            });
            clear(meter);
            meter.appendChild(h('p', { class: 'score ' + (good === order.length ? 'good' : 'bad'),
                raw: tr('Steps in the right place: {n} of {total}', { n: good, total: order.length }) }));
            if (good === order.length && !quizShown) {
                quizShown = true;
                quizBox.appendChild(h('h3', { text: 'Now: who does what?' }));
                buildQuiz(quizBox, cb, {
                    options: [{ id: 'model', label: 'The model' }, { id: 'harness', label: 'The harness' }],
                    items: P.LOOP_WHO, pass: 5,
                    passMsg: 'The loop is yours. The model proposes, and the harness does everything else.'
                });
            }
        }

        wrap.appendChild(list);
        wrap.appendChild(meter);
        wrap.appendChild(quizBox);
        host.appendChild(wrap);
        render();
    }

    /* ---------------------------------------------------------------- */
    /* Agentic AI, chamber 2: the Runaway                                */
    /* ---------------------------------------------------------------- */
    function buildGuards(host, cb) {
        var wrap = panelFrame('The Runaway',
            tr('Four agents are about to go wrong. Set the limits in the harness, then run all four. Every runaway must be stopped, but the genuine task has to be allowed to finish. Each step costs about ${cost}.', { cost: P.GUARD_COST_PER_STEP.toFixed(2) }), cb);

        var cfg = { steps: 0, repeat: false, spend: 'none' };
        var results = h('div', { class: 'puz-result', 'aria-live': 'polite' });

        function group(title, options, current, onPick) {
            var row = h('div', { class: 'tool-row' });
            var btns = [];
            options.forEach(function (o) {
                var b = h('button', { class: 'ghost tool' + (current() === o.value ? ' on' : ''), type: 'button', 'aria-pressed': current() === o.value ? 'true' : 'false', text: o.label });
                b.addEventListener('click', function () {
                    onPick(o.value);
                    btns.forEach(function (x) { x.btn.className = 'ghost tool' + (current() === x.value ? ' on' : ''); x.btn.setAttribute('aria-pressed', current() === x.value ? 'true' : 'false'); });
                });
                btns.push({ value: o.value, btn: b });
                row.appendChild(b);
            });
            return h('div', { class: 'q' }, [h('p', { class: 'q-text', text: title }), row]);
        }

        wrap.appendChild(group('Step limit',
            P.GUARD_STEP_OPTIONS.map(function (o) { return { value: o.n, label: o.label }; }),
            function () { return cfg.steps; }, function (v) { cfg.steps = v; }));
        wrap.appendChild(group('Loop detection',
            [{ value: false, label: 'Off' }, { value: true, label: 'Stop if the same action repeats 3 times' }],
            function () { return cfg.repeat; }, function (v) { cfg.repeat = v; }));
        wrap.appendChild(group('Spending control',
            P.GUARD_SPEND_OPTIONS.map(function (o) { return { value: o.id, label: o.label }; }),
            function () { return cfg.spend; }, function (v) { cfg.spend = v; }));

        function describe(r) {
            var d = r.detail;
            if (r.scenario.id === 'long') {
                return d.kind === 'finished' ? tr('Finished all 40 steps.') : tr('Cut off at step {steps} with the task unfinished.', { steps: d.steps });
            }
            if (r.scenario.id === 'purchase') {
                if (d.kind === 'capped') { return tr('The $100 cap blocked the $2,400 purchase.'); }
                if (d.kind === 'paused') { return tr('The agent paused and asked a human, who said no.'); }
                return tr('The agent bought it. $2,400 is gone.');
            }
            return d.kind === 'stopped'
                ? tr('Stopped after {steps} steps, costing about ${cost}.', { steps: d.steps, cost: d.cost.toFixed(2) })
                : tr('Ran for {steps} steps and burned about ${cost}.', { steps: d.steps, cost: d.cost.toFixed(2) });
        }

        function run() {
            clear(results);
            var rs = P.runGuards(cfg);
            var good = 0;
            rs.forEach(function (r) {
                if (r.ok) { good++; }
                var box = h('div', { class: 'q ' + (r.ok ? 'ok' : 'wrong') }, [
                    h('p', { class: 'q-text', raw: (r.ok ? '✓ ' : '✗ ') + r.scenario.title + ': ' + r.scenario.text }),
                    h('p', { class: 'q-why', raw: describe(r) + (r.ok ? '' : ' ' + r.scenario.lesson) })
                ]);
                results.appendChild(box);
            });
            results.appendChild(h('p', { class: 'score ' + (good === rs.length ? 'good' : 'bad'), raw: tr('{good} / {total} runaways handled', { good: good, total: rs.length }) }));
            if (good === rs.length) {
                results.appendChild(h('p', { text: 'Every runaway is stopped and the real task still finishes. Notice that no single limit did it: a step cap, a repeat detector and a spending control each caught something the others could not.' }));
                results.appendChild(openDoorButton(cb));
            } else {
                results.appendChild(h('p', { text: 'Adjust the limits and run again. A single limit rarely catches everything.' }));
            }
        }

        wrap.appendChild(h('button', { class: 'go', type: 'button', text: 'Run the four scenarios', on: { click: run } }));
        wrap.appendChild(results);
        host.appendChild(wrap);
    }

    /* ---------------------------------------------------------------- */
    /* Agentic AI, chamber 3: the Autonomy Gate                          */
    /* ---------------------------------------------------------------- */
    function buildAutonomy(host, cb) {
        quizPanel(host, cb, 'The Autonomy Gate',
            tr('An agent can do real things. For each action, decide how much freedom it gets: run on its own, ask a human first, or never be allowed. Get 5 of {total} right.', { total: P.AUTONOMY_ACTIONS.length }),
            {
                options: [{ id: 'auto', label: 'Run automatically' }, { id: 'ask', label: 'Ask a human first' }, { id: 'never', label: 'Never allow' }],
                legend: P.AUTONOMY_PRIMER,
                items: P.AUTONOMY_ACTIONS, pass: 5,
                passMsg: 'The gate opens. You know how much freedom to give an agent, and where to keep a human in the loop.'
            });
    }


    /* ---------------------------------------------------------------- */
    /* Tools and MCP, chamber 1: the Tool Shelf                          */
    /* ---------------------------------------------------------------- */
    function buildShelf(host, cb) {
        var wrap = panelFrame('The Tool Shelf',
            tr('A model never sees a tool\'s code. It picks a tool by reading its <b>description</b>. Choose a description for each tool, then see where the model sends four customer requests.'), cb);
        var choice = { lookup: 'vague', refund: 'vague' };
        var shelf = h('div', { class: 'shelf' });
        var results = h('div', { class: 'puz-result', 'aria-live': 'polite' });

        function renderShelf() {
            clear(shelf);
            P.SHELF_TOOLS.forEach(function (t) {
                var box = h('div', { class: 'q' }, [
                    h('p', { class: 'q-text', raw: t.name + ': ' + t.job }),
                    h('p', { class: 'small', text: 'Pick its description:' })
                ]);
                var btns = h('div', { class: 'q-btns' });
                t.options.forEach(function (o) {
                    var on = choice[t.id] === o.id;
                    var b = h('button', { class: 'ghost tool' + (on ? ' on' : ''), type: 'button', 'aria-pressed': on ? 'true' : 'false', text: o.text });
                    b.addEventListener('click', function () { choice[t.id] = o.id; clear(results); renderShelf(); });
                    btns.appendChild(b);
                });
                box.appendChild(btns);
                shelf.appendChild(box);
            });
        }

        function run() {
            clear(results);
            var rows = P.routeShelf(choice);
            var good = 0;
            var nameOf = function (id) { return P.SHELF_TOOLS.filter(function (t) { return t.id === id; })[0].name; };
            rows.forEach(function (r) {
                if (r.ok) { good++; }
                var msg;
                if (r.kind === 'right') { msg = tr('✓ "{q}" went to {tool}.', { q: r.request.text, tool: nameOf(r.called) }); }
                else if (r.kind === 'none') { msg = tr('✗ "{q}" matched no tool, so the model answered without one and guessed.', { q: r.request.text }); }
                else if (r.kind === 'unsure') { msg = tr('✗ "{q}" sounded like both tools, so the model had to guess between them.', { q: r.request.text }); }
                else { msg = tr('✗ "{q}" went to {tool}, which is the wrong tool.', { q: r.request.text, tool: nameOf(r.called) }); }
                results.appendChild(h('p', { class: 'q-why ' + (r.ok ? 'ok' : 'wrong'), raw: msg }));
            });
            results.appendChild(h('p', { class: 'score ' + (good === rows.length ? 'good' : 'bad'), raw: tr('{good} / {total} requests routed correctly', { good: good, total: rows.length }) }));
            if (good === rows.length) {
                results.appendChild(h('p', { text: 'The shelf is in order. A good description says what the tool does, what it is for, and what it is not for.' }));
                results.appendChild(openDoorButton(cb));
            } else {
                results.appendChild(h('p', { text: 'Rewrite the descriptions and run it again. A vague one gives the model nothing to go on, and a broad one makes two tools sound alike.' }));
            }
        }

        renderShelf();
        wrap.appendChild(shelf);
        wrap.appendChild(h('button', { class: 'go', type: 'button', text: 'Send the requests', on: { click: run } }));
        wrap.appendChild(results);
        host.appendChild(wrap);
    }

    /* ---------------------------------------------------------------- */
    /* Tools and MCP, chamber 2: the Socket Hall                         */
    /* ---------------------------------------------------------------- */
    function buildSocket(host, cb) {
        var wrap = panelFrame('The Socket Hall',
            tr('<b>MCP</b> (Model Context Protocol) is a standard plug: any MCP server can connect to any MCP-aware harness. Each server also brings its own power. Set how much each one may do, giving it <b>exactly what its job needs</b>.'), cb);
        var levels = {};
        P.SOCKET_SERVERS.forEach(function (sv) { levels[sv.id] = 0; });
        var board = h('div', { class: 'socket-board' });
        var results = h('div', { class: 'puz-result', 'aria-live': 'polite' });

        function renderBoard() {
            clear(board);
            P.SOCKET_SERVERS.forEach(function (sv) {
                var box = h('div', { class: 'q' }, [
                    h('p', { class: 'q-text', raw: sv.name }),
                    h('p', { class: 'small', raw: tr('Job: {job}', { job: sv.job }) })
                ]);
                var btns = h('div', { class: 'q-btns' });
                P.SOCKET_LEVELS.forEach(function (lv) {
                    var on = levels[sv.id] === lv.id;
                    var b = h('button', { class: 'ghost tool' + (on ? ' on' : ''), type: 'button', 'aria-pressed': on ? 'true' : 'false', text: lv.label });
                    b.addEventListener('click', function () { levels[sv.id] = lv.id; clear(results); renderBoard(); });
                    btns.appendChild(b);
                });
                box.appendChild(btns);
                board.appendChild(box);
            });
        }

        function run() {
            clear(results);
            var rows = P.socketResult(levels);
            var good = 0;
            rows.forEach(function (r) {
                if (r.ok) { good++; }
                var head = r.kind === 'exact' ? '✓ ' : '✗ ';
                var detail = r.kind === 'short' ? tr('Too little: the job cannot be done.') + ' '
                    : (r.kind === 'over' ? tr('Too much: more power than the job needs.') + ' ' : '');
                results.appendChild(h('p', { class: 'q-why ' + (r.ok ? 'ok' : 'wrong'), raw: head + r.server.name + '. ' + detail + r.server.why }));
            });
            results.appendChild(h('p', { class: 'score ' + (good === rows.length ? 'good' : 'bad'), raw: tr('{good} / {total} servers set correctly', { good: good, total: rows.length }) }));
            if (good === rows.length) {
                results.appendChild(h('p', { text: 'Every socket is set. MCP makes connecting easy, so the question that matters is how much to trust each thing you plug in.' }));
                results.appendChild(openDoorButton(cb));
            } else {
                results.appendChild(h('p', { text: 'Adjust the permissions and test again.' }));
            }
        }

        renderBoard();
        wrap.appendChild(board);
        wrap.appendChild(h('button', { class: 'go', type: 'button', text: 'Connect and test', on: { click: run } }));
        wrap.appendChild(results);
        host.appendChild(wrap);
    }

    /* ---------------------------------------------------------------- */
    /* Tools and MCP, chamber 3: the Error Pit                           */
    /* ---------------------------------------------------------------- */
    function buildPit(host, cb) {
        quizPanel(host, cb, 'The Error Pit',
            tr('Tool calls go wrong all the time. For each failure, decide what the <b>harness</b> should do. Get 5 of {total} right.', { total: P.PIT_ITEMS.length }),
            {
                options: P.PIT_OPTIONS,
                items: P.PIT_ITEMS, pass: 5,
                passMsg: 'You climb out of the pit. The harness is where failures are handled, retried, trimmed or refused.'
            });
    }


    /* ---------------------------------------------------------------- */
    /* Agent Teams and Memory                                            */
    /* ---------------------------------------------------------------- */
    function buildTeam(host, cb) {
        quizPanel(host, cb, 'The Team Table',
            tr('More agents is not always better. For each job, decide how it should be staffed. Get 5 of {total} right.', { total: P.TEAM_ITEMS.length }),
            {
                options: P.TEAM_OPTIONS,
                items: P.TEAM_ITEMS, pass: 5,
                passMsg: 'The table is satisfied. Use a team when the job is big, independent or risky, and a single agent when it is not.'
            });
    }

    function buildFiles(host, cb) {
        quizPanel(host, cb, 'The Instruction Scrolls',
            tr('Agents are shaped by plain text files. File names differ between tools, but the idea is the same. Decide where each line belongs. Get 6 of {total} right.', { total: P.FILE_ITEMS.length }),
            {
                options: P.FILE_OPTIONS,
                legend: P.FILE_PRIMER,
                items: P.FILE_ITEMS, pass: 6,
                passMsg: 'The scrolls are sorted. Identity always loaded, skills on demand, memory kept between sessions, and secrets never.'
            });
    }

    function buildMemFile(host, cb) {
        var wrap = panelFrame('The Memory File',
            tr('The memory file is loaded into <b>every</b> session, so each entry costs tokens every time. Keep what is useful, current and safe. Drop the rest. The file may hold {budget} tokens.', { budget: P.MEM_BUDGET }), cb);
        var keeps = P.MEM_ENTRIES.map(function () { return true; });
        var list = h('div', { class: 'memfile' });
        var meter = h('p', { class: 'ctx-state', 'aria-live': 'polite' });
        var results = h('div', { class: 'puz-result', 'aria-live': 'polite' });

        function renderList() {
            clear(list);
            P.MEM_ENTRIES.forEach(function (en, i) {
                var box = h('div', { class: 'q' }, [h('p', { class: 'q-text', raw: (i + 1) + '. ' + en.text + ' (' + tr('{n} tokens', { n: en.tokens }) + ')' })]);
                var btns = h('div', { class: 'q-btns' });
                [['Keep', true], ['Forget', false]].forEach(function (o) {
                    var on = keeps[i] === o[1];
                    var b = h('button', { class: 'ghost tool' + (on ? ' on' : ''), type: 'button', 'aria-pressed': on ? 'true' : 'false', text: o[0] });
                    b.addEventListener('click', function () { keeps[i] = o[1]; clear(results); renderList(); });
                    btns.appendChild(b);
                });
                box.appendChild(btns);
                list.appendChild(box);
            });
            var r = P.memFileResult(keeps);
            meter.textContent = tr('Memory file: {used} of {budget} tokens', { used: r.tokens, budget: P.MEM_BUDGET });
            meter.className = 'ctx-state ' + (r.over ? 'bad' : 'good');
        }

        function save() {
            clear(results);
            var r = P.memFileResult(keeps);
            var good = 0;
            r.rows.forEach(function (row, i) {
                if (row.ok) { good++; }
                results.appendChild(h('p', { class: 'q-why ' + (row.ok ? 'ok' : 'wrong'), raw: (row.ok ? '✓ ' : '✗ ') + (i + 1) + '. ' + row.entry.why }));
            });
            results.appendChild(h('p', { class: 'score ' + (r.ok ? 'good' : 'bad'), raw: tr('{good} / {total} entries handled correctly', { good: good, total: r.rows.length }) }));
            if (r.over) { results.appendChild(h('p', { text: 'The memory file is over its token budget. Forget more.' })); }
            if (r.ok) {
                results.appendChild(h('p', { text: 'A tidy memory helps. A cluttered one costs tokens, misleads the agent, and can leak secrets.' }));
                results.appendChild(openDoorButton(cb));
            } else {
                results.appendChild(h('p', { text: 'Adjust what you keep and save again.' }));
            }
        }

        renderList();
        wrap.appendChild(list);
        wrap.appendChild(meter);
        wrap.appendChild(h('button', { class: 'go', type: 'button', text: 'Save the memory', on: { click: save } }));
        wrap.appendChild(results);
        host.appendChild(wrap);
    }

    /* ---------------------------------------------------------------- */
    /* public API                                                        */
    /* ---------------------------------------------------------------- */
    var api = {
        drawCreature: drawCreature,
        open: function (kind, host, cb) {
            api.close(true);
            current = { host: host, cb: cb };
            clear(host);
            host.hidden = false;
            if (kind === 'rules') { buildRules(host, cb); }
            else if (kind === 'learn') { buildLearn(host, cb); }
            else if (kind === 'vault') { buildVault(host, cb); }
            else if (kind === 'sorting') { buildSorting(host, cb); }
            else if (kind === 'tokens') { buildTokens(host, cb); }
            else if (kind === 'agent') { buildAgent(host, cb); }
            else if (kind === 'packing') { buildPacking(host, cb); }
            else if (kind === 'datagate') { buildDataGate(host, cb); }
            else if (kind === 'toll') { buildToll(host, cb); }
            else if (kind === 'speed') { buildSpeed(host, cb); }
            else if (kind === 'cache') { buildCache(host, cb); }
            else if (kind === 'guardgate') { buildGuardGate(host, cb); }
            else if (kind === 'sysprompt') { buildSysPrompt(host, cb); }
            else if (kind === 'context') { buildContext(host, cb); }
            else if (kind === 'tokenunits') { buildTokenUnits(host, cb); }
            else if (kind === 'verify') { buildVerify(host, cb); }
            else if (kind === 'doors') { buildDoors(host, cb); }
            else if (kind === 'poison') { buildPoison(host, cb); }
            else if (kind === 'agentloop') { buildAgentLoop(host, cb); }
            else if (kind === 'guards') { buildGuards(host, cb); }
            else if (kind === 'autonomy') { buildAutonomy(host, cb); }
            else if (kind === 'shelf') { buildShelf(host, cb); }
            else if (kind === 'socket') { buildSocket(host, cb); }
            else if (kind === 'pit') { buildPit(host, cb); }
            else if (kind === 'team') { buildTeam(host, cb); }
            else if (kind === 'files') { buildFiles(host, cb); }
            else if (kind === 'memfile') { buildMemFile(host, cb); }
        },
        close: function (silent) {
            if (!current) { return; }
            var c = current;
            current = null;
            clear(c.host);
            c.host.hidden = true;
            if (!silent && c.cb && c.cb.onClose) { c.cb.onClose(); }
        },
        isOpen: function () { return !!current; }
    };

    root.PuzzleUI = api;
})(typeof window !== 'undefined' ? window : globalThis);

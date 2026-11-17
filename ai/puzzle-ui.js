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

    /* ---------------------------------------------------------------- */
    /* tiny DOM helpers                                                  */
    /* ---------------------------------------------------------------- */
    function h(tag, props, kids) {
        var e = document.createElement(tag);
        props = props || {};
        Object.keys(props).forEach(function (k) {
            var v = props[k];
            if (k === 'class') { e.className = v; }
            else if (k === 'text') { e.textContent = v; }
            else if (k === 'html') { e.innerHTML = v; } // only ever used with my own constant strings
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
        return names.length ? names.join(', ') : 'no marks';
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
        var props = { class: 'cr ' + (opts.cls || ''), title: markNames(mask) };
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
        var wrap = h('div', { class: 'puz' }, [head, h('p', { class: 'puz-intro', html: intro })]);
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
            'This golem follows <b>rules a person wrote</b>. Study the labelled creatures in the bestiary, then write up to three rules. ' +
            'A rule fires when a creature has <b>all</b> the marks you pick. Anything no rule catches is called friendly. ' +
            'Score ' + P.PASS_PCT + '% or more on 20 new arrivals and it steps aside.', cb);

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
            result.appendChild(h('p', { class: 'score ' + (r.pct >= P.PASS_PCT ? 'good' : 'bad'), text: r.correct + ' / ' + r.total + ' correct (' + r.pct + '%)' }));
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
                result.appendChild(h('p', { text: 'Missed ' + missed + ' hostile creature' + (missed === 1 ? '' : 's') + ' and raised ' + alarms + ' false alarm' + (alarms === 1 ? '' : 's') +
                    '. Look at the creatures it got wrong. What do they have in common?' }));
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
            'Nobody wrote a rule for this golem. Instead it will <b>learn from examples</b>: pick between ' + P.LEARN_MIN_PICK + ' and ' + P.LEARN_MAX_PICK +
            ' labelled creatures and it adjusts its internal <b>weights</b> to fit them. Then it faces 24 creatures it has never seen. Reach ' + P.PASS_PCT + '% to pass.', cb);

        var counter = h('p', { class: 'small' });
        var bestiary = h('div', { class: 'cr-grid' });
        var trainBtn = h('button', { class: 'go', type: 'button', text: 'Train the golem' });
        var result = h('div', { class: 'puz-result', 'aria-live': 'polite' });

        function refreshPicks() {
            var n = pickedList().length;
            counter.textContent = 'Selected ' + n + ' / ' + P.LEARN_MAX_PICK + '  (needs at least ' + P.LEARN_MIN_PICK + ')';
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
            result.appendChild(h('p', { class: 'score ' + (r.pct >= P.PASS_PCT ? 'good' : 'bad'), text: 'On 24 unseen creatures: ' + r.correct + ' correct (' + r.pct + '%)' }));
            result.appendChild(h('h3', { text: 'What the golem learned (its weights)' }));
            result.appendChild(weightBars(model));
            result.appendChild(h('p', { class: 'small', text: 'A bigger positive weight means that mark pushes the golem toward "hostile". Nobody typed these in. They were fitted to your examples.' }));

            var grid = h('div', { class: 'cr-grid small' });
            r.results.forEach(function (x) {
                grid.appendChild(creatureCard(x.mask, { cls: x.ok ? 'ok' : 'wrong', note: x.ok ? '✓' : (x.truth ? 'missed' : 'false alarm') }));
            });
            result.appendChild(grid);

            result.appendChild(h('p', { class: 'compare', html: '<b>Compare:</b> the best three hand-written rules, tuned on this same bestiary, score <b>' + base.trainPct +
                '%</b> on it, but only <b>' + base.testPct + '%</b> on creatures they have never seen. Rules fitted by hand to known cases tend to break on new ones.' }));

            var hist = h('ul', { class: 'attempts' });
            attempts.forEach(function (a, i) {
                hist.appendChild(h('li', { text: 'Attempt ' + (i + 1) + ': trained on ' + a.n + ' examples → ' + a.pct + '%' }));
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
    /* Chamber 3: the Vault of Choices                                   */
    /* ---------------------------------------------------------------- */
    function buildVault(host, cb) {
        var answers = {}; // index -> 'rules' | 'learn'
        var wrap = panelFrame('The Vault of Choices',
            'For each job, would you write <b>rules</b> by hand, or have software <b>learn from examples</b>? Get ' + P.QUIZ_PASS + ' of ' + P.SCENARIOS.length + ' right to open the vault.', cb);
        var list = h('div', { class: 'quiz' });
        var footer = h('div', { class: 'puz-result', 'aria-live': 'polite' });

        function answeredCount() { return Object.keys(answers).length; }
        function score() {
            var s = 0;
            P.SCENARIOS.forEach(function (sc, i) { if (answers[i] === sc.answer) { s++; } });
            return s;
        }

        function renderFooter() {
            clear(footer);
            if (answeredCount() < P.SCENARIOS.length) {
                footer.appendChild(h('p', { class: 'small', text: answeredCount() + ' / ' + P.SCENARIOS.length + ' answered' }));
                return;
            }
            var s = score();
            footer.appendChild(h('p', { class: 'score ' + (s >= P.QUIZ_PASS ? 'good' : 'bad'), text: s + ' / ' + P.SCENARIOS.length + ' correct' }));
            if (s >= P.QUIZ_PASS) {
                footer.appendChild(h('p', { text: 'The vault opens. You can tell when a job calls for rules and when it calls for learning.' }));
                footer.appendChild(openDoorButton(cb));
            } else {
                footer.appendChild(h('p', { text: 'Not quite. Read the explanations, then try again.' }));
                footer.appendChild(h('button', { class: 'go', type: 'button', text: 'Try again', on: { click: function () { answers = {}; renderQuiz(); } } }));
            }
        }

        function renderQuiz() {
            clear(list);
            P.SCENARIOS.forEach(function (sc, i) {
                var done = answers[i] !== undefined;
                var right = answers[i] === sc.answer;
                var card = h('div', { class: 'q ' + (done ? (right ? 'ok' : 'wrong') : '') }, [h('p', { class: 'q-text', text: (i + 1) + '. ' + sc.text })]);
                var btns = h('div', { class: 'q-btns' });
                [['rules', 'Write rules'], ['learn', 'Learn from examples']].forEach(function (opt) {
                    var b = h('button', { class: 'ghost', type: 'button', text: opt[1] });
                    b.disabled = done;
                    b.addEventListener('click', function () { answers[i] = opt[0]; renderQuiz(); });
                    btns.appendChild(b);
                });
                card.appendChild(btns);
                if (done) {
                    card.appendChild(h('p', { class: 'q-why', text: (right ? '✓ Correct. ' : '✗ Not quite. ') + sc.why }));
                }
                list.appendChild(card);
            });
            renderFooter();
        }

        wrap.appendChild(list);
        wrap.appendChild(footer);
        host.appendChild(wrap);
        renderQuiz();
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

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
                footer.appendChild(h('p', { class: 'small', text: answeredCount() + ' / ' + total + ' answered' }));
                return;
            }
            var s = score();
            footer.appendChild(h('p', { class: 'score ' + (s >= cfg.pass ? 'good' : 'bad'), text: s + ' / ' + total + ' correct' }));
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
                var card = h('div', { class: 'q ' + (done ? (right ? 'ok' : 'wrong') : '') }, [h('p', { class: 'q-text', text: (i + 1) + '. ' + it.text })]);
                var btns = h('div', { class: 'q-btns' });
                (it.options || cfg.options).forEach(function (opt) {
                    var b = h('button', { class: 'ghost', type: 'button', text: opt.label });
                    b.disabled = done;
                    b.addEventListener('click', function () { answers[i] = opt.id; renderQuiz(); });
                    btns.appendChild(b);
                });
                card.appendChild(btns);
                if (done) {
                    card.appendChild(h('p', { class: 'q-why', text: (right ? '✓ Correct. ' : '✗ Not quite. ') + it.why }));
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
            'For each job, would you write <b>rules</b> by hand, or have software <b>learn from examples</b>? Get ' + P.QUIZ_PASS + ' of ' + P.SCENARIOS.length + ' right to open the vault.',
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
            'Different jobs call for different <b>kinds</b> of model. Match each job to the right kind. Get 7 of ' + P.SORTING_JOBS.length + ' right.',
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
            'A language model writes <b>one token at a time</b>. At every step it has a probability for each possible next token. <b>You are the model</b>: pick the next token for each prompt. ' +
            '<span class="small">(The odds here are made up for the game.)</span>', cb);
        var stage = h('div', { class: 'tok-stage' });
        var quizBox = h('div', { class: 'tok-quiz' });
        var state = { prompt: 0, step: 0, text: P.TOKEN_PROMPTS[0].start, notes: [] };

        function renderStage() {
            clear(stage);
            var pr = P.TOKEN_PROMPTS[state.prompt];
            stage.appendChild(h('p', { class: 'small', text: 'Prompt ' + (state.prompt + 1) + ' of ' + P.TOKEN_PROMPTS.length }));
            stage.appendChild(h('p', { class: 'tok-text' }, [state.text, h('span', { class: 'tok-cursor', text: '▌' })]));
            var options = pr.steps[state.step];
            var maxP = options.reduce(function (m, o) { return Math.max(m, o.p); }, 0);
            var opts = h('div', { class: 'tok-opts' });
            options.forEach(function (o) {
                var fill = h('div', { class: 'tok-fill' });
                fill.style.width = Math.round(o.p / maxP * 100) + '%';
                var b = h('button', { class: 'tok', type: 'button', 'aria-label': 'Pick ' + o.t.trim() + ' at ' + o.p + ' percent' }, [
                    h('span', { class: 'tok-label', text: o.t.replace(/^ /, '␣') }),
                    h('div', { class: 'tok-track' }, [fill]),
                    h('span', { class: 'tok-pct', text: o.p + '%' })
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
            'A model on its own can only produce text. An <b>agent</b> is a model plus <b>tools</b>, run in a loop. For each task, hand over <b>only the tools it needs</b>. ' +
            'Extra tools cost money and give attackers more to abuse.', cb);
        var chosen = P.AGENT_TASKS.map(function () { return []; });
        var results = h('div', { class: 'puz-result', 'aria-live': 'polite' });
        var board = h('div', { class: 'agent-board' });

        P.AGENT_TASKS.forEach(function (task, i) {
            var box = h('div', { class: 'q' }, [h('p', { class: 'q-text', text: (i + 1) + '. ' + task.text })]);
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
                    : '✗ ' + (i + 1) + '. ' + (r.missing.length ? 'Missing: ' + r.missing.map(labelOf).join(', ') + '. ' : '') +
                        (r.extra.length ? 'Not needed: ' + r.extra.map(labelOf).join(', ') + '. ' : '') + task.why;
                results.appendChild(h('p', { class: 'q-why ' + (r.ok ? 'ok' : 'wrong'), text: msg }));
            });
            results.appendChild(h('p', { class: 'score ' + (good === P.AGENT_TASKS.length ? 'good' : 'bad'), text: good + ' / ' + P.AGENT_TASKS.length + ' tasks equipped correctly' }));
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
            'A local model has to fit in your machine\'s memory. Three machines, three choices: pick the <b>best model that fits</b>. ' +
            '<b>Quantization</b> shrinks a model by storing its numbers with less precision, at a small cost in quality. <span class="small">(Sizes and quality scores are rough illustrations.)</span>', cb);
        var round = 0;
        var stage = h('div', { class: 'pack-stage' });
        var feedback = h('div', { class: 'puz-result', 'aria-live': 'polite' });

        function renderRound() {
            clear(stage);
            clear(feedback);
            var r = P.PACK_ROUNDS[round];
            stage.appendChild(h('h3', { text: 'Round ' + (round + 1) + ' of ' + P.PACK_ROUNDS.length + ': ' + r.machine }));
            var grid = h('div', { class: 'pack-grid' });
            P.PACK_OPTIONS.forEach(function (o) {
                var fits = o.gb <= r.budget;
                var fill = h('div', { class: 'tok-fill' });
                fill.style.width = Math.round(o.quality / 10 * 100) + '%';
                var b = h('button', { class: 'pack' + (fits ? '' : ' nofit'), type: 'button', 'aria-label': o.label + ', ' + o.gb + ' gigabytes' }, [
                    h('span', { class: 'pack-name', text: o.label }),
                    h('span', { class: 'pack-gb', text: o.gb + ' GB' + (fits ? '' : ' (too big)') }),
                    h('div', { class: 'tok-track' }, [fill]),
                    h('span', { class: 'small', text: 'quality ' + o.quality })
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
                feedback.appendChild(h('p', { class: 'score bad', text: 'That needs ' + o.gb + ' GB and this machine has ' + r.budget + ' GB. It will not load.' }));
                return;
            }
            if (o.id !== best.id) {
                feedback.appendChild(h('p', { class: 'score bad', text: 'It fits, but there is a better one. Something with a higher quality score still fits in ' + r.budget + ' GB.' }));
                return;
            }
            feedback.appendChild(h('p', { class: 'score good', text: '✓ ' + best.label + ' is the best fit.' }));
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
            'Where should each job run: on <b>your own machine</b> (local) or on a <b>provider\'s servers</b> (cloud)? Think about privacy, connectivity, power and cost. Get 5 of ' + P.DATA_GATE.length + ' right.',
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
            'The cloud charges <b>per use</b>. Running locally is a <b>fixed monthly cost</b> (hardware spread over time, plus power). Slide the workload and watch which is cheaper. ' +
            '<span class="small">(Illustrative prices: about $' + (T.cloudPerRequest * 1000).toFixed(0) + ' per 1,000 requests in the cloud, $' + T.localMonthly + ' a month local.)</span>', cb);

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
            perDay.textContent = n.toLocaleString() + ' requests a day';
            cloudFill.style.width = Math.round(c.cloud / max * 100) + '%';
            localFill.style.width = Math.round(c.local / max * 100) + '%';
            cloudVal.textContent = '$' + c.cloud.toFixed(0);
            localVal.textContent = '$' + c.local.toFixed(0);
            verdict.className = 'score ' + (c.cheaper === 'local' ? 'good' : 'bad');
            verdict.textContent = c.cheaper === 'same' ? 'Dead even.' : (c.cheaper === 'cloud' ? 'The cloud is cheaper at this volume.' : 'Local is cheaper at this volume.');
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

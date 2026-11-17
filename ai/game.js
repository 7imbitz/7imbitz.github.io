/*
 * Dungeon of Weights (browser, canvas, no dependencies).
 * Game rules live in logic.js, puzzle logic in puzzles.js, puzzle panels in
 * puzzle-ui.js. This file is the hub, rendering, input and story.
 */
(function () {
    'use strict';

    var L = window.Logic;
    var UI = window.PuzzleUI;
    var TILE = 16;
    var COLS = L.COLS;
    var ROWS = L.ROWS;
    var STEP_MS = 380;       // how often Pip takes a step
    var HERO_REPEAT_MS = 90; // key-repeat limit for the Hero

    /* ------------------------------------------------------------------ */
    /* DOM                                                                 */
    /* ------------------------------------------------------------------ */
    var canvas = document.getElementById('screen');
    canvas.width = COLS * TILE;
    canvas.height = ROWS * TILE;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    var $ = function (id) { return document.getElementById(id); };
    var el = {
        overlay: $('overlay'), ovTitle: $('ov-title'), ovText: $('ov-text'),
        ovBtn: $('ov-btn'), ovHint: $('ov-hint'),
        temp: $('temp'), tValue: $('t-value'), tLabel: $('t-label'),
        tDown: $('t-down'), tUp: $('t-up'),
        bars: $('bars'), hp: $('hp'), objective: $('objective'),
        note: $('note'), floorLabel: $('floor-label'), log: $('log'),
        hub: $('hub'), hubGroups: $('hub-groups'), game: $('game'),
        toHub: $('to-hub'), backLink: $('back-link'),
        screenWrap: $('screen-wrap'), puzzle: $('puzzle'),
        hud: $('hud'), panelDial: $('panel-dial'), panelBars: $('panel-bars'),
        pipTitle: $('pip-title'), logPanel: $('log-panel'), keysDial: $('keys-dial')
    };

    /* ------------------------------------------------------------------ */
    /* Pixel art (drawn in code, 8x8 sprites at 2x)                        */
    /* ------------------------------------------------------------------ */
    var PAL = {
        o: '#1b1230', h: '#c9742e', s: '#f2c9a0', e: '#1b1230', b: '#3a86ff',
        w: '#ffffff', c: '#4cc9f0', d: '#14213d', m: '#ef476f', a: '#ffd166',
        n: '#8d5a2b', y: '#ffd166', g: '#9b97b8', r: '#4cc9f0'
    };

    var SPRITES = {
        hero: [
            '..oooo..',
            '.ohhhho.',
            '.osesseo',
            '.ossssso',
            '..obbo..',
            '.obbbbo.',
            '.osbbso.',
            '..oo.oo.'
        ],
        pip: [
            '...a....',
            '...a....',
            '..cccc..',
            '.cccccc.',
            'cwdccwdc',
            'cccccccc',
            'ccmmmmcc',
            '.cccccc.'
        ],
        chest: [
            '.oooooo.',
            'onnnnnno',
            'onnnnnno',
            'oyyyyyyo',
            'onnyynno',
            'onnnnnno',
            'onnnnnno',
            '.oooooo.'
        ],
        golem: [
            '..oooo..',
            '.oggggo.',
            '.oeggeo.',
            '.oggggo.',
            'oggrrggo',
            'oggrrggo',
            '.oggggo.',
            '.oo..oo.'
        ]
    };

    function makeSprite(rows, override) {
        var c = document.createElement('canvas');
        c.width = TILE;
        c.height = TILE;
        var g = c.getContext('2d');
        for (var y = 0; y < rows.length; y++) {
            for (var x = 0; x < rows[y].length; x++) {
                var ch = rows[y][x];
                var color = (override && override[ch]) || PAL[ch];
                if (ch !== '.' && color) {
                    g.fillStyle = color;
                    g.fillRect(x * 2, y * 2, 2, 2);
                }
            }
        }
        return c;
    }

    var sprite = {};
    Object.keys(SPRITES).forEach(function (k) { sprite[k] = makeSprite(SPRITES[k]); });
    // one golem per puzzle, told apart by the colour of its rune
    var GOLEM_RUNE = { rules: '#4cc9f0', learn: '#06d6a0', vault: '#ffd166' };
    Object.keys(GOLEM_RUNE).forEach(function (k) { sprite['golem_' + k] = makeSprite(SPRITES.golem, { r: GOLEM_RUNE[k] }); });

    function hash(x, y) {
        var h = (x * 374761393 + y * 668265263) | 0;
        h = (h ^ (h >>> 13)) * 1274126177;
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }

    function drawFloor(g, px, py, tx, ty) {
        g.fillStyle = (tx + ty) % 2 ? '#2b2547' : '#272142';
        g.fillRect(px, py, TILE, TILE);
        g.fillStyle = '#332c55';
        for (var i = 0; i < 3; i++) {
            var r = hash(tx * 7 + i, ty * 13 + i);
            var r2 = hash(tx * 3 + i * 5, ty * 11 + i);
            g.fillRect(px + Math.floor(r * 14), py + Math.floor(r2 * 14), 1, 1);
        }
    }

    function drawWall(g, px, py) {
        g.fillStyle = '#4a3d7a';
        g.fillRect(px, py, TILE, TILE);
        g.fillStyle = '#362c5c';
        g.fillRect(px, py + 7, TILE, 1);
        g.fillRect(px, py + 15, TILE, 1);
        g.fillRect(px + 4, py, 1, 7);
        g.fillRect(px + 12, py + 8, 1, 7);
        g.fillStyle = '#5d4f93';
        g.fillRect(px, py, TILE, 1);
        g.fillRect(px, py + 8, TILE, 1);
    }

    function drawSpikes(g, px, py) {
        g.fillStyle = '#1c1736';
        g.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
        for (var k = 0; k < 3; k++) {
            var x0 = px + 2 + k * 4;
            for (var r = 0; r < 9; r++) {
                var w = 1 + Math.floor(r / 3) * 1;
                g.fillStyle = r < 2 ? '#ffffff' : '#c9c9dc';
                g.fillRect(x0 + Math.floor((4 - w) / 2), py + 3 + r, w, 1);
            }
        }
        g.fillStyle = '#7d1a38';
        g.fillRect(px + 2, py + 12, 12, 2);
    }

    // Static background (floor, walls, spikes) is rendered once per room.
    function renderBackground(room) {
        var c = document.createElement('canvas');
        c.width = COLS * TILE;
        c.height = ROWS * TILE;
        var g = c.getContext('2d');
        for (var y = 0; y < ROWS; y++) {
            for (var x = 0; x < COLS; x++) {
                var t = L.tileAt(room, x, y);
                var px = x * TILE;
                var py = y * TILE;
                if (t === '#') { drawWall(g, px, py); }
                else if (t === 'S') { drawFloor(g, px, py, x, y); drawSpikes(g, px, py); }
                else { drawFloor(g, px, py, x, y); }
            }
        }
        return c;
    }

    function drawDoor(x, y, open) {
        var px = x * TILE;
        var py = y * TILE;
        if (open) {
            ctx.fillStyle = '#0a0714';
            ctx.fillRect(px, py, TILE, TILE);
            ctx.fillStyle = '#ffd16666';
            ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
            ctx.fillStyle = '#0a0714';
            ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 4);
        } else {
            ctx.fillStyle = '#6b4423';
            ctx.fillRect(px, py, TILE, TILE);
            ctx.fillStyle = '#4a2f17';
            ctx.fillRect(px + 5, py, 1, TILE);
            ctx.fillRect(px + 10, py, 1, TILE);
            ctx.fillStyle = '#9a9ab0';
            ctx.fillRect(px, py + 3, TILE, 2);
            ctx.fillRect(px, py + 11, TILE, 2);
            ctx.fillStyle = '#ffd166';
            ctx.fillRect(px + 7, py + 7, 3, 3);
        }
    }

    function drawPlate(x, y, active, time) {
        var px = x * TILE;
        var py = y * TILE;
        ctx.fillStyle = '#1c1736';
        ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
        ctx.fillStyle = '#7a6bb0';
        ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
        var pulse = Math.floor((Math.sin(time / 250) + 1) * 1.5);
        ctx.fillStyle = active ? '#06d6a0' : (pulse > 1 ? '#ffd166' : '#e0a93c');
        ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
        ctx.fillStyle = active ? '#b6ffe9' : '#fff3c4';
        ctx.fillRect(px + 6, py + 6, TILE - 12, TILE - 12);
    }

    function drawBubble(px, py, kind) {
        // small speech bubble above a character
        var bx = px + 3;
        var by = py - 8;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bx, by, 10, 8);
        ctx.fillRect(bx + 4, by + 8, 2, 2);
        ctx.fillStyle = '#1b1230';
        if (kind === '!') {
            ctx.fillRect(bx + 4, by + 1, 2, 4);
            ctx.fillRect(bx + 4, by + 6, 2, 1);
        } else {
            ctx.fillRect(bx + 1, by + 5, 2, 2);
            ctx.fillRect(bx + 4, by + 5, 2, 2);
            ctx.fillRect(bx + 7, by + 5, 2, 2);
        }
    }

    /* ------------------------------------------------------------------ */
    /* Story text                                                          */
    /* ------------------------------------------------------------------ */
    // Dungeon-level intro and clear text, keyed by dungeon id.
    var DUNGEON_STORY = {
        ai: {
            intro: [
                ['Everything down here claims to be <b>intelligent</b>: the golems, the doors, even the traps. Before you trust any of them, ask a simple question: <b>what is AI?</b>'],
                ['Normal software follows <b>rules</b> a person wrote: IF this, THEN that. Modern AI usually means software that <b>learns patterns from examples</b> instead.',
                    'Three chambers lie ahead. Two golems guard doors: one runs on rules, one learns. Find out when you would trust each.',
                    '<span class="tip">Walk into a golem to challenge it.</span>']
            ],
            introButton: 'Enter the dungeon',
            clearTitle: 'What Is AI? cleared!',
            clear: [
                ['<b>Loot: Pip!</b> Your first AI companion joins you.',
                    '<b>Rules</b> do exactly what you wrote, so they are predictable and explainable, but only cover cases you thought of.',
                    '<b>Learning</b> finds the pattern from examples, so it copes with fuzzy problems and new cases, but it can be wrong and it needs good data.'],
                ['How the words fit together: <b>AI</b> is the broad field. <b>Machine learning</b> is the part that learns from data. <b>Deep learning</b> uses large neural networks. <b>LLMs</b>, the chatbots, are deep-learning models trained on huge amounts of text.',
                    '<span class="tip">Next: the Forge (bonus) lets you tweak Pip. Kinds of Models and Local vs Cloud are coming soon.</span>']
            ],
            clearButton: 'Back to the dungeons'
        },
        forge: {
            intro: [
                ['Welcome to the <b>Forge</b>. Local models are tuned with a <b>modelfile</b>: a small config that sets how a model behaves.',
                    'Pip is a tiny model in a small pixel body. You steer the Hero, but Pip decides its <i>own</i> moves, and you control <b>how</b> it decides.',
                    'This bonus dungeon teaches one dial: <b>temperature</b>.']
            ],
            introButton: 'Enter the Forge',
            clearTitle: 'The Forge cleared!',
            clear: [
                ['<b>Loot: the Temperature Dial.</b> Yours to keep.',
                    'Low temperature gives focused, repeatable output: good for facts, code and precision. High temperature gives varied, exploratory output: good for ideas and stories, but riskier.',
                    'Real models work the same way: temperature rescales the odds of every possible next token.'],
                ['<span class="tip">More dials are coming: <b>num_ctx</b> (how much Pip can remember) and the system prompt.</span>']
            ],
            clearButton: 'Back to the dungeons'
        }
    };

    var STORY = {
        rules: [
            ['The <b>Rule Golem</b> decides if a creature is hostile or friendly using <b>rules a person wrote</b>. You are that person.',
                'Study the labelled creatures in the bestiary. Write up to three rules (a rule fires when a creature has <b>all</b> the marks you pick). Then the golem faces 20 new arrivals.',
                '<span class="tip">Walk into the golem to begin.</span>']
        ],
        learn: [
            ['Writing rules works when the pattern is simple enough to write down. This golem faces something fuzzier: creatures with <b>enough</b> threat marks are hostile, but nobody wrote down how many, or which.',
                'So you will <b>show it examples</b> instead and it will fit its own weights. Then it must handle creatures it has never seen.',
                '<span class="tip">Walk into the golem to begin.</span>']
        ],
        vault: [
            ['The last door tests your judgement. For each job, would you write <b>rules</b> or have software <b>learn from examples</b>?',
                '<span class="tip">Walk into the golem to begin.</span>']
        ],
        wander: [
            ['Pip wants to reach the glowing plate. Every step it <b>scores</b> its four possible moves (closer to the plate scores higher) and then <b>picks one</b>.',
                'The bars under the map show Pip\'s chance of each move, just like an LLM\'s next-token odds.'],
            ['<b>Temperature</b> controls the pick. Low means Pip always takes its best-scoring move. High means it sometimes takes a worse one.',
                'This room is a safe experiment. Send Pip across <b>once cold</b> (dial near 0) and <b>once hot</b> (1.5 or more). Pip leaves footprints so you can compare the two paths.',
                '<span class="tip">The dial starts at 0. Use Q / E or the slider. The door opens when you have done both runs.</span>']
        ],
        hall: [
            ['The dial carries over from the last room. This hall is lined with spikes. Pip knows they are bad (they lower a move\'s score), but a lower score is not a zero chance.',
                'Run it cold, then warm the dial up a little and watch the <b>decision log</b> under the map.',
                '<span class="tip">How warm is too warm?</span>']
        ],
        garden: [
            ['Cold Pip always picks its top choice. Here, the top choice is "go straight at the plate", even when a wall is in the way.',
                'Pip can\'t plan around the wall. It needs a little <b>randomness</b> to wander off the straight path and find the gap.',
                '<span class="tip">If Pip keeps bonking the wall, raise the temperature.</span>']
        ],
        gap: [
            ['Two problems in one room. Pip must <b>find the gap</b> (needs some randomness) and then <b>cross the spiky floor</b> (needs focus).',
                'Too cold and Pip is stuck. Too hot and it stumbles onto spikes.',
                '<span class="tip">You can change the dial at any time, even mid-run. Find the sweet spot.</span>']
        ],
        treasure: [
            ['A quiet room with a chest. Pip tries to follow you, but at higher temperatures it wanders off.',
                '<span class="tip">Try different temperatures while you walk to the chest.</span>']
        ]
    };

    /* ------------------------------------------------------------------ */
    /* Game state                                                          */
    /* ------------------------------------------------------------------ */
    var S = {
        mode: 'hub',         // 'hub' | 'overlay' | 'play' | 'puzzle'
        dungeon: null,
        progress: { cleared: {} },
        puzzleSolved: false,
        roomIndex: 0,
        room: null,
        bg: null,
        hero: { x: 1, y: 1 },
        pip: { x: 1, y: 1, hp: L.PIP_MAX_HP, doorOpen: false, done: false },
        T: 0.0,
        acc: 0,
        trail: [],           // Pip's footprints: {x, y, t}
        trial: { cold: null, hot: null }, // Wander Test: steps taken by each run
        runSteps: 0,         // steps in the current trial run
        runTSum: 0,          // sum of temperatures over the current trial run
        pipWait: 0,          // ms Pip rests on the plate between trial runs
        bumpStreak: 0,
        bumpT: 0,
        bumpDir: 0,
        hurtT: 0,
        stuckHinted: false,
        lessons: {},         // lesson cards already shown this playthrough
        log: [],             // Pip's recent decisions, newest last
        roomSteps: 0,        // Pip steps taken in the current room (log numbering)
        faints: 0,
        steps: 0,
        noteText: '',
        noteKind: '',
        noteUntil: 0,
        lastHeroMove: 0,
        time: 0
    };

    /* ------------------------------------------------------------------ */
    /* Overlay (dialogs)                                                   */
    /* ------------------------------------------------------------------ */
    var overlayState = null;

    function showOverlay(opts) {
        // opts: {title, pages: [[html paragraphs]], button, onDone}
        overlayState = { opts: opts, page: 0 };
        S.mode = 'overlay';
        el.ovTitle.textContent = opts.title;
        el.overlay.hidden = false;
        renderOverlayPage();
    }

    function renderOverlayPage() {
        var o = overlayState.opts;
        var page = o.pages[overlayState.page];
        el.ovText.innerHTML = page.map(function (p) { return '<p>' + p + '</p>'; }).join('');
        var last = overlayState.page === o.pages.length - 1;
        el.ovBtn.textContent = last ? o.button : 'Next';
        el.ovHint.textContent = 'Press Enter or Space';
        el.ovBtn.focus();
    }

    function advanceOverlay() {
        if (!overlayState) { return; }
        var o = overlayState.opts;
        if (overlayState.page < o.pages.length - 1) {
            overlayState.page++;
            renderOverlayPage();
            return;
        }
        el.overlay.hidden = true;
        overlayState = null;
        S.mode = S.dungeon ? 'play' : 'hub';
        if (document.activeElement && document.activeElement.blur) { document.activeElement.blur(); }
        if (o.onDone) { o.onDone(); }
    }

    /* ------------------------------------------------------------------ */
    /* Notes + HUD                                                         */
    /* ------------------------------------------------------------------ */
    function setNote(html, kind, ms) {
        S.noteText = html;
        S.noteKind = kind || '';
        S.noteUntil = S.time + (ms || 5000);
    }

    function tempLabel(T) {
        if (T < 0.05) { return 'greedy'; }
        if (T < 0.5) { return 'cold'; }
        if (T < 1.0) { return 'balanced'; }
        if (T < 1.6) { return 'warm'; }
        return 'hot';
    }

    function tempNote(T) {
        if (T < 0.05) {
            return '<strong>T = 0, greedy.</strong> Pip always takes its single highest-scoring move. Same situation, same move, every time. Perfectly repeatable, but it can loop forever.';
        }
        if (T < 0.5) {
            return '<strong>Cold.</strong> Pip almost always picks its top choice. Very predictable, a little stubborn.';
        }
        if (T < 1.0) {
            return '<strong>Balanced.</strong> Mostly the top choice, but now and then Pip tries something else.';
        }
        if (T < 1.6) {
            return '<strong>Warm.</strong> Pip\'s second and third choices get a real chance. More exploratory, less reliable.';
        }
        return '<strong>Hot.</strong> Pip\'s choices are nearly random. Creative? Maybe. Chaos? Definitely.';
    }

    function setTemp(v) {
        var t = Math.max(0, Math.min(2, Math.round(v * 10) / 10));
        S.T = t;
        el.temp.value = String(t);
        el.tValue.textContent = t.toFixed(1);
        el.tLabel.textContent = '(' + tempLabel(t) + ')';
    }

    function buildBars() {
        el.bars.innerHTML = '';
        L.DIRS.forEach(function (d, i) {
            var row = document.createElement('div');
            row.className = 'bar-row';
            row.id = 'bar-' + i;
            row.innerHTML = '<span>' + d.arrow + '</span><div class="bar-track"><div class="bar-fill"></div></div><span class="pct">--</span>';
            el.bars.appendChild(row);
        });
    }

    function updateBars() {
        var active = S.mode === 'play' && !S.pip.done && S.pipWait <= 0 && S.room;
        var probs = null;
        var scores = null;
        if (active) {
            var target = L.pipTarget(S.room, S.hero);
            scores = L.pipScores(S.room, S.pip, target);
            probs = L.softmax(scores, S.T);
        }
        var best = probs ? probs.indexOf(Math.max.apply(null, probs)) : -1;
        L.DIRS.forEach(function (d, i) {
            var row = $('bar-' + i);
            var fill = row.querySelector('.bar-fill');
            var pct = row.querySelector('.pct');
            if (!probs) {
                fill.style.width = '0%';
                pct.textContent = '--';
                row.className = 'bar-row';
                return;
            }
            var tile = L.tileAt(S.room, S.pip.x + d.dx, S.pip.y + d.dy);
            var cls = 'bar-row';
            if (tile === '#') { cls += ' wall'; }
            else if (tile === 'S') { cls += ' spike'; }
            else if (i === best) { cls += ' best'; }
            row.className = cls;
            fill.style.width = (probs[i] * 100).toFixed(0) + '%';
            pct.textContent = (probs[i] * 100).toFixed(0) + '%';
        });
    }

    function updateHud() {
        var hearts = '';
        for (var i = 0; i < L.PIP_MAX_HP; i++) { hearts += i < S.pip.hp ? '♥' : '♡'; }
        el.hp.textContent = hearts;
        if (S.room && S.room.trial) {
            var tt = trialText();
            if (el.objective.textContent !== tt) { el.objective.textContent = tt; }
        }
        updateBars();
        var idle;
        if (S.dungeon && S.dungeon.hud === 'basic' && S.room) {
            idle = '<strong>' + S.room.title + '.</strong> ' + S.room.objective;
        } else {
            idle = tempNote(S.T);
        }
        var text = S.time < S.noteUntil ? S.noteText : idle;
        var kind = S.time < S.noteUntil ? S.noteKind : '';
        if (el.note.dataset.cur !== text + kind) {
            el.note.innerHTML = text;
            el.note.className = 'note ' + kind;
            el.note.dataset.cur = text + kind;
        }
    }

    /* ------------------------------------------------------------------ */
    /* Lessons: feel it -> name it -> use it                               */
    /* ------------------------------------------------------------------ */
    var LESSONS = {
        rules: [
            '<b>Name it:</b> a <i>rule-based system</i> (sometimes called symbolic AI). A person writes the logic, and the software follows it exactly.',
            '<b>In the real world:</b> tax software, thermostats and early spam filters work this way. They are predictable and easy to explain, but they only handle cases someone thought of.',
            '<b>Use it:</b> your rules covered the pattern because it was simple enough to spot in a few examples. Next, the pattern gets fuzzier.'
        ],
        learning: [
            '<b>Name it:</b> <i>machine learning</i>. Instead of rules, the software has <i>weights</i> that are fitted to labelled examples. That fitting step is called <i>training</i>.',
            '<b>In the real world:</b> spam filters, photo recognition and recommendations learn this way. The system finds patterns nobody wrote down, and the weights show which inputs mattered.',
            '<b>Use it:</b> the learner was scored on creatures it had never seen. That held-out test is how you check a model <i>generalises</i> instead of memorising. Hand-tuned rules fit the known cases and broke on new ones.'
        ],
        vault: [
            '<b>Name it:</b> <i>choosing the right tool</i>. Use <b>rules</b> when the logic is exact and you can write it down. Use <b>learning</b> when the pattern is fuzzy and you have plenty of examples.',
            '<b>In the real world:</b> most real products mix both. Rules enforce hard limits (like tax or safety checks) and learned models handle the fuzzy parts (like spotting spam or a cat).'
        ],
        stuck: [
            '<b>Name it:</b> <i>greedy decoding</i>. At temperature 0 a model always takes its single most likely next token, so the same situation gives the same output every time.',
            '<b>In the real world:</b> this is why a model run at a very low temperature can fall into loops and repeat the same phrase. It is also why code and fact lookups often use low settings: you want consistency, not variety.',
            '<b>Use it:</b> Pip can\'t plan around the wall. It can only re-pick its top move. A little randomness lets it wander off that path.'
        ],
        contrast: [
            '<b>Name it:</b> <i>temperature</i>. It rescales the odds of every possible next move (for a real model, every possible next token). Low values sharpen the odds toward the top pick. High values flatten them.',
            '<b>In the real world:</b> at low temperature the same prompt gives nearly the same answer every time. At high temperature it can give a different answer on each run: more variety, less reliability.',
            '<b>Use it:</b> your footprints show it. Cold Pip took the same short path. Hot Pip took a longer one that changes every time. Next up: what happens when that wandering has a price.'
        ],
        sampling: [
            '<b>Name it:</b> <i>sampling</i>. A model doesn\'t just pick the best token. It draws from a probability distribution, and temperature sharpens or flattens that distribution.',
            '<b>In the real world:</b> at higher temperature, lower-probability tokens get picked more often. That is where variety and creativity come from, and also the occasional nonsense answer. The same prompt can give a different reply each time.',
            '<b>Use it:</b> check the decision log. The spike move had a small but real chance. A cooler dial shrinks that chance.',
            '<b>But it is not just a risk:</b> the same randomness that hurt Pip here is what lets it find the gap in the Garden. Temperature is a trade-off between reliability and exploration, not a good-or-bad setting.'
        ]
    };

    function lessonPages(key) { return [LESSONS[key]]; }

    // Show a lesson card the first time it is relevant.
    function maybeShowLesson(key) {
        if (S.lessons[key]) { return false; }
        S.lessons[key] = true;
        showOverlay({ title: 'What you just learned', pages: lessonPages(key), button: 'Got it' });
        return true;
    }

    /* ------------------------------------------------------------------ */
    /* Decision log: why Pip chose what it chose                           */
    /* ------------------------------------------------------------------ */
    var ORDINAL = ['1st', '2nd', '3rd', '4th'];
    var LOG_MAX = 6;

    function logChoice(res) {
        var p = res.probs[res.dir];
        var rank = 1;
        for (var i = 0; i < res.probs.length; i++) {
            if (res.probs[i] > p) { rank++; }
        }
        var outcome = '';
        var cls = rank === 1 ? 'top' : 'alt';
        if (res.hitSpike) { outcome = 'stepped on spikes (-1 HP)'; cls = 'bad'; }
        else if (res.bumped) { outcome = 'bonked into a wall'; cls = 'bad'; }
        else if (res.onPlate) { outcome = 'reached the plate'; cls = 'top'; }
        S.log.push({
            n: S.roomSteps,
            arrow: L.DIRS[res.dir].arrow,
            pct: p < 0.005 ? '<1%' : Math.round(p * 100) + '%',
            rank: ORDINAL[rank - 1],
            outcome: outcome,
            cls: cls
        });
        if (S.log.length > LOG_MAX) { S.log.shift(); }
        renderLog();
    }

    function renderLog() {
        el.log.innerHTML = '';
        if (!S.log.length) {
            var empty = document.createElement('li');
            empty.className = 'empty';
            empty.textContent = 'Pip hasn\'t moved yet.';
            el.log.appendChild(empty);
            return;
        }
        for (var i = S.log.length - 1; i >= 0; i--) {
            var e = S.log[i];
            var li = document.createElement('li');
            li.className = e.cls;
            var text = '#' + e.n + '  ' + e.arrow + '  chose at ' + e.pct + ' (' + e.rank + ' choice)';
            if (e.outcome) { text += ' → ' + e.outcome; }
            li.textContent = text;
            el.log.appendChild(li);
        }
    }

    /* ------------------------------------------------------------------ */
    /* Wander Test: one cold run + one hot run opens the door              */
    /* ------------------------------------------------------------------ */
    var COLD_MAX = 0.3;
    var HOT_MIN = 1.5;

    function trialText() {
        var c = S.trial.cold;
        var h = S.trial.hot;
        return 'Cold run (T ≤ ' + COLD_MAX.toFixed(1) + '): ' + (c !== null ? '✓ ' + c + ' steps' : 'not yet') +
            '  |  Hot run (T ≥ ' + HOT_MIN.toFixed(1) + '): ' + (h !== null ? '✓ ' + h + ' steps' : 'not yet');
    }

    function resetPipRun() {
        S.pip.x = S.room.pip.x;
        S.pip.y = S.room.pip.y;
        S.pip.hp = L.PIP_MAX_HP;
        S.pip.done = false;
        S.pip.doorOpen = false;
        S.runSteps = 0;
        S.runTSum = 0;
        S.bumpStreak = 0;
        S.acc = 0;
    }

    function finishTrialRun() {
        var steps = S.runSteps;
        var avg = S.runTSum / Math.max(1, steps);
        var kind = avg <= COLD_MAX ? 'cold' : (avg >= HOT_MIN ? 'hot' : null);
        if (!kind) {
            setNote('<strong>That run averaged T = ' + avg.toFixed(1) + '.</strong> For the experiment, run Pip cold (' + COLD_MAX.toFixed(1) + ' or less) or hot (' + HOT_MIN.toFixed(1) + ' or more). Pip is heading back to the start.', '', 8000);
            S.pipWait = 1800;
            return;
        }
        S.trial[kind] = steps;
        if (S.trial.cold !== null && S.trial.hot !== null) {
            S.pip.doorOpen = true;
            S.pip.done = true;
            setNote('<strong>Experiment complete.</strong> Cold run: ' + S.trial.cold + ' steps. Hot run: ' + S.trial.hot + ' steps. The door is open, Hero, go!', 'good', 10000);
            maybeShowLesson('contrast');
        } else {
            var wasCold = kind === 'cold';
            setNote('<strong>' + (wasCold ? 'Cold' : 'Hot') + ' run done in ' + steps + ' steps.</strong> Now turn the dial ' + (wasCold ? 'up to ' + HOT_MIN.toFixed(1) + ' or more' : 'down to ' + COLD_MAX.toFixed(1) + ' or less') + ' and send Pip across again.', 'good', 10000);
            S.pipWait = 1800;
        }
    }

    function trailColor(t) {
        var f = Math.max(0, Math.min(1, t / 2));
        var r = Math.round(76 + (239 - 76) * f);
        var g = Math.round(201 + (71 - 201) * f);
        var b = Math.round(240 + (111 - 240) * f);
        return 'rgba(' + r + ',' + g + ',' + b + ',0.6)';
    }

    function pushTrail(x, y) {
        S.trail.push({ x: x, y: y, c: trailColor(S.T) });
        var cap = S.room.trial ? 400 : 40;
        if (S.trail.length > cap) { S.trail.shift(); }
    }

    /* ------------------------------------------------------------------ */
    /* Rooms                                                               */
    /* ------------------------------------------------------------------ */
    function loadRoom(index, skipIntro) {
        var rooms = S.dungeon.rooms;
        S.roomIndex = index;
        S.room = L.parseRoom(rooms[index]);
        S.bg = renderBackground(S.room);
        S.hero = { x: S.room.hero.x, y: S.room.hero.y };
        S.pip = { x: S.room.pip.x, y: S.room.pip.y, hp: L.PIP_MAX_HP, doorOpen: false, done: S.room.noPip };
        S.puzzleSolved = false;
        S.acc = 0;
        S.bumpStreak = 0;
        S.bumpT = 0;
        S.hurtT = 0;
        S.stuckHinted = false;
        S.log = [];
        S.roomSteps = 0;
        S.trail = [];
        S.trial = { cold: null, hot: null };
        S.runSteps = 0;
        S.runTSum = 0;
        S.pipWait = 0;
        renderLog();
        el.objective.textContent = S.room.objective;
        el.floorLabel.textContent = S.dungeon.title + ' · ' + S.dungeon.unit + ' ' + (index + 1) + '/' + rooms.length + ' · ' + S.room.title;
        S.noteUntil = 0;
        if (skipIntro) {
            S.mode = 'play';
            return;
        }
        var pages = STORY[S.room.id];
        showOverlay({ title: S.room.title, pages: pages, button: 'Go' });
    }

    function faint() {
        S.faints++;
        var hot = S.T >= 1.0;
        var msg = hot
            ? 'At temperature ' + S.T.toFixed(1) + ' Pip\'s choices are unpredictable, and this time that meant too many spike steps. Check the decision log, then try a cooler setting.'
            : 'Pip fainted at temperature ' + S.T.toFixed(1) + '. Check the decision log and the move odds, then try a different setting.';
        var pages = [[msg]];
        if (!S.lessons.sampling) {
            S.lessons.sampling = true;
            pages.push(LESSONS.sampling);
        }
        showOverlay({
            title: 'Pip fainted!',
            pages: pages,
            button: 'Try again',
            onDone: function () { loadRoom(S.roomIndex, true); }
        });
    }

    function clearDungeon() {
        var d = S.dungeon;
        var story = DUNGEON_STORY[d.id];
        S.progress.cleared[d.id] = true;
        saveProgress();
        var pages = story.clear.map(function (p) { return p.slice(); });
        if (d.hud === 'forge') {
            pages[pages.length - 1].push('Pip fainted <b>' + S.faints + '</b> time' + (S.faints === 1 ? '' : 's') + ' and took <b>' + S.steps + '</b> steps.');
        }
        showOverlay({
            title: story.clearTitle,
            pages: pages,
            button: story.clearButton,
            onDone: function () { showHub(); }
        });
    }

    /* ------------------------------------------------------------------ */
    /* Puzzles (golem altars)                                              */
    /* ------------------------------------------------------------------ */
    var PUZZLE_LESSON = { rules: 'rules', learn: 'learning', vault: 'vault' };

    function openPuzzle() {
        if (S.puzzleSolved) {
            setNote('<strong>The golem stands calm.</strong> The door is open.', 'good', 3000);
            return;
        }
        S.mode = 'puzzle';
        el.screenWrap.classList.add('puzzle-open');
        UI.open(S.room.puzzle, el.puzzle, { onSolved: onPuzzleSolved, onClose: closePuzzle });
    }

    function closePuzzle() {
        el.screenWrap.classList.remove('puzzle-open');
        el.puzzle.hidden = true;
        if (S.mode === 'puzzle') { S.mode = 'play'; }
    }

    function onPuzzleSolved() {
        UI.close(true);
        closePuzzle();
        S.puzzleSolved = true;
        S.pip.doorOpen = true;
        setNote('<strong>The golem steps aside.</strong> The door is open. Hero, go!', 'good', 8000);
        maybeShowLesson(PUZZLE_LESSON[S.room.puzzle]);
    }

    /* ------------------------------------------------------------------ */
    /* Hero movement                                                       */
    /* ------------------------------------------------------------------ */
    function moveHero(dx, dy) {
        if (S.mode !== 'play') { return; }
        var now = performance.now();
        if (now - S.lastHeroMove < HERO_REPEAT_MS) { return; }
        S.lastHeroMove = now;

        var nx = S.hero.x + dx;
        var ny = S.hero.y + dy;
        var t = L.tileAt(S.room, nx, ny);
        if (t === '#') { return; }
        if (t === 'S') { setNote('<strong>Hero:</strong> I\'m not stepping on those spikes.', '', 2500); return; }
        if (t === 'A') { openPuzzle(); return; }
        if (t === 'D' && !S.pip.doorOpen) {
            setNote(S.room.puzzle
                ? '<strong>The door is sealed.</strong> Challenge the golem.'
                : '<strong>The door is sealed.</strong> Get Pip onto the glowing plate.', '', 3500);
            return;
        }
        if (t === 'K') { clearDungeon(); return; }
        S.hero.x = nx;
        S.hero.y = ny;
        if (t === 'D') {
            if (S.roomIndex + 1 < S.dungeon.rooms.length) { loadRoom(S.roomIndex + 1); }
            else { clearDungeon(); }
        }
    }

    /* ------------------------------------------------------------------ */
    /* Pip step                                                            */
    /* ------------------------------------------------------------------ */
    function pipTick() {
        var res = L.pipStep(S.room, S.pip, S.T, Math.random, S.hero);
        S.steps++;
        S.roomSteps++;
        S.runSteps++;
        S.runTSum += S.T;
        pushTrail(S.pip.x, S.pip.y);
        logChoice(res);
        var lesson = null; // lesson card to show once this step is fully handled
        if (res.bumped) {
            S.bumpT = 240;
            S.bumpDir = res.dir;
            S.bumpStreak++;
            if (S.bumpStreak >= 6 && !S.stuckHinted && S.T < 1.0 && !S.room.followHero) {
                S.stuckHinted = true;
                setNote('<strong>Pip keeps bonking the wall.</strong> At low temperature it picks the same top move every time, so it repeats forever. Raise the temperature to let it explore.', 'bad', 9000);
                lesson = 'stuck';
            }
        } else {
            S.bumpStreak = 0;
        }
        if (res.hitSpike) {
            S.hurtT = 320;
            setNote('<strong>Ouch!</strong> Pip sampled a low-probability move and stepped on spikes. At higher temperature, unlikely moves happen more often.', 'bad', 6000);
            if (S.pip.hp <= 0) { faint(); return; }
            lesson = 'sampling';
        }
        if (res.onPlate) {
            if (S.room.trial) {
                finishTrialRun();
            } else {
                S.pip.doorOpen = true;
                S.pip.done = true;
                setNote('<strong>Click!</strong> Pip is on the plate and the door is open. Hero, go!', 'good', 6000);
            }
        }
        if (lesson) { maybeShowLesson(lesson); }
    }

    /* ------------------------------------------------------------------ */
    /* Rendering                                                           */
    /* ------------------------------------------------------------------ */
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!S.room) { return; }
        ctx.drawImage(S.bg, 0, 0);

        // footprints: colour shows the temperature Pip had at each step
        for (var ti = 0; ti < S.trail.length; ti++) {
            var tr = S.trail[ti];
            ctx.fillStyle = tr.c;
            ctx.fillRect(tr.x * TILE + 6, tr.y * TILE + 6, 4, 4);
        }

        var r = S.room;
        if (r.door) { drawDoor(r.door.x, r.door.y, S.pip.doorOpen); }
        if (r.plate) { drawPlate(r.plate.x, r.plate.y, S.pip.doorOpen || S.pipWait > 0, S.time); }
        if (r.chest) {
            ctx.drawImage(sprite.chest, r.chest.x * TILE, r.chest.y * TILE);
            if (Math.floor(S.time / 400) % 2) {
                ctx.fillStyle = '#fff3c4';
                ctx.fillRect(r.chest.x * TILE + 12, r.chest.y * TILE + 1, 2, 2);
                ctx.fillRect(r.chest.x * TILE + 2, r.chest.y * TILE + 3, 1, 1);
            }
        }

        // golem altar (dims once its puzzle is solved)
        if (r.altar) {
            var gy = r.altar.y * TILE + (S.puzzleSolved ? 0 : Math.floor(Math.sin(S.time / 350) * 0.9));
            ctx.globalAlpha = S.puzzleSolved ? 0.5 : 1;
            ctx.drawImage(sprite['golem_' + r.puzzle], r.altar.x * TILE, gy);
            ctx.globalAlpha = 1;
        }

        // Pip (not present in dungeons before he joins)
        if (!r.noPip) {
            var bob = Math.floor(Math.sin(S.time / 220) * 0.9);
            var ox = 0;
            var oy = 0;
            if (S.bumpT > 120) {
                var d = L.DIRS[S.bumpDir];
                ox = d.dx * 3;
                oy = d.dy * 3;
            }
            var ppx = S.pip.x * TILE + ox;
            var ppy = S.pip.y * TILE + oy + bob;
            ctx.drawImage(sprite.pip, ppx, ppy);
            if (S.hurtT > 0 && Math.floor(S.hurtT / 60) % 2 === 0) {
                ctx.fillStyle = 'rgba(239, 71, 111, 0.6)';
                ctx.fillRect(ppx + 2, ppy + 2, 12, 12);
            }
            if (S.bumpT > 0) { drawBubble(S.pip.x * TILE, S.pip.y * TILE, '!'); }
            else if (S.bumpStreak >= 4) { drawBubble(S.pip.x * TILE, S.pip.y * TILE, '.'); }
        }

        // Hero
        var hbob = Math.floor(Math.sin(S.time / 300 + 1) * 0.9);
        ctx.drawImage(sprite.hero, S.hero.x * TILE, S.hero.y * TILE + hbob);
    }

    /* ------------------------------------------------------------------ */
    /* Main loop                                                           */
    /* ------------------------------------------------------------------ */
    var last = performance.now();

    function frame(now) {
        var dt = Math.min(now - last, 100);
        last = now;
        S.time += dt;
        if (S.bumpT > 0) { S.bumpT -= dt; }
        if (S.hurtT > 0) { S.hurtT -= dt; }

        if (S.mode === 'play' && S.room) {
            if (S.pipWait > 0) {
                S.pipWait -= dt;
                if (S.pipWait <= 0) { S.pipWait = 0; resetPipRun(); }
            } else if (!S.pip.done) {
                S.acc += dt;
                while (S.acc >= STEP_MS && S.mode === 'play' && !S.pip.done && S.pipWait <= 0) {
                    S.acc -= STEP_MS;
                    pipTick();
                }
            }
        }
        if (S.room && S.room.followHero && S.mode === 'play') { S.pip.done = false; }

        draw();
        updateHud();
        requestAnimationFrame(frame);
    }

    /* ------------------------------------------------------------------ */
    /* Input                                                               */
    /* ------------------------------------------------------------------ */
    var KEYMAP = {
        ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
        ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
        ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
        ArrowRight: [1, 0], d: [1, 0], D: [1, 0]
    };

    window.addEventListener('keydown', function (e) {
        if (e.ctrlKey || e.metaKey || e.altKey) { return; }

        if (S.mode === 'hub') { return; } // native button focus + Enter handle the hub

        if (S.mode === 'overlay') {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                advanceOverlay();
            }
            return;
        }

        if (S.mode === 'puzzle') {
            if (e.key === 'Escape') { e.preventDefault(); UI.close(); }
            return; // let the panel handle everything else (selects, buttons)
        }

        var forge = S.dungeon && S.dungeon.hud === 'forge';
        var m = KEYMAP[e.key];
        if (m) {
            e.preventDefault();
            moveHero(m[0], m[1]);
        } else if (forge && (e.key === 'q' || e.key === 'Q' || e.key === '[')) {
            e.preventDefault();
            setTemp(S.T - 0.1);
        } else if (forge && (e.key === 'e' || e.key === 'E' || e.key === ']')) {
            e.preventDefault();
            setTemp(S.T + 0.1);
        } else if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            loadRoom(S.roomIndex, true);
        }
    });

    el.ovBtn.addEventListener('click', advanceOverlay);
    el.temp.addEventListener('input', function () { setTemp(parseFloat(el.temp.value)); });
    el.temp.addEventListener('change', function () { el.temp.blur(); });
    el.tDown.addEventListener('click', function () { setTemp(S.T - 0.1); el.tDown.blur(); });
    el.tUp.addEventListener('click', function () { setTemp(S.T + 0.1); el.tUp.blur(); });

    Array.prototype.forEach.call(document.querySelectorAll('.dpad button'), function (b) {
        b.addEventListener('click', function () {
            moveHero(parseInt(b.dataset.dx, 10), parseInt(b.dataset.dy, 10));
        });
    });

    /* ------------------------------------------------------------------ */
    /* Progress (saved in this browser; the game works without it)         */
    /* ------------------------------------------------------------------ */
    var PROGRESS_KEY = 'dungeon-of-weights.progress.v1';

    function loadProgress() {
        try {
            var raw = window.localStorage.getItem(PROGRESS_KEY);
            var p = raw ? JSON.parse(raw) : null;
            return { cleared: (p && p.cleared && typeof p.cleared === 'object') ? p.cleared : {} };
        } catch (e) {
            return { cleared: {} };
        }
    }

    function saveProgress() {
        try { window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(S.progress)); } catch (e) { /* private mode etc. */ }
    }

    /* ------------------------------------------------------------------ */
    /* Dungeon hub                                                         */
    /* ------------------------------------------------------------------ */
    var GROUPS = [
        { id: 'basics', title: 'The Basics' },
        { id: 'bonus', title: 'Bonus Dungeon' }
    ];
    var BADGE_TEXT = { easy: 'Easy', medium: 'Medium', hard: 'Hard', bonus: 'Bonus' };

    function dungeonById(id) {
        for (var i = 0; i < L.DUNGEONS.length; i++) { if (L.DUNGEONS[i].id === id) { return L.DUNGEONS[i]; } }
        return null;
    }

    function dungeonStatus(d) {
        if (!d.ready) { return { state: 'soon', text: 'Coming soon' }; }
        var done = !!S.progress.cleared[d.id];
        if (d.unlockAfter && !S.progress.cleared[d.unlockAfter] && !done) {
            var pre = dungeonById(d.unlockAfter);
            return { state: 'locked', text: '🔒 Clear "' + (pre ? pre.title : d.unlockAfter) + '" first' };
        }
        if (done) { return { state: 'cleared', text: '★ Cleared!' }; }
        return { state: 'ready', text: '▶ Play' };
    }

    function makeThumb(d) {
        var c = document.createElement('canvas');
        c.width = COLS * TILE;
        c.height = ROWS * TILE;
        c.className = 'thumb';
        c.setAttribute('aria-hidden', 'true');
        var g = c.getContext('2d');
        g.imageSmoothingEnabled = false;
        if (d.ready) {
            var def = d.rooms[0];
            for (var i = 0; i < d.rooms.length; i++) { if (d.rooms[i].id === d.thumb) { def = d.rooms[i]; } }
            var room = L.parseRoom(def);
            g.drawImage(renderBackground(room), 0, 0);
            if (room.altar) { g.drawImage(sprite['golem_' + room.puzzle], room.altar.x * TILE, room.altar.y * TILE); }
            if (room.chest) { g.drawImage(sprite.chest, room.chest.x * TILE, room.chest.y * TILE); }
            if (room.plate) { g.fillStyle = '#ffd166'; g.fillRect(room.plate.x * TILE + 4, room.plate.y * TILE + 4, 8, 8); }
            g.drawImage(sprite.hero, room.hero.x * TILE, room.hero.y * TILE);
            if (!room.noPip) { g.drawImage(sprite.pip, room.pip.x * TILE, room.pip.y * TILE); }
        } else {
            for (var y = 0; y < ROWS; y++) {
                for (var x = 0; x < COLS; x++) { drawFloor(g, x * TILE, y * TILE, x, y); }
            }
            g.fillStyle = 'rgba(10, 7, 20, 0.7)';
            g.fillRect(0, 0, c.width, c.height);
            g.fillStyle = '#ffd166';
            g.font = 'bold 64px monospace';
            g.textAlign = 'center';
            g.fillText('?', c.width / 2, c.height / 2 + 22);
        }
        return c;
    }

    function mk(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) { e.className = cls; }
        if (text !== undefined) { e.textContent = text; }
        return e;
    }

    function renderHub() {
        el.hubGroups.textContent = '';
        GROUPS.forEach(function (grp) {
            var list = L.DUNGEONS.filter(function (d) { return d.group === grp.id; });
            if (!list.length) { return; }
            el.hubGroups.appendChild(mk('h2', 'group-title', grp.title));
            var cards = mk('div', 'cards');
            list.forEach(function (d) {
                var st = dungeonStatus(d);
                var btn = mk('button', 'dcard is-' + st.state);
                btn.setAttribute('type', 'button');
                btn.disabled = st.state === 'locked' || st.state === 'soon';
                btn.dataset.dungeon = d.id;
                var title = mk('h3', '', d.title);
                title.appendChild(mk('span', 'badge ' + d.difficulty, BADGE_TEXT[d.difficulty]));
                btn.appendChild(makeThumb(d));
                btn.appendChild(title);
                btn.appendChild(mk('p', 'blurb', d.blurb));
                btn.appendChild(mk('p', 'status ' + st.state, st.text));
                btn.addEventListener('click', function () { startDungeon(d.id); });
                cards.appendChild(btn);
            });
            el.hubGroups.appendChild(cards);
        });
    }

    function setupHud(d) {
        var forge = d.hud === 'forge';
        el.panelDial.hidden = !forge;
        el.panelBars.hidden = !forge;
        el.logPanel.hidden = !forge;
        el.keysDial.hidden = !forge;
        el.hp.hidden = !forge;
        el.hud.className = forge ? 'hud' : 'hud solo';
        el.pipTitle.textContent = forge ? 'Pip' : 'Objective';
    }

    function showHub() {
        if (UI.isOpen()) { UI.close(true); }
        el.screenWrap.classList.remove('puzzle-open');
        el.puzzle.hidden = true;
        el.overlay.hidden = true;
        overlayState = null;
        S.dungeon = null;
        S.room = null;
        S.mode = 'hub';
        el.hub.hidden = false;
        el.game.hidden = true;
        el.toHub.hidden = true;
        el.backLink.hidden = false;
        el.floorLabel.textContent = 'Choose a dungeon';
        renderHub();
        if (window.scrollTo) { window.scrollTo(0, 0); }
    }

    function startDungeon(id) {
        var d = dungeonById(id);
        if (!d || !d.ready) { return; }
        var st = dungeonStatus(d);
        if (st.state === 'locked') { return; }
        var story = DUNGEON_STORY[d.id];
        S.dungeon = d;
        S.faints = 0;
        S.steps = 0;
        S.lessons = {};
        el.hub.hidden = true;
        el.game.hidden = false;
        el.toHub.hidden = false;
        el.backLink.hidden = true;
        setupHud(d);
        if (d.hud === 'forge') { setTemp(0.0); } // start cold: you must turn it up to see anything change
        loadRoom(0, true);                         // draw the first room behind the intro card
        showOverlay({
            title: d.title,
            pages: story.intro,
            button: story.introButton,
            onDone: function () { loadRoom(0); }
        });
        if (window.scrollTo) { window.scrollTo(0, 0); }
    }

    el.toHub.addEventListener('click', showHub);

    /* ------------------------------------------------------------------ */
    /* Boot                                                                */
    /* ------------------------------------------------------------------ */
    S.progress = loadProgress();
    buildBars();
    setTemp(0.0);
    showHub();
    requestAnimationFrame(frame);
})();

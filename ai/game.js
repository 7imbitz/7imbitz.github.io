/*
 * Dungeon of Weights (browser, canvas, no dependencies).
 * Game rules live in logic.js, puzzle logic in puzzles.js, puzzle panels in
 * puzzle-ui.js. This file is the hub, rendering, input and story.
 */
(function () {
    'use strict';

    var L = window.Logic;
    var C = window.Content;
    // i18n: English text is the key (see i18n.js). Falls back to plain English with placeholders filled.
    var tr = (window.I18n && window.I18n.t) || function (key, vars) {
        return vars ? key.replace(/\{(\w+)\}/g, function (m, n) { return vars[n] !== undefined ? vars[n] : m; }) : key;
    };
    var UI = window.PuzzleUI;
    var TILE = 16;
    var COLS = L.COLS;
    var ROWS = L.ROWS;
    var STEP_MS = 380;       // how often Pip takes a step
    var STEP_MS_SYS = 260;    // the rule rooms are short walks, so a little faster than the temperature rooms
    var STEP_MS_MEMORY = 200; // the memory rooms need many steps, so Pip walks faster there
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
        grimoire: $('grimoire'), grimList: $('grimoire-list'), grimSearch: $('grim-search'), grimClear: $('grim-clear'), grimResults: $('grim-results'), grimCount: $('grim-count'), grimIntro: $('grim-intro'), openGrim: $('open-grimoire'),
        toHub: $('to-hub'), backLink: $('back-link'),
        screenWrap: $('screen-wrap'), puzzle: $('puzzle'),
        hud: $('hud'), panelDial: $('panel-dial'), panelBars: $('panel-bars'),
        pipTitle: $('pip-title'), logPanel: $('log-panel'), keysDial: $('keys-dial'),
        langEn: $('lang-en'), langBm: $('lang-bm'),
        panelCtx: $('panel-ctx'), ctxSlider: $('ctx-slider'), ctxDown: $('ctx-down'), ctxUp: $('ctx-up'),
        panelSys: $('panel-sys'), sysCards: $('sys-cards'), sysPreview: $('sys-preview'), sysState: $('sys-state'),
        ctxValue: $('ctx-value'), ctxFill: $('ctx-fill'), ctxVram: $('ctx-vram'), ctxState: $('ctx-state')
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
    var GOLEM_RUNE = {
        rules: '#4cc9f0', learn: '#06d6a0', vault: '#ffd166',
        sorting: '#b18cff', tokens: '#ff9f43', agent: '#ff6b9d',
        packing: '#4cc9f0', datagate: '#06d6a0', toll: '#ffd166',
        speed: '#ffd166', cache: '#4cc9f0', guardgate: '#ef476f',
        sysprompt: '#06d6a0', context: '#b18cff', tokenunits: '#ff9f43',
        verify: '#ef476f', doors: '#ffd166', poison: '#b18cff',
        agentloop: '#4cc9f0', guards: '#ff9f43', autonomy: '#ef476f',
        shelf: '#ffd166', socket: '#06d6a0', pit: '#ff6b9d',
        team: '#4cc9f0', files: '#b18cff', memfile: '#ff9f43',
        attacks: '#ef476f', layers: '#06d6a0', modified: '#ffd166',
        hardware: '#4cc9f0', engine: '#ff9f43', bandwidth: '#06d6a0',
        inputs: '#4cc9f0', pixels: '#ff9f43', visionfit: '#06d6a0',
        compaction: '#b18cff', compnote: '#ffd166', markov: '#4cc9f0',
        membound: '#ef476f', drafting: '#06d6a0'
    };
    Object.keys(GOLEM_RUNE).forEach(function (k) { sprite['golem_' + k] = makeSprite(SPRITES.golem, { r: GOLEM_RUNE[k] }); });

    function hash(x, y) {
        var h = (x * 374761393 + y * 668265263) | 0;
        h = (h ^ (h >>> 13)) * 1274126177;
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }

    // Each dungeon has its own colour theme so they look different on the hub and in play.
    var THEMES = {
        default: { floorA: '#2b2547', floorB: '#272142', speck: '#332c55', wall: '#4a3d7a', wallDark: '#362c5c', wallLight: '#5d4f93' },
        teal:    { floorA: '#1f3a44', floorB: '#1b333c', speck: '#28505c', wall: '#2f6b7a', wallDark: '#21505c', wallLight: '#43899a' },
        ember:   { floorA: '#3d2b26', floorB: '#372621', speck: '#4d3830', wall: '#7a4a3a', wallDark: '#5c3529', wallLight: '#93614d' },
        rust:    { floorA: '#3b2a22', floorB: '#35251e', speck: '#4a352b', wall: '#8a4b2a', wallDark: '#693a20', wallLight: '#a8643c' },
        plum:    { floorA: '#3a2433', floorB: '#34202d', speck: '#4a2f42', wall: '#7a3f64', wallDark: '#5c2f4c', wallLight: '#93517a' },
        moss:    { floorA: '#22362d', floorB: '#1e3028', speck: '#2b4639', wall: '#3f7a5c', wallDark: '#2e5c45', wallLight: '#54976f' },
        steel:   { floorA: '#262d3d', floorB: '#222938', speck: '#303a4f', wall: '#4a5a7a', wallDark: '#364360', wallLight: '#62759b' },
        dusk:    { floorA: '#2a2840', floorB: '#26233b', speck: '#38355a', wall: '#5d56a0', wallDark: '#463f7c', wallLight: '#7a73c0' }
    };
    var theme = THEMES.default;

    function drawFloor(g, px, py, tx, ty) {
        g.fillStyle = (tx + ty) % 2 ? theme.floorA : theme.floorB;
        g.fillRect(px, py, TILE, TILE);
        g.fillStyle = theme.speck;
        for (var i = 0; i < 3; i++) {
            var r = hash(tx * 7 + i, ty * 13 + i);
            var r2 = hash(tx * 3 + i * 5, ty * 11 + i);
            g.fillRect(px + Math.floor(r * 14), py + Math.floor(r2 * 14), 1, 1);
        }
    }

    function drawWall(g, px, py) {
        g.fillStyle = theme.wall;
        g.fillRect(px, py, TILE, TILE);
        g.fillStyle = theme.wallDark;
        g.fillRect(px, py + 7, TILE, 1);
        g.fillRect(px, py + 15, TILE, 1);
        g.fillRect(px + 4, py, 1, 7);
        g.fillRect(px + 12, py + 8, 1, 7);
        g.fillStyle = theme.wallLight;
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

    function drawFire(g, px, py, x, y) {
        g.fillStyle = '#2a1018';
        g.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
        var seed = (x * 7 + y * 3) % 3;
        for (var k = 0; k < 3; k++) {
            var h = 6 + ((k + seed) % 3) * 2;
            var x0 = px + 2 + k * 4;
            g.fillStyle = '#ef476f';
            g.fillRect(x0, py + 14 - h, 4, h);
            g.fillStyle = '#ff9e3d';
            g.fillRect(x0 + 1, py + 14 - h + 2, 2, h - 2);
            g.fillStyle = '#ffe08a';
            g.fillRect(x0 + 1, py + 14 - Math.floor(h / 2), 2, Math.floor(h / 2));
        }
    }

    // a fake golden plate that Pip walks to when it has no goal
    function drawDecoy(x, y) {
        var px = x * TILE;
        var py = y * TILE;
        ctx.fillStyle = '#1c1736';
        ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
        ctx.fillStyle = '#5b5873';
        ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
        ctx.fillStyle = '#a7a4bd';
        ctx.fillRect(px + 5, py + 5, TILE - 10, TILE - 10);
    }

    // Static background (floor, walls, spikes) is rendered once per room.
    function renderBackground(room, themeName) {
        theme = THEMES[themeName] || THEMES.default;
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
                else if (t === 'F') { drawFloor(g, px, py, x, y); drawFire(g, px, py, x, y); }
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

    var PLATE_FILL = ['#ef476f', '#4cc9f0', '#06d6a0'];

    function drawMemoryProps(r) {
        // lanterns mark the route Pip will walk (the last one is the junction where it must choose)
        r.memory.route.forEach(function (w, i) {
            var last = i === r.memory.route.length - 1;
            ctx.fillStyle = last ? 'rgba(255, 209, 102, 0.9)' : 'rgba(255, 209, 102, 0.45)';
            if (last) { ctx.fillRect(w[0] * TILE + 2, w[1] * TILE + 2, 12, 1); ctx.fillRect(w[0] * TILE + 2, w[1] * TILE + 13, 12, 1); ctx.fillRect(w[0] * TILE + 2, w[1] * TILE + 2, 1, 12); ctx.fillRect(w[0] * TILE + 13, w[1] * TILE + 2, 1, 12); }
            else { ctx.fillRect(w[0] * TILE + 6, w[1] * TILE + 6, 4, 4); }
        });
        // the plates
        r.mplates.forEach(function (pl) {
            var px = pl.x * TILE;
            var py = pl.y * TILE;
            ctx.fillStyle = '#1c1736';
            ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
            ctx.fillStyle = PLATE_FILL[pl.id];
            ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.fillRect(px + 5, py + 5, TILE - 12, TILE - 12);
        });
        // the scroll Pip reads at the start
        if (r.scroll) {
            var sx = r.scroll.x * TILE;
            var sy = r.scroll.y * TILE;
            ctx.fillStyle = '#e9d8a6';
            ctx.fillRect(sx + 3, sy + 4, 10, 9);
            ctx.fillStyle = '#c9b377';
            ctx.fillRect(sx + 3, sy + 4, 10, 1);
            ctx.fillRect(sx + 3, sy + 12, 10, 1);
            ctx.fillStyle = '#7a6a3a';
            ctx.fillRect(sx + 5, sy + 6, 6, 1);
            ctx.fillRect(sx + 5, sy + 8, 6, 1);
            ctx.fillRect(sx + 5, sy + 10, 4, 1);
        }
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
    var DUNGEON_STORY = C.DUNGEON_STORY;

    var STORY = C.STORY;

    /* ------------------------------------------------------------------ */
    /* Game state                                                          */
    /* ------------------------------------------------------------------ */
    var S = {
        mode: 'hub',         // 'hub' | 'overlay' | 'play' | 'puzzle'
        dungeon: null,
        progress: { cleared: {}, cards: {} },
        puzzleSolved: false,
        roomIndex: 0,
        room: null,
        bg: null,
        hero: { x: 1, y: 1 },
        pip: { x: 1, y: 1, hp: L.PIP_MAX_HP, doorOpen: false, done: false },
        T: 0.0,
        ctx: 8,              // num_ctx: Pip's context length in tokens (steps)
        mem: null,           // the current attempt in a memory room
        sys: { selected: [] }, // rules written into Pip's system prompt (rule rooms)
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
        el.ovTitle.textContent = tr(opts.title);
        el.overlay.hidden = false;
        renderOverlayPage();
    }

    function renderOverlayPage() {
        var o = overlayState.opts;
        var page = o.pages[overlayState.page];
        el.ovText.innerHTML = page.map(function (p) { return '<p>' + p + '</p>'; }).join('');
        var last = overlayState.page === o.pages.length - 1;
        el.ovBtn.textContent = last ? tr(o.button) : tr('Next');
        el.ovHint.textContent = tr('Press Enter or Space');
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
        if (T < 0.05) { return tr('greedy'); }
        if (T < 0.5) { return tr('cold'); }
        if (T < 1.0) { return tr('balanced'); }
        if (T < 1.6) { return tr('warm'); }
        return tr('hot');
    }

    function tempNote(T) {
        if (T < 0.05) {
            return tr('<strong>T = 0, greedy.</strong> Pip always takes its single highest-scoring move. Same situation, same move, every time. Perfectly repeatable, but it can loop forever.');
        }
        if (T < 0.5) {
            return tr('<strong>Cold.</strong> Pip almost always picks its top choice. Very predictable, a little stubborn.');
        }
        if (T < 1.0) {
            return tr('<strong>Balanced.</strong> Mostly the top choice, but now and then Pip tries something else.');
        }
        if (T < 1.6) {
            return tr('<strong>Warm.</strong> Pip\'s second and third choices get a real chance. More exploratory, less reliable.');
        }
        return tr('<strong>Hot.</strong> Pip\'s choices are nearly random. Creative? Maybe. Chaos? Definitely.');
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
            var target = S.room.memory ? memTarget() : (S.room.sys ? sysTarget() : L.pipTarget(S.room, S.hero));
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
            else if (tile === 'S' || tile === 'F') { cls += ' spike'; }
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
        updateCtxPanel();
        updateSysPanel();
        var idle;
        if (S.dungeon && S.dungeon.hud === 'basic' && S.room) {
            idle = '<strong>' + S.room.title + '.</strong> ' + S.room.objective; // already translated room text
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
    var LESSONS = C.LESSONS;

    var REFS = C.REFS || {};

    function escHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

    // A link to an outside page. The titles are fixed strings from content.js.
    function refLinkHtml(r) {
        return '<a href="' + escHtml(r.u) + '" target="_blank" rel="noopener noreferrer">' + escHtml(r.t) + '</a> <span class="ref-src">(' + escHtml(r.s) + ')</span>';
    }

    function lessonPages(key) {
        var page = LESSONS[key].slice();
        var refs = REFS[key];
        if (refs && refs.length) {
            page.push('<span class="refs-line"><b>' + escHtml(tr('Learn more')) + ':</b> ' + refs.map(refLinkHtml).join(' &middot; ') + '</span>');
        }
        return [page];
    }

    // Show a lesson card the first time it is relevant.
    function maybeShowLesson(key) {
        if (S.lessons[key]) { return false; }
        S.lessons[key] = true;
        collectCard(key);
        showOverlay({ title: 'What you just learned', pages: lessonPages(key), button: 'Got it' }); // showOverlay translates title/button
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
        if (res.hitSpike) { outcome = tr('stepped on spikes (-1 HP)'); cls = 'bad'; }
        else if (res.bumped) { outcome = tr('bonked into a wall'); cls = 'bad'; }
        else if (res.onPlate) { outcome = tr('reached the plate'); cls = 'top'; }
        S.log.push({
            n: S.roomSteps,
            arrow: L.DIRS[res.dir].arrow,
            pct: p < 0.005 ? '<1%' : Math.round(p * 100) + '%',
            rank: tr(ORDINAL[rank - 1]),
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
            empty.textContent = tr('Pip hasn\'t moved yet.');
            el.log.appendChild(empty);
            return;
        }
        for (var i = S.log.length - 1; i >= 0; i--) {
            var e = S.log[i];
            var li = document.createElement('li');
            li.className = e.cls;
            var text = tr('#{n}  {arrow}  chose at {pct} ({rank} choice)', { n: e.n, arrow: e.arrow, pct: e.pct, rank: e.rank });
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
        return tr('Cold run (T ≤ {max}): {cold}  |  Hot run (T ≥ {min}): {hot}', {
            max: COLD_MAX.toFixed(1), cold: c !== null ? tr('✓ {n} steps', { n: c }) : tr('not yet'),
            min: HOT_MIN.toFixed(1), hot: h !== null ? tr('✓ {n} steps', { n: h }) : tr('not yet')
        });
    }

    function resetPipRun() {
        if (S.room.memory) { memStart(); memAnnounce(); }
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
            setNote(tr('<strong>That run averaged T = {avg}.</strong> For the experiment, run Pip cold ({cold} or less) or hot ({hot} or more). Pip is heading back to the start.', { avg: avg.toFixed(1), cold: COLD_MAX.toFixed(1), hot: HOT_MIN.toFixed(1) }), '', 8000);
            S.pipWait = 1800;
            return;
        }
        S.trial[kind] = steps;
        if (S.trial.cold !== null && S.trial.hot !== null) {
            S.pip.doorOpen = true;
            S.pip.done = true;
            setNote(tr('<strong>Experiment complete.</strong> Cold run: {cold} steps. Hot run: {hot} steps. The door is open, Hero, go!', { cold: S.trial.cold, hot: S.trial.hot }), 'good', 10000);
            maybeShowLesson('contrast');
        } else {
            var wasCold = kind === 'cold';
            setNote(wasCold
                ? tr('<strong>Cold run done in {steps} steps.</strong> Now turn the dial up to {n} or more and send Pip across again.', { steps: steps, n: HOT_MIN.toFixed(1) })
                : tr('<strong>Hot run done in {steps} steps.</strong> Now turn the dial down to {n} or less and send Pip across again.', { steps: steps, n: COLD_MAX.toFixed(1) }), 'good', 10000);
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
    /* Memory rooms: num_ctx, the context window                           */
    /* ------------------------------------------------------------------ */
    var CTX = L.CTX_OPTIONS;
    var PLATE_COLORS = ['red', 'blue', 'green'];
    var PLATE_ID = { X: 0, Y: 1, Z: 2 };

    function memStart() {
        // a fresh attempt: Pip reads the scroll (the clue is random) and sets off
        S.mem = { steps: 0, wp: 0, clue: Math.floor(Math.random() * 3), decided: false, remembered: null, chosen: null, oomFor: null };
    }

    function memAnnounce() {
        if (!S.mem) { return; }
        setNote(tr('<strong>The scroll says:</strong> the treasure door is the {color} plate. Pip reads it and sets off.', { color: tr(PLATE_COLORS[S.mem.clue]) }), '', 9000);
    }

    // Where Pip is heading: along the route first, then to the plate it has chosen.
    function memTarget() {
        var route = S.room.memory.route;
        var m = S.mem;
        if (m && m.decided) {
            var pl = S.room.mplates.filter(function (x) { return x.id === m.chosen; })[0];
            return { x: pl.x, y: pl.y };
        }
        var w = route[Math.min(m ? m.wp : 0, route.length - 1)];
        return { x: w[0], y: w[1] };
    }

    function ctxNeed() { return L.ctxVram(S.ctx); }
    function ctxFits() { return ctxNeed() <= S.room.memory.budget; }

    function setCtx(v, quiet) {
        var i = CTX.indexOf(v);
        if (i < 0) { return; }
        var changed = v !== S.ctx;
        S.ctx = v;
        el.ctxSlider.value = String(i);
        // changing num_ctx reloads a real model, so Pip has to start again
        if (changed && !quiet && S.room && S.room.memory && S.mem && S.mem.steps > 0 && !S.pip.done) {
            S.pipWait = 0;
            resetPipRun();
            setNote(tr('<strong>Model reloaded.</strong> Changing num_ctx restarts the model, so Pip starts again.'), '', 7000);
        }
    }

    function memDecide() {
        var m = S.mem;
        m.decided = true;
        m.remembered = m.steps <= S.ctx;
        m.chosen = m.remembered ? m.clue : Math.floor(Math.random() * 3);
        if (m.remembered) {
            setNote(tr('<strong>Pip remembers.</strong> The scroll is {n} tokens back, still inside its {ctx}-token window, so it heads for the {color} plate.', { n: m.steps, ctx: S.ctx, color: tr(PLATE_COLORS[m.clue]) }), 'good', 7000);
        } else {
            setNote(tr('<strong>Pip has forgotten the scroll.</strong> It is {n} tokens back, outside the {ctx}-token window. Pip can only guess.', { n: m.steps, ctx: S.ctx }), 'bad', 7000);
        }
    }

    function memOutcome(plateId) {
        var m = S.mem;
        if (m.remembered && plateId === m.clue) {
            S.pip.doorOpen = true;
            S.pip.done = true;
            setNote(tr('<strong>Click!</strong> Pip remembered the scroll and chose the right plate. The door is open, Hero, go!'), 'good', 8000);
            maybeShowLesson('numctx');
            return;
        }
        if (plateId === m.clue) {
            setNote(tr('<strong>A lucky guess.</strong> It was the right plate, but Pip had forgotten the scroll, so it does not count. Pip is starting again.'), 'bad', 7000);
        } else {
            setNote(tr('<strong>Wrong plate.</strong> Pip had forgotten the scroll and guessed. It is starting again.'), 'bad', 7000);
        }
        S.pipWait = 2200;
    }

    function memTick() {
        var room = S.room;
        var route = room.memory.route;
        if (!S.mem) { memStart(); }
        var m = S.mem;
        if (!ctxFits()) {
            // not enough memory to load the model at this context length: Pip cannot move
            if (m.oomFor !== S.ctx) {
                m.oomFor = S.ctx;
                setNote(tr('<strong>Out of memory.</strong> A context of {ctx} tokens needs {need} GB, but this machine has {budget} GB. Pip cannot load. Choose a shorter context.', { ctx: S.ctx, need: ctxNeed().toFixed(2), budget: room.memory.budget }), 'bad', 9000);
            }
            return;
        }
        var res = L.pipStep(room, S.pip, S.T, Math.random, S.hero, memTarget());
        S.steps++;
        S.roomSteps++;
        m.steps++;
        pushTrail(S.pip.x, S.pip.y);
        logChoice(res);
        if (res.bumped) { S.bumpT = 240; S.bumpDir = res.dir; }
        if (!m.decided) {
            var w = route[m.wp];
            if (S.pip.x === w[0] && S.pip.y === w[1]) { m.wp++; }
            if (m.wp >= route.length) { memDecide(); }
        } else if (res.tile && PLATE_ID[res.tile] !== undefined) {
            memOutcome(PLATE_ID[res.tile]);
        }
    }

    function updateCtxPanel() {
        if (!S.room || !S.room.memory) { return; }
        var m = S.mem;
        var need = ctxNeed();
        var budget = S.room.memory.budget;
        var over = need > budget;
        var state;
        if (over) { state = tr('Out of memory: {need} GB needed, {budget} GB available.', { need: need.toFixed(2), budget: budget }); }
        else if (!m) { state = ''; }
        else if (!m.decided) { state = tr('Steps since the scroll: {n} of {ctx} tokens', { n: m.steps, ctx: S.ctx }); }
        else { state = m.remembered ? tr('Pip remembered the scroll.') : tr('The scroll fell out of the window.'); }
        var key = S.ctx + '|' + state + '|' + over;
        if (el.ctxState.dataset.cur === key) { return; }
        el.ctxState.dataset.cur = key;
        el.ctxValue.textContent = tr('{n} tokens', { n: S.ctx });
        el.ctxFill.style.width = Math.min(100, Math.round(need / budget * 100)) + '%';
        el.ctxFill.className = 'w-fill ' + (over ? 'neg' : 'pos');
        el.ctxVram.textContent = tr('Memory: {used} GB of {budget} GB', { used: need.toFixed(2), budget: budget });
        el.ctxState.textContent = state;
        el.ctxState.className = 'ctx-state' + (over ? ' bad' : (m && m.decided ? (m.remembered ? ' good' : ' bad') : ''));
    }

    /* ------------------------------------------------------------------ */
    /* Rule rooms: the SYSTEM prompt                                       */
    /* ------------------------------------------------------------------ */
    function sysEff() { return L.sysEffects(S.sys.selected); }

    // With a goal in its prompt Pip heads for the golden plate. Without one it just goes for the nearest plate.
    function sysTarget() {
        var room = S.room;
        if (sysEff().goal) { return room.plate; }
        var all = [room.plate].concat(room.decoys);
        all.sort(function (a, b) {
            return (Math.abs(a.x - S.pip.x) + Math.abs(a.y - S.pip.y)) - (Math.abs(b.x - S.pip.x) + Math.abs(b.y - S.pip.y));
        });
        return all[0];
    }

    function sysApply() { S.room.hazardPen = sysEff().pen; }

    function sysPreviewText() {
        var sel = S.sys.selected;
        var lines = (S.room.sys.cards || []).filter(function (id) { return sel.indexOf(id) >= 0; })
            .map(function (id) { return tr(L.SYS_RULES[id].text); });
        return 'FROM pip\nSYSTEM """' + (lines.length ? '\n' + lines.join('\n') + '\n' : '') + '"""';
    }

    function renderSysPanel() {
        var sys = S.room.sys;
        el.sysCards.innerHTML = '';
        sys.cards.forEach(function (id, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'rule-card' + (S.sys.selected.indexOf(id) >= 0 ? ' on' : '');
            b.dataset.rule = id;
            b.setAttribute('aria-pressed', S.sys.selected.indexOf(id) >= 0 ? 'true' : 'false');
            b.textContent = (i + 1) + '. ' + tr(L.SYS_RULES[id].text);
            b.addEventListener('click', function () { toggleRule(id); b.blur(); });
            el.sysCards.appendChild(b);
        });
        el.sysPreview.textContent = sysPreviewText();
    }

    function toggleRule(id) {
        if (!S.room || !S.room.sys) { return; }
        var i = S.sys.selected.indexOf(id);
        if (i >= 0) { S.sys.selected.splice(i, 1); } else { S.sys.selected.push(id); }
        sysApply();
        renderSysPanel();
        // editing the system prompt means loading a new version of the model, so Pip starts again
        S.pipWait = 0;
        resetPipRun();
        setNote(tr('<strong>System prompt updated.</strong> Pip starts again with the new rules.'), '', 6000);
    }

    function sysHint() {
        var sel = S.sys.selected;
        if (sel.indexOf('speed') >= 0) {
            return tr('Pip read “whatever it takes” and put speed before safety. A rule like that can cancel your safety rules.');
        }
        if (sel.indexOf('careful') >= 0 || sel.indexOf('danger') >= 0) {
            return tr('“Be careful” does not say what to avoid. Pip needs a specific rule that names the danger.');
        }
        return tr('Pip has no rule that names this danger. Add a specific rule for it.');
    }

    function sysTick() {
        var room = S.room;
        sysApply();
        var res = L.pipStep(room, S.pip, S.T, Math.random, S.hero, sysTarget());
        S.steps++;
        S.roomSteps++;
        pushTrail(S.pip.x, S.pip.y);
        logChoice(res);
        if (res.bumped) { S.bumpT = 240; S.bumpDir = res.dir; }
        if (res.hitSpike) {
            S.hurtT = 320;
            if (S.pip.hp <= 0) {
                setNote(tr('<strong>Pip fainted.</strong> {hint}', { hint: sysHint() }), 'bad', 9000);
                S.pipWait = 2400;
                return;
            }
            setNote(tr('<strong>Ouch!</strong> Pip walked into a hazard. Check its system prompt.'), 'bad', 5000);
        }
        var onDecoy = room.decoys.some(function (d) { return d.x === S.pip.x && d.y === S.pip.y; });
        if (onDecoy) {
            setNote(tr('<strong>Wrong plate.</strong> Pip has no goal in its prompt, so it went for the nearest plate. Tell it which plate matters.'), 'bad', 8000);
            S.pipWait = 2400;
            return;
        }
        if (res.onPlate) {
            S.pip.doorOpen = true;
            S.pip.done = true;
            setNote(tr('<strong>Click!</strong> Pip followed its system prompt to the golden plate. The door is open, Hero, go!'), 'good', 8000);
            maybeShowLesson('sysrules');
        }
    }

    function updateSysPanel() {
        if (!S.room || !S.room.sys) { return; }
        var key = S.sys.selected.join(',') + '|' + S.pip.hp + '|' + S.pip.done;
        if (el.sysState.dataset.cur === key) { return; }
        el.sysState.dataset.cur = key;
        el.sysState.textContent = S.pip.done ? tr('Pip followed its rules.') : (S.sys.selected.length ? '' : tr('The prompt is empty. Pip has no rules.'));
        el.sysState.className = 'ctx-state' + (S.pip.done ? ' good' : '');
    }

    /* ------------------------------------------------------------------ */
    /* Rooms                                                               */
    /* ------------------------------------------------------------------ */
    function loadRoom(index, skipIntro) {
        var rooms = S.dungeon.rooms;
        S.roomIndex = index;
        S.room = L.parseRoom(rooms[index]);
        S.bg = renderBackground(S.room, S.dungeon.theme);
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
        el.floorLabel.textContent = S.dungeon.title + ' · ' + S.dungeon.unit + ' ' + (index + 1) + '/' + rooms.length + ' · ' + S.room.title; // all already translated
        S.noteUntil = 0;
        S.mem = null;
        el.panelCtx.hidden = !S.room.memory;
        el.panelSys.hidden = !S.room.sys;
        if (S.room.sys) {
            S.sys = { selected: [] };
            sysApply();
            renderSysPanel();
            el.sysState.dataset.cur = '';
            setTemp(0);
        }
        if (S.room.memory) { memStart(); }
        if (skipIntro) {
            S.mode = 'play';
            if (S.room.memory) { memAnnounce(); }
            return;
        }
        var pages = STORY[S.room.id];
        showOverlay({ title: S.room.title, pages: pages, button: 'Go', onDone: function () { if (S.room && S.room.memory) { memAnnounce(); } } });
    }

    function faint() {
        S.faints++;
        var hot = S.T >= 1.0;
        var msg = hot
            ? tr('At temperature {t} Pip\'s choices are unpredictable, and this time that meant too many spike steps. Check the decision log, then try a cooler setting.', { t: S.T.toFixed(1) })
            : tr('Pip fainted at temperature {t}. Check the decision log and the move odds, then try a different setting.', { t: S.T.toFixed(1) });
        var pages = [[msg]];
        if (!S.lessons.sampling) {
            S.lessons.sampling = true;
            collectCard('sampling');
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
            pages[pages.length - 1].push(tr('Times Pip fainted: <b>{faints}</b>. Steps Pip took: <b>{steps}</b>.', { faints: S.faints, steps: S.steps }));
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
    var PUZZLE_LESSON = {
        rules: 'rules', learn: 'learning', vault: 'vault',
        sorting: 'kinds', tokens: 'tokens', agent: 'agent',
        packing: 'quant', datagate: 'privacy', toll: 'cost',
        speed: 'speed', cache: 'cache', guardgate: 'guardrails',
        sysprompt: 'sysprompt', context: 'context', tokenunits: 'tokenunits',
        verify: 'hallucination', doors: 'grounding', poison: 'injection',
        agentloop: 'agentloop', guards: 'guards', autonomy: 'autonomy',
        shelf: 'toolspec', socket: 'mcp', pit: 'toolerrors',
        team: 'teams', files: 'agentfiles', memfile: 'agentmemory',
        attacks: 'jailbreaks', layers: 'layers', modified: 'modifiedmodels',
        hardware: 'gpus', engine: 'engines', bandwidth: 'bandwidth',
        inputs: 'multimodal', pixels: 'mediatokens', visionfit: 'visionvram',
        compaction: 'compaction', compnote: 'compnote', markov: 'markovchain',
        membound: 'membound', drafting: 'drafting'
    };

    function openPuzzle() {
        if (S.puzzleSolved) {
            setNote(tr('<strong>The golem stands calm.</strong> The door is open.'), 'good', 3000);
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
        setNote(tr('<strong>The golem steps aside.</strong> The door is open. Hero, go!'), 'good', 8000);
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
        if (t === 'S') { setNote(tr('<strong>Hero:</strong> I\'m not stepping on those spikes.'), '', 2500); return; }
        if (t === 'F') { setNote(tr('<strong>Hero:</strong> I\'m not walking through fire.'), '', 2500); return; }
        if (t === 'A') { openPuzzle(); return; }
        if (t === 'D' && !S.pip.doorOpen) {
            setNote(S.room.puzzle
                ? tr('<strong>The door is sealed.</strong> Challenge the golem.')
                : tr('<strong>The door is sealed.</strong> Get Pip onto the glowing plate.'), '', 3500);
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
        if (S.room.memory) { memTick(); return; }
        if (S.room.sys) { sysTick(); return; }
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
                setNote(tr('<strong>Pip keeps bonking the wall.</strong> At low temperature it picks the same top move every time, so it repeats forever. Raise the temperature to let it explore.'), 'bad', 9000);
                lesson = 'stuck';
            }
        } else {
            S.bumpStreak = 0;
        }
        if (res.hitSpike) {
            S.hurtT = 320;
            setNote(tr('<strong>Ouch!</strong> Pip sampled a low-probability move and stepped on spikes. At higher temperature, unlikely moves happen more often.'), 'bad', 6000);
            if (S.pip.hp <= 0) { faint(); return; }
            lesson = 'sampling';
        }
        if (res.onPlate) {
            if (S.room.trial) {
                finishTrialRun();
            } else {
                S.pip.doorOpen = true;
                S.pip.done = true;
                setNote(tr('<strong>Click!</strong> Pip is on the plate and the door is open. Hero, go!'), 'good', 6000);
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
        if (r.memory) { drawMemoryProps(r); }
        if (r.decoys) { r.decoys.forEach(function (d) { drawDecoy(d.x, d.y); }); }
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
                var stepMs = S.room.memory ? STEP_MS_MEMORY : (S.room.sys ? STEP_MS_SYS : STEP_MS);
                while (S.acc >= stepMs && S.mode === 'play' && !S.pip.done && S.pipWait <= 0) {
                    S.acc -= stepMs;
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
        } else if (forge && S.room && S.room.memory && (e.key === 'z' || e.key === 'Z')) {
            e.preventDefault();
            setCtx(CTX[Math.max(0, CTX.indexOf(S.ctx) - 1)]);
        } else if (forge && S.room && S.room.memory && (e.key === 'c' || e.key === 'C')) {
            e.preventDefault();
            setCtx(CTX[Math.min(CTX.length - 1, CTX.indexOf(S.ctx) + 1)]);
        } else if (forge && S.room && S.room.sys && /^[1-9]$/.test(e.key) && S.room.sys.cards[parseInt(e.key, 10) - 1]) {
            e.preventDefault();
            toggleRule(S.room.sys.cards[parseInt(e.key, 10) - 1]);
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
    el.ctxSlider.addEventListener('input', function () { setCtx(CTX[parseInt(el.ctxSlider.value, 10)]); });
    el.ctxSlider.addEventListener('change', function () { el.ctxSlider.blur(); });
    el.ctxDown.addEventListener('click', function () { setCtx(CTX[Math.max(0, CTX.indexOf(S.ctx) - 1)]); el.ctxDown.blur(); });
    el.ctxUp.addEventListener('click', function () { setCtx(CTX[Math.min(CTX.length - 1, CTX.indexOf(S.ctx) + 1)]); el.ctxUp.blur(); });

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
            return {
                cleared: (p && p.cleared && typeof p.cleared === 'object') ? p.cleared : {},
                cards: (p && p.cards && typeof p.cards === 'object') ? p.cards : {}
            };
        } catch (e) {
            return { cleared: {}, cards: {} };
        }
    }

    function saveProgress() {
        try { window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(S.progress)); } catch (e) { /* private mode etc. */ }
    }

    /* ------------------------------------------------------------------ */
    /* Grimoire: every lesson collected as a card you can revisit          */
    /* ------------------------------------------------------------------ */
    // Order here is the order shown. `dungeon` ties a card to the dungeon that teaches it.
    var CARD_META = C.CARD_META;

    // A card is collected when its lesson was shown, or when its whole dungeon was already cleared
    // (so progress saved before the grimoire existed still counts).
    function isCollected(key) {
        var m = CARD_META[key];
        return !!(S.progress.cards[key] || (m && S.progress.cleared[m.dungeon]));
    }

    function collectCard(key) {
        if (!CARD_META[key] || S.progress.cards[key]) { return; }
        S.progress.cards[key] = true;
        saveProgress();
    }

    function grimoireTotals() {
        var keys = Object.keys(CARD_META);
        var got = keys.filter(isCollected).length;
        return { got: got, total: keys.length };
    }

    function updateGrimCount() {
        var t = grimoireTotals();
        el.grimCount.textContent = t.got + ' / ' + t.total;
    }

    // The plain text of a card, used for searching. Locked cards only offer what is already shown on them.
    function cardSearchText(k) {
        var m = CARD_META[k];
        var d = dungeonById(m.dungeon);
        if (!isCollected(k)) { return (m.where + ' ' + (d ? d.title : '')).toLowerCase(); }
        var body = LESSONS[k].join(' ').replace(/<[^>]*>/g, ' ');
        var refs = (REFS[k] || []).map(function (r) { return r.t + ' ' + r.s; }).join(' ');
        return [m.title, m.where, m.line, d ? d.title : '', body, refs].join(' ').toLowerCase();
    }

    function matchesQuery(k, terms) {
        if (!terms.length) { return true; }
        var text = cardSearchText(k);
        return terms.every(function (t) { return text.indexOf(t) >= 0; });
    }

    function renderGrimoire() {
        el.grimList.textContent = '';
        var t = grimoireTotals();
        var query = (el.grimSearch && el.grimSearch.value || '').trim().toLowerCase();
        var terms = query ? query.split(/\s+/) : [];
        el.grimIntro.textContent = tr('You have collected {got} of {total} cards. Each one is an idea from a dungeon. Open a card to read it again. Locked cards show where to find them.', { got: t.got, total: t.total });
        el.grimClear.hidden = !query;
        var found = 0;
        var openAll = false;
        if (terms.length) {
            var count = Object.keys(CARD_META).filter(function (k) { return matchesQuery(k, terms); }).length;
            openAll = count <= 5;
        }
        L.DUNGEONS.forEach(function (d) {
            var keys = Object.keys(CARD_META).filter(function (k) { return CARD_META[k].dungeon === d.id && matchesQuery(k, terms); });
            if (!keys.length) { return; }
            el.grimList.appendChild(mk('h2', 'group-title', d.title));
            var grid = mk('div', 'gcards');
            keys.forEach(function (k) {
                var m = CARD_META[k];
                found++;
                if (isCollected(k)) {
                    var card = mk('details', 'gcard');
                    if (openAll) { card.open = true; }
                    var sum = mk('summary', '');
                    sum.appendChild(mk('span', 'g-title', m.title));
                    sum.appendChild(mk('span', 'g-where', m.where));
                    sum.appendChild(mk('span', 'g-line', m.line));
                    card.appendChild(sum);
                    var body = mk('div', 'g-body');
                    LESSONS[k].forEach(function (html) {
                        var p = document.createElement('p');
                        p.innerHTML = html; // constant strings from LESSONS above, never user input
                        body.appendChild(p);
                    });
                    var refs = REFS[k];
                    if (refs && refs.length) {
                        var box = mk('div', 'g-refs');
                        box.appendChild(mk('p', 'g-refs-title', tr('Sources and further reading')));
                        var ul = document.createElement('ul');
                        refs.forEach(function (r) {
                            var li = document.createElement('li');
                            li.innerHTML = refLinkHtml(r); // fixed strings from content.js
                            ul.appendChild(li);
                        });
                        box.appendChild(ul);
                        body.appendChild(box);
                    }
                    card.appendChild(body);
                    grid.appendChild(card);
                } else {
                    var locked = mk('div', 'gcard locked');
                    locked.appendChild(mk('span', 'g-title', '???'));
                    locked.appendChild(mk('span', 'g-where', tr('Found in {dungeon} › {where}', { dungeon: d.title, where: m.where })));
                    grid.appendChild(locked);
                }
            });
            el.grimList.appendChild(grid);
        });
        if (!terms.length) {
            el.grimResults.textContent = tr('Links in the cards open outside pages in a new tab. They are in English.');
        } else if (!found) {
            el.grimResults.textContent = tr('No cards match "{q}".', { q: query });
        } else {
            var lockedCount = Object.keys(CARD_META).filter(function (k) { return !isCollected(k); }).length;
            el.grimResults.textContent = tr('{n} cards found.', { n: found }) + (lockedCount ? ' ' + tr('The {n} locked cards are not searched, because their lessons are still hidden.', { n: lockedCount }) : '');
        }
    }

    function showGrimoire() {
        el.hub.hidden = true;
        el.grimoire.hidden = false;
        el.toHub.hidden = false;
        el.backLink.hidden = true;
        el.floorLabel.textContent = tr('Grimoire');
        el.grimSearch.value = '';
        renderGrimoire();
        if (window.scrollTo) { window.scrollTo(0, 0); }
    }

    /* ------------------------------------------------------------------ */
    /* Dungeon hub                                                         */
    /* ------------------------------------------------------------------ */
    var GROUPS = [
        { id: 'basics', title: 'The Basics' },
        { id: 'bonus', title: 'Bonus Dungeons' }
    ];
    var BADGE_TEXT = { easy: 'Easy', medium: 'Medium', hard: 'Hard', bonus: 'Bonus' };

    function dungeonById(id) {
        for (var i = 0; i < L.DUNGEONS.length; i++) { if (L.DUNGEONS[i].id === id) { return L.DUNGEONS[i]; } }
        return null;
    }

    function dungeonStatus(d) {
        if (!d.ready) { return { state: 'soon', text: tr('Coming soon') }; }
        var done = !!S.progress.cleared[d.id];
        var missing = (d.requires || []).filter(function (id) { return !S.progress.cleared[id]; });
        if (missing.length && !done) {
            var text;
            if (missing.length > 1) {
                text = '\uD83D\uDD12 ' + tr('Clear all of The Basics first');
            } else {
                var pre = dungeonById(missing[0]);
                text = '\uD83D\uDD12 ' + tr('Clear "{title}" first', { title: pre ? pre.title : missing[0] });
            }
            return { state: 'locked', text: text };
        }
        if (done) { return { state: 'cleared', text: '\u2605 ' + tr('Cleared!') }; }
        return { state: 'ready', text: '\u25B6 ' + tr('Play') };
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
            g.drawImage(renderBackground(room, d.theme), 0, 0);
            if (room.altar) { g.drawImage(sprite['golem_' + room.puzzle], room.altar.x * TILE, room.altar.y * TILE); }
            if (room.chest) { g.drawImage(sprite.chest, room.chest.x * TILE, room.chest.y * TILE); }
            if (room.plate) { g.fillStyle = '#ffd166'; g.fillRect(room.plate.x * TILE + 4, room.plate.y * TILE + 4, 8, 8); }
            g.drawImage(sprite.hero, room.hero.x * TILE, room.hero.y * TILE);
            if (!room.noPip) { g.drawImage(sprite.pip, room.pip.x * TILE, room.pip.y * TILE); }
        } else {
            theme = THEMES.default;
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
            el.hubGroups.appendChild(mk('h2', 'group-title', tr(grp.title)));
            var cards = mk('div', 'cards');
            list.forEach(function (d) {
                var st = dungeonStatus(d);
                var btn = mk('button', 'dcard is-' + st.state);
                btn.setAttribute('type', 'button');
                btn.disabled = st.state === 'locked' || st.state === 'soon';
                btn.dataset.dungeon = d.id;
                var title = mk('h3', '', d.title);
                title.appendChild(mk('span', 'badge ' + d.difficulty, tr(BADGE_TEXT[d.difficulty])));
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
        el.pipTitle.textContent = forge ? tr('Pip') : tr('Objective');
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
        el.grimoire.hidden = true;
        el.game.hidden = true;
        el.toHub.hidden = true;
        el.backLink.hidden = false;
        el.floorLabel.textContent = tr('Choose a dungeon');
        renderHub();
        updateGrimCount();
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
    el.openGrim.addEventListener('click', showGrimoire);
    el.grimSearch.setAttribute('placeholder', tr('Search the Grimoire') + ': num_ctx, token, MCP...');
    el.grimSearch.addEventListener('input', renderGrimoire);
    el.grimClear.addEventListener('click', function () { el.grimSearch.value = ''; renderGrimoire(); el.grimSearch.focus(); });

    /* ------------------------------------------------------------------ */
    /* Boot                                                                */
    /* ------------------------------------------------------------------ */
    S.progress = loadProgress();
    if (window.I18n) {
        window.I18n.dom(document);                        // translate the static page text
        if (document.documentElement) { document.documentElement.lang = window.I18n.lang === 'bm' ? 'ms' : 'en'; }
    }
    var curLang = window.I18n ? window.I18n.lang : 'en';
    [[el.langEn, 'en'], [el.langBm, 'bm']].forEach(function (pair) {
        var btn = pair[0];
        btn.setAttribute('aria-pressed', curLang === pair[1] ? 'true' : 'false');
        btn.className = 'lang-btn' + (curLang === pair[1] ? ' on' : '');
        btn.addEventListener('click', function () {
            if (curLang !== pair[1] && window.I18n) { window.I18n.setLang(pair[1]); } // saves the choice and reloads
        });
    });
    buildBars();
    setTemp(0.0);
    setCtx(8, true);
    showHub();
    requestAnimationFrame(frame);
})();

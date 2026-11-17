/*
 * Dungeon of Weights - Floor 1 prototype (browser, canvas, no dependencies).
 * Game rules live in logic.js; this file is rendering, input and story.
 */
(function () {
    'use strict';

    var L = window.Logic;
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
        ovBtn: $('ov-btn'), ovLink: $('ov-link'), ovHint: $('ov-hint'),
        temp: $('temp'), tValue: $('t-value'), tLabel: $('t-label'),
        tDown: $('t-down'), tUp: $('t-up'),
        bars: $('bars'), hp: $('hp'), objective: $('objective'),
        note: $('note'), floorLabel: $('floor-label')
    };

    /* ------------------------------------------------------------------ */
    /* Pixel art (drawn in code, 8x8 sprites at 2x)                        */
    /* ------------------------------------------------------------------ */
    var PAL = {
        o: '#1b1230', h: '#c9742e', s: '#f2c9a0', e: '#1b1230', b: '#3a86ff',
        w: '#ffffff', c: '#4cc9f0', d: '#14213d', m: '#ef476f', a: '#ffd166',
        n: '#8d5a2b', y: '#ffd166'
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
        ]
    };

    function makeSprite(rows) {
        var c = document.createElement('canvas');
        c.width = TILE;
        c.height = TILE;
        var g = c.getContext('2d');
        for (var y = 0; y < rows.length; y++) {
            for (var x = 0; x < rows[y].length; x++) {
                var ch = rows[y][x];
                if (ch !== '.' && PAL[ch]) {
                    g.fillStyle = PAL[ch];
                    g.fillRect(x * 2, y * 2, 2, 2);
                }
            }
        }
        return c;
    }

    var sprite = {};
    Object.keys(SPRITES).forEach(function (k) { sprite[k] = makeSprite(SPRITES[k]); });

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
    var STORY = {
        title: {
            title: 'Dungeon of Weights',
            pages: [
                ['You are the <b>Hero</b>. Your sidekick is <b>Pip</b>, a tiny AI model in a small pixel body.',
                    'You steer the Hero. Pip decides its <i>own</i> moves, but you control <b>how</b> it decides.',
                    'Floor 1 teaches one idea: <b>temperature</b>.']
            ],
            button: 'Enter the dungeon'
        },
        hall: [
            ['Pip wants to reach the glowing plate. Every step it <b>scores</b> its four possible moves (closer to the plate scores higher) and then <b>picks one</b>.',
                'The bars under the map show Pip\'s chance of each move, just like an LLM\'s next-token odds.'],
            ['<b>Temperature</b> controls the pick. Low means Pip always takes its best-scoring move. High means it sometimes takes a worse one.',
                'This hall is lined with spikes. Pip knows they\'re bad, but a hot Pip may step on them anyway.',
                '<span class="tip">Turn the dial down (Q or the slider), then watch Pip.</span>']
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
        mode: 'overlay',     // 'overlay' | 'play'
        roomIndex: 0,
        room: null,
        bg: null,
        hero: { x: 1, y: 1 },
        pip: { x: 1, y: 1, hp: L.PIP_MAX_HP, doorOpen: false, done: false },
        T: 1.0,
        acc: 0,
        bumpStreak: 0,
        bumpT: 0,
        bumpDir: 0,
        hurtT: 0,
        stuckHinted: false,
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
        // opts: {title, pages: [[html paragraphs]], button, onDone, showLink}
        overlayState = { opts: opts, page: 0 };
        S.mode = 'overlay';
        el.ovTitle.textContent = opts.title;
        el.ovLink.hidden = !opts.showLink;
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
        S.mode = 'play';
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
        var active = S.mode === 'play' && !S.pip.done && S.room;
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
        updateBars();
        var text = S.time < S.noteUntil ? S.noteText : tempNote(S.T);
        var kind = S.time < S.noteUntil ? S.noteKind : '';
        if (el.note.dataset.cur !== text + kind) {
            el.note.innerHTML = text;
            el.note.className = 'note ' + kind;
            el.note.dataset.cur = text + kind;
        }
    }

    /* ------------------------------------------------------------------ */
    /* Rooms                                                               */
    /* ------------------------------------------------------------------ */
    function loadRoom(index, skipIntro) {
        S.roomIndex = index;
        S.room = L.parseRoom(L.ROOMS[index]);
        S.bg = renderBackground(S.room);
        S.hero = { x: S.room.hero.x, y: S.room.hero.y };
        S.pip = { x: S.room.pip.x, y: S.room.pip.y, hp: L.PIP_MAX_HP, doorOpen: false, done: false };
        S.acc = 0;
        S.bumpStreak = 0;
        S.bumpT = 0;
        S.hurtT = 0;
        S.stuckHinted = false;
        el.objective.textContent = S.room.objective;
        el.floorLabel.textContent = 'Floor 1 · Room ' + (index + 1) + '/' + L.ROOMS.length + ' · ' + S.room.title;
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
            ? 'Pip took a risky step at temperature ' + S.T.toFixed(1) + '. High temperature makes unlikely moves (like spikes) more likely. Try a lower setting.'
            : 'Pip fainted at temperature ' + S.T.toFixed(1) + '. Watch the move odds and try a different setting.';
        showOverlay({
            title: 'Pip fainted!',
            pages: [[msg]],
            button: 'Try again',
            onDone: function () { loadRoom(S.roomIndex, true); }
        });
    }

    function clearFloor() {
        S.mode = 'overlay';
        showOverlay({
            title: 'Floor 1 cleared!',
            pages: [
                ['<b>Loot: the Temperature Dial.</b> Yours to keep.',
                    'Low temperature gives focused, repeatable output: good for facts, code and precision. High temperature gives varied, exploratory output: good for ideas and stories, but riskier.',
                    'Real models work the same way: temperature rescales the odds of every possible next token.'],
                ['Pip fainted <b>' + S.faints + '</b> time' + (S.faints === 1 ? '' : 's') + ' and took <b>' + S.steps + '</b> steps.',
                    '<span class="tip">Coming next: Floor 2, The Long Corridor, where Pip\'s memory (context length) runs out.</span>']
            ],
            button: 'Play again',
            showLink: true,
            onDone: function () { S.faints = 0; S.steps = 0; loadRoom(0); }
        });
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
        if (t === 'D' && !S.pip.doorOpen) {
            setNote('<strong>The door is sealed.</strong> Get Pip onto the glowing plate.', '', 3500);
            return;
        }
        if (t === 'K') { clearFloor(); return; }
        S.hero.x = nx;
        S.hero.y = ny;
        if (t === 'D') {
            if (S.roomIndex + 1 < L.ROOMS.length) { loadRoom(S.roomIndex + 1); }
        }
    }

    /* ------------------------------------------------------------------ */
    /* Pip step                                                            */
    /* ------------------------------------------------------------------ */
    function pipTick() {
        var res = L.pipStep(S.room, S.pip, S.T, Math.random, S.hero);
        S.steps++;
        if (res.bumped) {
            S.bumpT = 240;
            S.bumpDir = res.dir;
            S.bumpStreak++;
            if (S.bumpStreak >= 6 && !S.stuckHinted && S.T < 1.0 && !S.room.followHero) {
                S.stuckHinted = true;
                setNote('<strong>Pip keeps bonking the wall.</strong> At low temperature it picks the same top move every time, so it repeats forever. Raise the temperature to let it explore.', 'bad', 9000);
            }
        } else {
            S.bumpStreak = 0;
        }
        if (res.hitSpike) {
            S.hurtT = 320;
            setNote('<strong>Ouch!</strong> Pip sampled a low-probability move and stepped on spikes. At higher temperature, unlikely moves happen more often.', 'bad', 6000);
            if (S.pip.hp <= 0) { faint(); return; }
        }
        if (res.onPlate) {
            S.pip.doorOpen = true;
            S.pip.done = true;
            setNote('<strong>Click!</strong> Pip is on the plate and the door is open. Hero, go!', 'good', 6000);
        }
    }

    /* ------------------------------------------------------------------ */
    /* Rendering                                                           */
    /* ------------------------------------------------------------------ */
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!S.room) { return; }
        ctx.drawImage(S.bg, 0, 0);

        var r = S.room;
        if (r.door) { drawDoor(r.door.x, r.door.y, S.pip.doorOpen); }
        if (r.plate) { drawPlate(r.plate.x, r.plate.y, S.pip.doorOpen, S.time); }
        if (r.chest) {
            ctx.drawImage(sprite.chest, r.chest.x * TILE, r.chest.y * TILE);
            if (Math.floor(S.time / 400) % 2) {
                ctx.fillStyle = '#fff3c4';
                ctx.fillRect(r.chest.x * TILE + 12, r.chest.y * TILE + 1, 2, 2);
                ctx.fillRect(r.chest.x * TILE + 2, r.chest.y * TILE + 3, 1, 1);
            }
        }

        // Pip
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

        if (S.mode === 'play' && S.room && !S.pip.done) {
            S.acc += dt;
            while (S.acc >= STEP_MS && S.mode === 'play' && !S.pip.done) {
                S.acc -= STEP_MS;
                pipTick();
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

        if (S.mode === 'overlay') {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                advanceOverlay();
            }
            return;
        }

        var m = KEYMAP[e.key];
        if (m) {
            e.preventDefault();
            moveHero(m[0], m[1]);
        } else if (e.key === 'q' || e.key === 'Q' || e.key === '[') {
            e.preventDefault();
            setTemp(S.T - 0.1);
        } else if (e.key === 'e' || e.key === 'E' || e.key === ']') {
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
    /* Boot                                                                */
    /* ------------------------------------------------------------------ */
    buildBars();
    setTemp(1.0);
    loadRoom(0, true);                     // draw room behind the title card
    S.mode = 'overlay';
    showOverlay({
        title: STORY.title.title,
        pages: STORY.title.pages,
        button: STORY.title.button,
        onDone: function () { loadRoom(0); }
    });
    requestAnimationFrame(frame);
})();

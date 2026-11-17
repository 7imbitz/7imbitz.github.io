/*
 * Dungeon of Weights - pure game logic (no DOM).
 * Shared by the browser game (game.js) and the headless tuning script.
 *
 * Pip, the companion, is a tiny "model". Every step it scores each of its
 * four possible moves, turns the scores into probabilities with a softmax
 * controlled by TEMPERATURE, and samples one move - exactly how an LLM
 * picks its next token.
 */
(function (root) {
    'use strict';

    var DIRS = [
        { key: 'up', arrow: '↑', dx: 0, dy: -1 },
        { key: 'down', arrow: '↓', dx: 0, dy: 1 },
        { key: 'left', arrow: '←', dx: -1, dy: 0 },
        { key: 'right', arrow: '→', dx: 1, dy: 0 }
    ];

    var COLS = 16;
    var ROWS = 9;
    var SPIKE_PENALTY = 1.5; // Pip "knows" spikes are bad, but only as a score penalty
    var GREEDY_BELOW = 0.05; // below this, temperature is treated as 0 (argmax)
    var PIP_MAX_HP = 3;

    /*
     * Legend: # wall . floor S spikes P plate D exit door K chest
     *         H hero start  C Pip start
     */
    var ROOMS = [
        {
            id: 'hall',
            title: 'Hall of Repeats',
            objective: 'Get Pip to the glowing plate to open the door.',
            map: [
                '################',
                '#H.............D',
                '################',
                '#..............#',
                '#.SSSSSSSSSSSS.#',
                '#C............P#',
                '#.SSSSSSSSSSSS.#',
                '#..............#',
                '################'
            ]
        },
        {
            id: 'garden',
            title: 'Garden of Wonders',
            objective: 'Pip must reach the plate on the other side of the wall.',
            map: [
                '################',
                '#......#.......#',
                '#......#.......#',
                '#..............#',
                '#C.....#......P#',
                '#......#.......#',
                '#......#.......#',
                '#H.....#.......D',
                '################'
            ]
        },
        {
            id: 'gap',
            title: 'The Narrow Gap',
            objective: 'Squeeze Pip through the gap and past the spikes.',
            map: [
                '################',
                '#......#.......#',
                '#......#.......#',
                '#..............#',
                '#C.....#SSSSSSP#',
                '#......#.......#',
                '#......#.......#',
                '#H.....#.......D',
                '################'
            ]
        },
        {
            id: 'treasure',
            title: 'Treasure Room',
            objective: 'Walk to the chest. Pip will tag along (its own way).',
            followHero: true,
            map: [
                '################',
                '#H.............#',
                '#..............#',
                '#..............#',
                '#.......K......#',
                '#..............#',
                '#..............#',
                '#..............#',
                '################'
            ]
        }
    ];

    function parseRoom(def) {
        var grid = [];
        var room = {
            id: def.id,
            title: def.title,
            objective: def.objective,
            followHero: !!def.followHero,
            grid: grid,
            hero: { x: 1, y: 1 },
            pip: { x: 1, y: 1 },
            plate: null,
            door: null,
            chest: null
        };
        for (var y = 0; y < def.map.length; y++) {
            var row = [];
            for (var x = 0; x < def.map[y].length; x++) {
                var c = def.map[y][x];
                if (c === 'H') { room.hero = { x: x, y: y }; c = '.'; }
                if (c === 'C') { room.pip = { x: x, y: y }; c = '.'; }
                if (c === 'P') { room.plate = { x: x, y: y }; }
                if (c === 'D') { room.door = { x: x, y: y }; }
                if (c === 'K') { room.chest = { x: x, y: y }; }
                row.push(c);
            }
            grid.push(row);
        }
        if (room.followHero) {
            room.pip = { x: Math.min(room.hero.x + 1, COLS - 2), y: room.hero.y };
        }
        return room;
    }

    function tileAt(room, x, y) {
        if (y < 0 || y >= room.grid.length || x < 0 || x >= room.grid[y].length) { return '#'; }
        return room.grid[y][x];
    }

    // Is this tile impassable for Pip right now?
    function pipBlocked(room, x, y, doorOpen) {
        var t = tileAt(room, x, y);
        return t === '#' || t === 'K' || (t === 'D' && !doorOpen);
    }

    // Raw preference for each move: closer to the target is better, spikes
    // are penalised. Pip does NOT look at walls - it only "wants" to get close.
    function pipScores(room, pos, target) {
        return DIRS.map(function (d) {
            var nx = pos.x + d.dx;
            var ny = pos.y + d.dy;
            var s = -(Math.abs(nx - target.x) + Math.abs(ny - target.y));
            if (tileAt(room, nx, ny) === 'S') { s -= SPIKE_PENALTY; }
            return s;
        });
    }

    // Temperature-scaled softmax. T ~ 0 is greedy (argmax, first max wins).
    function softmax(scores, T) {
        var max = Math.max.apply(null, scores);
        if (T < GREEDY_BELOW) {
            var best = scores.indexOf(max);
            return scores.map(function (_, i) { return i === best ? 1 : 0; });
        }
        var ex = scores.map(function (s) { return Math.exp((s - max) / T); });
        var sum = ex.reduce(function (a, b) { return a + b; }, 0);
        return ex.map(function (e) { return e / sum; });
    }

    function sampleIndex(probs, rnd) {
        var r = rnd();
        var acc = 0;
        for (var i = 0; i < probs.length; i++) {
            acc += probs[i];
            if (r < acc) { return i; }
        }
        return probs.length - 1;
    }

    function pipTarget(room, hero) {
        return room.followHero ? hero : room.plate;
    }

    // One Pip step. Mutates `pip` ({x,y,hp,doorOpen}).
    function pipStep(room, pip, T, rnd, hero) {
        var target = pipTarget(room, hero);
        var probs = softmax(pipScores(room, pip, target), T);
        var i = sampleIndex(probs, rnd);
        var d = DIRS[i];
        var nx = pip.x + d.dx;
        var ny = pip.y + d.dy;
        var blocked = pipBlocked(room, nx, ny, pip.doorOpen);
        var res = { dir: i, bumped: blocked, hitSpike: false, onPlate: false, probs: probs };
        if (!blocked) {
            pip.x = nx;
            pip.y = ny;
            var t = tileAt(room, nx, ny);
            if (t === 'S') { pip.hp -= 1; res.hitSpike = true; }
            if (t === 'P') { res.onPlate = true; }
        }
        return res;
    }

    // Headless run of one room at a fixed temperature (used for tuning/tests).
    function simulate(room, T, maxSteps, rnd) {
        var pip = { x: room.pip.x, y: room.pip.y, hp: PIP_MAX_HP, doorOpen: false };
        for (var step = 1; step <= maxSteps; step++) {
            var r = pipStep(room, pip, T, rnd, room.hero);
            if (pip.hp <= 0) { return { result: 'fainted', steps: step }; }
            if (r.onPlate) { return { result: 'success', steps: step }; }
        }
        return { result: 'timeout', steps: maxSteps };
    }

    var api = {
        DIRS: DIRS,
        COLS: COLS,
        ROWS: ROWS,
        PIP_MAX_HP: PIP_MAX_HP,
        SPIKE_PENALTY: SPIKE_PENALTY,
        ROOMS: ROOMS,
        parseRoom: parseRoom,
        tileAt: tileAt,
        pipBlocked: pipBlocked,
        pipScores: pipScores,
        pipTarget: pipTarget,
        softmax: softmax,
        sampleIndex: sampleIndex,
        pipStep: pipStep,
        simulate: simulate
    };

    if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
    root.Logic = api;
})(typeof window !== 'undefined' ? window : globalThis);

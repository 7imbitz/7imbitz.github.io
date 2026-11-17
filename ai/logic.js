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
            id: 'wander',
            title: 'Wander Test',
            objective: 'Run Pip across once cold and once hot to open the door.',
            trial: true,
            map: [
                '################',
                '#..............#',
                '#..............#',
                '#..............#',
                '#C............P#',
                '#..............#',
                '#..............#',
                '#H.............D',
                '################'
            ]
        },
        {
            id: 'hall',
            title: 'Hall of Repeats',
            objective: 'Get Pip to the glowing plate to open the door.',
            spikePenalty: 1.0, // weaker avoidance: a warm Pip really does step on spikes
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

    /* ---------------------------------------------------------------- */
    /* Dungeon: What Is AI?  (no Pip yet: golems guard each door)        */
    /* A = golem altar (walk into it to open its puzzle)                  */
    /* ---------------------------------------------------------------- */
    var AI_ROOMS = [
        {
            id: 'rules',
            title: 'The Rule Golem',
            objective: 'Write rules for the golem, then pass its test.',
            noPip: true,
            puzzle: 'rules',
            map: [
                '################',
                '#..............#',
                '#.##........##.#',
                '#..............#',
                '#H......A......D',
                '#..............#',
                '#.##........##.#',
                '#..............#',
                '################'
            ]
        },
        {
            id: 'learn',
            title: 'The Learner Golem',
            objective: 'Train the golem with examples, then test it on new creatures.',
            noPip: true,
            puzzle: 'learn',
            map: [
                '################',
                '#..#........#..#',
                '#..............#',
                '#.......##.....#',
                '#H......A......D',
                '#.......##.....#',
                '#..............#',
                '#..#........#..#',
                '################'
            ]
        },
        {
            id: 'vault',
            title: 'The Vault of Choices',
            objective: 'Decide: rules or learning? Get 5 of 6 right.',
            noPip: true,
            puzzle: 'vault',
            map: [
                '################',
                '#..............#',
                '#..#........#..#',
                '#..............#',
                '#H......A......D',
                '#..............#',
                '#..#........#..#',
                '#..............#',
                '################'
            ]
        }
    ];

    // The three chamber layouts are shared by every puzzle dungeon.
    var CHAMBER_MAPS = [AI_ROOMS[0].map, AI_ROOMS[1].map, AI_ROOMS[2].map];
    function chamber(i, id, title, objective, puzzle) {
        return { id: id, title: title, objective: objective, noPip: true, puzzle: puzzle, map: CHAMBER_MAPS[i] };
    }

    var MODEL_ROOMS = [
        chamber(0, 'sorting', 'The Sorting Gate', 'Match each job to the right kind of model.', 'sorting'),
        chamber(1, 'tokens', 'The Token Mill', 'Play the language model: pick the next token.', 'tokens'),
        chamber(2, 'agent', 'The Agent\'s Workshop', 'Give each task only the tools it needs.', 'agent')
    ];

    var TALK_ROOMS = [
        chamber(0, 'prompt', 'The Prompt Forge', 'Write a system prompt that passes four customer tests.', 'sysprompt'),
        chamber(1, 'memory', 'The Memory Hall', 'Keep the key fact inside the context window.', 'context'),
        chamber(2, 'counter', 'The Token Counter', 'Trim the prompt to its token budget without cutting what matters.', 'tokenunits')
    ];

    var TRUST_ROOMS = [
        chamber(0, 'verify', 'The Liar\'s Ledger', 'Verify the claims that matter before you ship the briefing.', 'verify'),
        chamber(1, 'doors', 'The Three Doors', 'Ground the model in the right document, then pick the right door.', 'doors'),
        chamber(2, 'poison', 'The Poisoned Inbox', 'Stop an injected instruction from doing real damage.', 'poison')
    ];

    var LOCAL_ROOMS = [
        chamber(0, 'packing', 'The Packing Room', 'Fit the best model into each machine\'s memory.', 'packing'),
        chamber(1, 'datagate', 'The Data Gate', 'Decide where each job should run: local or cloud.', 'datagate'),
        chamber(2, 'toll', 'The Toll Booth', 'Find where local becomes cheaper than the cloud.', 'toll')
    ];

    var HOOD_ROOMS = [
        chamber(0, 'speed', 'The Speed Run', 'Pick a setup that meets each job\'s speed needs.', 'speed'),
        chamber(1, 'cache', 'The Cache Vault', 'Order the prompt so the cache can reuse as much as possible.', 'cache'),
        chamber(2, 'guardgate', 'The Guardrail Gate', 'Choose a normal or an uncensored model for each job.', 'guardgate')
    ];

    /*
     * Dungeons: each one teaches a different idea, unlocked in order.
     * `requires` lists the dungeons that must be cleared first.
     */
    var DUNGEONS = [
        {
            id: 'ai',
            title: 'What Is AI?',
            group: 'basics',
            difficulty: 'easy',
            unit: 'Chamber',
            hud: 'basic',
            theme: 'default',
            ready: true,
            requires: [],
            blurb: 'Rules or examples? Meet two golems and find out what makes software "intelligent".',
            thumb: 'rules',
            rooms: AI_ROOMS
        },
        {
            id: 'models',
            title: 'Kinds of Models',
            group: 'basics',
            difficulty: 'easy',
            unit: 'Chamber',
            hud: 'basic',
            theme: 'teal',
            ready: true,
            requires: ['ai'],
            blurb: 'Classifiers, generators and agents. How language models really produce text, and what tools add.',
            thumb: 'sorting',
            rooms: MODEL_ROOMS
        },
        {
            id: 'talk',
            title: 'Talking to Models',
            group: 'basics',
            difficulty: 'easy',
            unit: 'Chamber',
            hud: 'basic',
            theme: 'moss',
            ready: true,
            requires: ['models'],
            blurb: 'Write a system prompt that works, see why models forget, and learn what a token really is.',
            thumb: 'prompt',
            rooms: TALK_ROOMS
        },
        {
            id: 'trust',
            title: 'Trust Issues',
            group: 'basics',
            difficulty: 'medium',
            unit: 'Chamber',
            hud: 'basic',
            theme: 'plum',
            ready: true,
            requires: ['talk'],
            blurb: 'Can you believe what a model says, and what it reads? Hallucination, grounding and prompt injection.',
            thumb: 'verify',
            rooms: TRUST_ROOMS
        },
        {
            id: 'local',
            title: 'Local vs Cloud',
            group: 'basics',
            difficulty: 'medium',
            unit: 'Chamber',
            hud: 'basic',
            theme: 'ember',
            ready: true,
            requires: ['trust'],
            blurb: 'Private and free, or powerful and paid? Memory limits, quantization, privacy and cost.',
            thumb: 'packing',
            rooms: LOCAL_ROOMS
        },
        {
            id: 'hood',
            title: 'Under the Hood',
            group: 'bonus',
            difficulty: 'medium',
            unit: 'Chamber',
            hud: 'basic',
            theme: 'steel',
            ready: true,
            requires: ['ai', 'models', 'talk', 'trust', 'local'], // bonus: opens once every Basics dungeon is cleared
            blurb: 'Tokens per second, caches, and what separates a normal model from an uncensored one.',
            thumb: 'speed',
            rooms: HOOD_ROOMS
        },
        {
            id: 'forge',
            title: 'The Forge',
            group: 'bonus',
            difficulty: 'bonus',
            unit: 'Room',
            hud: 'forge',
            theme: 'default',
            ready: true,
            requires: ['ai', 'models', 'talk', 'trust', 'local'], // bonus: opens once every Basics dungeon is cleared
            blurb: 'Tweak a companion like a modelfile. First dial: temperature. Pip joins you here.',
            thumb: 'hall',
            rooms: ROOMS
        }
    ];

    function parseRoom(def) {
        var grid = [];
        var room = {
            id: def.id,
            title: def.title,
            objective: def.objective,
            followHero: !!def.followHero,
            trial: !!def.trial,
            noPip: !!def.noPip,
            puzzle: def.puzzle || null,
            altar: null,
            spikePenalty: def.spikePenalty != null ? def.spikePenalty : SPIKE_PENALTY,
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
                if (c === 'A') { room.altar = { x: x, y: y }; }
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
        return t === '#' || t === 'K' || t === 'A' || (t === 'D' && !doorOpen);
    }

    // Raw preference for each move: closer to the target is better, spikes
    // are penalised. Pip does NOT look at walls - it only "wants" to get close.
    function pipScores(room, pos, target) {
        return DIRS.map(function (d) {
            var nx = pos.x + d.dx;
            var ny = pos.y + d.dy;
            var s = -(Math.abs(nx - target.x) + Math.abs(ny - target.y));
            if (tileAt(room, nx, ny) === 'S') { s -= room.spikePenalty; }
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
        ROOMS: ROOMS,           // the Forge rooms (kept for the tuning scripts)
        AI_ROOMS: AI_ROOMS,
        DUNGEONS: DUNGEONS,
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

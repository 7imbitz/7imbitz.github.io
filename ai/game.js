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
        grimoire: $('grimoire'), grimList: $('grimoire-list'), grimCount: $('grim-count'), grimIntro: $('grim-intro'), openGrim: $('open-grimoire'),
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
    var GOLEM_RUNE = {
        rules: '#4cc9f0', learn: '#06d6a0', vault: '#ffd166',
        sorting: '#b18cff', tokens: '#ff9f43', agent: '#ff6b9d',
        packing: '#4cc9f0', datagate: '#06d6a0', toll: '#ffd166',
        speed: '#ffd166', cache: '#4cc9f0', guardgate: '#ef476f',
        sysprompt: '#06d6a0', context: '#b18cff', tokenunits: '#ff9f43',
        verify: '#ef476f', doors: '#ffd166', poison: '#b18cff'
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
        plum:    { floorA: '#3a2433', floorB: '#34202d', speck: '#4a2f42', wall: '#7a3f64', wallDark: '#5c2f4c', wallLight: '#93517a' },
        moss:    { floorA: '#22362d', floorB: '#1e3028', speck: '#2b4639', wall: '#3f7a5c', wallDark: '#2e5c45', wallLight: '#54976f' },
        steel:   { floorA: '#262d3d', floorB: '#222938', speck: '#303a4f', wall: '#4a5a7a', wallDark: '#364360', wallLight: '#62759b' }
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
                    '<span class="tip">Next: Kinds of Models. What does a language model really do, and what turns it into an agent?</span>']
            ],
            clearButton: 'Back to the dungeons'
        },
        models: {
            intro: [
                ['"AI" is not one thing. A spam filter, a chatbot and a logo painter are different <b>kinds</b> of model, built for different jobs.'],
                ['Three chambers lie ahead: sort jobs by kind of model, find out how a language model really produces text, and see what <b>tools</b> turn a model into an agent.',
                    '<span class="tip">Walk into a golem to challenge it.</span>']
            ],
            introButton: 'Enter the dungeon',
            clearTitle: 'Kinds of Models cleared!',
            clear: [
                ['<b>Loot: the Tool Belt.</b>',
                    '<b>Kinds:</b> classifiers pick labels, predictors forecast numbers, generators create content, recommenders rank, and agents act with tools.',
                    '<b>Language models</b> generate one token at a time from probabilities. That is why they can be fluent and wrong.',
                    '<b>Agents</b> are a model plus tools. Give a model only the tools the job needs.'],
                ['<span class="tip">Next: Talking to Models. How do you give a model instructions, why does it forget, and what is a token really?</span>']
            ],
            clearButton: 'Back to the dungeons'
        },
        talk: {
            intro: [
                ['You know what kinds of models exist. Now learn to <b>talk</b> to them: how to give standing instructions, why they forget, and what a token really is.'],
                ['Three chambers lie ahead: write a system prompt that passes four customer tests, keep a key fact inside a finite context window, and trim a prompt by its token cost.',
                    '<span class="tip">Walk into a golem to challenge it.</span>']
            ],
            introButton: 'Enter the dungeon',
            clearTitle: 'Talking to Models cleared!',
            clear: [
                ['<b>Loot: the Quill.</b>',
                    'A <b>system prompt</b> is the standing brief. Be specific: a role, a format, boundaries, and what to do when a request is unclear. It guides the model but is not a lock.',
                    'The <b>context window</b> is finite memory. When it fills, the oldest messages are forgotten, so pin what matters, summarise, and trim.',
                    '<b>Tokens</b> are the unit you pay in, and what the model actually reads. It sees chunks, not letters.'],
                ['<span class="tip">Next: Trust Issues. Can you believe what a model says, and what it reads?</span>']
            ],
            clearButton: 'Back to the dungeons'
        },
        trust: {
            intro: [
                ['You can now instruct a model and tell what it remembers. But can you <b>trust</b> what it says, and what it reads?'],
                ['Three chambers lie ahead: check a briefing for invented claims, ground a model in the right document and pick the right door, and stop an inbox bot being hijacked by a hidden instruction.',
                    '<span class="tip">Walk into a golem to challenge it.</span>']
            ],
            introButton: 'Enter the dungeon',
            clearTitle: 'Trust Issues cleared!',
            clear: [
                ['<b>Loot: the Lantern.</b>',
                    '<b>Hallucination:</b> a confident tone is not evidence. Verify the specific, the private and the high-stakes.',
                    '<b>Grounding:</b> hand the model the right, current source. Try a prompt first, add retrieval for changing knowledge, and fine-tune last.',
                    '<b>Prompt injection:</b> assume it can succeed, and limit what a tricked model is able to do.'],
                ['<span class="tip">Next: Local vs Cloud. Where should a model run, and what does it cost?</span>']
            ],
            clearButton: 'Back to the dungeons'
        },
        local: {
            intro: [
                ['A model has to live somewhere. It can run on <b>your own machine</b> (local) or on <b>someone else\'s servers</b> (cloud). Each choice trades privacy, power and cost.'],
                ['Three chambers lie ahead: fit a model into limited memory, decide where sensitive jobs should run, and find the point where local becomes cheaper.',
                    '<span class="tip">Walk into a golem to challenge it.</span>']
            ],
            introButton: 'Enter the dungeon',
            clearTitle: 'Local vs Cloud cleared!',
            clear: [
                ['<b>Loot: the Modelfile Anvil.</b> You know where models can run and what that costs.',
                    '<b>Local:</b> private, works offline and has a fixed cost, but is limited by your hardware. Quantization lets bigger models fit.',
                    '<b>Cloud:</b> the strongest models and no hardware to manage, but you pay per use and your data leaves your machine.'],
                ['<span class="tip">The bonus dungeons are now open: <b>Under the Hood</b> (speed, caches, uncensored models) and <b>The Forge</b> (tweak Pip like a modelfile). The <b>Grimoire</b> on the hub keeps every idea you have learned.</span>']
            ],
            clearButton: 'Back to the dungeons'
        },
        hood: {
            intro: [
                ['You know what AI is, what kinds exist, and where models run. Now look <b>under the hood</b>: how fast a model runs, what it can remember cheaply, and what stops it saying certain things.'],
                ['Three chambers lie ahead: tokens per second, caches, and the difference between a normal and an uncensored model.',
                    '<span class="tip">Walk into a golem to challenge it.</span>']
            ],
            introButton: 'Enter the dungeon',
            clearTitle: 'Under the Hood cleared!',
            clear: [
                ['<b>Loot: the Stopwatch.</b>',
                    '<b>Speed</b> is tokens per second plus time to first token. Model size, quantization and hardware decide it.',
                    '<b>Caches</b> reuse earlier work: the KV cache lives inside the model, and prompt caching reuses an identical prefix. Put stable content first.',
                    '<b>Uncensored</b> means fewer refusals, not more intelligence. It moves the safety job from the model to you.'],
                ['<span class="tip">Try the Forge next. Local models are tuned with a <b>modelfile</b>: temperature, context length (num_ctx) and more.</span>']
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
        sorting: [
            ['Different jobs call for different <b>kinds</b> of model. The Sorting Gate opens only for someone who can match each job to the right kind.', '<span class="tip">Walk into a golem to challenge it.</span>']
        ],
        tokens: [
            ['Language models, the engines behind chatbots, are <b>generators</b>. Here is how they really work: one token at a time, each chosen by probability.',
                'You will play the model. Pick the next token and watch the odds.', '<span class="tip">Walk into a golem to challenge it.</span>']
        ],
        agent: [
            ['A model alone can only produce text. Give it <b>tools</b> and run it in a loop, and it becomes an <b>agent</b>.',
                'Your job: equip each task with exactly the tools it needs.', '<span class="tip">Walk into a golem to challenge it.</span>']
        ],
        packing: [
            ['A local model must fit in your machine\'s memory. Bigger models are generally better, but they need more space. <b>Quantization</b> compresses a model so a bigger one can fit.', '<span class="tip">Walk into a golem to challenge it.</span>']
        ],
        datagate: [
            ['Sensitive data, no internet, a very hard problem: the right home for a model depends on the job.', '<span class="tip">Walk into a golem to challenge it.</span>']
        ],
        toll: [
            ['Cloud costs scale with use. Local costs are fixed. Somewhere there is a crossover, and you are about to find it.', '<span class="tip">Walk into a golem to challenge it.</span>']
        ],
        speed: [
            ['A model streams its answer out <b>one token at a time</b>. How fast depends on the model\'s size, its precision and the hardware, and a long prompt delays the very first token.', '<span class="tip">Walk into a golem to challenge it.</span>']
        ],
        cache: [
            ['Re-reading a long prompt on every request is wasteful. A <b>cache</b> lets the system reuse work it already did, but only on an unchanged beginning.', '<span class="tip">Walk into a golem to challenge it.</span>']
        ],
        guardgate: [
            ['Some models refuse risky requests. Others have had that removed. Which one belongs where depends on who is using it and what could go wrong.', '<span class="tip">Walk into a golem to challenge it.</span>']
        ],
        prompt: [
            ['Brightfix has hired you to set up its support assistant. Four customers are waiting, and the assistant will follow whatever <b>system prompt</b> you give it.',
                'Choose the instructions to include, then run the four tests. Some instructions look fine but do nothing. One makes things worse.', '<span class="tip">Walk into a golem to challenge it.</span>']
        ],
        memory: [
            ['A model can only see what fits in its <b>context window</b>. Sam told the assistant something important at the very start, and a long conversation has followed.',
                'Decide what to keep, shrink, pin or drop so that the answer to the last question is safe.', '<span class="tip">Walk into a golem to challenge it.</span>']
        ],
        counter: [
            ['Models read <b>tokens</b>, and every token is billed. A prompt that goes out a million times has to be lean, but it must still contain everything the model needs.', '<span class="tip">Walk into a golem to challenge it.</span>']
        ],
        verify: [
            ['A model drafted a client briefing, and every claim sounds equally sure of itself. You do not have time to check them all.',
                'Decide which claims deserve one of your few checks before the briefing ships.', '<span class="tip">Walk into a golem to challenge it.</span>']
        ],
        doors: [
            ['Models answer best when they read from the right source. Pick the document a search tool should hand the model, then choose which of three doors fits each need.', '<span class="tip">Walk into a golem to challenge it.</span>']
        ],
        poison: [
            ['MailBot reads your inbox, and the outside world can write into it. Some of that text will try to give MailBot orders.',
                'You have room for only a few defences. Choose the ones that really hold.', '<span class="tip">Walk into a golem to challenge it.</span>']
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
        progress: { cleared: {}, cards: {} },
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
        hallucination: [
            '<b>Name it:</b> <i>hallucination</i>: a model produces fluent, confident text that is false, such as invented facts, citations or numbers. It is a side effect of predicting likely text.',
            '<b>In the real world:</b> the tone of an answer says nothing about its accuracy. Risk is highest for specific details: citations, quotes, precise figures, your own private data, recent events and niche facts.',
            '<b>Use it:</b> verify the high-stakes and the specific, ask for sources and open them, and give the model the facts instead of hoping it remembers.'
        ],
        grounding: [
            '<b>Name it:</b> <i>grounding</i>, often done with <i>retrieval-augmented generation</i> (RAG): fetch relevant, current documents when a question arrives and give them to the model to answer from.',
            '<b>In the real world:</b> prompts set behaviour, retrieval supplies knowledge, and fine-tuning changes the model\'s weights for style or behaviour. Fine-tuning is a poor way to store facts that change. Retrieval quality matters: wrong or outdated documents give wrong answers.',
            '<b>Use it:</b> try a prompt first, add retrieval for your own or fast-changing knowledge, and fine-tune only for a consistent style or format when the others fall short.'
        ],
        injection: [
            '<b>Name it:</b> <i>prompt injection</i>: untrusted text (an email, a web page, a document) contains instructions, and the model follows them as if they came from you.',
            '<b>In the real world:</b> models cannot reliably tell data from instructions, so no prompt reliably prevents it. It matters most for agents that have tools and access to private data.',
            '<b>Use it:</b> assume it can succeed, then shrink the damage: least-privilege tools, human approval for risky actions, allowlists, keeping secrets out of reach, and treating outside text as untrusted.'
        ],
        sysprompt: [
            '<b>Name it:</b> the <i>system prompt</i>: standing instructions a model receives before the conversation. It sets the role, the format, the boundaries and how to handle edge cases.',
            '<b>In the real world:</b> vague instructions ("be helpful") change little, and contradictory ones ("answer anything") quietly cancel your rules. Specific, checkable instructions give predictable behaviour, and the prompt is billed on every request.',
            '<b>Use it:</b> state the role, the output format, what not to do and what to do when unsure. Then test it with awkward inputs. A system prompt is guidance, not a security boundary: users can still try to talk past it.'
        ],
        context: [
            '<b>Name it:</b> the <i>context window</i>: the amount of text, measured in tokens, a model can see at once. Anything outside it is simply not known.',
            '<b>In the real world:</b> this is why a long chat seems to forget how it started. The oldest turns fall out first. Bigger windows help but cost more memory and money, and details can still get lost in the middle.',
            '<b>Use it:</b> put what must never be forgotten in the system prompt, summarise old turns, and trim what is not needed.'
        ],
        tokenunits: [
            '<b>Name it:</b> the <i>token</i>: the chunk of text a model actually reads and writes, and the unit you are billed in. For English, about four characters or three quarters of a word.',
            '<b>In the real world:</b> both your prompt and the reply are charged, the system prompt included on every request. And because models read tokens rather than letters, they are surprisingly bad at tasks like counting letters in a word.',
            '<b>Use it:</b> cut fluff from prompts that run at scale, and do not trust a model with letter-level tricks without a tool.'
        ],
        speed: [
            '<b>Name it:</b> <i>tokens per second</i> is how fast text streams out. <i>Time to first token</i> is the wait before it starts, mostly the time spent reading your prompt.',
            '<b>In the real world:</b> generating tokens is mostly limited by how fast the model\'s weights can be read from memory. So bigger models and higher precision run slower, and quantization often makes a model faster as well as smaller.',
            '<b>Use it:</b> match speed to the job. A chat feels fine at reading speed, a voice assistant needs a fast first token, and an overnight batch only cares about total throughput.'
        ],
        cache: [
            '<b>Name it:</b> <i>caching</i>. The <i>KV cache</i> stores the model\'s work on earlier tokens so it does not redo it for every new one. <i>Prompt caching</i> reuses that work across requests when the start of the prompt is identical.',
            '<b>In the real world:</b> the KV cache grows with context length, which is why a bigger context window needs more memory. Providers discount cached tokens heavily and answer faster.',
            '<b>Use it:</b> put stable content (instructions, tools, documents) first and changing content (the question, a timestamp) last.'
        ],
        guardrails: [
            '<b>Name it:</b> <i>alignment</i> and <i>guardrails</i>. Alignment is training a model to refuse harmful requests. Guardrails are the other layers: system prompts, input and output filters, and permissions.',
            '<b>In the real world:</b> an uncensored model has the training-level refusals reduced or removed. It is not smarter. Normal models sometimes <i>over-refuse</i> harmless work, while uncensored ones have no safety net at all.',
            '<b>Use it:</b> decide by audience and worst case. If you remove a model\'s own refusals, you must add the protection somewhere else, such as isolation, filtering or human review. Jailbreaks are attempts to get around these layers.'
        ],
        kinds: [
            '<b>Name it:</b> <i>model kinds</i>. Classifiers choose a label, predictors output a number, generators create new content, recommenders rank options, and agents act using tools.',
            '<b>In the real world:</b> most products combine several. A classifier flags abuse, a recommender orders a feed, and a generator writes replies.',
            '<b>Use it:</b> before reaching for a big chatbot, ask what the output actually is: a label, a number, new content, a ranking, or an action. The answer points to the right kind of model.'
        ],
        tokens: [
            '<b>Name it:</b> <i>next-token prediction</i>. A language model repeatedly picks the next piece of text (a token) from a probability distribution.',
            '<b>In the real world:</b> this is why chatbots sound fluent, and why they sometimes state false things confidently. Likely text is not verified fact. That failure is called <i>hallucination</i>.',
            '<b>Use it:</b> treat model output as a draft to check. For facts that matter, give the model a source, or a tool to look things up.'
        ],
        agent: [
            '<b>Name it:</b> an <i>agent</i> (and its <i>harness</i>): a model plus tools, run in a loop. The harness decides which tools the model may use and what happens with the results.',
            '<b>In the real world:</b> coding assistants, research bots and support agents work this way. The same model with a better harness can do far more.',
            '<b>Use it:</b> give a model only the tools a task needs. Every extra tool adds cost and a way for an attacker to misuse it, for example through prompt injection.'
        ],
        quant: [
            '<b>Name it:</b> <i>quantization</i>. A model is stored as billions of numbers. Quantization stores them with fewer bits, so the model takes far less memory at a small cost in quality.',
            '<b>In the real world:</b> it is why a large model can run on a laptop GPU. Local tools such as Ollama commonly ship quantized versions.',
            '<b>Use it:</b> when memory is the limit, a bigger quantized model usually beats a smaller full-precision one.'
        ],
        privacy: [
            '<b>Name it:</b> <i>data locality</i>. With a cloud model your prompts travel to someone else\'s servers. With a local model they never leave your machine.',
            '<b>In the real world:</b> confidential code, health records and anything under regulation or an NDA are strong reasons to run locally or use a private deployment.',
            '<b>Use it:</b> decide by the data, not by habit. Public, low-risk work suits the cloud. Sensitive work suits local.'
        ],
        cost: [
            '<b>Name it:</b> <i>break-even</i>. Cloud is pay-per-use. Local is mostly a fixed cost. Below some volume the cloud is cheaper, above it local wins.',
            '<b>In the real world:</b> real prices change, and local has hidden costs: setup time, maintenance, and hardware that can sit idle.',
            '<b>Use it:</b> estimate your volume first. A few requests a day rarely justify hardware. Millions might.'
        ],
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
        collectCard(key);
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
    var PUZZLE_LESSON = {
        rules: 'rules', learn: 'learning', vault: 'vault',
        sorting: 'kinds', tokens: 'tokens', agent: 'agent',
        packing: 'quant', datagate: 'privacy', toll: 'cost',
        speed: 'speed', cache: 'cache', guardgate: 'guardrails',
        sysprompt: 'sysprompt', context: 'context', tokenunits: 'tokenunits',
        verify: 'hallucination', doors: 'grounding', poison: 'injection'
    };

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
    var CARD_META = {
        rules:      { dungeon: 'ai',     title: 'Rule-based systems',        where: 'The Rule Golem',       line: 'Rules are exact and explainable, but only cover the cases someone thought of.' },
        learning:   { dungeon: 'ai',     title: 'Machine learning',          where: 'The Learner Golem',    line: 'Learning finds patterns from examples. Always test it on data it has not seen.' },
        vault:      { dungeon: 'ai',     title: 'Choosing the right tool',   where: 'The Vault of Choices', line: 'Rules for exact logic, learning for fuzzy patterns, and often both together.' },
        kinds:      { dungeon: 'models', title: 'Kinds of models',           where: 'The Sorting Gate',     line: 'Ask what the output is (label, number, new content, ranking, action) to pick the kind.' },
        tokens:     { dungeon: 'models', title: 'Next-token prediction',     where: 'The Token Mill',       line: 'Models pick likely next tokens, so fluent does not mean true. Check what matters.' },
        agent:      { dungeon: 'models', title: 'Agents and harnesses',      where: 'The Agent\'s Workshop', line: 'An agent is a model plus tools in a loop. Give it only the tools the task needs.' },
        quant:      { dungeon: 'local',  title: 'Quantization',              where: 'The Packing Room',     line: 'It shrinks a model to fit memory. A bigger quantized model usually beats a smaller full-precision one.' },
        privacy:    { dungeon: 'local',  title: 'Data locality',             where: 'The Data Gate',        line: 'Choose local or cloud by how sensitive the data is, not by habit.' },
        cost:       { dungeon: 'local',  title: 'Break-even',                where: 'The Toll Booth',       line: 'Cloud is pay-per-use and local is a fixed cost. Estimate your volume to find the crossover.' },
        sysprompt:  { dungeon: 'talk',   title: 'The system prompt',         where: 'The Prompt Forge',     line: 'State a role, a format, boundaries and what to do when unsure. It guides, but it is not a lock.' },
        context:    { dungeon: 'talk',   title: 'The context window',        where: 'The Memory Hall',      line: 'A model only sees what fits. Pin what matters, summarise, and trim the rest.' },
        tokenunits: { dungeon: 'talk',   title: 'Tokens as units',           where: 'The Token Counter',    line: 'You pay in tokens, and models read tokens, not letters. Cut fluff at scale.' },
        hallucination: { dungeon: 'trust', title: 'Hallucination',       where: 'The Liar\'s Ledger',  line: 'A confident tone is not evidence. Verify the specific, the private and the high-stakes.' },
        grounding:  { dungeon: 'trust',  title: 'Grounding and RAG',         where: 'The Three Doors',      line: 'Hand the model the right, current source. Prompt first, retrieval for changing facts, fine-tune last.' },
        injection:  { dungeon: 'trust',  title: 'Prompt injection',          where: 'The Poisoned Inbox',   line: 'Assume it can succeed. Limit what a tricked model is able to do.' },
        speed:      { dungeon: 'hood',   title: 'Tokens per second',         where: 'The Speed Run',        line: 'Match speed to the job: wait for the first token, streaming rate, or total throughput.' },
        cache:      { dungeon: 'hood',   title: 'Caching',                   where: 'The Cache Vault',      line: 'Put stable content first in a prompt so the cache can reuse it.' },
        guardrails: { dungeon: 'hood',   title: 'Alignment and guardrails',  where: 'The Guardrail Gate',   line: 'Uncensored removes a model\'s refusals, not the risk. Add protection somewhere else.' },
        contrast:   { dungeon: 'forge',  title: 'Temperature',               where: 'The Wander Test',      line: 'Low is repeatable, high is varied. Choose by the task.' },
        sampling:   { dungeon: 'forge',  title: 'Sampling',                  where: 'The Hall of Repeats',  line: 'Models sample from odds, so unlikely outcomes sometimes happen at higher temperature.' },
        stuck:      { dungeon: 'forge',  title: 'Greedy decoding',           where: 'The Garden of Wonders', line: 'At temperature 0 a model can loop. A little randomness lets it explore.' }
    };

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

    function renderGrimoire() {
        el.grimList.textContent = '';
        var t = grimoireTotals();
        el.grimIntro.textContent = 'You have collected ' + t.got + ' of ' + t.total + ' cards. Each one is an idea from a dungeon. Open a card to read it again. Locked cards show where to find them.';
        L.DUNGEONS.forEach(function (d) {
            var keys = Object.keys(CARD_META).filter(function (k) { return CARD_META[k].dungeon === d.id; });
            if (!keys.length) { return; }
            el.grimList.appendChild(mk('h2', 'group-title', d.title));
            var grid = mk('div', 'gcards');
            keys.forEach(function (k) {
                var m = CARD_META[k];
                if (isCollected(k)) {
                    var card = mk('details', 'gcard');
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
                    card.appendChild(body);
                    grid.appendChild(card);
                } else {
                    var locked = mk('div', 'gcard locked');
                    locked.appendChild(mk('span', 'g-title', '???'));
                    locked.appendChild(mk('span', 'g-where', 'Found in ' + d.title + ' › ' + m.where));
                    grid.appendChild(locked);
                }
            });
            el.grimList.appendChild(grid);
        });
    }

    function showGrimoire() {
        el.hub.hidden = true;
        el.grimoire.hidden = false;
        el.toHub.hidden = false;
        el.backLink.hidden = true;
        el.floorLabel.textContent = 'Grimoire';
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
        if (!d.ready) { return { state: 'soon', text: 'Coming soon' }; }
        var done = !!S.progress.cleared[d.id];
        var missing = (d.requires || []).filter(function (id) { return !S.progress.cleared[id]; });
        if (missing.length && !done) {
            var text;
            if (d.requires.length > 1) {
                text = '\uD83D\uDD12 Clear all of The Basics first';
            } else {
                var pre = dungeonById(missing[0]);
                text = '\uD83D\uDD12 Clear "' + (pre ? pre.title : missing[0]) + '" first';
            }
            return { state: 'locked', text: text };
        }
        if (done) { return { state: 'cleared', text: '\u2605 Cleared!' }; }
        return { state: 'ready', text: '\u25B6 Play' };
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
        el.grimoire.hidden = true;
        el.game.hidden = true;
        el.toHub.hidden = true;
        el.backLink.hidden = false;
        el.floorLabel.textContent = 'Choose a dungeon';
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

    /* ------------------------------------------------------------------ */
    /* Boot                                                                */
    /* ------------------------------------------------------------------ */
    S.progress = loadProgress();
    buildBars();
    setTemp(0.0);
    showHub();
    requestAnimationFrame(frame);
})();

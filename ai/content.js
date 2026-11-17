/*
 * Dungeon of Weights - all story, lesson and grimoire text.
 * Kept separate from the engine so it can be translated (see i18n.js / lang-bm.js).
 * English is the source language; I18n.deep() swaps in Bahasa Malaysia when selected.
 */
(function (root) {
    'use strict';

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
                ['<span class="tip">The bonus dungeons are now open: <b>Under the Hood</b> (speed, caches, uncensored models), <b>Agentic AI</b> (loops, limits, permissions) and <b>The Forge</b> (tweak Pip like a modelfile). The <b>Grimoire</b> on the hub keeps every idea you have learned.</span>']
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
        agentic: {
            intro: [
                ['You have met agents: a model with tools. Now see what it takes to run one <b>safely</b>.'],
                ['Three chambers lie ahead: the loop every agent runs on, the limits that stop it running away, and how much freedom to give it.',
                    '<span class="tip">Walk into a golem to challenge it.</span>']
            ],
            introButton: 'Enter the dungeon',
            clearTitle: 'Agentic AI cleared!',
            clear: [
                ['<b>Loot: the Leash.</b>',
                    '<b>The loop:</b> the harness feeds the model, the model proposes an action, the harness checks and runs it, and the result goes back into the history. The model only proposes.',
                    '<b>Limits:</b> step caps, loop detection and spending controls each catch different failures, so layer them and size them for real work.',
                    '<b>Autonomy:</b> let agents act alone only on low-risk, reversible actions. Ask a human for the hard to undo, and never hand over the catastrophic.'],
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
        loop: [
            ['Every agent, from a coding assistant to a research bot, runs the same cycle again and again. The model on its own never does anything: it only <b>proposes</b> the next action.',
                'Put the five steps of the <b>agent loop</b> in order, then say who does what: the model or the harness.', '<span class="tip">Walk into a golem to challenge it.</span>']
        ],
        runaway: [
            ['Four agents are about to go wrong: one repeats itself, one is doing real work, one tries a big purchase, and one wanders aimlessly.',
                'Set the limits in the harness so that every runaway is stopped, but the genuine task is allowed to finish.', '<span class="tip">Walk into a golem to challenge it.</span>']
        ],
        autonomygate: [
            ['How much freedom should an agent get? Too little and it is useless. Too much and one bad step can be a disaster.',
                'Decide, for each action, whether the agent may do it alone, must ask a human first, or must never be able to do it.', '<span class="tip">Walk into a golem to challenge it.</span>']
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
        agentloop: [
            '<b>Name it:</b> the <i>agent loop</i>: the harness gives the model the goal and the history, the model picks a tool and its inputs, the harness runs the tool, adds the result to the history, and checks whether to stop.',
            '<b>In the real world:</b> coding agents and research agents all run this loop, often dozens of times. The model only <i>proposes</i> actions. The harness is the part that actually does things, remembers, and enforces limits.',
            '<b>Use it:</b> when an agent misbehaves, ask which part failed: the model\'s choice, the tool, the history it was given, or a missing limit in the harness.'
        ],
        guards: [
            '<b>Name it:</b> <i>agent guardrails</i>: step limits, spending caps, loop detection and approval gates, built into the harness.',
            '<b>In the real world:</b> agents can loop, wander and spend real money. Telling a model to behave is not a limit. A step cap alone cannot catch everything: a repeat detector, a cap and a spending control each catch different failures.',
            '<b>Use it:</b> layer several simple limits, size them for legitimate tasks (not too tight), and alert a human when one trips.'
        ],
        autonomy: [
            '<b>Name it:</b> <i>levels of autonomy</i> (also called <i>human in the loop</i>): deciding which actions an agent may do on its own, which need approval, and which it must never do.',
            '<b>In the real world:</b> low-risk, reversible actions can run automatically. Actions that are hard to undo or leave your organisation need a human. Asking about everything causes approval fatigue, and people stop reading. For catastrophic actions, do not hand the agent the power at all.',
            '<b>Use it:</b> sort actions by how reversible they are and how far the damage could spread, and give an agent the least privilege it needs.'
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
        agentloop:  { dungeon: 'agentic', title: 'The agent loop',        where: 'The Agent Loop',       line: 'The model proposes. The harness runs the tool, remembers the result and enforces the limits.' },
        guards:     { dungeon: 'agentic', title: 'Agent guardrails',       where: 'The Runaway',          line: 'Layer step caps, loop detection and spending controls, and size them for real work.' },
        autonomy:   { dungeon: 'agentic', title: 'Levels of autonomy',     where: 'The Autonomy Gate',    line: 'Automatic for the safe and reversible, a human for the hard to undo, never for the catastrophic.' },
        contrast:   { dungeon: 'forge',  title: 'Temperature',               where: 'The Wander Test',      line: 'Low is repeatable, high is varied. Choose by the task.' },
        sampling:   { dungeon: 'forge',  title: 'Sampling',                  where: 'The Hall of Repeats',  line: 'Models sample from odds, so unlikely outcomes sometimes happen at higher temperature.' },
        stuck:      { dungeon: 'forge',  title: 'Greedy decoding',           where: 'The Garden of Wonders', line: 'At temperature 0 a model can loop. A little randomness lets it explore.' }
    };

    var api = { DUNGEON_STORY: DUNGEON_STORY, STORY: STORY, LESSONS: LESSONS, CARD_META: CARD_META };
    if (root.I18n) { root.I18n.deep(api); }
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
    root.Content = api;
})(typeof window !== 'undefined' ? window : globalThis);

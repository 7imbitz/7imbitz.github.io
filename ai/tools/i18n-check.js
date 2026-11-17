#!/usr/bin/env node
/*
 * Translation checker for Dungeon of Weights.
 *
 *   node ai/tools/i18n-check.js
 *
 * Finds every English string that needs a Bahasa Malaysia entry in lang-bm.js and lists the ones
 * that are missing. Exit code 1 if anything is missing, so it can run before committing.
 *
 * Where it looks:
 *   - data (dungeon/room titles, puzzle content, stories, lessons): collected by loading the game
 *     modules and recording everything I18n.deep() translates
 *   - tr('...') / text: '...' / html: '...' / aria-label: '...' literals in puzzle-ui.js and game.js
 *   - data-t="..." attributes in index.html
 *   - a short list of strings that are looked up through variables (below)
 *
 * Adding a string: write it in English where it is used, then add "English": "Bahasa Malaysia" to
 * lang-bm.js. Keep placeholders such as {n} and HTML tags exactly as in the English text.
 *
 * Limits: a string picked through a variable or a ternary cannot be found by reading the source.
 * Playing the game in Bahasa Malaysia (set localStorage 'dungeon-of-weights.lang' to 'bm') and
 * watching for English text, or I18n.misses in the console, catches those.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
global.window = global;
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// load the modules in English so I18n records every data string it is asked to translate
const store = {};
global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } };
['i18n.js', 'logic.js', 'puzzles.js', 'content.js'].forEach(f => (0, eval)(read(f)));
const keys = new Set(Object.keys(window.I18n.seen));

// the Bahasa Malaysia dictionary (lang-bm.js registers itself with I18n)
(0, eval)(read('lang-bm.js'));
const dict = window.I18n.dictionary();

// literals in the source that are looked up at run time
const unesc = s => s.replace(/\\'/g, "'").replace(/\\"/g, '"');
const lit = "((?:[^'\\\\]|\\\\.)*)";
const patterns = [
    new RegExp("\\btr\\(\\s*'" + lit + "'", 'g'),
    new RegExp("\\b(?:text|html): '" + lit + "'", 'g'),
    new RegExp("'aria-label': '" + lit + "'", 'g'),
    new RegExp("\\blabel: '" + lit + "'", 'g'),
    new RegExp("\\bpassMsg: '" + lit + "'", 'g'),
    new RegExp("title: '" + lit + "', pages", 'g'),
    new RegExp("button: '" + lit + "'", 'g')
];
['puzzle-ui.js', 'game.js', 'puzzles.js'].forEach(f => {
    const src = read(f);
    patterns.forEach(re => { let m; while ((m = re.exec(src))) { keys.add(unesc(m[1])); } });
});
const html = read('index.html');
const dec = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
let m;
const attr = /data-t(?:-html|-aria|-title)?="([^"]*)"/g;
while ((m = attr.exec(html))) { keys.add(dec(m[1])); }

// strings translated through variables, so they cannot be found by scanning for literals
[
    'Pip', 'Objective', 'Next', 'Press Enter or Space', 'What you just learned', 'Got it', 'Go', 'Pip fainted!', 'Try again',
    'The Basics', 'Bonus Dungeons', 'Easy', 'Medium', 'Hard', 'Bonus', '1st', '2nd', '3rd', '4th',
    'high', 'medium', 'low', 'Keep', 'Shrink', 'Pin', 'Drop', 'Choose a dungeon', 'Grimoire', 'missed',
    // chosen with a ternary (cond ? 'a' : 'b'), which a literal scan cannot follow
    'Hostile', 'Friendly', 'You', 'Model', 'reused', 'reprocessed', 'false alarm',
    'All three attacks are stopped.', 'Some attacks can still get through.',
    'More examples usually help. Try training on more of them.',
    'Variety matters, not only quantity. Make sure you include both hostile and friendly creatures with different marks.'
].forEach(k => keys.add(k));

const needs = [...keys].filter(k => /[A-Za-z]/.test(k.replace(/\{\w+\}/g, '')) && !k.includes('\\u')).sort();
const missing = needs.filter(k => !Object.prototype.hasOwnProperty.call(dict, k));
const sig = s => JSON.stringify([(s.match(/\{\w+\}/g) || []).sort(), (s.match(/<\/?[a-zA-Z][^>]*>/g) || []).sort()]);
const broken = needs.filter(k => dict[k] !== undefined && sig(k) !== sig(dict[k]));

console.log(`${needs.length} strings need a translation; ${needs.length - missing.length} have one.`);
missing.forEach(k => console.log('MISSING  ' + JSON.stringify(k)));
broken.forEach(k => console.log('MISMATCH (placeholders or tags differ)  ' + JSON.stringify(k)));
process.exit(missing.length || broken.length ? 1 : 0);

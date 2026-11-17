/*
 * Dungeon of Weights - tiny i18n layer (English / Bahasa Malaysia).
 *
 * The English text IS the key. English is the default and needs no dictionary.
 * When the saved language is "bm", lang-bm.js registers an English -> Bahasa
 * Malaysia dictionary and every lookup is translated.
 *
 *   I18n.t('Checks left: {n}', { n: 3 })   translate + fill placeholders
 *   I18n.plural(n, 'one {n} time', 'many {n} times')
 *   I18n.deep(obj)                         translate every string inside data (in place)
 *   I18n.dom(document)                     translate elements marked data-t / data-t-html / data-t-aria
 *   I18n.setLang('bm' | 'en')              save the choice and reload
 *
 * Switching language reloads the page (content is built once at load); progress is
 * saved separately, so nothing is lost.
 */
(function (root) {
    'use strict';

    var KEY = 'dungeon-of-weights.lang';
    var lang = 'en';
    try {
        var saved = root.localStorage && root.localStorage.getItem(KEY);
        if (saved === 'bm' || saved === 'en') { lang = saved; }
    } catch (e) { /* storage blocked: stay on English */ }

    var dict = {};       // English -> Bahasa Malaysia (filled by lang-bm.js)
    var bmValues = {};   // set of Bahasa Malaysia strings, so already-translated text is never reported as missing
    var seen = {};       // every English key that was looked up (used by the extraction/coverage tools)
    var misses = {};     // keys with no Bahasa Malaysia entry (only recorded in "bm" mode)

    function register(code, map) {
        if (code !== 'bm') { return; }
        dict = map;
        Object.keys(map).forEach(function (k) { bmValues[map[k]] = true; });
    }

    function lookup(key) {
        if (!/[A-Za-z]/.test(key.replace(/\{\w+\}/g, ''))) { return key; } // symbols and numbers (placeholders ignored) need no translation
        seen[key] = true;
        if (lang === 'en') { return key; }
        if (Object.prototype.hasOwnProperty.call(dict, key)) { return dict[key]; }
        if (bmValues[key]) { return key; } // already translated
        misses[key] = true;
        return key;
    }

    function format(s, vars) {
        if (!vars) { return s; }
        return s.replace(/\{(\w+)\}/g, function (m, name) { return vars[name] !== undefined ? vars[name] : m; });
    }

    function t(key, vars) { return format(lookup(key), vars); }

    function plural(n, one, other, vars) {
        var v = vars || {};
        v.n = n;
        return t(n === 1 ? one : other, v);
    }

    // Data strings worth translating: words, not ids ("classifier"), colours or map rows.
    function translatable(s) {
        return /[A-Za-z]{3,}/.test(s) && (/\s/.test(s) || /^[A-Z]/.test(s));
    }

    // Translate every string inside an object/array tree, in place.
    function deep(node, visited) {
        visited = visited || [];
        if (node === null || typeof node !== 'object' || visited.indexOf(node) >= 0) { return node; }
        visited.push(node);
        Object.keys(node).forEach(function (k) {
            var v = node[k];
            if (typeof v === 'string') {
                if (translatable(v)) { node[k] = lookup(v); }
            } else if (v && typeof v === 'object') {
                deep(v, visited);
            }
        });
        return node;
    }

    // Static HTML: translate marked elements once at start-up.
    function dom(rootEl) {
        if (!rootEl || !rootEl.querySelectorAll) { return; }
        var els = rootEl.querySelectorAll('[data-t],[data-t-html],[data-t-aria],[data-t-title]');
        Array.prototype.forEach.call(els, function (e) {
            var a = e.getAttribute('data-t');
            if (a !== null) { var ta = lookup(a); if (lang !== 'en') { e.textContent = ta; } }
            var b = e.getAttribute('data-t-html');
            if (b !== null) { var tb = lookup(b); if (lang !== 'en') { e.innerHTML = tb; } }
            var c = e.getAttribute('data-t-aria');
            if (c !== null) { var tc = lookup(c); if (lang !== 'en') { e.setAttribute('aria-label', tc); } }
            var d = e.getAttribute('data-t-title');
            if (d !== null) { var td = lookup(d); if (lang !== 'en') { e.setAttribute('title', td); } }
        });
    }

    function setLang(code) {
        if (code !== 'bm' && code !== 'en') { return; }
        try { root.localStorage.setItem(KEY, code); } catch (e) { /* ignore */ }
        if (root.location && root.location.reload) { root.location.reload(); }
    }

    var api = {
        lang: lang,
        t: t,
        plural: plural,
        deep: deep,
        dom: dom,
        register: register,
        setLang: setLang,
        translatable: translatable,
        seen: seen,
        misses: misses,
        dictionary: function () { return dict; }
    };

    if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
    root.I18n = api;
})(typeof window !== 'undefined' ? window : globalThis);

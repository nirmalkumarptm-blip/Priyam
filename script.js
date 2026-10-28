/* ==========================================================================
   PRIYAM — script.js
   Application logic. Sections:
     1 Setup & storage      2 i18n helpers        3 Data helpers & search
     4 Quantities & units   5 SVG art             6 Shared components
     7 Pages                8 Cooking mode        9 Timers
    10 Lists, favorites     11 Router & events    12 Init
   No frameworks. Data lives in meta.js, recipes.js, translations.js and
   recipe-translations.js. Routing uses the URL hash so GitHub Pages works
   with direct links, refresh and the browser back button.
   ========================================================================== */
(function () {
  'use strict';

  /* ===== 1. Setup & storage ============================================ */
  var META = window.PRIYAM_META, UI = window.PRIYAM_UI, ING = window.PRIYAM_ING || {},
      RT = window.PRIYAM_RT || {}, RAW = window.PRIYAM_RECIPES || [];
  var LANGS = META.languages.map(function (l) { return l.code; });
  var NO_LIST = ['water'];                       // never added to a shopping list
  var PAGE_SIZE = 24;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* localStorage wrapper with an in-memory fallback (private mode, blocked storage) */
  var mem = {};
  var Store = {
    ok: true,
    get: function (k, def) {
      try { var v = localStorage.getItem('priyam.' + k); if (v == null) return k in mem ? mem[k] : def; return JSON.parse(v); }
      catch (e) { Store.ok = false; return k in mem ? mem[k] : def; }
    },
    set: function (k, v) {
      mem[k] = v;
      try { localStorage.setItem('priyam.' + k, JSON.stringify(v)); } catch (e) { Store.ok = false; }
    }
  };

  /* Only keep recipes that have complete data. Anything else is reported in the console. */
  var RECIPES = [], BYID = {};
  RAW.forEach(function (r) {
    var tr = RT[r.id];
    var problems = [];
    if (!tr) problems.push('no translations');
    else LANGS.forEach(function (l) {
      if (!tr[l]) problems.push('missing language ' + l);
      else if (!tr[l].steps || tr[l].steps.length !== r.steps.length) problems.push('step count mismatch (' + l + ')');
    });
    r.ingredients.forEach(function (i) { if (!ING[i.id]) problems.push('no ingredient name: ' + i.id); });
    if (BYID[r.id]) problems.push('duplicate id');
    if (problems.length) { console.warn('[PRIYAM] recipe skipped:', r.id, problems); return; }
    r.diet = r.diet || {}; r.contains = r.contains || [];
    if (!r.contains.length && !r.diet.veg) r.contains = r.allergens && r.allergens.indexOf('fish') > -1 ? ['fish'] : ['meat'];
    r.flags = r.flags || {}; r.festivals = r.festivals || []; r.allergens = r.allergens || []; r.mayContain = r.mayContain || [];
    r.time.rest = r.time.rest || 0;
    BYID[r.id] = r; RECIPES.push(r);
  });
  RECIPES.forEach(function (r, i) { r._order = i; });

  var state = {
    lang: Store.get('lang', 'en'),
    favs: Store.get('favs', []),
    list: Store.get('list', []),
    recent: Store.get('recent', []),
    ticks: Store.get('ticks', {}),
    servings: {},                 // per-recipe servings chosen this session
    cook: { id: null, step: 0, done: false },
    finder: [],
    limit: PAGE_SIZE, lastExploreKey: ''
  };
  if (LANGS.indexOf(state.lang) < 0) state.lang = 'en';
  if (!Array.isArray(state.favs)) state.favs = [];
  if (!Array.isArray(state.list)) state.list = [];
  if (!Array.isArray(state.recent)) state.recent = [];
  state.favs = state.favs.filter(function (id) { return BYID[id]; });     // drop ids that no longer exist

  /* ===== 2. i18n helpers =============================================== */
  function t(key, vars) {
    var s = (UI[state.lang] && UI[state.lang][key]);
    if (s == null || s === '') s = UI.en[key];
    if (s == null) { return key; }
    if (typeof s === 'string' && vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return s;
  }
  function tv(key) { var v = UI[state.lang] && UI[state.lang][key]; return v != null ? v : UI.en[key]; }   // raw (arrays)
  function langIdx() { return LANGS.indexOf(state.lang); }
  function ingName(id) { var a = ING[id]; return a ? (a[langIdx()] || a[0]) : id; }
  function ingNameEn(id) { return ING[id] ? ING[id][0] : id; }
  function rTxt(r, field) {
    var tr = RT[r.id]; var v = tr[state.lang] && tr[state.lang][field];
    return v != null && v !== '' ? v : tr.en[field];
  }
  function rName(r, lang) { var tr = RT[r.id][lang || state.lang]; return (tr && tr.name) || RT[r.id].en.name; }
  function nRecipes(n) { return n === 1 ? t('common.recipe1') : t('common.recipesN', { n: n }); }
  function regionName(id) { return t('region.' + id + '.name'); }
  function catName(id) { return t('category.' + id); }
  function fmtMin(m) {
    var h = Math.floor(m / 60), mm = m % 60, out = [];
    if (h) out.push(h + ' ' + t('r.hours'));
    if (mm || !h) out.push(mm + ' ' + t('r.minutes'));
    return out.join(' ');
  }
  function fmtClock(sec) { var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), x = sec % 60; function p(n) { return n < 10 ? '0' + n : '' + n; } return h ? h + ':' + p(m) + ':' + p(x) : p(m) + ':' + p(x); }
  var FONT_SCRIPTS = { ta: 'Tamil', ml: 'Malayalam', kn: 'Kannada', te: 'Telugu', hi: 'Devanagari' };
  var fontsLoaded = {};
  function loadScriptFonts(lang) {
    var s = FONT_SCRIPTS[lang]; if (!s || fontsLoaded[lang]) return; fontsLoaded[lang] = true;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+' + s + ':wght@400;600;700&family=Noto+Serif+' + s + ':wght@600;700&display=swap';
    document.head.appendChild(l);
    if (lang !== 'ta' && !fontsLoaded.taQuote) { /* the quotation block always shows the Tamil original */ }
  }

  /* ===== 3. Data helpers & search ====================================== */
  function totalMin(r) { return (r.time.prep || 0) + (r.time.cook || 0) + (r.time.rest || 0); }
  function inCat(r, c) {
    switch (c) {
      case 'vegetarian': return !!r.diet.veg;
      case 'non-vegetarian': return !r.diet.veg;
      case 'quick': return totalMin(r) <= META.quickMinutes;
      case 'festival': return r.festivals.length > 0;
      default: return r.categories.indexOf(c) > -1;
    }
  }
  function regionMeta(id) { return META.regions.filter(function (x) { return x.id === id; })[0] || META.regions[0]; }
  function isFav(id) { return state.favs.indexOf(id) > -1; }
  function hashStr(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function dayKey() { var d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
  function todaysRecipe() { if (!RECIPES.length) return null; return RECIPES[(dayKey() * 9301 + 49297) % 233280 % RECIPES.length]; }
  function seasonal(n) {
    var m = new Date().getMonth();
    return RECIPES.slice().sort(function (a, b) { return hashStr(a.id + m) - hashStr(b.id + m); }).slice(0, n);
  }

  /* normalise text for matching: lower-case, strip Latin accents, keep letters/marks/digits of every script */
  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u200c\u200d]/g, '')
      .replace(/non[\s-]*veg(etarian)?/g, 'nonveg').replace(/egg[\s-]*free/g, 'eggfree').replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ').trim();
  }
  var searchIdx = {};
  function buildIndex() {
    if (searchIdx[state.lang]) return searchIdx[state.lang];
    var idx = {};
    RECIPES.forEach(function (r) {
      var text = [rName(r), rName(r, 'en'), (r.aliases || []).join(' '),
        r.ingredients.map(function (i) { return ingName(i.id) + ' ' + ingNameEn(i.id); }).join(' '),
        regionName(r.region), RT[r.id].en.name && t('region.' + r.region + '.name')].join(' ');
      var tags = [], ctags = [];
      function addWords(label) { norm(label).split(' ').forEach(function (w) { if (w) tags.push(w); }); }
      ['en', state.lang].forEach(function (lg) {
        var L = lg === state.lang ? function (k) { return t(k); } : function (k) { return UI.en[k]; };
        r.categories.forEach(function (c) { addWords(L('category.' + c)); });
        if (inCat(r, 'quick')) addWords(L('category.quick'));
        if (r.festivals.length) { addWords(L('category.festival')); r.festivals.forEach(function (f) { addWords(L('festival.' + f + '.name')); }); }
        ctags.push(norm(L(r.diet.veg ? 'diet.veg' : 'diet.nonveg')).replace(/ /g, ''));
        if (r.diet.vegan) ctags.push(norm(L('diet.vegan')).replace(/ /g, ''));
        if (r.diet.eggFree) ctags.push(norm(L('diet.eggfree')).replace(/ /g, ''));
        r.contains.forEach(function (c) { addWords(L('diet.contains.' + c)); });
        r.allergens.forEach(function (a) { addWords(L('allergen.' + a)); });          // e.g. “dairy”, “peanuts”, “fish”
      });
      ctags.push(r.diet.veg ? 'veg' : 'nonveg');
      idx[r.id] = { text: norm(text), tags: tags, ctags: ctags, name: norm(rName(r) + ' ' + rName(r, 'en') + ' ' + (r.aliases || []).join(' ')) };
    });
    searchIdx[state.lang] = idx; return idx;
  }
  function searchRecipes(q, list) {
    var tokens = norm(q).split(' ').filter(Boolean); list = list || RECIPES;
    if (!tokens.length) return list.slice();
    var idx = buildIndex(), out = [];
    list.forEach(function (r) {
      var e = idx[r.id], score = 0, ok = true;
      tokens.forEach(function (tk) {
        var inName = e.name.indexOf(tk) > -1, inText = e.text.indexOf(tk) > -1,
            inTag = e.tags.some(function (w) { return w.indexOf(tk) === 0; }) ||
            e.ctags.some(function (w) { return w === tk || (tk.length >= 5 && tk.length >= w.length - 4 && w.indexOf(tk) === 0); });
        if (!(inName || inText || inTag)) ok = false; else score += inName ? 3 : (inTag ? 2 : 1);
      });
      if (ok) out.push({ r: r, s: score });
    });
    out.sort(function (a, b) { return b.s - a.s || a.r._order - b.r._order; });
    return out.map(function (x) { return x.r; });
  }
  /* suggestions: recipe names, ingredients, regions, categories */
  function suggestions(q) {
    var n = norm(q); if (!n) return [];
    var res = [], seen = {};
    function push(kind, label, href, rank) { var k = kind + label; if (!seen[k]) { seen[k] = 1; res.push({ kind: kind, label: label, href: href, rank: rank }); } }
    function rank(label) { var l = norm(label); var p = l.indexOf(n); return p === 0 ? 0 : (p > 0 && l.charAt(p - 1) === ' ' ? 1 : (p > 0 ? 2 : -1)); }
    RECIPES.forEach(function (r) { var rk = rank(rName(r)); if (rk < 0) rk = rank(rName(r, 'en')); if (rk >= 0) push('recipe', rName(r), '#/recipe/' + r.id, rk); });
    var ingSeen = {};
    RECIPES.forEach(function (r) { r.ingredients.forEach(function (i) { if (META.staples.indexOf(i.id) > -1 || ingSeen[i.id]) return; ingSeen[i.id] = 1; var nm = ingName(i.id); var rk = rank(nm); if (rk < 0) rk = rank(ingNameEn(i.id)); if (rk >= 0) push('ingredient', nm, '#/recipes?q=' + encodeURIComponent(nm), rk + 3); }); });
    META.regions.forEach(function (g) { var rk = rank(regionName(g.id)); if (rk < 0) rk = rank(UI.en['region.' + g.id + '.name']); if (rk >= 0) push('region', regionName(g.id), '#/region/' + g.id, rk + 1); });
    META.primaryCategories.concat(META.extraCategories).forEach(function (c) { var rk = rank(catName(c)); if (rk >= 0) push('category', catName(c), '#/recipes?cat=' + c, rk + 2); });
    res.sort(function (a, b) { return a.rank - b.rank; });
    return res.slice(0, 8);
  }
  function related(r, n) {
    var scored = RECIPES.filter(function (o) { return o.id !== r.id; }).map(function (o) {
      var s = 0; if (o.region === r.region) s += 2;
      o.categories.forEach(function (c) { if (r.categories.indexOf(c) > -1) s += 1; });
      o.ingredients.forEach(function (i) { if (META.staples.indexOf(i.id) < 0 && r.ingredients.some(function (j) { return j.id === i.id; })) s += .5; });
      if (!!o.diet.veg === !!r.diet.veg) s += .5;
      return { o: o, s: s };
    }).sort(function (a, b) { return b.s - a.s || a.o._order - b.o._order; });
    return scored.slice(0, n).map(function (x) { return x.o; });
  }

  /* ===== 4. Quantities & units ========================================= */
  var FR = [[0.125, '⅛'], [0.25, '¼'], [1 / 3, '⅓'], [0.375, '⅜'], [0.5, '½'], [0.625, '⅝'], [2 / 3, '⅔'], [0.75, '¾'], [0.875, '⅞']];
  function fmtNum(q, unit) {
    if (unit === 'g' || unit === 'ml') return String(q >= 100 ? Math.round(q / 5) * 5 : Math.round(q));
    if (unit === 'kg' || unit === 'l') return String(Math.round(q * 100) / 100);
    /* kitchen-friendly rounding so scaled amounts stay measurable */
    if (unit === 'cup' || unit === 'tbsp' || unit === 'tsp') q = q >= 1 ? Math.round(q * 4) / 4 : Math.round(q * 8) / 8;
    else q = q >= 3 ? Math.round(q) : Math.max(0.5, Math.round(q * 2) / 2);      // pieces, cloves, sprigs, pinches
    if (q <= 0) q = 0.125;
    var whole = Math.floor(q + 1e-9), frac = q - whole;
    if (frac < 0.06) return String(whole);
    var best = null; FR.forEach(function (f) { if (Math.abs(f[0] - frac) < 0.045 && (!best || Math.abs(f[0] - frac) < Math.abs(best[0] - frac))) best = f; });
    if (best) return (whole ? whole : '') + best[1];
    return String(Math.round(q * 10) / 10);
  }
  function normaliseUnit(q, unit) {
    if (unit === 'g' && q >= 1000) return { q: q / 1000, unit: 'kg' };
    if (unit === 'ml' && q >= 1000) return { q: q / 1000, unit: 'l' };
    return { q: q, unit: unit };
  }
  function qtyText(q, unit) {
    var n = normaliseUnit(q, unit), s = fmtNum(n.q, n.unit), label = n.unit ? t('unit.' + n.unit) : '';
    if (n.unit && state.lang === 'en') {          // simple English plurals: 1 cup / 2 cups, 1 clove / 6 cloves
      var many = parseFloat(s) > 1 || /[0-9][¼½¾⅛⅜⅝⅞⅓⅔]/.test(s);
      if (n.unit === 'cup') label = many ? 'cups' : 'cup';
      else if (n.unit === 'sprig') label = many ? 'sprigs' : 'sprig';
      else if (n.unit === 'pinch') label = many ? 'pinches' : 'pinch';
      else if (n.unit === 'clove') label = many ? 'cloves' : 'clove';
    }
    return n.unit ? s + ' ' + label : s;
  }
  function servingsOf(r) { return state.servings[r.id] || r.servings; }
  function scaleOf(r) { return servingsOf(r) / r.servings; }
  function ingLine(r, ing) { return qtyText(ing.qty * scaleOf(r), ing.unit); }
  /* expand {q:ingredient-id} tokens inside step text with scaled quantities */
  function expandTokens(r, text) {
    return String(text).replace(/\{q:([a-z0-9-]+)\}/g, function (m, id) {
      var ing = r.ingredients.filter(function (i) { return i.id === id; })[0];
      return ing ? ingLine(r, ing) : '';
    });
  }
  function unitGroup(u) { var G = META.unitGroups; for (var k in G) if (G[k].units[u]) return G[k]; return null; }
  /* merge two {qty, unit} amounts when compatible; returns null when not */
  function combine(a, b) {
    if (a.unit === b.unit) return { qty: a.qty + b.qty, unit: a.unit };
    var ga = unitGroup(a.unit), gb = unitGroup(b.unit);
    if (ga && ga === gb) {
      var base = a.qty * ga.units[a.unit] + b.qty * ga.units[b.unit];
      var n = normaliseUnit(base, ga.base); return { qty: n.q, unit: n.unit };
    }
    return null;
  }
  function groupOrder(g) { return ['main', 'spices', 'base', 'tempering'].indexOf(g); }
  function groupedIngredients(r) {
    var groups = {}, order = [];
    r.ingredients.forEach(function (i) { var g = i.group || 'main'; if (!groups[g]) { groups[g] = []; order.push(g); } groups[g].push(i); });
    return order.map(function (g) { return { g: g, items: groups[g] }; });
  }

  /* ===== 5. SVG art ==================================================== */
  function icon(n, cls) { return '<svg class="i ' + (cls || '') + '" aria-hidden="true" focusable="false"><use href="#i-' + n + '"/></svg>'; }
  /* gopuram: a stepped tower with a row of tiny windows per tier (generated, not hand-drawn) */
  function gopuramSVG(tiers) {
  return '<img src="Images/temple.jpeg" alt="Temple artwork" style="display:block;width:min(100%,420px);height:auto;margin:0 auto;">';
}
function brandMark() {
  return '<span class="brand-mark" aria-hidden="true"><img src="Images/logo.png" alt="PRIYAM logo" style="width:100%;height:100%;object-fit:cover;border-radius:12px;"></span>';
}
  function artSymbol(r) { return r.categories.indexOf('desserts') > -1 ? 'art-sweet' : (r.categories.indexOf('rice-dishes') > -1 || r.categories.indexOf('curries') > -1 ? 'art-bowl' : 'art-pot'); }
  function thumb(r, cls, eager) {
    var g = regionMeta(r.region);
    var img = (r.image && r.image.src)
      ? '<img src="' + esc(r.image.src) + '" alt="' + esc(r.image.alt || rName(r)) + '" ' + (eager ? '' : 'loading="lazy" ') + 'decoding="async">' : '';
    return '<div class="thumb ' + (cls || '') + '" style="--ra:' + g.a + ';--rb:' + g.b + '" role="img" aria-label="' + esc(rName(r)) + '"><svg viewBox="0 0 100 100" aria-hidden="true"><use href="#' + artSymbol(r) + '"/></svg>' + img + '</div>';
  }
  /* a broken photo is removed so the illustrated fallback underneath shows through */
  document.addEventListener('error', function (e) {
    var el = e.target; if (el && el.tagName === 'IMG') { el.remove(); }
  }, true);

  /* ===== 6. Shared components ========================================== */
  function vmark(r) { return '<span class="vm' + (r.diet.veg ? '' : ' nonveg') + '" role="img" aria-label="' + esc(t(r.diet.veg ? 'diet.veg' : 'diet.nonveg')) + '"></span>'; }
  function diffLabel(r) { return t('diff.' + (r.difficulty || 'easy')); }
  function recipeCard(r) {
    var fav = isFav(r.id);
    return '<article class="rcard">' + thumb(r) +
      '<button class="fav-btn" type="button" data-act="fav" data-id="' + r.id + '" aria-pressed="' + fav + '" aria-label="' + esc(t(fav ? 'fav.aria.remove' : 'fav.aria.add', { name: rName(r) })) + '">' + icon('heart') + '</button>' +
      '<div class="rcard-body"><div class="rcard-region">' + vmark(r) + '<span>' + esc(regionName(r.region)) + '</span></div>' +
      '<h3><a href="#/recipe/' + r.id + '">' + esc(rName(r)) + '</a></h3>' +
      '<div class="rcard-meta"><span>' + icon('clock') + esc(fmtMin(totalMin(r))) + '</span><span>' + icon('flame') + esc(diffLabel(r)) + '</span></div></div></article>';
  }
  function railSection(title, note, list, moreHref, extra) {
    if (!list.length) return '';
    return '<section class="section reveal wrap"><div class="section-head"><h2>' + esc(title) + '</h2>' +
      (moreHref ? '<a class="view-all" href="' + moreHref + '">' + esc(t('sec.viewAll')) + ' ' + icon('right') + '</a>' : '') +
      (note ? '<p class="note">' + esc(note) + '</p>' : '') + '</div><div class="rail">' + list.map(recipeCard).join('') + '</div></section>';
  }
  function emptyBlock(title, text, actions) {
    return '<div class="empty"><h3>' + esc(title) + '</h3><p>' + esc(text) + '</p>' + (actions || '') + '</div>';
  }
  function regionArt(tiers) { return '<div class="rg-art" aria-hidden="true">' + gopuramSVG(tiers) + '</div>'; }
  function regionCard(g) {
    var n = RECIPES.filter(function (r) { return r.region === g.id; }).length;
    return '<article class="rg-card" style="--ra:' + g.a + ';--rb:' + g.b + '">' +
      (g.image ? '<img class="rg-photo" src="' + esc(g.image) + '" alt="" loading="lazy">' : '') + regionArt(5) +
      '<span class="rg-count">' + esc(nRecipes(n)) + '</span>' +
      '<div class="rg-body"><h3>' + esc(regionName(g.id)) + '</h3><p>' + esc(t('region.' + g.id + '.intro')) + '</p>' +
      '<a class="btn btn-gold btn-sm" href="#/region/' + g.id + '">' + esc(t('common.explore')) + ' ' + icon('right') + '</a></div></article>';
  }
  function searchBox(id, value) {
    return '<div class="searchbox" data-searchbox><form role="search" data-search-form>' +
      '<div style="position:relative;flex:1">' + icon('search', 's-ico') +
      '<input id="' + id + '" class="field" type="search" name="q" value="' + esc(value || '') + '" placeholder="' + esc(t('s.placeholder')) + '" aria-label="' + esc(t('nav.search')) + '" autocomplete="off" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="' + id + '-sg" enterkeyhint="search">' +
      '<button class="icon-btn s-clear" type="button" data-act="clearSearch" aria-label="' + esc(t('s.clear')) + '"' + (value ? '' : ' hidden') + '>' + icon('close') + '</button>' +
      '<div class="suggest" id="' + id + '-sg" role="listbox" aria-label="' + esc(t('s.suggestions')) + '" hidden></div></div>' +
      '<button class="btn btn-maroon" type="submit">' + esc(t('s.go')) + '</button></form></div>';
  }
  function crumbs(parts) {
    return '<nav class="crumbs" aria-label="Breadcrumb">' + parts.map(function (p) { return p.href ? '<a href="' + p.href + '">' + esc(p.label) + '</a>' : '<span>' + esc(p.label) + '</span>'; }).join(' / ') + '</nav>';
  }
  function dietTags(r) {
    var out = '<span class="tag ' + (r.diet.veg ? 'ok' : 'warn') + '">' + vmark(r) + esc(t(r.diet.veg ? 'diet.veg' : 'diet.nonveg')) + '</span>';
    if (r.diet.vegan) out += '<span class="tag ok">' + esc(t('diet.vegan')) + '</span>';
    if (r.diet.eggFree) out += '<span class="tag">' + esc(t('diet.eggfree')) + '</span>';
    r.contains.forEach(function (c) { out += '<span class="tag warn">' + esc(t('diet.contains.' + c)) + '</span>'; });
    return out;
  }

  /* ===== 7. Pages ====================================================== */
  var pageTitle = '';
  function setTitle(s) { pageTitle = s; document.title = (s ? s + ' — ' : '') + 'PRIYAM'; }

  /* ---- Home ---- */
  function pageHome() {
    setTitle('');
    var heroImg = META.heroImage ? '<img class="hero-photo" src="' + esc(META.heroImage) + '" alt="" fetchpriority="high">' : '';
    var h = '<section class="hero">' + heroImg + '<div class="hero-glow" aria-hidden="true"></div><div class="hero-art" aria-hidden="true">' + gopuramSVG(8) + '</div>' +
      '<div class="hero-inner"><div><h1>' + esc(t('hero.title')) + '</h1><p class="lead">' + esc(t('hero.sub')) + '</p>' +
      '<div class="hero-cta"><a class="btn btn-gold" href="#/recipes">' + esc(t('hero.cta1')) + '</a>' +
      '<a class="btn btn-ghost-light" href="#/regions">' + esc(t('hero.cta2')) + '</a>' +
      '<button class="btn btn-ghost-light" type="button" data-act="surprise">' + icon('dice') + esc(t('hero.cta3')) + '</button></div></div></div><div class="temple-strip" aria-hidden="true"></div></section>';

    h += '<section class="section reveal wrap" id="regions"><div class="section-head"><h2>' + esc(t('nav.regions')) + '</h2><p class="note">' + esc(t('regions.sub')) + '</p></div><div class="rg-grid">' + META.regions.map(regionCard).join('') + '</div></section>';

    var today = todaysRecipe();
    if (today) {
      h += '<section class="section reveal wrap"><div class="section-head"><h2>' + esc(t('sec.today')) + '</h2><p class="note">' + esc(t('sec.today.note')) + '</p></div>' +
        '<article class="today">' + thumb(today, '', true) + '<div class="today-body"><div class="rcard-region">' + vmark(today) + '<span>' + esc(regionName(today.region)) + '</span></div>' +
        '<h3><a href="#/recipe/' + today.id + '">' + esc(rName(today)) + '</a></h3><p>' + esc(rTxt(today, 'intro')) + '</p>' +
        '<div class="meta-line"><span class="tag">' + icon('clock') + esc(fmtMin(totalMin(today))) + '</span><span class="tag">' + esc(diffLabel(today)) + '</span></div></div>' +
        '<button class="fav-btn" type="button" data-act="fav" data-id="' + today.id + '" aria-pressed="' + isFav(today.id) + '" aria-label="' + esc(t(isFav(today.id) ? 'fav.aria.remove' : 'fav.aria.add', { name: rName(today) })) + '">' + icon('heart') + '</button></article></section>';
    }

    var viewed = state.recent.map(function (id) { return BYID[id]; }).filter(Boolean).slice(0, 4);
    var recentAdded = RECIPES.slice().sort(function (a, b) { return (b.added || '').localeCompare(a.added || '') || a._order - b._order; }).slice(0, 8);
    var defs = [
      ['sec.popular', 'sec.popular.note', RECIPES.filter(function (r) { return r.flags.classic; }), '#/recipes'],
      ['sec.trending', 'sec.trending.note', seasonal(8), '#/recipes'],
      ['sec.quick', null, RECIPES.filter(function (r) { return inCat(r, 'quick'); }), '#/recipes?cat=quick'],
      ['sec.traditional', null, RECIPES.filter(function (r) { return r.flags.heritage; }), '#/recipes'],
      ['sec.festival', null, RECIPES.filter(function (r) { return inCat(r, 'festival'); }), '#/festivals'],
      ['sec.veg', null, RECIPES.filter(function (r) { return r.diet.veg; }), '#/recipes?diet=veg'],
      ['sec.nonveg', null, RECIPES.filter(function (r) { return !r.diet.veg; }), '#/recipes?cat=non-vegetarian'],
      ['sec.desserts', null, RECIPES.filter(function (r) { return inCat(r, 'desserts'); }), '#/recipes?cat=desserts'],
      ['sec.recent', null, recentAdded, '#/recipes'],
      ['sec.picks', 'sec.picks.note', RECIPES.filter(function (r) { return r.flags.pick; }), '#/recipes']
    ];
    var seen = {};
    if (viewed.length) h += railSection(t('sec.viewed'), null, viewed, null);
    defs.forEach(function (d) {
      var key = d[2].map(function (r) { return r.id; }).sort().join('|');
      if (!key || seen[key]) return; seen[key] = 1;           // skip a section that would repeat an earlier one exactly
      h += railSection(t(d[0]), d[1] ? t(d[1]) : null, d[2].slice(0, 8), d[3]);
    });

    h += '<section class="quote reveal" aria-label="' + esc(t('sec.today')) + '"><blockquote><p class="orig" lang="ta">உண்டி கொடுத்தோர் உயிர் கொடுத்தோரே.</p>' +
      (state.lang !== 'ta' ? '<p class="trans">' + esc(t('quote.text')) + '</p>' : '') + '<cite>' + esc(t('quote.src')) + '</cite></blockquote></section>';
    h += '<section class="wrap reveal"><div class="cta-band"><div><h2>' + esc(t('finderCta.title')) + '</h2><p>' + esc(t('finderCta.text')) + '</p></div><a class="btn btn-maroon" href="#/finder">' + esc(t('nav.finder')) + '</a></div></section>';
    return h;
  }

  /* ---- Explore (search + filters) ---- */
  function exploreParams() {
    var q = route.q;
    return { q: q.get('q') || '', region: q.get('region') || '', cat: q.get('cat') || '', diet: (q.get('diet') || '').split(',').filter(Boolean), sort: q.get('sort') || 'best', fest: q.get('fest') || '' };
  }
  function exploreURL(p, over) {
    var o = {}; for (var k in p) o[k] = p[k]; for (var k2 in over) o[k2] = over[k2];
    var s = []; if (o.q) s.push('q=' + encodeURIComponent(o.q)); if (o.region) s.push('region=' + o.region); if (o.cat) s.push('cat=' + o.cat);
    if (o.diet && o.diet.length) s.push('diet=' + o.diet.join(',')); if (o.sort && o.sort !== 'best') s.push('sort=' + o.sort); if (o.fest) s.push('fest=' + o.fest);
    return '#/recipes' + (s.length ? '?' + s.join('&') : '');
  }
  function filterRecipes(p) {
    var list = p.q ? searchRecipes(p.q) : RECIPES.slice();
    list = list.filter(function (r) {
      if (p.region && r.region !== p.region) return false;
      if (p.cat && !inCat(r, p.cat)) return false;
      if (p.fest && r.festivals.indexOf(p.fest) < 0) return false;
      if (p.diet.indexOf('veg') > -1 && !r.diet.veg) return false;
      if (p.diet.indexOf('vegan') > -1 && !r.diet.vegan) return false;
      if (p.diet.indexOf('eggfree') > -1 && !r.diet.eggFree) return false;
      return true;
    });
    if (p.sort === 'prep') list.sort(function (a, b) { return a.time.prep - b.time.prep || a._order - b._order; });
    else if (p.sort === 'total') list.sort(function (a, b) { return totalMin(a) - totalMin(b) || a._order - b._order; });
    else if (p.sort === 'az') list.sort(function (a, b) { return rName(a).localeCompare(rName(b), state.lang); });
    return list;
  }
  function pageExplore() {
    var p = exploreParams();
    var key = JSON.stringify(p); if (key !== state.lastExploreKey) { state.limit = PAGE_SIZE; state.lastExploreKey = key; }
    setTitle(t('s.title'));
    var list = filterRecipes(p), shown = list.slice(0, state.limit);
    var hasFilter = p.q || p.region || p.cat || p.diet.length || p.fest;
    function chip(label, href, on, count) { return '<a class="chip" href="' + href + '"' + (on ? ' aria-current="true"' : '') + '>' + esc(label) + (count != null ? ' <small>' + count + '</small>' : '') + '</a>'; }
    var h = '<div class="wrap page-head"><h1>' + esc(p.q ? t('s.resultsFor', { q: p.q }) : t('s.title')) + '</h1></div><div class="wrap">' + searchBox('explore-q', p.q);
    h += '<details class="filters" id="filters"><summary>' + icon('search') + '<span style="flex:1;margin-left:.5rem">' + esc(t('s.filters')) + '</span></summary>';
    h += '<div class="filter-group"><h3>' + esc(t('s.region')) + '</h3><div class="chips">' + chip(t('s.all'), exploreURL(p, { region: '' }), !p.region) +
      META.regions.map(function (g) { return chip(regionName(g.id), exploreURL(p, { region: g.id }), p.region === g.id, RECIPES.filter(function (r) { return r.region === g.id; }).length); }).join('') + '</div></div>';
    h += '<div class="filter-group"><h3>' + esc(t('s.category')) + '</h3><div class="chips">' + chip(t('s.all'), exploreURL(p, { cat: '' }), !p.cat) +
      META.primaryCategories.concat(META.extraCategories).map(function (c) { return chip(catName(c), exploreURL(p, { cat: c }), p.cat === c, RECIPES.filter(function (r) { return inCat(r, c); }).length); }).join('') + '</div></div>';
    h += '<div class="filter-group"><h3>' + esc(t('s.diet')) + '</h3><div class="chips">' + [['veg', 'diet.veg'], ['vegan', 'diet.vegan'], ['eggfree', 'diet.eggfree']].map(function (d) {
      var on = p.diet.indexOf(d[0]) > -1, next = on ? p.diet.filter(function (x) { return x !== d[0]; }) : p.diet.concat([d[0]]);
      return '<a class="chip" href="' + exploreURL(p, { diet: next }) + '" aria-pressed="' + on + '" role="button">' + esc(t(d[1])) + '</a>'; }).join('') + '</div></div>';
    h += '<div class="filter-group"><a class="btn btn-line btn-sm" href="#/recipes">' + icon('reset') + esc(t('s.reset')) + '</a></div></details>';
    h += '<div class="results-bar"><p aria-live="polite" style="margin:0"><b>' + esc(t('s.resultsN', { n: list.length })) + '</b></p>' +
      '<label>' + esc(t('s.sort')) + ' <select class="field" id="sort-select" style="width:auto">' + [['best', 'sort.default'], ['prep', 'sort.prep'], ['total', 'sort.total'], ['az', 'sort.az']].map(function (o) { return '<option value="' + o[0] + '"' + (p.sort === o[0] ? ' selected' : '') + '>' + esc(t(o[1])) + '</option>'; }).join('') + '</select></label></div>';
    if (!list.length) {
      var alts = RECIPES.slice(0, 4);
      h += emptyBlock(t('s.noResults.title'), t('s.noResults.text'), (hasFilter ? '<a class="btn btn-maroon" href="#/recipes">' + esc(t('s.reset')) + '</a>' : '') + '<a class="btn btn-line" href="#/regions">' + esc(t('nav.regions')) + '</a><a class="btn btn-line" href="#/categories">' + esc(t('nav.categories')) + '</a>');
      if (alts.length) h += '<h2>' + esc(t('s.youMayLike')) + '</h2><div class="grid">' + alts.map(recipeCard).join('') + '</div>';
    } else {
      h += '<div class="grid">' + shown.map(recipeCard).join('') + '</div>';
      if (list.length > shown.length) h += '<p style="text-align:center;margin-top:1.4rem"><button class="btn btn-maroon" type="button" data-act="showMore">' + esc(t('s.more')) + ' (' + (list.length - shown.length) + ')</button></p>';
    }
    return h + '</div>';
  }

  /* ---- Regions ---- */
  function pageRegions() {
    setTitle(t('nav.regions'));
    return '<div class="wrap page-head"><h1>' + esc(t('nav.regions')) + '</h1><p>' + esc(t('regions.sub')) + '</p></div><div class="wrap"><div class="rg-grid">' + META.regions.map(regionCard).join('') + '</div></div>';
  }
  function pageRegion(id) {
    var g = META.regions.filter(function (x) { return x.id === id; })[0];
    if (!g) return pageNotFound();
    setTitle(regionName(id));
    var list = RECIPES.filter(function (r) { return r.region === id; });
    var h = '<section class="banner" style="--ra:' + g.a + ';--rb:' + g.b + '">' + (g.image ? '<img class="rg-photo" src="' + esc(g.image) + '" alt="">' : '') + regionArt(6) +
      '<div class="wrap">' + crumbs([{ label: t('nav.home'), href: '#/' }, { label: t('nav.regions'), href: '#/regions' }, { label: regionName(id) }]).replace('class="crumbs"', 'class="crumbs" style="color:#F6E8C8"') +
      '<h1>' + esc(regionName(id)) + '</h1><p>' + esc(t('region.' + id + '.about')) + '</p></div></section><div class="temple-strip" aria-hidden="true"></div>';
    h += '<div class="wrap"><div class="section two-col"><div class="panel"><h3>' + esc(t('region.ingredients')) + '</h3><ul class="bullets">' + tv('region.' + id + '.ingredients').map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="panel"><h3>' + esc(t('region.techniques')) + '</h3><ul class="bullets">' + tv('region.' + id + '.techniques').map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div></div></div>';
    if (!list.length) return h + '<div class="wrap">' + emptyBlock(regionName(id), t('region.none'), '<a class="btn btn-maroon" href="#/recipes">' + esc(t('nav.explore')) + '</a>') + '</div>';
    var sig = list.filter(function (r) { return r.flags.signature; });
    h += railSection(t('region.signature'), null, sig.length ? sig : list, null);
    META.primaryCategories.forEach(function (c) { h += railSection(catName(c), null, list.filter(function (r) { return inCat(r, c); }), '#/recipes?region=' + id + '&cat=' + c); });
    h += '<div class="wrap" style="margin-top:1.5rem"><a class="btn btn-maroon" href="#/recipes?region=' + id + '">' + esc(t('region.allRecipes', { region: regionName(id) })) + '</a></div>';
    return h;
  }

  /* ---- Categories ---- */
  function pageCategories() {
    setTitle(t('nav.categories'));
    function tile(c, big) { var n = RECIPES.filter(function (r) { return inCat(r, c); }).length; return '<a class="cat-tile' + (big ? ' big' : '') + '" href="#/recipes?cat=' + c + '">' + esc(catName(c)) + '<small>' + esc(nRecipes(n)) + '</small></a>'; }
    return '<div class="wrap page-head"><h1>' + esc(t('cat.title')) + '</h1></div><div class="wrap"><h2>' + esc(t('cat.main')) + '</h2><div class="cat-grid">' + META.primaryCategories.map(function (c) { return tile(c, true); }).join('') + '</div>' +
      '<h2 style="margin-top:2rem">' + esc(t('cat.more')) + '</h2><div class="cat-grid">' + META.extraCategories.map(function (c) { return tile(c); }).join('') + '</div></div>';
  }

  /* ---- Recipe detail ---- */
  function ingredientsList(r, withTicks) {
    var ticks = state.ticks[r.id] || [];
    return groupedIngredients(r).map(function (grp) {
      return (grp.items.length && groupedIngredients(r).length > 1 ? '<h3 class="ing-group">' + esc(t('grp.' + grp.g)) + '</h3>' : '') +
        '<ul class="ing-list">' + grp.items.map(function (i) {
          var uid = i.id + (grp.g === 'main' ? '' : ':' + grp.g);
          return '<li><label><input type="checkbox" data-act="tick" data-rid="' + r.id + '" data-iid="' + uid + '"' + (ticks.indexOf(uid) > -1 ? ' checked' : '') + '><span><span class="ing-qty">' + esc(ingLine(r, i)) + '</span> ' + esc(ingName(i.id)) + '</span></label></li>';
        }).join('') + '</ul>';
    }).join('');
  }
  function bulletBlock(title, arr) { return arr && arr.length ? '<section class="block"><h2>' + esc(title) + '</h2><ul class="bullets">' + arr.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></section>' : ''; }
  function pageRecipe(id) {
    var r = BYID[id]; if (!r) return pageNotFound();
    setTitle(rName(r)); addRecent(id);
    var n = servingsOf(r), step = r.servingStep || 1, unitKey = r.servingsUnit === 'pieces' ? 'r.pieces' : 'r.servingsN';
    var fav = isFav(r.id), tr = RT[r.id];
    var h = '<article class="recipe-page"><div class="recipe-hero">' + thumb(r, '', true) + '</div><div class="wrap">' +
      crumbs([{ label: t('nav.home'), href: '#/' }, { label: regionName(r.region), href: '#/region/' + r.region }, { label: rName(r) }]) +
      '<div class="recipe-title"><h1>' + esc(rName(r)) + '</h1><div class="meta-line"><a class="tag" href="#/region/' + r.region + '">' + esc(regionName(r.region)) + '</a>' + dietTags(r) +
      r.categories.map(function (c) { return '<a class="tag" href="#/recipes?cat=' + c + '">' + esc(catName(c)) + '</a>'; }).join('') +
      r.festivals.map(function (f) { return '<a class="tag" href="#/festivals?f=' + f + '">' + esc(t('festival.' + f + '.name')) + '</a>'; }).join('') + '</div>' +
      '<p>' + esc(rTxt(r, 'intro')) + '</p></div>' +
      '<div class="actions"><a class="btn btn-maroon" href="#/cook/' + r.id + '">' + icon('flame') + esc(t('r.startCooking')) + '</a>' +
      '<button class="btn btn-line" type="button" data-act="fav" data-id="' + r.id + '" aria-pressed="' + fav + '">' + icon('heart') + esc(t(fav ? 'r.saved' : 'r.save')) + '</button>' +
      '<button class="btn btn-line" type="button" data-act="addList" data-id="' + r.id + '">' + icon('list') + esc(t('r.addList')) + '</button>' +
      '<button class="btn btn-line" type="button" data-act="share" data-id="' + r.id + '">' + icon('share') + esc(t('r.share')) + '</button>' +
      '<button class="btn btn-line" type="button" data-act="print">' + icon('print') + esc(t('r.print')) + '</button></div>';
    h += '<div class="facts"><div class="fact"><span>' + esc(t('r.prep')) + '</span><b>' + esc(fmtMin(r.time.prep)) + '</b></div><div class="fact"><span>' + esc(t('r.cook')) + '</span><b>' + esc(fmtMin(r.time.cook)) + '</b></div>' +
      (r.time.rest ? '<div class="fact"><span>' + esc(t('r.rest')) + '</span><b>' + esc(fmtMin(r.time.rest)) + '</b></div>' : '') +
      '<div class="fact"><span>' + esc(t('r.total')) + '</span><b>' + esc(fmtMin(totalMin(r))) + '</b></div><div class="fact"><span>' + esc(t('r.difficulty')) + '</span><b>' + esc(diffLabel(r)) + '</b></div></div>';
    h += '<div class="recipe-layout"><aside class="ing-box" aria-labelledby="ing-h"><h2 id="ing-h" style="margin:0">' + esc(t('r.ingredients')) + '</h2>' +
      '<div class="servings"><span>' + esc(t(r.servingsUnit === 'pieces' ? 'r.makes' : 'r.servings')) + '</span><div class="stepper" role="group" aria-label="' + esc(t('r.servings')) + '">' +
      '<button type="button" data-act="servings" data-id="' + r.id + '" data-d="-1" aria-label="' + esc(t('r.servingsDec')) + '"' + (n <= step ? ' disabled' : '') + '>' + icon('minus') + '</button>' +
      '<output aria-live="polite">' + n + '</output><button type="button" data-act="servings" data-id="' + r.id + '" data-d="1" aria-label="' + esc(t('r.servingsInc')) + '"' + (n >= r.servings * 4 ? ' disabled' : '') + '>' + icon('plus') + '</button></div><span>' + esc(t(unitKey)) + '</span></div>' +
      '<p class="fine no-print">' + esc(t('r.tickHint')) + '</p>' + ingredientsList(r) +
      '<p class="no-print" style="margin:.8rem 0 0"><button class="btn btn-line btn-sm" type="button" data-act="clearTicks" data-id="' + r.id + '">' + esc(t('r.untick')) + '</button></p></aside><div>';
    h += '<section class="block"><h2>' + esc(t('r.background')) + '</h2><p>' + esc(rTxt(r, 'background')) + '</p></section>';
    h += '<section class="block"><h2>' + esc(t('r.steps')) + '</h2><ol class="steps">' + rTxt(r, 'steps').map(function (s, i) {
      var tm = r.steps[i].timer;
      return '<li><p style="margin:0">' + esc(expandTokens(r, s[0])) + '</p><p class="cue"><b>' + esc(t('r.lookFor')) + ':</b> ' + esc(expandTokens(r, s[1])) + '</p>' +
        (tm ? '<div class="step-timer no-print"><button class="btn btn-line btn-sm" type="button" data-act="timerStep" data-id="' + r.id + '" data-i="' + i + '">' + icon('timer') + esc(t('cook.startTimer', { time: fmtClock(tm) })) + '</button></div>' : '') + '</li>';
    }).join('') + '</ol></section>';
    h += bulletBlock(t('r.tips'), rTxt(r, 'tips')) + bulletBlock(t('r.mistakes'), rTxt(r, 'mistakes')) + bulletBlock(t('r.subs'), rTxt(r, 'subs'));
    h += '<section class="block"><h2>' + esc(t('r.serve')) + '</h2><p>' + esc(rTxt(r, 'serve')) + '</p></section><section class="block"><h2>' + esc(t('r.storage')) + '</h2><p>' + esc(rTxt(r, 'storage')) + '</p></section>';
    h += '<section class="block"><h2>' + esc(t('r.allergens')) + '</h2>' +
      (r.allergens.length ? '<p><b>' + esc(t('r.contains')) + ':</b> ' + r.allergens.map(function (a) { return '<span class="tag warn">' + esc(t('allergen.' + a)) + '</span>'; }).join(' ') + '</p>' : '<p>' + esc(t('r.noAllergens')) + '</p>') +
      (r.mayContain.length ? '<p><b>' + esc(t('r.mayContain')) + ':</b> ' + r.mayContain.map(function (a) { return '<span class="tag">' + esc(t('allergen.' + a)) + '</span>'; }).join(' ') + '</p>' : '') + '</section>';
    if (r.nutrition) h += '<section class="block"><h2>' + esc(t('r.nutrition')) + '</h2><div class="nutri"><div><b>' + r.nutrition.kcal + '</b><span>' + esc(t('r.kcal')) + '</span></div><div><b>' + r.nutrition.protein + ' ' + esc(t('unit.g')) + '</b><span>' + esc(t('r.protein')) + '</span></div><div><b>' + r.nutrition.carbs + ' ' + esc(t('unit.g')) + '</b><span>' + esc(t('r.carbs')) + '</span></div><div><b>' + r.nutrition.fat + ' ' + esc(t('unit.g')) + '</b><span>' + esc(t('r.fat')) + '</span></div></div><p class="fine">' + esc(t(r.servingsUnit === 'pieces' ? 'r.nutNotePiece' : 'r.nutNote')) + '</p></section>';
    h += '<p class="fine no-print">' + esc(t('r.langNote')) + '</p></div></div>';
    var rel = related(r, 4);
    if (rel.length) h += '<section class="related block"><h2>' + esc(t('r.related')) + '</h2><div class="grid">' + rel.map(recipeCard).join('') + '</div></section>';
    return h + '</div></article>';
  }
  function addRecent(id) { state.recent = [id].concat(state.recent.filter(function (x) { return x !== id; })).slice(0, 8); Store.set('recent', state.recent); }

  /* ---- Festivals ---- */
  function pageFestivals() {
    setTitle(t('nav.festivals'));
    var want = route.q.get('f');
    var h = '<div class="wrap page-head"><h1>' + esc(t('nav.festivals')) + '</h1><p>' + esc(t('fest.sub')) + '</p></div><div class="wrap">';
    META.festivals.forEach(function (f) {
      var list = RECIPES.filter(function (r) { return r.festivals.indexOf(f) > -1; });
      h += '<section class="fest-block" id="fest-' + f + '"' + (want === f ? ' data-focus="1"' : '') + '><h2>' + esc(t('festival.' + f + '.name')) + '</h2><p>' + esc(t('festival.' + f + '.desc')) + '</p>' +
        (list.length ? '<div class="grid">' + list.map(recipeCard).join('') + '</div>' : '<p class="fine">' + esc(t('fest.none')) + '</p>') + '</section>';
    });
    return h + '</div>';
  }

  /* ---- Favorites ---- */
  function pageFavorites() {
    setTitle(t('fav.title'));
    var list = state.favs.map(function (id) { return BYID[id]; }).filter(Boolean);
    var viewed = state.recent.map(function (id) { return BYID[id]; }).filter(Boolean);
    var h = '<div class="wrap page-head"><h1>' + esc(t('fav.title')) + '</h1></div><div class="wrap">';
    h += list.length ? '<div class="grid">' + list.map(recipeCard).join('') + '</div>' :
      emptyBlock(t('fav.emptyTitle'), t('fav.emptyText'), '<a class="btn btn-maroon" href="#/recipes">' + esc(t('nav.explore')) + '</a>');
    if (viewed.length) h += '<section class="section" style="padding-top:2rem"><div class="section-head"><h2>' + esc(t('sec.viewed')) + '</h2><button class="btn btn-line btn-sm" type="button" data-act="clearRecent">' + esc(t('fav.clearHistory')) + '</button></div><div class="grid">' + viewed.slice(0, 4).map(recipeCard).join('') + '</div></section>';
    return h + '</div>';
  }

  /* ---- My Cooking List ---- */
  function pageList() {
    setTitle(t('nav.list'));
    var items = state.list.slice().sort(function (a, b) { return (a.checked ? 1 : 0) - (b.checked ? 1 : 0) || ingName(a.id).localeCompare(ingName(b.id), state.lang); });
    var done = items.filter(function (i) { return i.checked; }).length;
    var h = '<div class="wrap page-head"><h1>' + esc(t('nav.list')) + '</h1><p>' + esc(t('list.sub')) + '</p></div><div class="wrap">';
    if (!items.length) return h + emptyBlock(t('list.emptyTitle'), t('list.emptyText'), '<a class="btn btn-maroon" href="#/recipes">' + esc(t('nav.explore')) + '</a>') + '</div>';
    h += '<p aria-live="polite"><b>' + esc(t('list.progress', { done: done, total: items.length })) + '</b></p><ul class="list-items">' + items.map(function (i) {
      var from = (i.from || []).map(function (id) { return BYID[id] ? rName(BYID[id]) : ''; }).filter(Boolean).join(', ');
      return '<li class="' + (i.checked ? 'done' : '') + '"><label><input type="checkbox" data-act="listTick" data-uid="' + i.uid + '"' + (i.checked ? ' checked' : '') + '><span><span class="li-qty">' + esc(qtyText(i.qty, i.unit)) + '</span><span class="li-name">' + esc(ingName(i.id)) + '</span>' + (from ? '<span class="li-from">' + esc(t('list.for')) + ': ' + esc(from) + '</span>' : '') + '</span></label>' +
        '<button class="icon-btn" type="button" data-act="listRemove" data-uid="' + i.uid + '" aria-label="' + esc(t('list.remove', { name: ingName(i.id) })) + '">' + icon('trash') + '</button></li>';
    }).join('') + '</ul><div class="toolbar"><button class="btn btn-line btn-sm" type="button" data-act="listCopy">' + icon('copy') + esc(t('list.copy')) + '</button><button class="btn btn-line btn-sm" type="button" data-act="print">' + icon('print') + esc(t('r.print')) + '</button>' +
      '<button class="btn btn-line btn-sm" type="button" data-act="listClearDone"' + (done ? '' : ' disabled') + '>' + esc(t('list.clearDone')) + '</button><button class="btn btn-line btn-sm" type="button" data-act="listClear">' + icon('trash') + esc(t('list.clear')) + '</button></div></div>';
    return h;
  }

  /* ---- Ingredient finder ---- */
  function pageFinder() {
    setTitle(t('nav.finder'));
    var all = {}; RECIPES.forEach(function (r) { r.ingredients.forEach(function (i) { if (META.staples.indexOf(i.id) < 0) all[i.id] = 1; }); });
    var ids = Object.keys(all).sort(function (a, b) { return ingName(a).localeCompare(ingName(b), state.lang); });
    var h = '<div class="wrap page-head"><h1>' + esc(t('nav.finder')) + '</h1><p>' + esc(t('f.sub')) + '</p></div><div class="wrap">' +
      '<input class="field" type="search" id="finder-filter" placeholder="' + esc(t('f.filter')) + '" aria-label="' + esc(t('f.filter')) + '"><div class="finder-pick"><div class="chips" id="finder-chips">' +
      ids.map(function (id) { return '<button class="chip" type="button" data-act="finderToggle" data-id="' + id + '" aria-pressed="' + (state.finder.indexOf(id) > -1) + '" data-name="' + esc(norm(ingName(id) + ' ' + ingNameEn(id))) + '">' + esc(ingName(id)) + '</button>'; }).join('') + '</div></div>' +
      '<div class="toolbar"><span class="tag" id="finder-count">' + esc(t('f.selected', { n: state.finder.length })) + '</span><button class="btn btn-line btn-sm" id="finder-clear" type="button" data-act="finderClear"' + (state.finder.length ? '' : ' disabled') + '>' + esc(t('f.clear')) + '</button></div><p class="fine">' + esc(t('f.staples')) + '</p><div id="finder-results">' + finderResults() + '</div></div>';
    return h;
  }
  function finderResults() {
    if (!state.finder.length) return '<p>' + esc(t('f.none')) + '</p>';
    var rows = RECIPES.map(function (r) {
      var need = r.ingredients.filter(function (i) { return META.staples.indexOf(i.id) < 0; });
      var have = need.filter(function (i) { return state.finder.indexOf(i.id) > -1; });
      return { r: r, need: need, have: have, missing: need.filter(function (i) { return state.finder.indexOf(i.id) < 0; }) };
    }).filter(function (x) { return x.have.length > 0; }).sort(function (a, b) { return (b.have.length / b.need.length) - (a.have.length / a.need.length) || b.have.length - a.have.length || a.r._order - b.r._order; });
    if (!rows.length) return emptyBlock(t('s.noResults.title'), t('f.noMatch'));
    return '<div class="grid">' + rows.map(function (x) {
      var pct = Math.round(100 * x.have.length / x.need.length);
      return '<div>' + recipeCard(x.r).replace('</article>', '') + '<div class="match" style="padding:0 1.05rem 1rem"><div class="bar" aria-hidden="true"><span style="width:' + pct + '%"></span></div><span class="fine"><b>' + esc(x.missing.length ? t('f.have', { a: x.have.length, b: x.need.length }) : t('f.canCook')) + '</b></span>' +
        (x.missing.length ? '<span class="fine">' + esc(t('f.missing', { list: x.missing.map(function (i) { return ingName(i.id); }).join(', ') })) + '</span>' : '') + '</div></article></div>';
    }).join('') + '</div>';
  }

  /* ---- About & 404 ---- */
  function pageAbout() {
    setTitle(t('nav.about'));
    return '<div class="wrap page-head"><h1>' + esc(t('nav.about')) + '</h1></div><div class="wrap about-grid"><img class="about-logo" src="Images/logo.png" alt="PRIYAM — ' + esc(t('brand.soul')) + '" width="520" height="520" loading="lazy">' +
      '<div><h2>' + esc(t('brand.tagline')) + '</h2><p>' + esc(t('brand.mission')) + '</p><p>' + esc(t('about.p1')) + '</p><p>' + esc(t('about.p2')) + '</p><p>' + esc(t('about.p3')) + '</p><p class="fine">' + esc(t('about.p4')) + '</p>' +
      '<p><a class="btn btn-maroon" href="#/recipes">' + esc(t('nav.explore')) + '</a></p></div></div>';
  }
  function pageNotFound() {
    setTitle(t('nf.title'));
    return '<div class="wrap">' + emptyBlock(t('nf.title'), t('nf.text'), '<a class="btn btn-maroon" href="#/">' + esc(t('common.backHome')) + '</a><a class="btn btn-line" href="#/recipes">' + esc(t('nav.explore')) + '</a>') + '</div>';
  }

  /* ===== 8. Cooking mode =============================================== */
  function timerFor(key) { return timers.filter(function (x) { return x.key === key; })[0]; }
  function timerBlock(r, i) {
    var sec = r.steps[i].timer; if (!sec) return '';
    var key = r.id + ':' + i, tm = timerFor(key);
    if (!tm) return '<div class="cook-timer"><button class="btn btn-gold" type="button" data-act="timerStep" data-id="' + r.id + '" data-i="' + i + '">' + icon('timer') + esc(t('cook.startTimer', { time: fmtClock(sec) })) + '</button></div>';
    return '<div class="cook-timer"><span class="t-readout' + (tm.state === 'done' ? ' done' : '') + '" data-tcount="' + tm.id + '" role="timer">' + fmtClock(remaining(tm)) + '</span>' + timerButtons(tm) + (tm.state === 'done' ? '<b>' + esc(t('tm.finished')) + '</b>' : '') + '</div>';
  }
  function pageCook(id) {
    var r = BYID[id]; if (!r) return pageNotFound();
    setTitle(rName(r));
    if (state.cook.id !== id) state.cook = { id: id, step: 0, done: false };
    var c = state.cook, steps = rTxt(r, 'steps'), total = steps.length;
    var top = '<header class="cook-top"><button class="icon-btn" type="button" data-act="cookExit" aria-label="' + esc(t('cook.exit')) + '">' + icon('close') + '</button><h1>' + esc(rName(r)) + '</h1>' +
      '<button class="btn btn-gold btn-sm" type="button" data-act="cookIng">' + icon('list') + esc(t('cook.ingredients')) + '</button></header>';
    if (!total) return '<div class="cook">' + top + '<div class="cook-body">' + emptyBlock(t('cook.noSteps'), '', '') + '</div></div>';
    if (c.done) {
      return '<div class="cook">' + top + '<div class="cook-progress" role="progressbar" aria-label="' + esc(t('cook.progress')) + '" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + total + '"><span style="width:100%"></span></div>' +
        '<div class="cook-body"><div class="done-card"><div class="bigmark" aria-hidden="true">' + gopuramSVG(5) + '</div><h2>' + esc(t('cook.doneTitle')) + '</h2><p>' + esc(t('cook.doneText')) + '</p>' +
        '<div class="actions"><a class="btn btn-maroon" href="#/recipe/' + r.id + '">' + esc(t('cook.backRecipe')) + '</a><button class="btn btn-line" type="button" data-act="cookAgain">' + icon('reset') + esc(t('cook.again')) + '</button>' +
        '<button class="btn btn-line" type="button" data-act="fav" data-id="' + r.id + '" aria-pressed="' + isFav(r.id) + '">' + icon('heart') + esc(t(isFav(r.id) ? 'r.saved' : 'r.save')) + '</button><a class="btn btn-line" href="#/recipes">' + esc(t('nav.explore')) + '</a></div></div></div></div>';
    }
    var s = steps[c.step], last = c.step === total - 1, pct = Math.round((c.step + 1) / total * 100);
    return '<div class="cook">' + top +
      '<div class="cook-progress" role="progressbar" aria-label="' + esc(t('cook.progress')) + '" aria-valuemin="1" aria-valuemax="' + total + '" aria-valuenow="' + (c.step + 1) + '"><span style="width:' + pct + '%"></span></div>' +
      '<div class="cook-body" aria-live="polite"><p class="cook-count">' + esc(t('cook.stepOf', { n: c.step + 1, total: total })) + '</p>' +
      '<h2 class="cook-text">' + esc(expandTokens(r, s[0])) + '</h2><div class="cook-cue"><b>' + esc(t('r.lookFor')) + '</b>' + esc(expandTokens(r, s[1])) + '</div>' + timerBlock(r, c.step) + '</div>' +
      '<nav class="cook-nav" aria-label="' + esc(t('r.steps')) + '"><button class="btn btn-line" type="button" data-act="cookPrev"' + (c.step === 0 ? ' disabled' : '') + '>' + icon('left') + esc(t('cook.prev')) + '</button>' +
      '<button class="btn ' + (last ? 'btn-gold' : 'btn-maroon') + '" type="button" data-act="cookNext">' + esc(t(last ? 'cook.finish' : 'cook.next')) + (last ? icon('check') : icon('right')) + '</button></nav></div>';
  }
  var wake = null;
  function requestWake() { try { if ('wakeLock' in navigator && !wake) navigator.wakeLock.request('screen').then(function (l) { wake = l; l.addEventListener('release', function () { wake = null; }); }).catch(function () {}); } catch (e) {} }
  function releaseWake() { try { if (wake) { wake.release(); } } catch (e) {} wake = null; }

  /* ===== 9. Timers ===================================================== */
  var timers = [], tidSeq = 0, tickHandle = null, audioCtx = null, sheetKind = null, lastSheetKind = null;
  function unlockAudio() { try { var C = window.AudioContext || window.webkitAudioContext; if (!C) return; audioCtx = audioCtx || new C(); if (audioCtx.state === 'suspended') audioCtx.resume(); } catch (e) {} }
  function beep() {
    try {
      if (!audioCtx) return;
      [0, 0.32, 0.64].forEach(function (d) {
        var o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.type = 'sine'; o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, audioCtx.currentTime + d); g.gain.exponentialRampToValueAtTime(0.35, audioCtx.currentTime + d + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + d + 0.25);
        o.connect(g); g.connect(audioCtx.destination); o.start(audioCtx.currentTime + d); o.stop(audioCtx.currentTime + d + 0.3);
      });
    } catch (e) {}
    try { if (navigator.vibrate) navigator.vibrate([250, 120, 250]); } catch (e) {}
  }
  function remaining(tm) { return tm.state === 'running' ? Math.max(0, Math.ceil((tm.end - Date.now()) / 1000)) : tm.left; }
  function timerById(id) { return timers.filter(function (x) { return x.id === id; })[0]; }
  function timerLabel(tm) {
    if (tm.rid && BYID[tm.rid]) return rName(BYID[tm.rid]) + ' · ' + t('cook.stepOf', { n: tm.step + 1, total: BYID[tm.rid].steps.length });
    return tm.label || (t('tm.default') + ' ' + tm.id);
  }
  function addTimer(sec, o) {
    var tm = { id: ++tidSeq, total: sec, left: sec, end: 0, state: 'idle', key: (o && o.key) || '', rid: o && o.rid, step: o && o.step, label: o && o.label };
    timers.push(tm); return tm;
  }
  function startTimer(tm) { unlockAudio(); tm.end = Date.now() + tm.left * 1000; tm.state = 'running'; if (!tickHandle) tickHandle = setInterval(tick, 250); }
  function pauseTimer(tm) { tm.left = remaining(tm); tm.state = 'paused'; }
  function resetTimer(tm) { tm.left = tm.total; tm.state = 'idle'; tm.end = 0; }
  function updateCounts() { $$('[data-tcount]').forEach(function (el) { var tm = timerById(+el.getAttribute('data-tcount')); if (tm) el.textContent = fmtClock(remaining(tm)); }); }
  function tick() {
    var any = false, fin = [];
    timers.forEach(function (tm) { if (tm.state === 'running') { if (remaining(tm) <= 0) { tm.state = 'done'; tm.left = 0; fin.push(tm); } else any = true; } });
    updateCounts();
    if (fin.length) { beep(); fin.forEach(function (tm) { toast(t('tm.done', { label: timerLabel(tm) }), 6000); }); timersChanged(); }
    if (!any && tickHandle) { clearInterval(tickHandle); tickHandle = null; }
  }
  function timerButtons(tm) {
    var main = tm.state === 'running' ? ['tPause', 'pause', 'tm.pause'] : tm.state === 'paused' ? ['tResume', 'play', 'tm.resume'] : tm.state === 'done' ? null : ['tStart', 'play', 'tm.start'];
    return '<span class="t-btns">' + (main ? '<button class="btn btn-maroon btn-sm" type="button" data-act="' + main[0] + '" data-tid="' + tm.id + '">' + icon(main[1]) + esc(t(main[2])) + '</button>' : '') +
      '<button class="icon-btn" type="button" data-act="tReset" data-tid="' + tm.id + '" aria-label="' + esc(t('tm.reset')) + '">' + icon('reset') + '</button>' +
      '<button class="icon-btn" type="button" data-act="tRemove" data-tid="' + tm.id + '" aria-label="' + esc(t('tm.remove')) + '">' + icon('trash') + '</button></span>';
  }
  function timersBody() {
    return '<form class="t-add" data-timer-form><div><label for="tm-min">' + esc(t('tm.minutes')) + '</label><input id="tm-min" class="field" type="number" min="1" max="720" step="1" inputmode="numeric" required></div>' +
      '<div><label for="tm-label">' + esc(t('tm.label')) + '</label><input id="tm-label" class="field" type="text" maxlength="40"></div><button class="btn btn-maroon" type="submit">' + icon('plus') + esc(t('tm.add')) + '</button></form>' +
      (timers.length ? timers.map(function (tm) {
        return '<div class="t-item"><div class="t-name">' + esc(timerLabel(tm)) + '</div><span class="t-readout' + (tm.state === 'done' ? ' done' : '') + '" data-tcount="' + tm.id + '" role="timer">' + fmtClock(remaining(tm)) + '</span>' + (tm.state === 'done' ? '<b>' + esc(t('tm.finished')) + '</b>' : '') + timerButtons(tm) + '</div>';
      }).join('') : '<p class="fine">' + esc(t('tm.empty')) + '</p>');
  }
  function renderTimersFab() {
    var active = timers.filter(function (x) { return x.state === 'running' || x.state === 'done'; }).length, done = timers.some(function (x) { return x.state === 'done'; });
    $('#timers-root').innerHTML = '<div class="timers-fab"><button type="button" data-act="timersOpen" aria-label="' + esc(t('nav.timers')) + '">' + icon('timer') + (active ? '<span class="badge' + (done ? ' alert' : '') + '">' + active + '</span>' : '') + '</button></div>';
  }
  function timersChanged() { renderTimersFab(); if (sheetKind === 'timers') renderSheet(); if (document.body.classList.contains('cooking')) renderRoute(true); }

  /* ----- bottom sheet (timers, cooking-mode ingredients) ----- */
  function openSheet(kind) { sheetKind = kind; renderSheet(); }
  function closeSheet() { sheetKind = null; lastSheetKind = null; $('#sheet-root').innerHTML = ''; }
  function renderSheet() {
    var root = $('#sheet-root'); if (!sheetKind) { root.innerHTML = ''; return; }
    var title, body;
    if (sheetKind === 'timers') { title = t('tm.title'); body = timersBody(); }
    else {
      var r = BYID[state.cook.id] || BYID[route.parts[1]]; if (!r) { closeSheet(); return; }
      title = t('cook.ingredients') + ' · ' + servingsOf(r) + ' ' + t(r.servingsUnit === 'pieces' ? 'r.pieces' : 'r.servingsN');
      body = ingredientsList(r);
    }
    root.innerHTML = '<div class="sheet-backdrop" data-act="sheetBackdrop"><div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="sheet-head"><h2>' + esc(title) + '</h2><button class="icon-btn" type="button" data-act="sheetClose" aria-label="' + esc(t('common.close')) + '">' + icon('close') + '</button></div>' + body + '</div></div>';
    if (lastSheetKind !== sheetKind) { var b = $('[data-act="sheetClose"]', root); if (b) b.focus(); lastSheetKind = sheetKind; }
  }

  /* ===== 10. Favorites, shopping list, share ========================== */
  var toastTimer = null;
  function toast(msg, ms) { var el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove('show'); }, ms || 2600); }
  function toggleFav(id) {
    var i = state.favs.indexOf(id); if (i > -1) state.favs.splice(i, 1); else state.favs.push(id);
    Store.set('favs', state.favs); toast(t(i > -1 ? 'fav.removed' : 'fav.added'));
    if (route.parts[0] === 'favorites') { renderRoute(true); return; }
    var on = isFav(id), r = BYID[id];
    $$('[data-act="fav"][data-id="' + id + '"]').forEach(function (b) {
      b.setAttribute('aria-pressed', on);
      if (b.classList.contains('btn')) b.innerHTML = icon('heart') + esc(t(on ? 'r.saved' : 'r.save'));
      else b.setAttribute('aria-label', t(on ? 'fav.aria.remove' : 'fav.aria.add', { name: rName(r) }));
    });
  }
  function saveList() { Store.set('list', state.list); renderHeader(); }
  function addToList(id) {
    var r = BYID[id]; if (!r) return;
    r.ingredients.forEach(function (ing) {
      if (NO_LIST.indexOf(ing.id) > -1) return;
      var amt = { qty: ing.qty * scaleOf(r), unit: ing.unit }, merged = false;
      for (var k = 0; k < state.list.length && !merged; k++) {
        var it = state.list[k]; if (it.id !== ing.id) continue;
        var c = combine({ qty: it.qty, unit: it.unit }, amt);
        if (c) { it.qty = c.qty; it.unit = c.unit; it.checked = false; if ((it.from || []).indexOf(id) < 0) it.from.push(id); merged = true; }
      }
      if (!merged) state.list.push({ uid: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), id: ing.id, qty: amt.qty, unit: amt.unit, checked: false, from: [id] });
    });
    saveList(); toast(t('r.addedToList'));
  }
  function listAsText() {
    return state.list.map(function (i) { return (i.checked ? '[x] ' : '[ ] ') + qtyText(i.qty, i.unit) + ' ' + ingName(i.id); }).join('\n');
  }
  function copyText(text, okMsg) {
    function fallback() { try { var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); var ok = document.execCommand('copy'); ta.remove(); if (ok) toast(okMsg); else window.prompt('', text); } catch (e) { window.prompt('', text); } }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, fallback); else fallback();
  }
  function shareRecipe(id) {
    var r = BYID[id]; if (!r) return;
    var url = location.href.split('#')[0] + '#/recipe/' + id;
    if (navigator.share) navigator.share({ title: rName(r) + ' — PRIYAM', text: rTxt(r, 'intro'), url: url }).catch(function (e) { if (e && e.name !== 'AbortError') copyText(url, t('msg.linkCopied')); });
    else copyText(url, t('msg.linkCopied'));
  }

  /* ===== 11. Header, footer, router, events ============================ */
  var route = { parts: [], q: new URLSearchParams() }, lastPath = null, io = null;
  function parseHash() {
    var h = location.hash.replace(/^#\/?/, ''), qi = h.indexOf('?');
    var path = qi > -1 ? h.slice(0, qi) : h, qs = qi > -1 ? h.slice(qi + 1) : '';
    var parts = path.split('/').filter(Boolean).map(function (x) { try { return decodeURIComponent(x); } catch (e) { return x; } });
    return { parts: parts, q: new URLSearchParams(qs) };
  }
  function renderHeader() {
    var cur = route.parts[0] || '';
    var links = [['', 'nav.home'], ['recipes', 'nav.explore'], ['regions', 'nav.regions'], ['categories', 'nav.categories'], ['favorites', 'nav.favorites'], ['about', 'nav.about']];
    function isCur(p) { return p === cur || (p === 'recipes' && cur === 'recipe') || (p === 'regions' && cur === 'region'); }
    var navHtml = links.map(function (l) { return '<a href="#/' + l[0] + '"' + (isCur(l[0]) ? ' aria-current="page"' : '') + '>' + esc(t(l[1])) + '</a>'; }).join('');
    var menuLinks = links.concat([['list', 'nav.list'], ['finder', 'nav.finder'], ['festivals', 'nav.festivals']]).map(function (l) { return '<a class="m-link" href="#/' + l[0] + '"' + (isCur(l[0]) ? ' aria-current="page"' : '') + '>' + esc(t(l[1])) + '</a>'; }).join('');
    var opts = META.languages.map(function (l) { return '<option value="' + l.code + '"' + (l.code === state.lang ? ' selected' : '') + ' lang="' + l.htmlLang + '">' + l.native + '</option>'; }).join('');
    var pills = '<div class="lang-pills" role="group" aria-label="' + esc(t('nav.language')) + '">' + META.languages.map(function (l) { return '<button type="button" data-act="lang" data-lang="' + l.code + '" lang="' + l.htmlLang + '" aria-pressed="' + (l.code === state.lang) + '">' + l.native + '</button>'; }).join('') + '</div>';
    var hdr = $('#site-header');
    hdr.classList.remove('nav-open');
    hdr.innerHTML = '<div class="header-inner"><a class="brand" href="#/" aria-label="PRIYAM — ' + esc(t('nav.home')) + '">' + brandMark() + '<span class="brand-text"><b>PRIYAM</b><small>' + esc(t('brand.soul')) + '</small></span></a>' +
      '<nav class="nav" aria-label="Main">' + navHtml + '</nav><div class="header-tools">' +
      '<button class="icon-btn" type="button" data-act="searchToggle" aria-expanded="false" aria-controls="search-panel" aria-label="' + esc(t('nav.search')) + '">' + icon('search') + '</button>' +
      '<a class="icon-btn" href="#/list" aria-label="' + esc(t('nav.list')) + '">' + icon('list') + (state.list.length ? '<span class="badge">' + state.list.length + '</span>' : '') + '</a>' +
      '<label class="lang-select"><span class="sr-only">' + esc(t('nav.language')) + '</span><select id="lang-select" aria-label="' + esc(t('nav.language')) + '">' + opts + '</select></label>' +
      '<button class="icon-btn" type="button" id="menu-toggle" data-act="menuToggle" aria-expanded="false" aria-controls="menu-panel" aria-label="' + esc(t('nav.menu')) + '">' + icon('menu') + '</button></div></div>' +
      '<div class="search-panel" id="search-panel" hidden><div class="wrap">' + searchBox('header-q', '') + '</div></div>' +
      '<div class="menu-panel" id="menu-panel">' + menuLinks + '<div class="lang-pills-wrap" style="margin-top:1rem"><p class="fine" style="margin:0 0 .4rem">' + esc(t('nav.language')) + '</p>' + pills + '</div></div>';
    $('#skip-link').textContent = t('nav.skip');
    $$('[data-searchbox]', hdr).forEach(bindSearchBox);
  }
  function renderFooter() {
    var pills = '<div class="lang-pills" role="group" aria-label="' + esc(t('nav.language')) + '">' + META.languages.map(function (l) { return '<button type="button" data-act="lang" data-lang="' + l.code + '" lang="' + l.htmlLang + '" aria-pressed="' + (l.code === state.lang) + '">' + l.native + '</button>'; }).join('') + '</div>';
    $('#site-footer').innerHTML = '<div class="temple-strip" aria-hidden="true"></div><div class="wrap"><div class="footer-grid">' +
      '<div class="footer-brand"><b>PRIYAM</b><p>' + esc(t('brand.tagline')) + '</p><p class="fine" style="color:#E9D4A3">' + esc(t('brand.mission')) + '</p><p><a href="#/about">' + esc(t('nav.about')) + '</a></p></div>' +
      '<div><h3>' + esc(t('ft.explore')) + '</h3><ul>' + [['recipes', 'nav.explore'], ['categories', 'nav.categories'], ['festivals', 'nav.festivals'], ['finder', 'nav.finder'], ['favorites', 'nav.favorites'], ['list', 'nav.list']].map(function (l) { return '<li><a href="#/' + l[0] + '">' + esc(t(l[1])) + '</a></li>'; }).join('') + '</ul></div>' +
      '<div><h3>' + esc(t('nav.regions')) + '</h3><ul>' + META.regions.map(function (g) { return '<li><a href="#/region/' + g.id + '">' + esc(regionName(g.id)) + '</a></li>'; }).join('') + '</ul></div>' +
      '<div><h3>' + esc(t('nav.language')) + '</h3>' + pills + '</div></div>' +
      '<div class="footer-bottom"><span>© ' + new Date().getFullYear() + ' ' + esc(t('ft.rights')) + '</span><span>' + esc(t('ft.note')) + '</span></div></div>';
  }

  function renderRoute(keepScroll) {
    var y = window.scrollY, parsed = parseHash(); route = parsed;
    var path = parsed.parts.join('/'), p0 = parsed.parts[0] || '', cook = p0 === 'cook', html;
    document.body.classList.toggle('cooking', cook);
    if (cook) requestWake(); else releaseWake();
    if (!cook && sheetKind === 'ingredients') closeSheet();
    try {
      switch (p0) {
        case '': html = pageHome(); break;
        case 'recipes': html = pageExplore(); break;
        case 'recipe': html = pageRecipe(parsed.parts[1]); break;
        case 'cook': html = pageCook(parsed.parts[1]); break;
        case 'regions': html = pageRegions(); break;
        case 'region': html = pageRegion(parsed.parts[1]); break;
        case 'categories': html = pageCategories(); break;
        case 'favorites': html = pageFavorites(); break;
        case 'list': html = pageList(); break;
        case 'finder': html = pageFinder(); break;
        case 'festivals': html = pageFestivals(); break;
        case 'about': html = pageAbout(); break;
        default: html = pageNotFound();
      }
    } catch (err) {
      console.error('[PRIYAM] render error', err);
      html = '<div class="wrap">' + emptyBlock(t('nf.title'), t('msg.error'), '<a class="btn btn-maroon" href="#/">' + esc(t('common.backHome')) + '</a>') + '</div>';
    }
    app.innerHTML = html;
    renderHeader(); renderFooter(); renderTimersFab();
    if (sheetKind) renderSheet();
    $$('[data-searchbox]', app).forEach(bindSearchBox);
    var fl = $('#filters'); if (fl && window.innerWidth >= 900) fl.open = true;
    observeReveal();
    if (keepScroll) window.scrollTo(0, y);
    else if (path !== lastPath) {
      window.scrollTo(0, 0);
      try { app.focus({ preventScroll: true }); } catch (e) {}
    } else window.scrollTo(0, y);
    var f = $('[data-focus="1"]'); if (f) f.scrollIntoView({ block: 'start' });
    lastPath = path;
  }
  var app = $('#app');
  function observeReveal() {
    var els = $$('.reveal', app);
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    if (io) io.disconnect();
    io = new IntersectionObserver(function (entries) { entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }
  function setLang(l) {
    if (LANGS.indexOf(l) < 0 || l === state.lang) return;
    state.lang = l; Store.set('lang', l); document.documentElement.lang = l; loadScriptFonts(l);
    renderRoute(true);                       // re-render in place: the user stays on the same page
  }

  /* ----- search box behaviour (suggestions, clear, submit) ----- */
  function bindSearchBox(box) {
    var input = $('input', box), sg = $('.suggest', box), clear = $('.s-clear', box), active = -1;
    function close() { sg.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; }
    function items() { return $$('button', sg); }
    function setActive(n) { var b = items(); if (!b.length) return; active = (n + b.length) % b.length; b.forEach(function (x, i) { x.setAttribute('aria-selected', i === active); }); b[active].scrollIntoView({ block: 'nearest' }); }
    function submit(q) {
      close();
      location.hash = route.parts[0] === 'recipes' ? exploreURL(exploreParams(), { q: q.trim() }) : '#/recipes' + (q.trim() ? '?q=' + encodeURIComponent(q.trim()) : '');
    }
    input.addEventListener('input', function () {
      clear.hidden = !input.value;
      var list = suggestions(input.value);
      if (!list.length) { close(); return; }
      sg.innerHTML = '<ul>' + list.map(function (s) { return '<li><button type="button" role="option" aria-selected="false" data-href="' + esc(s.href) + '"><span>' + esc(s.label) + '</span><span class="kind">' + esc(t('s.type.' + s.kind)) + '</span></button></li>'; }).join('') + '</ul>';
      sg.hidden = false; input.setAttribute('aria-expanded', 'true'); active = -1;
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Escape') { close(); }
      else if (e.key === 'Enter' && active > -1) { e.preventDefault(); var b = items()[active]; close(); location.hash = b.getAttribute('data-href'); }
    });
    $('form', box).addEventListener('submit', function (e) { e.preventDefault(); submit(input.value); });
    sg.addEventListener('click', function (e) { var b = e.target.closest('button[data-href]'); if (b) { close(); location.hash = b.getAttribute('data-href'); } });
    clear.addEventListener('click', function () { input.value = ''; clear.hidden = true; close(); input.focus(); if (route.parts[0] === 'recipes' && exploreParams().q) submit(''); });
  }
  document.addEventListener('click', function (e) { if (!e.target.closest('[data-searchbox]')) $$('.suggest').forEach(function (s) { s.hidden = true; }); });

  /* ----- delegated click handling ----- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) return;
    var act = el.getAttribute('data-act'), id = el.getAttribute('data-id');
    switch (act) {
      case 'fav': e.preventDefault(); toggleFav(id); break;
      case 'share': shareRecipe(id); break;
      case 'print': window.print(); break;
      case 'surprise': {
        var pool = RECIPES.filter(function (r) { return r.id !== route.parts[1]; });
        if (pool.length) location.hash = '#/recipe/' + pool[Math.floor(Math.random() * pool.length)].id; break;
      }
      case 'servings': {
        var r = BYID[id], step = r.servingStep || 1, n = servingsOf(r) + (+el.getAttribute('data-d')) * step;
        n = Math.max(step, Math.min(r.servings * 4, n)); state.servings[id] = n; renderRoute(true); break;
      }
      case 'tick': {
        var rid = el.getAttribute('data-rid'), iid = el.getAttribute('data-iid'), arr = state.ticks[rid] || [];
        arr = el.checked ? arr.concat([iid]) : arr.filter(function (x) { return x !== iid; });
        state.ticks[rid] = arr; Store.set('ticks', state.ticks); break;
      }
      case 'clearTicks': state.ticks[id] = []; Store.set('ticks', state.ticks); renderRoute(true); break;
      case 'addList': addToList(id); break;
      case 'lang': setLang(el.getAttribute('data-lang')); break;
      case 'menuToggle': { var hd = $('#site-header'), open = hd.classList.toggle('nav-open'); el.setAttribute('aria-expanded', open); break; }
      case 'searchToggle': { var pn = $('#search-panel'); pn.hidden = !pn.hidden; el.setAttribute('aria-expanded', !pn.hidden); if (!pn.hidden) $('input', pn).focus(); break; }
      case 'clearSearch': break;
      case 'showMore': state.limit += PAGE_SIZE; renderRoute(true); break;
      case 'clearRecent': state.recent = []; Store.set('recent', []); renderRoute(true); break;
      /* cooking mode */
      case 'cookExit': location.hash = '#/recipe/' + state.cook.id; break;
      case 'cookIng': openSheet('ingredients'); break;
      case 'cookPrev': if (state.cook.step > 0) { state.cook.step--; renderRoute(true); window.scrollTo(0, 0); } break;
      case 'cookNext': { var rr = BYID[state.cook.id], total = rr.steps.length; if (state.cook.step < total - 1) state.cook.step++; else state.cook.done = true; renderRoute(true); window.scrollTo(0, 0); break; }
      case 'cookAgain': state.cook = { id: state.cook.id, step: 0, done: false }; renderRoute(true); window.scrollTo(0, 0); break;
      /* timers */
      case 'timersOpen': openSheet('timers'); break;
      case 'sheetClose': closeSheet(); break;
      case 'sheetBackdrop': if (e.target === el) closeSheet(); break;
      case 'timerStep': {
        var tr2 = BYID[id], si = +el.getAttribute('data-i'), key = id + ':' + si, tm = timerFor(key);
        if (!tm) { tm = addTimer(tr2.steps[si].timer, { key: key, rid: id, step: si }); startTimer(tm); }
        else if (tm.state === 'done') { resetTimer(tm); startTimer(tm); }
        else if (tm.state === 'idle' || tm.state === 'paused') startTimer(tm);
        timersChanged(); if (!document.body.classList.contains('cooking')) openSheet('timers'); break;
      }
      case 'tStart': case 'tResume': startTimer(timerById(+el.getAttribute('data-tid'))); timersChanged(); break;
      case 'tPause': pauseTimer(timerById(+el.getAttribute('data-tid'))); timersChanged(); break;
      case 'tReset': resetTimer(timerById(+el.getAttribute('data-tid'))); timersChanged(); break;
      case 'tRemove': timers = timers.filter(function (x) { return x.id !== +el.getAttribute('data-tid'); }); timersChanged(); break;
      /* shopping list */
      case 'listTick': { var it = state.list.filter(function (x) { return x.uid === el.getAttribute('data-uid'); })[0]; if (it) { it.checked = el.checked; Store.set('list', state.list); renderRoute(true); } break; }
      case 'listRemove': state.list = state.list.filter(function (x) { return x.uid !== el.getAttribute('data-uid'); }); saveList(); renderRoute(true); break;
      case 'listClearDone': state.list = state.list.filter(function (x) { return !x.checked; }); saveList(); renderRoute(true); break;
      case 'listClear': if (window.confirm(t('list.confirm'))) { state.list = []; saveList(); renderRoute(true); } break;
      case 'listCopy': copyText(listAsText(), t('list.copied')); break;
      /* ingredient finder */
      case 'finderToggle': {
        var ix = state.finder.indexOf(id); if (ix > -1) state.finder.splice(ix, 1); else state.finder.push(id);
        el.setAttribute('aria-pressed', ix < 0); $('#finder-count').textContent = t('f.selected', { n: state.finder.length }); $('#finder-clear').disabled = !state.finder.length;
        $('#finder-results').innerHTML = finderResults(); break;
      }
      case 'finderClear': state.finder = []; renderRoute(true); break;
    }
  });
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.id === 'lang-select') setLang(el.value);
    else if (el.id === 'sort-select') location.hash = exploreURL(exploreParams(), { sort: el.value });
  });
  document.addEventListener('input', function (e) {
    if (e.target.id === 'finder-filter') {
      var q = norm(e.target.value);
      $$('#finder-chips .chip').forEach(function (c) { c.hidden = q && c.getAttribute('data-name').indexOf(q) < 0; });
    }
  });
  document.addEventListener('submit', function (e) {
    if (e.target.hasAttribute('data-timer-form')) {
      e.preventDefault();
      var m = parseInt($('#tm-min').value, 10), lab = $('#tm-label').value.trim();
      if (!(m >= 1 && m <= 720)) { toast(t('tm.invalid')); return; }
      var tm = addTimer(m * 60, { label: lab }); startTimer(tm); timersChanged();
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && sheetKind) { closeSheet(); return; }
    if (document.body.classList.contains('cooking') && !sheetKind && !/INPUT|TEXTAREA|SELECT/.test((e.target.tagName || ''))) {
      if (e.key === 'ArrowRight') { var n = $('[data-act="cookNext"]'); if (n) n.click(); }
      else if (e.key === 'ArrowLeft') { var p = $('[data-act="cookPrev"]'); if (p && !p.disabled) p.click(); }
    }
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && document.body.classList.contains('cooking')) requestWake(); });
  window.addEventListener('hashchange', function () { renderRoute(false); });

  /* ===== 12. Init & developer checks =================================== */
  window.PRIYAM = {
    version: META.version, recipes: RECIPES, state: state,
    /* Lists any interface key that is missing/empty in any language. */
    checkTranslations: function () {
      var missing = [];
      (window.PRIYAM_UI_KEYS || []).forEach(function (k) { LANGS.forEach(function (l) { var v = UI[l][k]; if (v == null || v === '' || (Array.isArray(v) && !v.length)) missing.push(l + ':' + k); }); });
      console.log(missing.length ? 'Missing translations (' + missing.length + '):' : 'All ' + window.PRIYAM_UI_KEYS.length + ' interface keys are translated in all ' + LANGS.length + ' languages.', missing); return missing;
    },
    /* Verifies the recipe database: ids, counts per region, translations, tokens. */
    checkData: function () {
      var target = { 'tamil-nadu': 30, 'kerala': 20, 'andhra-pradesh': 20, 'telangana': 15, 'hyderabad': 15, 'karnataka': 20 };
      var counts = {}, problems = [], ids = {};
      RAW.forEach(function (r) {
        if (ids[r.id]) problems.push('duplicate id ' + r.id); ids[r.id] = 1; counts[r.region] = (counts[r.region] || 0) + 1;
        if (!RT[r.id]) { problems.push('no translations: ' + r.id); return; }
        var enTok = JSON.stringify(RT[r.id].en.steps.map(function (s) { return (s.join(' ').match(/\{q:[a-z0-9-]+\}/g) || []).sort(); }));
        LANGS.forEach(function (l) {
          var x = RT[r.id][l]; if (!x) { problems.push(r.id + ' missing ' + l); return; }
          ['name', 'intro', 'background', 'serve', 'storage'].forEach(function (f) { if (!x[f]) problems.push(r.id + ' ' + l + ' missing ' + f); });
          ['tips', 'mistakes', 'subs'].forEach(function (f) { if (!x[f] || !x[f].length) problems.push(r.id + ' ' + l + ' missing ' + f); });
          if (!x.steps || x.steps.length !== r.steps.length) problems.push(r.id + ' ' + l + ' step count');
          else if (JSON.stringify(x.steps.map(function (s) { return (s.join(' ').match(/\{q:[a-z0-9-]+\}/g) || []).sort(); })) !== enTok) problems.push(r.id + ' ' + l + ' quantity tokens differ from English');
        });
        r.ingredients.forEach(function (i) { if (!ING[i.id]) problems.push(r.id + ' no ingredient name ' + i.id); });
      });
      var rows = Object.keys(target).map(function (k) { return { region: k, have: counts[k] || 0, target: target[k] }; });
      console.table(rows); console.log('Total recipes:', RAW.length, '(target 120+). Problems:', problems.length, problems);
      return { total: RAW.length, byRegion: rows, problems: problems };
    }
  };

  function init() {
    document.documentElement.lang = state.lang; loadScriptFonts(state.lang);
    renderRoute(false);
    if (!Store.ok) toast(t('msg.storageBlocked'), 6000);
  }
  init();
})();

/* ==========================================================================
   PRIYAM — recipes.js
   Language-neutral recipe database. All visible text (names, steps, tips…) is
   in recipe-translations.js, keyed by the same stable `id`.

   SCHEMA (one object per recipe)
     id            stable unique id, "<region prefix>-<slug>" (never change it:
                   favorites, shopping lists and shared links depend on it)
     region        tamil-nadu | kerala | andhra-pradesh | telangana | hyderabad | karnataka
     categories    explicit categories (breakfast, lunch, dinner, desserts, snacks,
                   street-food, rice-dishes, curries, chutneys-pickles,
                   traditional-sweets, beverages). "vegetarian", "non-vegetarian",
                   "quick" and "festival" are derived automatically.
     festivals     ids from meta.js (optional)
     diet          { veg, vegan, eggFree }  true only when the ingredients confirm it
     allergens     allergens present in the ingredients (ids from meta.js)
     mayContain    allergens that may be present in some branded ingredients
     difficulty    easy | medium | hard
     servings      base number of servings (or pieces)
     servingsUnit  'servings' (default) | 'pieces'
     servingStep   step of the servings stepper (default 1)
     time          { prep, cook, rest }   minutes (rest optional). total = sum.
     aliases       extra Latin-script search words (common spellings)
     ingredients   [{ id, qty, unit, group }]  unit: g kg ml l cup tbsp tsp pinch
                   sprig clove or null (countable). Names: PRIYAM_ING[id].
     steps         [{ timer?: seconds }] one per step. Text: PRIYAM_RT[id][lang].steps
     nutrition     approximate per serving/piece { kcal, protein, carbs, fat }
     flags         { classic, heritage, signature, pick }  curated, not statistics
     added         ISO date the recipe was added (drives "Recently Added")
     image         null (illustrated fallback) or { src, alt?, credit? }
   ========================================================================== */
window.PRIYAM_RECIPES = window.PRIYAM_RECIPES || [];

/* ---------------------------- TAMIL NADU ---------------------------- */
PRIYAM_RECIPES.push({
  id: 'tn-ven-pongal',
  region: 'tamil-nadu',
  categories: ['breakfast', 'rice-dishes'],
  festivals: ['pongal'],
  diet: { veg: true, vegan: false, eggFree: true },
  allergens: ['dairy', 'tree-nuts'],
  mayContain: ['gluten'],            // some asafoetida (hing) is compounded with wheat flour
  difficulty: 'easy',
  servings: 4,
  time: { prep: 10, cook: 35 },
  aliases: ['pongal', 'khara pongal', 'venn pongal', 'ven pongal'],
  ingredients: [
    { id: 'rice',        qty: 1,   unit: 'cup',   group: 'main' },
    { id: 'moong-dal',   qty: 0.5, unit: 'cup',   group: 'main' },
    { id: 'water',       qty: 5,   unit: 'cup',   group: 'main' },
    { id: 'salt',        qty: 1.5, unit: 'tsp',   group: 'main' },
    { id: 'ghee',        qty: 3,   unit: 'tbsp',  group: 'tempering' },
    { id: 'cashew',      qty: 12,  unit: null,    group: 'tempering' },
    { id: 'black-pepper',qty: 1.5, unit: 'tsp',   group: 'tempering' },
    { id: 'cumin',       qty: 1,   unit: 'tsp',   group: 'tempering' },
    { id: 'ginger',      qty: 1,   unit: 'tbsp',  group: 'tempering' },
    { id: 'curry-leaves',qty: 1,   unit: 'sprig', group: 'tempering' },
    { id: 'asafoetida',  qty: 1,   unit: 'pinch', group: 'tempering' }
  ],
  steps: [{ timer: 180 }, {}, {}, { timer: 600 }, {}, {}, { timer: 120 }],
  nutrition: { kcal: 370, protein: 11, carbs: 54, fat: 13 },
  flags: { classic: true, heritage: true, signature: true, pick: true },
  added: '2026-10-14',
  image: null
});

PRIYAM_RECIPES.push({
  id: 'tn-kumbakonam-degree-coffee',
  region: 'tamil-nadu',
  categories: ['beverages'],         // "Beverages / Traditional Drinks" -> the Beverages category
  festivals: [],
  diet: { veg: true, vegan: false, eggFree: true },
  allergens: ['dairy'],
  mayContain: [],
  difficulty: 'easy',
  servings: 2,                        // two small steel tumblers (about 170 ml each)
  time: { prep: 5, cook: 20 },        // 5 min setup + about 15 min dripping decoction (milk is heated meanwhile)
  aliases: ['kumbakonam degree coffee', 'kumbakonam coffee', 'kumbakonam', 'degree coffee', 'degree kaapi',
            'filter coffee', 'filter kaapi', 'filter kapi', 'kaapi', 'kapi', 'coffee',
            'traditional drinks', 'traditional drink',
            'கும்பகோணம் டிகிரி காபி', 'டிகிரி காபி', 'ஃபில்டர் காபி', 'பில்டர் காபி', 'காபி'],
  ingredients: [
    { id: 'coffee-powder', qty: 3,   unit: 'tbsp', group: 'decoction' },
    { id: 'water',         qty: 0.5, unit: 'cup',  group: 'decoction' },
    { id: 'milk',          qty: 1,   unit: 'cup',  group: 'main' },
    { id: 'sugar',         qty: 4,   unit: 'tsp',  group: 'main' }
  ],
  steps: [{}, { timer: 900 }, { timer: 300 }, {}, {}, {}],
  nutrition: { kcal: 115, protein: 4, carbs: 14, fat: 4.5 },   // per tumbler, approximate
  flags: { classic: true, heritage: true, signature: true, pick: true },
  added: '2026-10-15',
  image: null
});

/* ------------------------------ KERALA ------------------------------ */
PRIYAM_RECIPES.push({
  id: 'kl-meen-curry',
  region: 'kerala',
  categories: ['lunch', 'dinner', 'curries'],
  festivals: [],
  diet: { veg: false, vegan: false, eggFree: true },
  allergens: ['fish', 'mustard', 'coconut'],
  mayContain: [],
  difficulty: 'medium',
  servings: 4,
  time: { prep: 20, cook: 30, rest: 15 },
  aliases: ['meen curry', 'fish curry', 'kerala fish curry', 'meen kari', 'kottayam fish curry', 'kudampuli'],
  ingredients: [
    { id: 'fish',                   qty: 500, unit: 'g',     group: 'main' },
    { id: 'kodampuli',              qty: 3,   unit: null,    group: 'main' },
    { id: 'water',                  qty: 1.5, unit: 'cup',   group: 'main' },
    { id: 'salt',                   qty: 1.5, unit: 'tsp',   group: 'main' },
    { id: 'kashmiri-chilli-powder', qty: 2,   unit: 'tbsp',  group: 'spices' },
    { id: 'turmeric-powder',        qty: 0.5, unit: 'tsp',   group: 'spices' },
    { id: 'coriander-powder',       qty: 1,   unit: 'tbsp',  group: 'spices' },
    { id: 'coconut-oil',            qty: 3,   unit: 'tbsp',  group: 'base' },
    { id: 'mustard-seeds',          qty: 0.5, unit: 'tsp',   group: 'base' },
    { id: 'fenugreek-seeds',        qty: 0.25,unit: 'tsp',   group: 'base' },
    { id: 'shallots',               qty: 100, unit: 'g',     group: 'base' },
    { id: 'ginger',                 qty: 1,   unit: 'tbsp',  group: 'base' },
    { id: 'garlic',                 qty: 6,   unit: 'clove', group: 'base' },
    { id: 'green-chilli',           qty: 3,   unit: null,    group: 'base' },
    { id: 'curry-leaves',           qty: 2,   unit: 'sprig', group: 'base' }
  ],
  steps: [{}, { timer: 600 }, {}, { timer: 240 }, {}, { timer: 300 }, { timer: 540 }, { timer: 900 }],
  nutrition: { kcal: 245, protein: 25, carbs: 6, fat: 14 },
  flags: { classic: true, heritage: true, signature: true, pick: true },
  added: '2026-10-14',
  image: null
});

/* ----------------------------- KARNATAKA ---------------------------- */
PRIYAM_RECIPES.push({
  id: 'ka-mysore-pak',
  region: 'karnataka',
  categories: ['desserts', 'traditional-sweets'],
  festivals: ['deepavali'],
  diet: { veg: true, vegan: false, eggFree: true },
  allergens: ['dairy'],
  mayContain: [],
  difficulty: 'hard',
  servings: 16, servingsUnit: 'pieces', servingStep: 4,
  time: { prep: 10, cook: 25, rest: 60 },
  aliases: ['mysore pak', 'mysorepak', 'mysore paak', 'besan sweet', 'gram flour sweet'],
  ingredients: [
    { id: 'besan', qty: 1,   unit: 'cup', group: 'main' },
    { id: 'sugar', qty: 1.5, unit: 'cup', group: 'main' },
    { id: 'ghee',  qty: 1,   unit: 'cup', group: 'main' },
    { id: 'water', qty: 0.5, unit: 'cup', group: 'main' }
  ],
  steps: [{}, { timer: 300 }, {}, {}, { timer: 540 }, { timer: 420 }, { timer: 3600 }],
  nutrition: { kcal: 220, protein: 1.5, carbs: 22, fat: 14 },
  flags: { classic: true, heritage: true, signature: true, pick: false },
  added: '2026-10-14',
  image: null
});

/* Further regions are added in later parts:
   ANDHRA PRADESH, TELANGANA, HYDERABAD — and more Tamil Nadu, Kerala, Karnataka. */

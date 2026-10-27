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
  image: {
  src: 'Images/venpongal.jpeg',
  alt: 'ven pongal'
}
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
  image: {
  src: 'Images/kumdeg.jpeg',
  alt: 'Kumbakonam Degree Coffee'
}
});

PRIYAM_RECIPES.push({
  id: 'tn-idli',
  region: 'tamil-nadu',
  categories: ['breakfast'],
  festivals: [],
  diet: { veg: true, vegan: true, eggFree: true },
  allergens: [],
  mayContain: [],
  difficulty: 'medium',
  servings: 20, servingsUnit: 'pieces', servingStep: 4,       // about 20 idlis from this batter
  time: { prep: 30, cook: 15, rest: 840 },                    // ~5 h soaking + ~9 h fermenting
  aliases: ['idli', 'idly', 'idlis', 'steamed rice cakes', 'rice cake', 'இட்லி'],
  ingredients: [
    { id: 'idli-rice',       qty: 2,   unit: 'cup', group: 'main' },
    { id: 'urad-dal',        qty: 0.5, unit: 'cup', group: 'main' },
    { id: 'fenugreek-seeds', qty: 0.5, unit: 'tsp', group: 'main' },
    { id: 'water',           qty: 1.5, unit: 'cup', group: 'main' },
    { id: 'salt',            qty: 1.5, unit: 'tsp', group: 'main' },
    { id: 'oil',             qty: 1,   unit: 'tsp', group: 'main' }
  ],
  steps: [{ timer: 14400 }, {}, {}, { timer: 32400 }, {}, { timer: 660 }],
  nutrition: { kcal: 85, protein: 2.5, carbs: 18, fat: 0.5 },   // per idli, approximate
  flags: { classic: true, heritage: true, signature: true, pick: true },
  added: '2026-10-15',
  image: null
});

PRIYAM_RECIPES.push({
  id: 'tn-sambar',
  region: 'tamil-nadu',
  categories: ['lunch', 'curries'],
  festivals: [],
  diet: { veg: true, vegan: true, eggFree: true },
  allergens: ['mustard'],
  mayContain: ['gluten'],            // some asafoetida is compounded with wheat flour
  difficulty: 'medium',
  servings: 4,
  time: { prep: 15, cook: 40 },
  aliases: ['sambar', 'sambhar', 'sambaar', 'lentil vegetable stew', 'சாம்பார்'],
  ingredients: [
    { id: 'toor-dal',         qty: 0.5,  unit: 'cup',  group: 'main' },
    { id: 'water',            qty: 3,    unit: 'cup',  group: 'main' },
    { id: 'turmeric-powder',  qty: 0.25, unit: 'tsp',  group: 'main' },
    { id: 'tamarind',         qty: 20,   unit: 'g',    group: 'main' },
    { id: 'mixed-vegetables', qty: 250,  unit: 'g',    group: 'main' },
    { id: 'salt',             qty: 1.5,  unit: 'tsp',  group: 'main' },
    { id: 'jaggery',          qty: 1,    unit: 'tsp',  group: 'main' },
    { id: 'coriander-leaves', qty: 2,    unit: 'tbsp', group: 'main' },
    { id: 'sambar-powder',    qty: 1.5,  unit: 'tbsp', group: 'spices' },
    { id: 'oil',              qty: 1,    unit: 'tbsp', group: 'tempering' },
    { id: 'mustard-seeds',    qty: 0.5,  unit: 'tsp',  group: 'tempering' },
    { id: 'dried-red-chilli', qty: 2,    unit: null,   group: 'tempering' },
    { id: 'curry-leaves',     qty: 1,    unit: 'sprig',group: 'tempering' },
    { id: 'asafoetida',       qty: 1,    unit: 'pinch',group: 'tempering' }
  ],
  steps: [{}, { timer: 600 }, { timer: 660 }, { timer: 300 }, {}, { timer: 300 }],
  nutrition: { kcal: 150, protein: 7, carbs: 22, fat: 4 },
  flags: { classic: true, heritage: true, signature: true, pick: false },
  added: '2026-10-15',
  image: null
});

PRIYAM_RECIPES.push({
  id: 'tn-rasam',
  region: 'tamil-nadu',
  categories: ['lunch', 'curries'],
  festivals: [],
  diet: { veg: true, vegan: false, eggFree: true },
  allergens: ['dairy', 'mustard'],
  mayContain: ['gluten'],
  difficulty: 'easy',
  servings: 4,
  time: { prep: 10, cook: 20 },
  aliases: ['rasam', 'charu', 'saaru', 'tomato rasam', 'pepper rasam', 'ரசம்'],
  ingredients: [
    { id: 'tamarind',         qty: 15,   unit: 'g',    group: 'main' },
    { id: 'tomato',           qty: 2,    unit: null,   group: 'main' },
    { id: 'water',            qty: 4,    unit: 'cup',  group: 'main' },
    { id: 'turmeric-powder',  qty: 0.25, unit: 'tsp',  group: 'main' },
    { id: 'salt',             qty: 1.5,  unit: 'tsp',  group: 'main' },
    { id: 'cooked-toor-dal',  qty: 3,    unit: 'tbsp', group: 'main' },
    { id: 'coriander-leaves', qty: 2,    unit: 'tbsp', group: 'main' },
    { id: 'black-pepper',     qty: 1,    unit: 'tsp',  group: 'spices' },
    { id: 'cumin',            qty: 1,    unit: 'tsp',  group: 'spices' },
    { id: 'garlic',           qty: 4,    unit: 'clove',group: 'spices' },
    { id: 'ghee',             qty: 1,    unit: 'tbsp', group: 'tempering' },
    { id: 'mustard-seeds',    qty: 0.5,  unit: 'tsp',  group: 'tempering' },
    { id: 'dried-red-chilli', qty: 1,    unit: null,   group: 'tempering' },
    { id: 'curry-leaves',     qty: 1,    unit: 'sprig',group: 'tempering' },
    { id: 'asafoetida',       qty: 1,    unit: 'pinch',group: 'tempering' }
  ],
  steps: [{}, { timer: 600 }, { timer: 360 }, {}, {}],
  nutrition: { kcal: 60, protein: 2, carbs: 8, fat: 3 },
  flags: { classic: true, heritage: true, signature: true, pick: false },
  added: '2026-10-15',
  image: null
});

PRIYAM_RECIPES.push({
  id: 'tn-lemon-rice',
  region: 'tamil-nadu',
  categories: ['lunch', 'rice-dishes'],
  festivals: [],
  diet: { veg: true, vegan: true, eggFree: true },
  allergens: ['peanuts', 'mustard'],
  mayContain: ['gluten'],
  difficulty: 'easy',
  servings: 4,
  time: { prep: 15, cook: 15 },                   // uses rice that is already cooked
  aliases: ['lemon rice', 'elumichai sadam', 'ezhumichai sadam', 'nimbu rice', 'lemon sadam', 'லெமன் ரைஸ்', 'எலுமிச்சை சாதம்'],
  ingredients: [
    { id: 'cooked-rice',      qty: 3,    unit: 'cup',  group: 'main' },
    { id: 'salt',             qty: 1,    unit: 'tsp',  group: 'main' },
    { id: 'lemon-juice',      qty: 3,    unit: 'tbsp', group: 'main' },
    { id: 'coriander-leaves', qty: 2,    unit: 'tbsp', group: 'main' },
    { id: 'oil',              qty: 2,    unit: 'tbsp', group: 'tempering' },
    { id: 'mustard-seeds',    qty: 1,    unit: 'tsp',  group: 'tempering' },
    { id: 'chana-dal',        qty: 1,    unit: 'tbsp', group: 'tempering' },
    { id: 'urad-dal',         qty: 1,    unit: 'tsp',  group: 'tempering' },
    { id: 'peanuts',          qty: 2,    unit: 'tbsp', group: 'tempering' },
    { id: 'dried-red-chilli', qty: 2,    unit: null,   group: 'tempering' },
    { id: 'green-chilli',     qty: 2,    unit: null,   group: 'tempering' },
    { id: 'ginger',           qty: 1,    unit: 'tsp',  group: 'tempering' },
    { id: 'curry-leaves',     qty: 1,    unit: 'sprig',group: 'tempering' },
    { id: 'turmeric-powder',  qty: 0.5,  unit: 'tsp',  group: 'tempering' },
    { id: 'asafoetida',       qty: 1,    unit: 'pinch',group: 'tempering' }
  ],
  steps: [{}, {}, {}, {}, {}, { timer: 600 }],
  nutrition: { kcal: 260, protein: 6, carbs: 42, fat: 9 },
  flags: { classic: true, heritage: false, signature: false, pick: false },
  added: '2026-10-15',
  image: null
});

PRIYAM_RECIPES.push({
  id: 'tn-curd-rice',
  region: 'tamil-nadu',
  categories: ['lunch', 'rice-dishes'],
  festivals: [],
  diet: { veg: true, vegan: false, eggFree: true },
  allergens: ['dairy', 'mustard'],
  mayContain: ['gluten'],
  difficulty: 'easy',
  servings: 2,
  time: { prep: 10, cook: 5, rest: 15 },                  // rest = cooling the rice before adding curd
  aliases: ['curd rice', 'thayir sadam', 'tayir sadam', 'yogurt rice', 'yoghurt rice', 'தயிர் சாதம்'],
  ingredients: [
    { id: 'cooked-rice',      qty: 2,    unit: 'cup',  group: 'main' },
    { id: 'milk',             qty: 0.5,  unit: 'cup',  group: 'main' },
    { id: 'salt',             qty: 1,    unit: 'tsp',  group: 'main' },
    { id: 'curd',             qty: 1,    unit: 'cup',  group: 'main' },
    { id: 'coriander-leaves', qty: 1,    unit: 'tbsp', group: 'main' },
    { id: 'oil',              qty: 1,    unit: 'tsp',  group: 'tempering' },
    { id: 'mustard-seeds',    qty: 0.5,  unit: 'tsp',  group: 'tempering' },
    { id: 'urad-dal',         qty: 1,    unit: 'tsp',  group: 'tempering' },
    { id: 'dried-red-chilli', qty: 1,    unit: null,   group: 'tempering' },
    { id: 'green-chilli',     qty: 1,    unit: null,   group: 'tempering' },
    { id: 'ginger',           qty: 0.5,  unit: 'tsp',  group: 'tempering' },
    { id: 'curry-leaves',     qty: 1,    unit: 'sprig',group: 'tempering' },
    { id: 'asafoetida',       qty: 1,    unit: 'pinch',group: 'tempering' }
  ],
  steps: [{}, { timer: 900 }, {}, { timer: 600 }],
  nutrition: { kcal: 380, protein: 12, carbs: 58, fat: 10 },
  flags: { classic: true, heritage: true, signature: true, pick: false },
  added: '2026-10-16',
  image: null
});

PRIYAM_RECIPES.push({
  id: 'tn-dosa',
  region: 'tamil-nadu',
  categories: ['breakfast'],
  festivals: [],
  diet: { veg: true, vegan: true, eggFree: true },
  allergens: [],
  mayContain: [],
  difficulty: 'medium',
  servings: 12, servingsUnit: 'pieces', servingStep: 4,    // about 12 dosas
  time: { prep: 30, cook: 30, rest: 840 },                 // ~6 h soaking + ~8 h fermenting
  aliases: ['dosa', 'dosai', 'thosai', 'dosay', 'plain dosa', 'crisp dosa', 'crepe', 'தோசை'],
  ingredients: [
    { id: 'idli-rice',       qty: 1.5,  unit: 'cup', group: 'main' },
    { id: 'urad-dal',        qty: 0.5,  unit: 'cup', group: 'main' },
    { id: 'fenugreek-seeds', qty: 0.5,  unit: 'tsp', group: 'main' },
    { id: 'water',           qty: 1.25, unit: 'cup', group: 'main' },
    { id: 'salt',            qty: 1.5,  unit: 'tsp', group: 'main' },
    { id: 'oil',             qty: 3,    unit: 'tbsp',group: 'main' }
  ],
  steps: [{ timer: 21600 }, {}, { timer: 32400 }, {}, {}, { timer: 180 }],
  nutrition: { kcal: 125, protein: 3.5, carbs: 24, fat: 2.5 },   // per dosa, approximate
  flags: { classic: true, heritage: true, signature: true, pick: true },
  added: '2026-10-16',
  image: null
});

PRIYAM_RECIPES.push({
  id: 'tn-sakkarai-pongal',
  region: 'tamil-nadu',
  categories: ['desserts', 'traditional-sweets'],
  festivals: ['pongal'],
  diet: { veg: true, vegan: false, eggFree: true },
  allergens: ['dairy', 'tree-nuts'],
  mayContain: [],
  difficulty: 'medium',
  servings: 4,
  time: { prep: 10, cook: 40 },
  aliases: ['sakkarai pongal', 'sakkara pongal', 'chakkara pongal', 'sweet pongal', 'jaggery pongal', 'சர்க்கரைப் பொங்கல்'],
  ingredients: [
    { id: 'rice',            qty: 0.75, unit: 'cup',  group: 'main' },
    { id: 'moong-dal',       qty: 0.25, unit: 'cup',  group: 'main' },
    { id: 'water',           qty: 3.5,  unit: 'cup',  group: 'main' },
    { id: 'milk',            qty: 0.5,  unit: 'cup',  group: 'main' },
    { id: 'jaggery',         qty: 200,  unit: 'g',    group: 'main' },
    { id: 'cardamom-powder', qty: 0.5,  unit: 'tsp',  group: 'main' },
    { id: 'ghee',            qty: 4,    unit: 'tbsp', group: 'main' },
    { id: 'cashew',          qty: 10,   unit: null,   group: 'main' },
    { id: 'raisins',         qty: 2,    unit: 'tbsp', group: 'main' }
  ],
  steps: [{}, { timer: 600 }, { timer: 180 }, { timer: 480 }, {}],
  nutrition: { kcal: 545, protein: 9, carbs: 95, fat: 17 },
  flags: { classic: true, heritage: true, signature: true, pick: true },
  added: '2026-10-16',
  image: null
});

PRIYAM_RECIPES.push({
  id: 'tn-kothu-parotta',
  region: 'tamil-nadu',
  categories: ['dinner', 'street-food'],
  festivals: [],
  diet: { veg: false, vegan: false, eggFree: false },
  contains: ['egg'],
  allergens: ['gluten', 'egg'],
  mayContain: [],
  difficulty: 'medium',
  servings: 4,
  time: { prep: 15, cook: 20 },
  aliases: ['kothu parotta', 'kothu parota', 'kothu paratha', 'kothu porotta', 'koththu parotta', 'egg kothu parotta', 'shredded parotta', 'கொத்து பரோட்டா'],
  ingredients: [
    { id: 'parotta',          qty: 4,    unit: null,   group: 'main' },
    { id: 'eggs',             qty: 3,    unit: null,   group: 'main' },
    { id: 'onion',            qty: 2,    unit: null,   group: 'main' },
    { id: 'tomato',           qty: 2,    unit: null,   group: 'main' },
    { id: 'green-chilli',     qty: 2,    unit: null,   group: 'main' },
    { id: 'curry-gravy',      qty: 1,    unit: 'cup',  group: 'main' },
    { id: 'salt',             qty: 1,    unit: 'tsp',  group: 'main' },
    { id: 'coriander-leaves', qty: 2,    unit: 'tbsp', group: 'main' },
    { id: 'oil',              qty: 3,    unit: 'tbsp', group: 'tempering' },
    { id: 'fennel-seeds',     qty: 0.5,  unit: 'tsp',  group: 'tempering' },
    { id: 'curry-leaves',     qty: 1,    unit: 'sprig',group: 'tempering' },
    { id: 'ginger-garlic-paste', qty: 1, unit: 'tbsp', group: 'spices' },
    { id: 'turmeric-powder',  qty: 0.5,  unit: 'tsp',  group: 'spices' },
    { id: 'red-chilli-powder',qty: 1,    unit: 'tsp',  group: 'spices' },
    { id: 'garam-masala',     qty: 1,    unit: 'tsp',  group: 'spices' }
  ],
  steps: [{}, { timer: 300 }, { timer: 300 }, {}, { timer: 240 }, {}],
  nutrition: { kcal: 470, protein: 14, carbs: 52, fat: 24 },
  flags: { classic: true, heritage: false, signature: true, pick: false },
  added: '2026-10-16',
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
  image: {
  src: 'Images/meencurry.jpeg',
  alt: 'meencurry'
}
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
  image: {
  src: 'Images/mysore.jpeg',
  alt: 'mysore-pak'
}
});

/* Further regions are added in later parts:
   ANDHRA PRADESH, TELANGANA, HYDERABAD — and more Tamil Nadu, Kerala, Karnataka. */

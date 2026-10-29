/* ==========================================================================
   PRIYAM — meta.js
   Language-neutral structural metadata: languages, regions, categories,
   festivals, allergens, unit rules. Visible text for all of these lives in
   translations.js (keys are noted in comments). To add a region/category/
   festival: add its id here, then add its translations in translations.js.
   ========================================================================== */
window.PRIYAM_META = {
  languages: [
    { code: 'en', native: 'English',  htmlLang: 'en' },
    { code: 'ta', native: 'தமிழ்',     htmlLang: 'ta' },
    { code: 'ml', native: 'മലയാളം',   htmlLang: 'ml' },
    { code: 'kn', native: 'ಕನ್ನಡ',     htmlLang: 'kn' },
    { code: 'te', native: 'తెలుగు',    htmlLang: 'te' },
    { code: 'hi', native: 'हिन्दी',     htmlLang: 'hi' }
  ],

  /* Regions. `image` is an optional path (e.g. "images/regions/kerala.jpg").
     Leave null to use the built-in illustrated banner. a/b = banner colours. */
  regions: [
    { id: 'tamil-nadu',     a: '#641E25', b: '#C89B3C', image: 'Images/tamilnadu.jpeg' },
    { id: 'kerala',         a: '#2F5A36', b: '#C89B3C', image: 'Images/kerala.jpeg' },
    { id: 'andhra-pradesh', a: '#A94F35', b: '#F0C25A', image: 'Images/andhra.jpeg' },
    { id: 'telangana',      a: '#6B4128', b: '#E2B867', image: 'Images/telungana.jpeg' },
    { id: 'hyderabad',      a: '#3A2447', b: '#E3C16F', image: null },
    { id: 'karnataka',      a: '#7B4F12', b: '#F2D58A', image: 'Images/karanataka.jpeg' }
  ],

  /* Categories. Explicit ones are listed on recipes (recipe.categories).
     Derived ones are computed from other recipe data (see script.js). */
  primaryCategories: ['breakfast', 'lunch', 'dinner', 'desserts'],
  extraCategories: ['snacks', 'street-food', 'rice-dishes', 'curries', 'chutneys-pickles',
                    'traditional-sweets', 'beverages', 'festival', 'vegetarian',
                    'non-vegetarian', 'quick'],
  derivedCategories: ['festival', 'vegetarian', 'non-vegetarian', 'quick'],
  quickMinutes: 30,

  /* Festivals: translations use keys festival.<id>.name / festival.<id>.desc */
  festivals: ['pongal', 'onam', 'ugadi', 'deepavali', 'ramzan'],

  /* Allergen ids: translations use key allergen.<id> */
  allergens: ['gluten', 'dairy', 'egg', 'fish', 'shellfish', 'peanuts', 'tree-nuts',
              'sesame', 'mustard', 'soy', 'coconut'],

  /* Pantry staples are ignored by the Ingredient Finder. */
  staples: ['water', 'salt'],

  /* Unit groups for merging the shopping list (factor = to base unit).
     1 cup = 250 ml, 1 tbsp = 15 ml, 1 tsp = 5 ml. */
  unitGroups: {
    mass:   { base: 'g',  units: { g: 1, kg: 1000 } },
    volume: { base: 'ml', units: { ml: 1, l: 1000, tsp: 5, tbsp: 15, cup: 250 } }
  },

  /* Optional hero photograph (null = built-in illustrated hero). */
  heroImage:'Images/temple.jpeg',

  /* App version shown in the footer. */
  version: '1.0.0-part1'
};

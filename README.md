# PRIYAM — The Soul of South Indian Cooking

> *Every Recipe Has a Story. Every Bite Feels Like Home.*

PRIYAM is a static, multilingual South Indian recipe website (HTML + CSS + vanilla JavaScript, no frameworks, no build step, no backend). Interface and recipes are available in **English, தமிழ், മലയാളം, ಕನ್ನಡ, తెలుగు and हिन्दी**.

## Project status: Version 1.0 — Part 2 in progress (batches 2a–2b done)

| Area | Status |
|---|---|
| Site engine (navigation, search, filters, favorites, shopping list, cooking mode, timers, print, share, finder, festivals, regional pages) | **Built and browser-tested** |
| Interface translations (all 6 languages) | **Complete** |
| Region / category / festival / allergen texts (all 6 languages) | **Complete** |
| Recipe database | **12 of 120+ recipes** (Tamil Nadu 10/30 · Kerala 1/20 · Karnataka 1/20 · Andhra, Telangana, Hyderabad 0) |

Recipes are being added in batches of about 4 (each with all six translations, tested after every batch). Batch 2a added Idli, Sambar, Rasam and Lemon Rice; batch 2b added Curd Rice, Dosa, Sakkarai Pongal and Kothu Parotta. Current recipes:
`tn-ven-pongal`, `tn-kumbakonam-degree-coffee`, `tn-idli`, `tn-sambar`, `tn-rasam`, `tn-lemon-rice`, `tn-curd-rice`, `tn-dosa`, `tn-sakkarai-pongal`, `tn-kothu-parotta` (Tamil Nadu), `kl-meen-curry` (Kerala), `ka-mysore-pak` (Karnataka).

**Kumbakonam Degree Coffee** (`tn-kumbakonam-degree-coffee`) counts toward Tamil Nadu's 30. It is the only coffee entry: the generic "filter coffee" example from the brief is covered by this recipe, so no separate Filter Coffee recipe will be created. It is filed under the *Beverages* category (the "Traditional Drinks" idea maps to it; "traditional drinks" is also a search alias) and is found by *Kumbakonam Degree Coffee*, *கும்பகோணம் டிகிரி காபி*, *Degree Coffee* and *Filter Coffee* (plus a few spellings such as "filter kaapi"), in any interface language.

**Target distribution (not yet reached):** Tamil Nadu 30 · Kerala 20 · Andhra Pradesh 20 · Telangana 15 · Hyderabad 15 · Karnataka 20.
Run `PRIYAM.checkData()` in the browser console to see current counts. The site never pads the database: regions with no recipes show an honest "still being added" message.

## Run locally

The site works by opening `index.html` directly, but a tiny local server is more reliable:

```bash
cd priyam
python3 -m http.server 8000     # then open http://localhost:8000
```

No installation, no build, no API keys.

## Publish with GitHub Pages

1. Create a new repository on GitHub (e.g. `priyam`).
2. In the project folder:
   ```bash
   git init
   git add .
   git commit -m "PRIYAM v1.0 part 1"
   git branch -M main
   git remote add origin https://github.com/<your-username>/priyam.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `/ (root)` → Save**.
4. After a minute the site is live at `https://<your-username>.github.io/priyam/`.

Routing uses the URL hash (`#/recipe/tn-ven-pongal`), so direct links, refresh and the browser Back button work on GitHub Pages without extra configuration.

## File map

| File | Purpose |
|---|---|
| `index.html` | App shell, icon/art sprite, script loading order |
| `style.css` | Thanjavur-inspired theme, layout, responsive rules, print sheet, reduced-motion |
| `script.js` | Router, rendering, search, filters, favorites, shopping list, cooking mode, timers |
| `meta.js` | Language-neutral structure: languages, regions, categories, festivals, allergens, unit rules |
| `translations.js` | All interface text, regions, categories, festivals, allergens, units — 6 languages |
| `recipes.js` | Recipe data (language-neutral: IDs, times, quantities, categories, allergens, nutrition) |
| `recipe-translations.js` | Ingredient names + recipe text (name, intro, steps, tips…) in 6 languages |
| `images/logo.png` | Brand logo (used on the About page) |
| `images/recipes/` | Drop licensed recipe photos here |
| `tests/smoke_test.py` | Optional Playwright smoke test |

## Adding a recipe (the schema is documented at the top of `recipes.js`)

1. **Choose a stable ID**: `<region prefix>-<slug>`, e.g. `tn-idli`. Never rename it later (favorites, lists and shared links depend on it).
2. **Add the data** to `recipes.js` with `PRIYAM_RECIPES.push({...})`: region, categories, diet flags, allergens, times, ingredients (`id`, `qty`, `unit`, `group`), and one `{timer}` object per step.
3. **Add ingredient names** for any new ingredient id to `PRIYAM_ING` in `recipe-translations.js` (order: en, ta, ml, kn, te, hi).
4. **Add the text** with `PRIYAM_defineRT('<id>', [en, ta, ml, kn, te, hi])`. Each step is `[what to do and how, what to look for]`. Use `{q:ingredient-id}` where a quantity appears, so numbers scale with servings and stay identical in every language.
5. Open the site and run `PRIYAM.checkData()` — it reports missing languages, step-count mismatches, and quantity tokens that differ from English. A recipe that fails these checks is **skipped and logged** rather than shown half-translated.

## Adding photographs

No photo URLs are bundled because none could be verified. Every dish has an illustrated fallback. To add a photo you have the right to use:

1. Save it as `images/recipes/<recipe-id>.jpg` (about 1200×900, under 200 KB).
2. In `recipes.js` set `image: { src: 'images/recipes/tn-ven-pongal.jpg', alt: 'Ven pongal in a steel bowl', credit: 'Photographer / licence' }`.

Regional banners and the home hero follow the same idea (`image` in `meta.js` regions; `heroImage` in `meta.js`). A missing or broken image is removed automatically and the illustration shows instead.

## Implemented features

- Sticky navigation, working mobile menu, search with suggestions, six-language selector (native script names, remembered, switches in place without leaving the page)
- Hero, six regional kitchen cards, regional pages (intro, local ingredients, techniques, signature dishes, breakfast/lunch/dinner/dessert collections)
- Home sections: Today's Special (deterministic date rule), Popular (curated), Trending (monthly rotation), Quick (≤30 min), Traditional, Festival, Vegetarian, Non-vegetarian, Desserts, Recently Added, PRIYAM Recommendations, Recently viewed, quote, Ingredient Finder call-to-action. A section is hidden if it would repeat an earlier one exactly.
- Recipe page: story, categories, times, difficulty, serving calculator (proportional scaling with kitchen-friendly rounding), tick-off ingredients (saved), method with "look for" cues, tips, common mistakes, substitutions, serving suggestions, storage, allergens (+ "may contain"), approximate nutrition, related recipes, print, share (native share → copy-link fallback)
- Cooking mode: one large step at a time, previous/next, step counter, progress bar, ingredients sheet, per-step timers, finish screen, keyboard arrows, screen wake-lock where supported
- Timers: start / pause / resume / reset / remove, several at once, sound + vibration + on-screen alert (uses real timestamps, so they stay accurate in background tabs)
- Favorites and **My Cooking List** (local storage, no account). The list merges identical ingredients when units are compatible (g/kg, ml/l/tsp/tbsp/cup; 1 cup = 250 ml), ticks, removes, clears, copies, prints
- Filters: region, 4 primary + 11 extra categories, vegetarian / vegan / egg-free (only where the recipe data confirms it), sort by best match / prep time / total time / A–Z, reset, useful no-results screen
- Search in the active language and English: names, aliases, ingredients, regions, categories, dietary words and allergens ("coconut", "non veg", "egg-free", "dairy", "peanuts", Tamil/Hindi words …)
- Ingredient-to-Recipe Finder, Surprise Me, Festival Specials page, recently viewed (privacy-conscious, clearable)
- Accessibility: skip link, labelled controls, keyboard navigation, visible focus, `aria-live` results, reduced-motion support, large touch targets

## What was actually tested (Part 1)

Automated browser tests (headless Chromium via Playwright) were run in this build environment:

- Every route × all 6 languages × phone (360 px) and desktop (1366 px): **no JavaScript errors, no horizontal overflow**
- Search: ingredient ("coconut", "ghee"), dietary ("vegetarian", "non veg"), category/region filters, empty state
- Recipe cards open the correct recipe; servings change updates every quantity (and quantities inside step text)
- Ingredient ticks, favorites and shopping list **survive a page refresh**; shopping-list merging (including tsp + tbsp)
- Language switching keeps you on the same page; recipe names/steps change language
- Cooking mode: steps 1→7, Previous disabled on step 1, Finish state, Cook again; ingredient sheet; Esc closes
- Timers with a controlled clock: start, countdown, pause (no drift), resume, finish alert, reset; custom timer
- Data checks: translation completeness (0 missing UI keys), per-recipe checks (0 problems), no wrong-script characters

**Not tested here** (please test on real devices): real iPhone Safari and Android Chrome behaviour, native share sheet, wake lock, audio/vibration, printing to paper/PDF, screen readers, and the appearance of Indic web fonts (the sandbox has no internet, so Google Fonts could not load; the system-font fallbacks were used).

## Known limitations and items flagged for review

- **Only 12 of 120+ recipes exist so far.** Later batches add the rest, region by region, each with all six translations.
- **Recipes are written from general culinary knowledge and have not been test-cooked or verified by professional chefs.** Quantities and timings are realistic but should be cooked and adjusted before publishing widely.
- **Translations were written by hand (no machine-translation service) but not reviewed by native speakers.** Please have a native reader check Tamil, Malayalam, Kannada, Telugu and Hindi before launch.
- **Cultural statements to verify:** the Mysore pak palace-kitchen origin; the popular explanation of "degree" in Kumbakonam Degree Coffee (milk quality) and the Cauvery-delta description of Kumbakonam; the "Kottayam-style" description of the fish curry; the festival descriptions; the Puṟanāṉūṟu quotation on the home page (attribution: Sangam-era Tamil poetry).
- **Nutrition values are rough estimates** from typical ingredient data, clearly labelled as approximate.
- **No photographs yet** (see above). The hero and regional banners use generated illustrations.
- **"Popular" and "Trending" are not statistics.** They are a curated list and a monthly rotation, and are labelled that way. Sorting by popularity is intentionally absent until real usage data exists.
- **Google Fonts** are loaded as progressive enhancement (Latin fonts + the Noto family for the selected script). If blocked/offline, system fonts are used. For a fully offline site, self-host the fonts.
- Timers are held in memory (lost on page refresh). Favorites/list use `localStorage` (per browser, not synced).
- Allergen information covers 11 tracked allergens only; "may contain" flags (e.g. wheat in some asafoetida) are advisory.

## Roadmap (not implemented — architecture is prepared for it)

Stable IDs, language-neutral data and separated content/logic make these additions possible without a rewrite: backend + database, accounts and cloud-synced favorites/lists, user-submitted recipes, ratings and reviews, moderation, admin dashboard, image uploads, more regions and languages, search API, mobile app. **None of these exist in version 1.0.**

## Developer console helpers

```js
PRIYAM.checkData()          // recipe counts per region + any data/translation problems
PRIYAM.checkTranslations()  // any interface key missing in any language
```

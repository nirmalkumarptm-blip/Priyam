"""PRIYAM smoke test (optional developer tool).
Requires: pip install playwright && playwright install chromium
Run from the project folder:  python3 tests/smoke_test.py
Checks every route in every language at phone and desktop widths for JavaScript
errors and horizontal overflow, then runs the in-page data/translation checks."""
import pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = (ROOT / "index.html").as_uri()
ROUTES = ["", "recipes", "recipes?q=pongal", "regions", "region/tamil-nadu", "region/kerala", "region/karnataka",
          "categories", "favorites", "list", "finder", "festivals", "about",
          "recipe/tn-ven-pongal", "recipe/kl-meen-curry", "recipe/ka-mysore-pak", "cook/kl-meen-curry", "recipe/nope"]
errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for lang in ["en", "ta", "ml", "kn", "te", "hi"]:
        for w, h in [(360, 740), (1366, 800)]:
            ctx = b.new_context(viewport={"width": w, "height": h})
            pg = ctx.new_page()
            pg.on("pageerror", lambda e: errors.append(str(e)))
            pg.add_init_script(f"localStorage.setItem('priyam.lang', JSON.stringify('{lang}'))")
            pg.goto(BASE)
            for r in ROUTES:
                pg.goto(BASE + "#/" + r); pg.wait_for_timeout(60)
                if pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") > 0:
                    errors.append(f"overflow: {lang} {w}px #{r}")
            ctx.close()
    pg = b.new_page(); pg.goto(BASE)
    data = pg.evaluate("PRIYAM.checkData()"); missing = pg.evaluate("PRIYAM.checkTranslations()")
    b.close()
print("recipes:", data["total"], "| data problems:", len(data["problems"]), "| missing UI translations:", len(missing))
print("errors:", errors or "none")

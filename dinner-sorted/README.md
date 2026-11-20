# Dinner Sorted

"Your ingredients. Tonight's dinner." A phone-first web app (PWA) that picks three realistic dinners from what you already have.

Live address once merged: `https://yayacr7.github.io/dinner-sorted/`

## What it does
1. Asks how many are eating and how much time you have.
2. You add ingredients by typing ("2 chicken breasts, rice and garlic"), tapping common items, or looking at a photo.
3. Asks once about diet, allergies, things to avoid and equipment (stovetop, oven, microwave).
4. Shows three dinners from 27 hand-written recipes, ranked by how many of your ingredients they use and how little you need to buy. "Show 3 other ideas" pages through the rest.
5. Each card and recipe shows what you have, what you still need, optional extras, swaps, estimated time and a rough cost guess.
6. Cooking mode: one big step at a time, timers that keep running between steps and survive a reload, an alarm screen, food-safety temperatures from USDA, swipe or arrow keys, screen kept on where the browser allows.
7. Shopping list (share as text or a link that asks before adding), favorites, and an optional pantry that is only changed when you say so after cooking.

## Honest limits
- **Photo recognition is not connected.** The photo is shown so you can tap what you see. `config.js` has a `recognizeUrl` setting for a server you run later; suggestions from it must be confirmed one by one (tested with a fake server).
- **No AI recipes.** `DSEngine.validateRecipe()` already checks every curated recipe and is ready to check AI output if a secure server is added.
- **The shared list is a copy**, not live sync. Live sync needs a server and accounts.
- Times are estimates, $ signs are guesses, illustrations are drawings.
- Everything is saved in the browser on this device only.

## Food safety
Never judges food from a photo or a date label. Temperatures from the USDA FSIS Safe Minimum Internal Temperature Chart (checked Nov 20, 2026): poultry 165°F, ground meat 160°F, fish 145°F, egg dishes 160°F, leftovers 165°F. Allergies remove or swap ingredients; uncertain swaps say "check label".

## Look
Based on Yaya's concept image (Nov 20, 2026): gold bowl logo with red steam, stacked dark-green name, dark-green headings, red "dinner?" with a gold underline, tomatoes, spinach and pasta. The concept's food photos were not used (they show dishes that are not in the recipe collection); the home scene and meal pictures are drawings. Font: Nunito (SIL Open Font License, `fonts/OFL.txt`), stored in the app so it works offline.

## Files
`data.js` ingredients + recipes · `engine.js` matching, filters, scaling, validation (runs in Node too) · `art.js` drawn illustrations · `app.js` screens · `app.css` · `sw.js` offline · `config.js` optional server setting.

## Tests
```
node dinner-sorted/tests/engine-test.js            # 198 checks: data, matching, allergies, diets, scaling, share links
npx http-server -p 8765 -c-1 .                     # from the repo root
node dinner-sorted/tests/browser-test.js           # 193 checks: full journey with real typing, 7 devices
AXE_PATH=/path/to/axe.min.js node dinner-sorted/tests/browser-test.js   # adds an accessibility scan
```

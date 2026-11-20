/* Dinner Sorted: ingredient catalogue + curated recipe collection.
   Everything here is hand-written. Times are estimates. Cost tiers are rough guesses, not checked prices.
   Safety temperatures come from USDA FSIS (see TEMPS below). */
(function (root) {
  'use strict';

  // flags: meat, fish, shellfish, dairy, egg, gluten, soy, peanut, treenut, sesame, honey (not vegan), staple, pricey
  // check: a label warning shown whenever this ingredient is used.
  var I = {};
  function ing(id, name, cat, flags, aliases, extra) {
    I[id] = Object.assign({ id: id, name: name, cat: cat, flags: flags || [], aliases: aliases || [] }, extra || {});
  }
  // Proteins
  ing('chicken', 'Chicken', 'protein', ['meat'], ['chicken breast', 'chicken breasts', 'chicken thigh', 'chicken thighs', 'boneless chicken', 'chicken tenders']);
  ing('ground_beef', 'Ground beef', 'protein', ['meat'], ['ground beef', 'minced beef', 'beef mince', 'hamburger meat', 'mince', 'ground meat']);
  ing('sausage', 'Sausage', 'protein', ['meat'], ['sausages', 'smoked sausage', 'kielbasa', 'bratwurst', 'italian sausage', 'chicken sausage'], { check: 'Sausage can contain milk, wheat or soy. Check the package.' });
  ing('salmon', 'Salmon', 'protein', ['fish', 'pricey'], ['salmon fillet', 'salmon fillets']);
  ing('shrimp', 'Shrimp', 'protein', ['shellfish', 'pricey'], ['prawns', 'prawn', 'shrimps']);
  ing('canned_tuna', 'Canned tuna', 'protein', ['fish'], ['tuna', 'tinned tuna', 'tuna can']);
  ing('eggs', 'Eggs', 'protein', ['egg'], ['egg']);
  ing('tofu', 'Tofu', 'protein', ['soy'], ['firm tofu', 'extra firm tofu', 'bean curd']);
  ing('black_beans', 'Black beans (can)', 'protein', [], ['black beans', 'black bean', 'canned black beans', 'beans', 'kidney beans', 'pinto beans']);
  ing('chickpeas', 'Chickpeas (can)', 'protein', [], ['chickpea', 'garbanzo', 'garbanzo beans', 'canned chickpeas']);
  ing('red_lentils', 'Red lentils', 'protein', [], ['lentils', 'lentil', 'red lentil']);
  // Carbs
  ing('rice', 'Rice', 'carb', [], ['white rice', 'brown rice', 'jasmine rice', 'basmati', 'basmati rice', 'cooked rice', 'leftover rice']);
  ing('pasta', 'Pasta', 'carb', ['gluten'], ['spaghetti', 'penne', 'macaroni', 'linguine', 'fettuccine', 'rigatoni', 'fusilli', 'noodles', 'shells', 'bowtie']);
  ing('egg_noodles', 'Egg noodles', 'carb', ['gluten', 'egg'], ['egg noodle']);
  ing('ramen', 'Ramen packs', 'carb', ['gluten'], ['ramen', 'instant noodles', 'instant ramen', 'ramen noodles', 'top ramen'], { check: 'Ramen contains wheat. Seasoning packets can contain soy, fish or shellfish. Check the package.' });
  ing('bread', 'Bread', 'carb', ['gluten'], ['sliced bread', 'sourdough', 'toast', 'loaf', 'baguette']);
  ing('tortillas', 'Tortillas', 'carb', ['gluten'], ['tortilla', 'flour tortillas', 'wraps', 'wrap'], { check: 'Flour tortillas contain wheat. Check the package.' });
  ing('potatoes', 'Potatoes', 'carb', [], ['potato', 'russet', 'russets', 'yukon gold', 'baby potatoes', 'red potatoes']);
  ing('sweet_potatoes', 'Sweet potatoes', 'carb', [], ['sweet potato', 'yam', 'yams']);
  // Vegetables and fruit
  ing('onion', 'Onion', 'veg', [], ['onions', 'yellow onion', 'red onion', 'white onion']);
  ing('garlic', 'Garlic', 'veg', [], ['garlic clove', 'garlic cloves', 'clove of garlic']);
  ing('tomato', 'Fresh tomatoes', 'veg', [], ['tomato', 'tomatoes', 'cherry tomatoes', 'fresh tomato']);
  ing('canned_tomatoes', 'Canned tomatoes', 'veg', [], ['canned tomatoes', 'tinned tomatoes', 'diced tomatoes', 'crushed tomatoes', 'can of tomatoes', 'whole peeled tomatoes']);
  ing('bell_pepper', 'Bell pepper', 'veg', [], ['bell peppers', 'pepper', 'peppers', 'red pepper', 'green pepper', 'capsicum']);
  ing('spinach', 'Spinach', 'veg', [], ['baby spinach', 'greens']);
  ing('broccoli', 'Broccoli', 'veg', [], ['broccoli florets', 'brocoli']);
  ing('carrot', 'Carrots', 'veg', [], ['carrot', 'carrots', 'baby carrots']);
  ing('celery', 'Celery', 'veg', [], ['celery stalk', 'celery stalks']);
  ing('zucchini', 'Zucchini', 'veg', [], ['courgette', 'courgettes', 'zucchinis']);
  ing('mushrooms', 'Mushrooms', 'veg', [], ['mushroom', 'button mushrooms', 'cremini']);
  ing('frozen_peas', 'Peas', 'veg', [], ['peas', 'frozen peas', 'green peas']);
  ing('corn', 'Corn', 'veg', [], ['sweetcorn', 'frozen corn', 'canned corn', 'corn kernels']);
  ing('lettuce', 'Lettuce', 'veg', [], ['romaine', 'iceberg', 'salad leaves']);
  ing('cucumber', 'Cucumber', 'veg', [], ['cucumbers']);
  ing('avocado', 'Avocado', 'veg', [], ['avocados']);
  ing('lemon', 'Lemon', 'veg', [], ['lemons', 'lemon juice']);
  ing('lime', 'Lime', 'veg', [], ['limes', 'lime juice']);
  ing('green_onion', 'Green onions', 'veg', [], ['green onion', 'scallion', 'scallions', 'spring onion', 'spring onions']);
  ing('cilantro', 'Cilantro', 'veg', [], ['coriander leaves', 'fresh coriander']);
  ing('ginger', 'Ginger', 'veg', [], ['fresh ginger', 'ginger root']);
  // Dairy
  ing('cheese', 'Cheese', 'dairy', ['dairy'], ['cheddar', 'mozzarella', 'shredded cheese', 'monterey jack', 'swiss', 'american cheese', 'cheese slices']);
  ing('butter', 'Butter', 'dairy', ['dairy'], ['salted butter', 'unsalted butter']);
  ing('milk', 'Milk', 'dairy', ['dairy'], ['whole milk']);
  ing('yogurt', 'Plain yogurt', 'dairy', ['dairy'], ['yogurt', 'greek yogurt', 'yoghurt', 'sour cream']);
  ing('parmesan', 'Parmesan', 'dairy', ['dairy'], ['parmesan cheese', 'parmigiano', 'grated parmesan']);
  // Pantry
  ing('broth', 'Broth or stock', 'pantry', [], ['broth', 'stock', 'chicken broth', 'chicken stock', 'vegetable broth', 'vegetable stock', 'beef broth', 'bouillon'], { check: 'Some broths contain wheat, soy or celery. Check the package.' });
  ing('soy_sauce', 'Soy sauce', 'pantry', ['soy', 'gluten'], ['soy', 'shoyu']);
  ing('coconut_milk', 'Coconut milk (can)', 'pantry', [], ['coconut milk', 'coconut cream'], { check: 'If you have a tree nut allergy, ask your doctor about coconut and check the package.' });
  ing('peanut_butter', 'Peanut butter', 'pantry', ['peanut'], ['peanut butter', 'pb']);
  ing('honey', 'Honey', 'pantry', ['honey'], []);
  ing('salsa', 'Salsa', 'pantry', [], ['jar salsa', 'pico de gallo']);
  ing('olive_oil', 'Olive oil', 'pantry', [], ['extra virgin olive oil', 'evoo']);
  ing('sesame_oil', 'Sesame oil', 'pantry', ['sesame'], ['toasted sesame oil']);
  // Spices
  ing('chili_powder', 'Chili powder', 'spice', [], ['chilli powder', 'taco seasoning']);
  ing('cumin', 'Cumin', 'spice', [], ['ground cumin']);
  ing('paprika', 'Paprika', 'spice', [], ['smoked paprika']);
  ing('curry_powder', 'Curry powder', 'spice', [], ['curry', 'garam masala'], { check: 'Some curry blends contain mustard or wheat. Check the package.' });
  ing('italian_seasoning', 'Italian seasoning', 'spice', [], ['dried herbs', 'oregano', 'dried oregano', 'basil', 'dried basil', 'thyme', 'mixed herbs']);
  ing('red_pepper_flakes', 'Red pepper flakes', 'spice', [], ['chili flakes', 'chilli flakes', 'crushed red pepper']);
  // Basics most kitchens have (counted as "have" when the user says they have the basics)
  ing('salt', 'Salt', 'basic', ['staple'], ['sea salt', 'kosher salt']);
  ing('black_pepper', 'Black pepper', 'basic', ['staple'], ['pepper grinder', 'ground pepper']);
  ing('oil', 'Cooking oil', 'basic', ['staple'], ['vegetable oil', 'canola oil', 'cooking oil', 'oil', 'sunflower oil']);
  // Swap-only items (used in substitutions)
  ing('tamari', 'Gluten-free tamari', 'pantry', ['soy'], ['tamari'], { check: 'Check the label says gluten-free.' });
  ing('coconut_aminos', 'Coconut aminos', 'pantry', [], ['coconut aminos'], { check: 'Check the package for your allergens.' });
  ing('gf_pasta', 'Gluten-free pasta', 'carb', [], ['gluten free pasta', 'gluten-free pasta', 'rice pasta'], { check: 'Check the label says gluten-free.' });
  ing('corn_tortillas', 'Corn tortillas', 'carb', [], ['corn tortilla', 'corn tortillas'], { check: 'Corn tortillas are often wheat-free, but some are not. Check the label.' });
  ing('dairy_free_cheese', 'Dairy-free cheese', 'dairy', [], ['vegan cheese', 'dairy free cheese', 'dairy-free cheese'], { check: 'Dairy-free cheeses can contain soy or nuts. Check the package.' });
  ing('sunflower_butter', 'Sunflower seed butter', 'pantry', [], ['sunbutter', 'sunflower butter', 'sunflower seed butter'], { check: 'Some are made where peanuts are processed. Check the package.' });
  ing('gf_bread', 'Gluten-free bread', 'carb', [], ['gluten free bread', 'gluten-free bread'], { check: 'Check the label says gluten-free.' });

  var COMMON = ['chicken', 'ground_beef', 'eggs', 'tofu', 'black_beans', 'canned_tuna', 'rice', 'pasta', 'tortillas', 'bread', 'potatoes', 'onion', 'garlic', 'canned_tomatoes', 'bell_pepper', 'spinach', 'broccoli', 'carrot', 'zucchini', 'frozen_peas', 'lemon', 'cheese', 'butter', 'soy_sauce', 'broth', 'coconut_milk', 'chickpeas', 'sausage'];

  // Safe minimum internal temperatures: USDA FSIS "Safe Minimum Internal Temperature Chart" (checked Nov 20, 2026).
  var TEMPS = {
    poultry: { label: 'Chicken', text: 'Cook chicken to 165°F (74°C) inside, measured with a food thermometer in the thickest part.' },
    ground: { label: 'Ground meat', text: 'Cook ground beef to 160°F (71°C) inside, measured with a food thermometer.' },
    sausage: { label: 'Sausage', text: 'Raw pork or beef sausage: 160°F (71°C). Raw chicken or turkey sausage: 165°F (74°C). Precooked sausage just needs to be heated through.' },
    fish: { label: 'Fish', text: 'Cook fish to 145°F (63°C), or until the flesh is opaque and separates easily with a fork.' },
    shellfish: { label: 'Shrimp', text: 'Cook shrimp until the flesh is pearly and opaque.' },
    eggs: { label: 'Eggs', text: 'USDA advises cooking eggs until the yolk and white are firm.' },
    eggdish: { label: 'Egg dish', text: 'Egg dishes like frittata should reach 160°F (71°C) in the center.' },
    leftovers: { label: 'Leftovers', text: 'Reheat leftovers to 165°F (74°C).' }
  };
  var TEMP_SOURCE = { name: 'USDA FSIS Safe Minimum Internal Temperature Chart', url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart' };

  function r(o) { return o; }
  // ingredient line: [id, qty, unit, note, optional]
  var RECIPES = [
    r({ id: 'garlic-chicken-rice', name: 'Garlic butter chicken & rice', blurb: 'Golden chicken bites in garlic butter over fluffy rice.', serves: 4, time: 35, equipment: ['stovetop'], cost: '$$', art: { kind: 'bowl', colors: ['#F5E6C8', '#D9913C', '#3F8F4A'] },
      ing: [['chicken', 1.5, 'lb', 'boneless breasts or thighs'], ['rice', 1.5, 'cup'], ['garlic', 4, 'clove'], ['butter', 3, 'tbsp'], ['lemon', 1, '', 'for squeezing', true], ['broth', 3, 'cup', 'to cook the rice instead of water', true], ['salt', null, 'to taste'], ['black_pepper', null, 'to taste'], ['oil', 1, 'tbsp']],
      subs: [{ f: 'butter', u: 'olive_oil', n: 'A little less rich, still good.' }, { f: 'chicken', u: 'tofu', n: 'Press and cube it; fry 8 to 10 minutes until golden.' }],
      steps: [{ t: 'Rinse the rice, then cook it with water (or broth) the way the package says.', timer: 1080, tl: 'Rice' }, { t: 'Cut the chicken into bite-size pieces. Season with salt and pepper.' }, { t: 'Heat the oil in a large pan over medium-high heat. Cook the chicken, turning, until browned and cooked through.', timer: 420, tl: 'Chicken', temp: 'poultry', ti: 'chicken' }, { t: 'Turn the heat to medium. Add the butter and chopped garlic and stir until it smells good.', timer: 60, tl: 'Garlic' }, { t: 'Squeeze in the lemon if using. Spoon the chicken and garlic butter over the rice.' }] }),

    r({ id: 'egg-fried-rice', name: 'Egg fried rice', blurb: 'Fast, filling and great for leftover rice.', serves: 4, time: 20, equipment: ['stovetop'], cost: '$', art: { kind: 'bowl', colors: ['#F7E7B0', '#F2B53A', '#5BA35A'] },
      ing: [['rice', 3, 'cup', 'cooked, ideally from yesterday'], ['eggs', 3, ''], ['soy_sauce', 2, 'tbsp'], ['frozen_peas', 1, 'cup', '', true], ['carrot', 1, '', 'diced small', true], ['green_onion', 3, '', 'sliced', true], ['garlic', 2, 'clove', '', true], ['oil', 2, 'tbsp']],
      subs: [{ f: 'soy_sauce', u: 'tamari', n: 'Gluten-free option.', unsure: true }, { f: 'soy_sauce', u: 'coconut_aminos', n: 'Soy-free option; a little sweeter.', unsure: true }],
      steps: [{ t: 'No cooked rice? Cook it first, then spread it on a plate to cool for a few minutes.', timer: 1080, tl: 'Rice' }, { t: 'Heat the oil in a large pan over high heat. Add the garlic, carrot and peas and stir-fry.', timer: 180, tl: 'Veg' }, { t: 'Push everything to one side. Pour in the beaten eggs and scramble until fully set.', temp: 'eggs', ti: 'eggs' }, { t: 'Add the rice and stir-fry until hot all the way through.', timer: 240, tl: 'Rice fry' }, { t: 'Add the soy sauce and green onions. Taste and add more soy sauce if you like.' }] }),

    r({ id: 'aglio-olio', name: 'Garlic & olive oil spaghetti', blurb: 'Five ingredients, twenty minutes, very good.', serves: 4, time: 20, equipment: ['stovetop'], cost: '$', art: { kind: 'pasta', colors: ['#F3D98B', '#E9C46A', '#E0452B'] },
      ing: [['pasta', 1, 'lb', 'spaghetti is best'], ['garlic', 6, 'clove', 'thinly sliced'], ['olive_oil', 0.33, 'cup'], ['red_pepper_flakes', 0.5, 'tsp', '', true], ['parmesan', 0.5, 'cup', 'grated', true], ['lemon', 1, '', '', true], ['salt', null, 'for the water']],
      subs: [{ f: 'pasta', u: 'gf_pasta', n: 'Cook as the package says.', unsure: true }, { f: 'olive_oil', u: 'oil', n: 'Works; olive oil tastes better here.' }],
      steps: [{ t: 'Bring a big pot of salted water to a boil. Cook the pasta as the package says.', timer: 600, tl: 'Pasta' }, { t: 'While it cooks, warm the oil and garlic in a large pan over low heat until the garlic is pale gold. Do not let it brown.', timer: 210, tl: 'Garlic' }, { t: 'Stir in the pepper flakes if using.' }, { t: 'Save a cup of pasta water, then drain the pasta.' }, { t: 'Toss the pasta in the garlic oil with a splash of pasta water until glossy. Top with parmesan and a squeeze of lemon.' }] }),

    r({ id: 'tomato-pasta', name: 'Quick tomato pasta', blurb: 'A cozy pantry sauce that tastes like it took longer.', serves: 4, time: 30, equipment: ['stovetop'], cost: '$', art: { kind: 'pasta', colors: ['#F1D48A', '#E0452B', '#3F8F4A'] },
      ing: [['pasta', 1, 'lb'], ['canned_tomatoes', 28, 'oz'], ['onion', 1, '', 'chopped'], ['garlic', 3, 'clove'], ['italian_seasoning', 1, 'tsp', '', true], ['parmesan', 0.5, 'cup', '', true], ['spinach', 2, 'cup', '', true], ['oil', 2, 'tbsp'], ['salt', null, 'to taste']],
      subs: [{ f: 'pasta', u: 'gf_pasta', n: 'Cook as the package says.', unsure: true }, { f: 'onion', u: null, n: 'Leave it out; a little less sweet.' }],
      steps: [{ t: 'Heat the oil in a pan over medium heat. Cook the onion until soft.', timer: 300, tl: 'Onion' }, { t: 'Add the garlic and stir for about a minute.', timer: 60, tl: 'Garlic' }, { t: 'Add the tomatoes and seasoning. Simmer, breaking up the tomatoes with a spoon.', timer: 900, tl: 'Sauce' }, { t: 'Meanwhile, cook the pasta in salted water as the package says.', timer: 600, tl: 'Pasta' }, { t: 'Stir the spinach into the sauce until it wilts. Toss with the drained pasta and top with parmesan.' }] }),

    r({ id: 'beef-tacos', name: 'Beef tacos', blurb: 'Spiced beef, warm tortillas, whatever toppings you have.', serves: 4, time: 25, equipment: ['stovetop'], cost: '$$', art: { kind: 'taco', colors: ['#E9B872', '#8C4A2F', '#5BA35A'] },
      ing: [['ground_beef', 1, 'lb'], ['tortillas', 8, '', 'small'], ['onion', 1, '', 'chopped'], ['chili_powder', 1, 'tbsp'], ['cumin', 1, 'tsp'], ['cheese', 1, 'cup', 'shredded', true], ['lettuce', 2, 'cup', 'shredded', true], ['salsa', 0.5, 'cup', '', true], ['tomato', 1, '', 'diced', true], ['salt', null, 'to taste']],
      subs: [{ f: 'ground_beef', u: 'black_beans', n: 'Use 2 cans, drained; warm with the spices for 5 minutes.' }, { f: 'tortillas', u: 'corn_tortillas', n: 'Gluten-free option.', unsure: true }, { f: 'onion', u: null, n: 'Leave it out.' }],
      steps: [{ t: 'Cook the onion in a large pan over medium-high heat until it softens.', timer: 180, tl: 'Onion' }, { t: 'Add the beef. Break it up and cook until no pink is left.', timer: 480, tl: 'Beef', temp: 'ground', ti: 'ground_beef' }, { t: 'Spoon off extra fat. Stir in the chili powder, cumin, a pinch of salt and a splash of water. Cook 2 minutes.', timer: 120, tl: 'Spices' }, { t: 'Warm the tortillas in a dry pan or the microwave.' }, { t: 'Fill the tortillas and add the toppings you have.' }] }),

    r({ id: 'bean-quesadillas', name: 'Black bean quesadillas', blurb: 'Crispy outside, melty inside, done in 20 minutes.', serves: 4, time: 20, equipment: ['stovetop'], cost: '$', art: { kind: 'taco', colors: ['#EBC57A', '#2E2A24', '#F2B53A'] },
      ing: [['tortillas', 4, '', 'large'], ['black_beans', 1, 'can', '15 oz, drained'], ['cheese', 2, 'cup', 'shredded'], ['corn', 1, 'cup', '', true], ['salsa', 0.5, 'cup', 'for dipping', true], ['cumin', 0.5, 'tsp', '', true], ['green_onion', 2, '', '', true]],
      subs: [{ f: 'cheese', u: 'dairy_free_cheese', n: 'Melts less; use a lid to help.', unsure: true }, { f: 'tortillas', u: 'corn_tortillas', n: 'Use small ones and make more.', unsure: true }],
      steps: [{ t: 'Drain and rinse the beans. Mash about half of them with the cumin.' }, { t: 'Spread beans, cheese and corn over half of each tortilla, then fold it over.' }, { t: 'Cook in a dry pan over medium heat until golden and the cheese melts. Flip once.', timer: 180, tl: 'Side 1' }, { t: 'Cook the other side.', timer: 180, tl: 'Side 2' }, { t: 'Cut into wedges and serve with salsa.' }] }),

    r({ id: 'shakshuka', name: 'Eggs in spiced tomato sauce', blurb: 'Shakshuka-style eggs in one pan. Bread for dipping.', serves: 4, time: 30, equipment: ['stovetop'], cost: '$', art: { kind: 'skillet', colors: ['#D9452B', '#FFF3D6', '#F2B53A'] },
      ing: [['eggs', 6, ''], ['canned_tomatoes', 28, 'oz'], ['onion', 1, '', 'chopped'], ['garlic', 3, 'clove'], ['cumin', 1, 'tsp'], ['paprika', 1, 'tsp'], ['bell_pepper', 1, '', 'sliced', true], ['bread', 4, 'slice', 'for dipping', true], ['oil', 2, 'tbsp'], ['salt', null, 'to taste']],
      subs: [{ f: 'paprika', u: 'chili_powder', n: 'Use half as much; it is spicier.' }, { f: 'bread', u: 'gf_bread', n: 'Gluten-free option.', unsure: true }],
      steps: [{ t: 'Heat the oil in a wide pan over medium heat. Cook the onion and pepper until soft.', timer: 360, tl: 'Onion' }, { t: 'Add the garlic, cumin and paprika. Stir for a minute.', timer: 60, tl: 'Spices' }, { t: 'Add the tomatoes and a pinch of salt. Simmer until a little thicker.', timer: 600, tl: 'Sauce' }, { t: 'Make small wells in the sauce and crack an egg into each. Cover with a lid.', timer: 540, tl: 'Eggs', temp: 'eggs', ti: 'eggs' }, { t: 'Serve from the pan with bread for dipping.' }] }),

    r({ id: 'chickpea-curry', name: 'Chickpea & coconut curry', blurb: 'Creamy, mild and mostly from cans.', serves: 4, time: 30, equipment: ['stovetop'], cost: '$', art: { kind: 'bowl', colors: ['#F2E6C9', '#E8A33A', '#3F8F4A'] },
      ing: [['chickpeas', 2, 'can', '15 oz cans, drained'], ['coconut_milk', 1, 'can', 'about 13.5 oz'], ['canned_tomatoes', 15, 'oz'], ['onion', 1, '', 'chopped'], ['garlic', 3, 'clove'], ['curry_powder', 2, 'tbsp'], ['ginger', 1, 'tbsp', 'grated', true], ['spinach', 2, 'cup', '', true], ['rice', 1.5, 'cup', 'to serve', true], ['oil', 1, 'tbsp'], ['salt', null, 'to taste']],
      subs: [{ f: 'coconut_milk', u: 'yogurt', n: 'Stir in off the heat so it does not split.' }, { f: 'chickpeas', u: 'black_beans', n: 'Different, still good.' }],
      steps: [{ t: 'If serving with rice, start cooking it now.', timer: 1080, tl: 'Rice' }, { t: 'Heat the oil in a pot over medium heat. Cook the onion until soft.', timer: 300, tl: 'Onion' }, { t: 'Add the garlic, ginger and curry powder. Stir for a minute.', timer: 60, tl: 'Spices' }, { t: 'Add the tomatoes, coconut milk and chickpeas. Simmer, stirring now and then.', timer: 900, tl: 'Curry' }, { t: 'Stir in the spinach until it wilts. Taste, add salt, and serve with rice.' }] }),

    r({ id: 'tofu-stir-fry', name: 'Tofu & broccoli stir-fry', blurb: 'Crispy tofu, bright broccoli, glossy sauce.', serves: 4, time: 30, equipment: ['stovetop'], cost: '$', art: { kind: 'bowl', colors: ['#F4ECD8', '#E8C07A', '#3F8F4A'] },
      ing: [['tofu', 14, 'oz', 'firm'], ['broccoli', 1, 'head', 'cut into florets'], ['soy_sauce', 3, 'tbsp'], ['garlic', 3, 'clove'], ['rice', 1.5, 'cup'], ['ginger', 1, 'tbsp', 'grated', true], ['honey', 1, 'tbsp', '', true], ['oil', 2, 'tbsp']],
      subs: [{ f: 'tofu', u: 'chicken', n: 'Cut small; cook until done all the way through.' }, { f: 'soy_sauce', u: 'tamari', n: 'Gluten-free option.', unsure: true }],
      steps: [{ t: 'Start cooking the rice.', timer: 1080, tl: 'Rice' }, { t: 'Press the tofu with a towel to dry it, then cut into cubes.' }, { t: 'Fry the tofu in the oil over medium-high heat until golden on most sides. Move it to a plate.', timer: 540, tl: 'Tofu', temp: 'poultry', ti: 'chicken' }, { t: 'Add the broccoli and a splash of water to the pan. Cover and cook until bright green.', timer: 240, tl: 'Broccoli' }, { t: 'Add the garlic and ginger for a minute, then the tofu, soy sauce and honey. Toss and serve on rice.' }] }),

    r({ id: 'sausage-potato-tray', name: 'Sheet-pan sausage & potatoes', blurb: 'One tray, crispy potatoes, hardly any dishes.', serves: 4, time: 45, equipment: ['oven'], cost: '$$', art: { kind: 'sheet', colors: ['#E6B35A', '#9C4A32', '#E0452B'] },
      ing: [['sausage', 1, 'lb'], ['potatoes', 1.5, 'lb'], ['bell_pepper', 2, ''], ['onion', 1, ''], ['paprika', 1, 'tsp', '', true], ['oil', 3, 'tbsp'], ['salt', null, 'to taste'], ['black_pepper', null, 'to taste']],
      subs: [{ f: 'potatoes', u: 'sweet_potatoes', n: 'Check them a few minutes early.' }, { f: 'bell_pepper', u: 'zucchini', n: 'Add with the sausage.' }],
      steps: [{ t: 'Heat the oven to 425°F (220°C).' }, { t: 'Cut the potatoes into 1-inch pieces. Toss on a tray with oil, salt and paprika. Roast.', timer: 1200, tl: 'Potatoes' }, { t: 'Slice the sausage, pepper and onion. Add to the tray and toss.' }, { t: 'Roast until the potatoes are tender and the sausage is cooked.', timer: 1080, tl: 'Tray', temp: 'sausage', ti: 'sausage' }, { t: 'Season with pepper and serve straight from the tray.' }] }),

    r({ id: 'lemon-tuna-pasta', name: 'Lemon tuna pasta', blurb: 'Bright, quick and made from the cupboard.', serves: 4, time: 20, equipment: ['stovetop'], cost: '$', art: { kind: 'pasta', colors: ['#F3DC97', '#C9A26B', '#7BBF5E'] },
      ing: [['pasta', 0.75, 'lb'], ['canned_tuna', 2, 'can', 'drained'], ['lemon', 1, ''], ['garlic', 2, 'clove'], ['frozen_peas', 1, 'cup', '', true], ['red_pepper_flakes', 0.25, 'tsp', '', true], ['olive_oil', 3, 'tbsp'], ['salt', null, 'for the water']],
      subs: [{ f: 'olive_oil', u: 'oil', n: 'Works fine.' }, { f: 'pasta', u: 'gf_pasta', n: 'Gluten-free option.', unsure: true }],
      steps: [{ t: 'Cook the pasta in salted water. Add the peas for the last 2 minutes.', timer: 600, tl: 'Pasta' }, { t: 'Warm the olive oil and garlic in a pan over low heat for about a minute.', timer: 60, tl: 'Garlic' }, { t: 'Save a cup of pasta water and drain.' }, { t: 'Toss the pasta with the garlic oil, tuna, lemon zest and juice, and a splash of pasta water.' }] }),

    r({ id: 'microwave-potatoes', name: 'Microwave loaded potatoes', blurb: 'No oven, no stove. Ready in about 20 minutes.', serves: 4, time: 20, equipment: ['microwave'], cost: '$', art: { kind: 'potato', colors: ['#C99A5B', '#F2C94C', '#3F8F4A'] },
      ing: [['potatoes', 4, '', 'medium'], ['cheese', 1, 'cup', 'shredded'], ['broccoli', 2, 'cup', 'small florets', true], ['butter', 2, 'tbsp', '', true], ['yogurt', 0.5, 'cup', '', true], ['green_onion', 2, '', '', true], ['salt', null, 'to taste']],
      subs: [{ f: 'potatoes', u: 'sweet_potatoes', n: 'Same timing.' }, { f: 'cheese', u: 'black_beans', n: 'Warm a can of beans instead.' }],
      steps: [{ t: 'Scrub the potatoes and poke each one several times with a fork.' }, { t: 'Microwave on a plate, then turn them over.', timer: 300, tl: 'Side 1' }, { t: 'Microwave again until a knife goes in easily. Microwaves vary, so add time if needed.', timer: 300, tl: 'Side 2' }, { t: 'Microwave the broccoli in a covered bowl with a splash of water.', timer: 180, tl: 'Broccoli' }, { t: 'Split the potatoes. Add butter, cheese and broccoli, microwave 30 seconds to melt, then top with yogurt and green onion.' }] }),

    r({ id: 'chicken-noodle-soup', name: 'Chicken noodle soup', blurb: 'The classic, in about 40 minutes.', serves: 4, time: 40, equipment: ['stovetop'], cost: '$$', art: { kind: 'soup', colors: ['#F3D58A', '#E8A33A', '#3F8F4A'] },
      ing: [['chicken', 1, 'lb'], ['broth', 8, 'cup'], ['egg_noodles', 3, 'cup'], ['carrot', 2, ''], ['celery', 2, 'stalk'], ['onion', 1, ''], ['garlic', 2, 'clove', '', true], ['italian_seasoning', 1, 'tsp', '', true], ['oil', 1, 'tbsp'], ['salt', null, 'to taste']],
      subs: [{ f: 'egg_noodles', u: 'pasta', n: 'Use small shapes.' }, { f: 'celery', u: null, n: 'Leave it out.' }, { f: 'egg_noodles', u: 'rice', n: 'Add half a cup of rice and cook until tender.' }],
      steps: [{ t: 'Heat the oil in a big pot over medium heat. Cook the chopped onion, carrot and celery until softer.', timer: 360, tl: 'Veg' }, { t: 'Add the garlic and seasoning for a minute.', timer: 60, tl: 'Garlic' }, { t: 'Add the broth and the whole chicken pieces. Simmer, covered, until the chicken is cooked through.', timer: 1080, tl: 'Chicken', temp: 'poultry', ti: 'chicken' }, { t: 'Lift out the chicken and shred it with two forks.' }, { t: 'Add the noodles to the pot and cook until tender.', timer: 450, tl: 'Noodles' }, { t: 'Return the chicken, taste and add salt.' }] }),

    r({ id: 'red-lentil-soup', name: 'Red lentil soup', blurb: 'Cheap, hearty and naturally vegan.', serves: 4, time: 35, equipment: ['stovetop'], cost: '$', art: { kind: 'soup', colors: ['#E58A3A', '#F2B53A', '#3F8F4A'] },
      ing: [['red_lentils', 1.5, 'cup', 'rinsed'], ['onion', 1, ''], ['carrot', 2, ''], ['garlic', 3, 'clove'], ['cumin', 1, 'tsp'], ['broth', 6, 'cup', 'or water'], ['canned_tomatoes', 15, 'oz', '', true], ['lemon', 1, '', '', true], ['spinach', 2, 'cup', '', true], ['oil', 2, 'tbsp'], ['salt', null, 'to taste']],
      subs: [{ f: 'broth', u: null, n: 'Use water and a little more salt.' }],
      steps: [{ t: 'Heat the oil in a pot over medium heat. Cook the chopped onion and carrot until soft.', timer: 300, tl: 'Veg' }, { t: 'Add the garlic and cumin for a minute.', timer: 60, tl: 'Spices' }, { t: 'Add the lentils, broth and tomatoes. Simmer until the lentils fall apart.', timer: 1200, tl: 'Soup' }, { t: 'Mash some of it with a spoon or blend part of it for a creamier soup.' }, { t: 'Stir in the spinach, add a squeeze of lemon and salt to taste.' }] }),

    r({ id: 'lemon-garlic-shrimp', name: 'Lemon garlic shrimp pasta', blurb: 'Restaurant-feeling pasta in 20 minutes.', serves: 4, time: 20, equipment: ['stovetop'], cost: '$$$', art: { kind: 'pasta', colors: ['#F3DC97', '#F28C6A', '#3F8F4A'] },
      ing: [['pasta', 0.75, 'lb'], ['shrimp', 1, 'lb', 'peeled'], ['garlic', 4, 'clove'], ['butter', 3, 'tbsp'], ['lemon', 1, ''], ['red_pepper_flakes', 0.25, 'tsp', '', true], ['parmesan', 0.25, 'cup', '', true], ['oil', 1, 'tbsp'], ['salt', null, 'to taste']],
      subs: [{ f: 'shrimp', u: 'chicken', n: 'Cut small and cook through.' }, { f: 'butter', u: 'olive_oil', n: 'Dairy-free option.' }],
      steps: [{ t: 'Cook the pasta in salted water as the package says.', timer: 600, tl: 'Pasta' }, { t: 'Pat the shrimp dry and season with salt.' }, { t: 'Melt the butter with the oil in a pan over medium-high heat. Cook the shrimp, turning once.', timer: 180, tl: 'Shrimp', temp: 'shellfish', ti: 'shrimp' }, { t: 'Add the garlic and pepper flakes for a minute, then the lemon juice.', timer: 60, tl: 'Garlic' }, { t: 'Toss with the drained pasta and a splash of pasta water.' }] }),

    r({ id: 'peanut-noodles', name: 'Peanut noodles', blurb: 'Nutty, salty, a little sweet. Hot or cold.', serves: 4, time: 20, equipment: ['stovetop'], cost: '$', art: { kind: 'pasta', colors: ['#E4B66C', '#8C5A33', '#7BBF5E'] },
      ing: [['pasta', 0.75, 'lb', 'spaghetti or any noodles'], ['peanut_butter', 0.33, 'cup'], ['soy_sauce', 3, 'tbsp'], ['garlic', 1, 'clove', 'grated'], ['lime', 1, '', '', true], ['honey', 1, 'tbsp', '', true], ['cucumber', 1, '', 'sliced', true], ['green_onion', 2, '', '', true], ['carrot', 1, '', 'grated', true]],
      subs: [{ f: 'peanut_butter', u: 'sunflower_butter', n: 'Peanut-free option.', unsure: true }, { f: 'soy_sauce', u: 'tamari', n: 'Gluten-free option.', unsure: true }, { f: 'pasta', u: 'ramen', n: 'Skip the seasoning packets.' }],
      steps: [{ t: 'Cook the noodles as the package says.', timer: 540, tl: 'Noodles' }, { t: 'Whisk the peanut butter, soy sauce, garlic, lime juice and honey with a few spoons of hot water until smooth.' }, { t: 'Drain the noodles and toss with the sauce.' }, { t: 'Top with cucumber, carrot and green onion.' }] }),

    r({ id: 'grilled-cheese-soup', name: 'Grilled cheese & tomato soup', blurb: 'The comfort combo, from scratch in 30 minutes.', serves: 4, time: 30, equipment: ['stovetop'], cost: '$', art: { kind: 'sandwich', colors: ['#E9B65E', '#D9452B', '#F2C94C'] },
      ing: [['bread', 8, 'slice'], ['cheese', 8, 'slice'], ['butter', 3, 'tbsp'], ['canned_tomatoes', 28, 'oz'], ['onion', 1, ''], ['broth', 2, 'cup'], ['milk', 0.5, 'cup', '', true], ['garlic', 2, 'clove', '', true], ['oil', 1, 'tbsp']],
      subs: [{ f: 'bread', u: 'gf_bread', n: 'Gluten-free option.', unsure: true }, { f: 'broth', u: null, n: 'Use water and a little more salt.' }],
      steps: [{ t: 'Heat the oil in a pot over medium heat. Cook the chopped onion and garlic until soft.', timer: 300, tl: 'Onion' }, { t: 'Add the tomatoes and broth. Simmer.', timer: 900, tl: 'Soup' }, { t: 'Mash or blend the soup until smooth. Stir in the milk.' }, { t: 'Butter the outside of the bread, put cheese inside, and cook in a pan over medium heat.', timer: 180, tl: 'Side 1' }, { t: 'Flip and cook until golden and melted.', timer: 180, tl: 'Side 2' }] }),

    r({ id: 'burrito-bowls', name: 'Bean burrito bowls', blurb: 'Rice, beans and toppings; everyone builds their own.', serves: 4, time: 30, equipment: ['stovetop'], cost: '$', art: { kind: 'bowl', colors: ['#F4ECD8', '#2E2A24', '#F2B53A'] },
      ing: [['rice', 1.5, 'cup'], ['black_beans', 2, 'can', '15 oz cans'], ['corn', 1, 'cup'], ['salsa', 1, 'cup'], ['cumin', 1, 'tsp'], ['lime', 1, '', '', true], ['avocado', 1, '', '', true], ['cheese', 1, 'cup', '', true], ['lettuce', 2, 'cup', '', true], ['salt', null, 'to taste']],
      subs: [{ f: 'corn', u: 'bell_pepper', n: 'Cook it in a pan until soft.' }],
      steps: [{ t: 'Cook the rice. Squeeze in some lime juice when it is done.', timer: 1080, tl: 'Rice' }, { t: 'Warm the beans (with their liquid or a splash of water) and the cumin in a pot.', timer: 300, tl: 'Beans' }, { t: 'Warm the corn in a pan or the microwave.' }, { t: 'Build bowls: rice, beans, corn, salsa and any toppings you have.' }] }),

    r({ id: 'sweet-potato-tacos', name: 'Sweet potato & black bean tacos', blurb: 'Roasted, smoky and vegetarian.', serves: 4, time: 40, equipment: ['oven'], cost: '$', art: { kind: 'taco', colors: ['#EBC57A', '#E58A3A', '#3F8F4A'] },
      ing: [['sweet_potatoes', 2, '', 'medium'], ['black_beans', 1, 'can', '15 oz'], ['tortillas', 8, '', 'small'], ['chili_powder', 2, 'tsp'], ['cumin', 1, 'tsp'], ['lime', 1, '', '', true], ['avocado', 1, '', '', true], ['cilantro', 0.25, 'cup', '', true], ['salsa', 0.5, 'cup', '', true], ['oil', 2, 'tbsp'], ['salt', null, 'to taste']],
      subs: [{ f: 'sweet_potatoes', u: 'potatoes', n: 'Roast a few minutes longer.' }, { f: 'tortillas', u: 'corn_tortillas', n: 'Gluten-free option.', unsure: true }],
      steps: [{ t: 'Heat the oven to 425°F (220°C).' }, { t: 'Cut the sweet potatoes into small cubes. Toss with oil, chili powder, cumin and salt. Roast, turning halfway.', timer: 1500, tl: 'Roast' }, { t: 'Warm the beans in a small pot or the microwave.' }, { t: 'Warm the tortillas. Fill with sweet potato, beans and toppings.' }] }),

    r({ id: 'honey-soy-salmon', name: 'Honey soy salmon & rice', blurb: 'Sticky glaze, flaky fish, 30 minutes.', serves: 4, time: 30, equipment: ['oven', 'stovetop'], cost: '$$$', art: { kind: 'plate', colors: ['#F28C6A', '#F4ECD8', '#3F8F4A'] },
      ing: [['salmon', 4, 'fillet'], ['soy_sauce', 3, 'tbsp'], ['honey', 2, 'tbsp'], ['garlic', 2, 'clove'], ['rice', 1.5, 'cup'], ['broccoli', 1, 'head', '', true], ['green_onion', 2, '', '', true], ['sesame_oil', 1, 'tsp', '', true]],
      subs: [{ f: 'salmon', u: 'chicken', n: 'Bake about 20 to 25 minutes, until cooked through.' }, { f: 'soy_sauce', u: 'tamari', n: 'Gluten-free option.', unsure: true }],
      steps: [{ t: 'Start the rice. Heat the oven to 400°F (200°C).', timer: 1080, tl: 'Rice' }, { t: 'Mix the soy sauce, honey and grated garlic.' }, { t: 'Put the salmon on a lined tray (broccoli around it if using). Brush with the sauce.' }, { t: 'Bake until the salmon flakes easily.', timer: 720, tl: 'Salmon', temp: 'fish', ti: 'salmon' }, { t: 'Drizzle with sesame oil, add green onion and serve with rice.' }] }),

    r({ id: 'beef-broccoli-bowls', name: 'Ground beef & broccoli bowls', blurb: 'Takeout-style flavor, weeknight effort.', serves: 4, time: 25, equipment: ['stovetop'], cost: '$$', art: { kind: 'bowl', colors: ['#F4ECD8', '#7A3E2A', '#3F8F4A'] },
      ing: [['ground_beef', 1, 'lb'], ['broccoli', 1, 'head'], ['soy_sauce', 3, 'tbsp'], ['garlic', 3, 'clove'], ['rice', 1.5, 'cup'], ['ginger', 1, 'tbsp', '', true], ['honey', 1, 'tbsp', '', true], ['green_onion', 2, '', '', true], ['sesame_oil', 1, 'tsp', '', true]],
      subs: [{ f: 'ground_beef', u: 'tofu', n: 'Crumble it and fry until golden.' }, { f: 'soy_sauce', u: 'tamari', n: 'Gluten-free option.', unsure: true }],
      steps: [{ t: 'Start the rice.', timer: 1080, tl: 'Rice' }, { t: 'Brown the beef in a large pan over medium-high heat, breaking it up.', timer: 480, tl: 'Beef', temp: 'ground', ti: 'ground_beef' }, { t: 'Spoon off extra fat. Add the garlic and ginger for a minute.', timer: 60, tl: 'Garlic' }, { t: 'Add the broccoli and a splash of water. Cover until bright green.', timer: 240, tl: 'Broccoli' }, { t: 'Stir in the soy sauce and honey. Serve over rice with green onion and sesame oil.' }] }),

    r({ id: 'egg-ramen', name: 'Egg & greens ramen', blurb: 'Better instant noodles in 15 minutes.', serves: 4, time: 15, equipment: ['stovetop'], cost: '$', art: { kind: 'soup', colors: ['#F3D58A', '#FFF3D6', '#3F8F4A'] },
      ing: [['ramen', 4, 'pack'], ['eggs', 4, ''], ['spinach', 2, 'cup', '', true], ['mushrooms', 1, 'cup', 'sliced', true], ['green_onion', 2, '', '', true], ['soy_sauce', 1, 'tbsp', '', true]],
      subs: [{ f: 'spinach', u: 'broccoli', n: 'Cook it a couple of minutes longer.' }],
      steps: [{ t: 'Boil a pot of water. Lower the eggs in and cook until the yolks are firm.', timer: 600, tl: 'Eggs', temp: 'eggs', ti: 'eggs' }, { t: 'Move the eggs to cold water, then peel and halve them.' }, { t: 'Boil fresh water and cook the noodles.', timer: 180, tl: 'Noodles' }, { t: 'Add the mushrooms and spinach for the last minute.', timer: 60, tl: 'Greens' }, { t: 'Season with the packet or soy sauce. Top with eggs and green onion.' }] }),

    r({ id: 'zucchini-lemon-pasta', name: 'Zucchini lemon pasta', blurb: 'Light, fresh and done before the table is set.', serves: 4, time: 25, equipment: ['stovetop'], cost: '$', art: { kind: 'pasta', colors: ['#F3DC97', '#7BBF5E', '#F2C94C'] },
      ing: [['pasta', 1, 'lb'], ['zucchini', 2, ''], ['lemon', 1, ''], ['garlic', 2, 'clove'], ['parmesan', 0.5, 'cup', '', true], ['red_pepper_flakes', 0.25, 'tsp', '', true], ['olive_oil', 3, 'tbsp'], ['salt', null, 'to taste']],
      subs: [{ f: 'zucchini', u: 'spinach', n: 'Wilt it in at the end.' }, { f: 'pasta', u: 'gf_pasta', n: 'Gluten-free option.', unsure: true }, { f: 'olive_oil', u: 'oil', n: 'Works fine.' }],
      steps: [{ t: 'Cook the pasta in salted water.', timer: 600, tl: 'Pasta' }, { t: 'Slice the zucchini. Cook in the olive oil over medium-high heat until golden in spots.', timer: 330, tl: 'Zucchini' }, { t: 'Add the garlic for a minute.', timer: 60, tl: 'Garlic' }, { t: 'Toss with the drained pasta, lemon zest and juice, a splash of pasta water and the parmesan.' }] }),

    r({ id: 'beef-bean-chili', name: 'Weeknight beef & bean chili', blurb: 'Big pot, better tomorrow.', serves: 4, time: 45, equipment: ['stovetop'], cost: '$$', art: { kind: 'soup', colors: ['#B9472E', '#6B3A26', '#F2C94C'] },
      ing: [['ground_beef', 1, 'lb'], ['black_beans', 2, 'can', '15 oz cans, drained'], ['canned_tomatoes', 28, 'oz'], ['onion', 1, ''], ['chili_powder', 2, 'tbsp'], ['cumin', 1, 'tsp'], ['garlic', 2, 'clove'], ['bell_pepper', 1, '', '', true], ['cheese', 1, 'cup', 'to top', true], ['oil', 1, 'tbsp'], ['salt', null, 'to taste']],
      subs: [{ f: 'ground_beef', u: 'chickpeas', n: 'Add one more can of beans or chickpeas instead.' }],
      steps: [{ t: 'Heat the oil in a big pot. Cook the chopped onion and pepper until soft.', timer: 300, tl: 'Onion' }, { t: 'Add the beef. Break it up and cook until no pink is left.', timer: 480, tl: 'Beef', temp: 'ground', ti: 'ground_beef' }, { t: 'Add the garlic, chili powder and cumin for a minute.', timer: 60, tl: 'Spices' }, { t: 'Add the tomatoes and beans. Simmer, stirring now and then.', timer: 1500, tl: 'Chili' }, { t: 'Taste, add salt, and top with cheese.' }] }),

    r({ id: 'spinach-frittata', name: 'Spinach & cheese frittata', blurb: 'Eggs for dinner, done properly.', serves: 4, time: 30, equipment: ['stovetop', 'oven'], cost: '$', art: { kind: 'skillet', colors: ['#F2C94C', '#FFF3D6', '#3F8F4A'] },
      ing: [['eggs', 8, ''], ['spinach', 3, 'cup'], ['onion', 1, ''], ['cheese', 1, 'cup', 'shredded'], ['milk', 0.25, 'cup', '', true], ['bell_pepper', 1, '', '', true], ['mushrooms', 1, 'cup', '', true], ['oil', 1, 'tbsp'], ['salt', null, 'to taste']],
      subs: [{ f: 'cheese', u: null, n: 'Leave it out for dairy-free.' }, { f: 'spinach', u: 'broccoli', n: 'Chop small and cook a few minutes first.' }],
      steps: [{ t: 'Heat the oven to 400°F (200°C).' }, { t: 'In an oven-safe pan, cook the onion (and pepper or mushrooms) in the oil until soft.', timer: 300, tl: 'Veg' }, { t: 'Add the spinach and stir until wilted.', timer: 60, tl: 'Spinach' }, { t: 'Whisk the eggs, milk and a pinch of salt. Pour into the pan and scatter the cheese. Cook until the edges set.', timer: 180, tl: 'Set edges' }, { t: 'Bake until the center is set.', timer: 720, tl: 'Bake', temp: 'eggdish', ti: 'eggs' }, { t: 'Let it rest a few minutes, then cut into wedges.' }] }),

    r({ id: 'sheet-pan-chicken', name: 'Sheet-pan chicken & vegetables', blurb: 'Roast everything together; dinner looks after itself.', serves: 4, time: 45, equipment: ['oven'], cost: '$$', art: { kind: 'sheet', colors: ['#E6B35A', '#D9913C', '#3F8F4A'] },
      ing: [['chicken', 1.5, 'lb', 'thighs are best'], ['potatoes', 1, 'lb'], ['carrot', 3, ''], ['onion', 1, ''], ['italian_seasoning', 2, 'tsp', '', true], ['garlic', 3, 'clove', '', true], ['oil', 3, 'tbsp'], ['salt', null, 'to taste'], ['black_pepper', null, 'to taste']],
      subs: [{ f: 'potatoes', u: 'sweet_potatoes', n: 'Same timing.' }, { f: 'carrot', u: 'broccoli', n: 'Add with the chicken.' }],
      steps: [{ t: 'Heat the oven to 425°F (220°C).' }, { t: 'Cut the potatoes and carrots into chunks. Toss with oil, salt and seasoning on a tray. Roast.', timer: 900, tl: 'Veg' }, { t: 'Season the chicken. Add it to the tray with the onion and garlic.' }, { t: 'Roast until the chicken is cooked through and the vegetables are tender.', timer: 1380, tl: 'Chicken', temp: 'poultry', ti: 'chicken' }, { t: 'Rest the chicken 5 minutes before serving.' }] }),

    r({ id: 'microwave-burritos', name: 'Microwave bean & cheese burritos', blurb: 'No stove needed. Good for a dorm or a busy night.', serves: 4, time: 10, equipment: ['microwave'], cost: '$', art: { kind: 'taco', colors: ['#EBC57A', '#2E2A24', '#E0452B'] },
      ing: [['tortillas', 4, '', 'large'], ['black_beans', 1, 'can', '15 oz, drained'], ['cheese', 1, 'cup', 'shredded'], ['salsa', 0.5, 'cup', '', true], ['rice', 1, 'cup', 'already cooked', true], ['cumin', 0.5, 'tsp', '', true]],
      subs: [{ f: 'cheese', u: 'dairy_free_cheese', n: 'Dairy-free option.', unsure: true }, { f: 'tortillas', u: 'corn_tortillas', n: 'Use small ones and roll them like taquitos.', unsure: true }],
      steps: [{ t: 'Mash the beans lightly with the cumin.' }, { t: 'Spread beans, rice and cheese down the middle of each tortilla. Roll it up.' }, { t: 'Microwave on a plate, covered with a damp paper towel, until hot in the middle.', timer: 90, tl: 'Burritos' }, { t: 'Let them stand a minute (the filling is hot), then serve with salsa.' }] })
  ];

  var data = { I: I, COMMON: COMMON, RECIPES: RECIPES, TEMPS: TEMPS, TEMP_SOURCE: TEMP_SOURCE, ALLERGENS: ['dairy', 'egg', 'gluten', 'soy', 'peanut', 'treenut', 'fish', 'shellfish', 'sesame'], EQUIPMENT: ['stovetop', 'oven', 'microwave'] };
  if (typeof module !== 'undefined' && module.exports) module.exports = data; else root.DSData = data;
})(this);

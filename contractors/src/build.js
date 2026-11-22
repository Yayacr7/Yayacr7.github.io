// Builds one self-contained demo site per contractor: contractors/<slug>/index.html
// Run: node contractors/src/build.js
// Only facts given by Yaya are used. Unknown details stay as [placeholders].
const fs = require('fs');
const path = require('path');

const AREA = ['Blaine', 'Coon Rapids', 'Andover', 'Ham Lake', 'Anoka', 'Ramsey', 'Champlin', 'Maple Grove'];

const S = {
  driveway: ['Driveways', 'New concrete driveways and full tear-out and replace of cracked or sunken ones.'],
  patio: ['Patios', 'Backyard patios poured to the size and shape you want, ready for grills and furniture.'],
  sidewalk: ['Sidewalks', 'Front walks and side paths that give you a solid, even surface to walk on.'],
  steps: ['Steps', 'Concrete front and back steps, replaced or built new.'],
  garage: ['Garage floors', 'Garage slabs poured to hold cars, tools and Minnesota winters.'],
  flatwork: ['Concrete flatwork', 'Driveways, patios, walks and slabs for homes and properties.'],
};

const businesses = [
  {
    slug: 'madsen-concrete', name: 'Madsen Concrete Services', city: 'Circle Pines, MN', owner: 'Tom Madsen',
    phone: '(612) 508-2484', trade: 'Concrete',
    headline: 'Concrete driveways, patios and steps in Circle Pines',
    heroNote: 'Sample photo',
    sub: 'Driveways, patios, sidewalks, steps and garage floors for homes across the north metro.',
    services: [S.driveway, S.patio, S.sidewalk, S.steps, S.garage],
    theme: { font: 'Oswald', fontW: '500;700', body: 'Inter', bg: '#F4F3F0', surface: '#FFFFFF', ink: '#1E1F21', muted: '#5B5D61', accent: '#E8590C', accentInk: '#FFFFFF', dark: '#25272A', grad: 'linear-gradient(135deg,#1c1d1f 0%,#3a3c40 55%,#5a3a26 100%)', radius: '4px', upper: true, align: 'left', card: 'bar' },
  },
  {
    slug: 'k-dewall-construction', name: 'K. DeWall Construction', city: 'Coon Rapids, MN', owner: null,
    phone: '(612) 750-9172', trade: 'Remodeling',
    headline: 'Kitchen, bath and flooring remodels in Coon Rapids',
    sub: 'Update the rooms you use every day, planned and built with you.',
    services: [
      ['Kitchen remodels', 'New cabinets, counters, backsplash and layout changes for a kitchen that works for you.'],
      ['Bathroom remodels', 'Showers, tubs, vanities, tile and fixtures, from a refresh to a full remodel.'],
      ['Flooring', 'New floors installed throughout the home: tile, vinyl plank, laminate or wood.'],
      ['Tile work', 'Shower walls, backsplashes and floors set clean and straight.'],
      ['Small updates', 'Fixtures, trim and finishing touches that make a room feel new.'],
    ],
    theme: { font: 'Playfair Display', fontW: '600;700', body: 'Lato', bodyW: '400;700', bg: '#FAF7F2', surface: '#FFFFFF', ink: '#1F2A3A', muted: '#5E6673', accent: '#A8793A', accentInk: '#FFFFFF', dark: '#1F2A3A', grad: 'linear-gradient(135deg,#1b2433 0%,#2d3b52 60%,#6b5132 100%)', radius: '14px', upper: false, align: 'center', card: 'soft' },
  },
  {
    slug: 'bigfoot-home-works', name: 'Bigfoot Home Works', city: 'Coon Rapids, MN', owner: null,
    phone: '(763) 334-3775', trade: 'General contracting',
    headline: 'General contracting and home remodeling in Coon Rapids',
    sub: 'One call for the projects around your house, big or small.',
    services: [
      ['Home remodeling', 'Kitchens, bathrooms, basements and living spaces updated to fit how you live.'],
      ['General contracting', 'We manage the project from plan to finish so you have one person to call.'],
      ['Basement finishing', 'Turn unused basement space into a family room, office or guest room.'],
      ['Repairs and updates', 'Drywall, doors, trim and the repairs that keep piling up.'],
      ['Additions', 'More room for a growing household without moving.'],
    ],
    theme: { font: 'Roboto Slab', fontW: '600;800', body: 'Source Sans 3', bg: '#F3F1EA', surface: '#FFFFFF', ink: '#1F2B22', muted: '#57625A', accent: '#2F6B3F', accentInk: '#FFFFFF', dark: '#1D2A21', accent2: '#C79A57', grad: 'linear-gradient(140deg,#16241a 0%,#2b4a33 55%,#6d5734 100%)', radius: '10px', upper: false, align: 'left', card: 'top' },
  },
  {
    slug: 'cnc-construction', name: 'CNC Construction', city: 'East Bethel, MN', owner: null,
    phone: '(612) 789-2155', trade: 'Concrete and construction',
    headline: 'Concrete and construction in East Bethel',
    sub: 'Concrete work and construction projects for homes and properties in the north metro.',
    services: [
      S.flatwork,
      ['Foundations and footings', 'Footings, walls and slabs for garages, additions and outbuildings.'],
      ['Garage and shed slabs', 'Level slabs ready for a garage, pole shed or storage building.'],
      ['Steps and walkways', 'Steps and walks that are solid underfoot.'],
      ['Construction projects', 'Building projects from the ground up. Call to talk through yours.'],
    ],
    theme: { font: 'Barlow Condensed', fontW: '600;800', body: 'Barlow', bg: '#F2F2F0', surface: '#FFFFFF', ink: '#111111', muted: '#55575A', accent: '#F5B700', accentInk: '#111111', dark: '#141414', grad: 'linear-gradient(135deg,#0d0d0d 0%,#262626 60%,#4a3b06 100%)', radius: '0px', upper: true, align: 'left', card: 'stripe' },
  },
  {
    slug: 'willet-remodeling', name: 'Willet Remodeling & Construction', city: 'Cedar, MN', cityLong: 'Cedar, Minnesota', owner: null,
    phone: '(763) 355-7992', trade: 'Remodeling and construction', minnesota: true,
    headline: 'Minnesota remodeling and construction, based in Cedar, MN',
    sub: 'A Minnesota company serving Cedar and the north Twin Cities metro.',
    services: [
      ['Home remodeling', 'Kitchens, bathrooms and living spaces rebuilt for the way you live now.'],
      ['Basements', 'Finished basements with the rooms you need.'],
      ['Additions', 'Add space to the home you already have.'],
      ['Construction', 'New construction projects. Call to talk through the details.'],
      ['Repairs and updates', 'Doors, trim, drywall and the jobs on your list.'],
    ],
    theme: { font: 'Merriweather', fontW: '700;900', body: 'Open Sans', bg: '#F1F5F8', surface: '#FFFFFF', ink: '#0F2A3D', muted: '#4F6475', accent: '#1F6FA8', accentInk: '#FFFFFF', dark: '#0F2A3D', accent2: '#2E7D5B', grad: 'linear-gradient(150deg,#0b2233 0%,#174463 55%,#1f5a46 100%)', radius: '8px', upper: false, align: 'center', card: 'soft' },
  },
  {
    slug: 'archer-carpentry', name: 'Archer Carpentry', city: 'Ham Lake, MN', owner: null,
    phone: '(763) 458-6356', trade: 'Carpentry',
    headline: 'Carpentry, windows, doors and trim in Ham Lake',
    sub: 'Finish carpentry and installs done with care, inside and out.',
    services: [
      ['Window installation', 'New and replacement windows fitted and trimmed out.'],
      ['Door installation', 'Entry, patio and interior doors hung so they open and close right.'],
      ['Trim and molding', 'Baseboard, casing and crown molding that finishes a room.'],
      ['Finish carpentry', 'Built-ins, shelving and the detail work that shows.'],
      ['Carpentry repairs', 'Rotted trim, sticking doors and worn woodwork fixed.'],
    ],
    theme: { font: 'Cormorant Garamond', fontW: '600;700', body: 'Work Sans', bg: '#F7F2EA', surface: '#FFFDF9', ink: '#2B1E14', muted: '#6A5A4C', accent: '#7A4A23', accentInk: '#FFFFFF', dark: '#2B1E14', grad: 'linear-gradient(135deg,#21160e 0%,#4a3020 55%,#8a6236 100%)', radius: '2px', upper: false, align: 'left', card: 'line' },
  },
  {
    slug: 'sm-boen-construction', name: 'S.M. Boen Construction', city: 'Oak Grove, MN', owner: null,
    phone: '(612) 741-2004', trade: 'Excavating and concrete',
    headline: 'Excavating and concrete in Oak Grove',
    sub: 'Site work and concrete for homes, garages and properties in the north metro.',
    services: [
      ['Excavating', 'Digging for foundations, additions, garages and outbuildings.'],
      ['Site prep and grading', 'Clearing and leveling ground so a project starts on a good base.'],
      ['Concrete', 'Driveways, slabs, patios and walks.'],
      ['Foundations', 'Footings and foundations for new construction and additions.'],
      ['Trenching', 'Trenches for water, power and drainage lines.'],
      ['Driveway prep', 'Base work and grading before a new driveway goes in.'],
    ],
    theme: { font: 'Archivo Black', fontW: '400', body: 'Archivo', bg: '#F3EEE8', surface: '#FFFFFF', ink: '#2A1D15', muted: '#66574B', accent: '#C2410C', accentInk: '#FFFFFF', dark: '#2A1D15', grad: 'linear-gradient(135deg,#1f150f 0%,#4a2f1e 50%,#7c3a12 100%)', radius: '6px', upper: true, align: 'left', card: 'bar' },
  },
  {
    slug: 'dunrite-concrete', name: 'Dunrite Concrete', city: 'Ramsey and Champlin, MN', cityShort: 'Ramsey and Champlin', owner: null,
    phone: '(612) 325-7930', trade: 'Concrete',
    headline: 'Concrete work in Ramsey and Champlin',
    sub: 'Driveways, patios, walks and slabs for homes in the north metro.',
    services: [S.driveway, S.patio, S.sidewalk, S.steps, ['Slabs', 'Garage, shed and pad slabs poured level.']],
    theme: { font: 'Montserrat', fontW: '700;800', body: 'Nunito Sans', bg: '#EEF2F6', surface: '#FFFFFF', ink: '#14202E', muted: '#536273', accent: '#2563EB', accentInk: '#FFFFFF', dark: '#14202E', grad: 'linear-gradient(135deg,#0f1825 0%,#26364b 55%,#3b5f8f 100%)', radius: '16px', upper: false, align: 'center', card: 'top' },
  },
  {
    slug: 'patriot-builders', name: 'Patriot Builders', city: 'Ham Lake, MN', owner: null,
    phone: '(763) 434-1702', trade: 'Building and remodeling',
    headline: 'Building and remodeling in Ham Lake',
    sub: 'New builds, additions and remodels for homes in the north metro.',
    services: [
      ['Home building', 'New homes and buildings. Call to talk through your plans.'],
      ['Remodeling', 'Kitchens, bathrooms and living spaces updated.'],
      ['Additions', 'More room added to the home you have.'],
      ['Garages', 'Attached and detached garages.'],
      ['Basement finishing', 'Unused basement space turned into rooms you will use.'],
    ],
    theme: { font: 'Bebas Neue', fontW: '400', body: 'Roboto', bodyW: '400;500;700', bg: '#F4F5F8', surface: '#FFFFFF', ink: '#13203B', muted: '#535D72', accent: '#B91C1C', accentInk: '#FFFFFF', dark: '#13203B', grad: 'linear-gradient(135deg,#0c1529 0%,#1b2c52 60%,#5a1620 100%)', radius: '6px', upper: true, align: 'center', card: 'stripe', bigHead: true },
  },
  {
    slug: 'williams-construction', name: 'Williams Construction', city: 'Anoka, MN', owner: null,
    phone: '(763) 412-2133', trade: 'Decks and trim carpentry',
    headline: 'Decks and trim carpentry in Anoka',
    sub: 'Outdoor decks and indoor trim work for homes across the north metro.',
    services: [
      ['New decks', 'Decks built for grilling, sitting out and summer evenings.'],
      ['Deck rebuilds', 'Worn or unsafe decks torn out and rebuilt.'],
      ['Railings and stairs', 'Deck stairs and railings that are solid to hold.'],
      ['Trim carpentry', 'Baseboard, door and window casing and crown molding.'],
      ['Repairs', 'Rotted boards, loose railings and worn trim replaced.'],
    ],
    theme: { font: 'DM Serif Display', fontW: '400', body: 'DM Sans', bg: '#F5F1EC', surface: '#FFFFFF', ink: '#14302F', muted: '#55625F', accent: '#B5622B', accentInk: '#FFFFFF', dark: '#14302F', grad: 'linear-gradient(140deg,#0e2423 0%,#1f4441 55%,#7a4421 100%)', radius: '12px', upper: false, align: 'left', card: 'line' },
  },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tel = (p) => '+1' + p.replace(/\D/g, '');
const ph = (s) => `<span class="ph">${esc(s)}</span>`; // marked placeholder

function page(b) {
  const t = b.theme;
  const cityShort = b.cityShort || b.city.replace(/, MN$/, '');
  const cityLong = b.cityLong || b.city;
  const fam = (f, w) => `family=${f.replace(/ /g, '+')}:wght@${w}`;
  const fonts = `https://fonts.googleapis.com/css2?${fam(t.font, t.fontW)}&${fam(t.body, t.bodyW || '400;600;700')}&display=swap`;
  const svc = b.services.map((s, i) => `
        <article class="card">
          <span class="num">${String(i + 1).padStart(2, '0')}</span>
          <h3>${esc(s[0])}</h3>
          <p>${esc(s[1])}</p>
        </article>`).join('');
  const opts = b.services.map((s) => `<option>${esc(s[0])}</option>`).join('');
  const gal = [1, 2, 3, 4, 5, 6].map((n) => `
        <figure class="shot" data-src="images/gallery${n}.jpg" style="background-image:url('images/gallery${n}.jpg'),var(--grad)">
          <figcaption>Project photo ${n}<small>Add images/gallery${n}.jpg</small></figcaption>
        </figure>`).join('');
  const owner = b.owner ? esc(b.owner) : ph('[Owner name]');
  const desc = `${b.name}: ${b.trade.toLowerCase()} in ${cityLong}. Call ${b.phone} or book an estimate online.`;
  const mnBadge = b.minnesota ? `<p class="mn">Cedar, Minnesota &middot; Twin Cities north metro</p>` : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(b.name)} | ${esc(b.trade)} in ${esc(cityLong)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="${t.dark}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fonts}">
<style>
:root{
  --bg:${t.bg};--surface:${t.surface};--ink:${t.ink};--muted:${t.muted};
  --accent:${t.accent};--accent-ink:${t.accentInk};--dark:${t.dark};--accent2:${t.accent2 || t.accent};
  --grad:${t.grad};--r:${t.radius};
  --head:'${t.font}',Georgia,serif;--body:'${t.body}',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{transition:none!important}}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 var(--body)}
img{max-width:100%}
a{color:inherit}
h1,h2,h3{font-family:var(--head);line-height:1.1;margin:0 0 .5em;${t.upper ? 'text-transform:uppercase;letter-spacing:.02em;' : ''}}
h2{font-size:clamp(1.8rem,4vw,2.6rem)}
h3{font-size:1.25rem}
.wrap{max-width:1120px;margin:0 auto;padding:0 20px}
.skip{position:absolute;left:-999px;top:8px;background:var(--surface);padding:8px 12px;z-index:99}
.skip:focus{left:8px}
:focus-visible{outline:3px solid var(--accent);outline-offset:2px}

/* Top bar */
.top{position:absolute;inset:0 0 auto 0;z-index:5;color:#fff}
.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:72px}
.brand{font-family:var(--head);font-weight:700;font-size:1.15rem;text-decoration:none;${t.upper ? 'text-transform:uppercase;letter-spacing:.04em;' : ''}}
.nav{display:flex;gap:22px;align-items:center}
.nav a{text-decoration:none;opacity:.9;font-weight:600;font-size:.95rem}
.nav a:hover{opacity:1;text-decoration:underline}
.nav .pill{border:1.5px solid rgba(255,255,255,.7);padding:8px 14px;border-radius:999px;opacity:1}

/* Hero */
.hero{position:relative;min-height:min(92vh,760px);display:flex;align-items:center;color:#fff;
  background-color:var(--dark);background-image:url('images/hero.jpg'),var(--grad);background-size:cover;background-position:center}
.hero::before{content:"";position:absolute;inset:0;background:${t.align === 'center' ? 'radial-gradient(ellipse at center,rgba(0,0,0,.45),rgba(0,0,0,.25) 70%),' : 'linear-gradient(90deg,rgba(0,0,0,.6) 0%,rgba(0,0,0,.3) 55%,rgba(0,0,0,0) 100%),'}linear-gradient(180deg,rgba(0,0,0,.55) 0%,rgba(0,0,0,.3) 40%,rgba(0,0,0,.7) 100%)}
.photo-note{position:absolute;right:12px;bottom:10px;z-index:1;font-size:.72rem;color:rgba(255,255,255,.85);background:rgba(0,0,0,.45);padding:3px 8px;border-radius:4px}
.hero .wrap{position:relative;padding-top:110px;padding-bottom:70px;width:100%;${t.align === 'center' ? 'text-align:center;' : ''}}
.kicker{display:inline-block;font-weight:700;font-size:.85rem;letter-spacing:.14em;text-transform:uppercase;color:#fff;
  background:var(--accent);color:var(--accent-ink);padding:6px 12px;border-radius:var(--r);margin-bottom:18px}
.hero h1{font-size:clamp(2.4rem,7vw,${t.bigHead ? '5.6rem' : '4.4rem'});max-width:${t.align === 'center' ? 'none' : '14ch'};margin-bottom:.25em}
.hero .lead{font-size:clamp(1.15rem,2.4vw,1.5rem);font-weight:600;max-width:36ch;margin:0 ${t.align === 'center' ? 'auto' : '0'} .5em}
.hero .sub{opacity:.9;max-width:52ch;margin:0 ${t.align === 'center' ? 'auto' : '0'} 28px}
.mn{font-family:var(--head);font-size:clamp(1.2rem,3vw,1.7rem);font-weight:700;margin:0 0 .6em;color:#fff}
.mn::before{content:"";display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--accent2);margin-right:10px;vertical-align:middle}
.btns{display:flex;flex-wrap:wrap;gap:14px;${t.align === 'center' ? 'justify-content:center;' : ''}}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:56px;padding:0 28px;border-radius:var(--r);
  font:700 1.1rem/1 var(--body);text-decoration:none;border:2px solid transparent;cursor:pointer;transition:transform .15s,filter .15s}
.btn:hover{transform:translateY(-1px);filter:brightness(1.07)}
.btn-main{background:var(--accent);color:var(--accent-ink)}
.btn-ghost{background:rgba(255,255,255,.08);color:#fff;border-color:rgba(255,255,255,.85);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
.btn svg{width:20px;height:20px;flex:none}

/* Sections */
section{padding:84px 0}
.eyebrow{color:var(--accent);font-weight:700;letter-spacing:.14em;text-transform:uppercase;font-size:.8rem;margin:0 0 8px}
.intro{color:var(--muted);max-width:60ch;margin:0 0 36px}
.grid{display:grid;gap:20px;grid-template-columns:repeat(3,1fr)}@media (max-width:900px){.grid{grid-template-columns:1fr 1fr}}@media (max-width:560px){.grid{grid-template-columns:1fr}}
.card{background:var(--surface);border-radius:var(--r);padding:26px 24px;position:relative;box-shadow:0 1px 2px rgba(0,0,0,.05),0 6px 20px rgba(0,0,0,.05)}
.card p{color:var(--muted);margin:0}
.num{display:inline-block;font:700 .85rem/1 var(--body);color:var(--accent);margin-bottom:14px;letter-spacing:.08em}
${{
    bar: '.card{border-left:5px solid var(--accent)}',
    soft: '.card{border:1px solid rgba(0,0,0,.06);text-align:center}.card .num{background:var(--accent);color:var(--accent-ink);width:40px;height:40px;border-radius:50%;display:inline-grid;place-items:center}',
    top: '.card{border-top:5px solid var(--accent)}.card .num{font-size:2rem;font-family:var(--head);opacity:.85}',
    stripe: '.card{box-shadow:none;border:2px solid var(--ink)}.card .num{background:var(--accent);color:var(--accent-ink);padding:6px 8px}',
    line: '.card{box-shadow:none;background:transparent;border-top:1.5px solid var(--ink);border-radius:0;padding-left:0;padding-right:0}.card .num{font-family:var(--head);font-size:1.6rem;font-style:italic}',
  }[t.card]}

.alt{background:var(--surface)}
.gallery{display:grid;gap:14px;grid-template-columns:repeat(3,1fr)}
.shot{margin:0;aspect-ratio:4/3;border-radius:var(--r);background-color:var(--dark);background-size:cover;background-position:center;
  position:relative;overflow:hidden;display:flex;align-items:flex-end}
.shot figcaption{position:relative;width:100%;padding:14px 16px;color:#fff;font-weight:700;background:linear-gradient(0deg,rgba(0,0,0,.55),transparent)}
.shot figcaption small{display:block;font-weight:400;opacity:.8;font-size:.8rem}
.shot.loaded figcaption{display:none}

.reviews{margin-top:36px;border:2px dashed rgba(0,0,0,.2);border-radius:var(--r);padding:26px;text-align:center;color:var(--muted)}
.reviews strong{display:block;color:var(--ink);font-family:var(--head);font-size:1.2rem;margin-bottom:4px}

/* Booking */
.book{display:grid;grid-template-columns:1fr 1.4fr;gap:40px;align-items:start}
.form{background:var(--surface);border-radius:var(--r);padding:28px;box-shadow:0 10px 30px rgba(0,0,0,.08)}
.row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
label{display:block;font-weight:700;font-size:.92rem;margin:0 0 14px}
label span{color:var(--muted);font-weight:400}
input,select,textarea{display:block;width:100%;margin-top:6px;padding:13px 14px;font:16px/1.3 var(--body);color:var(--ink);
  background:var(--bg);border:1.5px solid rgba(0,0,0,.15);border-radius:calc(var(--r) / 2 + 2px)}
input:focus,select:focus,textarea:focus{border-color:var(--accent);outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 25%,transparent)}
textarea{min-height:96px;resize:vertical}
.form .btn{width:100%;margin-top:6px}
.err{color:#B42318;font-size:.9rem;margin:8px 0 0;min-height:1.2em}
.note{font-size:.82rem;color:var(--muted);margin:12px 0 0}
.thanks{display:none;text-align:center;padding:30px 10px}
.thanks h3{font-size:1.6rem}
.form.done form{display:none}
.form.done .thanks{display:block}
.check{width:64px;height:64px;border-radius:50%;background:var(--accent);color:var(--accent-ink);display:grid;place-items:center;margin:0 auto 14px}

/* Contact */
.contact{background:var(--dark);color:#fff;border-radius:var(--r);padding:40px;display:grid;grid-template-columns:1fr 1fr;gap:28px}
.contact h2{color:#fff}
.contact dl{margin:0;display:grid;gap:14px}
.contact dt{font-size:.78rem;text-transform:uppercase;letter-spacing:.12em;opacity:.7}
.contact dd{margin:0;font-weight:600;font-size:1.08rem}
.contact a{color:#fff}
.contact .big{font-size:1.6rem;font-family:var(--head);text-decoration:none;border-bottom:3px solid var(--accent)}
.ph{background:rgba(255,215,0,.18);border:1px dashed rgba(255,215,0,.8);border-radius:4px;padding:0 6px;font-weight:600}

footer{padding:34px 0 40px;color:var(--muted);font-size:.92rem;text-align:center}
footer strong{color:var(--ink)}
footer .demo{font-size:.8rem;margin-top:6px;opacity:.85}

/* Sticky call (phones) */
.callbar{display:none}
@media (max-width:760px){
  .nav a:not(.pill){display:none}
  .brand{font-size:1rem}
  section{padding:60px 0}
  .hero{min-height:88vh}
  .btns .btn{flex:1 1 100%}
  .gallery{grid-template-columns:1fr 1fr;gap:10px}
  .book,.contact,.row{grid-template-columns:1fr}
  .row{gap:0}
  .contact{padding:28px 22px}
  .form{padding:22px 18px}
  body{padding-bottom:76px}
  .callbar{display:flex;position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:50;
    min-height:56px;border-radius:999px;background:var(--accent);color:var(--accent-ink);align-items:center;justify-content:center;gap:10px;
    font:700 1.1rem/1 var(--body);text-decoration:none;box-shadow:0 8px 24px rgba(0,0,0,.3)}
  .callbar svg{width:20px;height:20px}
}
@media (max-width:420px){.nav .pill{display:none}}
@media (max-width:380px),(max-height:680px) and (max-width:760px){.hero .wrap{padding-top:84px;padding-bottom:36px}.hero .sub{display:none}.btns{margin-top:18px}.mn{font-size:1.1rem}.kicker{margin-bottom:12px}.btns{gap:10px}}
</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="top">
  <div class="wrap">
    <a class="brand" href="#top">${esc(b.name)}</a>
    <nav class="nav" aria-label="Main">
      <a href="#services">Services</a>
      <a href="#projects">Projects</a>
      <a href="#book">Book</a>
      <a href="#contact">Contact</a>
      <a class="pill" href="tel:${tel(b.phone)}">${esc(b.phone)}</a>
    </nav>
  </div>
</header>

<main id="main">
<section class="hero" id="top" style="padding:0">
  <div class="wrap">
    <span class="kicker">${esc(b.trade)} &middot; ${esc(b.minnesota ? 'Minnesota' : cityLong)}</span>
    ${mnBadge}
    <h1>${esc(b.name)}</h1>
    <p class="lead">${esc(b.headline)}</p>
    <p class="sub">${esc(b.sub)}</p>
    <div class="btns">
      <a class="btn btn-main" href="tel:${tel(b.phone)}"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>Call Now</a>
      <a class="btn btn-ghost" href="#book" data-book>Book an Estimate</a>
    </div>
  </div>
  ${b.heroNote ? `<span class="photo-note">${esc(b.heroNote)}</span>` : ''}
</section>

<section id="services">
  <div class="wrap">
    <p class="eyebrow">What we do</p>
    <h2>${esc(b.trade)} services</h2>
    <p class="intro">${esc(b.sub)} Not sure what you need? Call and talk it through.</p>
    <div class="grid">${svc}
    </div>
  </div>
</section>

<section id="projects" class="alt">
  <div class="wrap">
    <p class="eyebrow">Our work</p>
    <h2>Recent projects</h2>
    <p class="intro">A look at jobs in ${esc(cityShort)} and around the north metro.</p>
    <div class="gallery">${gal}
    </div>
    <div class="reviews"><strong>Your Google reviews will show here.</strong>Real reviews from your Google Business Profile can be added once they are connected.</div>
  </div>
</section>

<section id="book">
  <div class="wrap book">
    <div>
      <p class="eyebrow">Book an estimate</p>
      <h2>Tell us about your project</h2>
      <p class="intro">Send a few details and we will call you to set up a time. In a hurry? Call <a href="tel:${tel(b.phone)}"><strong>${esc(b.phone)}</strong></a>.</p>
    </div>
    <div class="form" id="formBox">
      <form id="bookForm" novalidate>
        <div class="row">
          <label>Name<input name="name" autocomplete="name" required></label>
          <label>Phone<input name="phone" type="tel" autocomplete="tel" inputmode="tel" required></label>
        </div>
        <div class="row">
          <label>Email <span>(optional)</span><input name="email" type="email" autocomplete="email"></label>
          <label>Preferred date<input name="date" type="date"></label>
        </div>
        <label>Project address<input name="address" autocomplete="street-address" placeholder="Street, city"></label>
        <label>Service needed
          <select name="service" required>
            <option value="">Choose a service</option>${opts}
            <option>Something else</option>
          </select>
        </label>
        <label>Notes <span>(optional)</span><textarea name="notes" placeholder="Size, timing, anything we should know"></textarea></label>
        <button class="btn btn-main" type="submit">Request my estimate</button>
        <p class="err" id="formErr" role="alert"></p>
        <p class="note" id="demoNote">Demo form: requests are not sent anywhere yet.</p>
      </form>
      <div class="thanks" role="status" aria-live="polite">
        <div class="check"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg></div>
        <h3>Thanks! We'll call you to confirm your estimate.</h3>
        <p class="note">Need us sooner? Call <a href="tel:${tel(b.phone)}">${esc(b.phone)}</a>.</p>
      </div>
    </div>
  </div>
</section>

<section id="contact" style="padding-top:0">
  <div class="wrap">
    <div class="contact">
      <div>
        <p class="eyebrow">Contact</p>
        <h2>${esc(b.name)}</h2>
        <a class="big" href="tel:${tel(b.phone)}">${esc(b.phone)}</a>
      </div>
      <dl>
        <div><dt>Owner</dt><dd>${owner}</dd></div>
        <div><dt>Phone</dt><dd><a href="tel:${tel(b.phone)}">${esc(b.phone)}</a></dd></div>
        <div><dt>Email</dt><dd>Email coming soon</dd></div>
        <div><dt>Based in</dt><dd>${esc(cityLong)}</dd></div>
        <div><dt>Service area</dt><dd>North Twin Cities metro: ${AREA.join(', ')}</dd></div>
      </dl>
    </div>
  </div>
</section>
</main>

<footer>
  <div class="wrap">
    <strong>${esc(b.name)}</strong> &middot; ${esc(cityLong)}
    <div class="demo">Demo site by Sharp Basics – sharpbasics.com</div>
  </div>
</footer>

<a class="callbar" href="tel:${tel(b.phone)}" aria-label="Call ${esc(b.name)} at ${esc(b.phone)}"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>Call ${esc(b.phone)}</a>

<script>
/* ---- Booking setup ----
   To connect a real booking service, paste its form URL below (for example a
   Formspree, Basin or Zapier/Make webhook URL that accepts a POST of form data).
   Leave it empty and the form only shows the thank-you message (demo mode). */
var BOOKING = {
  endpoint: '',            // e.g. 'https://formspree.io/f/xxxxxxx'
  redirectTo: ''           // optional: send people to a Calendly/booking page after submit
};

(function(){
  var form = document.getElementById('bookForm');
  var box = document.getElementById('formBox');
  var err = document.getElementById('formErr');
  var date = form.elements.date;
  var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  date.min = d.toISOString().slice(0, 10);
  if (BOOKING.endpoint) document.getElementById('demoNote').hidden = true;

  // Focus the first field after "Book an Estimate"
  document.querySelectorAll('[data-book]').forEach(function(a){
    a.addEventListener('click', function(){ setTimeout(function(){ form.elements.name.focus({preventScroll:true}); }, 450); });
  });

  // Hide the "Add photo" label once a real photo loads
  document.querySelectorAll('.shot').forEach(function(el){
    var img = new Image();
    img.onload = function(){ el.classList.add('loaded'); };
    img.src = el.getAttribute('data-src');
  });

  form.addEventListener('submit', function(e){
    e.preventDefault();
    err.textContent = '';
    var f = form.elements;
    if (!f.name.value.trim()) { err.textContent = 'Please add your name.'; f.name.focus(); return; }
    if (f.phone.value.replace(/\\D/g, '').length < 10) { err.textContent = 'Please add a phone number we can call (10 digits).'; f.phone.focus(); return; }
    if (f.email.value && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(f.email.value)) { err.textContent = 'That email does not look right.'; f.email.focus(); return; }
    if (!f.service.value) { err.textContent = 'Please choose a service.'; f.service.focus(); return; }

    var done = function(){
      box.classList.add('done');
      box.querySelector('.thanks h3').setAttribute('tabindex', '-1');
      box.querySelector('.thanks h3').focus();
      if (BOOKING.redirectTo) setTimeout(function(){ location.href = BOOKING.redirectTo; }, 1500);
    };
    if (!BOOKING.endpoint) { done(); return; }
    var btn = form.querySelector('button'); btn.disabled = true; btn.textContent = 'Sending...';
    fetch(BOOKING.endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      .then(function(r){ if (!r.ok) throw 0; done(); })
      .catch(function(){
        btn.disabled = false; btn.textContent = 'Request my estimate';
        err.textContent = 'Sorry, that did not send. Please call ${esc(b.phone)}.';
      });
  });
})();
</script>
</body>
</html>
`;
}

const root = path.join(__dirname, '..');
for (const b of businesses) {
  const dir = path.join(root, b.slug);
  fs.mkdirSync(path.join(dir, 'images'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page(b));
  fs.writeFileSync(path.join(dir, 'images', 'README.txt'),
    `Photos for ${b.name}\n\nhero.jpg        main photo at the top (wide, about 1920x1080)\ngallery1.jpg to gallery6.jpg   project photos (about 1200x900)\n\nOnly use photos the business owns or gave you permission to use.\nUntil a photo is added, the page shows a dark gradient instead.\n`);
}
console.log('Built', businesses.length, 'sites');

# Yaya Builds

Things I'm making with Claude Code.

## Yahya.games.com — Skyforge Champions

A hundred and forty-two characters fight on a sunlit stone platform floating above the clouds. Pick a champion, fight for credits and experience, then level them up
and forge their armour into brighter and brighter finishes.

**To play:** open `index.html` in any web browser.

### Fighting

| Key | Button | Does |
| --- | --- | --- |
| `A` | Strike | Punch. Tap in rhythm for a 3-hit combo — the third hit is the heavy one |
| `F` | Super Punch | Roughly double damage. Costs 25% of the meter |
| `K` | Kick | Slower than a strike and hits considerably harder |
| `G` | Grab | Modest damage, but a guard barely helps against it |
| `W` | Leap | A jump attack. Solaris flies instead — higher, further, and harder |
| `S` | Guard | Hold to block. Cuts incoming damage to about a sixth |
| `D` | Super Move | That champion's signature move. Needs a full meter |

Landing hits fills the meter fastest; guarding fills it slowly.

The controls sit in the bottom-right corner of the arena itself, over the
action, rather than below it.

**A press always does something.** If a move is requested while the champion
is mid-animation or on cooldown it is buffered and fires the moment they are
free, and a move you cannot afford falls back to a plain strike rather than
being swallowed. Mashing a button is never a dead input.

### Arenas

Six places to fight, chosen on the home screen. Each has its own sky ramp,
light source, cloud tint and deck colours:

**Sky Arena** above the clouds · **Metropolis** rooftops at noon ·
**Gotham City** after dark, stars and a cold moon over a lit skyline ·
**Themyscira** on the Amazon coast at sunset · **Apokolips**, a burning red
sky over the fire pits · **The Watchtower** in orbit, with Earth below.

### The roster

A hundred and forty-two characters, each drawn to their own costume. This is
not every character from anywhere — each one here is hand-written drawing code
— but it covers the Justice League, the Bat-family, a bench of villains, a
Marvel and X-Men wing, and seventy-six anime fighters.

Twenty more joined the roster: Doctor Strange, Black Widow, Hawkeye, Loki,
Thanos, Ant-Man, Scarlet Witch, Vision, Ghost Rider, Silver Surfer, Jean Grey,
Nightcrawler, Rogue, Beast, Gambit, John Stewart, Static Shock, Two-Face,
Scarecrow and The Penguin — with horned, flaming-skull and split-face head
treatments drawn for Loki, Ghost Rider and Two-Face.

**Anime (seventy-six fighters):** Goku, Vegeta, Gohan, Piccolo, Frieza, Naruto,
Sasuke, Kakashi, Ichigo, Luffy, Zoro, Saitama, Tanjiro, Nezuko, Zenitsu,
Levi, Eren, Mikasa, Edward Elric, Gon, Killua, All Might, Deku, Bakugo,
Todoroki, Gojo, Yuji, Sukuna, Meliodas, Asta, Denji, Inuyasha, Yusuke,
Jotaro, DIO, Kenshin, Guts, Sailor Moon, Kaneki and Astro Boy — with new
head shapes for spiked hair, ponytails, braids, a straw hat, a bandana,
a blindfold, a peaked cap and a boar mask.

A second wave joined them: Broly, Trunks, Beerus, Cell, Majin Buu, Sakura,
Itachi, Madara, Rock Lee, Rukia, Aizen, Sanji, Nami, Ace, Shanks, Genos,
Inosuke, Rengoku, Muzan, Armin, Reiner, Alphonse, Hisoka, Kurapika, Uraraka,
Shigaraki, Megumi, Nobara, Escanor, Yami, Sesshomaru, Hiei, Giorno, Rimuru,
Vash and Spike.

### Levelling and missions

Winning is the main way a champion gets stronger. Every win pays credits and
experience, the experience grows with how many times that champion has won,
and **every third win is a free level** on top of it. Training, forging and
new versions are all cheaper than they used to be.

The missions board on the home screen holds sixteen objectives. Ten are about
the champion you have selected — win one fight, win five, win fifteen, win
thirty, reach level 5, 12 and 25, forge to Chrome, forge to Legendary, unlock
a second version. Six are about the whole roster — win with 5 and with 20
different champions, win 50 fights in total, win at least once in every arena,
unlock ten versions, and forge anyone to Legendary. Each shows how far along
you are and pays credits and experience when you collect it.

### Solo raid

One champion, no help, a ladder of opponents that keeps getting harder.

Your health **carries from floor to floor** — you only get 45% of it back
between fights — so getting deep is about surviving a whole run, not winning
one bout. Every fifth floor is a boss. Raid opponents have 55% of normal
health (110% for bosses), because a gauntlet of full-length fights would take
an afternoon; the difficulty is the ladder, not the length of each fight.

After every floor the run pauses on a choice:

- **Go deeper** — the next floor is harder and pays more into the pot.
- **Bank it** — take the whole pot and walk away.

Lose and you still keep **half** the pot, so a run is never wasted. The
deepest floor you have cleared is saved for each champion and overall, and
three missions hang off it: floor 5 and floor 12 with a single champion, and
floor 20 across the whole roster.

### Frame rate

The fight is simulated on a fixed 1/60s step — every animation length,
cooldown and effect lifetime in the game is written in those units. A 120Hz
screen fires twice per step, so the loop used to draw the same state twice and
a 120Hz phone saw 60 distinct images a second.

Now each fighter remembers where it was one step ago and is drawn part-way
between then and now, so the screen gets as many distinct frames as it can
show. Counting rendered frames that differ from the one before, over two
seconds of a real fight:

| Screen | Before | After |
| --- | --- | --- |
| 60Hz | 59 fps | 59 fps |
| 120Hz | 60 fps | **120 fps** |
| 144Hz | 60 fps | **144 fps** |
| 240Hz | 60 fps | **240 fps** |

Interpolating costs one simulation step of input lag, so it only switches on
when the screen is genuinely faster than the simulation. On a 60Hz screen the
loop behaves exactly as it always did.

A browser can never draw more frames than the screen refreshes, so on a 60Hz
monitor or an ordinary phone the readout will say 60 and that is the ceiling.
The FPS number in the top bar shows what you are actually getting — green at
100 or more, blue at 50 or more.

### Lex Luthor's security detail

Lex does not fight fair. From **level 10**, the moment his health drops into
the red — a quarter of his bar — his Lexcorp security detail steps in for him
while he is still standing. Three
troopers step in one at a time, each arriving at **full health** in a **fully
forged Legendary warsuit**. Beat all three and **Lex comes back at full health
himself** — only then can the fight end.

It works whichever side he is on: fight him and you have to get through the
detail, pick him and the detail covers for you. Beating a champion who called
one in pays 1.7x credits and 1.45x experience.

The troopers are kept out of the roster on purpose — they have no card, no
versions and no missions. The only way to meet one is to put Lex on the ropes.

### Superman's face

Superman is drawn with a face of his own rather than the generic one every
other character shares: jaw and cheekbone structure, an ear, an almond eye
with a limbal ring and two catchlights, a lash line and crease, a low tapered
brow, a nose drawn as a lit edge beside a shadow line, and two lips.

**Heroes:** Superman, Batman, Wonder Woman, The Flash, Green Lantern, Cyborg,
Aquaman, Shazam, Green Arrow, Supergirl, Batgirl, Nightwing, Robin, Martian
Manhunter, Hawkgirl, Zatanna, Peacemaker, Raven, Starfire, Beast Boy,
Red Hood.

**Villains and anti-heroes:** Black Adam, Catwoman, Deathstroke, Bane, Harley
Quinn, The Joker, Lex Luthor, Reverse-Flash, Poison Ivy, Mr. Freeze, The
Riddler, Darkseid, Solomon Grundy.

Every character carries their civilian name, a signature Super Move, and a
**trait** — a passive power that changes how they fight.

### Passives

Every one of the sixty-six characters has its own passive, and no two share a
name. Thirty-five of them are not bonuses at all — they are the character's
actual power, going off by itself during the fight, with its own effect drawn
on screen and its own damage:

| Character | Passive | What you see |
| --- | --- | --- |
| Magneto | Magnetic Nuke | Scrap metal drags in from all sides, then detonates |
| Thor, Storm, Static Shock, Shazam, Black Adam | Lightning | A bolt falls out of the sky onto the opponent |
| Poison Ivy | Strangling Vines | Vines burst up through the arena floor |
| Mr. Freeze | Flash Freeze | Ice crystals form in a ring around them |
| Ghost Rider | Hellfire | Fire climbs out of the ground where they stand |
| Iron Man, Cyclops, Superman, Darkseid, Green Lantern | Beams | Repulsors and optic blasts fire on their own |
| Jean Grey, Martian Manhunter, Scarlet Witch | Psychic force | Rings of force close on the opponent |
| Raven, Venom, Scarecrow | Shadow | Tendrils rise from the floor |
| Spider-Man | Web Snare | Web strands shoot across and wrap them |
| Silver Surfer | Power Cosmic | A cosmic wave rolls out from the board |
| Hulk, Thanos, Aquaman, Black Panther | Shockwave | A detonation centred on the opponent |
| Wolverine, Cyborg, Solomon Grundy | Healing | Green sparks spiral up as the damage closes |

The remaining thirty-one are quieter powers that suit their character —
Batman's intellect, Captain America's endurance, Nightcrawler's evasion,
Deadpool's refusal to stay down, Deathstroke's precision — using twenty-two
mechanics including crits, execute damage, lifesteal, bleed, chill, stuns,
thorns, adaptive armour, guard-breaking and a once-per-fight last stand.

### Versions

Characters have alternate versions unlocked with credits. The default look is
the screen version — Superman's darker film suit, Batman's matte armour,
Wonder Woman's bronze battle armour, Aquaman's scale mail and beard, Green
Arrow's hood, the Joker's purple coat — and the bright comic palettes are
among the unlocks, alongside things like Superman's Black Suit, Batman Beyond,
CW Scarlet and Future Flash.

Unlocks are deliberately a long haul: they cost between 7,500 and 26,000
credits **and** require that character at a minimum level (6, 12 or 18
depending on the version). A version changes the palette only, so it is a look
rather than an advantage.

### Super move cutscenes

Firing a Super Move takes over the screen. Letterbox bars slide in, the camera
pushes in on the fighter, the arena darkens to a vignette, and a title card
slides up naming the character and the move. The health bars step out of the
way, the move plays out in slow motion, and everything releases back to the
normal view when it lands.

### Two champions fight differently

**Superman can fly.** His Leap becomes a **Flying Jump**: he climbs far higher
than anyone else, travels most of the arena, and comes down fist-first for
well over double a normal hit, staggering whoever he lands on.

**Batman fights with his intellect.** He carries a third bar the others do
not have. It fills whenever his opponent attacks — he is reading them — and
every point of it quietly raises his damage, up to +60%. Fill it completely
and his next strike is a **Predicted Counter** worth more than double, after
which the read resets and he starts studying again. Watch for the scanning
brackets and the read-outs: *stance read*, *weakness found*, *counter ready*.

### Getting stronger

Two things grow a champion:

- **Experience** comes from every bout, win or lose, and levels them up on its
  own. Each level adds 11% to every stat.
- **Credits** buy upgrades. **Train** grants an instant level. **Forge armour**
  moves them up a finish.

The five finishes are **Standard steel → Polished → Chrome → Energised →
Legendary**. Each forge needs a minimum level, costs more than the last, and
raises every stat sharply — a Legendary champion has 2.65× the stats of a
Standard one. It also changes how they look: matte steel gains a sheen, then a
mirror polish, then a glowing aura, and finally a blazing gold radiance with
sparks orbiting the fighter.

### How it is built

Everything is one file, `index.html`, with no libraries. All artwork is drawn
in code with the Canvas API — original characters, no image files. The fighters
use a small joint rig: each pose is a set of joint positions, and animations
blend between them, so punches, blocks, hit reactions and knockdowns are all
interpolated rather than hand-drawn frames. Bodies are drawn twice — once as a
padded ink silhouette, once in colour — which is what gives them their comic
outline.

Progress saves in your browser.

### Browsers

The game is one HTML file with no libraries, so it runs by opening `index.html`
in any modern browser — Safari, Chrome, Edge or Firefox, on a computer, a
phone or a tablet.

For Safari specifically the page avoids anything WebKit is fussy about: the
audio uses the `webkitAudioContext` fallback and only starts on a tap,
`localStorage` reads and writes are wrapped so Private Browsing cannot throw,
`width: fit-content` carries its `-webkit-` prefix, and the arena canvas falls
back to sizing itself from JavaScript on Safari versions older than 15, which
have no `aspect-ratio`. The script is plain ES5 — no arrow functions, template
literals or optional chaining — so old iPads are fine too.

On a phone the fight buttons stack into a grid and the whole thing is
playable with taps.

## Putting it online as a real website

Everything is already arranged for **GitHub Pages**: `index.html` sits at the
repository root, it is on the default branch, and `.nojekyll` is present so
Pages serves the file as-is instead of running it through Jekyll.

Two steps are left, and both are settings on GitHub that only the repository
owner can change:

1. **Make the repository public.** Pages on a private repository needs a paid
   GitHub plan. Settings → General → scroll to the bottom → Change repository
   visibility → Public.
2. **Turn Pages on.** Settings → Pages → Source: *Deploy from a branch* →
   Branch: `claude/code-intro-h4ryh6`, folder `/ (root)` → Save.

After a minute or so the game is live at:

```
https://yayacr7.github.io/Yaya-builds/
```

That address is a normal public website — it can be opened in Safari, shared
with anyone, and added to a phone's home screen. Every push to the branch
updates it automatically, including the Sunday updates.

If buying a domain later, a `CNAME` file at the repository root pointing at it
is all Pages needs to serve the game from that name instead.

### How the figures are shaded

Each limb is a tapered capsule lit across its width, then given an ambient
occlusion pool where it sockets into the limb before it — that one detail does
more for the sense of depth than anything else here. A dark seam runs down the
shaded side of every limb and a light one down the lit side, which reads as the
panel edges of a real suit.

The torso is clipped and shaded on top of its base gradient: a shadow under the
collar, two pectorals with a highlight on the lit one, a centre seam down to
the waist, two rib lines, and a soft shadow along the flank facing away from
the sun.

### Levelling

Levels matter a great deal now. Each one adds 16% to every stat (up from 11%),
and it no longer stops at raw numbers:

- **Super moves** gain 3% damage per level, so a signature move on a level 30
  champion hits close to twice as hard as at level 1.
- **Traits** sharpen by 2.2% per level, so Hulk's rage, Wolverine's healing and
  Batman's intellect all grow with him.

Experience requirements are gentler, bouts pay about a third more experience,
and training costs less, so a champion climbs at a satisfying pace.

### Performance

The arena sky — gradient, sun, light shafts, stars, skyline and haze — is
painted once into an offscreen canvas and blitted each frame, rather than
being rebuilt sixty times a second. Roster portraits are painted once each and
only the selected champion keeps animating, and they stop entirely during a
fight. The fine per-limb shading is limited to the large arena figures. A
fight now runs at a steady 61 fps with all sixty-six characters loaded.

The arena canvas also picks its own pixel ratio: on a large, high-resolution
screen it caps at 1.5x rather than 2x, since nine times the pixels buys
nothing visible. That alone took a 2x display from 32 fps to 44.

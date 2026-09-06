# Yaya Builds

Things I'm making with Claude Code.

## Yahya.games.com — Skyforge Champions

Thirty-four DC characters fight on a sunlit stone platform floating above the clouds. Pick a champion, fight for credits and experience, then level them up
and forge their armour into brighter and brighter finishes.

**To play:** open `index.html` in any web browser.

### Fighting

| Key | Button | Does |
| --- | --- | --- |
| `A` | Strike | Punch. Tap in rhythm for a 3-hit combo — the third hit is the heavy one |
| `F` | Super Punch | Roughly double damage. Costs 25% of the meter |
| `W` | Leap | A jump attack. Solaris flies instead — higher, further, and harder |
| `S` | Guard | Hold to block. Cuts incoming damage to about a sixth |
| `D` | Super Move | That champion's signature move. Needs a full meter |

Landing hits fills the meter fastest; guarding fills it slowly.

### The roster

Thirty-four DC characters, each drawn to their own costume. This is not every
DC character — DC has thousands, and each one here is hand-written drawing
code — but it covers the Justice League, the Bat-family, and a bench of
villains.

**Heroes:** Superman, Batman, Wonder Woman, The Flash, Green Lantern, Cyborg,
Aquaman, Shazam, Green Arrow, Supergirl, Batgirl, Nightwing, Robin, Martian
Manhunter, Hawkgirl, Zatanna, Peacemaker, Raven, Starfire, Beast Boy,
Red Hood.

**Villains and anti-heroes:** Black Adam, Catwoman, Deathstroke, Bane, Harley
Quinn, The Joker, Lex Luthor, Reverse-Flash, Poison Ivy, Mr. Freeze, The
Riddler, Darkseid, Solomon Grundy.

Every character carries their civilian name, a signature Super Move, and a
**trait** — a passive power that changes how they fight.

### Traits

| Trait kind | What it does |
| --- | --- |
| Momentum | More damage while above half health |
| Berserk | More damage once badly hurt |
| Power | Flat damage bonus on every hit |
| Tough | Takes less damage from everything |
| Guardian | Guarding blocks far more than usual |
| Charge | Super meter fills faster |
| Regen | Slowly repairs damage during a fight |
| Double | Chance for a strike to land twice |
| First strike | The first hit of a fight is a critical |
| Intellect | Reads the opponent — Batman and Lex Luthor |

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

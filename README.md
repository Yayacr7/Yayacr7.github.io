# Yaya Builds

Things I'm making with Claude Code.

## Yahya.games.com — Skyforge Champions

Two hundred and fifty characters fight on a sunlit stone platform floating above the clouds. Pick a champion, fight for credits and experience, then level them up
and forge their armour into brighter and brighter finishes.

**To play:** open `index.html` in any web browser.

### Fighting

Four big buttons, that's all:

| Button | Key | Does |
| --- | --- | --- |
| 👊 Punch | `A` or `J` | Tap in rhythm for a 3-hit combo — the third hit is the heavy one |
| 🦶 Kick | `K` or `L` | Slower than a punch and hits harder |
| 🚀 Jump | `W` or `Space` | Jump at them. **In the air, Punch = Flying Punch and Kick = Flying Kick**: you dive straight onto them for big damage. Superman flies instead |
| ⚡ Power | `D` or `P` | Always does the biggest move you can afford: your **Super Move** on a full meter, the **Punch of Death** at half a meter, otherwise a punch |

The **Punch of Death** is a dash-in haymaker: slow motion, a flash, after-images,
three times a normal punch, and it knocks them off their feet. It costs half
the meter.

**Blocking is automatic.** When your opponent winds up and you're standing
still, your champion gets their guard up on their own a good share of the
time. Keyboard players can still hold `S` to block and press `G` to grab.

Landing hits fills the meter fastest. While you're in the air the Punch and
Kick buttons light up blue and say FLYING PUNCH / FLYING KICK, and Power
pulses when it's charged.

**A press always does something.** A move pressed mid-animation is buffered
and fires the moment the champion is free, and a move you can't afford falls
back to a plain punch. Mashing is never a dead input.

### How the moves work

Every attack moves the fighter's weight, the way a real one does:

- **Punch combo:** lead jab, rear straight, then either an uppercut to the head
  or a hook to the body. Each punch snaps back to a guard.
- **Kicks rotate between four real techniques**: a roundhouse to the head, a
  low kick to the leg, a front push-kick to the body that shoves them back,
  and a knee up close.
- **Hit reactions match where the blow landed.** A head shot snaps the head
  back, a body shot folds them over, and a leg kick buckles the knee.
- **Knockback:** a clean hit sends the defender skidding back with a puff of
  dust, and they step back into range. A block still gives a little ground.
- **Footwork:** fighters never stand frozen. They shuffle in and out and
  bounce lightly on their feet.
- **Flying attacks have real airborne poses:** a flying kick with the leg
  out straight, and a "superman punch" with the back leg thrown behind.
- **Knockouts:** the loser is lifted off their feet, thrown back in slow
  motion, and lands with a thud and a cloud of dust.

### Making every fight feel big

- **READY? … FIGHT!** before every bout, and a giant **K.O.!** at the end
- Comic-book hit words (**POW! BAM! WHAM! KAPOW!**) on the big hits
- Confetti on every win
- A **treasure chest** after every win: Wooden, Silver, Gold or (rarely)
  Diamond, which also gives a free level
- **Win streaks**: each win in a row pays 10% more credits, up to double.
  Losing resets it
- Tips along the bottom of the screen for your first five fights

### Quick play modes

- **🧌 Giant Battle**: one of the game's heaviest hitters, drawn 1.5× size
  with 3× the health. A win always drops a Gold Chest or better
- **⏱ 60-Second Rush**: knock out as many as you can in a minute. Each
  knockout pays, heals you a little and brings the next one straight in.
  Three or more knockouts earns a chest
- **🤖 Smash the Dummy**: twenty seconds against a training robot that never
  hits back. Pays by damage dealt, and a new record drops a Silver Chest or
  better

### Arenas

Six places to fight, chosen on the home screen. Each has its own sky ramp,
light source, cloud tint and deck colours:

**Sky Arena** above the clouds · **Metropolis** rooftops at noon ·
**Gotham City** after dark, stars and a cold moon over a lit skyline ·
**Themyscira** on the Amazon coast at sunset · **Apokolips**, a burning red
sky over the fire pits · **The Watchtower** in orbit, with Earth below.

### The roster

Two hundred and fifty characters, each drawn to their own costume. This is
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

### Rarity

Every champion now sits on one of seven steps, and the roster is a pyramid
rather than a list:

| Rarity | How many | Locked? |
| --- | --- | --- |
| Common | 80 | no |
| Rare | 85 | no |
| Epic | 54 | no |
| **Legendary** | 10 | yes |
| **Majestic** | 9 | yes |
| **Ultimate** | 6 | yes |
| **Mythic** | 6 | yes |

**Mythic sits at the top.** It is both the rarest step and much the strongest --
a Mythic carries 80% more health and 45% more damage than its raw stats, against
42% and 24% for an Ultimate. The six who hold it are the six biggest characters
in the game: The Presence, Lucifer Morningstar, Michael Demiurgos, Perpetua, The
Spectre and Dream. Majestic and Ultimate slot in beneath it.

Everything from Legendary upward has to be won in the Trial of Three, and the
rarer the prize the harder that trial is -- a Mythic comes with a good deal more
health than a Legendary. Majestic and above also hit harder and carry more health
when **you** field them, which is the point of chasing them.

Rarity replaced a single locked/unlocked flag that had been doing the job of a
ladder. The first pass set it purely from each champion's stats, which was
mechanically fair and read completely wrong -- it made Superman **Common** -- so
the headline names now have a floor under them.

Cards carry their rarity in the corner in its own colour, and everything from
Epic upward gets a matching border.

### Searching by rarity

A row of chips above the roster filters it to one rarity in a tap, and the
search box matches rarity words too, so typing `majestic` finds all six. The two
work together: pick Mythic and type `fate` and you get Doctor Fate.

### DC magic, myth and the powers above

Thirty new DC characters, almost all of them at the top of the ladder.

**The magicians:** Doctor Fate, Constantine, Circe, Klarion, Enchantress,
Mordru, Felix Faust and Madame Xanadu.

**Mythic:** Etrigan, Swamp Thing, Phantom Stranger, Trigon, Eclipso, Parallax
and Deadman -- joined by Galactus and Kaguya, promoted now there is a step above
Legendary for them to stand on.

**Ultimate:** Anti-Monitor, Nekron, Imperiex, Superboy-Prime, Black Racer and
Mordru.

**Majestic:** The Presence, Lucifer Morningstar, Michael Demiurgos, Perpetua,
The Spectre and Dream -- the six most powerful things in the game by a distance.

**More Legendaries:** Sinestro, Ares, Neron, Circe, Enchantress and Larfleeze.

Every one of them carries **three versions** rather than the usual one or two,
so a Mythic or an Ultimate is worth forging as well as winning.

### Pixar

Thirty-two Pixar characters, all of them playable straight away rather than
locked behind the Trial -- there is already plenty to win.

**Toy Story:** Buzz Lightyear, Woody, Jessie, Zurg, Lotso.
**The Incredibles:** Mr. Incredible, Elastigirl, Violet, Dash, Frozone, Syndrome
and Edna Mode.
**Monsters, Inc.:** Sulley, Mike Wazowski, Randall.
**Up:** Carl and Russell. **Coco:** Miguel, Hector, Ernesto.
**Soul:** Joe Gardner and 22. **WALL-E:** WALL-E and EVE.
**A Bug's Life:** Flik and Hopper. **Onward:** Ian and Barley.
**Elemental:** Ember and Wade. Plus **Merida** and **Mei**.

The existing head shapes did most of the work: Buzz gets the dome helmet, Jessie
and Mei get the braid, Sulley the horns, Hector the skull, Russell the peaked
scout cap, Flik the wide bug eyes, and Syndrome the spiked hair he already had.

Their traits are jokes from the films rather than superpowers -- Woody has
*There's a Snake in My Boot*, Edna has *No Capes*, Mike has *Always Watching* --
and their stats run from Common up to Epic, with Mr. Incredible the strongest
of them.

### Footballers and basketball players

Forty athletes joined the roster. **Twenty-two footballers** -- Messi, Ronaldo,
Mbappe, Haaland, Neymar, Vinicius, Bellingham, Salah, Kane, De Bruyne, Modric,
Lewandowski, Van Dijk, Alisson, Griezmann, Musiala, Yamal, Saka, Foden, Son,
Rodri and Benzema -- and **eighteen basketball players** -- LeBron, Curry,
Durant, Giannis, Jokic, Luka, Embiid, Tatum, Wembanyama, Shai, Morant, Booker,
Butler, Kawhi, Davis, Edwards, Zion and Kyrie.

They are drawn the way everything else here is drawn: the same rig, in a kit, in
national colours, with no chest emblem because a football shirt does not have
one. They are **not likenesses** -- this engine draws figures in code and cannot
do the face of a real person -- so think of them as players in their colours
rather than portraits. Their traits are football and basketball ideas rather
than superpowers, and their stats sit deliberately below the gods: quick, but
human.

This is not every footballer or every basketball player, and it could never be.
Every character here is hand-written drawing and data, and there are tens of
thousands of professionals playing right now.

### Search

At two hundred and fifty champions, scrolling stopped being reasonable. The
box above the roster filters as you type and matches **name, real name, type and
sport** -- so `kent` finds Superman, `amazon` finds Wonder Woman, `football`
brings up all twenty-two footballers, and `curry` quite correctly returns both
Stephen and Arthur.

Search hides cards rather than rebuilding a shorter list, because the card array
lines up with the roster by index -- a filtered list would hand every portrait to
the wrong champion.

### The movie (owner only)

Only shows up on a browser unlocked with the owner key; nobody else sees it.

**Skyforge: The Last Specimen** is a short film in five acts that plays itself.
Press **Watch the movie** on the home screen and sit back: title cards,
subtitled dialogue scenes with the camera pushing in on whoever is speaking,
four real bouts, and a credits roll, over a quiet score. It runs about five
minutes.

- **You are the star.** Whoever you have selected plays the lead. If your pick
  already has a part in the film (Batman, say), Superman stands in.
- **The fights are real.** Both champions are on the AI, so no two screenings
  play out the same. The winner is scripted, though: they wear plot armour and
  can't be knocked out, and a bout that drags makes them hit harder.
- **Nothing is earned or lost.** It doesn't touch credits, experience or your
  save, and the owner switches are off while it plays.
- **Controls:** Skip scene (right arrow, Enter or Space) and Leave the cinema
  (Esc), bottom-right of the screen.

### Story mode

Ten chapters, with cutscenes between them, telling how the Skyforge came to be.
Lex Luthor built a platform four miles above the ground and invited nobodies up
to be humiliated on it. You are one of the nobodies.

| | Chapter | Opponent |
| --- | --- | --- |
| 1 | The Invitation | The Penguin, level 4 |
| 2 | The Long Way Up | The Riddler, level 9 |
| 3 | The Detective | Batman, level 16 |
| 4 | The Security Detail | Bane, level 24 |
| 5 | The Amazon | Wonder Woman, level 33 |
| 6 | The Champion's Cut | Deathstroke, level 40 |
| 7 | Betrayal | Black Adam, level 47 |
| 8 | The God of Apokolips | Darkseid, level 53 |
| 9 | The Collector | Brainiac, level 57 |
| 10 | Doomsday | Doomsday, level 60 |

The opponents sit at **fixed levels and do not scale to you**, which is the whole
design: chapter one is winnable on your first day and chapter ten is not. Losing
costs nothing but time -- the chapter waits, and everything you earn anywhere
else in the game counts towards being ready for it. That is what makes the story
the reason to grind and the grind the way to finish the story.

Each chapter pays a large one-off reward; replaying one pays a quarter.

The cutscenes draw the speaker with the same joint rig as everything else, so
Lex, Batman and Darkseid are the real characters rather than portraits made
specially.

### Survival

Round after round, and **nothing heals**. The raid hands back a chunk of health
between floors; this hands back nothing, so every scratch carries forward and
the rounds keep getting harder.

There is no banking decision either: **everything you earn is yours whatever
happens**, which makes it the steadiest way to farm credits in the game. The
only thing at stake is the number, and your best run is kept.

### Daily bonus

One a day, and the streak is the point: 400 credits on the first day, growing
every day in a row up to ten. Miss a day and it goes back to one.

### Mastery

A champion keeps improving after level 60, slowly, forever. Wins are the
currency -- from any mode in the game -- and they earn ranks:

**Bronze** at 10 wins, **Silver** at 25, **Gold** at 50, **Platinum** at 90,
**Diamond** at 150. Each rank adds 3% to health and damage, permanently.

Mastery is yours alone. Opponents are built without it, so the bonus never
quietly ends up on the other side.

### The leaderboard

The invented rivals are gone. This is a real leaderboard: real people who play
the site, ranked by credits, and nobody else.

It needs one thing that cannot live in this file -- a database. GitHub Pages
serves files and nothing else, so a leaderboard that several people share has to
keep its scores somewhere on the internet. That is a free Firebase project, and
creating one needs an email address.

**Until it is connected**, the panel is invisible to visitors and shows the owner
the setup steps. Nothing is broken and nothing is pretending.

**To connect it**

1. At `console.firebase.google.com`, make a free project.
2. Create a **Realtime Database** in it.
3. Under **Authentication**, enable **Anonymous** sign-in.
4. Open the database's **Rules** tab and paste this:

```json
{
  "rules": {
    "scores": {
      ".read": true,
      ".indexOn": "credits",
      "$uid": {
        ".write": "auth != null && auth.uid === $uid",
        ".validate": "newData.hasChildren(['name','credits']) && newData.child('name').isString() && newData.child('name').val().length <= 18 && newData.child('credits').isNumber() && newData.child('credits').val() >= 0"
      }
    }
  }
}
```

5. Put your **Project ID** and **Web API key** into the `LEADERBOARD` block near
   the top of `index.html`, and push.

**How it works.** Each player is signed in anonymously -- no email, no password,
nothing personal, just an id the database generates. That id owns exactly one
row, and the rules above mean a player can only ever write their own. The only
two things sent are the name they typed and their credits. No library is loaded
for any of it; Firebase has a plain REST interface, so it is all `fetch` and the
game stays one file with no dependencies.

**Two honest limits**, both printed in the panel as well:

- **The key in the file is public, and that is normal.** Anyone can read it out of
  the page. Firebase is designed that way -- the key says which project to talk
  to, and the security rules are what actually protect the data.
- **Credits can be faked by someone determined.** The game runs on the player's
  own computer, so a person who knows how can change their number before it is
  sent. Stopping that properly would mean the server running the fights itself,
  which is a far bigger program than a leaderboard. For a game among friends the
  rules above are the right amount of protection.

**A word about names.** Other people's names are drawn as text and never as
markup -- a player calling themselves `<img onerror=...>` shows up as those exact
characters and cannot run anything. Ask people for a nickname rather than their
real name: the site is public, and some of the people playing it are children.

**If the database is unreachable** the panel says so plainly and the game carries
on as normal -- every mode still works with no network at all.

The **Hall of Fame** beside it is unchanged and needs no database: it ranks the
player's own champions against each other, which is real data already on the
device.

### Team battle

Three champions a side, one at a time. Pick a squad of three; when one falls the
next steps in, and **whoever is left standing keeps the damage they have taken**
while the champion coming on arrives fresh. Beat all three of theirs before they
beat all three of yours. Three lozenges under each health bar show how many are
left on each side.

Every knockout pays, clearing the whole squad pays nearly double on top, and the
**experience is shared across all three**, which is the point of fielding a squad
rather than one star.

The other squad is built around the **average** of yours, not its leader. Scaling
it off the leader was the first thing tried and it was quietly brutal: a squad of
one champion at level 40 and two rookies at level 1 drew three opponents at level
40 and was hopeless before it started.

### Tournament

Eight fighters, three rounds, one champion: **quarter-final**, **semi-final**,
**final**. You are healed to full between rounds, but each opponent is a level
higher than the last, the final opponent moves up an armour finish and carries a
quarter more health again, and the purse grows with the rounds. Lose at any point
and you are out with part of the purse. Win all three and you take the trophy,
which is counted on the home screen.

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

### Whose game is this

The admin tools belong to the owner, not to every visitor. Until a browser has
been claimed with the owner phrase there is no panel, no codes and no switches,
and nothing on screen hints that any of it exists -- somebody who opens the site
just gets the game. Once claimed the browser stays claimed through reloads, and
even through wiping the save, because the flag is kept outside the save on
purpose. Typing `LOGOUT` hands it back.

Be clear about what this is. It keeps the admin tools out of the way of anybody
who opens the page, which is the thing that actually matters here. It is **not
protection**: the phrase sits in this file in plain text like everything else,
so anyone who reads the source can find it. Nothing running entirely on the
visitor's own computer can do better -- real gating needs a server holding the
answer, and this game has no server.

### Admin abuse days

The panel and every ordinary code belong to the owner **every day**. But on
**Tuesday, Thursday and Saturday** a second, red-dashed section opens inside it
with three powers that exist on no other day:

| | |
| --- | --- |
| **Smite** | every hit you land finishes them |
| **Immortal** | you can never drop below one health |
| **Payday** | every reward in the game pays ten times |

They switch themselves off when the day ends and come back on next time, and
their codes (`SMITE`, `IMMORTAL`, `PAYDAY`) say which day to come back on if you
try them early. Measured on a Tuesday: Smite finished a fight in 34 strikes that
took 70 without it, and Payday turned a 117-credit reward into 1,170. Measured on
a Wednesday, with the same switches saved as on: no difference at all.

### The codes

Codes are typed into the box on the admin panel, or just typed on the keyboard
anywhere on the home screen. They work on **any day**, but only in a browser that
has been claimed with the owner phrase -- in anybody else's they do nothing at
all. The list is printed inside the panel.

**`YAYACR7` is its own key.** Typing it on a browser that has never been claimed
claims it and unlocks the whole game in the same breath, so there is one word to
remember and no setup step. Needing one word to open the panel and a different
word to use it was a step too many: on a fresh browser `YAYACR7` did nothing at
all, which looked exactly like the codes having been taken out.

`YAYAISADMIN` still works as a plain claim -- it opens the panel without
unlocking anything -- and `LOGOUT` hands the browser back. Both are listened for
in every browser on every day, because that is how a browser gets claimed.

The trade-off is worth being clear about: anybody who guesses the master word can
unlock **their own copy**. That costs nothing, because there is no shared state
here -- their save lives in their browser and yours lives in yours, and neither
can see the other.

**Things you get, once:**

| Code | What it does |
| --- | --- |
| `YAYACR7` | everything at once |
| `MONEY` | a million credits |
| `MAX` | maxes every champion |
| `SKINS` | every costume |
| `HEROES` | every legendary champion |
| `STORY` | all ten story chapters |

**Switches — type again to turn off:**

| Code | What it does |
| --- | --- |
| `GOD` | you take a tenth of all damage |
| `PUNCH` | your hits land ten times harder |
| `SUPER` | your super move is always ready |
| `BIG` | everybody gets an enormous head |
| `SLOW` | the fight runs in slow motion |
| `FAST` | the fight runs at double speed |
| `TINY` | your opponent shrinks |
| `GIANT` | you tower over them |
| `TWIN` | you always fight a copy of yourself |

`SLOW` and `FAST` cancel each other, from the codes and from the switches alike.

One honest note: the codes are **not secrets**. They are plain text inside the
page, so anyone who opens the source can read them. That is completely fine for a
game only you play -- but a code in a game running on your own computer can never
really be hidden, which is why real games keep anything that matters on a server.

### Solo raid

One champion, no help, a ladder of opponents that keeps getting harder.

Your health **carries from floor to floor** — you only get 45% of it back
between fights — so getting deep is about surviving a whole run, not winning
one bout. Ordinary raid opponents have 55% of normal health, because a
gauntlet of full-length fights would take an afternoon; the difficulty is the
ladder, not the length of each fight.

A raid has a shape:

- **Every third floor is a sub-boss** — six of them before the end.
- **Floor 20 is the RAID BOSS**, drawn from the twenty-four heaviest hitters
  on the roster rather than at random.

Health, measured against a level 46 champion whose own bar is 4,738:

| | Health | Times your own bar |
| --- | --- | --- |
| Ordinary floor | 634 – 2,935 | 0.13x – 0.62x |
| Sub-boss | 3,006 – 8,933 | 0.63x – 1.89x |
| **RAID BOSS** | **29,206** | **6.16x** |

Rewards match: a sub-boss pays about three floors' worth, and the raid boss
eleven — **13,420 credits and 6,570 experience** on its own.

A boss that is a wall of health must not also be a hammer, or it simply
stun-locks you and wins in five seconds. Bosses hit softer and slower than
their stats suggest — the raid boss at 7.5% power and 52% speed — so the
health bar is the whole challenge. You are **patched all the way up to full**
before every boss floor.

Banking the floor before a boss is a real decision.

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

### How the fighters are built

**Proportions.** The rig was drawn at about five heads tall, which is the
classic cartoon build. Every pose is now stretched once when the game loads —
the skeleton scales away from the ground and the head is re-seated on a real
neck — putting the figures at about **7.6 heads tall**, which is heroic-adult.
The head is drawn inside its own transform so all the face work keeps working
at the smaller size, and the limbs are slimmer to match.

**Lighting.** The sun is up and to the right. Every limb gets a warm key edge
facing it, a cool bounce off the sky on the shadow side, and a hard rim along
the lit edge. The rim's side is worked out from the light direction, so it
always lands on the side actually facing the sun.

**Materials.** Each suit is made of something. A table sends every character
to one of six treatments:

| | |
| --- | --- |
| plate | panel seams with lit upper edges, shoulder plates, a tight specular band |
| chrome | the same, with a harder highlight |
| leather | a broad soft sheen and fold creases |
| formal | shirt, lapels and tie |
| gi | a wrap across the chest with folds hanging from it |
| bare | no fabric, so muscle definition instead |
| weave | the default: a fine crosshatch under a soft sheen |

**Construction.** Before its material, every costume gets the same set of
seams: a shoulder yoke, a waist seam, side seams tracing the silhouette down
both flanks, and a centre seam. They are symmetric about the body's centre
line, placed by the torso's half-width at each height so they follow the taper
from shoulder to waist, and bowed downward in the middle so they read as
wrapping a chest rather than painted flat across it.

**Emblems.** The chest emblem used to hang off the front shoulder, so it slid
sideways whenever that arm swung — up to 5.9 units off centre during a punch.
It and the seam layout now read the same function for the torso's centre line
at chest height, so it is exactly centred on every frame. After the material
is drawn the chest is wiped back to clean suit in a disc behind it, so no
panel line, weave or fold crosses the emblem on any character.

**Anatomy.** Pectorals, three rows of abdominals, an oblique running to the
hip, a collar shadow and lit and shaded flanks, all placed as fractions of the
torso's real length.

Everything is still drawn with canvas paths — no images, no 3D — so this is a
cinematic comic-realist look rather than a photograph.

### Depth: turning the rig in space

The fighters are not sprites and never were -- each pose is a set of fifteen
joint positions, and the drawing code builds a shaded tube between any two of
them. That turned out to be the door to real 3D.

The poses are flat pairs of numbers, but they were never a flat *body*. The gap
between the front shoulder and the back shoulder only exists because the figure
is already standing at an angle to the camera. That gap is a projection -- and a
projection can be run backwards. If the poses were drawn at 28 degrees, then a
joint sitting `dx` from the body's centre line must really be `-dx/tan(28)` deep.

So every joint's depth comes out of the artwork that is already there. No depth
table, nothing new to keep in sync across 148 characters, and no risk of the two
drifting apart.

With the depths known, the body can be spun about its own vertical axis and
projected back down to the screen. That is real 3D geometry -- it is simply
filled with canvas paths instead of triangles. Watch the legs: side-on they
overlap, and as the body squares up to the camera they separate. Nothing draws
that; it falls out of the perspective.

Depth does not only move a joint, it decides how thick the limb hanging off it
is drawn. A near arm is not merely closer, it is **bigger** -- and a far arm
thinner. That was the last thing making the figures read flat. Each joint
carries the scale its projection gave it, so all thirteen places that draw a
limb inherit it without a single one of them changing.

The head turns too. The face is a fixed three-quarter view built from dozens of
hand-cut paths, so rather than re-cut every one of them it is scaled across the
turn: more face when the champion squares up, less when they turn away behind a
guard.

Three rules keep it safe:

- **Arms and legs inherit the depth of the shoulder or hip they hang off.** A
  punch travels along the fighting axis, not toward the camera, so an extended
  fist must not be dragged forward out of the screen.
- **The spine keeps the centre line.** Head, neck and pelvis have no depth, so
  the chest emblem and every seam that reads off them stay exactly where they
  were -- still measured at dead centre on every frame of the animation.
- **The turn is capped at 24 degrees either way**, which is the range where the
  far limb can never swing in front of the near one. No depth sorting needed,
  and nothing can ever draw in the wrong order.

The angle is not decoration. A body squares up as it throws a punch -- the
shoulder comes through with the fist -- so the turn is driven by how far the
champion is lunging. Guarding turns the other way, presenting a shoulder instead
of a chest, and there is a slow sway underneath it all while standing.

### The cinematic pass

A film does not go straight from the camera to the screen; it is graded. That
grade is most of why a game reads as expensive, and none of it needs 3D models.
The scene is painted into an offscreen buffer and composited through the same
chain a film goes through:

| | |
| --- | --- |
| bloom | bright things bleed light into the air around them |
| grade | a contrast and saturation curve |
| split tone | cool in the shadows, warm in the highlights |
| vignette | the corners fall away |

**Depth of field** comes free. The far background -- sky, skyline, stars -- is
already cached once per arena, so softening it when that cache is built costs
nothing per frame and leaves the deck and the fighters razor sharp. Your eye
goes to the fighters because they are the only sharp thing on screen.

**The camera flinches.** A landed hit punches the view in and rolls it slightly
away from the blow, then settles over the next tenth of a second. It rides
alongside the camera rather than through its usual slow glide, so it snaps on
the exact frame of the hit. The push-in is deliberately capped below the point
where the game hides the health bars, so a hit never costs you the HUD --
measured across seventy impact frames, the bar never once dropped out. The roll
is small enough that the push-in always covers the corners of the arena.

**Hit stop** is why a punch feels like it weighs something. The whole game
freezes for a few hundredths of a second when something lands: 28ms on a
strike, 62ms on a heavy, 150ms on a super. It is held in seconds rather than
frames, so it is the same length on a 60Hz screen and a 120Hz one.

Cost was the whole problem. A first attempt ran two filtered blits at full
resolution and took a frame from 32ms to 80ms -- unplayable. Keeping every
filter on a quarter-size surface, and doing the grade by blending the frame
over itself instead of with a filter, brought it back to 35ms. On top of that
the quality steps itself down on a machine that cannot hold 46fps and back up
if it turns out to cope, and a browser with no canvas filter support skips the
pass entirely and draws exactly as it always did.

### What this is not

It is worth being straight about the ceiling. This is not, and will not become,
Injustice 2. That game's characters are sculpted 3D models with separate texture
maps for colour, roughness and metal, rigged with a hundred bones plus a second
rig for the face, and animated from real actors on a motion-capture stage. One
character is a small team for a month or two. There are 148 here.

The gap is not a programming gap that more code closes -- it is an
art-production gap the size of a studio. What *is* reachable is everything above:
the camera, the timing, the light and real geometry. Those are most of why a
game feels expensive, and they are all here.

### Faces

Every character has a face of their own, and **two eyes**. The head used to
be turned about fifty degrees, so every face had one eye crammed against the
edge and a blank oval beside it. It is turned about twenty-five degrees now
and both eyes are drawn — a near one and a narrower far one.

Each eye is an almond with a shaded inner corner, an iris built from a lit
centre through a saturated middle to a dark rim, a hard pupil, a bright
catchlight and a dimmer bounce, the upper lid casting across the top, a lash
line, a lit lower lid and a crease. The lash line is the hardest, darkest
line on the face on purpose — it is what still reads when the whole head is
thirty pixels tall.

The **nose** sits in the middle third of the face, starting between the eyes
rather than at the brow: a shadowed side, a short lit ridge, a ball at the
tip, the shadow it throws onto the lip, and both nostrils close together the
way a real pair sit. Two nostrils rather than one is most of what makes it
read as a nose.

The **mouth** is an upper lip of two lobes with a cupid's bow between them,
the ridges of the philtrum above it, a rounder lower lip shaded top to bottom
with a highlight across it, a line where they meet carrying the expression,
two corners set back into the cheek, and the shadow below that seats the chin.

Around that, one anatomy engine draws jaw and cheekbone structure, an ear on
the silhouette edge, paired brows, facial hair and age lines — and a table of
142 rows tells it what each character looks like:

| | |
| --- | --- |
| iris colour | blue, brown, green, red, gold, white, or a lit glow |
| brow | heavy, normal, thin, arched, angry |
| jaw | square, oval, narrow |
| lips | full, normal, thin |
| facial hair | stubble, goatee, full beard, chin, moustache, mutton chops |
| age | forehead lines and a fold from nose to mouth |
| expression | set, grim, smirk, snarl |

So Superman keeps his spit curl and square jaw, Batman gets the heavy brow
and stubble under the cowl, Lex is bald with a thin brow and forehead lines,
Thor and Aquaman have full beards, Tony Stark has the goatee, Wolverine has
the mutton chops, and Cyclops, Darkseid, Ghost Rider and Sukuna have eyes
that glow.

Hair gets a hairline shadow onto the forehead, strands over the crown and a
thin specular sweep, instead of being one flat colour.

Headgear is drawn on top and says which parts of the face it hides, so a
masked character still shows the jaw, nose and mouth underneath. The helmet
worn by eight characters is a faceplate with two lit slits and a vent; the
cowl slit is an eye shape in a shadowed band.

These are stylised comic and anime faces drawn in code — every pixel is still
canvas drawing with no images anywhere — but each character is recognisably
themselves.

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

Every character has its own passive, and no two share a
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

Unlocks used to be a long haul. They are now **less than half the price** —
between 2,900 and 16,200 credits — and the level gates came down with them, to
level 4, 7 or 11 depending on the version. A version changes the palette only,
so it is a look rather than an advantage.

### Legendary champions and the Trial of Three

Six champions are **legendary** and are not simply there for the taking:
**Doomsday, Brainiac, Galactus, Apocalypse, Jiren** and **Kaguya**. Their roster
cards carry a gold LEGENDARY tag, sit dimmed, and refuse to enter a fight or a
raid until they are earned.

Earning one is the hardest thing in the game. One legend is the challenger each
week, and to take them you must beat them **three times back to back in a single
sitting**. They come back each round higher, tougher and hitting harder, you get
only **a third of your health bar back between rounds**, and losing any round
ends the whole trial.

There is also a floor on who may attempt it: **level 50 and Energised armour**.
Below that the button will not even open.

The difficulty is measured rather than guessed. The cost of a round is
*(their health ÷ your damage) × (their damage ÷ your health)* — how many of your
own health bars it takes to get through them — and since the trial hands back
only a third of a bar twice, the three rounds have to total under about 1.66 for
a champion who plays well and over it for one who does not. Running the real
trial rather than a model:

| Champion | Blocks? | Rounds reached | Trials won |
| --- | --- | --- | --- |
| Level 60, Legendary | yes | 3, 3 | **2 of 2** |
| Level 60, Legendary | no | 2, 2 | 0 of 2 |
| Level 55, Energised | yes | 1, 1 | 0 of 2 |
| Level 55, Energised | no | 0, 0 | 0 of 2 |

That is the shape it should have. A maxed champion who blocks can do it; the
same champion mashing attack cannot get past round two; and a champion five
levels short cannot do it at all. **Being strong is not enough on its own — you
have to play well too.**

The first attempt at this was simply impossible, which is a different thing from
hard. Round one alone cost a level-40 champion 1.77 health bars even playing
properly, and rounds two and three scaled up from there. It took measuring every
round to find that out; the win-or-lose result alone would only have said "you
lost again".

Losing costs nothing but time — you keep a consolation payment and can start the
trial again immediately.

### The Owner's Key

The home screen carries an admin panel for the person who owns the game:

- **Unlock every version** — all 58 alternate costumes across the roster.
- **Unlock every legendary** — all six, without playing the events.
- **1,000,000 credits** — a pile to spend however you like.
- **Max this champion** — the selected champion to level 60, Legendary armour
  and every one of their versions.
- **Max every champion** — all 148 at once, level 60, Legendary armour, every
  version. It asks first.
- **Wipe the save** — start again from nothing. It asks first.

And four switches that stay on until you turn them off:

| | |
| --- | --- |
| Can't be beaten | you take a tenth of all damage |
| One-punch mode | your hits land ten times harder |
| Super move always ready | your meter refills the moment you spend it |
| Always fight | pick one champion to face every time instead of a random one |

The switches only ever work in your favour -- the same switch never helps
whoever you are fighting. And whenever any of them is running the arena shows a
gold **OWNER** badge in the corner, so a win is never quietly a switch's win
rather than yours.

Everything the panel does is written straight to the save, so it survives a
reload.

### Codes

Every power also has a word. Type one into the box on the home screen, or just
**type it on the keyboard** anywhere on that screen and it fires -- which is the
whole appeal. Typing `CODES` reveals the list inside the game.

| Code | What it does |
| --- | --- |
| `SKYFORGE` | unlocks absolutely everything at once |
| `KRYPTON` | a million credits |
| `WARDROBE` | every costume on every champion |
| `LEGENDS` | every legendary champion |
| `ASCEND` | maxes the champion you have selected |
| `PANTHEON` | maxes all 148 champions |
| `MANOFSTEEL` | you take a tenth of all damage |
| `ONEPUNCH` | your hits land ten times harder |
| `FULLPOWER` | your super move is always ready |
| `BIGHEAD` | everybody fights with an enormous head |
| `BULLETTIME` | the whole fight runs in slow motion |
| `MIRROR` | you always fight a copy of yourself |

The last six are switches: type the code again to turn it off, and they survive
closing the tab. A word that is not a code says so and changes nothing.

One honest note: these are **not secrets**. They are plain text inside the page,
so anyone who opens the source can read them. That is completely fine for a game
only you play -- but it is worth knowing that a code in a game running on your
own computer can never really be hidden, which is why real games keep anything
that matters on a server instead.

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

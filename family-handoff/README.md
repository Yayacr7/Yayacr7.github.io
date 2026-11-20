# Family Handoff

**Know who's doing what.** A shared household plan where every responsibility
(school pickup, appointment, grocery run, permission slip) has one clear status,
and nothing counts as covered until the person says yes.

> **Status: local demonstration mode.** Saved only in this browser, with no real
> sign-in and nothing sent to a server. Open it at `/family-handoff/`.
> A real shared household needs the backend described at the end.

## The one rule everything follows

An ask is not a yes.

| Status | Meaning | Color |
|---|---|---|
| Still needs someone | Nobody has accepted it | Coral, dashed "?" avatar |
| Waiting for an answer | Someone was asked, no answer yet | Purple, ringed avatar |
| Accepted | A named person said yes | Mint, their avatar |
| Done | Marked done (and by whom) | Grey, struck through |

Every status also has an icon and words, so color is never the only signal.

- **Handoff:** if plans change, the person doing it (or an adult) asks someone
  else. The first person **stays responsible until the new person accepts**. If
  the new person says no, nothing moves.
- **Nobody accepts for someone else**, not even an admin.
- **Changing the date or time** of an accepted item sends it back to that person
  to confirm again.
- **"I can't do it"** puts it back in *Still needs someone* and tells the
  household.
- **Notifications are not read receipts.** The app never says "seen". Only an
  answer counts.
- **History can't be edited or deleted**, so everyone sees the same story.

## Screen map

```
Welcome ── Try sample household / Start my own / Join with code
   │
Bottom tabs:  Today · Calendar · (+) Add · Handoffs · Household
   │
   ├─ Today ........ headline sentence, 3 tiles (needs someone / waiting / covered),
   │                 gentle reminders, "Asked of you" (Accept / I can't),
   │                 "Still needs someone" (next 7 days), today's timeline
   ├─ Calendar ..... month grid with status dots, day list, add on a day
   ├─ Add .......... what, type, date/time, who (nobody yet / me / a person),
   │                 note, details, checklist, repeat
   ├─ Task detail .. status sentence + only the actions you're allowed,
   │                 details, checklist, files, append-only history
   ├─ Handoffs ..... For you / You asked / Others (unanswered requests)
   └─ Household .... people + roles, invites (codes), permissions table,
                     → Notifications (reminders, quiet hours, what to tell me)
                     → Inbox  → Household plan (pricing test)  → About / safety
Header: household name, inbox bell, "Viewing as" (demo-only person switcher)
```

## Roles

| | Admin | Adult | Teen | Child |
|---|---|---|---|---|
| See the whole plan | Yes | Yes | Yes | Only their own |
| Add a responsibility | Yes | Yes | Yes | No |
| Ask someone to take it | Yes | Yes | Their own | Their own |
| Accept / decline what's offered to them | Yes | Yes | Yes | Yes |
| Accept on behalf of someone else | No | No | No | No |
| Edit or cancel any | Yes | Yes | Ones they added | No |
| Take pickups and appointments | Yes | Yes | Yes | No |
| Invite people | Yes | Yes | No | No |
| Change roles, remove people | Yes | No | No | No |

A household always keeps at least one admin. Removing a person sends anything
they had accepted back to *Still needs someone*.

## Files

- `core.js`: the rules engine. Pure functions, no browser APIs. Every change goes through
  `dispatch(state, actorId, action, now)`, which checks the permission and the
  task's revision number and returns `{ok, state}` or `{ok:false, code, error}`.
- `demo.js`: the sample household (made-up names), built only through `dispatch`.
- `store.js`: demo storage. Uses localStorage, a Web Lock so two tabs can't overwrite each other, and
  the `storage` event so other tabs update straight away.
- `app.js`, `app.css`, `index.html`: the interface.
- `tests/core-test.js`: 144 rules checks. `tests/browser-test.js`: 121 checks with real clicks and typing,
  two tabs as two people, 4 screen sizes, blocked storage, and an axe accessibility scan.

```
node family-handoff/tests/core-test.js
npx http-server -p 8765 -c-1 .        # from the repo root, in another terminal
AXE_PATH=/path/to/axe.min.js node family-handoff/tests/browser-test.js
```

## Conflicting updates

Each responsibility has a revision number (`rev`). Every action sends the `rev`
the person was looking at. If someone else changed it first, the action is
refused with a plain message ("This changed while you were looking: Sam took
this.") and the latest version is shown. Examples that are tested:

- Two people tap "I'll take it" at once: the first wins; the second sees "Sam is already doing this."
- An edit made on an old screen after someone accepted: refused; in the edit
  sheet your typed changes are kept so you can save them on top of the latest version.
- Accepting a request that was withdrawn or moved to someone else: refused.
- Double-tapping Accept: one acceptance, no duplicate history.
- Checklist ticks and files do not change `rev`, so they never cause false conflicts.

## What a real shared version needs (not built here)

1. **Accounts:** real sign-in for each adult (email link or passkey).
   Child accounts are created and managed by a parent, with minimal data and
   parental consent (COPPA-style rules apply in the US).
2. **Server-side rules:** run `core.js` (or a port of it) on the server. The
   client sends `{taskId, rev, action}` and the server takes `actorId` from the
   session, never from the client. Revision checks are done in one transaction:
   `UPDATE tasks SET ... , rev = rev + 1 WHERE id = $1 AND rev = $2`, and if 0
   rows changed, return a conflict.
3. **Storage:** households, members (role per household), invites (hashed
   code, expiry, single use), tasks, task_events (append-only history),
   notifications. Row-level security so a member can only read their own
   household, and a child only rows that involve them.
4. **Sync:** push changes to open apps (WebSocket or a hosted realtime database).
5. **Notifications:** Web Push / APNs / FCM for requests and gentle reminders,
   respecting quiet hours. Still never show "seen".
6. **Invites:** send by link; the link only opens a join screen after sign-in.

No location tracking, no public profiles, no rankings or streaks between family
members.

## Business model to test

One optional **household** subscription ("Household Plus"), not per person.
The free plan keeps everything needed to coordinate: unlimited responsibilities and
people, ask/accept/decline/handoff, Still needs someone, calendar, history and roles.
Plus ideas: cloud attachments, repeating items with no end date, two-way
calendar sync, shared household notes. **Price not set. Nothing is charged or limited.**

## Safety

Family Handoff is a planning tool. It is not an emergency service and it cannot
guarantee a child's safety or that anyone will show up. For anything urgent,
call the person directly. In an emergency, call your local emergency number.

## Known limits of this demo

- No real sign-in: "Viewing as" lets anyone act as anyone (demo only).
- Data lives in one browser. Two tabs sync; two phones do not.
- Repeating items are created for the next 2 weeks (daily), 10 weekdays, or 8 weeks (weekly).
- Reminders only appear inside the app while it is open.
- Files up to 400 KB, 3 per item, kept in this browser.
- Tested in Chromium only (iPhone/iPad/Android sizes simulated), not on real Safari, a real phone, or with real families.

# Design notes

- **Pitch model:** `d = octave*7 + letter` (C=0..B=6). Staff y-position is linear in `d`, one half-gap per step.
  Bottom line: G2 (d=18) in bass clef, E4 (d=30) in treble clef.
- **Learning path:** `CL[clef].path` in `app/app.js` is the unlock order. A fast answer (<3 s) earns 2 progress points, a slow one 1;
  the "unlock speed" setting (1/3/5) is the threshold. A wrong answer resets progress.
- **Staff first:** the first 9 notes of each path are the ones on the five lines and spaces; the rest (ledger lines and the
  spaces just above/below the staff) follow, nearest first. They open one at a time: the next one opens only when every note
  that is open has >= 3 answers and an average accuracy (lifetime + recent) >= 90%. A newly opened note has no answers, so it
  has to be practised up to 90% before the following one. `S.ext[clef]` counts how many outside-staff notes are open.
- **Note selection:** weighted random by weakness (low accuracy, slow average), newest unlocked note boosted, no immediate repeat.
- **Score:** `10 + speed bonus (0..10)`, multiplied by x1.0 to x3.0 by streak (every 5 correct adds 0.5). Hints earn nothing.
- **Storage:** everything lives in `localStorage` under `learnote.v1`.
- **Analytics:** GA4 loaded from `app/config.js` only when a valid ID is set. Users can opt out in Settings.
- **Offline:** `app/sw.js` is network-first with cache fallback.

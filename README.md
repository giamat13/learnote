# קוראים תווים · Learnote

A free, offline-capable web app for learning to read music notes, with note names in **Hebrew** (דו רה מי פה סול לה סי).
Built for the bass clef first, with treble clef support too. No build step, no dependencies.

## Features

- Bass clef, treble clef, or both, drawn on a real staff with ledger lines
- **Learning path:** start with one note; fast correct answers unlock the next
- Chain mode, 60-second sprint, "find the note on the staff", free practice
- Points, streak multiplier, levels, badges, per-question timer (optional limit)
- Per-note accuracy and speed stats, daily streak
- Sound (Web Audio), installable PWA, works offline
- Optional Google Analytics 4 (off until you set an ID, and users can opt out)

## Run locally

```bash
cd app
python -m http.server 8080
# open http://localhost:8080
```

On a phone on the same Wi-Fi, open `http://<your-computer-ip>:8080`.

## Deploy

`app/` is a static site. Publish that folder with GitHub Pages, Netlify, Vercel, or any static host.
Install-to-home-screen and offline mode need HTTPS.

## Google Analytics

Edit `app/config.js` and replace `G-XXXXXXXXXX` with your GA4 Measurement ID.
Events sent: `app_open`, `screen_view`, `mode_start`, `answer`, `note_unlocked`, `level_up`,
`badge_earned`, `sprint_end`, `session_end`, and a few more. No personal data is sent.

## Project layout

```
app/      the static site (index.html, app.js, style.css, sw.js, manifest, icons)
tools/    scripts that generate glyphs.js and the PNG icons
docs/     design notes
```

## Regenerating assets

```bash
pip install fonttools pillow
# download NotoMusic-Regular.ttf from https://github.com/google/fonts (ofl/notomusic)
python tools/make_glyphs.py NotoMusic-Regular.ttf app/glyphs.js
python tools/make_icons.py app
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Ideas: accidentals (sharps/flats), alto clef, piano-key input, more languages.

## License

[MIT](LICENSE) © GIAMAT13. Clef outlines come from Noto Music (SIL OFL 1.1), see [NOTICE.md](NOTICE.md).

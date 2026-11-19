# Contributing

Thanks for helping! This is a plain HTML/CSS/JS project with no build step.

1. Fork and clone the repo.
2. Run it: `cd app && python -m http.server 8080`.
3. Make your change in `app/`. Keep it dependency-free.
4. Test in a phone-sized viewport (about 390x844), in light and dark mode.
5. If you change files that must be cached offline, bump `V` in `app/sw.js`.
6. Open a pull request describing what changed and why.

## Guidelines

- UI text is Hebrew and right-to-left. The staff is drawn left-to-right.
- Notes use a diatonic index `d = octave*7 + letter` (C=0). See the top of `app/app.js`.
- Never send personal data to analytics. Respect the opt-out setting.

## Reporting bugs

Open an issue with your device, browser, and steps to reproduce.

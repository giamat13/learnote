(() => {
'use strict';

const VER = '1.0.0';

/* ============ music model ============ */
const NAMES = ['דו', 'רה', 'מי', 'פה', 'סול', 'לה', 'סי'];
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const SEMI = [0, 2, 4, 5, 7, 9, 11];
// d = diatonic index = octave*7 + letter (C=0). bd = bottom staff line.
const CL = {
  bass: {
    name: 'מפתח פה (בס)', short: 'פה', bd: 18, min: 14, max: 30,
    path: [24, 28, 18, 26, 22, 20, 23, 21, 25, 19, 29, 30, 17, 16, 15, 14],
    lines: 'סול · סי · רה · פה · לה', spaces: 'לה · דו · מי · סול', hand: 'בפסנתר: יד שמאל',
  },
  treble: {
    name: 'מפתח סול', short: 'סול', bd: 30, min: 26, max: 40,
    path: [32, 28, 30, 38, 34, 36, 31, 33, 35, 37, 29, 39, 40, 27, 26],
    lines: 'מי · סול · סי · רה · פה', spaces: 'פה · לה · דו · מי', hand: 'בפסנתר: יד ימין',
  },
};
const letterOf = (d) => ((d % 7) + 7) % 7;
const octaveOf = (d) => Math.floor(d / 7);
const midiOf = (d) => 12 * (octaveOf(d) + 1) + SEMI[letterOf(d)];
const freqOf = (m) => 440 * Math.pow(2, (m - 69) / 12);
const nm = (d) => NAMES[letterOf(d)];
const sci = (d) => LETTERS[letterOf(d)] + octaveOf(d);
const rangeOf = (clef, ext) => {
  const c = CL[clef]; const lo = ext ? c.min : c.bd, hi = ext ? c.max : c.bd + 8;
  const a = []; for (let d = lo; d <= hi; d++) a.push(d); return a;
};

/* ============ storage ============ */
const KEY = 'learnote.v1';
const DEF = () => ({
  clef: 'bass',
  settings: { sound: true, autoplay: false, analytics: true, hints: true, letters: false, range: 'extended', speed: 3, qtime: 0 },
  badges: {},
  path: { bass: { n: 1, pts: 0, done: false }, treble: { n: 1, pts: 0, done: false } },
  stats: { bass: {}, treble: {} },
  totals: { answers: 0, correct: 0, bestStreak: 0, days: [], sessions: 0, score: 0, time: {} },
  hist: { daily: {}, sess: [], conf: { bass: {}, treble: {} }, modes: {}, hours: new Array(24).fill(0), fastest: null },
  chainBest: { bass: 1, treble: 1 },
  sprintBest: { bass: 0, treble: 0, both: 0 },
});
const merge = (a, b) => {
  for (const k in b) {
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') merge(a[k], b[k]);
    else a[k] = b[k];
  }
  return a;
};
const load = () => { try { const j = JSON.parse(localStorage.getItem(KEY)); if (j) return merge(DEF(), j); } catch (e) {} return DEF(); };
let S = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
const today = () => { const t = new Date(); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); };
const markDay = () => { const t = today(); const ds = S.totals.days; if (ds[ds.length - 1] !== t) { ds.push(t); if (ds.length > 400) ds.shift(); } };
/* ============ active practice time ============
   Counts only time the user is really doing something: the gap between two interactions counts when it is
   at most IDLE_MS (30 s) and the page is visible. Longer gaps (away from the screen) are not counted. */
const IDLE_MS = 30000;
let lastAct = 0, lastTimeSave = 0;
const activity = () => {
  const now = Date.now(), gap = now - lastAct; lastAct = now;
  if (document.visibilityState !== 'visible' || gap <= 0 || gap > IDLE_MS) return;
  const T = S.totals.time || (S.totals.time = {}), k = today();
  T[k] = (T[k] || 0) + gap / 1000; if (G) G.act = (G.act || 0) + gap / 1000;
  if (now - lastTimeSave > 5000) {
    lastTimeSave = now;
    const ks = Object.keys(T); if (ks.length > 400) ks.sort().slice(0, ks.length - 400).forEach((x) => delete T[x]);
    save();
  }
};
['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'].forEach((t) => window.addEventListener(t, activity, { passive: true, capture: true }));
const dayKey = (back) => { const t = new Date(); t.setDate(t.getDate() - back); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); };
const secOn = (k) => (S.totals.time && S.totals.time[k]) || 0;
const fmtT = (sec) => { const m = Math.round(sec / 60); return sec < 60 ? Math.round(sec) + ' שנ׳' : m < 60 ? m + ' דק׳' : Math.floor(m / 60) + ' ש׳ ' + (m % 60 ? (m % 60) + ' דק׳' : ''); };
const timeReport = (n = 14) => {
  const rows = []; let tot = 0, act = 0;
  for (let i = n - 1; i >= 0; i--) { const k = dayKey(i), v = secOn(k); tot += v; if (v >= 30) act++; rows.push(`${k.split('-').reverse().join('/')}  ${v >= 30 ? fmtT(v) : '—'}`); }
  return `דוח תרגול · קוראים תווים\n(זמן פעיל בלבד, הפסקה מעל 30 שניות לא נספרת)\n\n${rows.join('\n')}\n\nסה״כ ${n} ימים: ${fmtT(tot)}${act ? ` · ממוצע ביום תרגול: ${fmtT(tot / act)}` : ''}`;
};

const dayStreak = () => {
  const ds = S.totals.days; if (!ds.length) return 0;
  const one = 86400000; const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
  let streak = 0, cur = parse(today());
  if (ds[ds.length - 1] !== today()) cur -= one; // allow "yesterday" as not-yet-broken
  for (let i = ds.length - 1; i >= 0; i--) { if (parse(ds[i]) === cur) { streak++; cur -= one; } else if (parse(ds[i]) < cur) break; }
  return streak;
};

/* ============ analytics (GA4, opt-out) ============ */
const track = (name, params) => {
  if (!S.settings.analytics || typeof window.gtag !== 'function') return;
  try { window.gtag('event', name, Object.assign({ app_version: VER }, params || {})); } catch (e) {}
};
const applyConsent = () => {
  if (typeof window.gtag === 'function') window.gtag('consent', 'update', { analytics_storage: S.settings.analytics ? 'granted' : 'denied' });
};

/* ============ audio ============ */
let AC;
const ac = () => {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (AC && AC.state === 'suspended') AC.resume();
  if (AC) loadPiano(AC);
  return AC;
};
let NOISE = null;
const noiseBuf = (c) => {
  if (!NOISE || NOISE.sampleRate !== c.sampleRate) {
    NOISE = c.createBuffer(1, Math.floor(c.sampleRate * 0.04), c.sampleRate);
    const ch = NOISE.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  }
  return NOISE;
};
// Piano-like tone: stacked sine partials (upper ones slightly sharp, as on a real string),
// each decaying faster than the one below; two detuned strings on the lowest partials;
// a soft hammer click; and a low-pass that closes as the note fades.
// Phone speakers barely reproduce anything below ~300 Hz, so low notes lean on their upper partials
// (the ear still hears the pitch of the missing fundamental) and the filter never closes below 1.5 kHz.
const playNote = (d, dur = 0.8, vol = 0.3) => {
  if (!S.settings.sound) return;
  const c = ac(); if (!c) return;
  // a context that is still suspended (phones) has a frozen clock: start only once it is running
  const go = () => { if (!sampled(c, c.destination, d, dur, vol)) voice(c, c.destination, d, dur, vol); };
  if (c.state === 'running') go(); else c.resume().then(go).catch(() => {});
};
// Real piano: Salamander Grand Piano samples (one every 3 semitones, A1..C6), pitch-shifted to the
// nearest note. Until they have loaded (or if loading fails) the synthesized voice below is used.
const PIANO = ['A1', 'C2', 'Ds2', 'Fs2', 'A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4', 'A4', 'C5', 'Ds5', 'Fs5', 'A5', 'C6'];
const PBUF = []; let pianoLoading = false;
const loadPiano = (c) => {
  if (pianoLoading || !window.fetch) return; pianoLoading = true;
  PIANO.forEach((n, i) => fetch('piano/' + n + '.mp3').then((r) => r.arrayBuffer())
    .then((ab) => new Promise((ok, no) => c.decodeAudioData(ab, ok, no))).then((b) => { PBUF[i] = b; }).catch(() => {}));
};
const sampled = (c, dest, d, dur, vol) => {
  const m = midiOf(d), i = Math.max(0, Math.min(PIANO.length - 1, Math.round((m - 33) / 3)));
  const buf = PBUF[i]; if (!buf) return false;
  const t = c.currentTime, src = c.createBufferSource(), g = c.createGain();
  src.buffer = buf; src.playbackRate.value = Math.pow(2, (m - (33 + i * 3)) / 12);
  const end = t + Math.max(1.2, dur * 2.2);
  g.gain.setValueAtTime(vol * 4.5, t); g.gain.setTargetAtTime(0, end, 0.12);
  src.connect(g); g.connect(dest); src.start(t); src.stop(end + 0.7);
  return true;
};
// Short room impulse (decaying noise): the dry synth alone sounds like a plucked string; a little
// soundboard/room tail is what makes it read as a piano.
let IR = null;
const irBuf = (c) => {
  if (!IR || IR.sampleRate !== c.sampleRate) {
    const n = Math.floor(c.sampleRate * 0.9); IR = c.createBuffer(1, n, c.sampleRate);
    const ch = IR.getChannelData(0); let lp = 0;
    for (let i = 0; i < n; i++) { lp += 0.35 * ((Math.random() * 2 - 1) - lp); ch[i] = lp * Math.exp(-i / (c.sampleRate * 0.16)); }
  }
  return IR;
};
// Piano model: hammer strikes at ~1/7.5 of the string (shapes the partial amplitudes), stretched partials
// (inharmonicity), 2-3 slightly detuned strings per key on the lowest partials (beating), a two-stage decay
// (fast drop, then a long quiet ring), upper partials that arrive a few ms later and die sooner, a closing
// low-pass and a soft hammer click. Low notes lean on their upper partials so phone speakers can play them.
const voice = (c, dest, d, dur, vol) => {
  const t = c.currentTime, m = midiOf(d), f0 = freqOf(m);
  const pos = Math.max(0, Math.min(1, (m - 36) / 60)); // 0 = low register .. 1 = high
  const out = c.createGain(); out.connect(dest);
  const wet = c.createGain(); wet.gain.value = 0.2; const room = c.createConvolver(); room.buffer = irBuf(c);
  out.connect(room); room.connect(wet); wet.connect(dest);
  const body = c.createBiquadFilter(); body.type = 'lowpass';
  body.frequency.setValueAtTime(Math.min(9000, Math.max(4000, f0 * 18)), t);
  body.frequency.setTargetAtTime(Math.min(4000, Math.max(1800, f0 * 7)), t, 0.35);
  body.connect(out);
  const B = 0.00012 + 0.0009 * (1 - pos); // lower strings are stiffer: more stretched partials
  const N = Math.max(6, Math.min(14, Math.floor(7000 / f0)));
  const small = (fk) => (fk < 150 ? 0.3 : fk < 260 ? 0.3 + 0.7 * (fk - 150) / 110 : 1);
  const amps = [];
  for (let k = 1; k <= N; k++) amps.push((Math.abs(Math.sin(Math.PI * k / 7.5)) + 0.05) / Math.pow(k, 0.9) * small(k * f0));
  const sum = amps.reduce((a, b) => a + b, 0), len = 0.7 + dur * 0.4;
  amps.forEach((a, i) => {
    const k = i + 1, fk = k * f0 * Math.sqrt(1 + B * k * k);
    if (fk > 15000) return;
    const tA = t + 0.003 + 0.0015 * k;
    const Tf = 0.22 / (1 + 0.45 * (k - 1)), Ts = (0.45 + 0.55 * (1 - pos)) * len / (1 + 0.3 * (k - 1));
    const life = (tA - t) + 3 * Tf + 4.6 * Ts + 0.05;
    const cents = k === 1 ? (pos > 0.35 ? [-1.8, 0, 1.6] : [-1.2, 1.2]) : k === 2 ? [-1, 1] : [0];
    cents.forEach((ct) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = fk * Math.pow(2, ct / 1200);
      const peak = (vol * 2.2 * a / sum) / cents.length;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, tA);
      g.gain.setTargetAtTime(peak * 0.5, tA, Tf);        // fast drop to about half...
      g.gain.setTargetAtTime(0, tA + 3 * Tf, Ts);         // ...then the long quiet ring
      o.connect(g); g.connect(body);
      o.start(t); o.stop(t + life);
    });
  });
  const hammer = c.createBufferSource(); hammer.buffer = noiseBuf(c);
  const bp = c.createBiquadFilter(); bp.type = 'bandpass';
  bp.frequency.value = Math.min(4000, Math.max(1200, f0 * 24)); bp.Q.value = 1.2;
  const hg = c.createGain();
  hg.gain.setValueAtTime(vol * 0.3, t); hg.gain.setTargetAtTime(0, t, 0.01);
  hammer.connect(bp); bp.connect(hg); hg.connect(out);
  hammer.start(t); hammer.stop(t + 0.05);
};
const buzz = (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };

/* ============ staff drawing ============ */
const BY = 150, GAP = 16, STEP = 8; // bottom line y, line gap, half-gap
const GL = {
  bass: { top: 86, bot: 138, x: 12 },
  treble: { top: 40, bot: 176, x: 12 },
};
const clefGlyph = (clef) => {
  const g = window.GLYPH && window.GLYPH[clef]; if (!g) return '';
  const [x0, y0, , y1] = g.b; const p = GL[clef];
  const s = (p.bot - p.top) / (y1 - y0);
  return `<path class="clef" transform="translate(${(p.x - x0 * s).toFixed(2)} ${(p.bot + y0 * s).toFixed(2)}) scale(${s.toFixed(5)} ${(-s).toFixed(5)})" d="${g.d}"/>`;
};
const noteSVG = (clef, it) => {
  const bd = CL[clef].bd, Y = (d) => BY - (d - bd) * STEP;
  const { d, x } = it, y = Y(d);
  let g = '';
  const led = (yy) => `<line class="sl" x1="${x - 17}" x2="${x + 17}" y1="${yy}" y2="${yy}"/>`;
  for (let k = bd - 2; k >= d; k -= 2) g += led(Y(k));
  for (let k = bd + 10; k <= d; k += 2) g += led(Y(k));
  g += `<ellipse class="nh" cx="${x}" cy="${y}" rx="10" ry="7.2" transform="rotate(-20 ${x} ${y})"/>`;
  if (it.stem !== false) {
    g += d < bd + 4
      ? `<line class="st" x1="${x + 9}" x2="${x + 9}" y1="${y - 2}" y2="${y - 50}"/>`
      : `<line class="st" x1="${x - 9}" x2="${x - 9}" y1="${y + 2}" y2="${y + 50}"/>`;
  }
  if (it.label) g += `<text class="lb" x="${x}" y="${it.ly || 214}" text-anchor="middle">${it.label}</text>`;
  const tap = it.tap ? `<rect class="tapzone" x="${x - 22}" y="${y - 18}" width="44" height="36"/>` : '';
  return `<g class="n ${it.cls || ''}"${it.id ? ` id="${it.id}"` : ''}${it.tap ? ` data-tone="${d}"` : ''}>${tap}${g}</g>`;
};
const staffSVG = (clef, items, o = {}) => {
  const W = o.vb ? o.vb[2] : 400, H = o.h || 224, bd = CL[clef].bd, Y = (d) => BY - (d - bd) * STEP;
  const vb = o.vb || [0, 0, W, H];
  let s = `<svg class="staff${o.cls ? ' ' + o.cls : ''}" viewBox="${vb.join(' ')}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="חמשה">`;
  for (let i = 0; i < 5; i++) s += `<line class="sl" x1="6" x2="${W - 6}" y1="${BY - i * GAP}" y2="${BY - i * GAP}"/>`;
  s += `<line class="sl" x1="6" x2="6" y1="${BY - 4 * GAP}" y2="${BY}"/>`;
  s += clefGlyph(clef);
  if (o.hits) for (const d of o.hits) s += `<circle class="guide" cx="${W - 12}" cy="${Y(d)}" r="2.5"/>`;
  for (const it of items) s += noteSVG(clef, it);
  return s + '</svg>';
};

/* ============ state ============ */
const root = document.getElementById('root');
const modalEl = document.getElementById('modal');
let view = 'home';
let statsTab = 'bass';
let G = null;
let deferredPrompt = null;
let timer = null;
let qt = null;

const $ = (id) => document.getElementById(id);
const isLoc = () => !!(G && G.q && G.q.loc); // current question is a 'find it on the staff' one
const pickClef = () => (S.clef === 'both' ? (Math.random() < 0.5 ? 'bass' : 'treble') : S.clef);
const needPts = () => Number(S.settings.speed) || 3;

/* ============ score, levels, badges ============ */
const levelOf = (s) => Math.floor(Math.sqrt(s / 60)) + 1;
const lvlStart = (L) => 60 * (L - 1) * (L - 1);
const maxOf = (o) => Math.max(...Object.values(o));
const BADGES = [
  ['first', '🌱', 'התחלה', 'תשובה נכונה ראשונה', () => S.totals.correct >= 1],
  ['fast', '⚡', 'ברק', 'תשובה נכונה תוך פחות משנייה', (x) => x.ok && x.ms < 1000],
  ['s10', '🔥', 'רצף 10', '10 תשובות נכונות ברצף', () => S.totals.bestStreak >= 10],
  ['s25', '🚀', 'רצף 25', '25 תשובות נכונות ברצף', () => S.totals.bestStreak >= 25],
  ['bass8', '🎼', 'חצי מסלול פה', '8 תווים פתוחים במפתח פה', () => S.path.bass.n >= 8],
  ['bassAll', '🏆', 'אלוף מפתח פה', 'כל תווי מפתח פה', () => S.path.bass.done],
  ['trebleAll', '🥇', 'אלוף מפתח סול', 'כל תווי מפתח סול', () => S.path.treble.done],
  ['chain5', '🔗', 'שרשרת 5', 'שרשרת של 5 תווים', () => maxOf(S.chainBest) >= 5],
  ['chain8', '⛓️', 'שרשרת 8', 'שרשרת של 8 תווים', () => maxOf(S.chainBest) >= 8],
  ['sprint20', '⏱', 'ספרינטיסט', '20 נכונות בספרינט', () => maxOf(S.sprintBest) >= 20],
  ['sprint40', '🏅', 'ספרינט מהיר', '40 נכונות בספרינט', () => maxOf(S.sprintBest) >= 40],
  ['days3', '📅', '3 ימים', 'תרגול 3 ימים ברצף', () => dayStreak() >= 3],
  ['days7', '🗓️', 'שבוע', 'תרגול 7 ימים ברצף', () => dayStreak() >= 7],
  ['pts1000', '💎', '1000 נקודות', 'צברת 1000 נקודות', () => S.totals.score >= 1000],
];
function toast(t) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = t; el.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2400);
}
function checkBadges(ctx) {
  for (const [id, icon, name, , test] of BADGES) {
    if (S.badges[id]) continue;
    let got = false; try { got = test(ctx || {}); } catch (e) {}
    if (got) { S.badges[id] = today(); toast(`${icon} הישג חדש: ${name}`); track('badge_earned', { badge: id }); }
  }
}
function award(ms, hinted) {
  if (hinted) return 0;
  const speed = Math.max(0, Math.round((3000 - ms) / 300)); // 0..10
  const mult = 1 + Math.min(2, Math.floor(G.streak / 5) * 0.5); // x1 .. x3
  const p = Math.round((10 + speed) * mult);
  const before = levelOf(S.totals.score);
  G.score += p; S.totals.score += p;
  const after = levelOf(S.totals.score);
  if (after > before) { toast(`⬆️ עלית לרמה ${after}!`); track('level_up', { level: after }); }
  return p;
}

/* ============ screens ============ */
const go = (v) => {
  stopGame(); view = v; render(); window.scrollTo(0, 0);
  track('screen_view', { screen_name: v });
};

const render = () => {
  if (view === 'home') root.innerHTML = homeHTML();
  else if (view === 'ref') root.innerHTML = refHTML();
  else if (view === 'stats') root.innerHTML = statsHTML();
};

const clefsShown = () => (S.clef === 'both' ? ['bass', 'treble'] : [S.clef]);

// weakest practised notes across the clefs in use (shared by home, sprint summary and the weak-spots mode)
function weakNotes(limit = 3) {
  const rows = [];
  for (const c of clefsShown()) for (const [d, x] of Object.entries(S.stats[c])) if (x.n >= 3) rows.push({ d: Number(d), x, a: (x.ok / x.n + (x.e == null ? x.ok / x.n : x.e)) / 2 });
  return rows.filter((r) => r.a < 0.85).sort((a, b) => a.a - b.a).slice(0, limit);
}

function homeHTML() {
  const seg = [['bass', 'מפתח פה (בס)'], ['treble', 'מפתח סול'], ['both', 'שניהם']]
    .map(([k, t]) => `<button class="${S.clef === k ? 'on' : ''}" data-act="clef" data-v="${k}">${t}</button>`).join('');
  const prog = clefsShown().map((c) => {
    const n = S.path[c].n, len = CL[c].path.length;
    const chips = CL[c].path.map((d, i) => `<span class="chip ${i < n ? 'on' : ''}">${i < n ? nm(d) : '·'}</span>`).join('');
    return `<div class="card"><b>${CL[c].name}</b> <small>· ${n} מתוך ${len} תווים פתוחים</small><div class="chips">${chips}</div></div>`;
  }).join('');
  const acc = S.totals.answers ? Math.round((S.totals.correct / S.totals.answers) * 100) : 0;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone;
  const inst = deferredPrompt
    ? `<button class="ghost" style="width:100%;margin-top:12px" data-act="install">📲 התקנה על מסך הבית</button>`
    : ios ? `<p style="text-align:center"><small>להתקנה באייפון: כפתור שיתוף ← "הוסף למסך הבית"</small></p>` : '';
  const L = levelOf(S.totals.score), a = lvlStart(L), b = lvlStart(L + 1);
  const lvl = `<div class="card"><div style="display:flex;justify-content:space-between"><b>⭐ רמה ${L}</b><small>${S.totals.score} נק׳ · עוד ${b - S.totals.score} לרמה הבאה</small></div>
    <div class="bar" style="margin:8px 0 0"><i style="width:${Math.round((S.totals.score - a) / (b - a) * 100)}%"></i></div></div>`;
  return `
  <header class="top"><h1>🎼 קוראים תווים</h1><button class="icon" data-act="settings" aria-label="הגדרות">⚙️</button></header>
  <div class="seg">${seg}</div>
  ${lvl}
  <div class="stat-row">
    <div><b>🔥 ${dayStreak()}</b><small>ימים ברצף</small></div>
    <div><b>${acc}%</b><small>דיוק כללי</small></div>
    <div><b>${S.totals.answers}</b><small>תשובות</small></div>
    <div><b style="font-size:17px;white-space:nowrap">${fmtT(secOn(today()))}</b><small>⏱ תרגול היום</small></div>
  </div>
  ${prog}
  ${weakNotes().length ? `<div class="card"><b>כדאי לחזק</b><div class="chips">${weakNotes().map((r) => `<span class="chip" style="color:var(--bad)">${nm(r.d)} ${sci(r.d)}</span>`).join('')}</div></div>` : ''}
  <div class="modes">
    <button class="mode wide" data-act="mode" data-v="path"><b>🧭 מסלול למידה</b><span>מתחילים בתו אחד. כל תשובה נכונה ומהירה פותחת עוד תו.</span></button>
    ${weakNotes().length ? `<button class="mode wide" data-act="mode" data-v="weak"><b>💪 חיזוק חולשות</b><span>רק התווים שמתקשים בהם, בשאלות ובחיפוש על החמשה.</span></button>` : ''}
    <button class="mode" data-act="mode" data-v="chain"><b>🔗 שרשרת</b><span>כל הצלחה מוסיפה עוד תו לרצף.</span></button>
    <button class="mode" data-act="mode" data-v="sprint"><b>⏱ ספרינט</b><span>60 שניות, כמה תוכל?</span></button>
    <button class="mode" data-act="mode" data-v="locate"><b>🎯 מצא על החמשה</b><span>נתנו שם, תלחצ/י על המקום.</span></button>
    <button class="mode" data-act="mode" data-v="free"><b>🎹 תרגול חופשי</b><span>כל התווים, בלי לחץ.</span></button>
    <button class="mode" data-act="ref"><b>📖 מדריך תווים</b><span>כל התווים עם צליל ושמות.</span></button>
    <button class="mode" data-act="stats"><b>📊 התקדמות</b><span>מה חזק ומה צריך חיזוק.</span></button>
  </div>
  ${inst}`;
}

function refHTML() {
  const body = clefsShown().map((c) => {
    const C = CL[c], bd = C.bd;
    const group = (ds, vb) => {
      const step = Math.min(60, 270 / Math.max(ds.length - 1, 1));
      const items = ds.map((d, i) => ({ d, x: 110 + i * step, tap: true, label: nm(d), ly: vb[1] + vb[3] - 8 }));
      return staffSVG(c, items, { vb });
    };
    const lines = [0, 2, 4, 6, 8].map((k) => bd + k), spaces = [1, 3, 5, 7].map((k) => bd + k);
    const ledgers = [];
    for (let d = C.min; d < bd; d++) ledgers.push(d);
    for (let d = bd + 9; d <= C.max; d++) ledgers.push(d);
    const lowL = ledgers.filter((d) => d < bd), highL = ledgers.filter((d) => d > bd);
    const full = [0, 0, 400, 224], crop = [0, 30, 400, 186];
    return `<div class="card ref"><h3>${C.name}</h3><p>${C.hand}</p>
      <b>קווים (מלמטה למעלה)</b><p>${C.lines}</p><div class="stage">${group(lines, crop)}</div>
      <b>רווחים (מלמטה למעלה)</b><p>${C.spaces}</p><div class="stage">${group(spaces, crop)}</div>
      <b>מתחת לחמשה</b><p>קווי עזר</p><div class="stage">${group(lowL, full)}</div>
      <b>מעל החמשה</b><p>קווי עזר</p><div class="stage">${group(highL, full)}</div></div>`;
  }).join('');
  return `<header class="top"><button class="ghost" data-act="home">‹ חזרה</button><h1>📖 מדריך תווים</h1><span style="width:60px"></span></header>
    <p style="text-align:center;color:var(--muted)">לחצו על תו כדי לשמוע אותו</p>${body}`;
}

const MODE_NAME = { path: 'מסלול', chain: 'שרשרת', sprint: 'ספרינט', locate: 'מצא על החמשה', free: 'חופשי', weak: 'חיזוק' };
const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
const dayLabel = (k) => k.slice(8) + '/' + k.slice(5, 7);
function totalsSummary() {
  const H = S.hist, T = S.totals.time || {}, days = Object.values(H.daily);
  const n = days.reduce((a, x) => a + x.n, 0), ok = days.reduce((a, x) => a + x.ok, 0), ms = days.reduce((a, x) => a + x.ms, 0);
  const sec = Object.values(T).reduce((a, x) => a + x, 0), act = Object.values(T).filter((x) => x >= 30).length;
  const ss = H.sess, ssec = ss.reduce((a, x) => a + x.sec, 0);
  return { n, ok, avgMs: ok ? ms / ok : 0, sec, act, sessions: S.totals.sessions, avgSess: ss.length ? ssec / ss.length : 0, avgDay: act ? sec / act : 0 };
}
function moreStatsHTML() {
  const H = S.hist, t = totalsSummary(), T = S.totals.time || {};
  const tile = (b, sm) => `<div class="tile"><b>${b}</b><small>${sm}</small></div>`;
  const overview = `<div class="card"><b>📈 סיכום כללי</b><div class="tiles">
    ${tile(t.act, 'ימי תרגול')}${tile(fmtT(t.sec), 'זמן פעיל כולל')}${tile(fmtT(t.avgDay), 'ממוצע ליום תרגול')}
    ${tile(t.sessions, 'סבבי תרגול')}${tile(fmtT(t.avgSess), 'ממוצע לסבב')}${tile(t.n, 'תשובות')}
    ${tile(pct(t.ok, t.n) + '%', 'דיוק כללי')}${tile(t.avgMs ? (t.avgMs / 1000).toFixed(1) + ' שנ׳' : '—', 'זמן תגובה ממוצע')}${tile(S.totals.bestStreak, 'רצף נכון שיא')}</div></div>`;
  const dd = [...Array(14).keys()].map((i) => { const k = dayKey(13 - i), x = H.daily[k]; return { k, a: x ? pct(x.ok, x.n) : null, n: x ? x.n : 0 }; });
  const acc = `<div class="card"><b>🎯 דיוק לפי יום</b> <small>· 14 ימים אחרונים</small><div class="bars" style="margin-top:10px">${dd.filter((x) => x.n).map((x) => `<div class="brow"><span>${dayLabel(x.k)}</span><div class="track"><i style="width:${Math.max(x.a, 4)}%;background:${x.a >= 85 ? 'var(--ok)' : x.a >= 60 ? 'var(--warm)' : 'var(--bad)'}"></i></div><span class="tm">${x.a}% · ${x.n}</span></div>`).join('') || '<small>עדיין אין נתונים</small>'}</div></div>`;
  const modes = Object.entries(H.modes).sort((a, b) => b[1].n - a[1].n);
  const byMode = `<div class="card"><b>🧩 לפי סוג תרגול</b><div class="bars" style="margin-top:10px">${modes.map(([m, x]) => `<div class="brow"><span>${MODE_NAME[m] || m}</span><div class="track"><i style="width:${Math.max(pct(x.ok, x.n), 4)}%;background:var(--accent)"></i></div><span class="tm">${pct(x.ok, x.n)}% · ${x.n}</span></div>`).join('') || '<small>עדיין אין נתונים</small>'}</div></div>`;
  const hmax = Math.max(1, ...H.hours);
  const hours = `<div class="card"><b>🕒 באילו שעות מתרגלים</b><div class="hbars" dir="ltr">${H.hours.map((v, h) => `<div title="${h}:00 · ${v}"><i style="height:${Math.max(v / hmax * 100, v ? 6 : 2)}%"></i><small>${h % 6 === 0 ? h : ''}</small></div>`).join('')}</div></div>`;
  const conf = [];
  for (const c of clefsShown()) for (const [k, v] of Object.entries(H.conf[c])) { const [a, b] = k.split('>').map(Number); conf.push({ c, a, b, v }); }
  conf.sort((x, y) => y.v - x.v);
  const mist = `<div class="card"><b>🔀 הטעויות הנפוצות</b> <small>· מה בלבלת עם מה</small><div class="chips">${conf.slice(0, 8).map((x) => `<span class="chip" style="color:var(--bad)">${NAMES[x.a]} ← ${NAMES[x.b]} · ${x.v}</span>`).join('') || '<small>עדיין אין טעויות. כל הכבוד</small>'}</div></div>`;
  const bestSec = Object.entries(T).sort((a, b) => b[1] - a[1])[0], bestAns = Object.entries(H.daily).sort((a, b) => b[1].n - a[1].n)[0];
  const f = H.fastest;
  const recs = `<div class="card"><b>🏆 שיאים</b><div class="tiles">
    ${tile(f ? (f.ms / 1000).toFixed(2) + ' שנ׳' : '—', f ? 'התשובה המהירה ' + nm(f.d) : 'התשובה המהירה')}
    ${tile(bestSec ? fmtT(bestSec[1]) : '—', bestSec ? 'יום תרגול ארוך ' + dayLabel(bestSec[0]) : 'יום תרגול ארוך')}
    ${tile(bestAns ? bestAns[1].n : '—', bestAns ? 'הכי הרבה תשובות ' + dayLabel(bestAns[0]) : 'הכי הרבה תשובות')}
    ${tile(Math.max(S.sprintBest.bass || 0, S.sprintBest.treble || 0, S.sprintBest.both || 0), 'ספרינט שיא')}
    ${tile(Math.max(S.chainBest.bass || 1, S.chainBest.treble || 1), 'שרשרת שיא')}${tile(dayStreak(), 'ימים ברצף')}</div></div>`;
  const hist = `<div class="card"><b>🗂️ סבבים אחרונים</b><div class="bars" style="margin-top:10px">${H.sess.slice(-8).reverse().map((x) => { const d = new Date(x.ts); return `<div class="srow"><span>${dayLabel(dayKeyOf(d))} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}</span><span>${MODE_NAME[x.mode] || x.mode}</span><span class="tm">${x.ok}/${x.n} · ${fmtT(x.sec)}</span></div>`; }).join('') || '<small>עדיין אין סבבים</small>'}</div></div>`;
  const data = `<div class="card"><b>💾 שמירה וייצוא</b><small style="display:block;margin:4px 0 8px;color:var(--muted)">הנתונים נשמרים במכשיר הזה בלבד. אפשר לשמור גיבוי או לייצא לאקסל.</small>
    <div class="btnrow"><button class="ghost" data-act="exportJson">⬇️ גיבוי JSON</button><button class="ghost" data-act="exportCsv">📊 ייצוא CSV</button><button class="ghost" data-act="importJson">⬆️ שחזור מגיבוי</button></div>
    <input id="imp" type="file" accept=".json,application/json" hidden></div>`;
  return overview + acc + byMode + hours + mist + recs + hist + data;
}
const dayKeyOf = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const download = (name, text, type) => {
  const u = URL.createObjectURL(new Blob([text], { type })), a = document.createElement('a');
  a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 3000);
};
const csvCell = (v) => { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
const csvRows = (rows) => rows.map((r) => r.map(csvCell).join(',')).join('\n');
function exportCsv() {
  const H = S.hist, T = S.totals.time || {};
  const keys = [...new Set([...Object.keys(H.daily), ...Object.keys(T)])].sort();
  const daily = [['date', 'active_seconds', 'answers', 'correct', 'accuracy_pct', 'avg_response_ms'],
    ...keys.map((k) => { const x = H.daily[k] || { n: 0, ok: 0, ms: 0 }; return [k, Math.round(T[k] || 0), x.n, x.ok, pct(x.ok, x.n), x.ok ? Math.round(x.ms / x.ok) : '']; })];
  const notes = [['clef', 'note', 'hebrew_name', 'answers', 'correct', 'accuracy_pct', 'avg_response_ms']];
  for (const c of ['bass', 'treble']) for (const [d, x] of Object.entries(S.stats[c])) notes.push([c, sci(+d), nm(+d), x.n, x.ok, pct(x.ok, x.n), x.ok ? Math.round(x.t / x.ok) : '']);
  const sess = [['start', 'mode', 'clef', 'answers', 'correct', 'score', 'active_seconds', 'wall_seconds'],
    ...H.sess.map((x) => [new Date(x.ts).toISOString(), x.mode, x.clef, x.n, x.ok, x.score, x.sec, x.wall])];
  const mist = [['clef', 'target_note', 'answered_note', 'count']];
  for (const c of ['bass', 'treble']) for (const [k, v] of Object.entries(H.conf[c])) { const [a, b] = k.split('>').map(Number); mist.push([c, NAMES[a], NAMES[b], v]); }
  const out = '\ufeff# daily\n' + csvRows(daily) + '\n\n# notes\n' + csvRows(notes) + '\n\n# sessions\n' + csvRows(sess) + '\n\n# mistakes\n' + csvRows(mist) + '\n';
  download('learnote-' + today() + '.csv', out, 'text/csv;charset=utf-8');
}
function exportJson() {
  download('learnote-backup-' + today() + '.json', JSON.stringify({ app: 'learnote', version: VER, exported: new Date().toISOString(), data: S }, null, 1), 'application/json');
}
function importJson(file) {
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const j = JSON.parse(fr.result), d = j && j.data;
      if (!j || j.app !== 'learnote' || !d || !d.totals || !d.stats) throw new Error('bad');
      if (!confirm('לשחזר מהגיבוי? ההתקדמות הנוכחית תוחלף.')) return;
      S = merge(DEF(), d); save(); render(); toast('השחזור הושלם ✅');
    } catch (e) { alert('הקובץ אינו גיבוי תקין של האפליקציה.'); }
  };
  fr.readAsText(file);
}

function timeHTML() {
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => ({ k: dayKey(i), v: secOn(dayKey(i)) })).reverse();
  const mx = Math.max(60, ...days.map((x) => x.v)), tot = days.reduce((a, x) => a + x.v, 0);
  const row = (x) => `<div class="brow"><span>${x.k.slice(8)}/${x.k.slice(5, 7)}</span><div class="track"><i style="width:${x.v ? Math.max(x.v / mx * 100, 4) : 0}%;background:var(--accent)"></i></div><span class="tm">${x.v >= 30 ? fmtT(x.v) : '—'}</span></div>`;
  return `<div class="card"><b>⏱ זמן תרגול פעיל</b> <small>· היום ${fmtT(secOn(today()))} · 7 ימים ${fmtT(tot)}</small>
    <div class="bars" style="margin-top:10px">${days.map(row).join('')}</div>
    <small style="display:block;margin-top:8px;color:var(--muted)">נספר רק כשיש פעילות. הפסקה של מעל 30 שניות לא נספרת.</small>
    <button class="ghost" style="width:100%;margin-top:8px" data-act="report">📋 העתקת דוח (14 ימים)</button></div>`;
}

function statsHTML() {
  const shown = clefsShown();
  if (!shown.includes(statsTab)) statsTab = shown[0];
  const tabs = shown.length > 1
    ? `<div class="tabs">${shown.map((c) => `<button class="ghost ${statsTab === c ? 'on' : ''}" data-act="stab" data-v="${c}">${CL[c].name}</button>`).join('')}</div>` : '';
  const c = statsTab, st = S.stats[c];
  const rows = CL[c].path.map((d) => ({ d, s: st[d] || { n: 0, ok: 0, t: 0 } }));
  const bar = (r) => {
    const acc = r.s.n ? r.s.ok / r.s.n : 0;
    const col = !r.s.n ? 'var(--line)' : acc >= 0.85 ? 'var(--ok)' : acc >= 0.6 ? 'var(--warm)' : 'var(--bad)';
    const t = r.s.ok ? (r.s.t / r.s.ok / 1000).toFixed(1) + 'ש׳' : '—';
    return `<div class="brow"><span>${nm(r.d)} <small>${sci(r.d)}</small></span>
      <div class="track"><i style="width:${r.s.n ? Math.max(acc * 100, 4) : 0}%;background:${col}"></i></div><span class="tm">${t}</span></div>`;
  };
  const weak = rows.filter((r) => r.s.n >= 3).sort((a, b) => a.s.ok / a.s.n - b.s.ok / b.s.n).slice(0, 3).filter((r) => r.s.ok / r.s.n < 0.85);
  const weakHTML = weak.length
    ? `<div class="card"><b>כדאי לחזק</b><div class="chips">${weak.map((r) => `<span class="chip" style="color:var(--bad)">${nm(r.d)} ${sci(r.d)}</span>`).join('')}</div></div>` : '';
  const sprint = S.sprintBest[S.clef] || 0;
  return `<header class="top"><button class="ghost" data-act="home">‹ חזרה</button><h1>📊 התקדמות</h1><span style="width:60px"></span></header>
    ${tabs}
    <div class="stat-row"><div><b>${S.chainBest[c]}</b><small>שרשרת שיא</small></div><div><b>${sprint}</b><small>ספרינט שיא</small></div><div><b>${S.totals.bestStreak}</b><small>רצף נכון שיא</small></div></div>
    ${timeHTML()}
    ${moreStatsHTML()}
    ${weakHTML}
    <div class="card"><b>🏅 הישגים</b> <small>· ${Object.keys(S.badges).length} מתוך ${BADGES.length}</small><div class="badges">${BADGES.map(([id, icon, name, desc]) => `<div class="badge ${S.badges[id] ? 'on' : ''}" title="${desc}"><span>${icon}</span><b>${name}</b><small>${desc}</small></div>`).join('')}</div></div>
    <div class="card"><b>${CL[c].name}</b> <small>· דיוק וזמן תגובה ממוצע</small><div class="bars" style="margin-top:10px">${rows.map(bar).join('')}</div></div>`;
}

/* ============ modal ============ */
const openModal = (html) => { modalEl.innerHTML = `<div class="sheet">${html}</div>`; modalEl.hidden = false; };
const closeModal = () => { modalEl.hidden = true; modalEl.innerHTML = ''; };

function settingsHTML() {
  const sw = (k, t, sub) => `<label class="row"><span>${t}${sub ? `<small>${sub}</small>` : ''}</span><input class="sw" type="checkbox" data-set="${k}" ${S.settings[k] ? 'checked' : ''}></label>`;
  return `<h2>הגדרות</h2>
    ${sw('sound', '🔊 צליל', 'שומעים את התו אחרי כל תשובה')}
    ${sw('autoplay', '🎧 נגן את התו כשהוא מופיע', 'מתאים לאימון אוזן')}
    ${sw('hints', '💡 כפתור רמז')}
    ${sw('letters', '🔤 אותיות לועזיות על הכפתורים', 'C D E F G A B')}
    <label class="row"><span>טווח תווים בספרינט, תרגול ו"מצא"</span><select data-set="range">
      <option value="staff" ${S.settings.range === 'staff' ? 'selected' : ''}>בתוך החמשה בלבד</option>
      <option value="extended" ${S.settings.range === 'extended' ? 'selected' : ''}>כולל קווי עזר</option></select></label>
    <label class="row"><span>קצב פתיחת תווים במסלול<small>כמה נכונות נדרשות לפתוח תו חדש</small></span><select data-set="speed">
      <option value="1" ${needPts() === 1 ? 'selected' : ''}>מהיר: תשובה אחת</option>
      <option value="3" ${needPts() === 3 ? 'selected' : ''}>רגיל: 2 מהירות או 3 רגילות</option>
      <option value="5" ${needPts() === 5 ? 'selected' : ''}>איטי: 3 מהירות או 5 רגילות</option></select></label>
    <label class="row"><span>⏱ מגבלת זמן לשאלה<small>במסלול, בשרשרת ובתרגול. נגמר הזמן = טעות</small></span><select data-set="qtime">
      ${[[0, 'ללא'], [10, '10 שניות'], [6, '6 שניות'], [4, '4 שניות']].map(([v, t]) => `<option value="${v}" ${Number(S.settings.qtime) === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    ${sw('analytics', '📈 נתוני שימוש אנונימיים', 'Google Analytics. בלי שמות או פרטים אישיים')}
    <button class="ghost danger" style="width:100%;margin-top:12px" data-act="reset">איפוס כל ההתקדמות</button>
    <button class="primary" data-act="closeModal">סגירה</button>
    <p style="text-align:center"><small>גרסה ${VER}</small></p>`;
}

/* ============ game ============ */
function stopGame() { if (timer) { clearInterval(timer); timer = null; } if (qt) { clearInterval(qt); qt = null; } if (G && !G.ended) endSession(); G = null; closeModal(); }

function endSession() {
  if (!G || G.ended) return; G.ended = true;
  if (G.answers) {
    const sl = S.hist.sess; sl.push({ ts: G.t0, mode: G.mode, clef: S.clef, n: G.answers, ok: G.correct, score: G.score, sec: Math.round(G.act || 0), wall: Math.round((Date.now() - G.t0) / 1000) });
    if (sl.length > 200) sl.splice(0, sl.length - 200);
  }
  if (G.answers) track('session_end', { mode: G.mode, clef: S.clef, answers: G.answers, correct: G.correct, duration_s: Math.round((Date.now() - G.t0) / 1000) });
  save();
}

function startGame(mode) {
  stopGame();
  S.totals.sessions++; markDay(); save();
  G = { mode, score: 0, streak: 0, answers: 0, correct: 0, t0: Date.now(), locked: false, prev: null, retry: null, q: null, k: Math.max(1, Math.min(S.chainBest[S.clef] || 1, 3)), over: false, ended: false };
  if (mode === 'chain') G.k = 1;
  view = 'game';
  root.innerHTML = gameHTML();
  track('mode_start', { mode, clef: S.clef });
  qt = setInterval(() => {
    if (!G || G.over || G.locked || !G.q) return;
    const el = (performance.now() - G.qStart) / 1000, lim = Number(S.settings.qtime), h = $('h-time');
    if (!h) return;
    if (lim > 0 && G.mode !== 'sprint' && !isLoc()) {
      const left = lim - el; h.textContent = '⏱ ' + Math.max(0, left).toFixed(1); h.classList.toggle('low', left < 3);
      if (left <= 0) answer(-1);
    } else { h.textContent = '⏱ ' + el.toFixed(1); h.classList.remove('low'); }
  }, 100);
  if (mode === 'sprint') {
    G.timeLeft = 60;
    timer = setInterval(() => {
      G.timeLeft -= 0.1; if (G.timeLeft < 0) G.timeLeft = 0;
      $('bar').style.width = (G.timeLeft / 60 * 100) + '%';
      $('prompt').innerHTML = `נשארו <b>${Math.ceil(G.timeLeft)}</b> שניות`;
      if (G.timeLeft <= 0) endSprint();
    }, 100);
  }
  nextQ();
}

function gameHTML() {
  const m = G.mode;
  const pad = m === 'locate' ? '' : `<div class="pad" dir="ltr">${NAMES.map((n, i) => `<button data-act="ans" data-v="${i}"><b>${n}</b>${S.settings.letters ? `<small>${LETTERS[i]}</small>` : ''}</button>`).join('')}</div>`;
  const hint = S.settings.hints && m !== 'sprint' ? '<button class="ghost hint" data-act="hint">💡 רמז</button>' : '';
  return `<div class="gtop"><button class="ghost" data-act="home">‹ יציאה</button><div class="hud"><span id="h-time">⏱ 0.0</span><span id="h-streak">🔥 0</span><span id="h-score">⭐ 0</span></div></div>
    <div class="bar"><i id="bar"></i></div>
    <div id="prompt" class="prompt"></div>
    <div id="stage" class="stage"></div>
    <div id="msg" class="msg"></div>
    <button id="ok" class="next ok" data-act="confirm" hidden>אישור ✓</button>
    <button id="next" class="next" data-act="next" hidden>המשך ›</button>
    ${pad}${hint}`;
}

const poolFor = (mode, clef) => {
  if (mode === 'path') return CL[clef].path.slice(0, S.path[clef].n);
  if (mode === 'weak') { // the unlocked notes that are weakest (low accuracy, slow, or barely practised)
    const un = CL[clef].path.slice(0, S.path[clef].n), st = S.stats[clef];
    const sc = (d) => { const x = st[d]; return !x || x.n < 3 ? 0.5 : (x.ok / x.n + (x.e == null ? x.ok / x.n : x.e)) / 2 - Math.min(x.ok ? x.t / x.ok : 6000, 8000) / 40000; };
    return un.slice().sort((a, b) => sc(a) - sc(b)).slice(0, Math.max(2, Math.ceil(un.length / 2)));
  }
  if (mode === 'chain') return CL[clef].path.slice(0, Math.max(S.path[clef].n, 4));
  return rangeOf(clef, S.settings.range === 'extended');
};

function pickNote(clef, pool, prev, boost) {
  if (pool.length === 1) return pool[0];
  const st = S.stats[clef];
  const ws = pool.map((d) => {
    if (d === prev) return 0;
    const s = st[d]; let w;
    if (!s || !s.n) w = 2.5;
    else { const acc = (s.ok / s.n + (s.e == null ? s.ok / s.n : s.e)) / 2, avg = s.ok ? s.t / s.ok : 6000; w = 1 + (1 - acc) * 4 + Math.min(avg, 8000) / 4000; }
    return d === boost ? w * 2.5 : w;
  });
  let r = Math.random() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) { r -= ws[i]; if (r <= 0) return pool[i]; }
  return pool[pool.length - 1];
}

function nextQ() {
  if (!G || G.over) return;
  G.locked = false; G.hinted = false;
  $('ok').hidden = true; $('next').hidden = true; $('next').textContent = 'המשך ›'; $('msg').textContent = ''; $('msg').className = 'msg';
  document.querySelectorAll('.pad button').forEach((b) => b.className = '');
  G.qn = (G.qn || 0) + 1;
  // spaced review: a note answered wrong comes back 2-4 questions later, in the same kind of exercise
  const due = G.retry == null && (G.rev || []).find((r) => r.at <= G.qn);
  if (due) G.rev.splice(G.rev.indexOf(due), 1);
  const clef = G.retry != null ? G.retryClef : due ? due.clef : pickClef();
  const pn = S.path[clef].n, mixed = G.mode === 'path' || G.mode === 'weak';
  // path / weak-spots mix naming a note with finding it on the staff
  const asLoc = G.mode === 'locate' || (mixed && pn > 1 && (G.retry != null ? G.retryLoc : due ? due.loc : Math.random() < (G.mode === 'weak' ? 0.5 : 0.35)));
  const padEl = document.querySelector('.pad'); if (padEl) padEl.style.display = asLoc ? 'none' : '';
  const hintEl = document.querySelector('.hint'); if (hintEl) hintEl.style.display = asLoc ? 'none' : '';
  const boost = G.mode === 'path' && pn > 1 ? CL[clef].path[pn - 1] : -1;
  const chosen = G.retry != null ? G.retry : due ? due.d : null;
  const rv = !!due;
  if (asLoc) {
    const pool = G.mode === 'locate' ? rangeOf(clef, S.settings.range === 'extended') : poolFor(G.mode, clef);
    const d = chosen != null ? chosen : pickNote(clef, pool, G.prev, boost);
    G.prev = d;
    G.q = { clef, loc: true, rev: rv, tgt: d, target: letterOf(d), placed: null, pending: null, reveal: [] };
  } else if (G.mode === 'chain' || (G.mode === 'path' && pn >= 3 && chosen == null && Math.random() < 0.2)) {
    // chain: a short sequence (inside the path: 2-3 notes from the unlocked ones); a note due for review leads it
    const emb = G.mode === 'path', len = emb ? (pn >= 5 ? 3 : 2) : G.k;
    const pool = emb ? poolFor('path', clef) : poolFor('chain', clef), notes = [];
    for (let i = 0; i < len; i++) notes.push(pickNote(clef, pool, notes[i - 1]));
    if (due && pool.includes(due.d)) { notes[0] = due.d; if (notes[1] === due.d) notes[1] = pickNote(clef, pool, due.d); }
    G.q = { clef, chain: true, emb, rev: rv, notes, idx: 0, res: notes.map(() => '') };
  } else {
    const pool = poolFor(G.mode, clef);
    // path: a wrong answer repeats the same note until it is answered correctly
    const d = chosen != null ? chosen : pickNote(clef, pool, G.prev, boost);
    G.prev = d;
    G.q = { clef, rev: rv, notes: [d], idx: 0, res: [''] };
  }
  G.retry = null; G.retryLoc = false;
  G.qStart = performance.now();
  drawQ(); hud();
  if (S.settings.autoplay && G.q.notes) playNote(G.q.notes[G.q.idx], 0.7, 0.25);
}

function drawQ() {
  const q = G.q;
  if (q.loc) {
    const hits = rangeOf(q.clef, S.settings.range === 'extended');
    const bd = CL[q.clef].bd, Y = (d) => BY - (d - bd) * STEP;
    const top = Y(hits[hits.length - 1]) - 24, bot = Y(hits[0]) + 24, ly = bot + 18;
    const items = [], N = { stem: false, ly };
    if (q.placed != null) items.push({ ...N, d: q.placed, x: 170, cls: q.okPlaced ? 'ok' : 'bad', label: nm(q.placed) });
    else if (q.pending != null) items.push({ ...N, d: q.pending, x: 170, cls: 'cur', id: 'pv' });
    q.reveal.forEach((d, i) => items.push({ ...N, d, x: 215 + i * 42, cls: 'ok ghost', label: nm(d) }));
    $('stage').innerHTML = staffSVG(q.clef, items, { hits: q.placed == null ? hits : [], vb: [0, top, 330, bot + 28 - top], cls: 'loc' });
    $('prompt').innerHTML = `${q.rev ? '🔁 ' : ''}מצאו את התו <b>${NAMES[q.target]}</b> על החמשה`;
    return;
  }
  const n = q.notes.length;
  const step = n > 1 ? Math.min(46, 270 / (n - 1)) : 0, x0 = n > 1 ? 110 : 240;
  const items = q.notes.map((d, i) => ({
    d, x: x0 + i * step,
    cls: q.res[i] || (i === q.idx ? 'cur' : 'pend'),
    label: q.res[i] ? nm(d) : '',
  }));
  $('stage').innerHTML = staffSVG(q.clef, items);
  if (G.mode === 'path') $('prompt').innerHTML = `${CL[q.clef].name} · תו ${S.path[q.clef].n} מתוך ${CL[q.clef].path.length}`;
  else if (G.mode === 'chain') $('prompt').innerHTML = `שרשרת של <b>${G.k}</b> · מה התו ה-${q.idx + 1}?`;
  if (G.mode === 'path' && q.chain) $('prompt').innerHTML = `${q.rev ? '🔁 ' : ''}🔗 שרשרת של <b>${q.notes.length}</b> · מה התו ה-${q.idx + 1}?`;
  else if (G.mode === 'free') $('prompt').textContent = `${CL[q.clef].name} · איזה תו זה?`;
  else if (G.mode === 'weak') $('prompt').textContent = `${q.rev ? '🔁 ' : ''}חיזוק · איזה תו זה?`;
  if (G.mode === 'path' && q.rev) $('prompt').innerHTML = '🔁 חזרה · ' + $('prompt').innerHTML;
}

function hud() {
  $('h-streak').textContent = '🔥 ' + G.streak;
  $('h-score').textContent = '⭐ ' + G.score;
  if (G.mode === 'path') {
    const c = G.q.clef, P = S.path[c];
    $('bar').style.width = (CL[c].path.length === P.n && P.done ? 100 : Math.min(P.pts / needPts(), 1) * 100) + '%';
  } else if (G.mode === 'weak') $('bar').style.width = (G.answers ? G.correct / G.answers * 100 : 0) + '%';
  else if (G.mode === 'chain') $('bar').style.width = (G.k / 8 * 100) + '%';
}

const padBtn = (i) => document.querySelector(`.pad button[data-v="${i}"]`);
const msg = (t, cls) => { $('msg').textContent = t; $('msg').className = 'msg ' + (cls || ''); };

function review(clef, d, loc) {
  (G.rev = G.rev || []).push({ clef, d, loc, at: (G.qn || 0) + 2 + Math.floor(Math.random() * 3) });
}

function record(clef, d, ok, ms) {
  const s = S.stats[clef][d] || (S.stats[clef][d] = { n: 0, ok: 0, t: 0 });
  s.n++; if (ok) { s.ok++; s.t += Math.min(ms, 15000); }
  s.e = (s.e == null ? (ok ? 1 : 0) : s.e * 0.7 + (ok ? 0.3 : 0)); // recent accuracy (recent answers count more)
  S.totals.answers++; if (ok) S.totals.correct++;
  markDay();
  const H = S.hist, dk = today(), D = H.daily[dk] || (H.daily[dk] = { n: 0, ok: 0, ms: 0 });
  D.n++; if (ok) { D.ok++; D.ms += Math.min(ms, 15000); }
  const mk = (G && G.mode) || 'free', M = H.modes[mk] || (H.modes[mk] = { n: 0, ok: 0 });
  M.n++; if (ok) M.ok++;
  H.hours[new Date().getHours()]++;
  if (ok && ms > 150 && (!H.fastest || ms < H.fastest.ms)) H.fastest = { ms: Math.round(ms), d, clef, day: dk };
  const ks = Object.keys(H.daily); if (ks.length > 400) ks.sort().slice(0, ks.length - 400).forEach((x) => delete H.daily[x]);
}
const bumpConf = (clef, target, chosen) => { const c = S.hist.conf[clef], k = target + '>' + chosen; c[k] = (c[k] || 0) + 1; };

function answer(i) {
  if (!G || G.locked || G.over || isLoc()) return;
  ac();
  const q = G.q, d = q.notes[q.idx], clef = q.clef;
  const ok = letterOf(d) === i, ms = performance.now() - G.qStart, hinted = G.hinted;
  G.locked = true; G.answers++;
  record(clef, d, ok && !hinted, ms);
  track('answer', { mode: G.mode, clef, note: sci(d), correct: ok && !hinted, time_ms: Math.round(ms), hinted });
  const btn = padBtn(i);
  if (ok) {
    G.correct++; G.streak++; S.totals.bestStreak = Math.max(S.totals.bestStreak, G.streak);
    btn.classList.add('ok'); q.res[q.idx] = 'ok'; playNote(d);
    const p = award(ms, hinted), mult = G.streak >= 5 ? ` · x${(1 + Math.min(2, Math.floor(G.streak / 5) * 0.5)).toFixed(1)}` : '';
    msg(hinted ? 'נכון (עם רמז, בלי נקודות)' : `${ms < 2000 ? 'מהיר! ⚡ ' : 'נכון! '}+${p}${mult}`, 'ok');
  } else {
    G.streak = 0; review(clef, d, false); if (i >= 0) bumpConf(clef, letterOf(d), i); if (btn) btn.classList.add('bad'); padBtn(letterOf(d)).classList.add('ok'); q.res[q.idx] = 'bad';
    setTimeout(() => playNote(d), 200); buzz(60);
    msg(`${i === -1 ? 'נגמר הזמן! ' : ''}זה היה ${nm(d)} (${sci(d)})`, 'bad');
  }
  drawQ(); hud(); checkBadges({ ok: ok && !hinted, ms });

  if (q.chain) { if (q.emb) { pathProgress(clef, ok && !hinted, ms); hud(); } return chainAfter(ok); }
  if (G.mode === 'path') { pathProgress(clef, ok && !hinted, ms); hud(); }
  if (ok) {
    if (G.pendingIntro) { const intro = G.pendingIntro; G.pendingIntro = null; setTimeout(() => showIntro(intro), 450); }
    else setTimeout(nextQ, G.mode === 'sprint' ? 220 : 520);
  } else if (G.mode === 'sprint') setTimeout(nextQ, 650);
  else {
    if (G.mode === 'path') { G.retry = d; G.retryClef = clef; G.retryLoc = false; $('next').textContent = 'נסו שוב ›'; }
    $('next').hidden = false;
  }
  save();
}

function pathProgress(clef, ok, ms) {
  const P = S.path[clef], len = CL[clef].path.length;
  if (!ok) { P.pts = 0; return; }
  P.pts += ms < 3000 ? 2 : 1;
  if (P.pts >= needPts()) {
    P.pts = 0;
    if (P.n < len) {
      P.n++;
      const d = CL[clef].path[P.n - 1];
      G.pendingIntro = { clef, d, finished: false };
      track('note_unlocked', { clef, count: P.n, note: sci(d) });
      if (P.n === len && !P.done) { P.done = true; G.pendingIntro.finished = true; track('path_complete', { clef }); }
      G.score += 25; S.totals.score += 25; checkBadges({}); // unlock bonus
    }
  }
}

function showIntro({ clef, d, finished }) {
  const P = S.path[clef];
  const svg = staffSVG(clef, [{ d, x: 240, cls: 'ok', label: nm(d) }]);
  openModal(`<h2>${finished ? '🏆 סיימת את כל המסלול!' : '🎉 תו חדש נפתח!'}</h2>
    <div class="stage">${svg}</div>
    <p class="big"><b>${nm(d)}</b> <small>(${sci(d)})</small></p>
    <p style="text-align:center;color:var(--muted)">${finished ? `כל ${CL[clef].path.length} התווים פתוחים. ממשיכים לחזק.` : `עכשיו ${P.n} תווים בתרגול.`}</p>
    <button class="primary" data-act="introOk">${finished ? 'ממשיכים' : 'יאללה, מתרגלים'}</button>`);
  playNote(d, 1.0);
}

function chainAfter(ok) {
  const q = G.q;
  if (!ok) {
    if (!q.emb) G.k = Math.max(1, G.k - 1);
    track('chain_fail', { clef: q.clef, length: q.notes.length });
    $('next').hidden = false; save(); return;
  }
  if (q.idx < q.notes.length - 1) {
    q.idx++; G.qStart = performance.now(); G.locked = false; G.hinted = false;
    document.querySelectorAll('.pad button').forEach((b) => b.className = '');
    msg('', ''); drawQ(); hud();
    if (S.settings.autoplay) playNote(q.notes[q.idx], 0.7, 0.25);
    return;
  }
  // sequence complete
  const len = q.notes.length;
  S.chainBest[q.clef] = Math.max(S.chainBest[q.clef] || 1, len);
  track('chain_complete', { clef: q.clef, length: len });
  const bonus = len * 5; G.score += bonus; S.totals.score += bonus; // chain completion bonus
  checkBadges({});
  if (!q.emb) G.k = Math.min(8, G.k + 1);
  hud(); msg((len >= 8 ? 'שרשרת מושלמת! 🏆' : q.emb ? 'שרשרת הושלמה! 🔗' : 'שרשרת הושלמה! מוסיפים עוד תו 🔗') + ` בונוס +${bonus}`, 'ok');
  save();
  if (G.pendingIntro) { const intro = G.pendingIntro; G.pendingIntro = null; setTimeout(() => showIntro(intro), 700); } else setTimeout(nextQ, 900);
}

// staff y -> diatonic index of the nearest line/space (whole staff is the target; no pixel-exact tapping)
function locateAt(svg, ev) {
  const q = G.q, bd = CL[q.clef].bd, pt = svg.createSVGPoint();
  pt.x = ev.clientX; pt.y = ev.clientY;
  const y = pt.matrixTransform(svg.getScreenCTM().inverse()).y;
  const r = rangeOf(q.clef, S.settings.range === 'extended');
  return Math.max(r[0], Math.min(r[r.length - 1], bd + Math.round((BY - y) / STEP)));
}
function locatePreview(d) {
  const q = G.q; if (d === q.pending) return;
  ac(); q.pending = d; playNote(d, 0.8, 0.25); buzz(8);
  const svg = $('stage').querySelector('svg'), old = svg.querySelector('#pv');
  const html = noteSVG(q.clef, { d, x: 170, cls: 'cur', id: 'pv', stem: false });
  if (old) old.outerHTML = html; else svg.insertAdjacentHTML('beforeend', html);
  $('ok').hidden = false; $('msg').textContent = 'גררו כדי לתקן, ואז לחצו אישור'; $('msg').className = 'msg';
}
function locateConfirm() {
  if (G && isLoc() && !G.locked && G.q.pending != null) { $('ok').hidden = true; locateTap(G.q.pending); }
}

function locateTap(d) {
  if (!G || G.locked || !isLoc() || G.over) return;
  ac();
  const q = G.q, ok = letterOf(d) === q.target, ms = performance.now() - G.qStart;
  G.locked = true; G.answers++; q.placed = d; q.okPlaced = ok;
  record(q.clef, q.tgt, ok, ms);
  track('locate', { mode: G.mode, clef: q.clef, target: sci(q.tgt), correct: ok, time_ms: Math.round(ms) });
  playNote(d);
  if (ok) {
    G.correct++; G.streak++; S.totals.bestStreak = Math.max(S.totals.bestStreak, G.streak);
    const p = award(ms, false);
    msg(`${ms < 3000 ? 'בול! ⚡ ' : 'נכון! '}+${p}`, 'ok'); drawQ(); checkBadges({ ok: true, ms });
    if (G.mode === 'path') pathProgress(q.clef, true, ms);
    hud();
    if (G.pendingIntro) { const intro = G.pendingIntro; G.pendingIntro = null; setTimeout(() => showIntro(intro), 450); } else setTimeout(nextQ, 700);
  } else {
    G.streak = 0; buzz(60);
    q.reveal = rangeOf(q.clef, S.settings.range === 'extended').filter((x) => letterOf(x) === q.target).slice(0, 3);
    msg(`לחצת על ${nm(d)}. ${NAMES[q.target]} נמצא בירוק:`, 'bad'); drawQ();
    review(q.clef, q.tgt, true); bumpConf(q.clef, q.target, letterOf(d));
    if (G.mode === 'path') { pathProgress(q.clef, false, ms); G.retry = q.tgt; G.retryClef = q.clef; G.retryLoc = true; $('next').textContent = 'נסו שוב ›'; }
    hud(); $('next').hidden = false;
  }
  save();
}

function hint() {
  if (!G || G.locked || G.over || isLoc() || G.mode === 'sprint') return;
  const d = G.q.notes[G.q.idx]; G.hinted = true;
  const b = padBtn(letterOf(d)); b.classList.add('hintflash');
  msg('זה התו המסומן. רמז לא נספר כהצלחה.', '');
  track('hint', { mode: G.mode, clef: G.q.clef, note: sci(d) });
}

function endSprint() {
  if (!G || G.over) return;
  G.over = true; clearInterval(timer); timer = null;
  const acc = G.answers ? Math.round(G.correct / G.answers * 100) : 0;
  const key = S.clef, prevBest = S.sprintBest[key] || 0, isBest = G.correct > prevBest;
  if (isBest) S.sprintBest[key] = G.correct;
  track('sprint_end', { clef: S.clef, score: G.correct, points: G.score, accuracy: acc, best: isBest });
  endSession(); checkBadges({});
  const wk = weakNotes(3);
  openModal(`<h2>⏱ הזמן נגמר</h2>
    <p class="big"><b>${G.correct}</b> תשובות נכונות · ⭐ ${G.score} נק׳</p>
    <p style="text-align:center">דיוק ${acc}% · ${isBest ? '🏅 שיא חדש!' : 'שיא: ' + prevBest}</p>
    ${wk.length ? `<p style="text-align:center;color:var(--bad)">כדאי לחזק: ${wk.map((r) => nm(r.d) + ' ' + sci(r.d)).join(' · ')}</p><button class="ghost" style="width:100%;margin-bottom:8px" data-act="weak">💪 חיזוק חולשות</button>` : ''}
    <button class="primary" data-act="again">עוד סיבוב</button>
    <button class="ghost" style="width:100%;margin-top:8px" data-act="home">חזרה לתפריט</button>`);
}

/* ============ events ============ */
const act = (a, v, el) => {
  switch (a) {
    case 'home': closeModal(); go('home'); break;
    case 'clef': S.clef = v; save(); track('clef_select', { clef: v }); render(); break;
    case 'mode': startGame(v); break;
    case 'ref': go('ref'); break;
    case 'stats': go('stats'); break;
    case 'stab': statsTab = v; render(); break;
    case 'settings': openModal(settingsHTML()); break;
    case 'closeModal': closeModal(); render(); break;
    case 'ans': answer(Number(v)); break;
    case 'confirm': locateConfirm(); break;
    case 'next': if (G && !$('next').hidden) nextQ(); break;
    case 'hint': hint(); break;
    case 'introOk': closeModal(); nextQ(); break;
    case 'weak': closeModal(); startGame('weak'); break;
    case 'exportJson': exportJson(); break;
    case 'exportCsv': exportCsv(); break;
    case 'importJson': { const i = $('imp'); if (i) i.click(); break; }
    case 'report': {
      const txt = timeReport(14);
      const done = () => toast('הדוח הועתק 📋');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, () => prompt('העתיקו את הדוח:', txt));
      else prompt('העתיקו את הדוח:', txt);
      break;
    }
    case 'again': closeModal(); startGame('sprint'); break;
    case 'install':
      if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.then((r) => { track('install_prompt', { outcome: r.outcome }); deferredPrompt = null; render(); }); }
      break;
    case 'reset':
      if (confirm('למחוק את כל ההתקדמות וההגדרות?')) { const an = S.settings.analytics; S = DEF(); S.settings.analytics = an; save(); track('progress_reset'); closeModal(); go('home'); }
      break;
  }
};

document.addEventListener('click', (e) => {
  const tn = e.target.closest('[data-tone]'); if (tn) { ac(); return playNote(Number(tn.dataset.tone), 1.0); }
  const el = e.target.closest('[data-act]'); if (el) act(el.dataset.act, el.dataset.v, el);
});

let dragging = false;
document.addEventListener('pointerdown', (e) => {
  const svg = e.target.closest && e.target.closest('svg.loc');
  if (!svg || !isLoc() || G.locked || G.over) return;
  dragging = true; try { svg.setPointerCapture(e.pointerId); } catch (_) {}
  locatePreview(locateAt(svg, e));
});
document.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  activity();
  const svg = $('stage').querySelector('svg.loc'); if (svg && G && !G.locked) locatePreview(locateAt(svg, e));
});
['pointerup', 'pointercancel'].forEach((t) => document.addEventListener(t, () => { dragging = false; }));

document.addEventListener('change', (e) => {
  if (e.target.id === 'imp') { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) importJson(f); return; }
  const k = e.target.dataset && e.target.dataset.set; if (!k) return;
  const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  S.settings[k] = (k === 'speed' || k === 'qtime') ? Number(v) : v; save();
  if (k === 'analytics') applyConsent();
  else track('setting_change', { key: k, value: String(v) });
  if (k === 'letters' && G && !isLoc()) { root.innerHTML = gameHTML(); drawQ(); hud(); }
});

document.addEventListener('keydown', (e) => {
  if (!G || e.metaKey || e.ctrlKey || e.altKey) return;
  const i = LETTERS.indexOf(e.key.toUpperCase());
  if (i >= 0 && e.key.length === 1) return answer(i);
  if ((e.key === 'Enter' || e.key === ' ') && !$('ok').hidden) { e.preventDefault(); return locateConfirm(); }
  if ((e.key === 'Enter' || e.key === ' ') && !$('next').hidden) { e.preventDefault(); nextQ(); }
});

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { if (G && G.answers) track('session_pause', { mode: G.mode, answers: G.answers, correct: G.correct }); save(); } });

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; if (view === 'home') render(); });
window.addEventListener('appinstalled', () => { track('app_installed'); deferredPrompt = null; });

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

/* ============ boot ============ */
render();
track('app_open', { clef: S.clef, standalone: !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches) });
track('screen_view', { screen_name: 'home' });

// tiny hook for tests
window.__learnote = { voice, sampled, PBUF, S: () => S, CL, letterOf, midiOf, sci };
})();

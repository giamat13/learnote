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
  totals: { answers: 0, correct: 0, bestStreak: 0, days: [], sessions: 0, score: 0 },
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
const playNote = (d, dur = 0.8, vol = 0.3) => {
  if (!S.settings.sound) return;
  const c = ac(); if (!c) return;
  const t = c.currentTime, f0 = freqOf(midiOf(d));
  const out = c.createGain(); out.connect(c.destination);
  const body = c.createBiquadFilter(); body.type = 'lowpass';
  body.frequency.setValueAtTime(Math.min(12000, Math.max(1500, f0 * 14)), t);
  body.frequency.setTargetAtTime(Math.min(3000, Math.max(300, f0 * 4)), t, dur * 0.35 + 0.05);
  body.connect(out);
  const tau = dur * 0.8 + 0.12, life = tau * 4.5 + 0.1; // ~1% level when the oscillators stop
  const amps = [1, 0.55, 0.3, 0.17, 0.1, 0.06], sum = amps.reduce((a, b) => a + b, 0), B = 0.0004;
  amps.forEach((a, i) => {
    const k = i + 1, fk = k * f0 * Math.sqrt(1 + B * k * k);
    if (fk > 16000) return;
    const decay = tau / (1 + i * 1.3);
    const strings = i < 2 ? [-1.2, 1.2] : [0]; // cents
    strings.forEach((cents) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine';
      o.frequency.value = fk * Math.pow(2, cents / 1200);
      const peak = (vol * 1.6 * a / sum) / strings.length;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.004);
      g.gain.setTargetAtTime(0, t + 0.004, decay);
      o.connect(g); g.connect(body);
      o.start(t); o.stop(t + life);
    });
  });
  const hammer = c.createBufferSource(); hammer.buffer = noiseBuf(c);
  const bp = c.createBiquadFilter(); bp.type = 'bandpass';
  bp.frequency.value = Math.min(5000, Math.max(1500, f0 * 30)); bp.Q.value = 1.5;
  const hg = c.createGain();
  hg.gain.setValueAtTime(vol * 0.25, t); hg.gain.setTargetAtTime(0, t, 0.008);
  hammer.connect(bp); bp.connect(hg); hg.connect(out);
  hammer.start(t); hammer.stop(t + 0.04);
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
  </div>
  ${prog}
  <div class="modes">
    <button class="mode wide" data-act="mode" data-v="path"><b>🧭 מסלול למידה</b><span>מתחילים בתו אחד. כל תשובה נכונה ומהירה פותחת עוד תו.</span></button>
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
    if (lim > 0 && G.mode !== 'sprint' && G.mode !== 'locate') {
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
    else { const acc = s.ok / s.n, avg = s.ok ? s.t / s.ok : 6000; w = 1 + (1 - acc) * 4 + Math.min(avg, 8000) / 4000; }
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
  const clef = pickClef();
  if (G.mode === 'locate') {
    const pool = rangeOf(clef, S.settings.range === 'extended');
    const letters = [...new Set(pool.map(letterOf))].filter((l) => l !== G.prev);
    const target = letters[Math.floor(Math.random() * letters.length)];
    G.prev = target;
    G.q = { clef, target, placed: null, pending: null, reveal: [] };
  } else if (G.mode === 'chain') {
    const pool = poolFor('chain', clef), notes = [];
    for (let i = 0; i < G.k; i++) notes.push(pickNote(clef, pool, notes[i - 1]));
    G.q = { clef, notes, idx: 0, res: notes.map(() => '') };
  } else {
    const pool = poolFor(G.mode, clef), n = S.path[clef].n;
    // path: a wrong answer repeats the same note until it is answered correctly
    const d = G.retry != null ? G.retry : pickNote(clef, pool, G.prev, G.mode === 'path' && n > 1 ? pool[pool.length - 1] : -1);
    G.retry = null;
    G.prev = d;
    G.q = { clef, notes: [d], idx: 0, res: [''] };
  }
  G.qStart = performance.now();
  drawQ(); hud();
  if (S.settings.autoplay && G.q.notes) playNote(G.q.notes[G.q.idx], 0.7, 0.25);
}

function drawQ() {
  const q = G.q;
  if (G.mode === 'locate') {
    const hits = rangeOf(q.clef, S.settings.range === 'extended');
    const bd = CL[q.clef].bd, Y = (d) => BY - (d - bd) * STEP;
    const top = Y(hits[hits.length - 1]) - 24, bot = Y(hits[0]) + 24, ly = bot + 18;
    const items = [], N = { stem: false, ly };
    if (q.placed != null) items.push({ ...N, d: q.placed, x: 170, cls: q.okPlaced ? 'ok' : 'bad', label: nm(q.placed) });
    else if (q.pending != null) items.push({ ...N, d: q.pending, x: 170, cls: 'cur', id: 'pv' });
    q.reveal.forEach((d, i) => items.push({ ...N, d, x: 215 + i * 42, cls: 'ok ghost', label: nm(d) }));
    $('stage').innerHTML = staffSVG(q.clef, items, { hits: q.placed == null ? hits : [], vb: [0, top, 330, bot + 28 - top], cls: 'loc' });
    $('prompt').innerHTML = `מצאו את התו <b>${NAMES[q.target]}</b> על החמשה`;
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
  else if (G.mode === 'free') $('prompt').textContent = `${CL[q.clef].name} · איזה תו זה?`;
}

function hud() {
  $('h-streak').textContent = '🔥 ' + G.streak;
  $('h-score').textContent = '⭐ ' + G.score;
  if (G.mode === 'path') {
    const c = G.q.clef, P = S.path[c];
    $('bar').style.width = (CL[c].path.length === P.n && P.done ? 100 : Math.min(P.pts / needPts(), 1) * 100) + '%';
  } else if (G.mode === 'chain') $('bar').style.width = (G.k / 8 * 100) + '%';
}

const padBtn = (i) => document.querySelector(`.pad button[data-v="${i}"]`);
const msg = (t, cls) => { $('msg').textContent = t; $('msg').className = 'msg ' + (cls || ''); };

function record(clef, d, ok, ms) {
  const s = S.stats[clef][d] || (S.stats[clef][d] = { n: 0, ok: 0, t: 0 });
  s.n++; if (ok) { s.ok++; s.t += Math.min(ms, 15000); }
  S.totals.answers++; if (ok) S.totals.correct++;
  markDay();
}

function answer(i) {
  if (!G || G.locked || G.over || G.mode === 'locate') return;
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
    G.streak = 0; if (btn) btn.classList.add('bad'); padBtn(letterOf(d)).classList.add('ok'); q.res[q.idx] = 'bad';
    setTimeout(() => playNote(d), 200); buzz(60);
    msg(`${i === -1 ? 'נגמר הזמן! ' : ''}זה היה ${nm(d)} (${sci(d)})`, 'bad');
  }
  drawQ(); hud(); checkBadges({ ok: ok && !hinted, ms });

  if (G.mode === 'chain') return chainAfter(ok);
  if (G.mode === 'path') { pathProgress(clef, ok && !hinted, ms); hud(); }
  if (ok) {
    if (G.pendingIntro) { const intro = G.pendingIntro; G.pendingIntro = null; setTimeout(() => showIntro(intro), 450); }
    else setTimeout(nextQ, G.mode === 'sprint' ? 220 : 520);
  } else if (G.mode === 'sprint') setTimeout(nextQ, 650);
  else {
    if (G.mode === 'path') { G.retry = d; $('next').textContent = 'נסו שוב ›'; }
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
    G.k = Math.max(1, G.k - 1);
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
  G.k = Math.min(8, G.k + 1);
  hud(); msg((len >= 8 ? 'שרשרת מושלמת! 🏆' : 'שרשרת הושלמה! מוסיפים עוד תו 🔗') + ` בונוס +${bonus}`, 'ok');
  save(); setTimeout(nextQ, 900);
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
  if (G && G.mode === 'locate' && !G.locked && G.q.pending != null) { $('ok').hidden = true; locateTap(G.q.pending); }
}

function locateTap(d) {
  if (!G || G.locked || G.mode !== 'locate' || G.over) return;
  ac();
  const q = G.q, ok = letterOf(d) === q.target, ms = performance.now() - G.qStart;
  G.locked = true; G.answers++; q.placed = d; q.okPlaced = ok;
  S.totals.answers++; if (ok) S.totals.correct++; markDay();
  track('locate', { clef: q.clef, target: LETTERS[q.target], correct: ok, time_ms: Math.round(ms) });
  playNote(d);
  if (ok) {
    G.correct++; G.streak++; S.totals.bestStreak = Math.max(S.totals.bestStreak, G.streak);
    const p = award(ms, false);
    msg(`${ms < 3000 ? 'בול! ⚡ ' : 'נכון! '}+${p}`, 'ok'); drawQ(); hud(); checkBadges({ ok: true, ms }); setTimeout(nextQ, 700);
  } else {
    G.streak = 0; buzz(60);
    q.reveal = rangeOf(q.clef, S.settings.range === 'extended').filter((x) => letterOf(x) === q.target).slice(0, 3);
    msg(`לחצת על ${nm(d)}. ${NAMES[q.target]} נמצא בירוק:`, 'bad'); drawQ(); hud(); $('next').hidden = false;
  }
  save();
}

function hint() {
  if (!G || G.locked || G.over || G.mode === 'locate' || G.mode === 'sprint') return;
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
  openModal(`<h2>⏱ הזמן נגמר</h2>
    <p class="big"><b>${G.correct}</b> תשובות נכונות · ⭐ ${G.score} נק׳</p>
    <p style="text-align:center">דיוק ${acc}% · ${isBest ? '🏅 שיא חדש!' : 'שיא: ' + prevBest}</p>
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
  if (!svg || !G || G.mode !== 'locate' || G.locked || G.over) return;
  dragging = true; try { svg.setPointerCapture(e.pointerId); } catch (_) {}
  locatePreview(locateAt(svg, e));
});
document.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const svg = $('stage').querySelector('svg.loc'); if (svg && G && !G.locked) locatePreview(locateAt(svg, e));
});
['pointerup', 'pointercancel'].forEach((t) => document.addEventListener(t, () => { dragging = false; }));

document.addEventListener('change', (e) => {
  const k = e.target.dataset && e.target.dataset.set; if (!k) return;
  const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  S.settings[k] = (k === 'speed' || k === 'qtime') ? Number(v) : v; save();
  if (k === 'analytics') applyConsent();
  else track('setting_change', { key: k, value: String(v) });
  if (k === 'letters' && G && G.mode !== 'locate') { root.innerHTML = gameHTML(); drawQ(); hud(); }
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
window.__learnote = { S: () => S, CL, letterOf, midiOf, sci };
})();

// Three candidate scores for the third cut, synthesized in code (no music model, nothing paid).
// All share the cut: 92 BPM, every shot a whole number of beats, one chord (or two) per shot, so
// harmony changes on the cuts. A: guqin pluck + stone chime with a pulse. B: minimal piano
// arpeggios. C: ambient pad with a soft low pulse and glassy bells.
// Usage: node music3.mjs  ->  music-a.wav music-b.wav music-c.wav
import { writeFileSync } from 'node:fs';

const SR = 44100, BPM = 92, BEAT = 60 / BPM, XFADE = .4;
// [shot, beats, chords (each [beats, notes])]
const D9 = [50, 57, 60, 64, 65], BB7 = [46, 53, 57, 62], F7 = [41, 53, 60, 64, 69], C9 = [48, 55, 62, 64], GM7 = [43, 50, 53, 58], A4 = [45, 52, 57, 62];
const CUT = [
  ['open', 8, [[8, D9]]], ['sunrise', 6, [[6, BB7]]], ['grille', 6, [[6, F7]]], ['column', 6, [[6, D9]]], ['sutra', 6, [[6, BB7]]], ['floor', 6, [[6, GM7]]],
  ['buddha', 8, [[4, F7], [4, C9]]], ['upper', 6, [[6, D9]]], ['roof', 6, [[6, BB7]]], ['day', 8, [[4, F7], [4, C9]]], ['golden', 6, [[6, D9]]],
  ['seasons', 12, [[3, BB7], [3, F7], [3, C9], [3, A4]]], ['section', 6, [[6, GM7]]], ['dusk', 6, [[6, BB7]]], ['plan', 6, [[6, D9]]], ['ground', 6, [[6, GM7]]],
  ['gate', 12, [[4, A4], [8, D9]]],
];
const START = {}; const CHORDS = []; { let b = 0; for (const [id, n, cs] of CUT) { START[id] = b; let c = b; for (const [len, notes] of cs) { CHORDS.push({ shot: id, beat: c, len, notes }); c += len; } b += n; } START.end = b; }
const TOTAL_BEATS = START.end, END = TOTAL_BEATS * BEAT + XFADE, LENGTH = END + 2, N = Math.ceil(LENGTH * SR);
const CARD = START.gate * BEAT + 4.2; // the closing title appears
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const at = (beat) => beat * BEAT;

function render(name, score) {
  const L = new Float32Array(N), R = new Float32Array(N);
  let seed = 7 + name.length * 131; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const add = (buf, t, gl, gr) => { const i0 = Math.round(t * SR); for (let i = 0; i < buf.length && i0 + i < N; i++) if (i0 + i >= 0) { L[i0 + i] += buf[i] * gl; R[i0 + i] += buf[i] * gr; } };
  const pan = (p, g) => [g * Math.cos((p + 1) * Math.PI / 4), g * Math.sin((p + 1) * Math.PI / 4)];
  const v = {
    pluck(m, t, vel = .5, p = 0, sec = 5) {
      const f = hz(m), period = SR / f, n = Math.floor(period), out = new Float32Array(Math.round(sec * SR)), line = new Float32Array(n + 1);
      for (let i = 0; i < line.length; i++) line[i] = rnd() * 2 - 1;
      for (let k = 0; k < 3; k++) for (let i = 1; i < line.length; i++) line[i] = .5 * (line[i] + line[i - 1]);
      const decay = Math.pow(.001, 1 / (f * Math.min(sec, 1.6 + 260 / f))); let idx = 0;
      for (let i = 0; i < out.length; i++) { const a = line[idx], b = line[(idx + 1) % line.length]; line[idx] = decay * .5 * (a + b); idx = (idx + 1) % line.length; const s = i / SR; out[i] = a * .8 + .25 * Math.sin(2 * Math.PI * f * s) * Math.exp(-s * 1.6); }
      for (let i = out.length - 6000; i < out.length; i++) out[i] *= (out.length - i) / 6000;
      add(out, t, ...pan(p, vel * .3));
    },
    harmonic(m, t, vel = .4, p = 0, sec = 4) { const f = hz(m), out = new Float32Array(Math.round(sec * SR)); for (let i = 0; i < out.length; i++) { const s = i / SR; out[i] = Math.min(1, s / .006) * Math.exp(-s * 1.1) * (Math.sin(2 * Math.PI * f * s) + .1 * Math.sin(4 * Math.PI * f * s)); } add(out, t, ...pan(p, vel * .15)); },
    bell(m, t, vel = .45, sec = 9) { const f = hz(m), out = new Float32Array(Math.round(sec * SR)), parts = [[1, 1, 7], [2.76, .42, 3], [5.4, .2, 1.5], [8.93, .08, .7], [1.0016, .4, 7.5]]; for (let i = 0; i < out.length; i++) { const s = i / SR; let x = 0; for (const [r, a, d] of parts) x += a * Math.sin(2 * Math.PI * f * r * s) * Math.exp(-s / d * 1.6); out[i] = x * Math.min(1, s / .003); } add(out, t, vel * .16, vel * .16); },
    piano(m, t, vel = .5, p = 0, sec = 4.5) {
      const f = hz(m), out = new Float32Array(Math.round(sec * SR)), B = .00035, bright = .6 + vel * .8;
      for (let k = 1; k <= 9; k++) { const fk = k * f * Math.sqrt(1 + B * k * k); if (fk > 9000) break; const a = Math.pow(k, -1.25) * (k === 1 ? 1 : bright) / (1 + (k > 4 ? (k - 4) * .5 : 0)), tau = 3.2 / (1 + .55 * (k - 1)) * (220 / Math.max(110, f)) ** .35, det = 1 + .00025 * k;
        for (let i = 0; i < out.length; i++) { const s = i / SR; out[i] += a * Math.exp(-s / tau) * (Math.sin(2 * Math.PI * fk * s) + .6 * Math.sin(2 * Math.PI * fk * det * s + 1)) * .62; } }
      for (let i = 0; i < out.length; i++) { const s = i / SR; out[i] *= Math.min(1, s / .002); if (s < .02) out[i] += (rnd() - .5) * .25 * (1 - s / .02) * vel; }
      for (let i = out.length - 8000; i < out.length; i++) out[i] *= (out.length - i) / 8000;
      add(out, t, ...pan(p, vel * .2));
    },
    pad(notes, t, dur, vel = .5, cutoff = 900) { // detuned saws through a soft low-pass, slow swell
      const n = Math.round((dur + 1.5) * SR), out = new Float32Array(n); let lp = 0, lp2 = 0;
      const voices = notes.flatMap(m => [hz(m) * .997, hz(m), hz(m) * 1.003]);
      const ph = voices.map(() => rnd());
      const k = 1 - Math.exp(-2 * Math.PI * cutoff / SR);
      for (let i = 0; i < n; i++) { const s = i / SR; let x = 0; for (let j = 0; j < voices.length; j++) { ph[j] = (ph[j] + voices[j] / SR) % 1; x += ph[j] * 2 - 1; } x /= voices.length; lp += k * (x - lp); lp2 += k * (lp - lp2);
        const env = Math.min(1, s / .9) * Math.min(1, Math.max(0, (dur + 1.5 - s) / 1.5)); out[i] = lp2 * env; }
      add(out, t - .3, vel * .55, vel * .52);
    },
    sub(m, t, vel = .5) { const f = hz(m), out = new Float32Array(Math.round(.55 * SR)); let ph = 0; for (let i = 0; i < out.length; i++) { const s = i / SR, fr = f * (1 + .9 * Math.exp(-s * 40)); ph += fr / SR; out[i] = Math.sin(2 * Math.PI * ph) * Math.exp(-s * 6) * Math.min(1, s / .004); } add(out, t, vel * .45, vel * .45); },
    tick(t, vel = .3, p = 0) { const out = new Float32Array(Math.round(.05 * SR)); let prev = 0; for (let i = 0; i < out.length; i++) { const x = rnd() * 2 - 1; out[i] = (x - prev) * Math.exp(-i / SR * 120); prev = x; } add(out, t, ...pan(p, vel * .08)); },
    glass(m, t, vel = .4, p = 0) { const f = hz(m), out = new Float32Array(Math.round(2.2 * SR)); for (let i = 0; i < out.length; i++) { const s = i / SR, idx = 2.2 * Math.exp(-s * 5); out[i] = Math.sin(2 * Math.PI * f * s + idx * Math.sin(2 * Math.PI * f * 3.5 * s)) * Math.exp(-s * 2.2) * Math.min(1, s / .002); } add(out, t, ...pan(p, vel * .12)); },
    drone(notes, t, dur, vel = .5) { const n = Math.round((dur + 2) * SR), out = new Float32Array(n), r = hz(notes[0]), fi = hz(notes[0] + 7);
      for (let i = 0; i < n; i++) { const s = i / SR, env = Math.min(1, s / 1.2, Math.max(0, (dur + 2 - s) / 2)); out[i] = env * (.5 * Math.sin(2 * Math.PI * r * s) + .12 * Math.sin(2 * Math.PI * r * 1.0015 * s) + .14 * Math.sin(4 * Math.PI * r * s) + .24 * Math.sin(2 * Math.PI * fi * s)); }
      add(out, t - .5, vel * .045, vel * .043); },
  };
  score(v, rnd);
  // Room, fade, normalise (final loudness is set by ffmpeg).
  const comb = (input, spread, fb) => { const out = new Float32Array(input.length);
    for (const d0 of [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617]) { const d = d0 + spread, buf = new Float32Array(d); let i = 0, store = 0; for (let n = 0; n < input.length; n++) { const y = buf[i]; store = y * .7 + store * .3; buf[i] = input[n] + store * fb; out[n] += y; i = (i + 1) % d; } }
    for (const d0 of [556, 441, 341, 225]) { const d = d0 + spread, buf = new Float32Array(d); let i = 0; for (let n = 0; n < out.length; n++) { const b = buf[i], y = -out[n] + b; buf[i] = out[n] + b * .5; out[n] = y; i = (i + 1) % d; } } return out; };
  const mono = new Float32Array(N); for (let i = 0; i < N; i++) mono[i] = (L[i] + R[i]) * .5;
  const wl = comb(mono, 0, .85), wr = comb(mono, 23, .85);
  let peak = 0;
  for (let i = 0; i < N; i++) { const s = i / SR, g = Math.min(1, s / 1.2, Math.max(0, (END - s) / 2.5)); L[i] = (L[i] * .8 + wl[i] * .04) * g; R[i] = (R[i] * .8 + wr[i] * .04) * g; peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
  const gain = .89 / peak, data = Buffer.alloc(44 + N * 4);
  data.write('RIFF', 0); data.writeUInt32LE(36 + N * 4, 4); data.write('WAVE', 8); data.write('fmt ', 12); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22); data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) { data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * gain)) * 32767), 44 + i * 4); data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * gain)) * 32767), 46 + i * 4); }
  writeFileSync(`music-${name}.wav`, data); console.log(`music-${name}.wav ${LENGTH.toFixed(1)} s`);
}
const arp = (notes, k) => { const up = [...notes, notes[1] + 12, notes[2] + 12]; return up[k % up.length]; };
const SECTION = (shot) => ({ open: 'intro', sunrise: 'morning', grille: 'morning', column: 'sutra', sutra: 'sutra', floor: 'sutra', buddha: 'buddha', upper: 'buddha', roof: 'buddha', day: 'day', golden: 'day', seasons: 'seasons', section: 'section', dusk: 'night', plan: 'night', ground: 'night', gate: 'end' })[shot];

// A: guqin and stone chime, with a quiet pulse of plucked notes.
render('a', (v, rnd) => {
  for (const c of CHORDS) {
    const t = at(c.beat), sec = SECTION(c.shot); v.drone(c.notes, t, c.len * BEAT, sec === 'night' || sec === 'end' ? .8 : 1);
    for (let b = 0; b < c.len; b += .5) {
      const k = Math.round(b * 2), tt = at(c.beat + b) + (rnd() - .5) * .012, note = arp(c.notes, k + 1) + 12, pp = (rnd() - .5) * .8;
      if (sec === 'intro') { if (k % 4 === 0 && b >= 2) v.pluck(note, tt, .32, pp); }
      else if (sec === 'morning' || sec === 'section') { if (k % 2 === 0) v.pluck(note, tt, .34 + (k % 4 === 0 ? .1 : 0), pp); }
      else if (sec === 'sutra') { if (k % 2 === 0) v.harmonic(note + 12, tt, .32, pp); if (k % 4 === 0) v.pluck(c.notes[0] + 12, tt, .3, 0); }
      else if (sec === 'buddha') { if (k % 4 === 0) v.pluck(note, tt, .3, pp); if (k % 4 === 2) v.harmonic(note + 12, tt, .25, -pp); }
      else if (sec === 'day' || sec === 'seasons') v.pluck(note, tt, .26 + (k % 2 === 0 ? .12 : 0), pp);
      else if (sec === 'night') { if (k % 4 === 0) v.harmonic(note + 12, tt, .3, pp); if (k % 6 === 3) v.pluck(c.notes[0] + 12, tt, .28, 0); }
      else if (sec === 'end') { if (k % 4 === 0 && b < 4) v.pluck(note, tt, .28, pp); }
    }
  }
  v.bell(62, .2, .5); v.bell(57, at(START.buddha), .45); v.bell(62, CARD, .3); v.pluck(50, CARD + 2.2, .3, 0);
});

// B: minimal piano: steady eighth-note arpeggios over a soft pad; whole chords at the edges.
render('b', (v, rnd) => {
  for (const c of CHORDS) {
    const t = at(c.beat), sec = SECTION(c.shot);
    v.pad(c.notes.map(m => m + 12), t, c.len * BEAT, sec === 'night' || sec === 'end' ? .35 : .28, 700);
    if (sec !== 'intro' && sec !== 'end') v.piano(c.notes[0] - 12, t, .42, -.2, Math.min(6, c.len * BEAT + 1.5));
    for (let b = 0; b < c.len; b += .5) {
      const k = Math.round(b * 2), tt = at(c.beat + b) + (rnd() - .5) * .008, note = arp(c.notes, k) + 12, pp = -.3 + (k % 6) * .12;
      if (sec === 'intro' || sec === 'end') { if (k === 0) c.notes.forEach((m, j) => v.piano(m + 12, tt + j * .03, .36, -.3 + j * .15, 6)); }
      else if (sec === 'buddha' || sec === 'night') { if (k % 2 === 0) v.piano(note, tt, .3 + (k % 4 === 0 ? .08 : 0), pp); }
      else v.piano(note, tt, .28 + (k % 4 === 0 ? .1 : 0) + (sec === 'seasons' ? .05 : 0), pp, 3.5);
    }
  }
  v.piano(74, CARD, .3, .3, 6); v.piano(81, CARD + .7, .24, .4, 6);
});

// C: ambient: pad, a soft low pulse by day, glassy bell arpeggios, light ticks; the pulse drops out
// for the Buddha and at night.
render('c', (v, rnd) => {
  for (const c of CHORDS) {
    const t = at(c.beat), sec = SECTION(c.shot);
    v.pad(c.notes, t, c.len * BEAT, .5, sec === 'day' || sec === 'seasons' ? 1500 : 900);
    for (let b = 0; b < c.len; b += .25) {
      const k = Math.round(b * 4), tt = at(c.beat + b), note = arp(c.notes, k) + 24, pp = Math.sin(k * .9) * .7;
      const pulse = !['intro', 'buddha', 'night', 'end'].includes(sec);
      if (pulse && k % 4 === 0) v.sub(c.notes[0] - 12, tt, k % 8 === 0 ? .55 : .4);
      if (pulse && k % 4 === 2) v.tick(tt, sec === 'day' || sec === 'seasons' ? .5 : .3, pp);
      if (sec === 'day' || sec === 'seasons') v.glass(note, tt, .26 + (k % 4 === 0 ? .1 : 0), pp);
      else if (sec !== 'intro' && sec !== 'end' && k % 2 === 0) v.glass(note, tt, .24, pp);
      else if ((sec === 'intro' || sec === 'end') && k % 8 === 0) v.glass(note, tt, .26, pp);
    }
  }
  v.glass(86, CARD, .35, .2); v.glass(81, CARD + .45, .3, -.2);
});

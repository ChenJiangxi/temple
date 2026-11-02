// Instrumental score for the film, synthesized in code (no music model, nothing paid):
// a low drone that follows the light (dawn, day, the Buddha, the four seasons, night), plucked
// string notes after the guqin (Karplus-Strong), guqin-like harmonics (pure tones with a quick
// attack and a long fade), and a struck stone/bell at three moments. D minor pentatonic
// (D F G A C) throughout. Section boundaries follow the cut (shots joined with 0.8 s dissolves).
// Usage: node music.mjs out.wav
import { writeFileSync } from 'node:fs';

const SR = 44100, LENGTH = 84.2 + 1.5, N = Math.ceil(LENGTH * SR);
const L = new Float32Array(N), R = new Float32Array(N);
let seed = 20261102; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const T = { dawn: 0, day: 5.2, sutra: 20.4, buddha: 33.6, seasons: 44.8, section: 62.0, night: 69.2, end: 84.2 };

function add(buf, start, gainL, gainR) { const i0 = Math.round(start * SR); for (let i = 0; i < buf.length && i0 + i < N; i++) { if (i0 + i < 0) continue; L[i0 + i] += buf[i] * gainL; R[i0 + i] += buf[i] * gainR; } }
const pan = (p) => [Math.cos((p + 1) * Math.PI / 4), Math.sin((p + 1) * Math.PI / 4)];

/** Plucked string: Karplus-Strong with a soft (pre-filtered) noise burst and a gentle loop filter. */
function pluck(midi, t, vel = .6, p = 0, seconds = 6) {
  const f = hz(midi), period = SR / f, n = Math.floor(period), frac = period - n;
  const out = new Float32Array(Math.round(seconds * SR)), line = new Float32Array(n + 2);
  for (let i = 0; i < line.length; i++) line[i] = rnd() * 2 - 1;
  for (let k = 0; k < 3; k++) for (let i = 1; i < line.length; i++) line[i] = .5 * (line[i] + line[i - 1]); // softer attack
  let idx = 0, prev = 0;
  const decay = Math.pow(.001, 1 / (f * Math.min(seconds, 2.2 + 300 / f))); // lower notes ring longer
  for (let i = 0; i < out.length; i++) {
    const a = line[idx], b = line[(idx + 1) % line.length];
    const y = decay * (.5 * (a + b) * (1 - frac * .5) + prev * frac * .5);
    prev = y; line[idx] = y; idx = (idx + 1) % line.length; out[i] = a;
  }
  // A little pure fundamental for the wooden body warmth; fade the tail.
  for (let i = 0; i < out.length; i++) { const s = i / SR; out[i] = out[i] * .8 + .25 * Math.sin(2 * Math.PI * f * s) * Math.exp(-s * 1.4); if (i > out.length - SR * .3) out[i] *= (out.length - i) / (SR * .3); }
  const [gl, gr] = pan(p); add(out, t, vel * .32 * gl, vel * .32 * gr);
}
/** Harmonic (泛音): a pure tone with a slight second partial, quick attack, long fade. */
function harmonic(midi, t, vel = .5, p = 0, seconds = 4.5) {
  const f = hz(midi), out = new Float32Array(Math.round(seconds * SR));
  for (let i = 0; i < out.length; i++) { const s = i / SR, env = Math.min(1, s / .006) * Math.exp(-s * 1.05); out[i] = env * (Math.sin(2 * Math.PI * f * s) + .12 * Math.sin(4 * Math.PI * f * s + .3)); }
  const [gl, gr] = pan(p); add(out, t, vel * .16 * gl, vel * .16 * gr);
}
/** Struck stone chime / bowl: inharmonic partials, each with its own decay and a slow beat. */
function bell(midi, t, vel = .6, seconds = 11) {
  const f = hz(midi), out = new Float32Array(Math.round(seconds * SR));
  const parts = [[1, 1, 7.5], [2.76, .45, 3.2], [5.4, .22, 1.6], [8.93, .1, .8], [1.0016, .45, 8]];
  for (let i = 0; i < out.length; i++) { const s = i / SR; let v = 0; for (const [r, a, d] of parts) v += a * Math.sin(2 * Math.PI * f * r * s) * Math.exp(-s / d * 1.6); out[i] = v * Math.min(1, s / .003); }
  add(out, t, vel * .17, vel * .17);
}
/** Drone: root and fifth with soft partials and slow beating, crossfading between chords. */
const chords = [ // [start, root midi, fifth midi]
  [T.dawn, 38, 45], [T.day + 6.5, 41, 48], [T.day + 12.5, 38, 45], [T.sutra, 43, 50], [T.buddha, 34, 41],
  [T.seasons, 38, 45], [T.seasons + 4.3, 41, 48], [T.seasons + 8.6, 43, 50], [T.seasons + 12.9, 45, 52],
  [T.section, 38, 45], [T.night, 34, 41], [T.night + 8.5, 38, 45],
];
function drone() {
  const fade = 2.4;
  for (let c = 0; c < chords.length; c++) {
    const [start, root, fifth] = chords[c], end = c + 1 < chords.length ? chords[c + 1][0] : T.end + 1.5;
    const s0 = Math.max(0, start - fade / 2), s1 = Math.min(LENGTH, end + fade / 2), n = Math.round((s1 - s0) * SR);
    const out = new Float32Array(n), fr = hz(root), ff = hz(fifth);
    for (let i = 0; i < n; i++) {
      const s = s0 + i / SR, env = Math.min(1, (s - s0) / fade, (s1 - s) / fade);
      const lfo = .75 + .25 * Math.sin(2 * Math.PI * .07 * s + c);
      let v = 0;
      for (const [f, a] of [[fr, .5], [fr * 1.0035, .35], [fr * 2, .18], [ff, .3], [ff * 1.003, .2], [fr * 3, .05], [fr * 4.004, .03]]) v += a * Math.sin(2 * Math.PI * f * s);
      out[i] = v * env * lfo;
    }
    add(out, s0, .075, .072);
  }
}
const D_PENT = [50, 53, 55, 57, 60, 62, 65, 67, 69, 72, 74, 77, 79, 81]; // D3 .. A5 in D F G A C
const near = (target) => D_PENT.reduce((a, b) => Math.abs(b - target) < Math.abs(a - target) ? b : a);

// --- the score ---
drone();
bell(62, .7, .55);                                      // dawn: one stroke as the light comes
// Day: a slow rising line to midday, then falling toward evening.
for (let t = T.day + .6; t < T.sutra - .6;) { const k = (t - T.day) / (T.sutra - T.day), target = 52 + 22 * Math.sin(Math.PI * k);
  pluck(near(target + (rnd() - .5) * 5), t, .45 + rnd() * .3, (rnd() - .5) * .8); if (rnd() < .25) pluck(near(target - 7), t + .02, .3, -.3);
  t += 1.25 + rnd() * 1.1; }
// Sutra on the columns: harmonics high up, like light through the glyphs; a few low notes.
for (let t = T.sutra + .4; t < T.buddha - .8;) { harmonic(near(74 + rnd() * 10), t, .4 + rnd() * .35, (rnd() - .5) * 1.2); if (rnd() < .3) pluck(near(50 + rnd() * 6), t + .5, .35, 0); t += 1.4 + rnd() * 1.3; }
// The Buddha: the stone chime, then near silence.
bell(57, T.buddha + .3, .55, 12); pluck(62, T.buddha + 3.4, .4, .2); harmonic(81, T.buddha + 5.6, .35, -.3); pluck(57, T.buddha + 7.9, .35, -.1); harmonic(86, T.buddha + 9.4, .3, .4);
// Seasons: a gentle figure, one chord per season (spring, summer, autumn, winter).
const figures = [[62, 69, 74, 72], [65, 72, 77, 74], [67, 74, 79, 77], [69, 74, 81, 79]];
figures.forEach((fig, s) => { const t0 = T.seasons + .3 + s * 4.3; fig.forEach((m, i) => pluck(m, t0 + i * 1.05 + (rnd() - .5) * .05, .38 + .12 * (i === 0 ? 1 : 0), -.4 + i * .27)); if (s === 3) harmonic(86, t0 + 3.4, .3, .5); });
// Section: three notes, a held breath.
pluck(57, T.section + .5, .4, -.2); pluck(62, T.section + 2.6, .38, .2); harmonic(81, T.section + 4.8, .3, 0);
// Night: low and slow; the chime under the closing title; the last low D.
for (const [dt, m, v] of [[.6, 57, .4], [3.2, 55, .38], [5.9, 53, .36], [8.6, 50, .4]]) pluck(m, T.night + dt, v, (rnd() - .5) * .6);
bell(62, T.night + 9.4, .42, 9); harmonic(74, T.night + 11.2, .28, .3); pluck(38 + 12, T.night + 12.0, .3, 0);

// --- room: a small Freeverb (8 combs + 4 allpasses per side) ---
function reverb(input, spread) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map(n => n + spread), allp = [556, 441, 341, 225].map(n => n + spread);
  const out = new Float32Array(input.length);
  for (const d of combs) { const buf = new Float32Array(d); let i = 0, store = 0; for (let n = 0; n < input.length; n++) { const y = buf[i]; store = y * .72 + store * .28; buf[i] = input[n] + store * .86; out[n] += y; i = (i + 1) % d; } }
  for (const d of allp) { const buf = new Float32Array(d); let i = 0; for (let n = 0; n < out.length; n++) { const b = buf[i], y = -out[n] + b; buf[i] = out[n] + b * .5; out[n] = y; i = (i + 1) % d; } }
  return out;
}
const mono = new Float32Array(N); for (let i = 0; i < N; i++) mono[i] = (L[i] + R[i]) * .5;
const wl = reverb(mono, 0), wr = reverb(mono, 23);
for (let i = 0; i < N; i++) { L[i] = L[i] * .78 + wl[i] * .045; R[i] = R[i] * .78 + wr[i] * .045; }
// Fade in over 2 s, out over the last 3.5 s of the picture; normalise to -1 dBFS peak.
let peak = 0;
for (let i = 0; i < N; i++) { const s = i / SR, g = Math.min(1, s / 2, Math.max(0, (T.end + .3 - s) / 3.5)); L[i] *= g; R[i] *= g; peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
const gain = Math.pow(10, -1 / 20) / peak;
const data = Buffer.alloc(44 + N * 4);
data.write('RIFF', 0); data.writeUInt32LE(36 + N * 4, 4); data.write('WAVE', 8); data.write('fmt ', 12); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22);
data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * gain)) * 32767), 44 + i * 4); data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * gain)) * 32767), 46 + i * 4); }
writeFileSync(process.argv[2] || 'music.wav', data);
console.log(`wrote ${(N / SR).toFixed(1)} s, peak gain ${gain.toFixed(2)}`);

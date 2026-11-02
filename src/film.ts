import * as THREE from 'three';
import type { TempleScene, ViewId } from './temple';
import { DEFAULT_SOLAR, solarPosition } from './solar';
import { ARCH } from './architecture';

/** Promotional film, rendered offline from the site's own scene (development aid, `?film=<shot>`).
 * Each shot is rendered frame by frame at a fixed 30 frames per second (not in real time), with
 * captions in the manner of an architectural drawing drawn onto every frame: a sheet border, a
 * title block with date, clock time and sun position, a sun-path diagram, and leader-line callouts
 * anchored to points of the building (they follow the camera). Frames are collected as JPEG and
 * downloaded as one Motion-JPEG file per shot; ffmpeg joins the shots and adds the music. */

type V3 = [number, number, number];
type Cam = { pos: V3; target: V3; fov: number };
type Callout = { at: V3; label: string; sub?: string; dx: number; dy: number; from: number; to: number };
type Level = { at: V3; label: string; name: string };
/** Level marks: lines from points on the cut face out to one column of labels beside the building. */
type Shot = {
  id: string; no: string; title: string; subtitle: string; seconds: number; view: ViewId;
  date: (t: number) => string; hour: (t: number) => number; cam: (t: number) => Cam;
  ink: 'dark' | 'light'; playing: boolean; sun: boolean;
  callouts?: Callout[]; levels?: { from: number; to: number; side: 'left' | 'right'; marks: Level[] }; card?: { kind: 'open' | 'close'; from: number; to: number };
};

const W = 1920, H = 1080, FPS = 30, TOTAL_SHOTS = 6;
const SERIF = '"Songti SC","STSong","Noto Serif SC",serif', SANS = '"PingFang SC","Helvetica Neue",sans-serif';
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const sine = (k: number) => .5 - .5 * Math.cos(Math.PI * clamp01(k));
const mix = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const move = (a: Cam, b: Cam, seconds: number) => (t: number): Cam => { const k = sine(t / seconds); return { pos: mix(a.pos, b.pos, k), target: mix(a.target, b.target, k), fov: a.fov + (b.fov - a.fov) * k }; };
const orbit = (center: V3, radius: number, height: number, a0: number, a1: number, fov: number, seconds: number) => (t: number): Cam => {
  const a = a0 + (a1 - a0) * sine(t / seconds); return { pos: [center[0] + radius * Math.sin(a), height, center[2] + radius * Math.cos(a)], target: center, fov };
};
/** Clock time running at a constant rate (a time-lapse). */
const clock = (a: number, b: number, seconds: number) => (t: number) => a + (b - a) * clamp01(t / seconds);
const fixed = (date: string) => () => date;
/** One date per frame range: the year advances at a constant rate from `start`. */
const year = (start: string, days: number, seconds: number) => (t: number) => {
  const d = new Date(Date.parse(start + 'T00:00:00Z') + Math.round(days * clamp01(t / seconds)) * 864e5);
  return d.toISOString().slice(0, 10);
};
const env = (t: number, a: number, b: number, c: number, d: number) => Math.min(clamp01((t - a) / (b - a)), 1 - clamp01((t - c) / (d - c)));

/** The film, in order. Clock times are Beijing time (solar noon on 20 March is 12:22). */
export const SHOTS: Shot[] = [
  { id: 'open', no: '', title: '', subtitle: '', seconds: 6, view: 'approach', date: fixed('2026-03-20'), hour: clock(5.75, 6.55, 6),
    cam: move({ pos: [1.7, 1.6, 21.3], target: [0, 1.6, 0], fov: 52 }, { pos: [1.3, 1.6, 19.4], target: [0, 1.6, 0], fov: 52 }, 6),
    ink: 'light', playing: true, sun: false, card: { kind: 'open', from: .6, to: 5.4 } },
  { id: 'day', no: '01', title: '一日', subtitle: '春分 · 日出到日落 · 北纬 39.9° · 入口朝南', seconds: 16, view: 'outside', date: fixed('2026-03-20'), hour: clock(6.45, 18.45, 16),
    cam: orbit([0, 0, 2], 46, 38, .5, .22, 38, 16), ink: 'dark', playing: true, sun: true,
    callouts: [
      { at: [.9, 6, -1.4], label: '屋顶 · 万字开孔', sub: '17 处，天光照佛', dx: 250, dy: -120, from: 1.5, to: 7.5 },
      { at: [-2.2, 4.4, 3.02], label: '心经墙 · 南立面', sub: '经文镂空，日光入殿', dx: -260, dy: -90, from: 5, to: 11.5 },
      { at: [-3.6, -.1, 11.5], label: '院 36 × 36 m', sub: '双池 · 香炉 · 东西廊', dx: -230, dy: 110, from: 9, to: 15.2 },
    ] },
  { id: 'sutra', no: '02', title: '心经入柱', subtitle: '冬至 · 太阳低，字影接近满柱', seconds: 14, view: 'columns', date: fixed('2026-12-21'), hour: clock(9.6, 14.6, 14),
    cam: move({ pos: [1.12, 4.05, 2.74], target: [-.581, 4.05, 1.292], fov: 80 }, { pos: [.98, 3.9, 2.7], target: [-.62, 3.95, 1.29], fov: 77 }, 14),
    ink: 'light', playing: true, sun: true,
    callouts: [
      { at: [.591, 4.2, 1.56], label: '圆柱 Ø500 · 四根', sub: '静止不动，字影在曲面上经过', dx: -330, dy: -90, from: 1.2, to: 7 },
      { at: [-.4, 4.4, 2.98], label: '心经墙 · 字孔', sub: '原作 CAD 字形 1495 个', dx: 300, dy: 190, from: 6.5, to: 13.2 },
    ] },
  { id: 'buddha', no: '03', title: '天光照佛', subtitle: '春分正午 12:05 — 12:46 · 屋顶图案完整落在佛身', seconds: 12, view: 'jade', date: fixed('2026-03-20'), hour: clock(11.4, 13.1, 12),
    cam: move({ pos: [.7, 1.65, 1.72], target: [0, 1.65, -2.55], fov: 84 }, { pos: [.5, 1.65, 1.42], target: [0, 1.72, -2.55], fov: 82 }, 12),
    ink: 'light', playing: true, sun: true,
    callouts: [
      { at: [0, 3.15, -2.5], label: '白玉浮雕 · 通高', sub: '一层延伸至二层的单块玉壁', dx: 300, dy: -120, from: 1.2, to: 6.5 },
      { at: [.32, 2.2, -2.42], label: '万字纹天光', sub: '随时刻改变位置与形状', dx: 330, dy: -40, from: 6, to: 11.3 },
    ] },
  { id: 'seasons', no: '04', title: '四季', subtitle: '每日 14:30 · 一年', seconds: 18, view: 'outside', date: year('2026-03-05', 360, 18), hour: () => 14.5,
    cam: move({ pos: [0, 10.5, 31], target: [0, 2.2, -3], fov: 42 }, { pos: [0, 9.4, 27.5], target: [0, 2.4, -3.2], fov: 42 }, 18),
    ink: 'dark', playing: true, sun: true,
    callouts: [
      { at: [12.5, 7.5, -8.5], label: '银杏', sub: '春绿 · 秋黄 · 冬落', dx: 220, dy: -120, from: 2, to: 16.5 },
    ] },
  { id: 'section', no: '05', title: '剖透视 A—A', subtitle: '沿中轴剖开 · 光照按完整建筑计算', seconds: 8, view: 'section', date: fixed('2026-03-20'), hour: clock(11.6, 13.2, 8),
    cam: move({ pos: [-14.2, 3.3, 4.9], target: [0, 2.7, -.1], fov: 40 }, { pos: [-13.2, 3.2, 4.5], target: [0, 2.7, -.1], fov: 40 }, 8),
    ink: 'dark', playing: true, sun: true,
    levels: { from: .6, to: 7.6, side: 'right', marks: [
      { at: [0, 6, 3.05], label: '+6.000', name: '屋面外沿' },
      { at: [0, ARCH.roofLow, ARCH.rainZ], label: '+5.433', name: '屋面低点 · 雨链' },
      { at: [0, 2.5, 3.0], label: '+2.500', name: '二层 · 静坐' },
      { at: [0, 0, 3.1], label: '±0.000', name: '一层 · 礼佛' },
    ] } },
  { id: 'night', no: '06', title: '夜', subtitle: '日落之后 · 灯从天沟向下，经文由内而外', seconds: 15, view: 'approach', date: fixed('2026-03-20'), hour: clock(18.25, 19.75, 15),
    cam: move({ pos: [1.3, 1.6, 19.6], target: [0, 1.6, 0], fov: 52 }, { pos: [1.05, 1.6, 16.4], target: [0, 1.6, 0], fov: 52 }, 15),
    ink: 'light', playing: true, sun: false,
    callouts: [
      { at: [-.3, -.1, 7.2], label: '经文投光', sub: '字孔把灯光写在前院', dx: -320, dy: -50, from: 4.5, to: 9.4 },
    ],
    card: { kind: 'close', from: 9.2, to: 15 } },
];

const TERMS: [string, string][] = [['01-05', '小寒'], ['01-20', '大寒'], ['02-04', '立春'], ['02-18', '雨水'], ['03-05', '惊蛰'], ['03-20', '春分'], ['04-05', '清明'], ['04-20', '谷雨'], ['05-05', '立夏'], ['05-21', '小满'], ['06-05', '芒种'], ['06-21', '夏至'], ['07-07', '小暑'], ['07-23', '大暑'], ['08-07', '立秋'], ['08-23', '处暑'], ['09-07', '白露'], ['09-23', '秋分'], ['10-08', '寒露'], ['10-23', '霜降'], ['11-07', '立冬'], ['11-22', '小雪'], ['12-07', '大雪'], ['12-21', '冬至']];
/** "3月20日 · 春分": the date and the most recent of the 24 solar terms. */
function dayLabel(date: string) {
  const [, m, d] = date.split('-'), md = `${m}-${d}`;
  let term = TERMS[TERMS.length - 1][1];
  for (const [k, name] of TERMS) if (k <= md) term = name;
  return `${+m}月${+d}日 · ${term}`;
}
const hhmm = (h: number) => { const t = Math.round(h * 60); return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };

type Ink = { fg: string; muted: string; halo: string };
const INKS: Record<'dark' | 'light', Ink> = {
  dark: { fg: '#1d1c1a', muted: 'rgba(29,28,26,.74)', halo: 'rgba(246,244,238,.62)' },
  light: { fg: '#f5f3ed', muted: 'rgba(245,243,237,.78)', halo: 'rgba(8,9,12,.5)' },
};

class Pen {
  constructor(public c: CanvasRenderingContext2D, public ink: Ink) {}
  text(s: string, x: number, y: number, size: number, o: { serif?: boolean; align?: CanvasTextAlign; muted?: boolean; spacing?: number; alpha?: number } = {}) {
    const c = this.c; c.save(); c.globalAlpha *= o.alpha ?? 1;
    c.font = `400 ${size}px ${o.serif ? SERIF : SANS}`; c.textAlign = o.align ?? 'left'; c.textBaseline = 'alphabetic';
    (c as unknown as { letterSpacing: string }).letterSpacing = `${o.spacing ?? 0}px`;
    c.lineJoin = 'round'; c.strokeStyle = this.ink.halo; c.lineWidth = Math.max(2.4, size * .15); c.strokeText(s, x, y);
    c.fillStyle = o.muted ? this.ink.muted : this.ink.fg; c.fillText(s, x, y); c.restore();
  }
  width(s: string, size: number, serif = false, spacing = 0) { const c = this.c; c.save(); c.font = `400 ${size}px ${serif ? SERIF : SANS}`; (c as unknown as { letterSpacing: string }).letterSpacing = `${spacing}px`; const w = c.measureText(s).width; c.restore(); return w; }
  line(draw: (c: CanvasRenderingContext2D) => void, width = 1.3, alpha = 1, fill = false) {
    const c = this.c; c.save(); c.globalAlpha *= alpha; c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = this.ink.halo; c.lineWidth = width + 2.4; c.beginPath(); draw(c); c.stroke();
    c.strokeStyle = this.ink.fg; c.fillStyle = this.ink.fg; c.lineWidth = width; c.beginPath(); draw(c); if (fill) c.fill(); else c.stroke(); c.restore();
  }
}

const M = 40; // sheet border inset
function project(engine: TempleScene, at: V3) {
  const v = new THREE.Vector3(at[0], at[1], at[2]).project(engine.camera);
  return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, ok: v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 };
}

function drawOverlay(c: CanvasRenderingContext2D, shot: Shot, t: number, engine: TempleScene, index: number) {
  const pen = new Pen(c, INKS[shot.ink]);
  // The opening card fades in and out; the closing card fades in and stays (the film fades to black).
  const card = !shot.card ? 0 : shot.card.kind === 'open' ? env(t, shot.card.from, shot.card.from + 1.2, shot.card.to - 1.2, shot.card.to) : clamp01((t - shot.card.from) / 1.2);
  const sheet = shot.card?.kind === 'open' ? clamp01((t - 3.8) / 2) : 1; // the opening fades the sheet in under the title
  const info = shot.card?.kind === 'close' ? 1 - card : sheet;
  // Sheet border with corner ticks.
  pen.line(x => { x.rect(M, M, W - 2 * M, H - 2 * M); }, 1, .5 * sheet);
  if (info > .01 && shot.no) {
    // Drawing title (top left).
    pen.text(shot.no, M + 32, M + 58, 16, { muted: true, alpha: info });
    pen.text(shot.title, M + 72, M + 62, 34, { serif: true, spacing: 8, alpha: info });
    pen.line(x => { x.moveTo(M + 32, M + 82); x.lineTo(M + 32 + Math.max(360, pen.width(shot.subtitle, 17) + 8), M + 82); }, 1, info);
    pen.text(shot.subtitle, M + 32, M + 112, 17, { muted: true, alpha: info });
  }
  if (info > .01) {
    // Title block (bottom right, on the border).
    const bw = 620, bh = 112, bx = W - M - bw, by = H - M - bh;
    pen.line(x => { x.rect(bx, by, bw, bh); x.moveTo(bx, by + 46); x.lineTo(bx + bw, by + 46); x.moveTo(bx + 470, by); x.lineTo(bx + 470, by + 46);
      for (const dx of [214, 330, 470]) { x.moveTo(bx + dx, by + 46); x.lineTo(bx + dx, by + bh); } }, 1, info);
    pen.text('寺 · 光与空间', bx + 16, by + 32, 22, { serif: true, spacing: 3, alpha: info });
    pen.text(shot.no ? `图 ${shot.no} / 0${TOTAL_SHOTS}` : '', bx + 486, by + 30, 15, { muted: true, alpha: info });
    const cells: [string, string, number][] = [['日期', dayLabel(engine.solar.date), 0], ['时刻', hhmm(engine.hour), 214], ['太阳高度', `${engine.altitude.toFixed(1)}°`, 330], ['方位', engine.altitude > -1 ? `${engine.azimuth.toFixed(1)}°` : '—', 470]];
    for (const [k, v, dx] of cells) { pen.text(k, bx + dx + 14, by + 68, 12, { muted: true, alpha: info }); pen.text(v, bx + dx + 14, by + 98, 20, { alpha: info }); }
    if (shot.sun) sunDiagram(pen, shot, t, info);
  }
  for (const k of shot.callouts ?? []) {
    const a = env(t, k.from, k.from + .7, k.to - .7, k.to) * info; if (a < .01) continue;
    const p = project(engine, k.at); if (!p.ok) continue;
    const ex = p.x + k.dx * .28, ey = p.y + k.dy, end = p.x + k.dx, right = k.dx > 0;
    pen.line(x => { x.arc(p.x, p.y, 7, 0, Math.PI * 2); }, 1, a);
    pen.line(x => { x.arc(p.x, p.y, 2.6, 0, Math.PI * 2); }, 1, a, true);
    pen.line(x => { const d = Math.hypot(ex - p.x, ey - p.y); x.moveTo(p.x + (ex - p.x) / d * 7, p.y + (ey - p.y) / d * 7); x.lineTo(ex, ey); x.lineTo(end, ey); }, 1.2, a);
    const tx = right ? ex + 6 : ex - 6, align: CanvasTextAlign = right ? 'left' : 'right';
    pen.text(k.label, tx, ey - 10, 19, { align, alpha: a, spacing: 2 });
    if (k.sub) pen.text(k.sub, tx, ey + 24, 14, { align, alpha: a, muted: true });
  }
  if (shot.levels) {
    const a = env(t, shot.levels.from, shot.levels.from + .8, shot.levels.to - .8, shot.levels.to) * info;
    if (a > .01) {
      const pts = shot.levels.marks.map(m => ({ m, p: project(engine, m.at) })).filter(v => v.p.ok);
      const left = shot.levels.side === 'left';
      const xm = left ? Math.max(M + 330, Math.min(...pts.map(v => v.p.x)) - 90) : Math.min(W - M - 320, Math.max(...pts.map(v => v.p.x)) + 90);
      const reach = left ? xm - 200 : xm + 200, tx = left ? xm - 18 : xm + 18, align: CanvasTextAlign = left ? 'right' : 'left';
      for (const { m, p } of pts) {
        pen.line(x => { x.moveTo(p.x, p.y); x.lineTo(reach, p.y); }, 1, a * .9);
        pen.line(x => { x.moveTo(xm, p.y); x.lineTo(xm - 8, p.y - 11); x.lineTo(xm + 8, p.y - 11); x.closePath(); }, 1, a);
        pen.text(m.label, tx, p.y - 8, 18, { alpha: a, spacing: 1, align });
        pen.text(m.name, tx, p.y + 22, 14, { alpha: a, muted: true, align });
      }
    }
  }
  if (card > .01) titleCard(c, pen, shot.card!.kind, card);
  void index;
}

/** Sun-path diagram: the horizon as a circle (north up), the sun's track so far and where it is now. */
function sunDiagram(pen: Pen, shot: Shot, t: number, alpha: number) {
  const r = 58, cx = M + 32 + r, cy = H - M - 40 - r;
  pen.line(x => { x.arc(cx, cy, r, 0, Math.PI * 2); x.moveTo(cx - r - 8, cy); x.lineTo(cx + r + 8, cy); x.moveTo(cx, cy - r - 8); x.lineTo(cx, cy + r + 8); }, 1, alpha * .8);
  pen.line(x => { x.arc(cx, cy, r * 2 / 3, 0, Math.PI * 2); x.moveTo(cx + r / 3, cy); x.arc(cx, cy, r / 3, 0, Math.PI * 2); }, .8, alpha * .45);
  pen.text('北', cx, cy - r - 14, 13, { align: 'center', muted: true, alpha });
  const at = (date: string, hour: number) => { const s = solarPosition({ ...DEFAULT_SOLAR, date }, hour); if (s.altitude <= 0) return null; const rho = r * (1 - s.altitude / 90), a = s.azimuth * Math.PI / 180; return [cx + rho * Math.sin(a), cy - rho * Math.cos(a)] as [number, number]; };
  const track: [number, number][] = [];
  for (let k = 0; k <= t * FPS; k += 2) { const q = at(shot.date(k / FPS), shot.hour(k / FPS)); if (q) track.push(q); }
  if (track.length > 1) pen.line(x => { x.moveTo(track[0][0], track[0][1]); for (const q of track) x.lineTo(q[0], q[1]); }, 1.2, alpha);
  const now = at(shot.date(t), shot.hour(t));
  if (now) pen.line(x => { x.arc(now[0], now[1], 5, 0, Math.PI * 2); }, 1, alpha, true);
  pen.text('太阳轨迹', cx + r + 18, cy + r - 2, 13, { muted: true, alpha });
}

function titleCard(c: CanvasRenderingContext2D, pen: Pen, kind: 'open' | 'close', a: number) {
  c.save(); c.globalAlpha = a * .5;
  const cy = kind === 'open' ? 190 : 170;
  const g = c.createRadialGradient(W / 2, cy, 30, W / 2, cy, 520); g.addColorStop(0, 'rgba(6,7,10,.75)'); g.addColorStop(1, 'rgba(6,7,10,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore();
  if (kind === 'open') {
    pen.text('寺', W / 2, cy + 20, 128, { serif: true, align: 'center', alpha: a });
    pen.text('光与空间', W / 2 + 8, cy + 72, 22, { align: 'center', spacing: 16, alpha: a });
    pen.line(x => { x.moveTo(W / 2 - 120, cy + 98); x.lineTo(W / 2 + 120, cy + 98); }, 1, a);
    pen.text('一座小寺的日照与四季', W / 2, cy + 130, 17, { align: 'center', muted: true, spacing: 4, alpha: a });
  } else {
    pen.text('寺 · 光与空间', W / 2 + 6, cy, 52, { serif: true, align: 'center', spacing: 12, alpha: a });
    pen.line(x => { x.moveTo(W / 2 - 150, cy + 30); x.lineTo(W / 2 + 150, cy + 30); }, 1, a);
    pen.text('temple.jessylab.cc', W / 2, cy + 70, 22, { align: 'center', spacing: 3, alpha: a });
    pen.text('根据原作 CAD 图纸与模型照片重建', W / 2, cy + 104, 15, { align: 'center', muted: true, spacing: 2, alpha: a });
  }
}

const jpeg = (canvas: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob')), 'image/jpeg', .93));
const tick = () => new Promise(r => setTimeout(r, 0));

/** Render frames [from, to) of one shot (or only the frames in `still`), then download them as
 * one Motion-JPEG file. Each run renders some frames before `from` uncaptured, so the light's
 * temporal smoothing is settled when capture starts. `ratio` supersamples the 3D image. */
export async function runFilm(engine: TempleScene, id: string, o: { from?: number; to?: number; still?: number[]; ratio?: number; status: (s: string) => void }) {
  const index = SHOTS.findIndex(s => s.id === id), shot = SHOTS[index];
  if (!shot) { o.status(`film-error unknown shot ${id}`); return; }
  const total = Math.round(shot.seconds * FPS), from = Math.max(0, o.from ?? 0), to = Math.min(total, o.to ?? total);
  engine.filmStart(W, H, o.ratio ?? 1.5);
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const c = out.getContext('2d')!; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  await document.fonts.load(`24px ${SERIF}`); await document.fonts.load(`24px ${SANS}`);
  const wanted = o.still ? [...o.still].sort((a, b) => a - b) : null;
  const frames: number[] = [];
  if (wanted) { for (const s of wanted) for (let f = Math.max(0, s - 24); f <= s; f++) frames.push(f); }
  else for (let f = Math.max(0, from - 45); f < to; f++) frames.push(f);
  const parts: Blob[] = []; let date = ''; const started = performance.now(); let last = -2;
  for (const f of frames) {
    const t = f / FPS, dt = f === last + 1 ? 1 / FPS : 1;
    last = f;
    const d = shot.date(t); if (d !== date) { engine.filmDate(d); date = d; }
    engine.filmSun(shot.hour(t), shot.playing);
    const cam = shot.cam(t); engine.filmCamera(shot.view, cam.pos, cam.target, cam.fov);
    engine.filmFrame(dt, shot.playing);
    const capture = wanted ? wanted.includes(f) : f >= from;
    if (!capture) { if (f % 8 === 0) await tick(); continue; }
    c.drawImage(engine.renderer.domElement, 0, 0, W, H);
    drawOverlay(c, shot, t, engine, index);
    parts.push(await jpeg(out));
    if (parts.length % 10 === 0) o.status(`film ${id} ${parts.length}/${wanted ? wanted.length : to - from}`);
  }
  const blob = new Blob(parts, { type: 'application/octet-stream' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `film-${id}-${wanted ? 'still' : `${String(from).padStart(4, '0')}-${String(to).padStart(4, '0')}`}.mjpeg`;
  document.body.appendChild(a); a.click();
  o.status(`film-done ${id} ${parts.length} frames ${Math.round((performance.now() - started) / 100) / 10}s`);
}

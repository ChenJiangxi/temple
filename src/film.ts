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

const W = 1920, H = 1080, FPS = 30, TOTAL_SHOTS = 16;
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

/** The film, in order (third cut: faster, and mostly held light rather than time-lapse). Shots are
 * whole numbers of beats at 92 BPM plus the dissolve, so every cut falls on the beat of the music.
 * Clock times are Beijing time (solar noon on 20 March is 12:22). Most shots hold the time nearly
 * still and move the camera; only "一日" and "四季" run time. */
export const BPM = 92, BEAT = 60 / BPM, XFADE = .4;
const beats = (n: number) => n * BEAT + XFADE;
const EQ = fixed('2026-03-20'), WINTER = fixed('2026-12-21');
export const SHOTS: Shot[] = [
  { id: 'open', no: '', title: '', subtitle: '', seconds: beats(8), view: 'outside', date: EQ, hour: clock(6.0, 6.06, beats(8)),
    // The site's own axonometric camera (the author's screenshot), turning a few degrees.
    cam: orbit([0, 2.6, 0], 162.9, 100.5, .82, .73, 4, beats(8)), ink: 'light', playing: false, sun: false, card: { kind: 'open', from: .5, to: beats(8) - .3 } },
  { id: 'sunrise', no: '01', title: '日出', subtitle: '春分 06:25 · 第一缕光擦过心经墙', seconds: beats(6), view: 'approach', date: EQ, hour: clock(6.43, 6.47, beats(6)),
    cam: move({ pos: [4.2, 1.6, 18.5], target: [0, 1.7, 0], fov: 50 }, { pos: [3.1, 1.6, 17.2], target: [0, 1.7, 0], fov: 50 }, beats(6)), ink: 'light', playing: false, sun: true },
  { id: 'grille', no: '02', title: '格栅', subtitle: '上午 · 低角度阳光穿过竖向格栅', seconds: beats(6), view: 'gallery', date: EQ, hour: clock(7.6, 7.62, beats(6)),
    cam: move({ pos: [7.2, 1.6, 6.4], target: [2.2, 2.4, 1.2], fov: 40 }, { pos: [6.6, 1.65, 7.0], target: [2.0, 2.5, 1.4], fov: 40 }, beats(6)), ink: 'dark', playing: false, sun: true,
    callouts: [{ at: [3.02, 3.4, 2.2], label: '竖向格栅', sub: '朱红钢板 · 光与影的间距', dx: 260, dy: -110, from: .7, to: beats(6) - .5 }] },
  { id: 'column', no: '03', title: '心经入柱', subtitle: '冬至上午 · 字影落在圆柱上', seconds: beats(6), view: 'column', date: WINTER, hour: clock(10.5, 10.6, beats(6)),
    cam: move({ pos: [.24, 3.2, 2.7], target: [.591, 3.2, 1.307], fov: 48 }, { pos: [.12, 3.32, 2.56], target: [.591, 3.26, 1.307], fov: 45 }, beats(6)), ink: 'light', playing: false, sun: true,
    callouts: [{ at: [.42, 3.15, 1.55], label: '字影', sub: '曲面上变形、经过、离开', dx: -300, dy: -40, from: .7, to: beats(6) - .5 }] },
  { id: 'sutra', no: '04', title: '心经入柱 · 整柱', subtitle: '冬至 · 太阳低，字影接近满柱', seconds: beats(6), view: 'columns', date: WINTER, hour: clock(11.2, 11.3, beats(6)),
    cam: move({ pos: [1.16, 4.1, 2.76], target: [-.581, 4.05, 1.292], fov: 80 }, { pos: [.9, 3.9, 2.68], target: [-.62, 3.95, 1.29], fov: 77 }, beats(6)), ink: 'light', playing: false, sun: true },
  { id: 'floor', no: '05', title: '静坐', subtitle: '二层 · 经文落在地面与蒲团上', seconds: beats(6), view: 'gallery', date: WINTER, hour: clock(11.5, 11.6, beats(6)),
    cam: move({ pos: [1.55, 4.05, 2.75], target: [.1, 2.5, 1.85], fov: 56 }, { pos: [1.2, 4.0, 2.78], target: [-.3, 2.5, 1.9], fov: 56 }, beats(6)), ink: 'light', playing: false, sun: true,
    callouts: [{ at: [.382, 2.62, 1.95], label: '蒲团', sub: '柱后静坐', dx: 260, dy: 90, from: .7, to: beats(6) - .5 }] },
  { id: 'buddha', no: '06', title: '天光照佛', subtitle: '春分正午 · 屋顶万字纹完整落在佛身', seconds: beats(8), view: 'jade', date: EQ, hour: clock(12.36, 12.42, beats(8)),
    cam: move({ pos: [.7, 1.65, 1.72], target: [0, 1.65, -2.55], fov: 84 }, { pos: [.45, 1.65, 1.36], target: [0, 1.74, -2.55], fov: 81 }, beats(8)), ink: 'light', playing: false, sun: true,
    callouts: [{ at: [0, 3.15, -2.5], label: '白玉浮雕 · 通高', sub: '一层延伸至二层的单块玉壁', dx: 300, dy: -120, from: .8, to: beats(8) - .5 }] },
  { id: 'upper', no: '07', title: '佛首', subtitle: '二层静坐处与佛首相对', seconds: beats(6), view: 'gallery', date: EQ, hour: clock(12.44, 12.48, beats(6)),
    cam: move({ pos: [.3, 3.95, 1.15], target: [0, 3.5, -2.45], fov: 54 }, { pos: [.22, 3.95, .98], target: [0, 3.56, -2.45], fov: 51 }, beats(6)), ink: 'light', playing: false, sun: true },
  { id: 'roof', no: '08', title: '天光', subtitle: '仰望屋顶 · 万字开孔与天空', seconds: beats(6), view: 'gallery', date: EQ, hour: clock(12.5, 12.52, beats(6)),
    cam: move({ pos: [.9, 1.45, .95], target: [-.1, 5.6, -1.2], fov: 74 }, { pos: [.7, 1.45, .8], target: [.15, 5.6, -1.25], fov: 74 }, beats(6)), ink: 'light', playing: false, sun: true },
  { id: 'day', no: '09', title: '一日', subtitle: '春分 · 日出到日落', seconds: beats(8), view: 'outside', date: EQ, hour: clock(6.6, 18.3, beats(8)),
    cam: orbit([0, 0, 2], 46, 38, .5, .3, 38, beats(8)), ink: 'dark', playing: true, sun: true },
  { id: 'golden', no: '10', title: '斜阳', subtitle: '春分 16:55 · 西晒把格栅染成暖色', seconds: beats(6), view: 'approach', date: EQ, hour: clock(16.9, 16.93, beats(6)),
    cam: move({ pos: [-13.5, 1.6, 7.5], target: [0, 1.8, 0], fov: 46 }, { pos: [-12.6, 1.6, 9.4], target: [0, 1.8, 0], fov: 46 }, beats(6)), ink: 'dark', playing: false, sun: true },
  { id: 'seasons', no: '11', title: '四季', subtitle: '每日 14:30 · 一年', seconds: beats(12), view: 'outside', date: year('2026-03-05', 360, beats(12)), hour: () => 14.5,
    cam: move({ pos: [0, 10.5, 31], target: [0, 2.2, -3], fov: 42 }, { pos: [0, 9.4, 27.5], target: [0, 2.4, -3.2], fov: 42 }, beats(12)), ink: 'dark', playing: true, sun: true,
    callouts: [{ at: [12.5, 7.5, -8.5], label: '银杏', sub: '春绿 · 秋黄 · 冬落', dx: 220, dy: -120, from: .8, to: beats(12) - .6 }] },
  { id: 'section', no: '12', title: '剖透视 A—A', subtitle: '沿中轴剖开 · 光照按完整建筑计算', seconds: beats(6), view: 'section', date: EQ, hour: clock(12.3, 12.4, beats(6)),
    cam: move({ pos: [-14.2, 3.3, 4.9], target: [0, 2.7, -.1], fov: 40 }, { pos: [-13.0, 3.2, 4.4], target: [0, 2.7, -.1], fov: 40 }, beats(6)), ink: 'dark', playing: false, sun: true,
    levels: { from: .5, to: beats(6) - .4, side: 'right', marks: [
      { at: [0, 6, 3.05], label: '+6.000', name: '屋面外沿' },
      { at: [0, ARCH.roofLow, ARCH.rainZ], label: '+5.433', name: '屋面低点 · 雨链' },
      { at: [0, 2.5, 3.0], label: '+2.500', name: '二层 · 静坐' },
      { at: [0, 0, 3.1], label: '±0.000', name: '一层 · 礼佛' },
    ] } },
  { id: 'dusk', no: '13', title: '入夜', subtitle: '日落之后 · 灯从天沟向下', seconds: beats(6), view: 'approach', date: EQ, hour: clock(18.85, 18.9, beats(6)),
    cam: move({ pos: [1.3, 1.6, 19.6], target: [0, 1.6, 0], fov: 52 }, { pos: [1.1, 1.6, 17.9], target: [0, 1.6, 0], fov: 52 }, beats(6)), ink: 'light', playing: false, sun: false },
  { id: 'plan', no: '14', title: '前院', subtitle: '经文由内而外，投在石板上', seconds: beats(6), view: 'outside', date: EQ, hour: clock(19.15, 19.17, beats(6)),
    cam: move({ pos: [3.2, 4.6, 14.2], target: [0, 0, 5.2], fov: 50 }, { pos: [2.3, 4.25, 13.0], target: [0, .1, 4.9], fov: 50 }, beats(6)), ink: 'light', playing: false, sun: false,
    callouts: [{ at: [-.3, -.1, 7.6], label: '经文投光', sub: '白天光入殿，夜里光出殿', dx: -330, dy: -110, from: .6, to: beats(6) - .5 }] },
  { id: 'ground', no: '15', title: '地面', subtitle: '经文落在石板与水面上', seconds: beats(6), view: 'gallery', date: EQ, hour: clock(19.25, 19.27, beats(6)),
    cam: move({ pos: [1.2, .35, 11.2], target: [0, 1.6, 0], fov: 58 }, { pos: [.85, .42, 9.0], target: [0, 1.7, 0], fov: 58 }, beats(6)), ink: 'light', playing: false, sun: false },
  { id: 'gate', no: '16', title: '院门', subtitle: '出院门回望', seconds: beats(12), view: 'approach', date: EQ, hour: clock(19.4, 19.5, beats(12)),
    cam: move({ pos: [.9, 1.6, 17.5], target: [0, 1.7, 0], fov: 52 }, { pos: [.3, 1.6, 30.5], target: [0, 1.9, 0], fov: 44 }, beats(12)),
    ink: 'light', playing: false, sun: false, card: { kind: 'close', from: 4.2, to: beats(12) } },
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
    pen.text(shot.no ? `图 ${shot.no} / ${String(TOTAL_SHOTS).padStart(2, '0')}` : '', bx + 486, by + 30, 15, { muted: true, alpha: info });
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
  // Opening: in the left third, beside the building (the aerial view puts the building at the centre).
  const cx = kind === 'open' ? 360 : W / 2, cy = kind === 'open' ? 470 : 170;
  const g = c.createRadialGradient(cx, cy, 30, cx, cy, 520); g.addColorStop(0, 'rgba(6,7,10,.75)'); g.addColorStop(1, 'rgba(6,7,10,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore();
  if (kind === 'open') {
    pen.text('寺', cx, cy + 20, 128, { serif: true, align: 'center', alpha: a });
    pen.text('光与空间', cx + 8, cy + 72, 22, { align: 'center', spacing: 16, alpha: a });
    pen.line(x => { x.moveTo(cx - 120, cy + 98); x.lineTo(cx + 120, cy + 98); }, 1, a);
    pen.text('一座小寺的光与影', cx, cy + 130, 17, { align: 'center', muted: true, spacing: 4, alpha: a });
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
 * one Motion-JPEG file. Each run renders 90 frames before `from` uncaptured (from an exact bounce
 * light), so the light's temporal smoothing has settled when capture starts. `ratio` supersamples the 3D image. */
export async function runFilm(engine: TempleScene, id: string, o: { from?: number; to?: number; still?: number[]; ratio?: number; status: (s: string) => void }) {
  const index = SHOTS.findIndex(s => s.id === id), shot = SHOTS[index];
  if (!shot) { o.status(`film-error unknown shot ${id}`); return; }
  const total = Math.round(shot.seconds * FPS), from = Math.max(0, o.from ?? 0), to = Math.min(total, o.to ?? total);
  engine.filmStart(W, H, o.ratio ?? 1.5);
  // The sky-visibility field is measured in the background after the page reports ready; frames
  // made before it is done get a different exposure and sky light. Wait for it.
  o.status('film waiting for sky field');
  while (!engine.skyField.values) await new Promise(r => setTimeout(r, 100));
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const c = out.getContext('2d')!; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  await document.fonts.load(`24px ${SERIF}`); await document.fonts.load(`24px ${SANS}`);
  const wanted = o.still ? [...o.still].sort((a, b) => a - b) : null;
  const frames: number[] = [];
  if (wanted) { for (const s of wanted) for (let f = Math.max(0, s - 24); f <= s; f++) frames.push(f); }
  else for (let f = Math.max(0, from - 90); f < to; f++) frames.push(f);
  const parts: Blob[] = []; let date = ''; const started = performance.now(); let last = -2;
  for (const f of frames) {
    const t = f / FPS, jump = f !== last + 1, dt = jump ? 1 : 1 / FPS;
    last = f;
    const d = shot.date(t); if (d !== date) { engine.filmDate(d); date = d; }
    // After a jump (the start of a run or a still), compute the bounce light exactly instead of
    // easing toward it, so no state from the page's initial view leaks into the frames; a part
    // rendered on its own then joins the previous part without a visible step.
    engine.filmSun(shot.hour(t), shot.playing && !jump);
    const cam = shot.cam(t); engine.filmCamera(shot.view, cam.pos, cam.target, cam.fov);
    engine.filmFrame(dt, shot.playing);
    const capture = wanted ? wanted.includes(f) : f >= from;
    if (!capture) { if (f % 8 === 0) await tick(); continue; }
    // (the first captured frame after a jump would show the exact bounce light ahead of the eased
    // sequence: still mode only; film runs always start with a warm-up)
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

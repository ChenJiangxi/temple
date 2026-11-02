import * as THREE from 'three';
import { ARCH } from './architecture';

/** Night lighting (design proposal, 2026-11-02). By day the sun carries the sutra into the temple;
 * by night the temple's light carries it out into the court. All of it comes down from the roof
 * valley, as the daylight and the rain do: the luminaires sit in slots along the valley's two
 * edges and at its drain, so every light in the temple falls from above. (A first version lit the
 * Buddha from a floor slot; light from below is wrong for a Buddha and was removed.)
 *  - north edge, centre: a projector aimed at the back of the sutra screen; light leaves through
 *    the glyph holes and lays the text across the forecourt; the columns show as dark bands;
 *  - north edge, either side of the chain: two key lights about 45 degrees above the Buddha, so
 *    brow, nose and the folds of the robe cast soft shadows downward, as in daylight;
 *  - south edge: a wash down onto the meditation floor (the columns cast soft shadows on it), and
 *    a second lamp angled up onto the underside of the front roof, so the screen glows from the court;
 *  - the drain: a narrow beam straight down the rain chain into the water of the jar;
 *  - a weak shadowless fill in the hall for light bouncing off the lit carving.
 * Warm white, about 2700-3000 K. Shadows are soft (PCF, a few texels). Intensities are in the
 * scene's light units (the sun is about 3.3); the exposure rises at night (temple.ts). */
export function createNightLights() {
  const group = new THREE.Group(); group.name = 'night-lighting'; group.visible = false;
  // Warm white as the adapted eye sees it (a saturated orange read as theatrical).
  const warm = new THREE.Color('#ffd2a4'), neutral = new THREE.Color('#ffe4c8');
  const low = ARCH.roofLow - .03, north = ARCH.roofBackInner + .03, south = ARCH.roofFrontInner - .03;
  const spot = (color: THREE.Color, angle: number, penumbra: number, at: number[], to: number[], shadow = 0, radius = 3) => {
    const s = new THREE.SpotLight(color, 0, 0, angle, penumbra, 2);
    s.position.set(at[0], at[1], at[2]); s.target.position.set(to[0], to[1], to[2]);
    if (shadow) { s.castShadow = true; s.shadow.mapSize.set(shadow, shadow); s.shadow.camera.near = .2; s.shadow.camera.far = 30; s.shadow.bias = -.0004; s.shadow.normalBias = .015; s.shadow.radius = radius; }
    group.add(s, s.target); return s;
  };
  const projector = spot(warm, .92, .4, [0, low, north], [0, 3.7, 3.03], 2048, 1.5);
  // The Buddha's key lights are the whitest (about 3500 K): warmer light turned the white jade to ivory.
  // One key and one fill (about 3:1), not two equal lights, so the face and robe keep their volume.
  const keys = [-1, 1].map(s => spot(new THREE.Color('#fff1e3'), .6, .65, [s * .75, low, north], [-s * .1, 2.95, -2.5], 1024, 3.5));
  const wash = spot(warm, 1.05, .75, [0, low, south], [0, ARCH.upperFloor, 2.2], 1024, 3);
  const chainBeam = spot(neutral, .1, .5, [0, low, ARCH.rainZ], [0, .9, ARCH.rainZ]);
  // Also from the south edge, angled up onto the underside of the front roof: from the court one
  // looks up through the glyph holes at this ceiling, so it is what makes the whole screen glow.
  const ceiling = spot(warm, 1.3, 1, [0, low, south], [0, 5.85, 2.75]);
  const fill = new THREE.PointLight(new THREE.Color('#ffe2c2'), 0, 5, 2); fill.position.set(0, 1.4, -1.0); group.add(fill);

  // The luminaire slots under the valley edges: dark red-black by day, glowing at night.
  const slotMaterial = new THREE.MeshBasicMaterial({ color: '#3a1d1c' });
  const lens = new THREE.Group(); lens.name = 'valley-light-slots';
  for (const z of [north, south]) { const m = new THREE.Mesh(new THREE.BoxGeometry(3.4, .006, .035), slotMaterial); m.position.set(0, ARCH.roofLow - .004, z); m.castShadow = false; lens.add(m); }

  // A faint line of light where the slot is, not a bright tube.
  const day = new THREE.Color('#3a1d1c'), night = new THREE.Color('#ffd6ab').multiplyScalar(1.4);
  /** nightness: 0 by day, 1 in full night. */
  const update = (nightness: number) => {
    const on = nightness > .002;
    group.visible = on;
    projector.intensity = 13 * nightness;
    keys[0].intensity = 5.2 * nightness; keys[1].intensity = 1.7 * nightness;
    wash.intensity = 8.5 * nightness; ceiling.intensity = 5 * nightness; chainBeam.intensity = 25 * nightness; fill.intensity = .45 * nightness;
    slotMaterial.color.copy(day).lerp(night, nightness);
    return on;
  };
  return { group, lens, update };
}

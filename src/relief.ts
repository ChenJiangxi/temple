import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const JADE_GLSL = `
#if defined( JADE_SSS ) && NUM_DIR_LIGHTS > 0
{
 DirectionalLight jadeLight = directionalLights[ 0 ];
 float jadeShadow = 1.0;
 #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
  DirectionalLightShadow jadeShadowInfo = directionalLightShadows[ 0 ];
  jadeShadow = solarShadow( directionalShadowMap[ 0 ], jadeShadowInfo.shadowMapSize, jadeShadowInfo.shadowIntensity, jadeShadowInfo.shadowBias, jadeShadowInfo.shadowRadius, vDirectionalShadowCoord[ 0 ] );
 #endif
 float jadeNL = dot( geometryNormal, jadeLight.direction );
 // Wrapped light past the terminator plus light re-emerging from inside, tinted by the stone.
 float jadeWrap = max( 0.0, ( jadeNL + 0.45 ) / 1.45 ) - max( 0.0, jadeNL );
 // Kept small in direct sun: the stone already reflects it; a large term burnt the lit patches white.
 float jadeInner = 0.12 * max( jadeNL, 0.0 ) + 0.55 * jadeWrap;
 reflectedLight.directDiffuse += jadeLight.color * roofTint( vSkyWorld ) * jadeShadow * jadeInner * uJadeGlow * material.diffuseColor * RECIPROCAL_PI * 3.0;
}
#endif
`;

/** Faint cloudy 'cotton' inclusions (棉絮), barely any veining, near white so the material colour sets the hue. */
function jadeTexture() {
 const size = 512, c = document.createElement('canvas'); c.width = c.height = size;
 const ctx = c.getContext('2d')!, img = ctx.createImageData(size, size);
 let seed = 5; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
 const grid = 64, g: number[] = Array.from({length: (grid + 1) * (grid + 1)}, rand);
 const noise = (x: number, y: number) => {
  const xi = Math.floor(x) % grid, yi = Math.floor(y) % grid, xf = x - Math.floor(x), yf = y - Math.floor(y);
  const s = (t: number) => t * t * (3 - 2 * t), at = (i: number, j: number) => g[(j % grid) * (grid + 1) + (i % grid)];
  const a = at(xi, yi), b = at(xi + 1, yi), cc = at(xi, yi + 1), d = at(xi + 1, yi + 1);
  return a + (b - a) * s(xf) + (cc - a) * s(yf) + (a - b - cc + d) * s(xf) * s(yf);
 };
 const fbm = (x: number, y: number) => { let v = 0, amp = .5, f = 1; for (let o = 0; o < 5; o++) { v += amp * noise(x * f, y * f); f *= 2.03; amp *= .5 } return v };
 for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  const u = x / size * 6, v = y / size * 6;
  const cloud = fbm(u, v), vein = Math.abs(fbm(u * 1.7 + 9, v * .6 + 3) - .5);
  // White nephrite is fine and even: the cotton reads only as slightly whiter, denser clouds.
  let k = .93 + .08 * (cloud - .5) + .06 * Math.max(0, cloud - .62) * 3;
  k -= .01 * Math.max(0, .012 - vein) / .012;
  const p = (y * size + x) * 4;
  img.data[p] = 255 * Math.min(1, k * .99); img.data[p + 1] = 255 * Math.min(1, k); img.data[p + 2] = 255 * Math.min(1, k * .985); img.data[p + 3] = 255;
 }
 ctx.putImageData(img, 0, 0);
 const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

/** Continuous carved surface, sides and back. All values in the asset are metres. */
export async function createMonolithicRelief(url: string): Promise<THREE.Group> {
 const response = await fetch(url);
 if (!response.ok) throw new Error(`Relief geometry: ${response.status}`);
 const data = await response.arrayBuffer();
 const header = new DataView(data);
 const columns = header.getUint32(0, true), rows = header.getUint32(4, true);
 if (columns < 2 || rows < 2 || columns > 2048 || rows > 2048 || data.byteLength !== 8 + columns * rows * 4) {
  throw new Error('Invalid relief geometry');
 }
 const heights = new Float32Array(data, 8);
 const width = 4.1, height = 4.4, back = -.18;
 const front = new THREE.PlaneGeometry(width, height, columns - 1, rows - 1);
 const positions = front.attributes.position;
 for (let i = 0; i < positions.count; i++) positions.setZ(i, heights[i]);
 front.computeVertexNormals();
 // Cavity (ambient occlusion) of the carving from its own height field: for each point, how far
 // the surrounding relief rises above it in eight directions out to about 13 cm (horizon angles).
 // Eye sockets, the corners of the mouth and the folds of the robe receive less of the room's
 // light. Used in the shader mostly on indirect light (white jade has no colour contrast, so
 // without this the carving reads flat under soft light).
 const cell = width / (columns - 1), cavity = new Float32Array(positions.count);
 const at = (x: number, y: number) => heights[Math.min(rows - 1, Math.max(0, y)) * columns + Math.min(columns - 1, Math.max(0, x))];
 const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
 for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
  const h = at(x, y); let occluded = 0;
  for (const [dx, dy] of dirs) {
   const step = Math.hypot(dx, dy) * cell; let slope = 0;
   for (const r of [1, 2, 4, 8, 16]) slope = Math.max(slope, (at(x + dx * r, y + dy * r) - h) / (r * step));
   occluded += Math.atan(slope) / (Math.PI / 2);
  }
  cavity[y * columns + x] = Math.min(1, Math.max(.32, 1 - 1.5 * occluded / dirs.length));
 }
 front.setAttribute('cavity', new THREE.Float32BufferAttribute(cavity, 1));
 // The front edge meets the back as one closed block; no separate face or limbs.
 const sidePositions: number[] = [], sideUV: number[] = [];
 const perimeter: number[] = [];
 for (let x = 0; x < columns; x++) perimeter.push(x);
 for (let y = 1; y < rows; y++) perimeter.push(y * columns + columns - 1);
 for (let x = columns - 2; x >= 0; x--) perimeter.push((rows - 1) * columns + x);
 for (let y = rows - 2; y > 0; y--) perimeter.push(y * columns);
 const vertex = (i: number, z: number) => {
  sidePositions.push(positions.getX(i), positions.getY(i), z);
  sideUV.push(0, 0);
 };
 for (let n = 0; n < perimeter.length; n++) {
  const a = perimeter[n], b = perimeter[(n + 1) % perimeter.length];
  vertex(a, heights[a]); vertex(b, heights[b]); vertex(a, back);
  vertex(b, heights[b]); vertex(b, back); vertex(a, back);
 }
 const sides = new THREE.BufferGeometry();
 sides.setAttribute('position', new THREE.Float32BufferAttribute(sidePositions, 3));
 sides.setAttribute('uv', new THREE.Float32BufferAttribute(sideUV, 2));
 sides.setIndex(Array.from({length: sidePositions.length / 3}, (_, i) => i));
 sides.setAttribute('cavity', new THREE.Float32BufferAttribute(new Float32Array(sidePositions.length / 3).fill(1), 1));
 sides.computeVertexNormals();
 const rear = new THREE.PlaneGeometry(width, height);
 rear.rotateY(Math.PI); rear.translate(0, 0, back);
 rear.setAttribute('cavity', new THREE.Float32BufferAttribute(new Float32Array(rear.attributes.position.count).fill(1), 1));
 const geometry = mergeGeometries([front, sides, rear]);
 front.dispose(); sides.dispose(); rear.dispose();
 if (!geometry) throw new Error('Relief geometry could not be assembled');
 // White jade (author, 2026-11-02: white, not green), after Hetian mutton-fat nephrite (羊脂白玉):
 // a warm creamy white, a soft waxy-greasy lustre rather than a glassy shine, faint cotton
 // inclusions, light that enters and re-emerges warm (approximate subsurface scattering), and
 // slightly softened shadow edges on its face. No photographed shading.
 const material = new THREE.MeshPhysicalMaterial({
  color: '#ebe6dc', map: jadeTexture(), roughness: .44, metalness: 0,
  clearcoat: .32, clearcoatRoughness: .34, ior: 1.61,
  sheen: .25, sheenRoughness: .55, sheenColor: new THREE.Color('#fff6e8'),
 });
 material.defines = { ...(material.defines ?? {}), SUBSURFACE_SOFTEN: '', JADE_SSS: '' };
 material.userData.cacheKey = '+white-jade-v3';
 material.userData.afterSolarCompile = (shader: {uniforms: Record<string, THREE.IUniform>; vertexShader: string; fragmentShader: string}) => {
  shader.vertexShader = shader.vertexShader
   .replace('#include <common>', '#include <common>\nattribute float cavity;\nvarying float vCavity;')
   .replace('#include <begin_vertex>', '#include <begin_vertex>\n vCavity = cavity;');
  shader.uniforms.uSubsurfaceRadius = { value: .022 };
  shader.uniforms.uJadeGlow = { value: new THREE.Color('#fff7ee') };
  // Light scattered inside the stone also lifts the parts in shade: softer, more luminous gradients.
  shader.uniforms.uJadeIndirect = { value: new THREE.Vector3(1.16, 1.15, 1.13) };
  shader.fragmentShader = shader.fragmentShader
   .replace('#include <common>', '#include <common>\nuniform vec3 uJadeGlow;\nuniform vec3 uJadeIndirect;')
   .replace('#include <common>', '#include <common>\nvarying float vCavity;')
   .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n reflectedLight.indirectDiffuse *= uJadeIndirect * vCavity;\n reflectedLight.indirectSpecular *= vCavity;\n reflectedLight.directDiffuse *= mix( 1.0, vCavity, 0.35 );')
   .replace('#include <lights_fragment_maps>', JADE_GLSL + '#include <lights_fragment_maps>');
 };
 const surface = new THREE.Mesh(geometry, material);
 surface.name = 'continuous-jade-carving';
 surface.castShadow = surface.receiveShadow = true;
 const group = new THREE.Group();
 group.name = 'single-monolithic-jade-buddha';
 group.add(surface);
 // Section view: the carving's own profile on the centre line (x = 0), from the height data,
 // drawn as solid fill where the section plane cuts it. The carving has folds and undercuts,
 // so its inside cannot be filled reliably by looking through the cut; this cap covers it.
 const mid = (columns - 1) / 2, c0 = Math.floor(mid), c1 = Math.min(columns - 1, c0 + 1), f = mid - c0;
 const profile = new THREE.Shape();
 for (let r = 0; r < rows; r++) {
  const z = heights[r * columns + c0] * (1 - f) + heights[r * columns + c1] * f, y = height / 2 - r * height / (rows - 1);
  if (r === 0) profile.moveTo(z, y); else profile.lineTo(z, y);
 }
 // Back edge 2 cm into the wall's own fill, so no sliver of lit wall shows between them.
 profile.lineTo(back - .02, -height / 2); profile.lineTo(back - .02, height / 2); profile.closePath();
 const cap = new THREE.Mesh(new THREE.ShapeGeometry(profile), new THREE.MeshBasicMaterial({ color: '#1d1b1a', fog: false }));
 cap.rotation.y = -Math.PI / 2; cap.position.x = .0005; cap.name = 'relief-section-profile';
 cap.visible = false; cap.userData.sectionOnly = true; cap.userData.sectionKeep = true;
 group.add(cap);
 group.position.set(0, 2.95, -2.58);
 return group;
}

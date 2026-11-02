import * as THREE from 'three';

type Patch = (m: THREE.Material) => void;

/** Rain jar after a Song Longquan celadon jar (龙泉窑粉青大罐), sized from the CAD: belly about
 * 0.89 m across, mouth about 0.65 m, rim at about 0.9 m. Turned profile with real wall thickness;
 * a low unglazed foot ring showing iron-brown body (铁足); the glaze thins and pales at the rim and
 * pools a little deeper green on the lower belly. Dark still water stands just inside the neck.
 * Returns the group and the water height above the jar's foot. Dimensions in metres. */
export function createRainJar(patch: Patch) {
  const g = new THREE.Group(); g.name = 'celadon-rain-jar';
  // (radius, height), counter-clockwise: recessed base, foot ring, glaze edge, belly, shoulder,
  // short neck, rolled rim, inside of the rim down to the water.
  const profile = [
    [0, .014], [.2, .014], [.206, .004], [.212, 0], [.244, 0], [.252, .006], [.256, .03],
    [.262, .042], [.268, .046],
    [.3, .08], [.34, .125], [.38, .18], [.413, .245], [.434, .315], [.444, .39], [.442, .46],
    [.43, .53], [.408, .6], [.378, .66], [.35, .71], [.333, .75], [.326, .79], [.326, .83],
    [.333, .857], [.343, .874], [.346, .887], [.341, .898], [.331, .902],
    // The inside closes well below the water, so the water disc (not a glazed lid) is what shows.
    [.318, .898], [.312, .885], [.311, .86], [.312, .82], [.316, .76], [.34, .66], [0, .66],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const geometry = new THREE.LatheGeometry(profile, 128);
  const pos = geometry.attributes.position, col = new Float32Array(pos.count * 3);
  const glaze = new THREE.Color('#93b89f'), body = new THREE.Color('#6d4c37'), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), a = Math.atan2(z, x);
    // Vertex colours multiply the glaze colour, so the unglazed foot is given relative to it.
    if (y < .04) c.setRGB(body.r / glaze.r, body.g / glaze.g, body.b / glaze.b);
    else {
      // Pooling on the lower belly (deeper), thinning at the rim and shoulder edge (paler), faint mottling.
      const pool = Math.exp(-(((y - .12) / .07) ** 2)) * .16, thin = Math.exp(-(((y - .89) / .02) ** 2)) * .22;
      const k = 1 - pool + .03 * Math.sin(a * 7 + y * 23) * Math.sin(a * 3 - y * 11);
      c.setRGB(k + thin * 1.1, k + thin * .9, k + thin * 1.05);
    }
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const celadon = new THREE.MeshPhysicalMaterial({ color: glaze, vertexColors: true, roughness: .3, clearcoat: 1, clearcoatRoughness: .05, ior: 1.52 });
  patch(celadon);
  const jar = new THREE.Mesh(geometry, celadon); jar.castShadow = jar.receiveShadow = true; g.add(jar);
  const water = new THREE.Mesh(new THREE.CircleGeometry(.313, 96), new THREE.MeshPhysicalMaterial({ color: '#0e1413', roughness: .03, metalness: 0 }));
  patch(water.material as THREE.Material);
  water.rotation.x = -Math.PI / 2; water.position.y = .796; water.receiveShadow = true; g.add(water);
  return { group: g, waterHeight: .796 };
}

/** Fibre texture for coiled rush: fine streaks running along the coil (u), tone varying across
 * it (v), with a matching normal map. Shared by all cushions. */
let rushTextures: { map: THREE.CanvasTexture; normalMap: THREE.CanvasTexture } | null = null;
function rushFibres() {
  if (rushTextures) return rushTextures;
  const w = 1024, h = 256, a = document.createElement('canvas'), n = document.createElement('canvas');
  a.width = n.width = w; a.height = n.height = h;
  const ac = a.getContext('2d')!, img = ac.createImageData(w, h), nimg = ac.createImageData(w, h);
  let st = 7; const r = () => (st = (st * 16807) % 2147483647) / 2147483647;
  const rowTone: number[] = [], rowPhase: number[] = [];
  for (let y = 0; y < h; y++) { rowTone.push(r()); rowPhase.push(r() * 50); }
  const height = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    // Fibres: each row is one strand; strands brighten and darken slowly along their length.
    const along = .5 + .5 * Math.sin(x * .021 + rowPhase[y]) * Math.sin(x * .0067 + rowPhase[y] * .3);
    const v = .78 + .16 * rowTone[y] + .08 * along + (r() - .5) * .05;
    height[y * w + x] = rowTone[y] * .6 + along * .4;
    const p = (y * w + x) * 4; img.data[p] = 255 * Math.min(1, v); img.data[p + 1] = 255 * Math.min(1, v * .97); img.data[p + 2] = 255 * Math.min(1, v * .9); img.data[p + 3] = 255;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dy = height[((y + 1) % h) * w + x] - height[((y + h - 1) % h) * w + x], dx = height[y * w + (x + 1) % w] - height[y * w + (x + w - 1) % w];
    const nx = -dx * .6, ny = -dy * 1.6, l = Math.hypot(nx, ny, 1), p = (y * w + x) * 4;
    nimg.data[p] = (nx / l * .5 + .5) * 255; nimg.data[p + 1] = (ny / l * .5 + .5) * 255; nimg.data[p + 2] = (1 / l * .5 + .5) * 255; nimg.data[p + 3] = 255;
  }
  ac.putImageData(img, 0, 0); n.getContext('2d')!.putImageData(nimg, 0, 0);
  const map = new THREE.CanvasTexture(a); map.colorSpace = THREE.SRGBColorSpace;
  const normalMap = new THREE.CanvasTexture(n);
  for (const t of [map, normalMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 6); t.anisotropy = 8; }
  rushTextures = { map, normalMap };
  return rushTextures;
}

/** Rush prayer cushion (蒲团): a rope of rush about 16 mm thick coiled into a round, slightly
 * domed pad. Each coil is a rounded ridge in the turned profile (concentric on top, stacked round
 * the side), straw-coloured, a little different from its neighbours, with fine fibres running
 * along the coil. Sits on y = 0. */
export function createRushCushion(patch: Patch, radius = .2, height = .1) {
  const coil = .016, depth = .0045, pts: number[][] = [];
  // Rounded rope section: |sin| scallops, the hollow between coils sharper than the crown.
  const rope = (s: number) => depth * (Math.pow(Math.abs(Math.sin(Math.PI * s / coil)), .6) - 1);
  pts.push([0, 0], [radius - .03, 0], [radius - .01, .004]);
  for (let y = .008; y <= height - .012; y += coil / 8) {
    const bulge = Math.sin(Math.PI * y / height) * .012;
    pts.push([radius - .004 + bulge + rope(y), y]);
  }
  for (let r = radius - .012; r > .003; r -= coil / 8) {
    const t = r / radius, y = height + .008 * (1 - t * t) - (t > .88 ? (t - .88) * .1 : 0) + rope(r);
    pts.push([r, y]);
  }
  pts.push([0, height + .008]);
  const geometry = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 128);
  const pos = geometry.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), r = Math.hypot(x, z);
    const ring = Math.floor((y > height - .012 ? r : y) / coil);
    const k = .92 + .08 * Math.sin(ring * 12.9898) * Math.sin(ring * 4.1414 + 1);
    col[i * 3] = k; col[i * 3 + 1] = k * .99; col[i * 3 + 2] = k * .97;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const { map, normalMap } = rushFibres();
  const rush = new THREE.MeshStandardMaterial({ color: '#d4ba8a', map, normalMap, normalScale: new THREE.Vector2(.6, .6), vertexColors: true, roughness: .9 });
  patch(rush);
  const mesh = new THREE.Mesh(geometry, rush); mesh.castShadow = mesh.receiveShadow = true; mesh.name = 'rush-cushion';
  return mesh;
}

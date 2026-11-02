import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createMonolithicRelief } from './relief';
import { DEFAULT_SOLAR, solarPosition, atmosphereFor, type SolarSettings } from './solar';
import { applySolarShadows, solarShadowUniforms, sectionUniforms, roofUniforms } from './solar-shadows';
import { bounceUniforms } from './bounce';
import { SkyDome } from './sky';
import { BounceLight } from './bounce';
import { createSite } from './site';
import { Atmosphere } from './atmosphere';
import { SkyField, SKY_BOUNCE, skyUniforms } from './sky-field';
import { ARCH } from './architecture';
import { createImprovements, PROPOSAL } from './improvements';
import { createRainJar, createRushCushion } from './furnishings';
import { createNightLights } from './night';

export type ViewId = 'outside'|'approach'|'entry'|'hall'|'jade'|'gallery'|'roof'|'section'|'column'|'columns';
export type TourState = { view: ViewId; mode: 'orbit'|'walk'; guiding: boolean; progress: number; hour:number; daylightPlaying:boolean; seated:boolean; solar:SolarSettings; solarEdited:boolean; playbackRate:number; altitude:number; azimuth:number; improvements:boolean };
export const STOPS: {id:ViewId;name:string;detail:string;position:number[];target:number[]}[] = [
 // Axonometric-like: far away with a very narrow lens, so parallel edges stay nearly parallel.
 {id:'outside',name:'轴测',detail:'朱红格栅 · 白色内殿',position:[115.2,100.5,115.2],target:[0,2.6,0]},
 {id:'entry',name:'心经入口',detail:'经文镂空，光从字间进入',position:[0,1.65,6.4],target:[0,1.65,-1.8]},
 {id:'hall',name:'一层内殿',detail:'贯通两层的玉佛 · 天井下的接雨水瓶',position:[.9,1.65,1.8],target:[0,1.55,-1.4]},
 {id:'jade',name:'通高玉佛',detail:'从一层延伸至二层的单块浮雕',position:[.7,1.65,1.72],target:[0,1.65,-2.55]},
 {id:'gallery',name:'二层静坐',detail:'大佛侧挑空 · 柱列 · 静坐区',position:[-1.55,3.35,2.65],target:[-.83,3.08,1.25]},
 {id:'roof',name:'屋顶天光',detail:'标识位于大佛侧 · 内收屋面汇集雨水',position:[99,111.3,121.7],target:[0,4.2,0]},
];
// Section perspective: cut along the central axis, seen from the west and a little toward the
// entrance, so the cut face, the columns and the Buddha on the back wall all read. Camera nearly
// level, so verticals stay vertical.
export const CUTAWAY_STOP={id:'section' as ViewId,name:'中轴剖透视',detail:'心经墙 → 柱 → 天井 → 玉佛，光照按完整建筑计算',position:[-10.4,3.05,3.4],target:[0,2.85,-.35]};
export const COLUMN_STOP={id:'column' as ViewId,name:'心经入柱',detail:'固定柱子，观察字影沿曲面移动',position:[.2,3.2,2.67],target:[.591,3.2,1.307]};
export const WHOLE_COLUMN_STOP={id:'columns' as ViewId,name:'整柱光影',detail:'从柱脚到柱顶核对经文覆盖范围',position:[1.1,4.05,2.72],target:[-.581,4.05,1.292]};
// Eye level on the site, south-east of the entrance: the building against sky and ridges.
// Eye-level two-point perspective: the camera stays level and the frame is shifted up (a shift lens).
// Just inside the south gate, slightly off the axis: both pools in the foreground reflect the sutra facade.
export const APPROACH_STOP={id:'approach' as ViewId,name:'人视',detail:'人眼高度，竖线保持竖直',position:[1.3,1.6,19.6],target:[0,1.6,0]};
const AXONOMETRIC=new Set<ViewId>(['outside','roof']);
/** Vertical field of view and lens shift per view. Shift: virtual frame height / visible height. */
function lensFor(id:ViewId,narrow:boolean){
 if(id==='outside')return {fov:narrow?6.5:4,shift:1};
 if(id==='roof')return {fov:narrow?6:3.6,shift:1};
 if(id==='section')return {fov:narrow?70:43,shift:1};
 // Portrait screens are narrow: a wider lens and less shift keep the whole building in frame.
 if(id==='approach')return narrow?{fov:92,shift:1.2}:{fov:52,shift:1.4};
 // Interiors: the camera stays level and the frame is shifted up (a shift lens), so walls and the
 // Buddha's edges stay vertical instead of converging when looking up.
 if(id==='jade')return narrow?{fov:104,shift:1.6}:{fov:84,shift:1.54};
 if(id==='entry')return narrow?{fov:63,shift:1.16}:{fov:51,shift:1.19};
 const fov=id==='columns'?(narrow?84:80):id==='column'?(narrow?45:48):id==='gallery'?(narrow?78:70):id==='jade'?(narrow?76:64):id==='hall'?(narrow?90:86):(narrow?55:43);
 return {fov,shift:1};
}
export const viewStop=(id:ViewId)=>id==='columns'?WHOLE_COLUMN_STOP:id==='column'?COLUMN_STOP:id==='section'?CUTAWAY_STOP:id==='approach'?APPROACH_STOP:STOPS.find(s=>s.id===id)!;
const base = import.meta.env.BASE_URL;
const V=(a:number[])=>new THREE.Vector3(a[0],a[1],a[2]);
const clamp=THREE.MathUtils.clamp;
/** Underside of the roof above a given z: flat over the valley, rising along the rear slope
 * (same mapping as the roof geometry). Walls stop 12 mm into the 30 mm roof, so no gap shows. */
const roofUnderside=(z:number)=>z>=ARCH.roofBackInner?ARCH.roofLow:ARCH.roofLow+(ARCH.roofBackInner-z)/2.9*(6-ARCH.roofLow);
const INTO_ROOF=.012;
// Viewer adaptation: exposure follows how much sky the viewer's own position sees
// (sky-field.ts), never the sun or the time. Same position, same exposure, so
// time comparisons at a fixed camera stay valid. Partial adaptation: indoors still
// reads darker than outdoors, as it does to the eye.
// Exposure rose with the move to a physically weaker sky light (sky.ts lightingGain), so sunlit
// surfaces keep their brightness while shadows deepen.
// Interiors are lit mostly by sky light, now physically weaker, so the eye adapts further indoors.
const BASE_EXPOSURE=1.1,ADAPTATION=.75,MAX_ADAPTATION_GAIN=3.2;
// The section looks from outdoors into the interior, which is the subject: expose for it.
const SECTION_GAIN=1.7;
// At night the eye adapts much further (night.ts): exposure rises up to this factor in full night.
const NIGHT_GAIN=5.5,NIGHT_INDOOR_GAIN=1.8;
// Glazing in the rear roof openings, designed for soft light (the author left the choice to us):
// laminated glass, clear tempered outer pane against the weather, inner pane acid-etched on its
// underside, a pale honey interlayer after the colour of traditional shell windows (明瓦).
// Real shell panes scatter so widely the 卍 would dissolve into one glow; the etched pane scatters
// narrowly (a Gaussian about 1.2 deg wide), so the pattern still lands on the Buddha, softly.
// Interlayer transmittance (0.90, 0.84, 0.70), luminance 0.84; etched pane and absorption 0.93;
// Fresnel at the two faces per sun angle in roofLight: about 72% at equinox noon, warm.
const ROOF_GLAZING={spread:.0201,transmission:.93*.843,tint:[.90/.843,.84/.843,.70/.843]};
/** Geometry types that enclose a volume: when cut, their inside reads as solid fill. */
const closedSolid=(g:THREE.BufferGeometry)=>g.type==='BoxGeometry'||g.type==='LatheGeometry'||g.type==='ExtrudeGeometry'||g.type==='SphereGeometry'||(g.type==='CylinderGeometry'&&!(g as THREE.CylinderGeometry).parameters.openEnded);
function reverseWinding(g:THREE.BufferGeometry){
 const indices=g.index?Array.from(g.index.array):Array.from({length:g.attributes.position.count},(_,i)=>i);
 for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
 g.setIndex(indices);g.computeVertexNormals();
}

export class TempleScene {
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(43,1,.04,220);renderer:THREE.WebGLRenderer;orbit:OrbitControls;
 roof=new THREE.Group();cutawayWall=new THREE.Group();cutawayShell=new THREE.Group();proposalGroup=new THREE.Group();improvements=true;seatMeshes:THREE.Mesh[]=[];sun=new THREE.DirectionalLight(0xffead1,2.5);fill=new THREE.HemisphereLight(0xfffbef,0xb6ada0,.32);
 solar:SolarSettings={...DEFAULT_SOLAR};solarEdited=false;playbackRate=1;altitude=0;azimuth=0;
 assetsRemaining=3;hour=12;daylightPlaying=false;seated=false;eyeHeight=1.55;lightTick=0;
 comparisonLocked=false;daylightEnd=24-1/3600;
 // Section plane: keeps x >= 0 while active; parked far away otherwise (nothing clipped, no recompiles).
 sectionPlane=new THREE.Plane(new THREE.Vector3(1,0,0),1e5);sectionOn=false;sectionPrepared=new WeakSet<THREE.Object3D>();
 pocheMaterials=new Set<THREE.MeshStandardMaterial>();sectionHidden:THREE.Object3D[]=[];sectionEarth!:THREE.Mesh;roofGlass:THREE.Mesh|null=null;rearDoors=new THREE.Group();rearDoorFull!:THREE.InstancedMesh;night!:ReturnType<typeof createNightLights>;nightness=0;air={turbidity:3,haze:0,dust:0};glazeTint=new THREE.Color(ROOF_GLAZING.tint[0],ROOF_GLAZING.tint[1],ROOF_GLAZING.tint[2]);
 paused=false;mode:'orbit'|'walk'='orbit';view:ViewId='outside';guiding=false;disposed=false;roofVisible=true;motion=true;
 onState:(s:TourState)=>void;onReady:()=>void; frame=0;time=0;last=0;guideElapsed=0;guideIndex=0;keys=new Set<string>();joy={x:0,y:0};yaw=0;pitch=0;drag=false;pointer={x:0,y:0};
 transition:null|{from:THREE.Vector3;to:THREE.Vector3;lookFrom:THREE.Vector3;lookTo:THREE.Vector3;start:number;duration:number;walk:boolean;fovFrom:number;fovTo:number}=null;
 listeners:(()=>void)[]=[];resizeObserver:ResizeObserver;ambientSound:AudioContext|null=null;skyField:SkyField;assetsLoaded=false;sky=new SkyDome();envScene=new THREE.Scene();pmrem:THREE.PMREMGenerator;envTarget:THREE.WebGLRenderTarget|null=null;envKey='';bounce:BounceLight;bounceKey='';atmosphere!:Atmosphere;setSiteDay:(day:number)=>void=()=>{};setSiteQuality:(level:number)=>void=()=>{};siteTick:(dt:number,toSun:THREE.Vector3,sun:THREE.Color)=>void=()=>{};
 // Rendering quality: 2 desktop, 1 phone or small screen, 0 after sustained slow frames.
 quality:0|1|2=2;frameAverage=16;toSunScratch=new THREE.Vector3();sunColorScratch=new THREE.Color();slowFor=0;lastFrame=0;shadowHalf=5.5;
 constructor(public host:HTMLElement,onState:(s:TourState)=>void,onReady:()=>void){
  this.onState=onState;this.onReady=onReady;
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  this.skyField=new SkyField(this.renderer,this.scene);this.bounce=new BounceLight(this.renderer,this.scene);
  this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.7));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFShadowMap;this.renderer.shadowMap.autoUpdate=false;this.renderer.localClippingEnabled=true;
  // AgX: softer highlight roll-off and less garish reds than ACES; applied once by the output pass.
  // Khronos PBR Neutral keeps hue and saturation through the mid-tones; AgX muted every hour and
  // season toward the same grey, hiding the blue of a clear sky and the warmth of low sun.
  this.renderer.toneMapping=THREE.NeutralToneMapping;this.renderer.toneMappingExposure=BASE_EXPOSURE;this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  host.appendChild(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-label','可交互寺庙三维场景');this.renderer.domElement.tabIndex=0;
  // The sky dome is the background; the ground fades into its horizon colour.
  this.scene.add(this.sky.mesh,this.sky.ridges);this.envScene.add(this.sky.clone());this.scene.fog=new THREE.Fog(this.sky.horizonDisplay.clone(),30,200);
  this.camera.position.copy(V(STOPS[0].position));this.orbit=new OrbitControls(this.camera,this.renderer.domElement);this.orbit.target.copy(V(STOPS[0].target));
  this.orbit.enableDamping=true;this.orbit.dampingFactor=.07;this.orbit.minDistance=3;this.orbit.maxDistance=28;this.orbit.maxPolarAngle=Math.PI*.49;this.orbit.enablePan=true;
  this.orbit.addEventListener('start',()=>{if(this.mode==='orbit'){this.transition=null;this.stopGuide()}});
  // Environment light comes from the same sky (setSun regenerates it), not from a generic room.
  // Sky light kept near a clear-day ratio to direct sun (roughly 1:4.5 on a lit face), as before.
  this.pmrem=new THREE.PMREMGenerator(this.renderer);this.scene.environmentIntensity=.32;
  this.scene.add(this.fill);this.sun.position.set(-8,14,9);this.sun.castShadow=true;this.sun.shadow.mapSize.set(4096,4096);this.sun.shadow.camera.left=-5.5;this.sun.shadow.camera.right=5.5;this.sun.shadow.camera.top=5.5;this.sun.shadow.camera.bottom=-5.5;this.sun.shadow.camera.near=.5;this.sun.shadow.camera.far=60;this.sun.shadow.bias=-.000025;this.sun.shadow.normalBias=.001;this.sun.shadow.radius=1;this.scene.add(this.sun);this.sun.target.position.set(0,3.5,0);this.scene.add(this.sun.target);
  const coarse=matchMedia('(pointer:coarse)').matches,small=Math.min(screen.width,screen.height)<700,memory=(navigator as Navigator&{deviceMemory?:number}).deviceMemory;
  this.atmosphere=new Atmosphere(this.renderer,this.scene,this.camera,this.sun,coarse||small?2:4);
  this.applyQuality(coarse||small||(memory!==undefined&&memory<4)?1:2);
  this.build();this.setSun(this.hour);this.bind();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();this.animate(0);this.emit();
 }
 assetReady(){
  this.renderer.shadowMap.needsUpdate=true;this.assetsRemaining--;
  if(this.assetsRemaining>0)return;
  this.assetsLoaded=true;this.onReady();this.refreshBounce(true);
  // Measured after the space is shown (about 1 s on a desktop), then faded in.
  // If it fails, the previous uniform sky fill simply stays.
  this.rebakeSky();
 }
 rebakeSky(){if(this.assetsLoaded)this.skyField.bake().catch(error=>console.error('Sky visibility could not be measured',error))}
 emit(){this.onState({view:this.view,mode:this.mode,guiding:this.guiding,progress:this.guiding?this.guideElapsed/11:0,hour:this.hour,daylightPlaying:this.daylightPlaying,seated:this.seated,solar:{...this.solar},solarEdited:this.solarEdited,playbackRate:this.playbackRate,altitude:this.altitude,azimuth:this.azimuth,improvements:this.improvements})}
 mesh(g:THREE.BufferGeometry,m:THREE.Material,p:number[],parent:THREE.Object3D=this.scene){applySolarShadows(m);const o=new THREE.Mesh(g,m);o.position.set(...p as [number,number,number]);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
 // Sharp by default: walls and slabs stack against each other, and rounded edges there read
 // as seams across what should be one continuous surface. Round only small free pieces.
 box(s:number[],p:number[],m:THREE.Material,parent:THREE.Object3D=this.scene,_round=0){return this.mesh(new THREE.BoxGeometry(s[0],s[1],s[2]),m,p,parent)}
 build(){
  this.scene.add(this.cutawayWall,this.cutawayShell);
  // Plain matte surfaces: the former procedural 'grain' map produced fine diagonal stripes.
  const stone=new THREE.MeshStandardMaterial({color:'#e9e7da',roughness:.8});
  // Warm lime plaster rather than a cold white; floors in pale limestone.
  const white=new THREE.MeshStandardMaterial({color:'#eee8dc',roughness:.88});
  const floorStone=new THREE.MeshStandardMaterial({color:'#ddd5c8',roughness:.72});
  // Matte painted steel, not glossy plastic.
  const red=new THREE.MeshStandardMaterial({color:'#9a1c26',roughness:.62,metalness:0});
  const edgeRed=new THREE.MeshStandardMaterial({color:'#9a1c26',roughness:.62,metalness:0});
  const brass=new THREE.MeshStandardMaterial({color:'#b6a078',metalness:.65,roughness:.35});
  const jadeBacking=new THREE.MeshPhysicalMaterial({color:'#d1dfca',roughness:.36,clearcoat:.25});
  const jadeDark=new THREE.MeshStandardMaterial({color:'#7f9e81',roughness:.6});
  // Site in the convention of architectural drawings: a plain, pale ground (no invented
  // landscape) that fades into a near-white sky; only the plinth and the entrance path.
  // The open ground has holes where the two pools are, so their basins can be seen (site.ts).
  const groundShape=new THREE.Shape();groundShape.absarc(0,0,150,0,Math.PI*2,false);
  for(const s of [-1,1]){const h=new THREE.Path();h.moveTo(s*3.6-2,-7);h.lineTo(s*3.6+2,-7);h.lineTo(s*3.6+2,-16);h.lineTo(s*3.6-2,-16);h.closePath();groundShape.holes.push(h)}
  const ground=this.mesh(new THREE.ShapeGeometry(groundShape,64),new THREE.MeshStandardMaterial({color:'#e2e0db',roughness:1}),[0,-.12,0]);
  ground.rotation.x=-Math.PI/2;ground.castShadow=false;ground.name='site-ground';
  // Context as an architectural model: off-white trees and scale figures, open to the south.
  const site=createSite(applySolarShadows);this.scene.add(site.group);this.setSiteDay=site.setDay;this.setSiteQuality=site.setQuality;this.siteTick=site.tick;this.setSiteQuality(this.quality);this.applySeason();
  const plinthStone=new THREE.MeshStandardMaterial({color:'#e2dfd8',roughness:.85});
  this.box([7.1,.18,7.1],[0,-.09,0],plinthStone);
  this.box([1.46,.05,2.95],[0,-.105,5.03],plinthStone);
  this.box([5.94,.08,5.94],[0,.04,0],floorStone);
  // The reference is a six-metre-scale cubic red cage, not a traditional roof.
  for(const x of [-3,3])for(const z of [-3,3])this.box([.05,6.04,.05],[x,3,z],edgeRed);
  for(const y of [.04,6]){
   for(const z of [-3,3])this.box([6.1,.08,.09],[0,y,z],red);
   for(const x of [-3,3])this.box([.09,.08,6.1],[x,y,0],red);
  }
  const bars:THREE.Matrix4[]=[],doorFull:THREE.Matrix4[]=[],doorCut:THREE.Matrix4[]=[];const obj=new THREE.Object3D();
  for(let i=0;i<=40;i++){
   const t=-2.965+i*5.93/40;
   for(const x of [-3,3]){obj.position.set(x,3,t);obj.scale.set(.05,5.92,.07);obj.updateMatrix();bars.push(obj.matrix.clone())}
   obj.position.set(t,3,-3);obj.scale.set(.07,5.92,.05);obj.updateMatrix();
   // Proposal: the slats in front of each stair landing (back face, |x| 2.15-2.9 m) become a door.
   if(Math.abs(t)>2.15&&Math.abs(t)<2.9){doorFull.push(obj.matrix.clone());obj.position.set(t,4.15,-3);obj.scale.set(.07,3.62,.05);obj.updateMatrix();doorCut.push(obj.matrix.clone())}
   else bars.push(obj.matrix.clone());
   if(Math.abs(t)>.67){obj.position.set(t,1.2,3);obj.scale.set(.07,2.35,.05);obj.updateMatrix();bars.push(obj.matrix.clone())}
  }
  const slats=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),red,bars.length);bars.forEach((m,i)=>slats.setMatrixAt(i,m));applySolarShadows(red);slats.castShadow=true;slats.receiveShadow=true;this.cutawayShell.add(slats);
  // Rear-corner entrances (proposal, shown with the design proposals): meditators walk round the
  // outside and climb straight from the back, without crossing the worship hall. The slats stop
  // at a red lintel 2.3 m up; the original full slats return when the proposals are hidden.
  const slatSet=(list:THREE.Matrix4[])=>{const m=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),red,list.length);list.forEach((x,i)=>m.setMatrixAt(i,x));m.castShadow=m.receiveShadow=true;return m};
  this.rearDoorFull=slatSet(doorFull);this.cutawayShell.add(this.rearDoorFull);
  this.rearDoors.add(slatSet(doorCut));
  for(const s of [-1,1])this.box([.84,.07,.06],[s*2.525,2.305,-3],red,this.rearDoors);
  this.rearDoors.name='rear-corner-entrances';this.cutawayShell.add(this.rearDoors);
  // Entrance facade: vertical sutra restored from the original layout supplies the openings.
  new THREE.TextureLoader().load(base+'assets/sutra-cad-mask.png',texture=>{
   texture.colorSpace=THREE.NoColorSpace;texture.anisotropy=8;
   // Alpha to coverage: at a distance the glyphs fade evenly instead of breaking into specks.
   const screenMaterial=new THREE.MeshStandardMaterial({color:'#9a1c26',roughness:.62,metalness:0,alphaMap:texture,alphaTest:.52,alphaToCoverage:true,side:THREE.DoubleSide});
   const screen=this.mesh(new THREE.PlaneGeometry(5.94,3.6),screenMaterial,[0,4.2,3.025],this.cutawayShell);
   screen.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,alphaMap:texture,alphaTest:.52,side:THREE.DoubleSide});
   // The sky measurement views the wall from far away; mipmaps would average the
   // 15 mm strokes away and seal every glyph hole. Unfiltered copy for that pass only.
   const fullMask=texture.clone();fullMask.generateMipmaps=false;fullMask.minFilter=THREE.LinearFilter;fullMask.needsUpdate=true;
   screen.userData.skyDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,alphaMap:fullMask,alphaTest:.52,side:THREE.DoubleSide});
   this.assetReady();
  });
  this.box([6.04,.075,.11],[0,2.4,3],red);
  // The CAD sections set the meditation floor at 2.50 m, two metres deep.
  // The slab ends at z=1. Everything toward the Buddha is an open vertical void.
  const platformDepth=3-ARCH.platformBack;
  const platform=this.box([5.94,ARCH.slabThickness,platformDepth],[0,ARCH.upperFloor-ARCH.slabThickness/2,(3+ARCH.platformBack)/2],floorStone);platform.name='upper-meditation-platform-front-only';
  // Back wall rises to the roof (front face meets the underside; it no longer stops 8 cm short).
  const backTop=roofUnderside(-2.76)+INTO_ROOF*1.8;this.box([4.2,backTop,.18],[0,backTop/2,-2.85],white);
  // Side walls, including the ground-floor doors into the two external stairs.
  for(const x of [-2,2]){
   const wallParent=x>0?this.cutawayWall:this.scene;
   this.box([.2,2.35,3.52],[x,1.175,-.36],white,wallParent);
   this.box([.2,2.35,.15],[x,1.175,-2.825],white,wallParent);
   this.box([.2,.17,.7],[x,2.265,-2.45],white,wallParent);
   // Upper side wall: its top follows the roof underside exactly (it used to run on a
   // guessed slope that left a wedge-shaped gap of up to 6 cm under the roof).
   const profile=new THREE.Shape();profile.moveTo(-2.9,2.35);profile.lineTo(.1,2.35);profile.lineTo(.1,roofUnderside(.1)+INTO_ROOF);profile.lineTo(ARCH.roofBackInner,roofUnderside(ARCH.roofBackInner)+INTO_ROOF);profile.lineTo(-2.9,roofUnderside(-2.9)+INTO_ROOF);profile.closePath();
   const wall=new THREE.ExtrudeGeometry(profile,{depth:.2,bevelEnabled:false});const wp=wall.attributes.position;
   for(let i=0;i<wp.count;i++){const z=wp.getX(i),y=wp.getY(i),thickness=wp.getZ(i);wp.setXYZ(i,x-.1+thickness,y,z)}reverseWinding(wall);this.mesh(wall,white,[0,0,0],wallParent);
  }
  // Both stairs: step out of the side door onto a small ground-level landing, turn toward the
  // entrance and climb. The top step runs on to the platform edge.
  for(const x of [-ARCH.stairX,ARCH.stairX]){
   for(let i=0;i<ARCH.stairSteps;i++){
    const z0=ARCH.stairStart+i*ARCH.stairTread,z1=i<ARCH.stairSteps-1?z0+ARCH.stairTread:ARCH.platformBack;
    const h=(i+1)*ARCH.upperFloor/ARCH.stairSteps;
    this.box([ARCH.stairWidth,h,z1-z0+.005],[x,h/2,(z0+z1)/2],white);
   }
  }
  const columnStone=new THREE.MeshStandardMaterial({color:'#e9e3d7',roughness:.86});
  for(const {x,z} of ARCH.columns){
   const column=this.mesh(new THREE.CylinderGeometry(ARCH.columnRadius,ARCH.columnRadius,ARCH.columnTop-ARCH.upperFloor,96,36),columnStone,[x,(ARCH.columnTop+ARCH.upperFloor)/2,z]);
   column.name='sutra-light-column';
  }
  // Meditation cushions: rush 蒲团 of the CAD's 0.2 m radius (furnishings.ts).
  for(const {x,z} of ARCH.seats){
   const cushion=createRushCushion(applySolarShadows,.2,.1);cushion.position.set(x,ARCH.upperFloor,z);this.scene.add(cushion);this.seatMeshes.push(cushion);
  }
  // The valley is asymmetric: front roof 2 m, rear roof 2.9 m, open gap 1.1 m.
  // Crossbars and the thin rain chain are visible in the drawings and photographs.
  // Author's change (2026-11-02): the valley between the two roof slopes is a solid plate,
  // replacing the CAD's open crossbar grille. A small drain stays where the rain chain hangs,
  // so rain still reaches the vessel below.
  const valley=new THREE.Shape();
  valley.moveTo(-2.1,ARCH.roofBackInner);valley.lineTo(2.1,ARCH.roofBackInner);valley.lineTo(2.1,ARCH.roofFrontInner);valley.lineTo(-2.1,ARCH.roofFrontInner);valley.closePath();
  const drain=new THREE.Path();drain.absarc(0,ARCH.rainZ,.045,0,Math.PI*2,true);valley.holes.push(drain);
  // Same 30 mm thickness as the roof slopes, underside flush with theirs (no ledge in the ceiling).
  const valleyGeometry=new THREE.ExtrudeGeometry(valley,{depth:.03,bevelEnabled:false,curveSegments:24});valleyGeometry.rotateX(Math.PI/2);
  const valleyPlate=this.mesh(valleyGeometry,red,[0,ARCH.roofLow+.03,0],this.roof);valleyPlate.name='solid-roof-valley-with-drain';
  // A 25 cm downpipe under the drain, where the chain hangs: oblique sun cannot shine through it.
  const pipeRed=red.clone();pipeRed.side=THREE.DoubleSide;
  const downpipe=this.mesh(new THREE.CylinderGeometry(.045,.045,.25,24,1,true),pipeRed,[0,ARCH.roofLow-.125,ARCH.rainZ],this.roof);downpipe.name='drain-downpipe';
  const chainMaterial=new THREE.MeshStandardMaterial({color:'#8f8170',metalness:.65,roughness:.4});
  const ringGeometry=new THREE.TorusGeometry(ARCH.rainRingRadius,.0025,5,12);
  // The chain reaches down to the water in the jar (rim at about 1.0 m, water 0.91 m).
  const chainFoot=.11+.796+.006,ringCount=Math.floor((ARCH.roofLow-chainFoot)/ARCH.rainRingSpacing);
  const chain=new THREE.InstancedMesh(ringGeometry,chainMaterial,ringCount);const ringPose=new THREE.Object3D();
  for(let i=0;i<ringCount;i++){ringPose.position.set(0,chainFoot+i*ARCH.rainRingSpacing,ARCH.rainZ);ringPose.rotation.set(0,i%2*Math.PI/2,0);ringPose.scale.set(1,2,1);ringPose.updateMatrix();chain.setMatrixAt(i,ringPose.matrix)}chain.name='rain-chain-from-cad';chain.userData.sectionKeep=true;
  // Layer 3: drawn and shadowed by the sun as usual, but left out of the night projector's shadow,
  // which sits behind it and would throw the magnified rings onto the sutra screen.
  chain.layers.set(3);this.camera.layers.enable(3);this.sun.shadow.camera.layers.enable(3);chain.castShadow=chain.receiveShadow=true;applySolarShadows(chainMaterial);this.scene.add(chain);
  this.scene.add(this.roof);
  // Roof holes are stitched directly from the supplied decorative DWG outlines.
  fetch(base+'assets/roof-cutouts.json').then(r=>r.json()).then((holes:number[][][])=>{
   
   const s=new THREE.Shape();s.moveTo(-3,2.6);s.lineTo(3,2.6);s.lineTo(2.1,0);s.lineTo(-2.1,0);s.closePath();
   for(const pts of holes){const h=new THREE.Path();pts.forEach((p,i)=>i?h.lineTo(p[0],p[1]):h.moveTo(p[0],p[1]));h.closePath();s.holes.push(h)}
   const g=new THREE.ExtrudeGeometry(s,{depth:.03,bevelEnabled:false,curveSegments:2});const p=g.attributes.position;
   for(let i=0;i<p.count;i++){const x=p.getX(i),v=p.getY(i),t=p.getZ(i);p.setXYZ(i,-x,ARCH.roofLow+v/2.6*(6-ARCH.roofLow)+t,ARCH.roofBackInner-v/2.6*2.9)}
   reverseWinding(g);const rearRoof=this.mesh(g,red,[0,0,0],this.roof);
   // Its sunlight goes through roofLight (solar-shadows.ts), so it stays out of the shadow map; the
   // sky-visibility and bounce passes still see it as solid with openings.
   // (three.js copies the mesh material's alphaTest onto custom depth materials, so discard in the shader.)
   const noShadow=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
   // A condition the compiler cannot resolve, so the shader keeps its output (an unconditional
   // discard let it drop the output and the driver rejected the draw).
   noShadow.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('void main() {','void main() {\n if(gl_FragCoord.z>=0.0)discard;')};
   noShadow.customProgramCacheKey=()=>'rear-roof-no-shadow';rearRoof.customDepthMaterial=noShadow;
   rearRoof.userData.skyDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
   // Mask of the openings in roof coordinates (x -3..3 m across, 0..2.6 along the slope), mipmapped.
   const mask=document.createElement('canvas');mask.width=1024;mask.height=512;const mc=mask.getContext('2d')!;
   mc.fillStyle='#000';mc.fillRect(0,0,1024,512);mc.fillStyle='#fff';
   for(const pts of holes){mc.beginPath();pts.forEach((p,i)=>{const px=(p[0]+3)/6*1024,py=(1-p[1]/2.6)*512;if(i)mc.lineTo(px,py);else mc.moveTo(px,py)});mc.closePath();mc.fill()}
   const maskTexture=new THREE.CanvasTexture(mask);maskTexture.colorSpace=THREE.NoColorSpace;maskTexture.minFilter=THREE.LinearMipmapLinearFilter;maskTexture.wrapS=maskTexture.wrapT=THREE.ClampToEdgeWrapping;
   roofUniforms.uRoofMask.value=maskTexture;roofUniforms.uRoofDiffuse.value.set(ROOF_GLAZING.spread,ROOF_GLAZING.transmission);roofUniforms.uRoofTint.value.set(ROOF_GLAZING.tint[0],ROOF_GLAZING.tint[1],ROOF_GLAZING.tint[2]);
   // The glazing itself: frosted panes in the openings, the sky's brightness seen through them.
   const panes=new THREE.ShapeGeometry(holes.map(pts=>new THREE.Shape(pts.map(p=>new THREE.Vector2(p[0],p[1])))),2);const pp=panes.attributes.position;
   for(let i=0;i<pp.count;i++){const x=pp.getX(i),v=pp.getY(i);pp.setXYZ(i,-x,ARCH.roofLow+v/2.6*(6-ARCH.roofLow)+.015,ARCH.roofBackInner-v/2.6*2.9)}
   this.roofGlass=new THREE.Mesh(panes,new THREE.MeshBasicMaterial({color:'#e8ecec',side:THREE.DoubleSide}));this.roofGlass.name='diffusing-roof-glazing';this.roof.add(this.roofGlass);
   this.updateVisibility();
   const rear=new THREE.BufferGeometry();rear.setAttribute('position',new THREE.Float32BufferAttribute([-3,6,3,2.1,ARCH.roofLow,1,3,6,3,-3,6,3,-2.1,ARCH.roofLow,1,2.1,ARCH.roofLow,1],3));rear.computeVertexNormals();
   const rm=red.clone();rm.side=THREE.DoubleSide;this.mesh(rear,rm,[0,0,0],this.roof);
   this.assetReady();
  }).catch(()=>this.assetReady());
  // A single continuous wall-sized Buddha relief replaces every repeated small icon.
  createMonolithicRelief(base+'assets/jade-relief-v7.bin').then(relief=>{
   if(!this.disposed){relief.traverse(o=>{if(o instanceof THREE.Mesh){const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(applySolarShadows)}});this.scene.add(relief);this.assetReady()}
  }).catch(error=>console.error('Jade relief asset could not load',error));
  // Open rainwater vessel, directly beneath the valley outlet and the upper-floor void.
  // Rain jar (furnishings.ts): celadon, sized from the CAD, standing on the drip tray under the drain.
  const jar=createRainJar(applySolarShadows);jar.group.position.set(0,.11,ARCH.rainZ);jar.group.userData.sectionKeep=true;this.scene.add(jar.group);
  // Author correction: worship belongs directly before the Buddha, beyond the rain vessel.
  // +z points toward the entrance; the Buddha is on the -z wall. Keep both side routes open.
  const kneelingPlaces=new THREE.Group();kneelingPlaces.name='kneeling-places-before-buddha';this.scene.add(kneelingPlaces);
  const kneelingZ=-1.1;
  const kneelingFabric=new THREE.MeshStandardMaterial({color:'#aa9e86',roughness:.95});
  // Kneeling cushions: the same rush 蒲团, a little larger, straight on the stone floor.
  for(const x of [-.7,0,.7]){const cushion=createRushCushion(applySolarShadows,.22,.11);cushion.position.set(x,.08,kneelingZ);kneelingPlaces.add(cushion)}
  // Ground in section: a solid band under the cut line, shown only in the section view.
  this.sectionEarth=new THREE.Mesh(new THREE.PlaneGeometry(90,.6),new THREE.MeshBasicMaterial({color:'#1d1b1a',fog:false}));
  this.sectionEarth.rotation.y=-Math.PI/2;this.sectionEarth.position.set(.001,-.12-.3,0);this.sectionEarth.visible=false;this.sectionEarth.userData.sectionKeep=true;this.scene.add(this.sectionEarth);
  // Night lighting (night.ts): projector under the valley, uplight slot before the Buddha, soft glow.
  this.night=createNightLights();this.scene.add(this.night.group,this.night.lens);
  // New proposals are separate from the source model and can be switched off.
  this.proposalGroup=createImprovements();this.scene.add(this.proposalGroup);this.setImprovements(true);
  // No decorative point lights: direct sun and approximate sky fill only.
 }
 resize(){const w=this.host.clientWidth,h=this.host.clientHeight;this.renderer.setSize(w,h);this.atmosphere?.setSize(w,h);if(!this.transition)this.camera.fov=lensFor(this.view,w<700).fov;this.applyLens()}
 /** Aspect and lens shift for the current view (the fov is set by resize or the transition). */
 applyLens(){
  const w=this.host.clientWidth,h=this.host.clientHeight,{shift}=lensFor(this.view,w<700);
  if(shift>1){this.camera.aspect=w/(h*shift);this.camera.setViewOffset(w,h*shift,0,0,w,h)}else{this.camera.clearViewOffset();this.camera.aspect=w/h}
  this.camera.updateProjectionMatrix();
 }
 /** Near/far planes and fog follow the camera distance, so far axonometric views stay precise
  * and the ground behind the building fades into the sky. */
 fitDepth(){
  const d=this.camera.position.distanceTo(this.orbit.target),fog=this.scene.fog as THREE.Fog;
  const far=d>60;const near=far?d*.5:.04,farPlane=far?d*1.6+40:220;
  if(Math.abs(this.camera.near-near)>.01||Math.abs(this.camera.far-farPlane)>.5){this.camera.near=near;this.camera.far=farPlane;this.camera.updateProjectionMatrix()}
  // Aerial perspective: hazy summer air swallows the distance sooner than clear autumn air.
  const reach=1.15-.45*this.air.haze;
  fog.near=far?d+2:30*reach;fog.far=far?d+38*reach:200*reach;
 }
 go(id:ViewId,walk=false){
  const stop=viewStop(id);this.comparisonLocked=false;this.keys.clear();this.joy={x:0,y:0};this.orbit.minDistance=(id==='column'||id==='columns')?.65:3;
  // Eye-level site view looks slightly up at the building; elsewhere stay above the ground plane.
  // Approach: level orbit only (verticals stay vertical). Axonometric: dolly within a far range.
  const axo=AXONOMETRIC.has(id);
  this.orbit.minPolarAngle=id==='approach'?Math.PI/2:0;this.orbit.maxPolarAngle=id==='approach'?Math.PI/2:Math.PI*(axo?.47:.49);
  this.orbit.enablePan=id!=='approach';
  if(axo){this.orbit.minDistance=140;this.orbit.maxDistance=280}else if(id==='approach'){this.orbit.minDistance=8;this.orbit.maxDistance=21}else this.orbit.maxDistance=28;
  // Section: orbit a little either side of the cut face, never round to the removed half.
  const section=id==='section';
  this.orbit.minAzimuthAngle=section?-Math.PI/2-.55:-Infinity;this.orbit.maxAzimuthAngle=section?-Math.PI/2+.55:Infinity;
  if(section){this.orbit.minPolarAngle=Math.PI/2-.45;this.orbit.maxPolarAngle=Math.PI/2+.12;this.orbit.minDistance=7;this.orbit.maxDistance=20}
  this.view=id;this.updateVisibility();this.seated=id==='gallery';this.eyeHeight=this.seated?.85:1.55;
  const fovFrom=this.camera.fov,fovTo=lensFor(id,this.host.clientWidth<700).fov;this.applyLens();
  const dir=new THREE.Vector3();this.camera.getWorldDirection(dir);const lookFrom=this.camera.position.clone().add(dir.multiplyScalar(4));
  this.transition={from:this.camera.position.clone(),to:V(stop.position),lookFrom,lookTo:V(stop.target),start:this.time,duration:this.motion?1.65:.02,walk,fovFrom,fovTo};
  this.orbit.enabled=false;this.emit();
 }
 /** Development aid: place the camera close to any object (?inspect=x,y,z,tx,ty,tz[,fov]). */
 inspect(position:number[],target:number[],fov=32,section=false){
  this.stopGuide();this.transition=null;this.view=section?'section':'entry';this.mode='orbit';this.orbit.minAzimuthAngle=-Infinity;this.orbit.maxAzimuthAngle=Infinity;this.updateVisibility();
  this.orbit.minDistance=.3;this.orbit.maxDistance=60;this.orbit.minPolarAngle=0;this.orbit.maxPolarAngle=Math.PI*.49;this.orbit.enablePan=true;
  this.camera.position.set(position[0],position[1],position[2]);this.orbit.target.set(target[0],target[1],target[2]);
  this.camera.fov=fov;this.applyLens();this.camera.lookAt(this.orbit.target);this.orbit.enabled=true;this.orbit.update();this.emit();
 }
 setView(id:ViewId){this.stopGuide();this.go(id,id!=='outside'&&id!=='approach'&&id!=='roof'&&id!=='section'&&id!=='column'&&id!=='columns')}
 setMode(mode:'orbit'|'walk'){
  this.stopGuide();if(mode==='walk'){this.go('entry',true)}else{this.mode='orbit';this.go('outside',false)}
 }
 startGuide(){this.guiding=true;this.guideIndex=1;this.guideElapsed=0;this.go(STOPS[this.guideIndex].id,true);this.emit()}
 stopGuide(){if(this.guiding){this.guiding=false;this.emit()}}
 setRoof(v:boolean){this.roofVisible=v;this.updateVisibility();this.emit()}
 updateVisibility(){
  // The section no longer removes anything: it cuts the image only (see setSection).
  const before=this.roof.visible;
  this.roof.visible=this.roofVisible;this.cutawayWall.visible=true;this.cutawayShell.visible=true;this.renderer.shadowMap.needsUpdate=true;
  roofUniforms.uRoofOn.value=this.roof.visible&&roofUniforms.uRoofMask.value?1:0;roofUniforms.uSideGlassOn.value=this.improvements&&this.roof.visible?1:0;
  if(this.roof.visible!==before){this.rebakeSky();this.refreshBounce(true)}
  this.setSection(this.view==='section');
 }
 /** Section perspective. The plane clips what the camera sees, but not shadows, sky visibility or
  * bounce light (they keep their own materials and clipShadows is off), so the light in the section
  * is the light of the whole building. Cut solids show a flat dark fill; the Buddha relief, the rain
  * vessel and chain and the incense burner stay whole, drawn in elevation. */
 prepareSection(){
  const usage=new Map<THREE.MeshStandardMaterial,{closed:boolean;open:boolean}>();const box=new THREE.Box3();
  const keep=(o:THREE.Object3D)=>{for(let p:THREE.Object3D|null=o;p;p=p.parent)if(p.userData.sectionKeep||p.name==='incense-burner')return true;return false};
  const forced=(o:THREE.Object3D)=>{for(let p:THREE.Object3D|null=o;p;p=p.parent)if(p.userData.sectionPoche)return true;return false};
  this.scene.updateMatrixWorld();
  this.scene.traverse(o=>{
   if(!(o instanceof THREE.Mesh)||o===this.sky.mesh||this.sectionPrepared.has(o))return;
   this.sectionPrepared.add(o);
   const materials=Array.isArray(o.material)?o.material:[o.material];
   const westOnly=()=>{o.geometry.computeBoundingBox();box.copy(o.geometry.boundingBox!).applyMatrix4(o.matrixWorld);return box.max.x<0&&!(o instanceof THREE.InstancedMesh)};
   if(keep(o)||materials.some(m=>m instanceof THREE.ShaderMaterial)){if(o!==this.sectionEarth&&westOnly())this.sectionHidden.push(o);return}
   for(const m of materials){
    m.clippingPlanes=[this.sectionPlane];m.clipShadows=false;m.needsUpdate=true;
    // The relief is a closed carving (front, sides, back) built as one custom geometry.
    if(m instanceof THREE.MeshStandardMaterial){const u=usage.get(m)??{closed:false,open:false};if(closedSolid(o.geometry)||forced(o))u.closed=true;else u.open=true;usage.set(m,u)}
   }
  });
  for(const [m,u] of usage)if(u.closed&&!u.open&&m.side===THREE.FrontSide){m.defines={...m.defines,SECTION_POCHE:''};this.pocheMaterials.add(m)}
 }
 setSection(on:boolean){
  if(on)this.prepareSection();
  if(on===this.sectionOn)return;this.sectionOn=on;
  this.sectionPlane.constant=on?0:1e5;sectionUniforms.uSectionActive.value=on?1:0;
  for(const m of this.pocheMaterials){m.side=on?THREE.DoubleSide:THREE.FrontSide;m.shadowSide=on?THREE.BackSide:null;m.needsUpdate=true}
  for(const o of this.sectionHidden)o.visible=!on;
  this.scene.traverse(o=>{if(o.userData.sectionOnly)o.visible=on});
  // Haze only in the half that is still drawn, so the removed half's air does not veil the cut.
  this.atmosphere.setHazeMinX(on?0:-2.95);this.atmosphere.setSectionMode(on);
  this.sectionEarth.visible=on;this.renderer.shadowMap.needsUpdate=true;
 }
 setImprovements(enabled:boolean){
  this.improvements=enabled;this.proposalGroup.visible=enabled;
  if(this.rearDoorFull){this.rearDoorFull.visible=!enabled;this.rearDoors.visible=enabled}
  roofUniforms.uSideGlassOn.value=enabled&&this.roof.visible?1:0;this.rebakeSky();this.refreshBounce(true);
  this.seatMeshes.forEach((seat,i)=>seat.position.z=enabled?PROPOSAL.seatZ:ARCH.seats[i].z);
  this.renderer.shadowMap.needsUpdate=true;this.emit();
 }
 setSun(t:number){
  this.hour=clamp(t,0,24-1/3600);
  const position=solarPosition(this.solar,this.hour);this.altitude=position.altitude;this.azimuth=position.azimuth;
  const direction=V(position.direction);
  this.sun.position.copy(this.sun.target.position).addScaledVector(direction,32);
  const day=Math.max(0,direction.y);
  // Sunlight through the atmosphere: per-channel transmittance exp(-tau*m) along the air mass m
  // (Kasten-Young). Low sun: longer path, warmer and dimmer; high sun: white and strong. So the
  // light changes continuously through the day and between seasons (winter noon is lower, warmer).
  const h=Math.max(this.altitude,-2),m=1/(Math.sin(Math.max(h,0)*Math.PI/180)+.50572*Math.pow(h+6.07995,-1.6364));
  // Seasonal haze and dust add aerosol extinction, a little stronger at short wavelengths: hazy
  // summer sun is dimmer and yellower, and its low-sun light reddens sooner than clear autumn sun.
  const air=atmosphereFor(this.solar.date);this.air=air;this.sky.setAir(air.haze,air.dust);
  const aerosol=Math.max(0,.06*(air.turbidity-3)),spectral=[.85,1,1.15];
  const tau=[.085,.16,.33],tr=tau.map((v,i)=>Math.exp(-(v+aerosol*spectral[i])*m)/Math.exp(-v));
  const fade=THREE.MathUtils.smoothstep(this.altitude,-.8,1.5),peak=Math.max(tr[0],tr[1],tr[2]);
  this.sun.color.setRGB(tr[0]/peak,tr[1]/peak,tr[2]/peak);
  this.sun.intensity=3.3*(.2126*tr[0]+.7152*tr[1]+.0722*tr[2])*fade;
  this.sky.update(direction,this.altitude);roofUniforms.uSunWorld.value.copy(direction);
  // Night lights come on at sunset and are full by 5 degrees below the horizon (blue hour).
  this.nightness=THREE.MathUtils.smoothstep(-this.altitude,0,5);this.night?.update(this.nightness);
  // Frosted panes read as a slightly dimmed, whitened sky from either side.
  if(this.roofGlass)(this.roofGlass.material as THREE.MeshBasicMaterial).color.copy(this.sky.horizonDisplay).lerp(this.sky.zenith,.2).multiplyScalar(.9).multiply(this.glazeTint);
  // Background = horizon haze: any view that cannot see the sky dome (e.g. a pool's mirrored
  // camera far outside it) still gets the right sky tone instead of black.
  this.scene.background=this.sky.horizonDisplay;
  this.fill.color.copy(this.sky.zenith);this.fill.groundColor.copy(this.sky.ground);this.fill.intensity=.02+.1*Math.sqrt(day);
  this.refreshEnvironment();this.refreshBounce();
  this.renderer.shadowMap.needsUpdate=true;
 }
 refreshEnvironment(force=false){
  // Regenerate the sky light only when the sky visibly changes (about every 0.75 degree).
  // Small steps, so the sky light changes smoothly while time plays.
  const key=`${Math.round(this.altitude/.3)},${Math.round(this.azimuth/1.2)},${this.solar.date}`;
  if(!force&&key===this.envKey)return;this.envKey=key;
  const previous=this.envTarget;this.envTarget=this.pmrem.fromScene(this.envScene,0,.1,200);
  this.scene.environment=this.envTarget.texture;previous?.dispose();
 }
 /** Lower tiers trade pixel density and shadow-map size for frame rate; nothing is removed
  * from the scene. Tier 0 also defers bounce recomputation while time is playing fast. */
 applyQuality(level:0|1|2){
  this.quality=level;
  const ratio=level===2?Math.min(window.devicePixelRatio,1.7):level===1?Math.min(window.devicePixelRatio,1.25):1;
  this.renderer.setPixelRatio(ratio);this.atmosphere?.setQuality(level);this.setSiteQuality(level);
  const size=level===2?4096:2048;
  if(this.sun.shadow.mapSize.x!==size){
   this.sun.shadow.mapSize.set(size,size);this.sun.shadow.map?.dispose();
   (this.sun.shadow as unknown as {map:THREE.WebGLRenderTarget|null}).map=null;this.renderer.shadowMap.needsUpdate=true;
  }
  if(this.host.clientWidth)this.resize();
 }
 /** Step down one tier after about 2.5 s averaging slower than ~30 frames per second. */
 watchFrameRate(ms:number){
  const frame=ms-this.lastFrame;this.lastFrame=ms;
  if(frame<=0||frame>250||document.hidden||this.quality===0)return;
  this.frameAverage=this.frameAverage*.95+frame*.05;
  if(this.frameAverage>34){this.slowFor+=frame;if(this.slowFor>2500){this.applyQuality((this.quality-1) as 0|1);this.slowFor=0;this.frameAverage=20}}
  else this.slowFor=0;
 }
 /** Recompute interior bounce light when the sun has moved enough to shift the light patches. */
 refreshBounce(force=false){
  if(!this.assetsLoaded)return;
  // Lowest tier: wait until fast playback stops (pausing or dragging time recomputes).
  if(!force&&this.quality===0&&this.daylightPlaying&&this.playbackRate>1)return;
  // Keyed on the sun direction relative to the building (about 0.6 degree), so a new
  // entrance bearing also triggers a recompute.
  const toSun=new THREE.Vector3().subVectors(this.sun.position,this.sun.target.position).normalize();
  const step=this.daylightPlaying&&this.playbackRate>1?50:100;
  const key=`${Math.round(toSun.x*step)},${Math.round(toSun.y*step)},${Math.round(toSun.z*step)}`;
  if(!force&&key===this.bounceKey)return;this.bounceKey=key;
  this.bounce.update(toSun,this.sun.color.clone().multiplyScalar(this.sun.intensity),this.daylightPlaying&&this.playbackRate>1?.3:1);
 }
 /** Sun shadow camera half-width: tight indoors for glyph detail, wide outdoors for the site. */
 setShadowHalf(half:number){
  if(half===this.shadowHalf)return;this.shadowHalf=half;const c=this.sun.shadow.camera;
  c.left=c.bottom=-half;c.right=c.top=half;c.updateProjectionMatrix();
  solarShadowUniforms.uSolarWorldSpan.value=half*2;this.renderer.shadowMap.needsUpdate=true;
 }
 /** Change only the date (season); the site parameters stay as confirmed. */
 /** Evening blue hour on the current date: when the sun first reaches 6 degrees below the horizon
  * after noon. The sky is still deep blue while the building is fully lit. */
 blueHour(){
  for(let h=14;h<23.5;h+=.01)if(solarPosition(this.solar,h).altitude<=-6)return Math.round(h*60)/60;
  return 19;
 }
 setDate(date:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date)))return;
  this.solar={...this.solar,date};this.applySeason();this.setSun(this.hour);this.emit();
 }
 /** Leaves follow the selected date. */
 applySeason(){
  const [y,mo,d]=this.solar.date.split('-').map(Number);const day=Math.round((Date.UTC(y,mo-1,d)-Date.UTC(y,0,0))/864e5);
  this.setSiteDay(day);this.renderer.shadowMap.needsUpdate=true;
 }
 setSolar(values:Partial<SolarSettings>){
  const next={...this.solar,...values};
  if(!/^\d{4}-\d{2}-\d{2}$/.test(next.date)||!Number.isFinite(Date.parse(next.date)))return;
  if(![next.latitude,next.longitude,next.utcOffset,next.entranceBearing].every(Number.isFinite))return;
  next.latitude=clamp(next.latitude,-89.9,89.9);next.longitude=clamp(next.longitude,-180,180);next.utcOffset=clamp(next.utcOffset,-12,14);next.entranceBearing=((next.entranceBearing%360)+360)%360;
  this.solar=next;this.solarEdited=true;this.applySeason();this.setSun(this.hour);this.emit();
 }
 setPlaybackRate(rate:number){this.playbackRate=[1,60,600].includes(rate)?rate:1;this.emit()}
 setDaylightPlaying(playing:boolean){this.daylightEnd=24-1/3600;this.daylightPlaying=playing;if(!playing)this.refreshBounce();this.emit()}
 playDaylightStudy(start=9,end=15){this.setSun(start);this.playbackRate=600;this.daylightEnd=end;this.daylightPlaying=true;this.emit()}
 setComparisonLocked(locked:boolean){this.comparisonLocked=locked;this.keys.clear();this.joy={x:0,y:0};this.orbit.enabled=!locked&&this.mode==='orbit'}
 /** High-resolution still of the current view: the same frame re-rendered with the long edge at
  * about 3840 px (supersampled against the screen, plus the composer's 4x multisampling), as PNG.
  * Light, sky and shadows are not resolution dependent; the shadow map stays as it is. */
 async exportStill(longEdge=3840):Promise<Blob|null>{
  if(this.transition||skyUniforms.uSkyEnabled.value<1)return null;
  const w=this.host.clientWidth,h=this.host.clientHeight,previous=this.renderer.getPixelRatio();
  const ratio=Math.min(4,longEdge/Math.max(w,h));
  this.paused=true;
  try{
   this.renderer.setPixelRatio(ratio);this.renderer.setSize(w,h,false);this.atmosphere.setSize(w,h);
   this.adaptExposure();this.atmosphere.render();
   // Read the frame before the browser presents and clears it.
   return await new Promise<Blob|null>(resolve=>this.renderer.domElement.toBlob(resolve,'image/png'));
  }finally{
   this.renderer.setPixelRatio(previous);this.renderer.setSize(w,h,false);this.atmosphere.setSize(w,h);this.paused=false;
  }
 }
 captureView(){
  // Not while the camera moves or the measured sky light is still fading in.
  if(this.transition||skyUniforms.uSkyEnabled.value<1)return null;
  this.adaptExposure();this.atmosphere.render();
  const canvas=this.renderer.domElement;
  return {url:canvas.toDataURL('image/png'),width:this.host.clientWidth,height:this.host.clientHeight,hour:this.hour};
 }
 toggleSeated(){
  if(this.view!=='gallery'){this.setView('gallery');return}
  this.seated=!this.seated;const newHeight=this.seated?.85:1.55;this.camera.position.y+=newHeight-this.eyeHeight;this.eyeHeight=newHeight;this.emit();
 }
 setMotion(v:boolean){this.motion=v;this.orbit.enableDamping=v}
 bind(){
  const el=this.renderer.domElement;
  const on=(target:EventTarget,event:string,fn:EventListener,opts?:AddEventListenerOptions)=>{target.addEventListener(event,fn,opts);this.listeners.push(()=>target.removeEventListener(event,fn,opts))};
  on(el,'pointerdown',((e:PointerEvent)=>{if(this.mode!=='walk'||this.comparisonLocked)return;this.stopGuide();this.drag=true;this.pointer={x:e.clientX,y:e.clientY};el.setPointerCapture(e.pointerId);el.focus()}) as EventListener);
  on(el,'pointermove',((e:PointerEvent)=>{if(!this.drag||this.mode!=='walk'||this.transition||this.comparisonLocked)return;this.yaw-=(e.clientX-this.pointer.x)*.004;this.pitch=clamp(this.pitch-(e.clientY-this.pointer.y)*.003,-1.25,1.25);this.pointer={x:e.clientX,y:e.clientY};this.applyLook()}) as EventListener);
  on(el,'pointerup',(()=>{this.drag=false}) as EventListener);on(el,'pointercancel',(()=>{this.drag=false}) as EventListener);
  on(window,'keydown',((e:KeyboardEvent)=>{if((e.target as HTMLElement)?.matches('input,button,textarea,select'))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft'].includes(e.code)){if(this.mode==='walk')e.preventDefault();this.keys.add(e.code);this.stopGuide()}if(e.code==='Escape'){this.keys.clear();this.drag=false}}) as EventListener);
  on(document,'visibilitychange',(()=>{this.last=performance.now()}) as EventListener);
  on(window,'keyup',((e:KeyboardEvent)=>this.keys.delete(e.code)) as EventListener);on(window,'blur',(()=>{this.keys.clear();this.joy={x:0,y:0};this.drag=false}) as EventListener);
 }
 applyLook(){this.camera.rotation.order='YXZ';this.camera.rotation.y=this.yaw;this.camera.rotation.x=this.pitch;this.camera.rotation.z=0}
 floorAt(x:number,z:number,current:number){
  // On a stair: a line through the middle of each tread; flat on the landing in front of the door.
  if(Math.abs(x)>2.1&&Math.abs(x)<2.96&&z>=-3&&z<=1){const rise=ARCH.upperFloor/ARCH.stairSteps;return clamp(rise*((z-ARCH.stairStart)/ARCH.stairTread+.5),.1,ARCH.upperFloor)}
  if(current>2.15&&Math.abs(x)<2.96&&z>=1&&z<2.96)return ARCH.upperFloor;
  return .1;
 }
 blocked(x:number,z:number,feet:number){
  if(Math.abs(x)>11||Math.abs(z)>11)return true;
  if(Math.abs(z)<3.16&&Math.abs(x)>2.85&&Math.abs(x)<3.23)return true;
  if(z< -2.75&&z> -3.22&&Math.abs(x)<3.23&&!(this.improvements&&Math.abs(x)>2.14&&Math.abs(x)<2.9))return true;
  if(z>2.82&&z<3.22&&Math.abs(x)>.55&&Math.abs(x)<3.23)return true;
  if(feet<2.15&&Math.abs(x)>1.78&&Math.abs(x)<2.2&&z>-2.15&&z<1.5)return true;
  if(feet>2.15&&Math.abs(x)<2.15&&z<1.12)return true;
  if(feet>2.15&&z>2.77)return true;
  if(this.improvements&&feet>2.15&&z<1.42&&z>.7&&Math.abs(Math.abs(x)-2.15)<.14)return true;
  if(feet<1&&x*x+(z-ARCH.rainZ)**2<.62**2)return true;
  if(feet>2.15&&ARCH.columns.some(c=>(x-c.x)**2+(z-c.z)**2<.38**2))return true;
  return false;
 }
 move(dt:number){
  let forward=(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0)-(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0)-this.joy.y;
  let side=(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0)+this.joy.x;
  const n=Math.hypot(forward,side);if(n<.03)return;if(n>1){forward/=n;side/=n}
  if(this.seated){this.camera.position.y+=1.55-this.eyeHeight;this.eyeHeight=1.55;this.seated=false;this.emit()}
  this.stopGuide();const speed=(this.keys.has('ShiftLeft')?2.6:1.65)*dt;
  const dx=(-Math.sin(this.yaw)*forward+Math.cos(this.yaw)*side)*speed;
  const dz=(-Math.cos(this.yaw)*forward-Math.sin(this.yaw)*side)*speed;const feet=this.camera.position.y-this.eyeHeight;
  if(!this.blocked(this.camera.position.x+dx,this.camera.position.z,feet))this.camera.position.x+=dx;
  if(!this.blocked(this.camera.position.x,this.camera.position.z+dz,feet))this.camera.position.z+=dz;
  const h=this.floorAt(this.camera.position.x,this.camera.position.z,feet)+this.eyeHeight;this.camera.position.y=THREE.MathUtils.lerp(this.camera.position.y,h,Math.min(1,dt*14));
 }
 animate=(ms:number)=>{
  if(this.disposed)return;this.frame=requestAnimationFrame(this.animate);if(this.film)return;this.watchFrameRate(ms);const elapsed=Math.max(0,(ms-this.last)/1000);const dt=Math.min(elapsed,.04);this.last=ms;this.time=ms/1000;
  if(this.transition){const tr=this.transition;const t=clamp((this.time-tr.start)/tr.duration,0,1),e=t*t*(3-2*t);this.camera.position.lerpVectors(tr.from,tr.to,e);
   // Ease the lens on a log scale so long-lens views do not snap.
   this.camera.fov=Math.exp(THREE.MathUtils.lerp(Math.log(tr.fovFrom),Math.log(tr.fovTo),e));this.camera.updateProjectionMatrix();const look=new THREE.Vector3().lerpVectors(tr.lookFrom,tr.lookTo,e);this.camera.lookAt(look);
   if(t===1){this.mode=tr.walk?'walk':'orbit';this.orbit.target.copy(tr.lookTo);this.orbit.enabled=!tr.walk&&!this.comparisonLocked;this.camera.rotation.order='YXZ';this.yaw=this.camera.rotation.y;this.pitch=this.camera.rotation.x;this.transition=null;this.emit()}
  }else if(this.mode==='orbit'){if(!this.comparisonLocked)this.orbit.update()}else if(!this.paused&&!this.comparisonLocked)this.move(dt);
  if(this.guiding&&!this.transition){this.guideElapsed+=dt;if(Math.floor(this.guideElapsed*5)!==Math.floor((this.guideElapsed-dt)*5))this.emit();if(this.guideElapsed>11){this.guideIndex++;this.guideElapsed=0;if(this.guideIndex>=STOPS.length){this.stopGuide();this.go('outside',false)}else this.go(STOPS[this.guideIndex].id,this.guideIndex!==5)}}
  if(this.daylightPlaying&&!this.paused&&!document.hidden){
   this.setSun(Math.min(this.daylightEnd,this.hour+elapsed*this.playbackRate/3600));this.lightTick+=elapsed;
   if(this.hour>=this.daylightEnd){this.daylightPlaying=false;this.refreshBounce();this.emit()}
   if(this.lightTick>.2){this.lightTick=0;this.emit()}
  }
  if(this.skyField.values&&skyUniforms.uSkyEnabled.value<1)skyUniforms.uSkyEnabled.value=this.motion?Math.min(1,skyUniforms.uSkyEnabled.value+dt/.8):1;
  this.sky.mesh.position.copy(this.camera.position);this.fitDepth();
  const p=this.camera.position;this.setShadowHalf(this.view==='section'?8:Math.abs(p.x)<3.4&&Math.abs(p.z)<3.4&&p.y<6.6?5.5:28);
  this.siteTick(dt,this.toSunScratch.subVectors(this.sun.position,this.sun.target.position).normalize(),this.sunColorScratch.copy(this.sun.color).multiplyScalar(Math.min(1.4,this.sun.intensity/2.4)));
  // Recomputed bounce light fades in over about 0.6 s; shadow edges soften a little while time plays fast.
  bounceUniforms.uBounceMix.value=Math.min(1,bounceUniforms.uBounceMix.value+dt/.6);
  solarShadowUniforms.uSolarMinTexels.value=this.daylightPlaying&&this.playbackRate>1?1.8:1;
  this.adaptExposure();
  this.atmosphere.render();
 };
 // Film rendering (development aid, ?film=, see film.ts): the render loop stops and film.ts drives
 // every frame with a fixed time step, its own camera, clock and date, at a fixed output size.
 film=false;
 filmStart(w:number,h:number,ratio:number){
  this.film=true;this.bounce.sync=true;this.stopGuide();this.transition=null;this.keys.clear();this.orbit.enabled=false;this.mode='orbit';
  this.applyQuality(2);this.renderer.setPixelRatio(ratio);this.renderer.setSize(w,h,false);this.atmosphere.setSize(w,h);
  skyUniforms.uSkyEnabled.value=1;
 }
 filmDate(date:string){this.setDate(date)}
 filmSun(hour:number,playing:boolean){this.daylightPlaying=playing;this.playbackRate=playing?600:1;this.setSun(hour)}
 filmCamera(view:ViewId,pos:number[],target:number[],fov:number){
  if(this.view!==view){this.view=view;this.updateVisibility()}
  this.camera.position.set(pos[0],pos[1],pos[2]);this.camera.fov=fov;this.applyLens();this.camera.lookAt(target[0],target[1],target[2]);this.camera.updateMatrixWorld();
 }
 filmFrame(dt:number,playing:boolean){
  this.sky.mesh.position.copy(this.camera.position);this.fitDepth();
  const p=this.camera.position;this.setShadowHalf(this.view==='section'?8:Math.abs(p.x)<3.4&&Math.abs(p.z)<3.4&&p.y<6.6?5.5:28);
  this.siteTick(dt,this.toSunScratch.subVectors(this.sun.position,this.sun.target.position).normalize(),this.sunColorScratch.copy(this.sun.color).multiplyScalar(Math.min(1.4,this.sun.intensity/2.4)));
  bounceUniforms.uBounceMix.value=Math.min(1,bounceUniforms.uBounceMix.value+dt/.6);
  solarShadowUniforms.uSolarMinTexels.value=playing?1.8:1;
  this.adaptExposure();this.atmosphere.render();
 }
 adaptExposure(){
  const measured=SKY_BOUNCE+(1-SKY_BOUNCE)*this.skyField.sample(this.camera.position);
  const fill=THREE.MathUtils.lerp(1,measured,skyUniforms.uSkyEnabled.value);
  // By day the eye adapts to how much sky it sees. By night it adapts to the dark court (strongly)
  // or to the lamp-lit interior (only a little): the two must not multiply.
  const dayGain=clamp(Math.pow(1/fill,ADAPTATION),1,MAX_ADAPTATION_GAIN),indoor=(dayGain-1)/(MAX_ADAPTATION_GAIN-1);
  const nightGain=THREE.MathUtils.lerp(NIGHT_GAIN,NIGHT_INDOOR_GAIN,indoor);
  this.renderer.toneMappingExposure=BASE_EXPOSURE*(this.view==='section'?SECTION_GAIN*(1+(NIGHT_GAIN-1)*this.nightness):THREE.MathUtils.lerp(dayGain,nightGain,this.nightness));
  // Lens fall-off at eye level and indoors only; the axonometric and section views are drawings.
  this.atmosphere.setVignette(AXONOMETRIC.has(this.view)||this.view==='section'?0:.16);
  // Fog is mixed in linear light before tone mapping, so it takes the sky's horizon colour as is.
  (this.scene.fog as THREE.Fog).color.copy(this.sky.horizonDisplay);
 }
 dispose(){this.disposed=true;this.atmosphere.dispose();this.skyField.dispose();this.bounce.dispose();this.envTarget?.dispose();this.pmrem.dispose();this.sky.dispose();cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();this.listeners.forEach(f=>f());this.orbit.dispose();this.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose())}});this.renderer.dispose();this.renderer.domElement.remove()}
}

import * as THREE from 'three';

/** Quiet atmospheric sky: haze at the horizon, a soft zenith and a sun glow, keyed to the
 * computed sun altitude. Art-directed colours, not a physical scattering model.
 * One dome drives three things so they always agree with the sun: the visible
 * background, the fog the ground fades into, and the environment light (via PMREM).
 */
/** The visible sky is drawn brighter than the sky that lights the scene: a dome bright enough to
 * read as daylight would otherwise flood the shadows with fill light. */
const SKY_DISPLAY_GAIN=1.3;
type Key={altitude:number;zenith:string;horizon:string;ground:string;intensity:number};
// Clear, quiet sky: pale at the horizon, a soft blue zenith (a grey zenith read as overcast next to
// crisp sun shadows); warm only when the sun is low.
// 'ground' is the lit lawn and paving seen from below the horizon, for bounced sky light.
const KEYS:Key[]=[
 {altitude:-18,zenith:'#0d1219',horizon:'#161c25',ground:'#0f1215',intensity:.35},
 {altitude:-6,zenith:'#233150',horizon:'#59627a',ground:'#363a42',intensity:.55},
 {altitude:0,zenith:'#6f8199',horizon:'#e2b896',ground:'#8d8379',intensity:.85},
 {altitude:8,zenith:'#9bb5d0',horizon:'#ece4da',ground:'#b7b3ab',intensity:1},
 {altitude:25,zenith:'#7ea2c9',horizon:'#dfe7ec',ground:'#c4c1ba',intensity:1.16},
 {altitude:90,zenith:'#6e96c4',horizon:'#dce5eb',ground:'#c6c3bc',intensity:1.22},
];
const vertex=`
varying vec3 vDir;
void main(){
 vDir=position;
 gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
}`;
const fragment=`
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGround;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uGlow;
uniform float uBelow;
uniform float uCloud;
uniform float uGain;
uniform float uSaturation;
uniform float uLowSun;
varying vec3 vDir;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
 return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(17.0,9.0);a*=0.5;}return v;}
void main(){
 vec3 d=normalize(vDir);
 float up=clamp(d.y,0.0,1.0);
 vec3 sky=mix(uHorizon,uZenith,pow(up,0.5));
 // Sparse high cloud on a plane above the site, fading toward the horizon.
 if(d.y>0.0){
  vec2 q=d.xz/(d.y+0.12)*1.6;
  float c=smoothstep(0.55,0.85,fbm(q+vec2(3.0,1.0)))*smoothstep(0.02,0.3,d.y)*uCloud;
  sky=mix(sky,uHorizon*1.08+uSunColor*0.04,c*0.75);
 }
 // Low sun: the horizon warms on the sun's side and cools on the opposite side.
 {
  vec2 dh=normalize(d.xz+vec2(1e-5)),sh=normalize(uSunDir.xz+vec2(1e-5));
  float side=0.5+0.5*dot(dh,sh),band=pow(1.0-up,3.0)*uLowSun;
  sky=mix(sky,sky*vec3(1.0,0.9,0.78)+uSunColor*0.1,band*side*side);
  sky=mix(sky,sky*vec3(0.86,0.9,1.06),band*(1.0-side)*0.8);
 }
 float g=max(dot(d,uSunDir),0.0);
 sky+=uSunColor*uGlow*(0.18*pow(g,6.0)+0.5*pow(g,48.0)+3.0*smoothstep(0.99985,0.99995,g));
 // Visible dome: below the horizon stays at the haze colour the fogged ground fades into.
 // Environment dome: below the horizon is the lit ground, for light bounced up from it.
 vec3 colour=d.y>=0.0?sky:mix(uHorizon,uGround,uBelow*smoothstep(0.0,0.06,-d.y));
 colour=mix(vec3(dot(colour,vec3(0.2126,0.7152,0.0722))),colour,uSaturation);
 gl_FragColor=vec4(colour*uGain,1.0);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

/** three.js ACESFilmicToneMapping, on the CPU. Fog is blended after tone mapping, so the
 * fog colour must be the already tone-mapped sky horizon or the ground edge shows. */
export function acesFilmic(c:THREE.Color,exposure:number,out=new THREE.Color()){
 const r0=c.r*exposure/.6,g0=c.g*exposure/.6,b0=c.b*exposure/.6;
 const r=.59719*r0+.35458*g0+.04823*b0,g=.076*r0+.90834*g0+.01566*b0,b=.0284*r0+.13383*g0+.83777*b0;
 const fit=(v:number)=>(v*(v+.0245786)-.000090537)/(v*(.983729*v+.432951)+.238081);
 const R=fit(r),G=fit(g),B=fit(b);
 const sat=(v:number)=>Math.min(1,Math.max(0,v));
 return out.setRGB(sat(1.60475*R-.53108*G-.07367*B),sat(-.10208*R+1.10813*G-.00605*B),sat(-.00327*R-.07276*G+1.07602*B));
}

export class SkyDome {
 readonly mesh:THREE.Mesh;
 readonly horizon=new THREE.Color();
 /** Horizon as seen (display gain applied): background, fog and the far ground fade use this. */
 readonly horizonDisplay=new THREE.Color();
 readonly zenith=new THREE.Color();
 readonly ground=new THREE.Color();
 private material:THREE.ShaderMaterial;
 constructor(radius=165){
  this.material=new THREE.ShaderMaterial({
   uniforms:{uZenith:{value:this.zenith},uHorizon:{value:this.horizon},uGround:{value:this.ground},uSunDir:{value:new THREE.Vector3(0,1,0)},uSunColor:{value:new THREE.Color('#fff1dc')},uGlow:{value:1},uBelow:{value:0},uCloud:{value:0},uGain:{value:SKY_DISPLAY_GAIN},uSaturation:{value:1},uLowSun:{value:0}},
   vertexShader:vertex,fragmentShader:fragment,side:THREE.BackSide,depthWrite:false,fog:false,
  });
  this.mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,48,24),this.material);
  this.mesh.name='sky-dome';this.mesh.castShadow=false;this.mesh.receiveShadow=false;this.mesh.frustumCulled=false;this.mesh.renderOrder=-1;
  // Atmospheric backdrop only, not site design: three hazy ridgelines, nearer ones darker.
  this.ridges.name='distant-ridges';
  [[92,4,10,1],[118,7,15,2],[146,11,23,3]].forEach(([radius,low,high,seed])=>{
   const material=new THREE.MeshBasicMaterial({color:'#b8bcbd',fog:true,side:THREE.DoubleSide});this.ridgeMaterials.push(material);
   const ridge=new THREE.Mesh(ridgeGeometry(radius,low,high,seed),material);ridge.castShadow=ridge.receiveShadow=false;this.ridges.add(ridge);
  });
 }
 /** A second dome for the environment map: same sky, lit ground below the horizon. */
 clone(){
  // The sky that lights the scene is less saturated than the one seen: Beijing daylight is hazy and
  // whitish, and a full-blue fill turned every shaded floor and wall cold.
  const material=this.material.clone();material.uniforms={...this.material.uniforms,uBelow:{value:1},uGain:{value:1},uSaturation:{value:.45}};this.envMaterial=material;
  const m=new THREE.Mesh(this.mesh.geometry,material);m.frustumCulled=false;return m;
 }
 private envMaterial:THREE.ShaderMaterial|null=null;
 private ridgeMaterials:THREE.MeshBasicMaterial[]=[];
 readonly ridges=new THREE.Group();
 /** Seasonal air (solar.ts atmosphereFor): haze pales the zenith toward the horizon colour and
  * brightens the circumsolar glow; dust warms the horizon. The sky that lights the scene is scaled
  * so that on clear days the sun is several times stronger than the sky on open ground (crisp,
  * dark shadows), and less so in haze (more diffuse light, softer contrast). */
 haze=0;dust=0;
 setAir(haze:number,dust:number){this.haze=haze;this.dust=dust}
 /** Sky light used for lighting, relative to the drawn sky. */
 get lightingGain(){return .42+.34*this.haze}
 update(direction:THREE.Vector3,altitude:number){
  let i=0;while(i<KEYS.length-2&&altitude>KEYS[i+1].altitude)i++;
  const a=KEYS[i],b=KEYS[i+1],t=THREE.MathUtils.clamp((altitude-a.altitude)/(b.altitude-a.altitude),0,1);
  const intensity=THREE.MathUtils.lerp(a.intensity,b.intensity,t);
  const mix=(target:THREE.Color,x:string,y:string)=>target.set(x).lerp(new THREE.Color(y),t).multiplyScalar(intensity);
  mix(this.zenith,a.zenith,b.zenith);mix(this.horizon,a.horizon,b.horizon);mix(this.ground,a.ground,b.ground);
  if(altitude>-6){
   const day=THREE.MathUtils.smoothstep(altitude,-6,4);
   // Clear air: a deeper zenith; haze: paler toward the horizon colour; dust: a warmer horizon.
   const clear=(1-this.haze)*day;
   this.zenith.multiply(new THREE.Color(1-.2*clear,1-.08*clear,1+.02*clear)).lerp(this.horizon,.5*this.haze*day);
   this.horizon.lerp(new THREE.Color('#e7dcc8').multiplyScalar(intensity),.3*this.dust*day);
  }
  this.material.uniforms.uLowSun.value=altitude>-4?1-THREE.MathUtils.smoothstep(altitude,3,20):0;
  this.horizonDisplay.copy(this.horizon).multiplyScalar(SKY_DISPLAY_GAIN*(.44+.42*this.haze));
  (this.material.uniforms.uSunDir.value as THREE.Vector3).copy(direction).normalize();
  // Glow fades out once the sun is well below the horizon.
  this.material.uniforms.uGlow.value=THREE.MathUtils.clamp((altitude+4)/6,0,1)*(altitude<15?1.3:1)*(1+1.2*this.haze);
  if(this.envMaterial)this.envMaterial.uniforms.uGain.value=this.lightingGain;
  // A clear sky is only a third to a half as bright as sunlit white walls, which is why it reads
  // blue: drawn as bright as them, tone mapping washed it out to grey-white. Haze brightens it.
  this.material.uniforms.uGain.value=SKY_DISPLAY_GAIN*(.44+.42*this.haze);
  (this.material.uniforms.uSunColor.value as THREE.Color).set(altitude<10?'#ffd9ad':'#fff4e4');
  // Ridges: faint silhouettes in the sky's own haze, slightly cooler and darker the nearer they are.
  this.ridgeMaterials.forEach((m,i)=>m.color.copy(this.horizon).lerp(this.zenith,.3-.07*i).multiplyScalar((.9+.03*i)*SKY_DISPLAY_GAIN));
 }
 dispose(){this.mesh.geometry.dispose();this.material.dispose();this.envMaterial?.dispose();this.ridges.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose()});this.ridgeMaterials.forEach(m=>m.dispose())}
}

/** A closed band around the site whose top edge is a soft mountain silhouette. */
function ridgeGeometry(radius:number,low:number,high:number,seed:number){
 const n=720,positions:number[]=[],index:number[]=[];
 const phase=(k:number)=>Math.sin(seed*12.9898+k*78.233)*43758.5453%6.283;
 for(let i=0;i<=n;i++){
  const a=i/n*Math.PI*2;
  let h=.5+.24*Math.sin(2*a+phase(1))+.14*Math.sin(5*a+phase(2))+.08*Math.sin(11*a+phase(3))+.05*Math.abs(Math.sin(23*a+phase(4)))+.025*Math.sin(53*a+phase(5));
  h=low+(high-low)*Math.min(1,Math.max(0,h));
  const x=Math.cos(a)*radius,z=Math.sin(a)*radius;
  positions.push(x,-3,z,x,h,z);
  if(i<n){const b=i*2;index.push(b,b+2,b+1,b+1,b+2,b+3)}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(index);
 return g;
}

/** Fine pale gravel, generated once: albedo and a matching normal map. Two metres per tile. */
export function gravelTextures(size=1024){
 const height=new Float32Array(size*size);
 const albedo=document.createElement('canvas');albedo.width=albedo.height=size;
 const ctx=albedo.getContext('2d')!;ctx.fillStyle='#cdc8be';ctx.fillRect(0,0,size,size);
 let seed=7;const rand=()=>(seed=(seed*16807)%2147483647)/2147483647;
 // About 6–16 mm stones at 2 mm per pixel; wrap at the edges so the tile repeats cleanly.
 for(let n=0;n<26000;n++){
  const x=rand()*size,y=rand()*size,r=1.5+rand()*3.5,shade=168+rand()*70|0,warm=rand()*10|0;
  ctx.fillStyle=`rgb(${shade+warm},${shade+warm*.6|0},${shade-4})`;
  for(const ox of [-size,0,size])for(const oy of [-size,0,size]){
   if(x+ox<-r||x+ox>size+r||y+oy<-r||y+oy>size+r)continue;
   ctx.beginPath();ctx.ellipse(x+ox,y+oy,r,r*(.6+rand()*.4),rand()*Math.PI,0,Math.PI*2);ctx.fill();
  }
  const R=Math.ceil(r);for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++){const d=1-(dx*dx+dy*dy)/(r*r);if(d<=0)continue;const px=((x+dx|0)%size+size)%size,py=((y+dy|0)%size+size)%size;height[py*size+px]=Math.max(height[py*size+px],Math.sqrt(d)*r)}
 }
 const normal=document.createElement('canvas');normal.width=normal.height=size;
 const nctx=normal.getContext('2d')!;const image=nctx.createImageData(size,size);
 const at=(x:number,y:number)=>height[((y+size)%size)*size+((x+size)%size)];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=(at(x-1,y)-at(x+1,y))*.35,dy=(at(x,y-1)-at(x,y+1))*.35,l=Math.hypot(dx,dy,1),p=(y*size+x)*4;
  image.data[p]=(dx/l*.5+.5)*255;image.data[p+1]=(dy/l*.5+.5)*255;image.data[p+2]=(1/l*.5+.5)*255;image.data[p+3]=255;
 }
 nctx.putImageData(image,0,0);
 const map=new THREE.CanvasTexture(albedo);map.colorSpace=THREE.SRGBColorSpace;
 const normalMap=new THREE.CanvasTexture(normal);
 for(const t of [map,normalMap]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8}
 return {map,normalMap};
}

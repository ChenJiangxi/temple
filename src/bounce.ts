import * as THREE from 'three';

/** One bounce of sunlight inside the building (diffuse interreflection).
 *
 * 1. From the sun, render what it lights directly (a "reflective shadow map"): position,
 *    normal and colour of every sunlit surface, including the patches of light that came
 *    through the sutra glyphs, the roof openings and the grille.
 * 2. Keep only patches inside the building, group them into small clusters, and treat each
 *    as a diffuse emitter carrying the surface colour (red grille gives red light, jade
 *    gives green).
 * 3. Gather their light at a 0.3 m grid inside the building: a colour sum and a dominant
 *    direction, so a column face turned toward a bright floor patch receives more.
 *
 * Approximations: one bounce only; occlusion between emitter and receiver is not traced,
 * only the inner side walls and the upper slab are respected by rule. Not global
 * illumination and not a measured illuminance.
 */
export const BOUNCE_GRID={min:new THREE.Vector3(-3,0,-3),max:new THREE.Vector3(3,6,3),dims:[21,21,21] as [number,number,number]};
// 256 px across 10.6 m (4 cm texels, fine enough for glyph light); 16 x 16 texel clusters.
const RSM=256,CLUSTER=16,HALF=5.3;

const empty=()=>{const t=new THREE.Data3DTexture(new Uint16Array(4).fill(0),1,1,1);t.type=THREE.HalfFloatType;t.format=THREE.RGBAFormat;t.needsUpdate=true;return t};
export const bounceUniforms={
 uBounceLight:{value:empty() as THREE.Data3DTexture},
 uBounceDir:{value:empty() as THREE.Data3DTexture},
 // The previous result, faded out over about half a second, so recomputes during playback do not jump.
 uBounceLightPrev:{value:empty() as THREE.Data3DTexture},
 uBounceDirPrev:{value:empty() as THREE.Data3DTexture},
 uBounceMix:{value:1},
 uBounceMin:{value:BOUNCE_GRID.min.clone()},
 uBounceMax:{value:BOUNCE_GRID.max.clone()},
 uBounceDims:{value:new THREE.Vector3(...BOUNCE_GRID.dims)},
 uBounceEnabled:{value:0},
};

const vertex=`
varying vec2 vUv;
varying vec3 vNormalView;
void main(){
 #include <beginnormal_vertex>
 #include <defaultnormal_vertex>
 #include <begin_vertex>
 #include <project_vertex>
 vUv=uv;vNormalView=normalize(transformedNormal);
}`;
const fragment=`
#include <packing>
uniform vec3 uColor;
uniform float uMode;
uniform float uUseAlpha;
uniform sampler2D uAlpha;
varying vec2 vUv;
varying vec3 vNormalView;
void main(){
 if(uUseAlpha>0.5&&texture2D(uAlpha,vUv).g<0.52)discard;
 vec3 n=normalize(vNormalView);if(!gl_FrontFacing)n=-n;
 if(uMode<0.5)gl_FragColor=vec4(uColor,1.0);
 else if(uMode<1.5)gl_FragColor=vec4(n*0.5+0.5,1.0);
 else gl_FragColor=packDepthToRGBA(gl_FragCoord.z);
}`;

export class BounceLight {
 private camera=new THREE.OrthographicCamera(-HALF,HALF,HALF,-HALF,.1,40);
 private target=new THREE.WebGLRenderTarget(RSM,RSM,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,generateMipmaps:false});
 private buffers=[new Uint8Array(RSM*RSM*4),new Uint8Array(RSM*RSM*4),new Uint8Array(RSM*RSM*4)];
 private materials=new Map<THREE.Material,THREE.ShaderMaterial>();
 private cells:Float32Array;
 private generation=0;
 constructor(private renderer:THREE.WebGLRenderer,private scene:THREE.Scene){
  const [nx,ny,nz]=BOUNCE_GRID.dims,size=new THREE.Vector3().subVectors(BOUNCE_GRID.max,BOUNCE_GRID.min);
  this.cells=new Float32Array(nx*ny*nz*3);
  for(let z=0,i=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++,i++){
   this.cells[i*3]=BOUNCE_GRID.min.x+size.x*x/(nx-1);this.cells[i*3+1]=BOUNCE_GRID.min.y+size.y*y/(ny-1);this.cells[i*3+2]=BOUNCE_GRID.min.z+size.z*z/(nz-1);
  }
 }
 private rsmMaterial(source:THREE.Material,alpha?:THREE.Texture){
  const key=source;let m=this.materials.get(key);
  if(!m){
   const colour=(source as THREE.MeshStandardMaterial).color?.clone()??new THREE.Color(.7,.7,.7);
   m=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,side:source.side,
    uniforms:{uColor:{value:colour},uMode:{value:0},uUseAlpha:{value:alpha?1:0},uAlpha:{value:alpha??null}}});
   this.materials.set(key,m);
  }
  return m;
 }
 /** Recompute for the current sun. `direction` points toward the sun; `irradiance` is the
  * directional light's colour times intensity (three.js units). */
 /** Running average of recent results while time plays fast (see gather). */
 private acc:{light:Float32Array;dir:Float32Array}|null=null;
 private blend=1;
 update(direction:THREE.Vector3,irradiance:THREE.Color,blend=1){
  this.blend=blend;
  if(direction.y<=0.01){bounceUniforms.uBounceEnabled.value=0;return}
  const centre=new THREE.Vector3(0,3,0);
  this.camera.position.copy(centre).addScaledVector(direction,20);this.camera.up.set(0,1,0);
  if(Math.abs(direction.y)>.98)this.camera.up.set(0,0,1);
  this.camera.lookAt(centre);this.camera.updateMatrixWorld();
  // Swap every visible caster to the RSM material; glass and water do not reflect here.
  const swapped:[THREE.Mesh,THREE.Material|THREE.Material[]][]=[],hidden:THREE.Object3D[]=[],used:THREE.ShaderMaterial[]=[];
  this.scene.traverse(o=>{
   if(!(o instanceof THREE.Mesh)||!o.visible)return;
   if(!o.castShadow){o.visible=false;hidden.push(o);return}
   const source=Array.isArray(o.material)?o.material[0]:o.material;
   const alpha=(o.userData.skyDepthMaterial as THREE.MeshDepthMaterial|undefined)?.alphaMap??undefined;
   const m=this.rsmMaterial(source,alpha||undefined);used.push(m);swapped.push([o,o.material]);o.material=m;
  });
  const background=this.scene.background,fog=this.scene.fog,shadowUpdate=this.renderer.shadowMap.needsUpdate;
  const previous=this.renderer.getRenderTarget(),clear=new THREE.Color(),alpha=this.renderer.getClearAlpha();this.renderer.getClearColor(clear);
  this.scene.background=null;this.scene.fog=null;this.renderer.shadowMap.needsUpdate=false;
  for(let mode=0;mode<3;mode++){
   for(const m of used)m.uniforms.uMode.value=mode;
   this.renderer.setRenderTarget(this.target);this.renderer.setClearColor(mode===2?0xffffff:0x000000,1);this.renderer.clear();
   this.renderer.render(this.scene,this.camera);
   this.renderer.readRenderTargetPixels(this.target,0,0,RSM,RSM,this.buffers[mode]);
  }
  this.renderer.setRenderTarget(previous);this.renderer.setClearColor(clear,alpha);
  this.scene.background=background;this.scene.fog=fog;this.renderer.shadowMap.needsUpdate=shadowUpdate;
  for(const [mesh,material] of swapped)mesh.material=material;
  for(const o of hidden)o.visible=true;
  // The gather runs in slices between frames; a newer update cancels an older one.
  void this.gather(irradiance,++this.generation);
 }
 private async gather(irradiance:THREE.Color,generation:number){
  const right=new THREE.Vector3(),up=new THREE.Vector3(),back=new THREE.Vector3();this.camera.matrixWorld.extractBasis(right,up,back);
  const cam=this.camera.position,near=this.camera.near,span=this.camera.far-this.camera.near;
  const [albedo,normal,depth]=this.buffers;
  // Flux of one RSM texel: sun irradiance x albedo x texel area across the beam.
  const texelArea=(2*HALF/RSM)**2;
  const U0=255/256/255,U1=255/256/256/255,U2=255/256/65536/255,U3=1/16777216/255;
  const n=RSM/CLUSTER,clusters:number[]=[];
  for(let cy=0;cy<n;cy++)for(let cx=0;cx<n;cx++){
   let fr=0,fg=0,fb=0,px=0,py=0,pz=0,nx=0,ny=0,nz=0,w=0;
   for(let j=0;j<CLUSTER;j++)for(let i=0;i<CLUSTER;i++){
    const u=cx*CLUSTER+i,v=cy*CLUSTER+j,o=(v*RSM+u)*4;
    const d=depth[o]*U0+depth[o+1]*U1+depth[o+2]*U2+depth[o+3]*U3;if(d>=.999)continue;
    const su=((u+.5)/RSM*2-1)*HALF,sv=((v+.5)/RSM*2-1)*HALF,dist=near+d*span;
    const x=cam.x+right.x*su+up.x*sv-back.x*dist,y=cam.y+right.y*su+up.y*sv-back.y*dist,z=cam.z+right.z*su+up.z*sv-back.z*dist;
    // Inside the building only: exterior ground, roof top and the outer faces of the cage are excluded.
    if(Math.abs(x)>2.95||Math.abs(z)>2.95||y<.02||y>5.9)continue;
    const vx=normal[o]/127.5-1,vy=normal[o+1]/127.5-1,vz=normal[o+2]/127.5-1;
    const wx=right.x*vx+up.x*vy+back.x*vz,wy=right.y*vx+up.y*vy+back.y*vz,wz=right.z*vx+up.z*vy+back.z*vz;
    const a=texelArea;fr+=albedo[o]/255*a;fg+=albedo[o+1]/255*a;fb+=albedo[o+2]/255*a;
    px+=x;py+=y;pz+=z;nx+=wx;ny+=wy;nz+=wz;w++;
   }
   if(!w)continue;
   const l=Math.hypot(nx,ny,nz)||1;
   clusters.push(px/w,py/w,pz/w,nx/l,ny/l,nz/l,fr*irradiance.r,fg*irradiance.g,fb*irradiance.b);
  }
  const [gx,gy,gz]=BOUNCE_GRID.dims,count=gx*gy*gz,light=new Uint16Array(count*4),dir=new Uint16Array(count*4),fl=new Float32Array(count*4),fd=new Float32Array(count*4);
  const H=THREE.DataUtils.toHalfFloat,c=this.cells;
  // Rough occluders the gather must respect: the white side walls of the hall and the upper slab.
  const wallZ=(y:number)=>y<2.35?1.4:.1;
  for(let i=0;i<count;i++){
   if(i%1500===1499){await new Promise(r=>setTimeout(r,0));if(generation!==this.generation)return}
   const x=c[i*3],y=c[i*3+1],z=c[i*3+2];let sr=0,sg=0,sb=0,dx=0,dy=0,dz=0;
   for(let k=0;k<clusters.length;k+=9){
    const qx=clusters[k],qy=clusters[k+1],qz=clusters[k+2];
    if(z<wallZ(y)&&qz<wallZ(qy)&&((Math.abs(x)<2)!==(Math.abs(qx)<2)))continue;
    if(z>1&&qz>1&&((y<2.4)!==(qy<2.45)))continue;
    // A cluster stands for a patch about half a metre across: closer than that, treating it as a
    // point overstates its light and makes hot spots that jump about as the sun moves.
    let ox=x-qx,oy=y-qy,oz=z-qz;const d2=Math.max(ox*ox+oy*oy+oz*oz,.2),dl=Math.sqrt(d2);ox/=dl;oy/=dl;oz/=dl;
    const cos=clusters[k+3]*ox+clusters[k+4]*oy+clusters[k+5]*oz;if(cos<=0)continue;
    const s=cos/(Math.PI*d2),r=clusters[k+6]*s,g=clusters[k+7]*s,b=clusters[k+8]*s;
    sr+=r;sg+=g;sb+=b;const lum=.2126*r+.7152*g+.0722*b;dx-=ox*lum;dy-=oy*lum;dz-=oz*lum;
   }
   const lum=.2126*sr+.7152*sg+.0722*sb,dl=Math.hypot(dx,dy,dz);
   fl[i*4]=sr;fl[i*4+1]=sg;fl[i*4+2]=sb;fl[i*4+3]=1;
   // Direction toward the light sources, and how one-sided the light is (0 = from all around).
   fd[i*4]=dl?dx/dl:0;fd[i*4+1]=dl?dy/dl:0;fd[i*4+2]=dl?dz/dl:0;fd[i*4+3]=lum>1e-6?Math.min(1,dl/lum):0;
  }
  if(generation!==this.generation)return;
  // While time plays fast, successive results are averaged (each new one weighs 'blend'): the
  // cluster approximation shifts a little as the sun moves, and on its own that made patches of
  // bounced light jump back and forth between frames. Paused or dragged: the exact result at once.
  if(!this.acc||this.blend>=1)this.acc={light:fl,dir:fd};
  else{const a=this.acc,k=this.blend;for(let i=0;i<fl.length;i++){a.light[i]+=(fl[i]-a.light[i])*k;a.dir[i]+=(fd[i]-a.dir[i])*k}}
  for(let i=0;i<fl.length;i++){light[i]=H(this.acc.light[i]);dir[i]=H(this.acc.dir[i])}
  const make=(data:Uint16Array)=>{const t=new THREE.Data3DTexture(data,gx,gy,gz);t.type=THREE.HalfFloatType;t.format=THREE.RGBAFormat;t.minFilter=t.magFilter=THREE.LinearFilter;t.wrapS=t.wrapT=t.wrapR=THREE.ClampToEdgeWrapping;t.unpackAlignment=1;t.needsUpdate=true;return t};
  if(generation!==this.generation)return;
  const first=bounceUniforms.uBounceEnabled.value<.5;
  bounceUniforms.uBounceLightPrev.value.dispose();bounceUniforms.uBounceDirPrev.value.dispose();
  bounceUniforms.uBounceLightPrev.value=bounceUniforms.uBounceLight.value;bounceUniforms.uBounceDirPrev.value=bounceUniforms.uBounceDir.value;
  bounceUniforms.uBounceLight.value=make(light);bounceUniforms.uBounceDir.value=make(dir);bounceUniforms.uBounceEnabled.value=1;
  bounceUniforms.uBounceMix.value=first?1:0;
 }
 dispose(){this.generation++;this.target.dispose();this.materials.forEach(m=>m.dispose())}
}

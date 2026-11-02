import * as THREE from 'three';

/** Sky visibility field.
 *
 * For each point on a 0.2 m grid around the building: the fraction of the sky it can see
 * once the actual model blocks it — sutra glyph holes, grille gaps, roof openings, walls.
 * Measured by orthographic depth renders from evenly spread sky directions, the same
 * depth comparison a shadow map uses.
 *
 * Only the approximate sky fill and environment light are scaled by it. Direct sun,
 * its shadows and the glyph light are untouched. This is room-scale occlusion of the
 * existing sky approximation, not global illumination: light bouncing off sunlit
 * floors and columns is represented by one constant floor (SKY_BOUNCE), not computed.
 */
export const SKY_FIELD={
 min:new THREE.Vector3(-5.6,-.4,-5.6),max:new THREE.Vector3(5.6,6.8,5.6),
 dims:[57,37,57] as [number,number,number],
 directions:128,resolution:640,
};
/** Fraction of open-sky fill kept at a point that sees no sky (stand-in for interreflection). */
export const SKY_BOUNCE=.14;

const placeholder=new THREE.Data3DTexture(new Uint8Array([255]),1,1,1);
placeholder.format=THREE.RedFormat;placeholder.type=THREE.UnsignedByteType;placeholder.needsUpdate=true;

export const skyUniforms={
 uSkyField:{value:placeholder as THREE.Data3DTexture},
 uSkyMin:{value:SKY_FIELD.min.clone()},
 uSkyMax:{value:SKY_FIELD.max.clone()},
 uSkyDims:{value:new THREE.Vector3(...SKY_FIELD.dims)},
 uSkyEnabled:{value:0},
 uSkyBounce:{value:SKY_BOUNCE},
 // Sample slightly off the surface so a wall reads the side it faces, not its interior.
 uSkyNormalOffset:{value:.18},
};

/** Evenly spread over the upper hemisphere (uniform in solid angle). */
function skyDirections(count:number){
 const out:THREE.Vector3[]=[];
 for(let i=0;i<count;i++){
  const y=1-(i+.5)/count,r=Math.sqrt(1-y*y),phi=i*2.399963229728653;
  out.push(new THREE.Vector3(r*Math.cos(phi),y,r*Math.sin(phi)));
 }
 return out;
}

// three.js RGBA depth packing (packing.glsl): dot(rgba/255, UnpackFactors4).
const U0=255/256,U1=255/256/256,U2=255/256/65536,U3=1/16777216;

export class SkyField {
 values:Float32Array|null=null;
 private generation=0;
 private target:THREE.WebGLRenderTarget;
 private camera:THREE.OrthographicCamera;
 private depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
 private pixels:Uint8Array;
 private points:Float32Array;
 private readonly radius:number;
 constructor(private renderer:THREE.WebGLRenderer,private scene:THREE.Scene){
  const res=SKY_FIELD.resolution;
  this.target=new THREE.WebGLRenderTarget(res,res,{depthBuffer:true,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,generateMipmaps:false});
  this.pixels=new Uint8Array(res*res*4);
  const size=new THREE.Vector3().subVectors(SKY_FIELD.max,SKY_FIELD.min);
  this.radius=size.length()/2+.1;
  this.camera=new THREE.OrthographicCamera(-this.radius,this.radius,this.radius,-this.radius,.1,this.radius*4+10);
  const [nx,ny,nz]=SKY_FIELD.dims;this.points=new Float32Array(nx*ny*nz*3);
  for(let z=0,i=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++,i++){
   this.points[i*3]=SKY_FIELD.min.x+size.x*x/(nx-1);
   this.points[i*3+1]=SKY_FIELD.min.y+size.y*y/(ny-1);
   this.points[i*3+2]=SKY_FIELD.min.z+size.z*z/(nz-1);
  }
 }
 /** Measure with whatever is currently visible. A newer call cancels an older one. */
 async bake(){
  const generation=++this.generation;
  const [nx,ny,nz]=SKY_FIELD.dims,count=nx*ny*nz,res=SKY_FIELD.resolution;
  const seen=new Float32Array(count);const dirs=skyDirections(SKY_FIELD.directions);
  const center=new THREE.Vector3().addVectors(SKY_FIELD.min,SKY_FIELD.max).multiplyScalar(.5);
  const right=new THREE.Vector3(),up=new THREE.Vector3(),back=new THREE.Vector3();
  const near=this.camera.near,span=this.camera.far-this.camera.near;
  // Depth tolerance: 3 cm, so a grid point is not hidden by a surface it sits on.
  const tolerance=.03/span;
  for(let d=0;d<dirs.length;d++){
   if(generation!==this.generation)return false;
   const dir=dirs[d];
   this.camera.position.copy(center).addScaledVector(dir,this.radius*2+4);
   this.camera.up.set(0,1,0);if(Math.abs(dir.y)>.98)this.camera.up.set(0,0,1);
   this.camera.lookAt(center);this.camera.updateMatrixWorld();
   this.camera.matrixWorld.extractBasis(right,up,back);
   this.renderDepth();
   this.renderer.readRenderTargetPixels(this.target,0,0,res,res,this.pixels);
   const px=this.pixels,cam=this.camera.position,pts=this.points,r=this.radius;
   for(let i=0;i<count;i++){
    const rx=pts[i*3]-cam.x,ry=pts[i*3+1]-cam.y,rz=pts[i*3+2]-cam.z;
    const u=Math.floor(((rx*right.x+ry*right.y+rz*right.z)/r*.5+.5)*res);
    const v=Math.floor(((rx*up.x+ry*up.y+rz*up.z)/r*.5+.5)*res);
    if(u<0||v<0||u>=res||v>=res){seen[i]++;continue}
    const depth=(-(rx*back.x+ry*back.y+rz*back.z)-near)/span;
    const o=(v*res+u)*4;
    const blocker=px[o]/255*U0+px[o+1]/255*U1+px[o+2]/255*U2+px[o+3]/255*U3;
    if(blocker>=depth-tolerance)seen[i]++;
   }
   // Measured while the page is already interactive: yield often to keep frames smooth.
   if(d%2===1)await new Promise(r=>setTimeout(r,0));
  }
  if(generation!==this.generation)return false;
  // Grille bars and glyph strokes are finer than the grid: neighbouring points can
  // see through different gaps. One [1,2,1] pass per axis removes that sampling
  // speckle (about 0.2 m of smoothing) without moving the room-scale result.
  let values=new Float32Array(count);for(let i=0;i<count;i++)values[i]=seen[i]/dirs.length;
  const strides=[1,nx,nx*ny],sizes=[nx,ny,nz];
  for(let axis=0;axis<3;axis++){
   const next=new Float32Array(count),stride=strides[axis],n=sizes[axis];
   for(let i=0;i<count;i++){
    const c=Math.floor(i/stride)%n;
    const a=c>0?values[i-stride]:values[i],b=c<n-1?values[i+stride]:values[i];
    next[i]=(a+2*values[i]+b)/4;
   }
   values=next;
  }
  const bytes=new Uint8Array(count);for(let i=0;i<count;i++)bytes[i]=Math.round(values[i]*255);
  const texture=new THREE.Data3DTexture(bytes,nx,ny,nz);
  texture.format=THREE.RedFormat;texture.type=THREE.UnsignedByteType;
  texture.minFilter=texture.magFilter=THREE.LinearFilter;
  texture.wrapS=texture.wrapT=texture.wrapR=THREE.ClampToEdgeWrapping;
  texture.unpackAlignment=1;texture.needsUpdate=true;
  const old=skyUniforms.uSkyField.value;
  // uSkyEnabled is faded in by the caller, so the first result does not pop.
  skyUniforms.uSkyField.value=texture;this.values=values;
  if(old!==placeholder)old.dispose();
  return true;
 }
 /** Same field on the CPU, trilinear, for the viewer's own position. */
 sample(p:THREE.Vector3){
  if(!this.values)return 1;
  const [nx,ny,nz]=SKY_FIELD.dims,min=SKY_FIELD.min,max=SKY_FIELD.max;
  const g=(v:number,a:number,b:number,n:number)=>THREE.MathUtils.clamp((v-a)/(b-a),0,1)*(n-1);
  const fx=g(p.x,min.x,max.x,nx),fy=g(p.y,min.y,max.y,ny),fz=g(p.z,min.z,max.z,nz);
  const x0=Math.min(nx-2,Math.floor(fx)),y0=Math.min(ny-2,Math.floor(fy)),z0=Math.min(nz-2,Math.floor(fz));
  const tx=fx-x0,ty=fy-y0,tz=fz-z0,at=(x:number,y:number,z:number)=>this.values![x+y*nx+z*nx*ny];
  const lerp=THREE.MathUtils.lerp;
  const c00=lerp(at(x0,y0,z0),at(x0+1,y0,z0),tx),c10=lerp(at(x0,y0+1,z0),at(x0+1,y0+1,z0),tx);
  const c01=lerp(at(x0,y0,z0+1),at(x0+1,y0,z0+1),tx),c11=lerp(at(x0,y0+1,z0+1),at(x0+1,y0+1,z0+1),tx);
  const inside=lerp(lerp(c00,c10,ty),lerp(c01,c11,ty),tz);
  // Same fade to open sky outside the box as the shader.
  const ox=Math.max(min.x-p.x,p.x-max.x,0),oy=Math.max(min.y-p.y,p.y-max.y,0),oz=Math.max(min.z-p.z,p.z-max.z,0);
  return lerp(inside,1,THREE.MathUtils.smoothstep(Math.hypot(ox,oy,oz),0,4));
 }
 private renderDepth(){
  // Blockers are what casts sun shadows; glass and water do not.
  const swapped:[THREE.Mesh,THREE.Material|THREE.Material[]][]=[],hidden:THREE.Object3D[]=[];
  this.scene.traverse(o=>{
   if(!(o instanceof THREE.Mesh)||!o.visible)return;
   if(!o.castShadow){o.visible=false;hidden.push(o);return}
   swapped.push([o,o.material]);o.material=(o.userData.skyDepthMaterial as THREE.Material|undefined)??o.customDepthMaterial??this.depth;
  });
  const background=this.scene.background,fog=this.scene.fog,shadowUpdate=this.renderer.shadowMap.needsUpdate;
  const previousTarget=this.renderer.getRenderTarget(),clear=new THREE.Color(),alpha=this.renderer.getClearAlpha();
  this.renderer.getClearColor(clear);
  this.scene.background=null;this.scene.fog=null;this.renderer.shadowMap.needsUpdate=false;
  this.renderer.setRenderTarget(this.target);this.renderer.setClearColor(0xffffff,1);this.renderer.clear();
  this.renderer.render(this.scene,this.camera);
  this.renderer.setRenderTarget(previousTarget);this.renderer.setClearColor(clear,alpha);
  this.scene.background=background;this.scene.fog=fog;this.renderer.shadowMap.needsUpdate=shadowUpdate;
  for(const [mesh,material] of swapped)mesh.material=material;
  for(const o of hidden)o.visible=true;
 }
 dispose(){this.generation++;this.target.dispose();this.depth.dispose()}
}

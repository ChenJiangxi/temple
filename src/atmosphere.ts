import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { roofGLSL, roofUniforms } from './solar-shadows';

/** Temple air: a faint haze inside the building (incense, dust) in which sunlight passing the
 * sutra glyphs and the roof openings shows as soft shafts, plus a gentle glow on bright light.
 *
 * The shafts are ray-marched against the same sun shadow map the scene uses, so their shapes
 * come from the real openings. Haze is confined to the interior, computed at half resolution,
 * blurred and added to the image. Tone mapping (AgX, softer than ACES) happens once, at the end.
 * Approximations: single scattering, uniform haze density.
 */
const HAZE_STEPS=40;
const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;
const hazeFragment=`
#include <packing>
uniform sampler2D tDepth;
uniform sampler2D tShadow;
uniform mat4 uShadowMatrix;
uniform mat4 uProjectionInverse;
uniform mat4 uCameraWorld;
uniform vec3 uCameraPosition;
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform float uDensity;
uniform vec3 uBoxMin;
uniform vec3 uBoxMax;
varying vec2 vUv;
${roofGLSL(false)}
vec2 boxHit(vec3 ro,vec3 rd){
 vec3 inv=1.0/rd,t0=(uBoxMin-ro)*inv,t1=(uBoxMax-ro)*inv;
 vec3 lo=min(t0,t1),hi=max(t0,t1);
 return vec2(max(max(lo.x,lo.y),lo.z),min(min(hi.x,hi.y),hi.z));
}
void main(){
 float depth=texture2D(tDepth,vUv).x;
 vec4 view=uProjectionInverse*vec4(vUv*2.0-1.0,depth*2.0-1.0,1.0);view/=view.w;
 vec3 world=(uCameraWorld*view).xyz;
 vec3 rd=world-uCameraPosition;float tMax=length(rd);rd/=tMax;
 vec2 span=boxHit(uCameraPosition,rd);
 float a=max(span.x,0.0),b=min(span.y,tMax);
 vec3 haze=vec3(0.0);
 if(b>a&&uDensity>0.0){
  float stepLength=(b-a)/float(${HAZE_STEPS});
  float jitter=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(0.06711056,0.00583715))));
  vec3 lit=vec3(0.0);
  for(int i=0;i<${HAZE_STEPS};i++){
   vec3 p=uCameraPosition+rd*(a+(float(i)+jitter)*stepLength);
   vec4 sc=uShadowMatrix*vec4(p,1.0);vec3 s=sc.xyz/sc.w;
   // The rear roof slope is not in the shadow map (see roofLight): its diffused light is applied here too.
   if(s.x>0.0&&s.x<1.0&&s.y>0.0&&s.y<1.0&&s.z<1.0)lit+=step(s.z-0.0004,unpackRGBAToDepth(texture2D(tShadow,s.xy)))*roofLight(p)*sideGlass(p)*roofTint(p);
  }
  // Henyey-Greenstein, mostly forward: shafts read strongest when looking toward the sun.
  float g=0.5,c=dot(rd,uSunDirection);
  // Small isotropic floor only: a larger one veiled the whole room even looking away from the sun.
  float phase=(1.0-g*g)/(12.566*pow(1.0+g*g-2.0*g*c,1.5))+0.012;
  haze=uSunColor*lit*stepLength*phase*uDensity;
 }
 gl_FragColor=vec4(haze,1.0);
}`;
const blurFragment=`
uniform sampler2D tInput;uniform vec2 uDirection;varying vec2 vUv;
void main(){
 // 9-tap Gaussian (linear-sampled, sigma about 2.5 texels).
 vec3 sum=texture2D(tInput,vUv).rgb*0.2270;
 sum+=texture2D(tInput,vUv+uDirection*1.3846).rgb*0.3162;sum+=texture2D(tInput,vUv-uDirection*1.3846).rgb*0.3162;
 sum+=texture2D(tInput,vUv+uDirection*3.2308).rgb*0.0703;sum+=texture2D(tInput,vUv-uDirection*3.2308).rgb*0.0703;
 gl_FragColor=vec4(sum,1.0);
}`;
const compositeFragment=`
uniform sampler2D tColor;uniform sampler2D tHaze;varying vec2 vUv;
void main(){vec4 c=texture2D(tColor,vUv);gl_FragColor=vec4(c.rgb+texture2D(tHaze,vUv).rgb,c.a);}`;

const quad=(fragmentShader:string,uniforms:Record<string,THREE.IUniform>)=>{
 const material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader,uniforms,depthTest:false,depthWrite:false});
 return {material,quad:new FullScreenQuad(material)};
};

/** Scene render that remembers which buffer it drew into, so later passes find this frame's depth
 * whatever the composer's buffer swapping has done. */
class SceneRenderPass extends RenderPass {
 target:THREE.WebGLRenderTarget|null=null;
 render(renderer:THREE.WebGLRenderer,writeBuffer:THREE.WebGLRenderTarget,readBuffer:THREE.WebGLRenderTarget,deltaTime?:number,maskActive?:boolean){super.render(renderer,writeBuffer,readBuffer,deltaTime as number,maskActive as boolean);this.target=readBuffer}
}
/** Contact shadows: ground-truth ambient occlusion (GTAO) from this frame's depth, normals
 * reconstructed from depth (no extra scene render), denoised, multiplied over the image at 70%.
 * Darkens where surfaces meet - wall and floor, under the vessel and cushions, at the steps -
 * within about 0.35 m. Large-scale occlusion is the sky-visibility field's job. */
class ContactShadowPass extends GTAOPass {
 constructor(scene:THREE.Scene,camera:THREE.PerspectiveCamera,width:number,height:number,private source:SceneRenderPass,depth:THREE.DepthTexture){
  // three.js r180 GTAOPass reads a render target it only creates when no depth is given, so build
  // it the default way first, then switch to this frame's depth (no extra scene render follows).
  super(scene,camera,width,height,undefined,{radius:.35,distanceExponent:1.4,thickness:1.2,scale:1,samples:12},{lumaPhi:10,depthPhi:2,normalPhi:3,radius:6,rings:2,samples:12});
  this.setGBuffer(depth);
  this.blendIntensity=.7;
 }
 render(renderer:THREE.WebGLRenderer,writeBuffer:THREE.WebGLRenderTarget,readBuffer:THREE.WebGLRenderTarget,deltaTime?:number,maskActive?:boolean){
  const depth=this.source.target?.depthTexture;
  if(depth){(this as any).gtaoMaterial.uniforms.tDepth.value=depth;(this as any).pdMaterial.uniforms.tDepth.value=depth}
  super.render(renderer,writeBuffer,readBuffer,deltaTime,maskActive);
 }
}
const vignetteFragment=`
uniform sampler2D tColor;uniform float uStrength;uniform float uAspect;varying vec2 vUv;
void main(){
 vec4 c=texture2D(tColor,vUv);
 vec2 d=(vUv-0.5)*vec2(uAspect,1.0);float r=length(d)/length(vec2(uAspect,1.0)*0.5);
 c.rgb*=1.0-uStrength*smoothstep(0.3,1.0,r*r);
 gl_FragColor=c;
}`;
/** A gentle fall-off toward the corners, as a lens gives indoors and at eye level. Off for the
 * axonometric and section views, which are drawings. */
class VignettePass extends Pass {
 v=quad(vignetteFragment,{tColor:{value:null},uStrength:{value:0},uAspect:{value:1}});
 render(renderer:THREE.WebGLRenderer,writeBuffer:THREE.WebGLRenderTarget,readBuffer:THREE.WebGLRenderTarget){
  const u=this.v.material.uniforms;u.tColor.value=readBuffer.texture;u.uAspect.value=readBuffer.width/Math.max(1,readBuffer.height);
  renderer.setRenderTarget(this.renderToScreen?null:writeBuffer);this.v.quad.render(renderer);
 }
 dispose(){this.v.material.dispose();this.v.quad.dispose()}
}

class HazePass extends Pass {
 haze=quad(hazeFragment,{tDepth:{value:null},tShadow:{value:null},uShadowMatrix:{value:new THREE.Matrix4()},uProjectionInverse:{value:new THREE.Matrix4()},uCameraWorld:{value:new THREE.Matrix4()},
  uCameraPosition:{value:new THREE.Vector3()},uSunDirection:{value:new THREE.Vector3()},uSunColor:{value:new THREE.Color()},uDensity:{value:.16},
  uBoxMin:{value:new THREE.Vector3(-2.95,.05,-2.95)},uBoxMax:{value:new THREE.Vector3(2.95,5.9,2.95)},...roofUniforms});
 blur=quad(blurFragment,{tInput:{value:null},uDirection:{value:new THREE.Vector2()}});
 composite=quad(compositeFragment,{tColor:{value:null},tHaze:{value:null}});
 a=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});b=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});
 constructor(private camera:THREE.PerspectiveCamera,private sun:THREE.DirectionalLight,private source:SceneRenderPass){super()}
 setSize(width:number,height:number){const w=Math.max(1,width>>1),h=Math.max(1,height>>1);this.a.setSize(w,h);this.b.setSize(w,h)}
 render(renderer:THREE.WebGLRenderer,writeBuffer:THREE.WebGLRenderTarget,readBuffer:THREE.WebGLRenderTarget){
  const u=this.haze.material.uniforms,shadow=this.sun.shadow;
  u.tDepth.value=this.source.target?.depthTexture??readBuffer.depthTexture;u.tShadow.value=shadow.map?.texture??null;
  u.uShadowMatrix.value.copy(shadow.matrix);u.uProjectionInverse.value.copy(this.camera.projectionMatrixInverse);u.uCameraWorld.value.copy(this.camera.matrixWorld);
  u.uCameraPosition.value.copy(this.camera.position);
  u.uSunDirection.value.subVectors(this.sun.position,this.sun.target.position).normalize();
  (u.uSunColor.value as THREE.Color).copy(this.sun.color).multiplyScalar(this.sun.intensity);
  renderer.setRenderTarget(this.a);this.haze.quad.render(renderer);
  const bu=this.blur.material.uniforms;
  bu.tInput.value=this.a.texture;bu.uDirection.value.set(1/this.a.width,0);renderer.setRenderTarget(this.b);this.blur.quad.render(renderer);
  bu.tInput.value=this.b.texture;bu.uDirection.value.set(0,1/this.a.height);renderer.setRenderTarget(this.a);this.blur.quad.render(renderer);
  const cu=this.composite.material.uniforms;cu.tColor.value=readBuffer.texture;cu.tHaze.value=this.a.texture;
  renderer.setRenderTarget(this.renderToScreen?null:writeBuffer);this.composite.quad.render(renderer);
 }
 dispose(){for(const q of [this.haze,this.blur,this.composite]){q.material.dispose();q.quad.dispose()}this.a.dispose();this.b.dispose()}
}

export class Atmosphere {
 composer:EffectComposer;haze:HazePass;bloom:UnrealBloomPass;contact:ContactShadowPass;vignette:VignettePass;
 constructor(private renderer:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.PerspectiveCamera,sun:THREE.DirectionalLight,samples=4){
  const size=renderer.getDrawingBufferSize(new THREE.Vector2());
  const target=new THREE.WebGLRenderTarget(size.x,size.y,{type:THREE.HalfFloatType,samples,depthTexture:new THREE.DepthTexture(size.x,size.y)});
  this.composer=new EffectComposer(renderer,target);
  const sceneRender=new SceneRenderPass(scene,camera);this.composer.addPass(sceneRender);
  this.contact=new ContactShadowPass(scene,camera,size.x,size.y,sceneRender,target.depthTexture as THREE.DepthTexture);this.composer.addPass(this.contact);
  this.haze=new HazePass(camera,sun,sceneRender);this.composer.addPass(this.haze);
  // Gentle glow on sunlit patches only (high threshold), not a general blur.
  this.bloom=new UnrealBloomPass(new THREE.Vector2(size.x,size.y),.14,.6,.92);this.composer.addPass(this.bloom);
  this.vignette=new VignettePass();this.composer.addPass(this.vignette);
  this.composer.addPass(new OutputPass());
 }
 setSize(width:number,height:number){this.composer.setPixelRatio(this.renderer.getPixelRatio());this.composer.setSize(width,height)}
 /** Haze and glow are the expensive passes; lower quality tiers switch them off. */
 level:0|1|2=2;section=false;
 setQuality(level:0|1|2){this.level=level;this.haze.enabled=level===2;this.contact.enabled=level===2;this.bloom.enabled=level>=1&&!this.section}
 setVignette(strength:number){this.vignette.v.material.uniforms.uStrength.value=strength;this.vignette.enabled=strength>0}
 /** No glow in the section: it would grey the solid fill next to the bright, high-key exterior. */
 setSectionMode(on:boolean){this.section=on;this.setQuality(this.level)}
 /** Section view: haze only on the side of the cut that is still drawn. */
 setHazeMinX(x:number){(this.haze.haze.material.uniforms.uBoxMin.value as THREE.Vector3).x=x}
 render(){this.composer.render()}
 dispose(){this.haze.dispose();this.contact.dispose();this.vignette.dispose();this.bloom.dispose();this.composer.dispose()}
}

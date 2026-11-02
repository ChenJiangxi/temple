import * as THREE from 'three';
import { skyUniforms } from './sky-field';
import { bounceUniforms } from './bounce';
import { ARCH } from './architecture';

/** Sunlight through the rear roof slope (the one with the 卍 openings over the Buddha).
 * The openings hold a lightly diffusing glazing (frosted glass or translucent shell panes, the
 * author's 'soft light'): sunlight passing them spreads into a narrow cone, so the pattern lands
 * on the Buddha with soft edges and a little dimmer. Open holes would cast it hard-edged.
 * The slope is therefore left out of the sun's shadow map and handled here instead: from each lit
 * point, follow the ray toward the sun to the roof plane and read the openings there from a mask,
 * blurred over the disk the cone covers at that distance (t * spread). uRoofDiffuse: x = tangent of
 * the spread half-angle plus the sun's own, y = what the frosting itself passes (absorption and
 * back-scatter), before the angle-dependent reflection at the glass faces. uRoofOn is 0 while the
 * roof is hidden. */
export const roofUniforms={uRoofMask:{value:null as THREE.Texture|null},uSunWorld:{value:new THREE.Vector3(0,1,0)},uRoofDiffuse:{value:new THREE.Vector2(.0047,1)},uRoofTint:{value:new THREE.Vector3(1,1,1)},uRoofOn:{value:0},uSideGlassOn:{value:0}};
export const roofGLSL=(taps:boolean)=>`
uniform sampler2D uRoofMask;
uniform vec3 uSunWorld;
uniform vec2 uRoofDiffuse;
uniform vec3 uRoofTint;
uniform float uRoofOn;
uniform float uSideGlassOn;
// Does the ray from P toward the sun cross the rear slope inside the roof? Gives the crossing point
// in mask coordinates and the distance to it.
bool roofCross(vec3 P,out vec2 uv,out float t){
 const float low=${ARCH.roofLow.toFixed(4)},zb=${ARCH.roofBackInner.toFixed(4)};
 const float slope=(6.0-low)/2.9;
 vec3 L=normalize(uSunWorld);
 float f0=P.y-low-(zb-P.z)*slope,df=L.y+L.z*slope;
 if(uRoofOn<0.5||f0>-0.02||df<=1e-4)return false;
 t=-f0/df;vec3 X=P+t*L;float v=(zb-X.z)/2.9;
 if(v<0.0||v>1.0||abs(X.x)>2.1+0.9*v)return false;
 uv=vec2((3.0-X.x)/6.0,v);return true;
}
// Fraction of sunlight (luminance) reaching P through the glazing: the openings, blurred by the
// etched layer's forward scatter (a Gaussian of angular width uRoofDiffuse.x, taps placed on a
// Gaussian), times what the glass passes, times the Fresnel loss at its two faces.
float roofLight(vec3 P){
 vec2 uv;float t;
 if(!roofCross(P,uv,t))return 1.0;
 float s=t*uRoofDiffuse.x;
 float lod=max(0.0,log2(s/0.00586)-0.5);
 ${taps?`float m=0.0;
 for(int i=0;i<12;i++){float f=float(i)+0.5;float a=f*2.39996323;vec2 o=sqrt(-2.0*log(1.0-f/12.0))*vec2(cos(a),sin(a))*s;m+=textureLod(uRoofMask,uv+vec2(o.x/6.0,o.y/2.955),lod).r;}
 m/=12.0;`:`float m=textureLod(uRoofMask,uv,lod+1.5).r;`}
 // A flat pane does not bend the light's direction; it only shifts the ray sideways by about
 // 0.2 x its thickness (under 2 mm here). Fresnel loss at the two outer faces (n = 1.5,
 // unpolarised, multiple reflections inside; the interlayer is index-matched).
 vec3 L=normalize(uSunWorld);const vec3 n=vec3(0.0,0.9814,0.1919);
 float ci=clamp(dot(L,n),0.02,1.0),st=sqrt(1.0-ci*ci)/1.5,ct=sqrt(1.0-st*st);
 float rs=(ci-1.5*ct)/(ci+1.5*ct),rp=(1.5*ci-ct)/(1.5*ci+ct);rs*=rs;rp*=rp;
 float fresnel=0.5*((1.0-rs)/(1.0+rs)+(1.0-rp)/(1.0+rp));
 return m*uRoofDiffuse.y*fresnel;
}
// Proposal: clear glass roofs over the two stair zones (x 2.1-3 m each side), sloping from the
// cage top (6.0 m) down to the valley ends (5.433 m). Sunlight crossing them loses only the
// Fresnel reflection at the two faces; a flat pane does not deflect it.
float sideGlass(vec3 P){
 if(uSideGlassOn<0.5)return 1.0;
 vec3 L=normalize(uSunWorld);const float k=0.63;
 float light=1.0;
 for(int i=0;i<2;i++){
  float s=i==0?1.0:-1.0;
  float f0=P.y-6.0+(3.0-s*P.x)*k,df=L.y-s*L.x*k;
  if(f0>-0.02||df<=1e-4)continue;
  vec3 X=P+(-f0/df)*L;float xa=s*X.x;
  if(xa<2.1||xa>3.0)continue;
  float u=(xa-2.1)/0.9;
  if(X.z<-0.1-u*2.9||X.z>1.0+u*2.0)continue;
  vec3 n=normalize(vec3(-s*k,1.0,0.0));
  float ci=clamp(dot(L,n),0.02,1.0),st=sqrt(1.0-ci*ci)/1.5,ct=sqrt(1.0-st*st);
  float rs=(ci-1.5*ct)/(ci+1.5*ct),rp=(1.5*ci-ct)/(1.5*ci+ct);rs*=rs;rp*=rp;
  light*=0.5*((1.0-rs)/(1.0+rs)+(1.0-rp)/(1.0+rp));
 }
 return light;
}
// Colour of light that came through the glazing (the pale honey interlayer), luminance 1.
vec3 roofTint(vec3 P){vec2 uv;float t;return roofCross(P,uv,t)?uRoofTint:vec3(1.0);}
`;

/** Directional-light PCSS: blocker depth determines solar penumbra width.
 * Uses the real scene shadow map (roof openings, glyph alpha test, floor, columns,
 * relief), not an emissive glyph/decal. Real-time approximation, not path tracing.
 * Reference: https://developer.download.nvidia.com/whitepapers/2008/PCSS_Integration.pdf
 */
const sunShadowGLSL=`
#if defined(USE_SHADOWMAP) && NUM_DIR_LIGHT_SHADOWS > 0
#ifdef SUBSURFACE_SOFTEN
uniform float uSubsurfaceRadius;
#endif
uniform float uSolarWorldSpan;
uniform float uSolarDepthSpan;
uniform float uSolarMinTexels;
vec2 sunDiskSample(int i, int count) {
 float f=float(i)+0.5;
 float angle=f*2.39996323;
 return sqrt(f/float(count))*vec2(cos(angle),sin(angle));
}
// Interpolate visibility, never packed depth values. This removes nearest-texel
// striping while keeping the physical solar disk radius unchanged.
float solarVisibility(sampler2D depths, vec2 mapSize, vec2 uv, vec3 receiver, vec2 gradient) {
 vec2 pixel=uv*mapSize-0.5;
 vec2 anchor=floor(pixel),f=fract(pixel);
 vec2 a=(anchor+vec2(0.5,0.5))/mapSize;
 vec2 b=(anchor+vec2(1.5,0.5))/mapSize;
 vec2 c=(anchor+vec2(0.5,1.5))/mapSize;
 vec2 d=(anchor+vec2(1.5,1.5))/mapSize;
 float va=step(receiver.z+dot(gradient,a-receiver.xy),unpackRGBAToDepth(texture2D(depths,a)));
 float vb=step(receiver.z+dot(gradient,b-receiver.xy),unpackRGBAToDepth(texture2D(depths,b)));
 float vc=step(receiver.z+dot(gradient,c-receiver.xy),unpackRGBAToDepth(texture2D(depths,c)));
 float vd=step(receiver.z+dot(gradient,d-receiver.xy),unpackRGBAToDepth(texture2D(depths,d)));
 return mix(mix(va,vb,f.x),mix(vc,vd,f.x),f.y);
}
float solarShadowMap(sampler2D depths, vec2 mapSize, float intensity, float bias, float unusedRadius, vec4 coord) {
 vec3 p=coord.xyz/coord.w;
 if(p.x<0.0||p.x>1.0||p.y<0.0||p.y>1.0||p.z<0.0||p.z>1.0)return 1.0;
 // Fade out over the last 4% of the shadow map so its boundary never shows as a line on the ground.
 float edgeFade=smoothstep(0.0,0.04,min(min(p.x,1.0-p.x),min(p.y,1.0-p.y)));
 p.z+=bias;
 // Radius = tan(0.533 degrees / 2). Units: orthographic world metres.
 const float angularRadius=0.0046513;
 // Blockers further than ~11 m only matter outdoors, where the penumbra is wide anyway.
 float searchRadius=11.0*angularRadius/uSolarWorldSpan;
 vec2 dx=dFdx(p.xy),dy=dFdy(p.xy);
 float determinant=dx.x*dy.y-dx.y*dy.x;
 vec2 gradient=vec2(0.0);
 if(abs(determinant)>1e-10){
  float zx=dFdx(p.z),zy=dFdy(p.z);
  gradient=vec2(dy.y*zx-dx.y*zy,dx.x*zy-dy.x*zx)/determinant;
 }
 // Nearest depth texels live at their centres. Compare against the receiver
 // plane at that actual sample point, not the unquantized disk offset.
 // A small slope-aware tolerance covers sub-texel raster depth error.
 p.z-=min(0.00012,dot(abs(gradient),0.35/mapSize));
 float sumDepth=0.0,blockers=0.0;
 for(int i=0;i<24;i++){
  vec2 offset=sunDiskSample(i,24)*searchRadius;
  vec2 uv=(floor((p.xy+offset)*mapSize)+0.5)/mapSize;
  vec2 delta=uv-p.xy;
  float d=unpackRGBAToDepth(texture2D(depths,uv));
  float receiverOffset=dot(gradient,delta);
  if(d<p.z+receiverOffset-0.00002){sumDepth+=d-receiverOffset;blockers+=1.0;}
 }
 if(blockers<0.5)return 1.0;
 float separation=max(0.0,(p.z-sumDepth/blockers)*uSolarDepthSpan);
 // At least one texel wide: contact shadows (a sun penumbra under a millimetre) would otherwise
 // show the shadow map's texel stairs along their edges in close-up.
 // (wider while time plays fast: the rotating shadow map otherwise makes edges crawl)
 float radius=max(uSolarMinTexels/mapSize.x,separation*angularRadius/uSolarWorldSpan);
 #ifdef SUBSURFACE_SOFTEN
 // Translucent stone: light spreads a little inside before re-emerging, softening edges.
 radius=max(radius,uSubsurfaceRadius/uSolarWorldSpan);
 #endif
 float light=0.0;
 for(int i=0;i<32;i++){
  vec2 offset=sunDiskSample(i,32)*radius;
  light+=solarVisibility(depths,mapSize,p.xy+offset,p,gradient);
 }
 return mix(1.0,light/32.0,intensity*edgeFade);
}
float solarShadow(sampler2D depths, vec2 mapSize, float intensity, float bias, float unusedRadius, vec4 coord) {
 return solarShadowMap(depths,mapSize,intensity,bias,unusedRadius,coord)*roofLight(vSkyWorld)*sideGlass(vSkyWorld);
}
#endif
`;
// Sky fill and environment light scaled by the measured sky visibility (sky-field.ts).
// Direct sunlight is not touched here.
const skyParsFragment=`
uniform highp sampler3D uSkyField;
uniform vec3 uSkyMin;
uniform vec3 uSkyMax;
uniform vec3 uSkyDims;
uniform float uSkyEnabled;
uniform float uSkyBounce;
uniform vec3 uInterreflect;
uniform float uSkyNormalOffset;
varying vec3 vSkyWorld;
uniform highp sampler3D uBounceLight;
uniform highp sampler3D uBounceDir;
uniform vec3 uBounceMin;
uniform vec3 uBounceMax;
uniform vec3 uBounceDims;
uniform highp sampler3D uBounceLightPrev;
uniform highp sampler3D uBounceDirPrev;
uniform float uBounceMix;
uniform float uBounceEnabled;
`;
const skyApplyFragment=`
#if defined( RE_IndirectDiffuse )
{
 vec3 skyNormal=inverseTransformDirection(normal,viewMatrix);
 vec3 skyGrid=clamp((vSkyWorld+skyNormal*uSkyNormalOffset-uSkyMin)/(uSkyMax-uSkyMin),0.0,1.0);
 float skyVisible=texture(uSkyField,(skyGrid*(uSkyDims-1.0)+0.5)/uSkyDims).r;
 // Outside the measured box the building blocks less and less sky: fade to open sky over 4 m.
 vec3 skyOutside=max(max(uSkyMin-vSkyWorld,vSkyWorld-uSkyMax),0.0);
 skyVisible=mix(skyVisible,1.0,smoothstep(0.0,4.0,length(skyOutside)));
 // Where little sky is seen, the remaining light has bounced around the room several times and
 // taken on the colour of the warm lime plaster (uInterreflect), instead of staying sky-blue.
 vec3 skyScale=mix(vec3(1.0),mix(uSkyBounce*uInterreflect,vec3(1.0),skyVisible),uSkyEnabled);
 irradiance*=skyScale;
 iblIrradiance*=skyScale;
 #if defined( RE_IndirectSpecular )
 radiance*=skyScale;
 clearcoatRadiance*=skyScale;
 #endif
}
{
 // One bounce of sunlight from sunlit interior surfaces (bounce.ts). Not scaled by sky access.
 vec3 bN=inverseTransformDirection(normal,viewMatrix);
 vec3 bP=vSkyWorld+bN*0.12;
 vec3 bG=clamp((bP-uBounceMin)/(uBounceMax-uBounceMin),0.0,1.0);
 vec3 bUvw=(bG*(uBounceDims-1.0)+0.5)/uBounceDims;
 vec3 bLight=mix(texture(uBounceLightPrev,bUvw).rgb,texture(uBounceLight,bUvw).rgb,uBounceMix);
 vec4 bDir=mix(texture(uBounceDirPrev,bUvw),texture(uBounceDir,bUvw),uBounceMix);
 float bLen=length(bDir.xyz);
 vec3 bTo=bLen>1e-4?bDir.xyz/bLen:vec3(0.0,1.0,0.0);
 float bFacing=mix(0.5,max(dot(bN,bTo),0.0),clamp(bDir.w,0.0,1.0));
 float bInside=1.0-smoothstep(0.0,0.3,length(max(max(uBounceMin-bP,bP-uBounceMax),0.0)));
 irradiance+=bLight*bFacing*bInside*uBounceEnabled;
}
#endif
`;
const skyVertex=`
{
 vec4 skyWorld=vec4(transformed,1.0);
 #ifdef USE_BATCHING
 skyWorld=batchingMatrix*skyWorld;
 #endif
 #ifdef USE_INSTANCING
 skyWorld=instanceMatrix*skyWorld;
 #endif
 vSkyWorld=(modelMatrix*skyWorld).xyz;
}
`;
/** Shared by every patched material: the sun shadow camera's width and depth range.
 * The scene widens the camera outdoors, so these are updated, not baked in. */
export const solarShadowUniforms={uSolarWorldSpan:{value:11},uSolarDepthSpan:{value:59.5},uSolarMinTexels:{value:1}};
/** Section view: solids cut by the section plane show their inside (back faces) through the cut;
 * materials marked SECTION_POCHE paint those back faces in one flat dark tone, as a drawing's
 * solid fill. Inactive (0) everywhere else. */
/** Colour of light after several bounces off the warm white plaster: albedo (0.86, 0.82, 0.75)
 * squared and normalised to luminance 1. */
export const interiorUniforms={uInterreflect:{value:new THREE.Vector3(1.09,1.0,.83)}};
export const sectionUniforms={uSectionActive:{value:0},uPocheColor:{value:new THREE.Color('#1d1b1a')}};
const pocheFragment=`
#if defined( SECTION_POCHE ) && defined( DOUBLE_SIDED )
if(uSectionActive>0.5&&!gl_FrontFacing)gl_FragColor=vec4(uPocheColor,1.0);
#endif
`;
const applied=new WeakSet<THREE.Material>();
export function applySolarShadows(material:THREE.Material){
 if(applied.has(material)||!(material instanceof THREE.MeshStandardMaterial))return;
 applied.add(material);
 material.onBeforeCompile=shader=>{
  // Must match the sun's orthographic shadow camera in temple.ts.
  shader.uniforms.uSolarWorldSpan=solarShadowUniforms.uSolarWorldSpan;
  shader.uniforms.uSolarDepthSpan=solarShadowUniforms.uSolarDepthSpan;shader.uniforms.uSolarMinTexels=solarShadowUniforms.uSolarMinTexels;
  Object.assign(shader.uniforms,skyUniforms,bounceUniforms,sectionUniforms,roofUniforms,interiorUniforms);
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vSkyWorld;').replace('#include <project_vertex>','#include <project_vertex>'+skyVertex);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>'+skyParsFragment+'\nuniform float uSectionActive;\nuniform vec3 uPocheColor;').replace('#include <lights_fragment_end>',skyApplyFragment+'#include <lights_fragment_end>').replace('#include <dithering_fragment>','#include <dithering_fragment>'+pocheFragment);
  shader.fragmentShader=shader.fragmentShader.replace('#include <shadowmap_pars_fragment>',THREE.ShaderChunk.shadowmap_pars_fragment+roofGLSL(true)+sunShadowGLSL);
  // Directional light: our shadow function, then the glazing's colour for light that came through it.
  shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',THREE.ShaderChunk.lights_fragment_begin.replace('getShadow( directionalShadowMap','solarShadow( directionalShadowMap').replace('vDirectionalShadowCoord[ i ] ) : 1.0;','vDirectionalShadowCoord[ i ] ) : 1.0;\n\t\tdirectLight.color *= roofTint( vSkyWorld );'));
  // Optional material-specific additions (e.g. the jade relief) run after the shared patch.
  (material.userData.afterSolarCompile as ((s:{uniforms:Record<string,THREE.IUniform>;vertexShader:string;fragmentShader:string})=>void)|undefined)?.(shader);
 };
 material.customProgramCacheKey=()=> 'finite-sun-shadow-v3-visibility-filter+sky-field-v2+bounce-v1+edge-fade+poche-v1+roof-glazing-v2+interreflect-v1+side-glass-v1+bounce-fade-v1'+(material.userData.cacheKey??'');
 material.needsUpdate=true;
}

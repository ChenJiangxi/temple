import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Water } from 'three/addons/objects/Water.js';

/** Site context in the language of a fine architectural model: branching model trees in one
 * quiet warm grey, so the red building stays the subject. No scale figures. Not the author's
 * site design.
 *
 * Planting stays out of the south: low winter sun from the south-east to south-west would
 * otherwise throw tree shadows onto the sutra wall and block the "full columns in winter" light.
 * Trees stand behind the Buddha (north) and well to the east and west; the forecourt and the
 * approach to the entrance stay open.
 */
const GROUND_Y=-.12;
let seed=23;const rand=()=>(seed=(seed*16807)%2147483647)/2147483647;

/** A tapering branch structure: each limb bends slightly as it grows and splits two or three
 * ways, getting shorter and thinner, with a gentle upward pull. Merged into one geometry. */
function branchTree(treeSeed:number){
 let st=treeSeed*9301+49297;const r=()=>(st=(st*16807)%2147483647)/2147483647;
 const parts:THREE.BufferGeometry[]=[],up=new THREE.Vector3(0,1,0),tips:number[]=[];
 const limb=(a:THREE.Vector3,b:THREE.Vector3,ra:number,rb:number)=>{
  const d=new THREE.Vector3().subVectors(b,a),g=new THREE.CylinderGeometry(rb,ra,d.length(),6,1,true);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up,d.clone().normalize()));
  g.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);g.deleteAttribute('uv');parts.push(g);
 };
 const grow=(start:THREE.Vector3,dir:THREE.Vector3,length:number,radius:number,depth:number)=>{
  let p=start.clone();const d=dir.clone();
  for(let k=0;k<2;k++){
   d.add(new THREE.Vector3((r()-.5)*.3,.06+(r()-.5)*.1,(r()-.5)*.3)).normalize();
   const q=p.clone().addScaledVector(d,length/2),r0=radius*(1-k*.18),r1=radius*(1-(k+1)*.18);
   limb(p,q,r0,r1);p=q;
  }
  if(depth===0){tips.push(p.x,p.y,p.z);return}
  if(depth<=1)tips.push(p.x,p.y,p.z);
  const n=r()<.45?3:2,side=new THREE.Vector3(1,0,0).cross(d).normalize();
  if(side.lengthSq()<1e-6)side.set(0,0,1);
  const turn=r()*Math.PI*2;
  for(let i=0;i<n;i++){
   const axis=side.clone().applyAxisAngle(d,turn+i*Math.PI*2/n);
   const child=d.clone().applyAxisAngle(axis,(22+r()*26)*Math.PI/180);child.y+=.12;child.normalize();
   grow(p,child,length*(.66+r()*.14),radius*.64,depth-1);
  }
 };
 grow(new THREE.Vector3(0,0,0),new THREE.Vector3(0,1,0),2.1+r()*.6,.12,5);
 const merged=mergeGeometries(parts)!;merged.computeVertexNormals();parts.forEach(g=>g.dispose());
 return {geometry:merged,tips};
}

/** Tileable ripple normal map: a few integer-frequency waves, so the tile repeats seamlessly. */
function rippleNormals(){
 const size=256,h=new Float32Array(size*size);
 // Fine, irregular ripples (wavelengths of roughly 13-35 cm across a ~3 m tile): calm still water.
 const waves=[[9,3,.5,0],[4,11,.45,1.3],[13,-6,.35,2.1],[-7,15,.3,.7],[17,8,.22,4.2],[-14,12,.2,3.3],[21,-5,.15,1.1],[6,23,.12,2.6]];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){let v=0;for(const [kx,ky,a,ph] of waves)v+=a*Math.sin(2*Math.PI*(kx*x+ky*y)/size+ph);h[y*size+x]=v}
 const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d')!,img=ctx.createImageData(size,size);
 const at=(x:number,y:number)=>h[((y+size)%size)*size+((x+size)%size)];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=(at(x-1,y)-at(x+1,y))*.6,dy=(at(x,y-1)-at(x,y+1))*.6,l=Math.hypot(dx,dy,1),p=(y*size+x)*4;
  img.data[p]=(dx/l*.5+.5)*255;img.data[p+1]=(dy/l*.5+.5)*255;img.data[p+2]=(1/l*.5+.5)*255;img.data[p+3]=255;
 }
 ctx.putImageData(img,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}

/** Incense burner after the Song "lian" censer (奁式炉): a low straight-walled bronze cylinder,
 * wider than tall, with raised bowstring bands (two below the lip, one above the foot), three
 * short feet set flush under the wall (two in front, one behind) and a flat rim worn bright by
 * hands. Filled with ash: burning sticks in bunches of three, many burnt-out red stubs, thin
 * smoke. It stands on one honed stone block whose recessed foot leaves a shadow line.
 * Dimensions in metres; the rim is at about 1.0 m, a comfortable height for placing incense. */
function incenseBurner(patch:(m:THREE.Material)=>void){
 const g=new THREE.Group();g.name='incense-burner';
 let st=41;const r=()=>(st=(st*16807)%2147483647)/2147483647;
 const bronze=new THREE.MeshStandardMaterial({color:'#4b3a2e',metalness:.62,roughness:.44,vertexColors:true});
 const stoneM=new THREE.MeshStandardMaterial({color:'#a39d93',roughness:.74});
 const ashM=new THREE.MeshStandardMaterial({color:'#c4beb4',roughness:1,vertexColors:true});
 const stemM=new THREE.MeshStandardMaterial({color:'#8e2b22',roughness:.7});
 const pasteM=new THREE.MeshStandardMaterial({color:'#5b4535',roughness:.95});
 const charM=new THREE.MeshStandardMaterial({color:'#9c968d',roughness:1});
 const burntM=new THREE.MeshStandardMaterial({color:'#2b2420',roughness:1});
 const emberM=new THREE.MeshStandardMaterial({color:'#2a1d16',emissive:'#ff3c0a',emissiveIntensity:1.8,roughness:1});
 for(const m of [bronze,stoneM,ashM,stemM,pasteM,charM,burntM,emberM])patch(m);
 const add=(mesh:THREE.Mesh,x:number,y:number,z:number)=>{mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);return mesh};
 // Pedestal: one block, its foot recessed 4 cm all round so it reads as resting, not sunk.
 const P=1.4,PH=.42,reveal=.05;
 add(new THREE.Mesh(new THREE.BoxGeometry(P-.08,reveal,P-.08),stoneM),0,reveal/2,0);
 add(new THREE.Mesh(new THREE.BoxGeometry(P,PH-reveal,P),stoneM),0,reveal+(PH-reveal)/2,0);
 const R=.55,H=.5,T=.032,feetH=.09,y0=PH+feetH,ashY=H-.05;
 // Body profile (radius, height), counter-clockwise: underside, eased bottom edge, wall with
 // bands, flat lip, inner wall down to the ash. Extra wall points carry the patina colours.
 const band=(y:number)=>[[R,y-.01],[R+.004,y-.007],[R+.007,y-.003],[R+.007,y+.003],[R+.004,y+.007],[R,y+.01]];
 const wall=(a:number,b:number)=>{const o:number[][]=[];for(let y=a+.02;y<b-.01;y+=.02)o.push([R,y]);return o};
 const profile=[[0,.004],[R-.03,.004],[R-.01,.004],[R-.003,.008],[R,.016],...wall(.016,.06),...band(.07),...wall(.08,.39),...band(.405),...band(.44),...wall(.45,H-.01),
  [R,H-.008],[R-.002,H-.002],[R-.007,H],[R-T+.006,H],[R-T+.001,H-.003],[R-T,H-.01],[R-T,ashY-.02],[0,ashY-.02]].map(([x,y])=>new THREE.Vector2(x,y));
 const bodyGeometry=new THREE.LatheGeometry(profile,128);
 // Patina: low-frequency mottling of a dark chestnut bronze, darker toward the foot and soot-dark
 // inside; the flat rim polished to warm metal where hands rest.
 {const pos=bodyGeometry.attributes.position,col=new Float32Array(pos.count*3);
  for(let i=0;i<pos.count;i++){
   const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),a=Math.atan2(z,x),rr=Math.hypot(x,z);
   let k=1+.07*Math.sin(a*5+y*19)+.05*Math.sin(a*13-y*37+1.7)+.03*Math.sin(a*29+y*61);
   k*=.82+.18*Math.min(1,y/.25);
   let cr=k,cg=k,cb=k;
   if(y>H-.0015&&rr<R-.004&&rr>R-T+.004){cr=1.7;cg=1.45;cb=1.1}
   else if(rr<R-T+.002&&y<H-.004){cr=cg=cb=.45}
   col[i*3]=cr;col[i*3+1]=cg;col[i*3+2]=cb;
  }
  bodyGeometry.setAttribute('color',new THREE.BufferAttribute(col,3));}
 add(new THREE.Mesh(bodyGeometry,bronze),0,y0,0).castShadow=false;
 // The body's shadow comes from plain stand-ins just inside its surface (invisible in the image):
 // the 7 mm bands would otherwise shadow the wall below them with a stair-stepped smudge finer
 // than one shadow-map texel. A plain cylinder, plus a thin open ring for the lip that shades the ash.
 // Bronze-dark, because the bounce-light pass reads stand-ins' colour as what they reflect.
 const proxyMaterial=new THREE.MeshBasicMaterial({color:'#3a2c22',colorWrite:false,depthWrite:false,side:THREE.DoubleSide});
 const proxy=(geo:THREE.BufferGeometry,y:number)=>{const o=new THREE.Mesh(geo,proxyMaterial);o.position.y=y;o.castShadow=true;o.renderOrder=-1;g.add(o)};
 proxy(new THREE.CylinderGeometry(R-.012,R-.012,ashY-.03,48),y0+(ashY-.03)/2);
 proxy(new THREE.CylinderGeometry(R-.012,R-.012,H-ashY+.02,48,1,true),y0+(ashY+H-.03)/2);
 // Feet: short, slightly swelling hooves under the wall line.
 const footProfile=[[0,0],[.04,0],[.046,.003],[.049,.01],[.052,.035],[.058,.065],[.064,feetH+.006],[0,feetH+.006]].map(([x,y])=>new THREE.Vector2(x,y));
 const footGeometry=new THREE.LatheGeometry(footProfile,32);
 footGeometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(footGeometry.attributes.position.count*3).fill(.8),3));
 for(const a of [Math.PI/3,-Math.PI/3,Math.PI])add(new THREE.Mesh(footGeometry,bronze),Math.sin(a)*(R-.067),PH,Math.cos(a)*(R-.067));
 // Ash: a shallow mound with small irregularities, a little darker around the burning bunches.
 const inner=R-T,ashGeometry=new THREE.RingGeometry(.0001,inner,96,14);
 const bunches:number[][]=[];
 while(bunches.length<7){const a=r()*Math.PI*2,d=Math.sqrt(r())*(inner-.1);const x=Math.cos(a)*d,z=Math.sin(a)*d;if(bunches.every(([bx,bz])=>Math.hypot(bx-x,bz-z)>.12))bunches.push([x,z])}
 const ashHeight=(x:number,z:number)=>{const d=Math.hypot(x,z)/inner;return .016*(1-d*d)+.003*Math.sin(x*41+z*13)*Math.sin(z*37-x*7)};
 {const pos=ashGeometry.attributes.position,col=new Float32Array(pos.count*3);
  for(let i=0;i<pos.count;i++){
   const x=pos.getX(i),z=-pos.getY(i);pos.setZ(i,ashHeight(x,z));
   let k=.94+.06*Math.sin(x*23+z*31)*Math.sin(z*17-x*11);
   for(const [bx,bz] of bunches)k-=.16*Math.exp(-((x-bx)**2+(z-bz)**2)/.004);
   col[i*3]=k;col[i*3+1]=k*.99;col[i*3+2]=k*.97;
  }
  ashGeometry.setAttribute('color',new THREE.BufferAttribute(col,3));ashGeometry.computeVertexNormals();}
 const ashMesh=add(new THREE.Mesh(ashGeometry,ashM),0,y0+ashY,0);ashMesh.rotation.x=-Math.PI/2;
 // Sticks: a red bamboo stem, the brown incense paste above it, a short grey ash tip and a glowing
 // ember. Burning sticks stand in bunches of three; spent stubs are scattered all over.
 const parts:Record<'stem'|'paste'|'char'|'burnt'|'ember',THREE.BufferGeometry[]>={stem:[],paste:[],char:[],burnt:[],ember:[]};
 const up=new THREE.Vector3(0,1,0),q=new THREE.Quaternion(),m4=new THREE.Matrix4(),one=new THREE.Vector3(1,1,1);
 const segment=(list:THREE.BufferGeometry[],radius:number,from:THREE.Vector3,dir:THREE.Vector3,a:number,b:number)=>{
  const geo=new THREE.CylinderGeometry(radius,radius,b-a,6,1);q.setFromUnitVectors(up,dir);
  m4.compose(from.clone().addScaledVector(dir,(a+b)/2),q,one);geo.applyMatrix4(m4);list.push(geo);
 };
 const tips:THREE.Vector3[]=[];
 for(const [bx,bz] of bunches){
  const lean=new THREE.Vector3((r()-.5)*.16,1,(r()-.5)*.16).normalize(),burnt=r();
  for(let k=0;k<3;k++){
   const a=k*2.1+r(),x=bx+Math.cos(a)*.007,z=bz+Math.sin(a)*.007,foot=new THREE.Vector3(x,ashY+ashHeight(x,z)-.03,z);
   const dir=lean.clone().add(new THREE.Vector3((r()-.5)*.03,0,(r()-.5)*.03)).normalize();
   const stem=.13,top=stem+.04+(1-burnt)*.17+(r()-.5)*.012;
   segment(parts.stem,.0013,foot,dir,0,stem);segment(parts.paste,.0024,foot,dir,stem,top);
   segment(parts.char,.0021,foot,dir,top,top+.009);segment(parts.ember,.0018,foot,dir,top+.009,top+.013);
   if(k===0)tips.push(foot.clone().addScaledVector(dir,top+.013));
  }
 }
 // Spent bunches: three short red stems with charred ends, mostly upright; a few loose strays.
 const stub=(x:number,z:number,dir:THREE.Vector3,len:number)=>{const foot=new THREE.Vector3(x,ashY+ashHeight(x,z)-.02,z);
  segment(parts.stem,.0014,foot,dir,0,len);segment(parts.burnt,.0017,foot,dir,len,len+.006)};
 for(let n=0;n<16;n++){
  const a=r()*Math.PI*2,d=Math.sqrt(r())*(inner-.05),bx=Math.cos(a)*d,bz=Math.sin(a)*d;
  if(bunches.some(([x,z])=>Math.hypot(x-bx,z-bz)<.05))continue;
  const lean=new THREE.Vector3((r()-.5)*.25,1,(r()-.5)*.25).normalize(),len=.03+r()*.05;
  for(let k=0;k<3;k++){const b=k*2.1+r();stub(bx+Math.cos(b)*.007,bz+Math.sin(b)*.007,lean,len+(r()-.5)*.012)}
 }
 for(let n=0;n<10;n++){const a=r()*Math.PI*2,d=Math.sqrt(r())*(inner-.04);stub(Math.cos(a)*d,Math.sin(a)*d,new THREE.Vector3((r()-.5)*.6,1,(r()-.5)*.6).normalize(),.015+r()*.04)}
 const sticks=new THREE.Group();sticks.position.y=y0;g.add(sticks);
 for(const [key,mat] of [['stem',stemM],['paste',pasteM],['char',charM],['burnt',burntM],['ember',emberM]] as const){
  const mesh=new THREE.Mesh(mergeGeometries(parts[key]),mat);mesh.castShadow=key!=='ember';mesh.receiveShadow=true;sticks.add(mesh);
 }
 // Smoke: a thin laminar thread for the first few centimetres, then slow sway and break-up into
 // wisps that thin out by about 70 cm. Camera-facing ribbons, unlit; brightness follows the sun.
 const smokeMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
  uniforms:{uTime:{value:0},uColor:{value:new THREE.Color(.8,.8,.82)}},
  vertexShader:`uniform float uTime;attribute float seed;varying vec2 vUv;varying float vSeed;
  void main(){vUv=uv;vSeed=seed;float h=uv.y,s=smoothstep(.18,.75,h);
   vec3 c=vec3(0.,h*.8,0.);
   // Straight thread first, then slow irregular sway (incommensurate waves) and a light drift.
   c.x+=s*(.026*sin(h*7.3-uTime*.55+seed)+.014*sin(h*17.9-uTime*1.13+seed*2.1)+.007*sin(h*31.-uTime*1.9+seed*3.7))+h*h*.05*sin(uTime*.07+seed);
   c.z+=s*(.022*cos(h*5.9-uTime*.47+seed*1.3)+.01*sin(h*13.7-uTime*.9+seed*.7));
   vec4 mv=modelViewMatrix*vec4(position.xyz+c,1.);mv.x+=(uv.x-.5)*mix(.0025,.075,smoothstep(.12,1.,h));
   gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`uniform float uTime;uniform vec3 uColor;varying vec2 vUv;varying float vSeed;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
  void main(){float h=vUv.y,x=(vUv.x-.5)*2.;
   float core=exp(-pow(x*mix(2.6,1.4,h),2.));
   float n=noise(vec2(vUv.x*3.+vSeed,h*6.-uTime*.32))*.6+noise(vec2(vUv.x*8.-vSeed,h*14.-uTime*.6))*.4;
   float wisp=mix(1.,smoothstep(.42,.78,n),smoothstep(.2,.6,h));
   // Opacity falls as the thread widens, so the smoke spreads out rather than thickening.
   float a=core*wisp*smoothstep(0.,.02,h)*(1.-smoothstep(.3,.95,h))*mix(.42,.1,smoothstep(0.,.6,h));
   gl_FragColor=vec4(uColor*vec3(.93,.95,1.),a);}`});
 const smoke=new THREE.Group();
 tips.slice(0,5).forEach((tip,i)=>{
  const geo=new THREE.PlaneGeometry(1,1,1,48);const pos=geo.attributes.position;for(let k=0;k<pos.count;k++){pos.setX(k,0);pos.setY(k,0)}
  geo.setAttribute('seed',new THREE.Float32BufferAttribute(new Array(pos.count).fill(i*2.7+.4),1));
  const ribbon=new THREE.Mesh(geo,smokeMaterial);ribbon.position.copy(tip).setY(tip.y+y0);ribbon.frustumCulled=false;ribbon.renderOrder=5;smoke.add(ribbon);
 });
 g.add(smoke);
 const tick=(dt:number,sun:THREE.Color)=>{smokeMaterial.uniforms.uTime.value+=dt;(smokeMaterial.uniforms.uColor.value as THREE.Color).copy(sun).multiplyScalar(.75).addScalar(.32)};
 return {group:g,tick};
}

/** Timber ceiling boards, 10 cm wide, running along the corridor: warm tone variation, faint
 * grain and dark joints. One tile = 1.2 m across the boards by 2.4 m along them. */
function ceilingBoards(){
 const w=384,h=256,c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d')!;
 let st=53;const r=()=>(st=(st*16807)%2147483647)/2147483647;
 const bw=w/12;
 for(let i=0;i<12;i++){const t=r()*16-8;ctx.fillStyle=`rgb(${150+t|0},${118+t*.9|0},${86+t*.8|0})`;ctx.fillRect(i*bw,0,bw,h);
  for(let n=0;n<6;n++){ctx.fillStyle=`rgba(80,52,30,${.04+r()*.05})`;ctx.fillRect(i*bw+r()*bw,0,1+r()*2,h)}}
 ctx.fillStyle='rgba(40,28,18,.55)';for(let i=0;i<=12;i++)ctx.fillRect(i*bw-1,0,2,h);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;
}

/** Dark basalt slabs, 0.6 m square, honed, with fine joints and slight tone variation; tile = 1.2 m. */
function basaltSlabs(){
 const size=256,c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d')!;
 let st=29;const r=()=>(st=(st*16807)%2147483647)/2147483647;
 for(let j=0;j<2;j++)for(let i=0;i<2;i++){const t=52+r()*10|0;ctx.fillStyle=`rgb(${t},${t+3},${t+3})`;ctx.fillRect(i*128,j*128,128,128)}
 for(let n=0;n<5000;n++){const v=r()*20-10;ctx.fillStyle=v>0?`rgba(255,255,255,${v/240})`:`rgba(0,0,0,${-v/240})`;ctx.fillRect(r()*size,r()*size,2,2)}
 ctx.fillStyle='#1d201f';for(let k=0;k<=2;k++){ctx.fillRect(k*128-1,0,2,size);ctx.fillRect(0,k*128-1,size,2)}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;
}

/** Running-bond stone slabs, 0.6 x 1.2 m, with joints and slight tone variation; tile = 2.4 m. */
function slabPaving(){
 const size=512,c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d')!;
 let st=17;const r=()=>(st=(st*16807)%2147483647)/2147483647;
 const col=size/4,row=size/2;
 for(let j=0;j<2;j++)for(let i=-1;i<5;i++){
  const x=i*col+(j%2?col/2:0),t=208+r()*12|0;ctx.fillStyle=`rgb(${t},${t-2},${t-6})`;ctx.fillRect(x,j*row,col,row);
 }
 for(let n=0;n<16000;n++){const x=r()*size,y=r()*size,v=r()*30-15;ctx.fillStyle=v>0?`rgba(255,255,255,${v/300})`:`rgba(0,0,0,${-v/300})`;ctx.fillRect(x,y,2,2)}
 ctx.fillStyle='#a9a49b';
 for(let j=0;j<=2;j++)ctx.fillRect(0,j*row-1,size,2);
 for(let j=0;j<2;j++)for(let i=-1;i<6;i++)ctx.fillRect(i*col+(j%2?col/2:0)-1,j*row,2,row);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;
}

/** Raked gravel: fine parallel grooves (about 4 cm apart) with a matching normal map. */
function rakedGravel(){
 const size=256,period=6;
 const albedo=document.createElement('canvas');albedo.width=albedo.height=size;const ctx=albedo.getContext('2d')!;
 const img=ctx.createImageData(size,size),nimg=ctx.createImageData(size,size);
 let st=31;const r=()=>(st=(st*16807)%2147483647)/2147483647;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const phase=Math.sin(2*Math.PI*y/period),grain=(r()-.5)*14;
  const v=214+phase*7+grain,p=(y*size+x)*4;
  img.data[p]=v;img.data[p+1]=v-1;img.data[p+2]=v-4;img.data[p+3]=255;
  const ny=Math.cos(2*Math.PI*y/period)*.45,l=Math.hypot(ny,1);
  nimg.data[p]=128;nimg.data[p+1]=(ny/l*.5+.5)*255;nimg.data[p+2]=(1/l*.5+.5)*255;nimg.data[p+3]=255;
 }
 ctx.putImageData(img,0,0);
 const normal=document.createElement('canvas');normal.width=normal.height=size;normal.getContext('2d')!.putImageData(nimg,0,0);
 const map=new THREE.CanvasTexture(albedo);map.colorSpace=THREE.SRGBColorSpace;
 const normalMap=new THREE.CanvasTexture(normal);
 for(const t of [map,normalMap]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8}
 return {map,normalMap};
}

export function createSite(patch:(m:THREE.Material)=>void){
 const group=new THREE.Group();group.name='site-model';
 // A walled temple court (30 x 36 m): white walls with dark coping, a stone axial path from the
 // south gate to the plinth, twin still pools either side of it, raked gravel elsewhere.
 // Walls and pools are far enough out that low winter sun still reaches the sutra wall.
 const C={x:15,north:-14,south:22,gate:2.5,wall:3.2};
 // Gravel texture coordinates are in metres (the court is a shape with the pools cut out).
 const raked=rakedGravel();raked.map.repeat.set(17/30,21/36);raked.normalMap.repeat.set(17/30,21/36);
 const gravel=new THREE.MeshStandardMaterial({map:raked.map,normalMap:raked.normalMap,normalScale:new THREE.Vector2(.5,.5),roughness:.95});patch(gravel);
 const paving=new THREE.MeshStandardMaterial({color:'#dcd8d0',roughness:.85});patch(paving);
 const plaster=new THREE.MeshStandardMaterial({color:'#e9e5dc',roughness:.92});patch(plaster);
 const coping=new THREE.MeshStandardMaterial({color:'#4b4844',roughness:.8});patch(coping);
 const flat=(w:number,d:number,x:number,z:number,y:number,m:THREE.Material)=>{const o=new THREE.Mesh(new THREE.PlaneGeometry(w,d),m);o.rotation.x=-Math.PI/2;o.position.set(x,GROUND_Y+y,z);o.receiveShadow=true;group.add(o);return o};
 const block=(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,GROUND_Y+y,z);o.castShadow=o.receiveShadow=true;group.add(o);return o};
 {
  const court=new THREE.Shape();court.moveTo(-C.x,-C.south);court.lineTo(C.x,-C.south);court.lineTo(C.x,-C.north);court.lineTo(-C.x,-C.north);court.closePath();
  for(const s of [-1,1]){const h=new THREE.Path();h.moveTo(s*3.6-2,-16);h.lineTo(s*3.6+2,-16);h.lineTo(s*3.6+2,-7);h.lineTo(s*3.6-2,-7);h.closePath();court.holes.push(h)}
  const o=new THREE.Mesh(new THREE.ShapeGeometry(court),gravel);o.rotation.x=-Math.PI/2;o.position.y=GROUND_Y+.004;o.receiveShadow=true;group.add(o);
 }
 // Stone paving in running bond (0.6 x 1.2 m slabs) - band around the plinth, a forecourt before
 // the hall and the axial path between the pools; separate areas, never overlapping.
 const slabs=slabPaving();
 const paved=(w:number,d:number,x:number,z:number)=>{const t=slabs.clone();t.repeat.set(w/2.4,d/2.4);t.needsUpdate=true;const m=new THREE.MeshStandardMaterial({map:t,roughness:.86});patch(m);return flat(w,d,x,z,.007,m)};
 paved(9.1,9.1,0,0);
 paved(15,2.45,0,5.775);
 paved(2.4,C.south-7,0,(C.south+7)/2);
 // Corridors (cloisters) along the east and west walls: a thin dark roof with a warm timber board
 // ceiling, carried by a continuous beam on slender dark posts every 3 m; posts on stone bases.
 // The roof overhangs the post line by 0.45 m so the walk sits in a deep shadow band.
 const timber=new THREE.MeshStandardMaterial({color:'#3e342c',roughness:.75});patch(timber);
 const stone=new THREE.MeshStandardMaterial({color:'#cfcac0',roughness:.9});patch(stone);
 const boards=ceilingBoards();
 for(const side of [-1,1]){
  const len=C.south-C.north-1.4,mid=(C.south+C.north)/2,post=side*(C.x-2.55);
  paved(2.4,len,side*(C.x-1.4),mid);
  block(3.0,.1,len+.4,side*(C.x-1.5),3.01,mid,coping);
  const t=boards.clone();t.repeat.set(2.9/1.2,(len+.3)/2.4);t.needsUpdate=true;
  const ceiling=new THREE.MeshStandardMaterial({map:t,roughness:.8});patch(ceiling);block(2.9,.03,len+.3,side*(C.x-1.5),2.945,mid,ceiling);
  block(.16,.2,len+.2,post,2.83,mid,timber);
  for(let z=C.north+1.6;z<=C.south-1.4;z+=3){block(.3,.14,.3,post,.07,z,stone);block(.15,2.6,.15,post,1.43,z,timber)}
  // Benches: a thin stone slab on two blocks, not a solid box.
  for(const z of [-5,4,13]){block(.44,.07,1.9,side*(C.x-.9),.425,z,stone);for(const dz of [-.7,.7])block(.38,.39,.12,side*(C.x-.9),.195,z+dz,stone)}
 }
 // Gate: two wall piers and a stone threshold, open to the sky (author: no canopy over the gate).
 for(const side of [-1,1])block(.84,3.8,.9,side*(C.gate+.38),1.9,C.south,plaster);
 block(C.gate*2,.08,.6,0,.04,C.south,stone);
 // Incense burner on the axis before the hall (see incenseBurner).
 const burner=incenseBurner(patch);burner.group.position.set(0,GROUND_Y,5.9);group.add(burner.group);
 // Tree pits: stone-edged squares with moss, for the two ginkgo.
 const moss=new THREE.MeshStandardMaterial({color:'#56623f',roughness:1});patch(moss);
 for(const x of [-9.5,9.5]){
  const z=-8.5;
  for(const [w,d,dx,dz] of [[2.6,.14,0,-1.23],[2.6,.14,0,1.23],[.14,2.32,-1.23,0],[.14,2.32,1.23,0]] as number[][])block(w,.12,d,x+dx,.06,z+dz,stone);
  flat(2.32,2.32,x,z,.03,moss);
 }
 const wall=(w:number,d:number,x:number,z:number)=>{block(w,C.wall,d,x,C.wall/2,z,plaster);block(w+(d>w?.16:0),.1,d+(w>d?.16:0),x,C.wall+.05,z,coping)};
 wall(C.x*2+.4,.4,0,C.north);
 for(const side of [-1,1]){wall(.4,C.south-C.north,side*C.x,(C.south+C.north)/2);const len=C.x-C.gate;wall(len,.4,side*(C.gate+len/2),C.south)}
 // Twin still pools with a stone rim. Design: dark basalt bottom about 0.35 m down, so the water
 // reads as a still dark mirror (steep views see the dark stone through clear water, grazing views
 // the reflection); with a uniformly dark bottom, refraction of the floor has nothing to show. High tier: a water shader with Fresnel (dark when seen from
 // above, mirror-like at grazing angles), slow fine ripples that move the reflection, and sun glints.
 // Lower tiers: dark water that reflects the sky with the same ripples.
 const ripples=rippleNormals();
 const still=new THREE.MeshPhysicalMaterial({color:'#18211f',roughness:.06,metalness:0,clearcoat:1,clearcoatRoughness:.04,normalMap:ripples.clone(),normalScale:new THREE.Vector2(.12,.12)});
 (still.normalMap as THREE.Texture).repeat.set(2,4.5);
 (still as THREE.MeshPhysicalMaterial).transparent=true;(still as THREE.MeshPhysicalMaterial).opacity=.72;
 const pools:{mirror:Water;plain:THREE.Mesh}[]=[];
 // The basins: 0.35 m of water over dark basalt slabs (0.6 m), with basalt walls. Seen from above,
 // the water is clear enough to show them, which is what makes it read as water and not a dark slab.
 const basalt=basaltSlabs();
 for(const side of [-1,1]){
  const cx=side*3.6,cz=11.5,w=4,d=9;
  for(const [rw,rd,rx,rz] of [[w+.5,.25,cx,cz-d/2-.125],[w+.5,.25,cx,cz+d/2+.125],[.25,d,cx-w/2-.125,cz],[.25,d,cx+w/2+.125,cz]] as number[][])block(rw,.06,rd,rx,.03,rz,paving);
  const depth=.37,basin=(gw:number,gh:number,rx:number,ry:number)=>{const t=basalt.clone();t.repeat.set(gw/1.2,gh/1.2);t.needsUpdate=true;const m=new THREE.MeshStandardMaterial({map:t,roughness:.75});patch(m);const o=new THREE.Mesh(new THREE.PlaneGeometry(gw,gh),m);o.rotation.set(rx,ry,0);o.receiveShadow=true;group.add(o);return o};
  basin(w,d,-Math.PI/2,0).position.set(cx,GROUND_Y+.02-depth,cz);
  basin(w,depth,0,0).position.set(cx,GROUND_Y+.02-depth/2,cz-d/2);
  basin(w,depth,0,Math.PI).position.set(cx,GROUND_Y+.02-depth/2,cz+d/2);
  basin(d,depth,0,Math.PI/2).position.set(cx-w/2,GROUND_Y+.02-depth/2,cz);
  basin(d,depth,0,-Math.PI/2).position.set(cx+w/2,GROUND_Y+.02-depth/2,cz);
  // Still water: a small distortion keeps the reflection of the red facade whole, with only a faint
  // shiver from the fine ripples (a larger one broke it into a marbled pattern).
  const mirror=new Water(new THREE.PlaneGeometry(w,d),{textureWidth:1024,textureHeight:1024,waterNormals:ripples,sunDirection:new THREE.Vector3(0,1,0),sunColor:0xffffff,waterColor:0x21302d,distortionScale:.06,fog:true});
  const wm=mirror.material as THREE.ShaderMaterial;wm.uniforms.size.value=34;
  // Clear water: partly see-through looking down (the basin shows), a mirror toward grazing angles.
  wm.transparent=true;wm.uniforms.alpha.value=.42;
  // Physical water: about 2% reflectance looking straight down (the shader's 0.3 suits a distant
  // sea), and far less light scattered back out of the water body, so the pool reads dark from
  // above and mirror-like only at grazing angles.
  wm.fragmentShader=wm.fragmentShader.replace('float rf0 = 0.3;','float rf0 = 0.02;').replace('( vec3( 0.1 ) + reflectionSample * 0.9','( reflectionSample * 0.9').replace('sunColor * diffuseLight * 0.3','sunColor * diffuseLight * 0.025').replace('gl_FragColor = vec4( outgoingLight, alpha );','gl_FragColor = vec4( outgoingLight, mix( alpha, 1.0, reflectance ) );')
   // Fine ripples cannot be resolved from far away (axonometric views): fade them out with
   // distance instead of letting them alias into a regular pattern.
   .replace('vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );','vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );\nsurfaceNormal = normalize( mix( surfaceNormal, vec3( 0.0, 1.0, 0.0 ), clamp( ( length( eye - worldPosition.xyz ) - 25.0 ) / 40.0, 0.0, 0.95 ) ) );');
  mirror.rotation.x=-Math.PI/2;mirror.position.set(cx,GROUND_Y+.02,cz);group.add(mirror);
  const plain=new THREE.Mesh(new THREE.PlaneGeometry(w,d),still);plain.rotation.x=-Math.PI/2;plain.position.set(cx,GROUND_Y+.02,cz);plain.receiveShadow=true;group.add(plain);
  pools.push({mirror,plain});
 }
 /** Per frame: ripple time and the sun, so glints and colour follow the computed sun. */
 const tick=(dt:number,toSun:THREE.Vector3,sun:THREE.Color)=>{
  burner.tick(dt,sun);
  for(const p of pools){if(!p.mirror.visible)continue;const u=(p.mirror.material as THREE.ShaderMaterial).uniforms;u.time.value+=dt*.35;u.sunDirection.value.copy(toSun);u.sunColor.value.copy(sun)}
 };
 const setQuality=(level:number)=>{for(const p of pools){p.mirror.visible=level===2;p.plain.visible=level<2}};
 setQuality(2);

 // Trees in the manner of fine architectural model trees: branching stems only, no foliage
 // blobs. A few variants, composed as a grove behind the Buddha and a few trees to the sides.
 const variants=[branchTree(3),branchTree(7),branchTree(11),branchTree(19)];
 const treeMatrices:THREE.Matrix4[][]=variants.map(()=>[]),treeGinkgo:boolean[][]=variants.map(()=>[]);
 const spots:{x:number;z:number;s:number;r:number;ginkgo:boolean}[]=[];
 const take=(x:number,z:number,ginkgo=false,scale=.85+rand()*.4)=>{if(spots.some(p=>Math.hypot(p.x-x,p.z-z)<3.4))return;spots.push({x,z,s:scale,r:rand()*Math.PI*2,ginkgo})};
 // Two ginkgo in the court's northern corners (golden in autumn, as in old Beijing temples).
 take(-9.5,-8.5,true,1.25);take(9.5,-8.5,true,1.2);
 for(let i=0;i<90&&spots.length<30;i++){const x=(rand()-.5)*50,z=-17-rand()*20;take(x,z)}         // grove beyond the north wall
 for(const side of [-1,1])for(let i=0;i<14;i++){const x=side*(17.5+rand()*9),z=-12+rand()*22;take(x,z)} // beyond the east and west walls
 const bark=new THREE.MeshStandardMaterial({color:'#d6d0c4',roughness:.9});patch(bark);
 variants.forEach((g,k)=>{
  const mine=spots.filter((_,i)=>i%variants.length===k);
  const mesh=new THREE.InstancedMesh(g.geometry,bark,mine.length);const pose=new THREE.Object3D();
  mine.forEach((t,i)=>{pose.position.set(t.x,GROUND_Y,t.z);pose.rotation.set(0,t.r,0);pose.scale.setScalar(t.s);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);treeMatrices[k].push(pose.matrix.clone());treeGinkgo[k].push(t.ginkgo)});
  mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
 });
 // Leaves: small double-sided cards clustered around branch tips. Their presence, size and colour
 // follow a Beijing deciduous calendar (see seasonFor); each leaf has its own threshold so trees
 // fill out and turn gradually rather than all at once.
 const leafShape=new THREE.BufferGeometry();
 leafShape.setAttribute('position',new THREE.Float32BufferAttribute([0,-.09,0, .05,0,0, 0,.09,0, -.05,0,0],3));
 leafShape.setIndex([0,1,2,0,2,3]);leafShape.computeVertexNormals();
 const leafMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.75,side:THREE.DoubleSide});patch(leafMaterial);
 const base:number[]=[],thresholds:number[]=[],autumn:THREE.Color[]=[];
 const palette=['#d4a83a','#c8762e','#a9452b','#8f6b3b','#d9b84e'].map(c=>new THREE.Color(c)),gold=new THREE.Color('#e4b52f');
 const m=new THREE.Matrix4(),local=new THREE.Object3D();
 variants.forEach((v,k)=>{
  treeMatrices[k].forEach((tree,ti)=>{const ginkgo=treeGinkgo[k][ti];
   for(let t=0;t<v.tips.length;t+=3){
    for(let n=0;n<12;n++){
     const a=rand()*Math.PI*2,rr=Math.sqrt(rand())*.48;
     local.position.set(v.tips[t]+Math.cos(a)*rr,v.tips[t+1]+(rand()-.35)*.3,v.tips[t+2]+Math.sin(a)*rr);
     local.rotation.set(rand()*Math.PI,rand()*Math.PI,rand()*Math.PI);local.scale.setScalar(1.2+rand()*.9);local.updateMatrix();
     m.multiplyMatrices(tree,local.matrix);base.push(...m.elements);thresholds.push(rand());autumn.push(ginkgo?gold:palette[(rand()*palette.length)|0]);
    }
   }
  });
 });
 const count=thresholds.length,leaves=new THREE.InstancedMesh(leafShape,leafMaterial,count);
 leaves.castShadow=leaves.receiveShadow=true;leaves.frustumCulled=false;group.add(leaves);
 const summer=new THREE.Color('#5f7f4c'),spring=new THREE.Color('#a8c47a'),c=new THREE.Color(),zero=new Float32Array(16);
 const array=leaves.instanceMatrix.array as Float32Array;
 let lastDay=-1;
 const setDay=(day:number)=>{
  if(day===lastDay)return;lastDay=day;
  const s=seasonFor(day);
  for(let i=0;i<count;i++){
   const o=i*16;
   if(thresholds[i]>=s.amount){array.set(zero,o)}
   else{for(let e=0;e<16;e++)array[o+e]=base[o+e];const f=.55+.45*s.amount;for(const e of [0,1,2,4,5,6,8,9,10])array[o+e]*=f}
   c.copy(summer).lerp(spring,s.fresh);
   if(thresholds[i]<s.turn)c.lerp(autumn[i],.85);else c.lerp(autumn[i],s.turn*.25);
   leaves.setColorAt(i,c);
  }
  leaves.instanceMatrix.needsUpdate=true;if(leaves.instanceColor)leaves.instanceColor.needsUpdate=true;
 };
 return {group,setDay,setQuality,tick};
}

/** Beijing deciduous calendar by day of year: leaf-out early April to mid May, colour change from
 * mid September, peak in late October, bare by mid November. Approximate, for presentation. */
export function seasonFor(day:number){
 const ramp=(a:number,b:number,x:number)=>Math.min(1,Math.max(0,(x-a)/(b-a)));
 const amount=ramp(95,135,day)*(1-ramp(292,322,day));
 return {amount,fresh:1-ramp(130,175,day),turn:ramp(258,300,day)};
}

// Infer site latitude / entrance bearing / time from the building geometry alone.
// Two author intents: (1) roof pattern lands complete on the Buddha, best at the equinox;
// (2) sutra glyph light covers nearly the whole column height.
// Units: metres, building frame (+z toward the sutra entrance, y up). Sun vector points to the sun.
import {solarPosition} from '../src/solar';
import {ARCH} from '../src/architecture';
export const deg=Math.PI/180;
// ---------- roof holes (same mapping as temple.ts) ----------
export const holes:number[][][]=JSON.parse(await Bun.file('public/assets/roof-cutouts.json').text());
const inPoly=(x:number,y:number,p:number[][])=>{let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [xi,yi]=p[i],[xj,yj]=p[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c}return c};
export const samples:{x:number;y:number;z:number;hole:number}[]=[];const step=.02;
holes.forEach((p,h)=>{const xs=p.map(q=>q[0]),vs=p.map(q=>q[1]);
 for(let xs0=Math.min(...xs);xs0<=Math.max(...xs);xs0+=step)for(let v=Math.min(...vs);v<=Math.max(...vs);v+=step)if(inPoly(xs0,v,p))
  samples.push({x:-xs0,y:ARCH.roofLow+v/2.6*(6-ARCH.roofLow),z:ARCH.roofBackInner-v/2.6*2.9,hole:h});});
// ---------- relief heightfield (relief.ts / jade-relief-v7.bin) ----------
const buf=await Bun.file('public/assets/jade-relief-v7.bin').arrayBuffer();const dv=new DataView(buf);
const cols=dv.getUint32(0,true),rows=dv.getUint32(4,true),heights=new Float32Array(buf,8);
const R={cx:0,cy:2.95,z0:-2.58,w:4.1,h:4.4,back:-2.58-.18};
const reliefFront=(x:number,y:number)=>{const c=Math.round((x+R.w/2)/R.w*(cols-1)),r=Math.round((R.h/2-(y-R.cy))/R.h*(rows-1));
 if(c<0||r<0||c>=cols||r>=rows)return -Infinity;return R.z0+heights[r*cols+c]};
const inside=1.9; // inner faces of the white side walls (x=±2, 0.2 thick)
const backWall=-2.76,floor=.08,reliefTop=R.cy+R.h/2,reliefBottom=R.cy-R.h/2;
type Hit='buddha'|'wallAbove'|'reliefTop'|'floor'|'sideWall'|'none';
export function trace(s:{x:number;y:number;z:number},sx:number,sy:number,sz:number):Hit{
 // Light travels along -sun. Advance in 1 cm of path length.
 const n=Math.hypot(sx,sy,sz),dx=-sx/n,dy=-sy/n,dz=-sz/n;let x=s.x,y=s.y,z=s.z;
 for(let i=0;i<1400;i++){x+=dx*.01;y+=dy*.01;z+=dz*.01;
  if(Math.abs(x)>inside)return 'sideWall';
  if(y<=floor)return 'floor';
  if(z<=backWall)return y>reliefTop?'wallAbove':'buddha';
  if(Math.abs(x)<=R.w/2&&y<=reliefTop&&y>=reliefBottom&&z<=reliefFront(x,y))return y>reliefTop-.012?'reliefTop':'buddha';
  if(z>3)return 'none';}
 return 'none';
}
export const perHole=holes.map((_,h)=>samples.filter(s=>s.hole===h).length);
export function buddhaStats(P:number,L:number){ // P: profile angle in y-z plane, L: lateral angle in x-z plane, degrees
 const sz=1,sy=Math.tan(P*deg),sx=Math.tan(L*deg);const count:Record<Hit,number>={buddha:0,wallAbove:0,reliefTop:0,floor:0,sideWall:0,none:0};
 const holeBuddha=holes.map(()=>0);
 for(const s of samples){const h=trace(s,sx,sy,sz);count[h]++;if(h==='buddha')holeBuddha[s.hole]++}
 // A hole counts as on the Buddha when at least 95% of its light lands on the carved face.
 // The relief's 18 cm top edge always cuts a thin strip; that is a split, not a loss.
 const N=samples.length;return {onBuddha:count.buddha/N,onWallAbove:count.wallAbove/N,reliefTop:count.reliefTop/N,lost:(count.floor+count.sideWall)/N,floor:count.floor/N,side:count.sideWall/N,holesOnBuddha:holeBuddha.filter((n,h)=>n>=.95*perHole[h]).length};
}
// ---------- sutra -> column coverage (same envelope as analyze-column-light.ts) ----------
const gb=JSON.parse(await Bun.file('reference/column-light-study/glyph-bounds.json').text());
const screen={z:3.025,left:-2.97,right:2.97,top:6};
export const glyphTop=screen.top-gb.top/gb.height*3.6,glyphBottom=screen.top-(gb.bottom+1)/gb.height*3.6;
export const H=ARCH.columnTop-ARCH.upperFloor;
export function columnCover(sx:number,sy:number,sz:number){
 if(sy<=0||sz<=0)return 0;let sum=0;
 for(const c of ARCH.columns){const z=c.z+ARCH.columnRadius,t=(screen.z-z)/sz,screenX=c.x+t*sx;
  if(screenX<screen.left||screenX>screen.right)continue;
  const low=Math.max(ARCH.upperFloor,glyphBottom-t*sy),high=Math.min(ARCH.columnTop,glyphTop-t*sy);sum+=Math.max(0,high-low)/H}
 return sum/ARCH.columns.length;
}

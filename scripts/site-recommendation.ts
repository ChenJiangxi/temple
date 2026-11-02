// Numbers behind reference/site-inference/README.md. Entrance due south per the author's
// own elevation titles (南立面图 = sutra entrance). Run: bun scripts/site-recommendation.ts
import {writeFileSync} from 'node:fs';
import {deg,buddhaStats,columnCover,glyphTop} from './site-geometry';
import {solarPosition} from '../src/solar';
import {ARCH} from '../src/architecture';
const cache=new Map<string,ReturnType<typeof buddhaStats>>();
const q=(v:number)=>Math.round(v*4)/4;
const stats=(P:number,L:number)=>{const k=q(P)+','+q(L);if(!cache.has(k))cache.set(k,buddhaStats(q(P),q(L)));return cache.get(k)!};
const complete=(P:number,L:number)=>{const s=stats(P,L);return s.lost<.001&&s.holesOnBuddha>=11};
// 1. profile window, sun straight in front
const ok:number[]=[];for(let P=30;P<=70;P+=.25)if(complete(P,0))ok.push(P);
const Plow=Math.min(...ok),Phigh=Math.max(...ok),Pmid=(Plow+Phigh)/2;
const lat:number[]=[];for(let L=-15;L<=15;L+=.5)if(complete(Pmid,L))lat.push(L);
const latCentre=90-Pmid;
// 2. site helpers
type Site={name:string;latitude:number;longitude:number;utcOffset:number;entranceBearing:number};
const sites:Site[]=[
 {name:'窗口中心纬度',latitude:+latCentre.toFixed(2),longitude:116.41,utcOffset:8,entranceBearing:180},
 {name:'北京（示例城市）',latitude:39.90,longitude:116.41,utcOffset:8,entranceBearing:180},
 {name:'旧示例 30°N',latitude:30,longitude:120,utcOffset:8,entranceBearing:180},
];
const sun=(s:Site,date:string,h:number)=>solarPosition({date,...s},h);
const frame=(d:number[])=>({P:Math.atan2(d[1],d[2])/deg,L:Math.atan2(d[0],d[2])/deg});
const hm=(h:number)=>`${String(Math.floor(h)).padStart(2,'0')}:${String(Math.round((h%1)*60)).padStart(2,'0')}`.replace(/:60$/,':59');
const dates:string[]=[];for(let t=Date.UTC(2026,0,1);t<Date.UTC(2027,0,1);t+=864e5)dates.push(new Date(t).toISOString().slice(0,10));
function ranges(flags:boolean[]){const out:string[]=[];let start=-1;flags.forEach((f,i)=>{if(f&&start<0)start=i;if((!f||i===flags.length-1)&&start>=0){const end=f?i:i-1;out.push(dates[start].slice(5)+'—'+dates[end].slice(5));start=-1}});return out}
function siteReport(s:Site){
 // solar noon & complete window on the March equinox
 let noon=12,best=-90;for(let h=11;h<=13.5;h+=1/60){const a=sun(s,'2026-03-20',h).altitude;if(a>best){best=a;noon=h}}
 const eq:number[]=[];for(let h=noon-1.5;h<=noon+1.5;h+=1/60){const p=sun(s,'2026-03-20',h);if(p.altitude>0&&p.direction[2]>0){const f=frame(p.direction);if(complete(f.P,f.L))eq.push(h)}}
 const noonFrame=frame(sun(s,'2026-03-20',noon).direction);
 // pattern height on the Buddha at equinox noon: front row and highest row landing heights
 const t=Math.tan(noonFrame.P*deg);
 const frontRowLanding=ARCH.roofLow+.05/2.6*(6-ARCH.roofLow)-(ARCH.roofBackInner-.05/2.6*2.9+2.45)*t;
 // year: complete at solar noon?
 const yearFlags=dates.map(d=>{let n=12,b=-90;for(let h=11;h<=13.5;h+=2/60){const a=sun(s,d,h).altitude;if(a>b){b=a;n=h}}const f=frame(sun(s,d,n).direction);return complete(f.P,f.L)});
 // columns: per day max coverage and >=90% windows
 const col=dates.map(d=>{let max=0,at=0;const win:number[]=[];for(let h=5;h<=19;h+=2/60){const p=sun(s,d,h);if(p.altitude<=0)continue;const c=columnCover(p.direction[0],p.direction[1],p.direction[2]);if(c>max){max=c;at=h}if(c>=.9)win.push(h)}return {d,max,at,win}});
 const eqCol=col.find(c=>c.d==='2026-03-20')!;
 const winterDays=col.filter(c=>c.win.length);
 const sample=['2025-12-21','2026-01-05','2026-01-20','2026-12-06','2026-12-21'].map(d=>col.find(c=>c.d===d)||null).filter(Boolean).map(c=>({date:c!.d,max:+c!.max.toFixed(2),window90:c!.win.length?hm(c!.win[0])+'–'+hm(c!.win[c!.win.length-1]):'-'}));
 return {site:s,equinox:{solarNoon:hm(noon),altitude:+best.toFixed(1),profile:+noonFrame.P.toFixed(1),completeFrom:eq.length?hm(eq[0]):'-',completeTo:eq.length?hm(eq[eq.length-1]):'-',completeMinutes:eq.length,frontRowLandingY:+frontRowLanding.toFixed(2),columnCoverage:+eqCol.max.toFixed(2)},
  completeAtNoonDates:ranges(yearFlags),
  columns90Dates:ranges(col.map(c=>c.win.length>0)),columnSamples:sample,
  columnMaxOfYear:+Math.max(...col.map(c=>c.max)).toFixed(2)};
}
const reports=sites.map(siteReport);
// 3. what near-full columns at the equinox would need, at the window-centre latitude
const tanP=Math.tan(Pmid*deg),top95=ARCH.upperFloor+.95*(ARCH.columnTop-ARCH.upperFloor),D=3.025-(ARCH.columns[2].z+ARCH.columnRadius);
const geometryForEquinoxColumns={profileAngle:Pmid,currentGap:+D.toFixed(2),gapNeededFor95:+((glyphTop-top95)/tanP).toFixed(2),glyphTopNeededFor95:+(top95+D*tanP).toFixed(2),currentGlyphTop:+glyphTop.toFixed(2)};
const out={profileWindow:[Plow,Phigh],profileMid:Pmid,lateralWindow:[Math.min(...lat),Math.max(...lat)],latitudeWindow:[+(90-Phigh).toFixed(2),+(90-Plow).toFixed(2)],latitudeCentre:+latCentre.toFixed(2),fillWholeFigureLatitude:+(90-Phigh+1).toFixed(1),reports,geometryForEquinoxColumns};
writeFileSync('reference/site-inference/recommendation.json',JSON.stringify(out,null,1)+'\n');
console.log(JSON.stringify(out,null,1));

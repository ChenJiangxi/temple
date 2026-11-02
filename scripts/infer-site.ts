import {writeFileSync} from 'node:fs';
import {deg,holes,samples,buddhaStats,columnCover,glyphTop,glyphBottom} from './site-geometry';
import {solarPosition} from '../src/solar';
import {ARCH} from '../src/architecture';
// ---------- 1. Buddha pattern vs. profile angle, sun straight in front ----------
const profileTable=[] as any[];for(let P=20;P<=80;P+=1)profileTable.push({P,...buddhaStats(P,0)});
const maxHoles=Math.max(...profileTable.filter(r=>r.lost<.001).map(r=>r.holesOnBuddha));
const intact=profileTable.filter(r=>r.lost<.001&&r.holesOnBuddha===maxHoles);
const best=intact[Math.floor(intact.length/2)]; // centre of the complete window
// lateral tolerance at the best profile angle
const lateral=[] as any[];for(let L=-12;L<=12;L+=1)lateral.push({L,...buddhaStats(best.P,L)});
const lateralOk=lateral.filter(r=>r.lost<.001&&r.holesOnBuddha===maxHoles).map(r=>r.L);
// ---------- 2. sun in building frame ----------
const sunAt=(lat:number,bearing:number,date:string,hour:number)=>{const p=solarPosition({date,latitude:lat,longitude:120,utcOffset:8,entranceBearing:bearing},hour);return p};
const frame=(d:number[])=>({P:Math.atan2(d[1],d[2])/deg,L:Math.atan2(d[0],d[2])/deg});
// cache Buddha stats on a 0.5 degree grid for sweeps
const cache=new Map<string,any>();const stats=(P:number,L:number)=>{const k=`${Math.round(P*2)/2},${Math.round(L*2)/2}`;if(!cache.has(k))cache.set(k,buddhaStats(Math.round(P*2)/2,Math.round(L*2)/2));return cache.get(k)};
function day(lat:number,bearing:number,date:string){
 let bestB={onBuddha:0,holes:0,score:0,hour:0,P:0,L:0,lost:1},bestC={cover:0,hour:0},coverWindows:number[][]=[];let open:number|null=null;
 for(let hour=4;hour<=20;hour+=1/30){const s=sunAt(lat,bearing,date,hour);const d=s.direction;
  const cov=s.altitude>0?columnCover(d[0],d[1],d[2]):0;if(cov>bestC.cover)bestC={cover:cov,hour};
  if(cov>=.9&&open===null)open=hour;if(cov<.9&&open!==null){coverWindows.push([open,hour]);open=null}
  if(s.altitude>0&&d[2]>0){const f=frame(d);if(Math.abs(f.L)<=20&&f.P>=15){const b=stats(f.P,f.L);const score=b.lost<.001?b.holesOnBuddha+b.onBuddha:0;if(score>bestB.score)bestB={onBuddha:b.onBuddha,holes:b.lost<.001?b.holesOnBuddha:0,score,hour,P:f.P,L:f.L,lost:b.lost}}}}
 return {bestB,bestC,coverWindows};
}
const hm=(h:number)=>`${String(Math.floor(h)).padStart(2,'0')}:${String(Math.round(h%1*60)).padStart(2,'0')}`;
// ---------- 3. latitude sweep, south entrance, March equinox ----------
const latSweep=[] as any[];for(let lat=15;lat<=55;lat+=1){const r=day(lat,180,'2026-03-20');latSweep.push({lat,holes:r.bestB.holes,buddha:+r.bestB.onBuddha.toFixed(3),at:hm(r.bestB.hour),P:+r.bestB.P.toFixed(1),columnMax:+r.bestC.cover.toFixed(2)})}
// ---------- 4. bearing sweep at the inferred latitude, equinox ----------
const latStar=90-best.P;const latRange=[90-intact[intact.length-1].P,90-intact[0].P];
const bearingSweep=[] as any[];for(let b=90;b<=270;b+=15){const r=day(latStar,b,'2026-03-20');bearingSweep.push({bearing:b,holes:r.bestB.holes,buddha:+r.bestB.onBuddha.toFixed(3),at:hm(r.bestB.hour),columnMax:+r.bestC.cover.toFixed(2),columnAt:hm(r.bestC.hour)})}
// ---------- 5. through the year at the inferred site ----------
const months=['01-21','02-20','03-20','04-20','05-21','06-21','07-22','08-23','09-23','10-23','11-22','12-21'];
const year=months.map(m=>{const r=day(latStar,180,'2026-'+m);return {date:'2026-'+m,holes:r.bestB.holes,buddha:+r.bestB.onBuddha.toFixed(3),buddhaAt:r.bestB.onBuddha?hm(r.bestB.hour):'-',columnMax:+r.bestC.cover.toFixed(2),column90:r.coverWindows.map(w=>hm(w[0])+'–'+hm(w[1])).join(', ')||'-'}});
// ---------- 6. can both intents happen on the equinox anywhere? ----------
const both=[] as any[];for(let lat=0;lat<=60;lat+=2)for(let b=0;b<360;b+=5){const r=day(lat,b,'2026-03-20');if(r.bestB.holes>=maxHoles&&r.bestC.cover>=.9)both.push({lat,bearing:b,buddha:+r.bestB.onBuddha.toFixed(2),column:+r.bestC.cover.toFixed(2)})}
// equinox noon at the inferred latitude, south
const noon=frame(sunAt(latStar,180,'2026-03-20',12.12).direction);
const report={maxHoles,latRange,samples:samples.length,glyphTop,glyphBottom,best,intactRange:[intact[0].P,intact[intact.length-1].P],profileTable:profileTable.map(r=>({P:r.P,onBuddha:+r.onBuddha.toFixed(3),wallAbove:+r.onWallAbove.toFixed(3),reliefTop:+r.reliefTop.toFixed(3),lost:+r.lost.toFixed(4),holesOnBuddha:r.holesOnBuddha})),lateralOk:[Math.min(...lateralOk),Math.max(...lateralOk)],latStar,latSweep,bearingSweep,year,bothOnEquinox:both,noon};
writeFileSync('reference/site-inference/report.json',JSON.stringify(report,null,1)+'\n');
console.log(JSON.stringify({maxHoles,latRange,samples:samples.length,best:{P:best.P,onBuddha:best.onBuddha.toFixed(3),wallAbove:best.onWallAbove.toFixed(3),holes:best.holesOnBuddha},intactRange:report.intactRange,lateralOk:report.lateralOk,latStar},null,0));
console.log('profile P:holes/onBuddha%/lost%:',profileTable.filter(r=>r.P%3===0||r.P>=54&&r.P<=68).map(r=>`${r.P}°:${r.holesOnBuddha}/${(r.onBuddha*100).toFixed(0)}/${(r.lost*100).toFixed(1)}`).join('  '));
console.log('lat sweep:',latSweep.map(r=>`${r.lat}N h${r.holes}@${r.at} col${(r.columnMax*100).toFixed(0)}%`).join(' | '));
console.log('bearings:',bearingSweep.map(r=>`${r.bearing}° h${r.holes}@${r.at} C${(r.columnMax*100).toFixed(0)}%@${r.columnAt}`).join(' | '));
console.log('year:');for(const r of year)console.log(' ',r.date,'holes',r.holes,r.buddhaAt,' Cmax',(r.columnMax*100).toFixed(0)+'%',' C>=90%:',r.column90);
console.log('both on equinox:',both.length,JSON.stringify(both.slice(0,12)));

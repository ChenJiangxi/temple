import {solarPosition,DEFAULT_SOLAR} from '../src/solar';
import {ARCH} from '../src/architecture';
import {writeFileSync} from 'node:fs';
// Geometrical envelope, not the percentage of white pixels or a ray-traced illuminance result.
// Bounds include the actual top and bottom of the glyphs, supplied by the source-mask scan.
const bounds=JSON.parse(await Bun.file('reference/column-light-study/glyph-bounds.json').text());
const screen={z:3.025,left:-2.97,right:2.97,bottom:2.4,top:6};
const glyphTop=screen.top-bounds.top/bounds.height*3.6;
const glyphBottom=screen.top-(bounds.bottom+1)/bounds.height*3.6;
function study(bearing:number,hour:number,date=DEFAULT_SOLAR.date){
 const settings={...DEFAULT_SOLAR,entranceBearing:bearing,date};const solar=solarPosition(settings,hour);const [dx,dy,dz]=solar.direction;
 return {bearing,hour,date,altitude:solar.altitude,azimuth:solar.azimuth,profileAngle:Math.atan2(dy,dz)*180/Math.PI,
  columns:ARCH.columns.map(column=>{
   // Centre of the front-facing meridian. Other azimuths will cover different portions of the curved face.
   const x=column.x,z=column.z+ARCH.columnRadius;
   const t=(screen.z-z)/dz,screenX=x+t*dx;
   const low=Math.max(ARCH.upperFloor,glyphBottom-t*dy),high=Math.min(ARCH.columnTop,glyphTop-t*dy);
   const possible=dy>0&&dz>0&&screenX>=screen.left&&screenX<=screen.right;
   return {x:column.x,z:column.z,gapToFront:screen.z-z,screenX,low,high,litHeight:possible?Math.max(0,high-low):0,heightFraction:possible?Math.max(0,high-low)/(ARCH.columnTop-ARCH.upperFloor):0};
  })};
}
const cases=[study(180,12),study(180,9),study(180,15),study(180,12,'2026-12-21'),study(270,16),study(270,16.5),study(270,17)];
const gap=screen.z-(ARCH.columns[2].z+ARCH.columnRadius);
const requiredProfile=Math.atan((glyphTop-ARCH.columnTop)/gap)*180/Math.PI;
const nearFullProfile=Math.atan((glyphTop-(ARCH.upperFloor+.95*(ARCH.columnTop-ARCH.upperFloor)))/gap)*180/Math.PI;
const report={screen,glyphTop,glyphBottom,columnHeight:ARCH.columnTop-ARCH.upperFloor,requiredProfileForFullHeight:requiredProfile,requiredProfileFor95PercentHeight:nearFullProfile,cases};
writeFileSync('reference/column-light-study/report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({glyphTop,glyphBottom,requiredProfile,nearFullProfile,cases:cases.map(c=>({bearing:c.bearing,date:c.date,hour:c.hour,altitude:c.altitude.toFixed(2),profile:c.profileAngle.toFixed(2),ranges:c.columns.map(x=>[x.low.toFixed(2),x.high.toFixed(2),(100*x.heightFraction).toFixed(0)+'%'])}))},null,2));

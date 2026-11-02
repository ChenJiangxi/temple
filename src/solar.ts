/** Geometric solar position, NOAA/Meeus equations. East longitude positive.
 * https://gml.noaa.gov/grad/solcalc/main.js (archived in reference/)
 * Includes atmospheric refraction (NOAA calcRefraction, standard atmosphere): the sun is seen
 * slightly higher than its geometric position, 0.01 deg at equinox noon here, 0.03 deg at winter
 * noon, about 0.5 deg at the horizon. Weather and haze are not modelled.
 */
export type SolarSettings = { date:string; latitude:number; longitude:number; utcOffset:number; entranceBearing:number };
// Inferred, not supplied by the author (reference/site-inference/README.md):
// - entrance due south: the author's own drawing titles the sutra entrance 南立面图;
// - latitude about 39 N: the roof openings land complete on the Buddha for noon sun
//   angles 37-64.5 deg; at 39.25 N the equinox sits mid-way through that period.
// Beijing is used as a city on that latitude; longitude only shifts clock readings.
// The author accepted these parameters on 2026-11-01.
export const DEFAULT_SOLAR:SolarSettings={date:'2026-03-20',latitude:39.9,longitude:116.41,utcOffset:8,entranceBearing:180};
/** Local clock time of solar noon on DEFAULT_SOLAR.date at DEFAULT_SOLAR (Beijing time). */
export const DEFAULT_SOLAR_NOON=12+22/60;
const rad=Math.PI/180;
/** Atmospheric refraction in degrees for a geometric elevation in degrees (NOAA calcRefraction). */
function refraction(elevation:number){
 if(elevation>85)return 0;
 const te=Math.tan(elevation*rad);
 const arcsec=elevation>5?58.1/te-.07/te**3+.000086/te**5:elevation>-.575?1735+elevation*(-518.2+elevation*(103.4+elevation*(-12.79+elevation*.711))):-20.774/te;
 return arcsec/3600;
}
export function solarPosition(settings:SolarSettings,hour:number){
 const [year,month,day]=settings.date.split('-').map(Number);
 const jd=(Date.UTC(year,month-1,day)+(hour-settings.utcOffset)*3600000)/86400000+2440587.5;
 const t=(jd-2451545)/36525;
 const longitude=(280.46646+t*(36000.76983+.0003032*t))*rad;
 const anomaly=(357.52911+t*(35999.05029-.0001537*t))*rad;
 const eccentricity=.016708634-t*(.000042037+.0000001267*t);
 const center=Math.sin(anomaly)*(1.914602-t*(.004817+.000014*t))+Math.sin(2*anomaly)*(.019993-.000101*t)+Math.sin(3*anomaly)*.000289;
 const omega=(125.04-1934.136*t)*rad;
 const apparent=longitude+(center-.00569-.00478*Math.sin(omega))*rad;
 const obliquity=(23+(26+(21.448-t*(46.815+t*(.00059-.001813*t)))/60)/60+.00256*Math.cos(omega))*rad;
 const dec=Math.asin(Math.sin(obliquity)*Math.sin(apparent));
 const y=Math.tan(obliquity/2)**2;
 const eq=4/rad*(y*Math.sin(2*longitude)-2*eccentricity*Math.sin(anomaly)+4*eccentricity*y*Math.sin(anomaly)*Math.cos(2*longitude)-.5*y*y*Math.sin(4*longitude)-1.25*eccentricity*eccentricity*Math.sin(2*anomaly));
 const solarMinutes=((hour*60+eq+4*settings.longitude-60*settings.utcOffset)%1440+1440)%1440;
 const ha=(solarMinutes/4-180)*rad,lat=settings.latitude*rad;
 const east=-Math.cos(dec)*Math.sin(ha);
 const north=Math.cos(lat)*Math.sin(dec)-Math.sin(lat)*Math.cos(dec)*Math.cos(ha);
 const up=Math.sin(lat)*Math.sin(dec)+Math.cos(lat)*Math.cos(dec)*Math.cos(ha);
 const azimuth=(Math.atan2(east,north)/rad+360)%360;
 const geometric=Math.asin(Math.max(-1,Math.min(1,up)))/rad;
 const altitude=geometric+refraction(geometric);
 // +z points out of the entrance. +x points east when the entrance faces south.
 const relative=(azimuth-settings.entranceBearing)*rad;
 return {azimuth,altitude,direction:[-Math.sin(relative)*Math.cos(altitude*rad),Math.sin(altitude*rad),Math.cos(relative)*Math.cos(altitude*rad)] as [number,number,number]};
}

/** Seasonal atmosphere for Beijing (approximate climatology, for presentation): Linke turbidity by
 * month (how much haze and dust the air carries, 2 = very clean, 6 = humid summer haze). Spring
 * brings dust (yellowish horizon), summer humid haze (whitish sky, softer contrast), autumn the
 * clearest air of the year (deep blue, crisp shadows), winter dry and clear with a low sun.
 * haze: 0 (clear) to 1 (summer haze); dust: 0 to 1, peaking in mid April. */
const TURBIDITY=[3.1,3.5,4.3,4.9,5.1,5.6,6.0,5.7,4.5,3.7,3.3,3.0];
export function atmosphereFor(date:string){
 const [y,m,d]=date.split('-').map(Number);
 const day=(Date.UTC(y,m-1,d)-Date.UTC(y,0,1))/86400000;
 const t=(day-15)/30.44,i=Math.floor(t),f=t-i,at=(k:number)=>TURBIDITY[((k%12)+12)%12];
 const turbidity=at(i)+(at(i+1)-at(i))*f;
 const haze=Math.min(1,Math.max(0,(turbidity-3)/3));
 const dust=Math.exp(-(((day-105)/32)**2));
 return {turbidity,haze,dust};
}

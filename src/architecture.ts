/** Coordinates read from candidate-1/drawing.dxf. INSUNITS=4 (millimetres).
 * Refer to reference/cad/*.json for the actual source vertices.
 * Axes: +z toward the Heart Sutra entrance, x across the facade, y up.
 */
export const ARCH={
 width:6,depth:6,height:6,
 upperFloor:2.5,slabThickness:.15,platformBack:1,
 roofLow:5.433,roofFrontInner:1,roofBackInner:-.1,roofInnerHalfWidth:2.1,
 columnRadius:.25,columnTop:5.4,
 columns:[{x:-1.837,z:1.303},{x:-.581,z:1.292},{x:.591,z:1.307},{x:1.834,z:1.299}],
 seats:[{x:-1.346,z:2.251},{x:-.552,z:2.259},{x:.382,z:2.251},{x:1.298,z:2.251}],
 // Side stairs, from both plans: the first riser is flush with the rear jamb of the side door
 // (z = -2.139), leaving a 0.85 m ground-level landing in front of the door; 13 risers of 192 mm
 // (section a-a) and 250 mm treads; the last riser (z = 0.861) arrives at the platform edge (z = 1).
 stairWidth:.9,stairX:2.55,stairStart:-2.139,stairTread:.25,stairEnd:.861,stairSteps:13,
 rainZ:.42,rainRingRadius:.01,rainRingSpacing:.036,
};

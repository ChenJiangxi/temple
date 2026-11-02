import * as THREE from 'three';
import { ARCH } from './architecture';
import { applySolarShadows } from './solar-shadows';

/** Author-authorised concept additions. These are not reconstructed CAD details.
 * Dimensions here describe the visual proposal, not a structural/code approval.
 */
export const PROPOSAL={seatZ:1.95,guardHeight:1.1,handrailHeight:.9,walkwayStart:2.2};

export function createImprovements(){
 const group=new THREE.Group();group.name='authorised-design-proposals';
 const red=new THREE.MeshStandardMaterial({color:'#8f3439',roughness:.6,metalness:.25});
 const matrices:THREE.Matrix4[]=[];const pose=new THREE.Object3D();
 const up=new THREE.Vector3(0,1,0);
 function rod(a:number[],b:number[],radius:number){
  const from=new THREE.Vector3(...a as [number,number,number]),to=new THREE.Vector3(...b as [number,number,number]);
  const d=to.clone().sub(from);pose.position.copy(from).add(to).multiplyScalar(.5);
  pose.quaternion.setFromUnitVectors(up,d.clone().normalize());pose.scale.set(radius,d.length(),radius);pose.updateMatrix();matrices.push(pose.matrix.clone());
 }
 function mesh(g:THREE.BufferGeometry,m:THREE.Material,p:number[],cast=true){
  applySolarShadows(m);const o=new THREE.Mesh(g,m);o.position.set(...p as [number,number,number]);o.castShadow=cast;o.receiveShadow=true;group.add(o);return o;
 }
 // Transparent guard on the void side.
 // Glazing buildup is unspecified. Its optical transmission is not calibrated.
 const y=ARCH.upperFloor,z=ARCH.platformBack+.015;
 // Frameless and as clear as possible: seen from the hall it lies across the Buddha's face (author:
 // the glass got in the way), so no bright top edge and almost no tint.
 const glazing=new THREE.MeshPhysicalMaterial({color:'#eef3f1',transparent:true,opacity:.045,roughness:.02,metalness:0,side:THREE.DoubleSide,depthWrite:false});
 const glass=mesh(new THREE.PlaneGeometry(4.16,PROPOSAL.guardHeight),glazing,[0,y+PROPOSAL.guardHeight/2,z],false);glass.name='transparent-guard-concept';
 // Structural laminated glass (2 x 12 mm, SGP) standing in a steel channel cast into the slab edge,
 // top flush with the floor: no posts, no rail. (Slim red posts used to stand behind the columns;
 // from the Buddha side they read as stray red sticks, and the author asked what they were for.)
 // Leave both stair arrivals and the side doors open. Rails run 0.9 m above the line of the step
 // nosings. The outer rail extends 0.3 m over the landing; the inner rail stops at the first riser
 // so it does not cross the door. Balusters only where an edge is open: all along the outer side,
 // and on the inner side only past the end of the upper wall (z > 0.1), where the void begins.
 const rise=ARCH.upperFloor/ARCH.stairSteps;
 const pitch=(z:number)=>THREE.MathUtils.clamp(rise*((z-ARCH.stairStart)/ARCH.stairTread+1),rise,ARCH.upperFloor);
 for(const side of [-1,1])for(const edge of [2.15,2.88]){
  const x=side*edge,outer=edge>2.5;
  if(outer)rod([x,pitch(ARCH.stairStart)+.9,ARCH.stairStart-.3],[x,pitch(ARCH.stairStart)+.9,ARCH.stairStart],.018);
  rod([x,pitch(ARCH.stairStart)+.9,ARCH.stairStart],[x,y+.9,ARCH.stairEnd],.018);
  rod([x,y+.9,ARCH.stairEnd],[x,y+.9,1.28],.018);
  for(let z=outer?ARCH.stairStart+.05:.15;z<=1.21;z+=.1)rod([x,pitch(z)+.04,z],[x,pitch(z)+.9,z],.008);
 }
 const rails=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,10),red,matrices.length);
 matrices.forEach((m,i)=>rails.setMatrixAt(i,m));rails.name='stair-handrails';rails.castShadow=rails.receiveShadow=true;applySolarShadows(red);group.add(rails);

 // A quiet material change identifies the route behind the meditation seats.
 const passage=new THREE.MeshStandardMaterial({color:'#e1dacb',roughness:.92});
 mesh(new THREE.BoxGeometry(5.86,.002,.72),passage,[0,y+.002,2.58],false).name='route-behind-seats';
 const nosing=new THREE.MeshStandardMaterial({color:'#a8a498',roughness:.95});
 for(const side of [-1,1])for(let i=0;i<ARCH.stairSteps;i++){
  const rise=(i+1)*y/ARCH.stairSteps,front=ARCH.stairStart+i*ARCH.stairTread+.018;
  mesh(new THREE.BoxGeometry(.76,.002,.025),nosing,[side*ARCH.stairX,rise+.002,front],false);
 }

 // Splash tray under the jar.
 const metal=new THREE.MeshStandardMaterial({color:'#747c75',roughness:.65,metalness:.3});
 const tray=mesh(new THREE.CylinderGeometry(.64,.64,.025,64),metal,[0,.0925,ARCH.rainZ]);tray.name='removable-rainwater-tray';
 const rim=mesh(new THREE.TorusGeometry(.63,.012,8,64),metal,[0,.116,ARCH.rainZ]);rim.rotation.x=Math.PI/2;

 // Proposal 2026-11-02: clear glass roofs over the two stair zones, which the CAD leaves open to
 // the sky (rain and snow on the stairs; ice in winter). Each is the missing side face of the
 // inverted roof: from the cage top at x = 3 m (6.0 m high) down to the valley end at x = 2.1 m
 // (5.433 m), between the hip lines; it drains into the valley, so its water also reaches the jar.
 // Laminated low-iron glass on slim red steel edges. Sunlight through it: Fresnel loss only.
 const roofGlass=new THREE.MeshPhysicalMaterial({color:'#e3ecea',transparent:true,opacity:.12,roughness:.04,metalness:0,side:THREE.DoubleSide,depthWrite:false});
 for(const s of [-1,1]){
  const pts=[[3,6,-3],[3,6,3],[2.1,ARCH.roofLow,1],[2.1,ARCH.roofLow,ARCH.roofBackInner]].map(([x,y,z])=>new THREE.Vector3(s*x,y+.015,z));
  const g=new THREE.BufferGeometry().setFromPoints([pts[0],pts[1],pts[2],pts[0],pts[2],pts[3]]);g.computeVertexNormals();
  const pane=mesh(g,roofGlass,[0,0,0],false);pane.name='stair-glass-roof';pane.renderOrder=2;
  // Slim red steel edges along the two hips and the valley end (the outer edge is the cage's top frame).
  for(const [a,b] of [[1,2],[0,3],[2,3]]){
   const d=pts[b].clone().sub(pts[a]);const bar=mesh(new THREE.CylinderGeometry(.016,.016,d.length(),10),red,[0,0,0]);
   bar.position.copy(pts[a]).add(pts[b]).multiplyScalar(.5);bar.quaternion.setFromUnitVectors(up,d.normalize());
  }
 }

 // Proposal 2026-11-02: the overflow made visible. Instead of a hidden pipe, the jar's overflow
 // runs in a narrow stone runnel (90 mm wide, water just below the floor) along the axis and out
 // of the door, splits before the incense burner and reaches the two court pools: roof, valley,
 // chain, jar and pools become one visible path of rain.
 const water=new THREE.MeshPhysicalMaterial({color:'#121a19',roughness:.05,metalness:0,clearcoat:1,clearcoatRoughness:.03});
 const lip=new THREE.MeshStandardMaterial({color:'#8d877d',roughness:.8});
 const runnel=(x0:number,z0:number,x1:number,z1:number,y:number)=>{
  const along=x0===x1,len=Math.abs(along?z1-z0:x1-x0),cx=(x0+x1)/2,cz=(z0+z1)/2;
  mesh(new THREE.BoxGeometry(along?.09:len,.004,along?len:.09),water,[cx,y,cz],false).name='rain-runnel';
  for(const side of [-1,1])mesh(new THREE.BoxGeometry(along?.012:len,.006,along?len:.012),lip,[cx+(along?side*.051:0),y+.001,cz+(along?0:side*.051)],false);
 };
 const floorY=.0815,courtY=-.1095;
 runnel(0,ARCH.rainZ+.66,0,3.54,floorY);          // inside, from the tray to the threshold
 runnel(0,3.54,0,4.1,courtY);                       // down off the plinth onto the forecourt
 runnel(-2.6,4.1,2.6,4.1,courtY);                   // split before the burner
 for(const s of [-1,1])runnel(s*2.6,4.1,s*2.6,7.0,courtY);  // into the north end of each pool
 // The short fall from the plinth edge to the forecourt.
 mesh(new THREE.BoxGeometry(.09,.2,.004),water,[0,-.03,3.56],false).name='runnel-fall';
 return group;
}

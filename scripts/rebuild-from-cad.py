from pathlib import Path
p=Path('projects/temple-walkthrough/src/temple.ts');s=p.read_text()
s=s.replace("import { applySolarShadows } from './solar-shadows';", "import { applySolarShadows } from './solar-shadows';\nimport { ARCH } from './architecture';")
s=s.replace('hour=9;', 'hour=12;')
s=s.replace("position:[0,3.97,1.72],target:[0,4.18,.48]", "position:[-.05,3.35,2.65],target:[0,3.13,1.25]")
s=s.replace("detail:'看经文的光在圆柱上缓缓移动'", "detail:'原 CAD 心经字孔 · 四根静止圆柱'")
s=s.replace("position:[.1,1.65,.95],target:[0,2.7,-2.35]", "position:[.1,1.65,1.65],target:[0,2.7,-2.35]")
s=s.replace("position:[.6,1.65,.75]", "position:[.75,1.65,.85]")
s=s.replace("color:'#78211f'", "color:'#ae2934'").replace("color:'#822721'", "color:'#b72d37'").replace("color:'#8e2621'", "color:'#b72d37'")
s=s.replace("new THREE.PlaneGeometry(5.91,3.12)", "new THREE.PlaneGeometry(5.94,3.6)").replace('[0,4.43,3.025]', '[0,4.2,3.025]')
s=s.replace('[0,2.85,3]', '[0,2.4,3]')
s=s.replace('for(let i=0;i<=34;i++){\n   const t=-2.94+i*5.88/34;', 'for(let i=0;i<=40;i++){\n   const t=-2.965+i*5.93/40;')
s=s.replace('obj.scale.set(.045,5.92,.05)', 'obj.scale.set(.05,5.92,.07)').replace('obj.scale.set(.048,5.92,.05)', 'obj.scale.set(.07,5.92,.05)')
s=s.replace('if(Math.abs(t)>.73){obj.position.set(t,1.43,3);obj.scale.set(.048,2.78,.05)', 'if(Math.abs(t)>.67){obj.position.set(t,1.2,3);obj.scale.set(.07,2.35,.05)')
s=s.replace('this.box([.10,6.04,.10],[x,3,z],edgeRed)', 'this.box([.05,6.04,.05],[x,3,z],edgeRed)')
start=s.index('  // White sanctuary below')
end=s.index('  // Roof holes are stitched',start)
s=s[:start]+'''  // The CAD sections set the meditation floor at 2.50 m, two metres deep.
  this.box([5.94,ARCH.slabThickness,2],[0,ARCH.upperFloor-ARCH.slabThickness/2,2],white);
  this.box([4.2,5.9,.18],[0,2.95,-2.85],white);
  // Side walls, including the ground-floor doors into the two external stairs.
  for(const x of [-2,2]){
   this.box([.2,2.35,3.52],[x,1.175,-.36],white);
   this.box([.2,2.35,.15],[x,1.175,-2.825],white);
   this.box([.2,.17,.7],[x,2.265,-2.45],white);
   const profile=new THREE.Shape();profile.moveTo(-2.9,2.35);profile.lineTo(.1,2.35);profile.lineTo(.1,ARCH.roofLow-.03);profile.lineTo(-2.9,5.92);profile.closePath();
   const wall=new THREE.ExtrudeGeometry(profile,{depth:.2,bevelEnabled:false});const wp=wall.attributes.position;
   for(let i=0;i<wp.count;i++){const z=wp.getX(i),y=wp.getY(i),thickness=wp.getZ(i);wp.setXYZ(i,x-.1+thickness,y,z)}wall.computeVertexNormals();this.mesh(wall,white,[0,0,0]);
  }
  // Both stairs rise from the rear doors toward the front meditation platform.
  for(const x of [-ARCH.stairX,ARCH.stairX]){
   for(let i=0;i<ARCH.stairSteps;i++){
    const depth=(ARCH.stairEnd-ARCH.stairStart)/ARCH.stairSteps;
    const z=ARCH.stairStart+(i+.5)*depth,h=(i+1)*ARCH.upperFloor/ARCH.stairSteps;
    this.box([ARCH.stairWidth,h,depth+.005],[x,h/2,z],white,this.scene,.003);
   }
  }
  const columnStone=new THREE.MeshStandardMaterial({color:'#e5e3d8',roughness:.86});
  for(const {x,z} of ARCH.columns){
   const column=this.mesh(new THREE.CylinderGeometry(ARCH.columnRadius,ARCH.columnRadius,ARCH.columnTop-ARCH.upperFloor,96,36),columnStone,[x,(ARCH.columnTop+ARCH.upperFloor)/2,z]);
   column.name='sutra-light-column';
  }
  const cushionFabric=new THREE.MeshStandardMaterial({color:'#8a7b65',roughness:.98});
  for(const {x,z} of ARCH.seats){
   const cushion=this.mesh(new THREE.SphereGeometry(1,40,16),cushionFabric,[x,ARCH.upperFloor+.065,z]);cushion.scale.set(.2,.065,.2);
  }
  // The valley is asymmetric: front roof 2 m, rear roof 2.9 m, open gap 1.1 m.
  // Crossbars and the thin rain chain are visible in the drawings and photographs.
  for(let z=ARCH.roofBackInner+.04;z<ARCH.roofFrontInner;z+=.15)this.box([4.2,.04,.07],[0,ARCH.roofLow-.02,z],red,this.roof,0);
  const chainMaterial=new THREE.MeshStandardMaterial({color:'#8f8170',metalness:.65,roughness:.4});
  const ringGeometry=new THREE.TorusGeometry(ARCH.rainRingRadius,.0025,5,12);
  const ringCount=Math.floor((ARCH.roofLow-.95)/ARCH.rainRingSpacing);
  const chain=new THREE.InstancedMesh(ringGeometry,chainMaterial,ringCount);const ringPose=new THREE.Object3D();
  for(let i=0;i<ringCount;i++){ringPose.position.set(0,.95+i*ARCH.rainRingSpacing,ARCH.rainZ);ringPose.rotation.set(0,i%2*Math.PI/2,0);ringPose.updateMatrix();chain.setMatrixAt(i,ringPose.matrix)}chain.name='rain-chain-from-cad';chain.castShadow=chain.receiveShadow=true;applySolarShadows(chainMaterial);this.roof.add(chain);
  this.scene.add(this.roof);
'''+s[end:]
# Change the motif roof directly to the rear side, using the source plan's extents.
s=s.replace('p.setXYZ(i,x,4.94+v/2.6*1.06+t,.4+v)', 'p.setXYZ(i,-x,ARCH.roofLow+v/2.6*(6-ARCH.roofLow)+t,ARCH.roofBackInner-v/2.6*2.9)')
s=s.replace('[-3,6,-3,3,6,-3,2.07,4.94,-.4,-3,6,-3,2.07,4.94,-.4,-2.07,4.94,-.4]', '[-3,6,3,2.1,ARCH.roofLow,1,3,6,3,-3,6,3,-2.1,ARCH.roofLow,1,2.1,ARCH.roofLow,1]')
s=s.replace('s.lineTo(2.07,0);s.lineTo(-2.07,0)', 's.lineTo(2.1,0);s.lineTo(-2.1,0)')
s=s.replace('[0,.11,0]', '[0,.11,ARCH.rainZ]').replace('[0,.17,0]', '[0,.17,ARCH.rainZ]').replace('[0,.58,0]', '[0,.58,ARCH.rainZ]')
s=s.replace("this.host.clientWidth<700?70:60", "this.host.clientWidth<700?78:70").replace('w<700?70:60','w<700?78:70')
start=s.index(' floorAt(');end=s.index(' move(dt:',start)
s=s[:start]+''' floorAt(x:number,z:number,current:number){
  if(Math.abs(x)>2.1&&Math.abs(x)<2.96&&z>=-3&&z<=1)return clamp((z+3)/4,0,1)*ARCH.upperFloor;
  if(current>2.15&&Math.abs(x)<2.96&&z>=1&&z<2.96)return ARCH.upperFloor;
  return .1;
 }
 blocked(x:number,z:number,feet:number){
  if(Math.abs(x)>11||Math.abs(z)>11)return true;
  if(Math.abs(z)<3.16&&Math.abs(x)>2.85&&Math.abs(x)<3.23)return true;
  if(z< -2.75&&z> -3.22&&Math.abs(x)<3.23)return true;
  if(z>2.82&&z<3.22&&Math.abs(x)>.55&&Math.abs(x)<3.23)return true;
  if(feet<2.15&&Math.abs(x)>1.78&&Math.abs(x)<2.2&&z>-2.15&&z<1.5)return true;
  if(feet>2.15&&Math.abs(x)<2.15&&z<1.12)return true;
  if(feet>2.15&&z>2.77)return true;
  if(feet<1&&x*x+(z-ARCH.rainZ)**2<.62**2)return true;
  if(feet>2.15&&ARCH.columns.some(c=>(x-c.x)**2+(z-c.z)**2<.38**2))return true;
  return false;
 }
'''+s[end:]
p.write_text(s)
p=Path('projects/temple-walkthrough/src/main.tsx');s=p.read_text().replace('hour:9,','hour:12,').replace('当前为示例参数，尚未校准原作','示例地点 30°N / 120°E，待原作校准').replace('字孔仍','字孔仍');p.write_text(s)

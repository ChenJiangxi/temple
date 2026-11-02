from pathlib import Path
p=Path(__file__).resolve().parents[1]/'src/temple.ts'
s=p.read_text()
s=s.replace("import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';", "import { createMonolithicRelief } from './relief';\nimport { makeProjectedStone, type SutraProjection } from './light-projection';")
a=s.index('function buddhaGeometry()');b=s.index('export class TempleScene',a);s=s[:a]+s[b:]
s=s.replace("progress: number };", "progress: number; hour:number; daylightPlaying:boolean; seated:boolean };")
s=s.replace("{id:'jade',name:'浮雕玉佛',detail:'近看玉石、衣褶与浮雕层次',position:[0,4.67,-.7],target:[0,4.03,-2.6]}","{id:'jade',name:'整壁玉佛',detail:'一整块玉壁上的大型浮雕',position:[1.55,4.67,.35],target:[0,4.42,-2.5]}")
s=s.replace("{id:'gallery',name:'二层回廊',detail:'白色圆柱之间，回望格栅与天光',position:[2.43,4.65,-1.45],target:[-.6,4.6,1.1]}","{id:'gallery',name:'二层静坐',detail:'看经文的光在圆柱上缓缓移动',position:[0,3.97,1.28],target:[0,4.18,-.85]}")
s=s.replace("fill=new THREE.HemisphereLight(0xfffbef,0xb6ada0,.9);", "fill=new THREE.HemisphereLight(0xfffbef,0xb6ada0,.32);")
s=s.replace("paused=false;mode:", "hour=11.5;daylightPlaying=false;seated=false;eyeHeight=1.55;lightTick=0;\n projection:SutraProjection={mask:{value:null},direction:{value:new THREE.Vector3(0,.3,1)},strength:{value:0}};\n paused=false;mode:")
s=s.replace("this.scene.environmentIntensity=.7", "this.scene.environmentIntensity=.38")
s=s.replace('this.sun.shadow.mapSize.set(2048,2048)','this.sun.shadow.mapSize.set(4096,4096)')
s=s.replace('this.sun.shadow.camera.left=-9;this.sun.shadow.camera.right=9;this.sun.shadow.camera.top=9;this.sun.shadow.camera.bottom=-9;', 'this.sun.shadow.camera.left=-5;this.sun.shadow.camera.right=5;this.sun.shadow.camera.top=5;this.sun.shadow.camera.bottom=-5;')
s=s.replace('this.sun.shadow.camera.far=35','this.sun.shadow.camera.far=60')
s=s.replace('this.sun.shadow.normalBias=.025;this.sun.shadow.radius=3;', 'this.sun.shadow.normalBias=.003;this.sun.shadow.radius=1;')
s=s.replace('this.scene.add(this.sun);', 'this.scene.add(this.sun);this.sun.target.position.set(0,3.5,0);this.scene.add(this.sun.target);')
s=s.replace('this.build();this.bind();', 'this.build();this.setSun(this.hour);this.bind();')
s=s.replace("progress:this.guiding?this.guideElapsed/11:0}","progress:this.guiding?this.guideElapsed/11:0,hour:this.hour,daylightPlaying:this.daylightPlaying,seated:this.seated}")
s=s.replace("texture.colorSpace=THREE.NoColorSpace;texture.anisotropy=4;", "texture.colorSpace=THREE.NoColorSpace;texture.anisotropy=8;this.projection.mask.value=texture;this.projection.strength.value=2.4;")
s=s.replace("for(const z of [3.025])this.mesh(new THREE.PlaneGeometry(5.91,3.12),screenMaterial,[0,4.43,z]);", "const screen=this.mesh(new THREE.PlaneGeometry(5.91,3.12),screenMaterial,[0,4.43,3.025]);\n   screen.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,alphaMap:texture,alphaTest:.52,side:THREE.DoubleSide});")
s=s.replace('// White U-shaped sanctuary and a half-level gallery, as seen in the plan.', '// White sanctuary below, with a usable meditation room across the second floor.')
s=s.replace('this.box([4.08,.17,2.14],[0,3.04,-1.67],white);','this.box([4.08,.17,5.02],[0,3.04,-.23],white);')
old='''  // Four upper columns and the slender open beams across the central light slot.
  for(const x of [-1.43,-.48,.48,1.43]){
   this.mesh(new THREE.CylinderGeometry(.135,.145,2.0,32),white,[x,4.12,-1.2]);
   this.mesh(new THREE.CylinderGeometry(.18,.18,.075,32),stone,[x,3.16,-1.2]);
  }'''
new='''  // The four stationary cylinders receive sunlight traced through the facade glyphs.
  const columnStone=makeProjectedStone(new THREE.MeshStandardMaterial({color:'#deded2',roughness:.83}),this.projection);
  const cushionFabric=new THREE.MeshStandardMaterial({color:'#756653',roughness:.98});
  const cushionSeam=new THREE.MeshStandardMaterial({color:'#a99b81',roughness:1});
  for(const x of [-1.43,-.48,.48,1.43]){
   const column=this.mesh(new THREE.CylinderGeometry(.215,.225,1.98,96,32),columnStone,[x,4.13,-.85]);
   column.name='sutra-light-column';
   this.mesh(new THREE.CylinderGeometry(.27,.28,.075,48),stone,[x,3.16,-.85]);
   this.mesh(new THREE.CylinderGeometry(.28,.28,.08,48),cushionFabric,[x,3.2,1.22]);
   const seat=this.mesh(new THREE.SphereGeometry(1,40,16),cushionFabric,[x,3.27,1.22]);seat.scale.set(.27,.085,.27);
   const seam=this.mesh(new THREE.TorusGeometry(.274,.006,6,64),cushionSeam,[x,3.235,1.22]);seam.rotation.x=Math.PI/2;
  }
  // A low front edge marks the upper floor; a person can sit and watch the shafts of text.
  this.box([4.06,.10,.08],[0,3.18,2.27],white);
  for(const x of [-1.99,1.99])this.box([.035,.035,4.9],[x,3.16,-.2],brass);'''
if old not in s:raise RuntimeError('column block changed')
s=s.replace(old,new)
a=s.index('  const buddha=buddhaGeometry();');b=s.index('  // Central vessel',a)
s=s[:a]+'''  // A single continuous wall-sized Buddha relief replaces every repeated small icon.
  createMonolithicRelief(base+'assets/jade-relief-master.png').then(relief=>{
   if(!this.disposed)this.scene.add(relief);
  }).catch(error=>console.error('Jade relief asset could not load',error));
'''+s[b:]
s=s.replace('new THREE.PointLight(0xffe2af,5,8,2)','new THREE.PointLight(0xffe2af,3,8,2)').replace('new THREE.PointLight(0xffe8c6,3,7,2)','new THREE.PointLight(0xffe8c6,1.5,7,2)')
s=s.replace('const stop=STOPS.find(s=>s.id===id)!;this.view=id;', "const stop=STOPS.find(s=>s.id===id)!;this.view=id;this.seated=id==='gallery';this.eyeHeight=this.seated?.85:1.55;")
s=s.replace("setView(id:ViewId){this.stopGuide();this.go(id,id!=='outside'&&id!=='roof')}","setView(id:ViewId){this.stopGuide();if(id==='gallery')this.setDaylightPlaying(true);this.go(id,id!=='outside'&&id!=='roof')}")
a=s.index(' setSun(t:number)');b=s.index(' setMotion(',a)
s=s[:a]+''' setSun(t:number){
  this.hour=clamp(t,8,18);const phase=(this.hour-8)/10;
  const azimuth=(phase-.5)*1.12;
  const direction=new THREE.Vector3(Math.sin(azimuth),.16+.16*Math.sin(phase*Math.PI),Math.cos(azimuth)).normalize();
  this.projection.direction.value.copy(direction);
  this.sun.position.copy(this.sun.target.position).addScaledVector(direction,32);
  this.sun.intensity=2.0;this.sun.color.set(this.hour>16?'#ffd4a2':'#fff0d1');
  this.fill.intensity=.30;this.projection.strength.value=this.projection.mask.value?2.4:0;
  this.scene.background=new THREE.Color(this.hour>16?'#dfd4c4':'#ebe8df');(this.scene.fog as THREE.Fog).color.copy(this.scene.background);
 }
 setDaylightPlaying(playing:boolean){this.daylightPlaying=playing;if(playing&&this.hour>=17.95)this.setSun(8);this.emit()}
 toggleSeated(){
  if(this.view!=='gallery'){this.setView('gallery');return}
  this.seated=!this.seated;const newHeight=this.seated?.85:1.55;this.camera.position.y+=newHeight-this.eyeHeight;this.eyeHeight=newHeight;this.emit();
 }
'''+s[b:]
s=s.replace('if(current>2.6&&Math.abs(x)<2.95&&z<-.58&&z>-2.95)return 3.12;', 'if(current>2.6&&Math.abs(x)<2.03&&z<2.29&&z>-2.73)return 3.12;')
s=s.replace('if(feet>2.6&&z>-.6&&Math.abs(x)<2.03)return true;', 'if(feet>2.6&&z>2.17&&Math.abs(x)<2.03)return true;')
s=s.replace('(z+1.2)**2<.28**2','(z+.85)**2<.35**2')
s=s.replace("this.stopGuide();const speed=", "if(this.seated){this.camera.position.y+=1.55-this.eyeHeight;this.eyeHeight=1.55;this.seated=false;this.emit()}\n  this.stopGuide();const speed=")
s=s.replace('this.camera.position.y-1.55','this.camera.position.y-this.eyeHeight').replace('feet)+1.55','feet)+this.eyeHeight')
s=s.replace('  this.renderer.render(this.scene,this.camera);', '''  if(this.daylightPlaying&&!this.paused){
   this.setSun(Math.min(18,this.hour+dt*.11));this.lightTick+=dt;
   if(this.hour>=18)this.daylightPlaying=false;
   if(this.lightTick>.2){this.lightTick=0;this.emit()}
  }
  this.renderer.render(this.scene,this.camera);''')
p.write_text(s)

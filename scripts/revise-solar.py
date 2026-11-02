from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'src/temple.ts'
s=p.read_text()
s=s.replace("import { makeProjectedStone, type SutraProjection } from './light-projection';\nimport { roofApertureTexture, type RoofProjection } from './roof-projection';", "import { DEFAULT_SOLAR, solarPosition, type SolarSettings } from './solar';\nimport { applySolarShadows } from './solar-shadows';")
s=s.replace('equinox:boolean; motifPosition:number', 'solar:SolarSettings; solarEdited:boolean; playbackRate:number; altitude:number; azimuth:number')
s=s.replace("detail:'沿中轴进入安静的内殿',position:[.1,1.65,1.45],target:[0,1.8,-2.35]", "detail:'贯通两层的玉佛 · 天井下的接雨水瓶',position:[.1,1.65,.95],target:[0,2.7,-2.35]")
s=s.replace("name:'整壁玉佛',detail:'一整块玉壁上的大型浮雕',position:[0,4.62,-1.18],target:[0,4.42,-2.55]", "name:'通高玉佛',detail:'从一层延伸至二层的单块浮雕',position:[.75,1.65,-.45],target:[0,2.95,-2.55]")
s=s.replace("position:[0,3.97,1.28],target:[0,4.18,-.85]", "position:[0,3.97,1.72],target:[0,4.18,.48]")
s=s.replace("detail:'向内收拢的屋面与万字纹开孔'", "detail:'标识位于大佛侧 · 内收屋面汇集雨水'")
start=s.index(' equinox=false;')
end=s.index(' paused=false;',start)
s=s[:start]+''' solar:SolarSettings={...DEFAULT_SOLAR};solarEdited=false;playbackRate=1;altitude=0;azimuth=0;
 assetsRemaining=3;hour=9;daylightPlaying=false;seated=false;eyeHeight=1.55;lightTick=0;
'''+s[end:]
s=s.replace('this.renderer.shadowMap.type=THREE.PCFSoftShadowMap', 'this.renderer.shadowMap.type=THREE.BasicShadowMap;this.renderer.shadowMap.autoUpdate=false')
s=s.replace('this.scene.environmentIntensity=.38', 'this.scene.environmentIntensity=.13')
s=s.replace('this.sun.shadow.camera.left=-5;this.sun.shadow.camera.right=5;this.sun.shadow.camera.top=5;this.sun.shadow.camera.bottom=-5', 'this.sun.shadow.camera.left=-5.5;this.sun.shadow.camera.right=5.5;this.sun.shadow.camera.top=5.5;this.sun.shadow.camera.bottom=-5.5')
s=s.replace('this.sun.shadow.bias=-.0002;this.sun.shadow.normalBias=.003', 'this.sun.shadow.bias=-.000025;this.sun.shadow.normalBias=.001')
s=s.replace('this.animate(0);', 'this.animate(0);this.emit();')
s=s.replace('assetReady(){this.assetsRemaining--;', 'assetReady(){this.renderer.shadowMap.needsUpdate=true;this.assetsRemaining--;')
s=s.replace('equinox:this.equinox,motifPosition:this.motifPosition', 'solar:{...this.solar},solarEdited:this.solarEdited,playbackRate:this.playbackRate,altitude:this.altitude,azimuth:this.azimuth')
s=s.replace('const o=new THREE.Mesh(g,m);', 'applySolarShadows(m);const o=new THREE.Mesh(g,m);')
s=s.replace('slats.castShadow=true;', 'applySolarShadows(red);slats.castShadow=true;')
s=s.replace('texture.colorSpace=THREE.NoColorSpace;texture.anisotropy=8;this.projection.mask.value=texture;this.projection.strength.value=2.4;', 'texture.colorSpace=THREE.NoColorSpace;texture.anisotropy=8;')
s=s.replace('// South facade:', '// Entrance facade:')
s=s.replace('for(const x of [-1.96,1.96])this.box([.16,3.05,4.75],[x,1.6,-.52],white);', 'for(const x of [-1.96,1.96])this.box([.16,3.05,4.15],[x,1.6,-.22],white);')
s=s.replace('this.box([3.92,5.3,.18],[0,2.72,-2.72],white);', 'this.box([4.24,5.3,.18],[0,2.72,-2.72],white);')
s=s.replace('this.box([4.08,.17,5.02],[0,3.04,-.23],white);', '''// The front meditation platform leaves a full-height void at the Buddha.
  // A central notch keeps the rainfall path above the bottle open.
  this.box([4.08,.17,1.68],[0,3.04,1.44],white);
  for(const x of [-1.31,1.31])this.box([1.46,.17,.32],[x,3.04,.44],white);
  // Side access from both stairs to the meditation platform.
  for(const x of [-1.92,1.92])this.box([.24,.17,2.8],[x,3.04,-1.1],white);
  // Open, restrained guards at the void; they participate in sunlight occlusion.
  for(const x of [-1.31,1.31]){
   this.box([1.46,.035,.035],[x,4.02,.28],brass);
   for(const dx of [-.7,.7])this.box([.025,.9,.025],[x+dx,3.57,.28],brass);
  }
  this.box([1.16,.035,.035],[0,4.02,.6],brass);
  for(const x of [-.58,.58]){this.box([.025,.9,.025],[x,3.57,.6],brass);this.box([.025,.035,.32],[x,4.02,.44],brass);}
  for(const x of [-1.79,1.79]){this.box([.025,.035,2.7],[x,4.02,-1.05],brass);for(const z of [-2.35,-1.05,.25])this.box([.025,.9,.025],[x,3.57,z],brass);}''')
s=s.replace('const columnStone=makeProjectedStone(new THREE.MeshStandardMaterial({color:\'#deded2\',roughness:.83}),this.projection);', "const columnStone=new THREE.MeshStandardMaterial({color:'#deded2',roughness:.83});")
s=s.replace('[x,4.13,-.85]', '[x,4.13,.48]').replace('[x,3.16,-.85]', '[x,3.16,.48]')
s=s.replace('[x,3.2,1.22]', '[x,3.2,1.72]').replace('[x,3.27,1.22]', '[x,3.27,1.72]').replace('[x,3.235,1.22]', '[x,3.235,1.72]')
s=s.replace('for(const x of [-1.99,1.99])this.box([.035,.035,4.9],[x,3.16,-.2],brass);', '')
s=s.replace('for(let z=-.37;z<=.37;z+=.15)this.box([4.18,.055,.055],[0,4.91,z],red,this.roof);', '''// Rotate the entire roof: the original CAD motif belongs on the Buddha side.
  this.roof.rotation.y=Math.PI;
  // An open valley gutter slopes to the central outlet above the rain vessel.
  // The exact drainage detail was not supplied; this is a functional reconstruction.
  const gutterShape=new THREE.Shape();gutterShape.moveTo(-2.07,-.41);gutterShape.lineTo(2.07,-.41);gutterShape.lineTo(2.07,.41);gutterShape.lineTo(-2.07,.41);gutterShape.closePath();
  const drain=new THREE.Path();drain.absarc(0,0,.11,0,Math.PI*2,true);gutterShape.holes.push(drain);
  const gutterGeometry=new THREE.ShapeGeometry(gutterShape,24),gp=gutterGeometry.attributes.position;
  for(let i=0;i<gp.count;i++){const x=gp.getX(i),z=gp.getY(i);gp.setXYZ(i,x,4.72+.09*Math.abs(x)/2.07+.08*Math.abs(z)/.41,z)}gutterGeometry.computeVertexNormals();
  const gutterMaterial=red.clone();gutterMaterial.side=THREE.DoubleSide;this.mesh(gutterGeometry,gutterMaterial,[0,0,0],this.roof);
  const outlet=this.mesh(new THREE.CylinderGeometry(.11,.085,.18,32,1,true),gutterMaterial,[0,4.63,0],this.roof);outlet.name='rainwater-outlet';''')
s=s.replace('this.roofLight.mask.value=roofApertureTexture(holes);this.updateRoofLight();', '')
s=s.replace("createMonolithicRelief(base+'assets/jade-relief-master.png',this.roofLight)", "createMonolithicRelief(base+'assets/jade-relief-master.png')")
s=s.replace('this.scene.add(relief);this.assetReady()', 'relief.traverse(o=>{if(o instanceof THREE.Mesh){const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(applySolarShadows)}});this.scene.add(relief);this.assetReady()')
s=s.replace('// Central vessel on the original ground-floor axis.', '// Open rainwater vessel, directly beneath the valley outlet and the upper-floor void.')
s=s.replace('this.mesh(new THREE.LatheGeometry(vasePoints,48),jadeBacking,[0,.11,-.82]);', '''const vessel=this.mesh(new THREE.LatheGeometry(vasePoints,64),jadeBacking,[0,.11,0]);vessel.name='rainwater-collection-vessel';
  const water=this.mesh(new THREE.CircleGeometry(.35,64),new THREE.MeshPhysicalMaterial({color:'#698a81',roughness:.13,metalness:0,transparent:true,opacity:.78,clearcoat:1}),[0,.58,0]);water.rotation.x=-Math.PI/2;water.castShadow=false;''')
start=s.index('  // A warm low-intensity interior light')
end=s.index('  for(const x of [-1.75',start)
s=s[:start]+'  // No decorative point lights: direct sun and approximate sky fill only.\n'+s[end:]
s=s.replace("this.host.clientWidth<700?100:94", "this.host.clientWidth<700?88:78").replace('w<700?100:94', 'w<700?88:78')
s=s.replace("this.stopGuide();if(id==='gallery')this.setDaylightPlaying(true);this.go", 'this.stopGuide();this.go')
start=s.index(' setRoof(v:boolean)')
end=s.index(' toggleSeated()',start)
s=s[:start]+''' setRoof(v:boolean){this.roofVisible=v;this.roof.visible=v;this.renderer.shadowMap.needsUpdate=true;this.emit()}
 setSun(t:number){
  this.hour=clamp(t,0,24-1/3600);
  const position=solarPosition(this.solar,this.hour);this.altitude=position.altitude;this.azimuth=position.azimuth;
  const direction=V(position.direction);
  this.sun.position.copy(this.sun.target.position).addScaledVector(direction,32);
  const day=Math.max(0,direction.y);
  this.sun.intensity=this.altitude>0?3.2*Math.pow(day,.25):0;
  this.sun.color.set(this.altitude<12?'#ffe1b5':'#fff5e6');
  this.fill.intensity=.05+.3*Math.sqrt(day);this.scene.environmentIntensity=.04+.12*Math.sqrt(day);
  this.scene.background=new THREE.Color(this.altitude<0?'#303b48':this.altitude<12?'#ddd2c2':'#e8e7df');(this.scene.fog as THREE.Fog).color.copy(this.scene.background);
  this.renderer.shadowMap.needsUpdate=true;
 }
 setSolar(values:Partial<SolarSettings>){
  const next={...this.solar,...values};
  if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(next.date)||!Number.isFinite(Date.parse(next.date)))return;
  if(![next.latitude,next.longitude,next.utcOffset,next.entranceBearing].every(Number.isFinite))return;
  next.latitude=clamp(next.latitude,-89.9,89.9);next.longitude=clamp(next.longitude,-180,180);next.utcOffset=clamp(next.utcOffset,-12,14);next.entranceBearing=((next.entranceBearing%360)+360)%360;
  this.solar=next;this.solarEdited=true;this.setSun(this.hour);this.emit();
 }
 setPlaybackRate(rate:number){this.playbackRate=[1,60,600].includes(rate)?rate:1;this.emit()}
 setDaylightPlaying(playing:boolean){this.daylightPlaying=playing;this.emit()}
'''+s[end:]
s=s.replace("if((e.target as HTMLElement)?.matches('input,button,textarea'))", "if((e.target as HTMLElement)?.matches('input,button,textarea,select'))")
s=s.replace('if(current>2.6&&Math.abs(x)<2.03&&z<2.29&&z>-2.73)return 3.12;', 'if(current>2.6&&Math.abs(x)<2.03&&z<2.29&&(z>.6||(z>.28&&Math.abs(x)>.58)||Math.abs(x)>1.8))return 3.12;')
s=s.replace('if(feet>2.6&&z< -2.14&&Math.abs(x)<1.93)return true;', 'if(feet>2.6&&Math.abs(x)<1.9&&(z<.4||(Math.abs(x)<.7&&z<.73)))return true;')
s=s.replace('if(feet<1&&x*x+(z+.82)**2<.62**2)', 'if(feet<1&&x*x+z*z<.62**2)')
s=s.replace('(z+.85)**2<.35**2', '(z-.48)**2<.35**2')
s=s.replace('const dt=Math.min((ms-this.last)/1000,.04);', 'const elapsed=Math.max(0,(ms-this.last)/1000);const dt=Math.min(elapsed,.04);')
s=s.replace('this.setSun(Math.min(18,this.hour+dt*.11));this.lightTick+=dt;\n   if(this.hour>=18)this.daylightPlaying=false;', 'this.setSun(Math.min(24-1/3600,this.hour+elapsed*this.playbackRate/3600));this.lightTick+=elapsed;\n   if(this.hour>=24-1/3600)this.daylightPlaying=false;')
s=s.replace('if(this.daylightPlaying&&!this.paused){', 'if(this.daylightPlaying&&!this.paused&&!document.hidden){')
p.write_text(s)
p=root/'src/relief.ts';s=p.read_text().replace("import { addRoofLight, type RoofProjection } from './roof-projection';\n",'')
s=s.replace('url:string,roofLight?:RoofProjection', 'url:string')
s=s.replace('const segmentsX=480,segmentsY=320;', '''// Crop only side background. Preserve the seated figure's aspect ratio.
 const source=picture;
 const cropped=document.createElement('canvas');cropped.width=Math.round(source.naturalHeight*4.1/4.4);cropped.height=source.naturalHeight;
 cropped.getContext('2d')!.drawImage(source,(source.naturalWidth-cropped.width)/2,0,cropped.width,cropped.height,0,0,cropped.width,cropped.height);
 const segmentsX=384,segmentsY=416;''')
s=s.replace('ctx.drawImage(picture,0,0,c.width,c.height)', 'ctx.drawImage(cropped,0,0,c.width,c.height)')
s=s.replace('new THREE.PlaneGeometry(3.68,2.44', 'new THREE.PlaneGeometry(4.1,4.4')
s=s.replace('const u=x/segmentsX,v=y/segmentsY;', 'const u=(source.naturalWidth-cropped.width)/source.naturalWidth/2+x/segmentsX*cropped.width/source.naturalWidth,v=y/segmentsY;')
s=s.replace('volume+nose+fine*.025*silhouette', '1.8*(volume+nose)+fine*.035*silhouette')
s=s.replace('colorCanvas.width=picture.naturalWidth;colorCanvas.height=picture.naturalHeight;', 'colorCanvas.width=cropped.width;colorCanvas.height=cropped.height;')
s=s.replace('colorCtx.drawImage(picture,0,0)', 'colorCtx.drawImage(cropped,0,0)')
s=s.replace('transmission:.025', 'transmission:0')
s=s.replace(' if(roofLight)addRoofLight(material,roofLight);\n', '')
s=s.replace('new THREE.BoxGeometry(3.72,2.48,.18)', 'new THREE.BoxGeometry(4.14,4.44,.18)')
s=s.replace('group.position.set(0,4.42,-2.58)', 'group.position.set(0,2.95,-2.58)')
p.write_text(s)

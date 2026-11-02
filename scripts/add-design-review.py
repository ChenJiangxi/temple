from pathlib import Path
root=Path('projects/temple-walkthrough')
p=root/'src/temple.ts';s=p.read_text().replace("import { ARCH } from './architecture';", "import { ARCH } from './architecture';\nimport { createImprovements, PROPOSAL } from './improvements';")
s=s.replace("'gallery'|'roof';", "'gallery'|'roof'|'section';")
s=s.replace('azimuth:number };', 'azimuth:number; improvements:boolean };')
s=s.replace("detail:'原 CAD 心经字孔 · 四根静止圆柱'", "detail:'大佛侧挑空 · 柱列 · 静坐区'")
s=s.replace('const base = import.meta.env.BASE_URL;', "export const CUTAWAY_STOP={id:'section' as ViewId,name:'二层空间剖视',detail:'从大佛到入口：挑空 → 柱子 → 静坐',position:[7.8,9.8,7.7],target:[0,2.35,-.15]};\nconst base = import.meta.env.BASE_URL;")
s=s.replace('roof=new THREE.Group();sun=', 'roof=new THREE.Group();cutawayWall=new THREE.Group();proposalGroup=new THREE.Group();improvements=true;seatMeshes:THREE.Mesh[]=[];sun=')
s=s.replace('azimuth:this.azimuth})', 'azimuth:this.azimuth,improvements:this.improvements})')
s=s.replace(' build(){\n', ' build(){\n  this.scene.add(this.cutawayWall);\n')
s=s.replace('this.box([5.94,ARCH.slabThickness,2],[0,ARCH.upperFloor-ARCH.slabThickness/2,2],white);', '''// The slab ends at z=1. Everything toward the Buddha is an open vertical void.
  const platformDepth=3-ARCH.platformBack;
  const platform=this.box([5.94,ARCH.slabThickness,platformDepth],[0,ARCH.upperFloor-ARCH.slabThickness/2,(3+ARCH.platformBack)/2],white);platform.name='upper-meditation-platform-front-only';''')
s=s.replace('  for(const x of [-2,2]){\n', '  for(const x of [-2,2]){\n   const wallParent=x>0?this.cutawayWall:this.scene;\n')
s=s.replace('[x,1.175,-.36],white)', '[x,1.175,-.36],white,wallParent)').replace('[x,1.175,-2.825],white)', '[x,1.175,-2.825],white,wallParent)').replace('[x,2.265,-2.45],white)', '[x,2.265,-2.45],white,wallParent)')
s=s.replace('reverseWinding(wall);this.mesh(wall,white,[0,0,0]);', 'reverseWinding(wall);this.mesh(wall,white,[0,0,0],wallParent);')
s=s.replace('cushion.scale.set(.2,.065,.2);', 'cushion.scale.set(.2,.065,.2);this.seatMeshes.push(cushion);')
s=s.replace('  // No decorative point lights: direct sun and approximate sky fill only.\n', '  // New proposals are separate from the source model and can be switched off.\n  this.proposalGroup=createImprovements();this.scene.add(this.proposalGroup);this.setImprovements(true);\n  // No decorative point lights: direct sun and approximate sky fill only.\n')
s=s.replace("const stop=STOPS.find(s=>s.id===id)!;this.view=id;", "const stop=id==='section'?CUTAWAY_STOP:STOPS.find(s=>s.id===id)!;this.view=id;this.updateVisibility();if(id==='section')this.daylightPlaying=false;")
s=s.replace("this.go(id,id!=='outside'&&id!=='roof')", "this.go(id,id!=='outside'&&id!=='roof'&&id!=='section')")
s=s.replace('setRoof(v:boolean){this.roofVisible=v;this.roof.visible=v;this.renderer.shadowMap.needsUpdate=true;this.emit()}', '''setRoof(v:boolean){this.roofVisible=v;this.updateVisibility();this.emit()}
 updateVisibility(){
  const cut=this.view==='section';this.roof.visible=this.roofVisible&&!cut;this.cutawayWall.visible=!cut;this.renderer.shadowMap.needsUpdate=true;
 }
 setImprovements(enabled:boolean){
  this.improvements=enabled;this.proposalGroup.visible=enabled;
  this.seatMeshes.forEach((seat,i)=>seat.position.z=enabled?PROPOSAL.seatZ:ARCH.seats[i].z);
  this.renderer.shadowMap.needsUpdate=true;this.emit();
 }''')
# Reflect the visible handrail end in walking collision; the top landing remains open.
s=s.replace('  if(feet>2.15&&z>2.77)return true;', '  if(feet>2.15&&z>2.77)return true;\n  if(this.improvements&&feet>2.15&&z<1.42&&z>.7&&Math.abs(Math.abs(x)-2.15)<.14)return true;')
p.write_text(s)
p=root/'src/main.tsx';s=p.read_text().replace("import {TempleScene,STOPS,type TourState,type ViewId}", "import {TempleScene,STOPS,CUTAWAY_STOP,type TourState,type ViewId}")
s=s.replace("import { DEFAULT_SOLAR } from './solar';", "import { DEFAULT_SOLAR } from './solar';\nimport { ARCH } from './architecture';\nimport { PROPOSAL } from './improvements';")
s=s.replace('altitude:0,azimuth:0};', 'altitude:0,azimuth:0,improvements:true};')
pos=s.index('\nfunction App()')
s=s[:pos]+'''
function SpacePlan({improvements}:{improvements:boolean}){
 const px=(x:number)=>15+(x+3)*35,pz=(z:number)=>30+(z+3)*33.333;
 return <figure className="space-plan"><svg viewBox="0 0 240 258" role="img" aria-label="二层平面：大佛侧为挑空，临空一排四根柱子，柱后为静坐区和入口侧通路">
  <rect x="15" y="30" width="210" height="200" fill="#efeee7" stroke="#aaa79d"/>
  <rect x="46" y="37" width="148" height="126" fill="#fffdf8" stroke="#959b91" strokeDasharray="3 4"/>
  <text x="120" y="91" textAnchor="middle" fill="#62675f">挑空至一层</text>
  <circle cx="120" cy={pz(ARCH.rainZ)} r="7" fill="none" stroke="#829882"/>
  <text x="120" y="126" textAnchor="middle" fontSize="10" fill="#62675f">雨链与接雨瓶</text>
  <rect x="46" y="27" width="148" height="9" fill="#87a083"/><text x="120" y="17" textAnchor="middle" fill="#46624b">通高大佛</text>
  <rect x="15" y={pz(1)} width="210" height={pz(3)-pz(1)} fill="#ded8ca"/>
  {[-1,1].map(side=><g key={side}>{Array.from({length:16},(_,i)=><line key={i} x1={side<0?16:195} x2={side<0?45:224} y1={31+i*8.25} y2={31+i*8.25} stroke="#bbb8af"/>)}<path d={side<0?'M30 55V145L26 139M30 145L34 139':'M210 55V145L206 139M210 145L214 139'} fill="none" stroke="#777c72"/></g>)}
  {improvements&&<><line x1="47" x2="193" y1={pz(1.015)} y2={pz(1.015)} stroke="#992f29" strokeWidth="2"/><rect x="16" y={pz(2.2)} width="208" height="24" fill="#c8c4b6"/><text x="120" y="222" textAnchor="middle" fontSize="10" fill="#555e53">两侧楼梯相通的通行带</text></>}
  {ARCH.columns.map((c,i)=><circle key={i} cx={px(c.x)} cy={pz(c.z)} r="8.75" fill="#fffdf8" stroke="#6f776d"/>)}
  {ARCH.seats.map((c,i)=><ellipse key={i} cx={px(c.x)} cy={pz(improvements?PROPOSAL.seatZ:c.z)} rx="7" ry="5" fill="#8a7b65"/>)}
  <text x="120" y="248" textAnchor="middle" fill="#992f29">心经墙 · 入口侧</text>
 </svg><figcaption>佛侧挑空，柱后静坐；二层只占入口一侧。</figcaption></figure>
}
'''+s[pos:]
s=s.replace('const stop=STOPS.find(s=>s.id===state.view)!;', "const stop=state.view==='section'?CUTAWAY_STOP:STOPS.find(s=>s.id===state.view)!;")
s=s.replace('<button className="guide-link"', '<button className="layout-link" onClick={()=>choose(\'section\')} disabled={!ready}><Layers size={16}/>看二层布局</button>\n   <button className="guide-link"',1)
s=s.replace("{String(STOPS.findIndex(s=>s.id===state.view)+1).padStart(2,'0')} / 06", "{state.view==='section'?'空间关系':String(STOPS.findIndex(s=>s.id===state.view)+1).padStart(2,'0')+' / 06'}")
s=s.replace("{state.view==='gallery'&&<button className=\"sit-toggle\"", "{state.view==='gallery'&&<button className=\"sit-toggle\"")
needle="   {!roof&&<p className=\"solar-note\">屋顶已移开，遮挡条件已改变</p>}"
s=s.replace(needle,"   {state.view==='gallery'&&<button className=\"sit-toggle\" onClick={()=>choose('section')}><Layers size={14}/>看挑空与静坐区</button>}\n"+needle)
needle='  </>}{state.guiding&&<div className="tour-progress">'
s=s.replace(needle,'''  </>}{state.view==='section'&&<>
   <SpacePlan improvements={state.improvements}/>
   <label className="proposal-switch"><input type="checkbox" checked={state.improvements} onChange={e=>scene.current?.setImprovements(e.target.checked)}/>显示新增设计建议</label>
   <p className="proposal-note">新增：临空防护、楼梯扶手、坐垫后通路、接雨瓶溢流。</p>
   <button className="sit-toggle" onClick={()=>choose('gallery')}><Eye size={14}/>恢复完整建筑，看柱面光影</button>
   <p className="cutaway-note">剖视暂时移开屋顶和右侧墙体，仅用于看空间关系。</p>
  </>}{state.guiding&&<div className="tour-progress">''')
# Expose the additions globally without confusing them with source reconstruction.
s=s.replace('   <label className="check-label"><input type="checkbox" checked={roof}', '   <label className="check-label"><input type="checkbox" checked={state.improvements} onChange={e=>scene.current?.setImprovements(e.target.checked)}/>显示新增设计建议</label><p className="solar-note">新增防护、扶手、坐垫后通路与溢流构造；可关闭比较原布局。</p>\n   <label className="check-label"><input type="checkbox" checked={roof}')
s=s.replace('<div className="credit">依据你的 CAD 与实体模型重建</div>', '<div className="credit">{state.improvements?\'原作重建 · 显示新增设计建议\':\'依据你的 CAD 与实体模型重建\'}</div>')
p.write_text(s)
p=root/'src/style.css';s=p.read_text()+'''
.layout-link{display:flex;margin-top:8px;font-size:13px;gap:9px;color:var(--red);padding:0}
.space-plan{margin:12px 0 4px}.space-plan svg{display:block;width:100%;max-height:270px;font-size:12px;font-family:inherit}.space-plan figcaption{font-size:12px;line-height:1.7;color:var(--ink);margin:4px 0 12px}
.proposal-switch{display:flex;gap:8px;align-items:center;min-height:44px;font-size:12px;color:var(--ink);cursor:pointer}.proposal-switch input{width:16px;height:16px;accent-color:var(--red)}
.location-card .proposal-note{font-size:12px;line-height:1.7;letter-spacing:0;color:var(--muted);margin:4px 0 8px}
.location-card .cutaway-note{font-size:11px;line-height:1.7;letter-spacing:0;color:var(--muted);margin-top:8px}
@media(max-width:700px){.space-plan svg{max-height:220px}.intro .layout-link{font-size:12px}.location-card:has(.space-plan){max-height:calc(100dvh - 225px)}}
''';p.write_text(s)

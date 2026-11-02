from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'src/main.tsx';s=p.read_text()
s=s.replace("import './style.css';", "import { DEFAULT_SOLAR } from './solar';\nimport './style.css';")
s=s.replace('hour:11.5,daylightPlaying:false,seated:false,equinox:false,motifPosition:0', 'hour:9,daylightPlaying:false,seated:false,solar:{...DEFAULT_SOLAR},solarEdited:false,playbackRate:1,altitude:0,azimuth:0')
s=s.replace("const formatTime=(t:number)=>`${String(Math.floor(t)).padStart(2,'0')}:${String(Math.floor((t%1)*60)).padStart(2,'0')}`;", "const formatTime=(t:number)=>{const total=Math.min(86399,Math.floor(t*3600));return [Math.floor(total/3600),Math.floor(total/60)%60,total%60].map(n=>String(n).padStart(2,'0')).join(':')};")
pos=s.index('\nfunction App()')
s=s[:pos]+'''
function SolarControls({state,engine,id,onParameters}:{state:TourState;engine:TempleScene|null;id:string;onParameters?:()=>void}){
 const change=(t:number)=>{engine?.setDaylightPlaying(false);engine?.setSun(t);engine?.emit()};
 return <div className="solar-controls">
  <div className="light-time"><time>{formatTime(state.hour)}</time><button className="icon-button" onClick={()=>engine?.setDaylightPlaying(!state.daylightPlaying)} aria-label={state.daylightPlaying?'暂停日照时间':'播放日照时间'}>{state.daylightPlaying?<Pause size={17}/>:<Play size={17}/>}</button></div>
  <label className="sr-only" htmlFor={id}>当地时刻</label><input id={id} type="range" min="0" max="23.9997222222" step="0.0002777778" value={state.hour} onChange={e=>change(+e.target.value)}/>
  <div className="solar-speed"><label htmlFor={id+'-rate'}>播放速度</label><select id={id+'-rate'} value={state.playbackRate} onChange={e=>engine?.setPlaybackRate(+e.target.value)}><option value="1">1× 真实时间</option><option value="60">60× 每秒 1 分钟</option><option value="600">600× 每秒 10 分钟</option></select></div>
  <div className="time-presets"><button onClick={()=>change(9)}>09:00</button><button onClick={()=>change(12)}>12:00</button><button onClick={()=>change(15)}>15:00</button></div>
  <p className="solar-reading">太阳高度 {state.altitude.toFixed(1)}° · 方位 {state.azimuth.toFixed(1)}°</p>
  <p className="solar-note">{state.solar.date} · UTC{state.solar.utcOffset>=0?'+':''}{state.solar.utcOffset}<br/>{state.solarEdited?'使用输入参数，尚待原作核对':'当前为示例参数，尚未校准原作'}{state.altitude<=0&&<><br/>太阳在地平线下，无直射光</>}</p>
  {onParameters&&<button className="solar-parameters-link" onClick={onParameters}>地点、日期与朝向<ChevronRight size={14}/></button>}
 </div>
}
'''+s[pos:]
start=s.index(' const hour=state.hour;')
end=s.index(' const stop=',start)
s=s[:start]+s[end:]
start=s.index('  {compact&&<section')
end=s.index('  <aside',start)
s=s[:start]+'''  {compact&&<section className="location-card"><span className="eyebrow">{String(STOPS.findIndex(s=>s.id===state.view)+1).padStart(2,'0')} / 06</span><h1>{stop.name}</h1><p>{stop.detail}</p>{(state.view==='gallery'||state.view==='jade')&&<>
   <SolarControls state={state} engine={scene.current} id="view-solar-time" onParameters={()=>setSettings(true)}/>
   {state.view==='gallery'&&<button className="sit-toggle" onClick={()=>scene.current?.toggleSeated()}><Footprints size={14}/>{state.seated?'站起行走':'坐下看光'}</button>}
   {!roof&&<p className="solar-note">屋顶已移开，遮挡条件已改变</p>}
  </>}{state.guiding&&<div className="tour-progress"><i style={{width:`${state.progress*100}%`}}/></div>}</section>}
'''+s[end:]
start=s.index('  {settings&&<section')
end=s.index('  <section className="bottom-ui">',start)
s=s[:start]+'''  {settings&&<section className="settings-panel solar-settings"><div className="panel-heading"><h2>日照计算</h2><button className="icon-button" onClick={()=>setSettings(false)} aria-label="关闭设置"><X size={17}/></button></div>
   <SolarControls state={state} engine={scene.current} id="settings-solar-time"/>
   <form className="solar-form" onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);scene.current?.setSolar({date:String(data.get('date')),latitude:Number(data.get('latitude')),longitude:Number(data.get('longitude')),utcOffset:Number(data.get('utcOffset')),entranceBearing:Number(data.get('entranceBearing'))})}}>
    <label>日期<input type="date" name="date" defaultValue={state.solar.date} min="1900-01-01" max="2100-12-31" required/></label>
    <div className="solar-fields"><label>纬度（北为正）<input type="number" name="latitude" min="-89.9" max="89.9" step="0.0001" defaultValue={state.solar.latitude} required/></label><label>经度（东为正）<input type="number" name="longitude" min="-180" max="180" step="0.0001" defaultValue={state.solar.longitude} required/></label></div>
    <div className="solar-fields"><label>UTC 时差（小时）<input type="number" name="utcOffset" min="-12" max="14" step="0.25" defaultValue={state.solar.utcOffset} required/></label><label>入口朝向（度）<input type="number" name="entranceBearing" min="0" max="359.9" step="0.1" defaultValue={state.solar.entranceBearing} required/></label></div>
    <p className="solar-note">朝向从真北顺时针计：0° 北、90° 东、180° 南。初始值仅为示例，并非原设计所在地。</p>
    <button className="solar-apply" type="submit">应用日照参数</button>
   </form>
   <details className="solar-explanation"><summary>计算范围与清晰度</summary><p>太阳位置按日期、地点与时区计算，柱面和玉佛接收建筑实际遮挡后的直射光。文字和屋顶纹样不另行发光或旋转。</p><p>太阳视直径取约 0.53°，随遮挡距离估算光影边缘的软化。当前为实时近似；天空散射、反弹光和材质亮度尚未做物理标定。</p><p>建筑尺寸与开孔细节仍需原作核对，不能据此断定春分时图案一定完整。</p><a href="https://gml.noaa.gov/grad/solcalc/solareqns.PDF" target="_blank" rel="noreferrer">太阳位置计算依据 · NOAA</a></details>
   <label className="check-label"><input type="checkbox" checked={roof} onChange={e=>{setRoof(e.target.checked);scene.current?.setRoof(e.target.checked)}}/>显示屋顶</label><label className="check-label"><input type="checkbox" checked={reduced} onChange={e=>{setReduced(e.target.checked);scene.current?.setMotion(!e.target.checked)}}/>减少过渡动画</label>
  </section>}
  <div className="north-indicator"><Compass size={25} strokeWidth={1}/><span>入口朝向 {state.solar.entranceBearing}°</span><span>待原作核对</span></div>
'''+s[end:]
s=s.replace('日照用于展示设计意图。', '直射光按输入参数与当前建筑遮挡计算；参数与建筑尺寸仍需原作核对。')
s=s.replace('整壁玉佛、二层静坐与屋顶', '通高玉佛、二层静坐与屋顶')
s=s.replace('二层可播放光影，也可拖动时刻观察经文在柱面上的变化。图层按钮可移开屋顶。', '日照默认按 1 倍真实时间推进，可选 60 或 600 倍加速观察。太阳按钮可输入日期、地点与朝向。图层按钮会改变屋顶遮挡。')
p.write_text(s)
p=root/'src/temple.ts';s=p.read_text().replace('[-1.31,1.31]', '[-1.13,1.13]').replace('[1.46,.17,.32]', '[1.82,.17,.32]').replace('[1.46,.035,.035]', '[1.82,.035,.035]').replace('[-.7,.7]', '[-.87,.87]').replace('[1.16,.035,.035]', '[.44,.035,.035]').replace('[-.58,.58]', '[-.22,.22]').replace('Math.abs(x)>.58)||', 'Math.abs(x)>.22)||').replace('Math.abs(x)<.7&&z<.73', 'Math.abs(x)<.34&&z<.73')
p.write_text(s)
p=root/'src/style.css';s=p.read_text();start=s.find('.roof-illustration');s=s[:start] if start>=0 else s
s+='''
/* Daylight controls share the existing warm paper and dark text palette. */
.solar-controls{margin-top:12px;padding-top:8px;border-top:1px solid var(--line)}
.solar-controls input[type=range]{width:100%;accent-color:var(--red);min-height:32px;cursor:pointer}
.solar-speed{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;margin-top:4px}
.solar-speed select{max-width:180px;min-height:44px;padding:4px 8px;border:1px solid var(--line);border-radius:var(--r1);background:var(--surface);color:var(--ink);font:inherit}
.location-card .solar-note,.solar-note{font-size:12px;line-height:1.65;color:var(--muted);margin-top:8px;letter-spacing:0}
.location-card .solar-reading,.solar-reading{font-size:12px;line-height:1.6;color:var(--ink);margin-top:8px;letter-spacing:0}
.solar-parameters-link{width:100%;justify-content:space-between;font-size:12px;color:var(--red);margin-top:4px}
.solar-settings{width:min(340px,calc(100vw - 32px));max-height:calc(100dvh - 190px);overflow:auto;overscroll-behavior:contain;top:110px;z-index:5}
.solar-form{border-top:1px solid var(--line);padding-top:16px;margin-top:12px}
.solar-form label{display:flex;flex-direction:column;gap:6px;font-size:12px;align-items:stretch;margin-bottom:12px}
.solar-form input{width:100%;min-width:0;min-height:44px;padding:8px;border:1px solid var(--line);border-radius:var(--r1);background:var(--surface);color:var(--ink);font-size:16px}
.solar-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.solar-apply{margin:12px 0 8px;width:100%;background:var(--red);color:var(--surface);border-radius:var(--r1);font-size:13px}
.solar-apply:hover{color:white;background:#7e241f}
.solar-explanation{border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:12px 0;margin:8px 0;font-size:12px;line-height:1.7}
.solar-explanation summary{cursor:pointer;min-height:32px;display:flex;align-items:center}
.solar-explanation summary::before{content:'＋';margin-right:8px}
.solar-explanation[open] summary::before{content:'−'}
.solar-explanation p{margin:8px 0;color:var(--muted)}
.solar-explanation a{color:var(--focus);text-decoration:underline}
.location-card{max-height:calc(100dvh - 260px);overflow:auto;overscroll-behavior:contain}
select:focus-visible,summary:focus-visible{outline:2px solid var(--focus);outline-offset:3px}
@media(max-width:700px){.location-card{max-height:calc(100dvh - 245px);width:255px}.solar-settings{top:88px;right:16px;max-height:calc(100dvh - 190px)}.solar-speed select{font-size:13px}.north-indicator{display:none}}
'''
p.write_text(s)

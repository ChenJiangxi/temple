from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'src/main.tsx';s=p.read_text()
s=s.replace("progress:0};", "progress:0,hour:11.5,daylightPlaying:false,seated:false};")
s=s.replace("const base=import.meta.env.BASE_URL;", "const base=import.meta.env.BASE_URL;\nconst formatTime=(t:number)=>`${String(Math.floor(t)).padStart(2,'0')}:${String(Math.floor((t%1)*60)).padStart(2,'0')}`;")
s=s.replace(",[hour,setHour]=useState(14)","")
s=s.replace(" const stop=STOPS.find", " const hour=state.hour;\n const changeHour=(t:number)=>{scene.current?.setDaylightPlaying(false);scene.current?.setSun(t);scene.current?.emit()};\n const stop=STOPS.find")
s=s.replace("穿过朱红格栅，<br/>在经文透下的光里，近看浮雕玉佛。", "静坐二层，<br/>看经文的光在圆柱上缓缓移动。")
s=s.replace('<button className="primary" onClick={enter} disabled={!ready}>', '<button className="primary" onClick={()=>choose(\'gallery\')} disabled={!ready}>')
s=s.replace("ready?'进入寺庙':'正在构建空间'", "ready?'进入二层静坐':'正在构建空间'")
old='''<p>{stop.detail}</p>{state.guiding&&'''
new='''<p>{stop.detail}</p>{state.view==='gallery'&&<div className="meditation-controls"><div className="light-time"><span>{formatTime(hour)}</span><button className="icon-button" onClick={()=>scene.current?.setDaylightPlaying(!state.daylightPlaying)} aria-label={state.daylightPlaying?'暂停光影':'播放光影'}>{state.daylightPlaying?<Pause size={17}/>:<Play size={17}/>}</button></div><label className="sr-only" htmlFor="meditation-hour">光影时刻</label><input id="meditation-hour" type="range" min="8" max="18" step="0.01" value={hour} onChange={e=>changeHour(+e.target.value)}/><div className="time-presets"><button onClick={()=>changeHour(9)}>09:00</button><button onClick={()=>changeHour(12)}>12:00</button><button onClick={()=>changeHour(15)}>15:00</button></div><button className="sit-toggle" onClick={()=>scene.current?.toggleSeated()}><Footprints size={14}/>{state.seated?'站起行走':'坐下看光'}</button><span className="light-note">日照方向演示</span></div>}{state.guiding&&'''
if old not in s:raise RuntimeError('location block not found')
s=s.replace(old,new)
s=s.replace('<span>{hour}:00</span>', '<span>{formatTime(hour)}</span>')
s=s.replace('step="1" value={hour} onChange={e=>{setHour(+e.target.value);scene.current?.setSun(+e.target.value)}}', 'step="0.01" value={hour} onChange={e=>changeHour(+e.target.value)}')
s=s.replace('<span>04</span>回廊', '<span>04</span>静坐')
s=s.replace("state.mode==='orbit'?'环绕观察':'自由步行'", "state.mode==='orbit'?'环绕观察':state.seated?'静坐观光':'自由步行'")
s=s.replace('依次经过入口、内殿、玉佛、回廊与屋顶', '依次经过入口、内殿、整壁玉佛、二层静坐与屋顶')
s=s.replace('右侧太阳按钮调整日照；图层按钮可移开屋顶，观察内部空间。', '二层可播放光影，也可拖动时刻观察经文在柱面上的变化。图层按钮可移开屋顶。')
s=s.replace('玉佛以立体浮雕呈现。图纸未标明的局部尺寸与雕刻细节作了补足。', '玉佛重建为一整块大型浮雕。未标明的尺寸与佛像雕刻细节作了补足；日照用于展示设计意图。')
p.write_text(s)
p=root/'src/style.css';s=p.read_text();s+='''
.meditation-controls{margin-top:16px;border-top:1px solid var(--line);padding-top:8px}.light-time{display:flex;align-items:center;justify-content:space-between}.light-time>span{font-family:monospace;font-size:29px;letter-spacing:2px;color:var(--red)}.light-time button{color:var(--red)}.meditation-controls input[type=range]{width:100%;height:30px;accent-color:var(--red);margin:0}.time-presets{display:flex;justify-content:space-between}.time-presets button{font-size:11px;font-family:monospace;color:var(--muted);min-height:35px;padding:0 9px}.sit-toggle{font-size:12px;min-height:40px;width:100%;border:1px solid var(--line);border-radius:5px;margin-top:5px;background:var(--surface)}.light-note{display:block;text-align:center;color:var(--muted);font-size:9px;margin-top:10px;letter-spacing:1px}.location-card:has(.meditation-controls){width:276px}.walking .location-card:has(.meditation-controls){background:#fffdf8ed}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:700px){.location-card:has(.meditation-controls){width:224px;padding:12px 16px}.meditation-controls{margin-top:10px;padding-top:4px}.light-time>span{font-size:24px}.time-presets button{min-height:32px}.light-note{display:none}.sit-toggle{margin-top:1px;min-height:36px}.location-card:has(.meditation-controls) p{font-size:9px}}
''';p.write_text(s)

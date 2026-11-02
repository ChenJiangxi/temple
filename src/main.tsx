import React, {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowLeft,ArrowRight,Play,Pause,X} from 'lucide-react';
import {TempleScene,type TourState,type ViewId} from './temple';
import {DEFAULT_SOLAR,DEFAULT_SOLAR_NOON} from './solar';
import {SpacePlan} from './SpacePlan';
import './style.css';

const base=import.meta.env.BASE_URL;
// Same author-confirmed site, near the winter solstice: the sun is low enough for nearly full columns.
const params=new URLSearchParams(location.search);
const winterStudy=params.get('scenario')==='winter-columns';
// The site opens on a cover (the building at dusk); development links and the winter study skip it.
// Development aid: ?film=<shot>[&from=&to=|&still=f1,f2][&ratio=] renders the promotional film (film.ts).
const filmShot=params.get('film');
const startOnCover=!(params.has('inspect')||winterStudy||filmShot||params.get('cover')==='0');
const initial:TourState={view:'columns',mode:'orbit',guiding:false,progress:0,hour:DEFAULT_SOLAR_NOON,daylightPlaying:false,seated:false,solar:{...DEFAULT_SOLAR},solarEdited:false,playbackRate:600,altitude:0,azimuth:0,improvements:true};
const time=(hour:number)=>{const t=Math.min(86399,Math.floor(hour*3600));return [Math.floor(t/3600),Math.floor(t/60)%60].map(n=>String(n).padStart(2,'0')).join(':')};
const TERMS:Record<string,string>={'03-20':'春分','03-21':'春分','06-21':'夏至','06-22':'夏至','09-22':'秋分','09-23':'秋分','12-21':'冬至','12-22':'冬至'};
const day=(date:string)=>{const [,m,d]=date.split('-');return `${+m}月${+d}日${TERMS[`${m}-${d}`]?' · '+TERMS[`${m}-${d}`]:''}`};
const photos=['南侧入口与镂空心经','侧立面与白色内殿','背面格栅','内收屋顶与万字纹','万字纹开孔细部','顶视内部关系','上层圆柱与内殿','格栅间的光影','俯视整体空间','原始 CAD 图纸'];
type Chapter='sutra'|'buddha'|'space';
type Capture={url:string;width:number;height:number;hour:number};
const chapterOf=(view:ViewId):Chapter=>view==='columns'||view==='column'||view==='gallery'?'sutra':view==='jade'||view==='roof'?'buddha':'space';
const chapters:Record<Chapter,{title:string;line:string;body:string;views:[ViewId,string][]}>={
 sutra:{title:'心经入柱',line:'日光穿过心经墙的字孔，经文落在圆柱上，随太阳移动。',body:'日光穿过心经墙的字孔，落在静止的圆柱上。随着太阳移动，文字在曲面上变形、经过、离开。',views:[['columns','整柱'],['column','近看'],['gallery','静坐']]},
 buddha:{title:'天光照佛',line:'春分正午，屋顶的万字开孔把光落在白玉佛身上。',body:'屋顶开孔与通高玉佛相对。光经过雕刻的起伏，图案随时间改变位置与形状。',views:[['jade','佛前'],['roof','屋顶']]},
 space:{title:'建筑空间',line:'一层礼佛，二层静坐，雨水沿雨链落进接雨瓶。',body:'从一层礼佛到二层静坐，沿两侧楼梯游览。接雨瓶承接屋顶雨链，拜垫位于大佛前。',views:[['outside','轴测'],['approach','人视'],['hall','内殿'],['section','剖视']]},
};
const CHAPTER_ORDER:Chapter[]=['sutra','buddha','space'];
const CHAPTER_HOME:Record<Chapter,ViewId>={sutra:'columns',buddha:'jade',space:'outside'};
// Each chapter opens at its own hour: the two light events at solar noon; the building and site in
// mid-afternoon side light, which models the slats and volumes better than flat noon light.
const CHAPTER_HOUR:Record<Chapter,number>={sutra:DEFAULT_SOLAR_NOON,buddha:DEFAULT_SOLAR_NOON,space:15.5};
const SEASONS:[string,string][]=[['2026-03-20','春分'],['2026-06-21','夏至'],['2026-09-23','秋分'],['2026-12-21','冬至']];

function LightPath({buddha=false}:{buddha?:boolean}){
 return <svg className="light-path" viewBox="0 0 260 100" role="img" aria-label={buddha?'日光经过屋顶开孔，落到玉佛浮雕':'日光经过心经字孔，落到圆柱曲面'}>
  <circle cx="25" cy="24" r="8" fill="none" stroke="currentColor"/>
  <path d="M22 42L220 72M42 21L239 51" fill="none" stroke="var(--accent)" strokeWidth="1"/>
  {buddha?<><path d="M97 14L107 17M119 20L149 29M161 32L177 37" stroke="currentColor" strokeWidth="4"/><path d="M223 30V79H244V30M223 37Q205 40 219 48Q206 58 220 68" stroke="currentColor" fill="none"/></>:<><path d="M112 11V34M112 42V54M112 64V77" stroke="currentColor" strokeWidth="4"/><ellipse cx="222" cy="43" rx="17" ry="6" stroke="currentColor" fill="none"/><path d="M205 43V77Q222 90 239 77V43" stroke="currentColor" fill="none"/></>}
  <text x="12" y="96">日光</text><text x="99" y="96">{buddha?'屋顶开孔':'经文字孔'}</text><text x="209" y="96">{buddha?'玉佛':'柱面'}</text>
 </svg>
}

function App(){
 const host=useRef<HTMLDivElement>(null),engine=useRef<TempleScene|null>(null),dialog=useRef<HTMLDialogElement>(null);
 const [state,setState]=useState(initial),[ready,setReady]=useState(false),[error,setError]=useState('');
 const [modal,setModal]=useState<'photos'|'settings'|'info'|null>(null),[photo,setPhoto]=useState(0);
 const [roof,setRoof]=useState(true),[reduced,setReduced]=useState(false),[fullscreen,setFullscreen]=useState(false);
 const [capture,setCapture]=useState<Capture|null>(null),[split,setSplit]=useState(50),[message,setMessage]=useState('');
 const [joy,setJoy]=useState({x:0,y:0});
 const [filmStatus,setFilmStatus]=useState(filmShot?'film-loading':'');
 const [cover,setCover]=useState(startOnCover),[title,setTitle]=useState<{chapter:Chapter;key:number}|null>(null);
 const chapter=chapterOf(state.view),content=chapters[chapter];
 // Dark surroundings where the picture is dark: the Buddha hall (a white carving in a dim room, as the
 // author's model photos show it on black), the night, and the cover at dusk. Paper elsewhere.
 const dark=cover||chapter==='buddha'||state.altitude<-3;
 useEffect(()=>{
  let s:TempleScene|undefined;
  try{
   s=new TempleScene(host.current!,setState,()=>setReady(true));engine.current=s;
   const pref=matchMedia('(prefers-reduced-motion: reduce)').matches;
   s.setMotion(false);
   if(winterStudy){s.setSolar({...DEFAULT_SOLAR,date:'2026-12-21'});s.setSun(10);s.emit()}else{s.setSun(startOnCover?s.blueHour():DEFAULT_SOLAR_NOON);s.emit()}
   // Play runs at 600x by default; the rate is always shown on the button (1x is in Settings).
   s.setPlaybackRate(600);s.setView(startOnCover?'approach':'columns');s.setMotion(!pref);setReduced(pref);
  }catch(e){console.error(e);setError('当前浏览器无法显示三维空间。')}
  return()=>{s?.dispose();engine.current=null};
 },[]);
 useEffect(()=>{
  // Development aid: ?inspect=x,y,z,tx,ty,tz[,fov] puts the camera next to an object for close checks.
  const raw=new URLSearchParams(location.search).get('inspect');
  if(!ready||!raw)return;const v=raw.split(',').map(Number);if(v.length<6||v.some(n=>!Number.isFinite(n)))return;
  const section=new URLSearchParams(location.search).has('section');
  // Development aid: &at=YYYY-MM-DD,hour sets the date and solar clock time for the inspection.
  const at=new URLSearchParams(location.search).get('at');
  if(at){const [d,h]=at.split(',');const s=engine.current;if(s&&d&&Number.isFinite(Number(h))){s.setSolar({...DEFAULT_SOLAR,date:d});s.setSun(Number(h));s.emit()}}
  const timer=setTimeout(()=>engine.current?.inspect(v.slice(0,3),v.slice(3,6),v[6]||32,section),400);return()=>clearTimeout(timer);
 },[ready]);
 useEffect(()=>{
  const s=engine.current;
  if(modal){s?.keys.clear();if(s)s.paused=true;dialog.current?.showModal()}
  else {dialog.current?.close();if(s)s.paused=false}
 },[modal]);
 useEffect(()=>{
  if(!ready||!filmShot||!engine.current)return;const s=engine.current;
  const num=(k:string)=>params.get(k)!==null&&Number.isFinite(Number(params.get(k)))?Number(params.get(k)):undefined;
  import('./film').then(m=>m.runFilm(s,filmShot,{from:num('from'),to:num('to'),ratio:num('ratio'),w:num('w'),h:num('h'),clean:params.has('clean'),still:params.get('still')?.split(',').map(Number).filter(Number.isFinite),status:setFilmStatus})).catch(e=>{console.error(e);setFilmStatus('film-error '+String(e))});
 },[ready]);
 useEffect(()=>{document.querySelector('meta[name=theme-color]')?.setAttribute('content',dark?'#131312':'#f5f4f0')},[dark]);
 useEffect(()=>{if(!title)return;const t=setTimeout(()=>setTitle(null),3600);return()=>clearTimeout(t)},[title]);
 useEffect(()=>{const f=()=>setFullscreen(!!document.fullscreenElement);document.addEventListener('fullscreenchange',f);return()=>document.removeEventListener('fullscreenchange',f)},[]);
 useEffect(()=>{
  if(!capture||!host.current)return;
  const observer=new ResizeObserver(([entry])=>{if(Math.abs(entry.contentRect.width-capture.width)>1||Math.abs(entry.contentRect.height-capture.height)>1){setCapture(null);engine.current?.setComparisonLocked(false)}});
  observer.observe(host.current);return()=>observer.disconnect();
 },[capture]);
 const clearCapture=()=>{setCapture(null);engine.current?.setComparisonLocked(false)};
 const choose=(id:ViewId)=>{clearCapture();engine.current?.setDaylightPlaying(false);engine.current?.setRoof(true);setRoof(true);engine.current?.setView(id);setMessage('')};
 const changeTime=(hour:number)=>{engine.current?.setDaylightPlaying(false);engine.current?.setSun(Math.max(0,Math.min(23.9997,hour)));engine.current?.emit()};
 // Enter a chapter at its own view and hour; its title shows over the picture for a moment.
 const enter=(id:Chapter)=>{setCover(false);choose(CHAPTER_HOME[id]);changeTime(CHAPTER_HOUR[id]);setTitle({chapter:id,key:Date.now()})};
 const toCover=()=>{const s=engine.current;setModal(null);setTitle(null);choose('approach');if(s)changeTime(s.blueHour());setCover(true)};
 const setDate=(date:string)=>{clearCapture();engine.current?.setDate(date)};
 const playStudy=()=>{engine.current?.playDaylightStudy(9,15);setModal(null)};
 const compare=()=>{
  if(capture){clearCapture();return}
  const snapshot=engine.current?.captureView();
  if(!snapshot){setMessage('画面仍在调整，请稍候再记录。');return}
  setMessage('');engine.current?.setDaylightPlaying(false);engine.current?.setComparisonLocked(true);setCapture(snapshot);setSplit(50);
 };
 // High-resolution still of the current view, downloaded as PNG (named by view, date and time).
 const [exporting,setExporting]=useState(false);
 const exportStill=async()=>{
  const s=engine.current;if(!s||exporting)return;
  setExporting(true);setMessage('');
  try{
   const blob=await s.exportStill();
   if(!blob){setMessage('画面仍在调整，请稍候再出图。');return}
   const hh=Math.floor(state.hour),mm=Math.round((state.hour-hh)*60);
   const a=document.createElement('a');a.href=URL.createObjectURL(blob);
   a.download=`寺-${state.view}-${state.solar.date}-${String(hh).padStart(2,'0')}${String(mm).padStart(2,'0')}.png`;
   a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  }catch(e){console.error(e);setMessage('出图失败，请稍后再试。')}
  finally{setExporting(false)}
 };
 const full=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{setMessage('浏览器暂不支持全屏。')}};
 const nextPhoto=(delta:number)=>setPhoto(n=>(n+delta+photos.length)%photos.length);
 const stopJoy=()=>{setJoy({x:0,y:0});if(engine.current)engine.current.joy={x:0,y:0}};
 const moveJoy=(e:React.PointerEvent<HTMLDivElement>)=>{const r=e.currentTarget.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/32,y=(e.clientY-r.top-r.height/2)/32;const d=Math.hypot(x,y);if(d>1){x/=d;y/=d}setJoy({x,y});if(engine.current)engine.current.joy={x,y}};
 const altered=state.view==='section'?'沿中轴剖开 · 光照按完整建筑计算':!roof?'屋顶已隐藏':'';
 return <main className={`app ${capture?'comparing':''} ${dark?'dark':''} ${cover?'cover':''} ${filmShot?'film':''}`}>
  {filmShot&&<output className="film-status">{filmStatus}</output>}
  <header className="masthead">
   <button className="brand" onClick={toCover} aria-label="寺 · 光与空间，回到开篇"><span className="brand-mark">寺</span><span className="brand-name">光与空间</span></button>
   <p className="state-note" aria-live="polite">{altered}</p>
   <nav className="chapters" aria-label="章节">
    {(Object.keys(chapters) as Chapter[]).map(id=><button key={id} className="word" aria-current={chapter===id?'page':undefined} onClick={()=>enter(id)}>{chapters[id].title}</button>)}
   </nav>
   <div className="utilities">
    <button className="word small hide-mobile" onClick={()=>setModal('photos')}>原作</button>
    <button className="word small hide-mobile" onClick={exportStill} disabled={!ready||exporting}>{exporting?'出图中':'出图'}</button>
    <button className="word small" onClick={()=>setModal('info')}>说明</button>
    <button className="word small" onClick={()=>setModal('settings')}>设置</button>
    <button className="word small hide-mobile" onClick={full}>{fullscreen?'退出全屏':'全屏'}</button>
   </div>
  </header>
  <section className="frame" aria-label="三维空间">
   <div className="scene" ref={host}/>
   {title&&!cover&&<div className="intertitle" key={title.key} aria-hidden="true"><h2>{chapters[title.chapter].title}</h2><p>{chapters[title.chapter].line}</p></div>}
   <div className="cover-page" aria-hidden={!cover} inert={!cover||undefined}>
    <div className="cover-head">
     <h1><span className="cover-mark">寺</span><span className="cover-name">光与空间</span></h1>
     <p className="cover-lead">一座小寺，外壳刻着心经和万字纹。日光穿过字孔落在柱上，穿过屋顶落在佛身上。</p>
    </div>
    <div className="cover-foot">
     <nav className="cover-chapters" aria-label="进入章节">{CHAPTER_ORDER.map(id=><button key={id} onClick={()=>enter(id)} disabled={!ready}><strong>{chapters[id].title}</strong><span>{chapters[id].line}</span></button>)}</nav>
     <p className="cover-note">{ready?'根据原作 CAD 图纸与模型照片重建':'准备中'} · <button onClick={()=>setModal('photos')}>原作照片</button></p>
    </div>
   </div>
   {capture&&<><img className="comparison-image" src={capture.url} alt={`同一视角在 ${time(capture.hour)} 的光影`} style={{clipPath:`inset(0 ${100-split}% 0 0)`}}/><div className="comparison-line" style={{left:`${split}%`}}/><span className="comparison-label left">{time(capture.hour)}</span><span className="comparison-label right">{time(state.hour)}</span><label className="comparison-handle"><span className="sr-only">对照分界</span><input type="range" min="0" max="100" value={split} onChange={e=>setSplit(+e.target.value)}/></label></>}
   {state.mode==='walk'&&!capture&&<div className="joystick" role="application" aria-label="按住拖动以行走" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);moveJoy(e)}} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))moveJoy(e)}} onPointerUp={stopJoy} onPointerCancel={stopJoy}><i style={{transform:`translate(${joy.x*24}px,${joy.y*24}px)`}}/></div>}
   {!ready&&!error&&<div className="loading" role="status"><span className="spinner"/>{cover?'':'准备中'}</div>}
   {error&&<div className="error"><p>{error}</p><button className="word" onClick={()=>setModal('photos')}>查看原作照片</button></div>}
   {message&&<div className="notice" role="status">{message}<button className="word small" aria-label="关闭提示" onClick={()=>setMessage('')}><X size={13} strokeWidth={1.5}/></button></div>}
  </section>
  <footer className="controls" aria-label="视角与日照时间">
   <div className="views" role="group" aria-label="视角">
    {content.views.map(([id,label])=><button key={id} className="word" aria-pressed={state.view===id} onClick={()=>{choose(id);if(id==='section')changeTime(DEFAULT_SOLAR_NOON)}} disabled={!ready}>{label}</button>)}
    {state.view==='gallery'&&<button className="word muted-word" onClick={()=>engine.current?.toggleSeated()} disabled={!!capture}>{state.seated?'站起':'坐下'}</button>}
    <button className="word muted-word" onClick={()=>choose(state.view)}>复位</button>
   </div>
   <button className="word play" aria-label={state.daylightPlaying?'暂停日照时间':'播放日照时间'} onClick={()=>engine.current?.setDaylightPlaying(!state.daylightPlaying)} disabled={!ready}>{state.daylightPlaying?<Pause size={12} strokeWidth={1.5}/>:<Play size={12} strokeWidth={1.5}/>}<span>{state.daylightPlaying?'暂停':'播放'}</span><span className="rate-tag">{state.playbackRate}×</span></button>
   <div className="track">
    <label className="sr-only" htmlFor="daylight-time">当地时刻</label>
    <input id="daylight-time" type="range" min="0" max="23.999722" step="0.0002777778" value={state.hour} onChange={e=>changeTime(+e.target.value)} disabled={!ready} style={{'--p':`${state.hour/24*100}%`} as React.CSSProperties}/>
    <div className="ticks" aria-hidden="true">{[6,12,18].map(t=><span key={t} style={{left:`${t/24*100}%`}}>{t}</span>)}</div>
   </div>
   <div className="reading"><time>{time(state.hour)}</time>{!SEASONS.some(([d])=>d===state.solar.date)&&<button className="date" onClick={()=>setModal('settings')}>{day(state.solar.date)}</button>}</div>
   <div className="seasons" role="group" aria-label="季节">{SEASONS.map(([d,l])=><button key={d} className="word small" aria-pressed={state.solar.date===d} onClick={()=>setDate(d)}>{l}</button>)}<button className="word small" aria-pressed={state.altitude<-3} onClick={()=>changeTime(engine.current?.blueHour()??19)}>夜景</button></div>
   <button className={`word compare ${capture?'on':''}`} onClick={compare} disabled={!ready||state.view==='section'} aria-pressed={!!capture}>{capture?'结束对照':'对照'}</button>
  </footer>
  {modal&&<dialog ref={dialog} className={`sheet ${modal}`} onCancel={()=>setModal(null)} onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
   <div className="sheet-head"><h2>{modal==='photos'?'原作':modal==='settings'?'日照与显示':content.title}</h2><button className="icon" aria-label="关闭" onClick={()=>setModal(null)}><X size={20} strokeWidth={1.5}/></button></div>
   {modal==='photos'?<>
    <div className="photo-frame"><img src={base+(photo===9?'assets/drawing.png':`assets/reference-${photo+1}.jpg`)} alt={photos[photo]}/><button className="icon photo-prev" aria-label="上一张" onClick={()=>nextPhoto(-1)}><ArrowLeft size={18} strokeWidth={1.5}/></button><button className="icon photo-next" aria-label="下一张" onClick={()=>nextPhoto(1)}><ArrowRight size={18} strokeWidth={1.5}/></button></div>
    <p className="photo-caption"><span>{photos[photo]}</span><span>{photo+1} / 10</span></p>
    <div className="photo-thumbs">{photos.map((name,i)=><button key={name} aria-label={name} aria-pressed={photo===i} onClick={()=>setPhoto(i)}><img src={base+(i===9?'assets/thumbs/drawing.jpg':`assets/thumbs/reference-${i+1}.jpg`)} alt="" loading="lazy" decoding="async" width="320" height="213"/></button>)}</div>
   </>:modal==='settings'?<>
    <p className="muted">入口朝向取自作者图纸（心经入口为南立面）；纬度由屋顶开孔推算为北纬约 39°，作者已确认，以北京为例。</p>
    <p className="sun-reading">太阳高度 {state.altitude.toFixed(1)}°{state.altitude>0?` · 方位 ${state.azimuth.toFixed(1)}°`:' · 在地平线下'}</p>
    <form className="solar-form" onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);clearCapture();engine.current?.setSolar({date:String(data.get('date')),latitude:Number(data.get('latitude')),longitude:Number(data.get('longitude')),utcOffset:Number(data.get('utcOffset')),entranceBearing:Number(data.get('entranceBearing'))});setModal(null)}}>
     <label>日期<input type="date" name="date" defaultValue={state.solar.date} min="1900-01-01" max="2100-12-31" required/></label>
     <div className="fields"><label>纬度（北为正）<input type="number" name="latitude" min="-89.9" max="89.9" step="0.0001" defaultValue={state.solar.latitude} required/></label><label>经度（东为正）<input type="number" name="longitude" min="-180" max="180" step="0.0001" defaultValue={state.solar.longitude} required/></label><label>UTC 时差（小时）<input type="number" name="utcOffset" min="-12" max="14" step="0.25" defaultValue={state.solar.utcOffset} required/></label><label>入口朝向（度，0 为北）<input type="number" name="entranceBearing" min="0" max="359.9" step="0.1" defaultValue={state.solar.entranceBearing} required/></label></div>
     <button className="primary" type="submit">应用</button>
    </form>
    <div className="rate-setting" role="group" aria-label="季节"><span>季节</span>{SEASONS.map(([d,l])=><button key={d} className="word small" aria-pressed={state.solar.date===d} onClick={()=>setDate(d)}>{l}</button>)}</div>
    <div className="rate-setting" role="group" aria-label="播放倍率"><span>播放倍率</span>{[1,60,600].map(r=><button key={r} className="word small" aria-pressed={state.playbackRate===r} onClick={()=>engine.current?.setPlaybackRate(r)}>{r}×</button>)}</div>
    <div className="toggles">
     <label><input type="checkbox" checked={roof} onChange={e=>{clearCapture();setRoof(e.target.checked);engine.current?.setRoof(e.target.checked)}}/>显示屋顶</label>
     <label><input type="checkbox" checked={state.improvements} onChange={e=>{clearCapture();engine.current?.setImprovements(e.target.checked)}}/>显示设计建议（防护、扶手、楼梯玻璃顶、后角入口、雨水明渠）</label>
     <label><input type="checkbox" checked={reduced} onChange={e=>{setReduced(e.target.checked);engine.current?.setMotion(!e.target.checked)}}/>减少视角过渡动画</label>
    </div>
    <details className="fine"><summary>计算范围</summary><p>太阳位置按日期、地点、时区和朝向计算。柱面与玉佛接收建筑实际遮挡后的直射光，没有另加发光或旋转图案。太阳视直径取约 0.53°，按遮挡距离近似光影边缘。天空与室内补光按实际遮挡衰减，反弹光为估计值。外部场地为示意，不在原图中。</p><a href="https://gml.noaa.gov/grad/solcalc/calcdetails.html" target="_blank" rel="noreferrer">太阳位置计算依据 · NOAA</a></details>
   </>:<div className="info">
    <p className="lead">{content.body}</p>
    {winterStudy&&<p className="muted">冬至前后，太阳低，10:00—14:00 字影约覆盖柱高的 85%—95%；春分时只覆盖下部约一半。</p>}
    {chapter==='sutra'&&<><p className="muted">春分时，字影只覆盖柱子下部约一半，高度全天不变，只沿柱面横向移动。冬季白天（11 月下旬至 1 月下旬）太阳低，字影接近满柱。</p>
     <p className="season-links"><button className="word" onClick={()=>{const s=engine.current;if(!s)return;clearCapture();s.setSolar({...state.solar,date:'2026-12-21'});s.setSun(10);s.setView('columns');s.emit();setModal(null)}}>看冬至满柱（12 月 21 日 10:00）→</button>
     {state.solar.date!=='2026-03-20'&&<button className="word" onClick={()=>{const s=engine.current;if(!s)return;clearCapture();s.setSolar({...state.solar,date:'2026-03-20'});s.setSun(DEFAULT_SOLAR_NOON);s.emit();setModal(null)}}>回到春分正午 →</button>}</p></>}
    {chapter==='buddha'&&<p className="muted">按作者确认的地点（北纬约 39°、入口朝南），春分正午 12:05—12:46，屋顶图案完整落在佛身上。</p>}
    {chapter==='space'?<SpacePlan improvements={state.improvements}/>:<><button className="primary" onClick={playStudy} disabled={!ready}><Play size={16} strokeWidth={1.5}/>看一次光影经过<span className="muted">09:00—15:00 · 600×</span></button><LightPath buddha={chapter==='buddha'}/></>}
    <ul className="help">
     <li>拖动时间轴看光影；「对照」固定视角，比较前后两个时刻。</li>
     <li>全貌、屋顶、剖视可拖动环绕、滚轮缩放；其余视角拖动转向，电脑用 WASD 或方向键行走，手机用摇杆。</li>
     <li>{state.solar.date} · 北纬 {state.solar.latitude}° · 入口 {state.solar.entranceBearing}°{state.solarEdited?'（输入参数）':'（作者确认）'}</li>
    </ul>
    <button className="word" onClick={()=>setModal('photos')}>原作照片与图纸 →</button>
   </div>}
  </dialog>}
 </main>
}
createRoot(document.getElementById('root')!).render(<App/>);

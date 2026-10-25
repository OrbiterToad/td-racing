'use strict';

// World units are centimetre-like art units. Simulation always runs at 120 Hz.
const CFG = { road: 86, runoff: 122, wall: 160, radius: 22, step: 1 / 120 };
let BEST_KEY = 'apex-juniper-corner-oil-v6';
// Short breathing spaces connect bottom esses, the infield hairpin, upper
// chicanes, and a sequence of alternating left-side corners.
const juniperPoints = [
  [-850,1100],[-350,1600],[250,650],[850,1600],[1400,1100],[1550,800],
  [1350,500],[1500,200],[1450,-50],[1150,-200],[700,100],[300,90],
  [150,-190],[450,-475],[750,-650],[1050,-550],[1250,-900],
  [1050,-1250],[650,-1650],[100,-850],[-450,-1650],[-950,-1150],
  [-1500,-700],[-1200,-350],[-1510,0],
  [-1250,300],[-1330,650],[-1050,800]
];
const MAPS = {
  juniper: { id:'juniper',name:'Juniper Raceway',label:'WOODLAND / TECHNICAL',subtitle:'Commit to the esses. Watch for oil.',description:'Deep esses, green woodland, and three oil slicks before demanding corners.',temperature:'24°C',gripLabel:'OIL HAZARDS',bestKey:'apex-juniper-corner-oil-v6',accent:'#d5f578',road:86,runoff:122,wall:160,points:juniperPoints,patches:[{progress:72/1120,corner:2,lateral:-20,length:65,width:42,type:'OIL'},{progress:460/1120,corner:12,lateral:-22,length:70,width:40,type:'OIL'},{progress:751/1120,corner:19,lateral:-18,length:58,width:43,type:'OIL'}] },
  canyon: { id:'canyon',name:'Desert Canyon',label:'DESERT / EXPERT',subtitle:'Read the rock. Earn the exit.',description:'Tight sandstone passes, sharper bends, and four sand drifts across the asphalt.',temperature:'38°C',gripLabel:'DUSTY',bestKey:'apex-desert-canyon-sand-v2',accent:'#ffc185',road:70,runoff:96,wall:126,patches:[{progress:.10,lateral:-14,length:68,width:40,type:'SAND PATCH'},{progress:.34,lateral:15,length:70,width:41,type:'SAND PATCH'},{progress:.66,lateral:-12,length:75,width:42,type:'SAND PATCH'},{progress:.85,lateral:16,length:65,width:38,type:'SAND PATCH'}],points:[
    [-850,1150],[-300,1450],[200,700],[700,1400],[1200,1000],[1450,550],
    [1100,150],[650,500],[200,300],[50,-100],[500,-400],[1050,-100],
    [1450,-500],[1200,-1050],[650,-1300],[150,-650],[-350,-1350],
    [-950,-1100],[-1350,-600],[-850,-150],[-1400,350],[-1050,850]
  ].map(p=>p.map(v=>v*.86)) },
  alpine: { id:'alpine',name:'Alpine Pass',label:'ALPINE / SWITCHBACKS',subtitle:'Climb the hairpins. Respect the ice.',description:'Linked mountain hairpins, winding ledge roads, and just three isolated ice patches.',temperature:'−4°C',gripLabel:'COLD / ICE',bestKey:'apex-alpine-switchbacks-v2',accent:'#a9d8f4',road:78,runoff:110,wall:145,patches:[{progress:.14,lateral:-16,length:75,width:44,type:'ICE'},{progress:.48,lateral:16,length:80,width:46,type:'ICE'},{progress:.78,lateral:-14,length:70,width:44,type:'ICE'}],points:[
    [-1400,1450],[-850,1750],[-300,950],[250,1750],[800,950],[1300,1325],
    [1550,1050],[1450,650],[950,400],[450,1000],[-50,200],[-550,1000],
    [-1050,350],[-1400,450],[-1650,50],[-1450,-350],[-950,-600],
    [-450,100],[50,-700],[550,100],[1050,-600],[1450,-500],[1650,-950],
    [1350,-1400],[850,-1600],[350,-900],[-150,-1700],[-650,-950],
    [-1150,-1600],[-1650,-1400],[-2150,-1000],[-1800,-500],[-2550,100],
    [-1800,700],[-2500,1300],[-1900,1800]
  ] },
  rallycross:{id:'rallycross',name:'Ridgeway Rallycross',label:'RALLYCROSS / MIXED SURFACE',subtitle:'Grip, slide, grip. Find the rhythm.',description:'Packed dirt, fast asphalt, and a technical infield. Built for the Offroad.',temperature:'19°C',gripLabel:'ASPHALT / DIRT',bestKey:'apex-ridgeway-rallycross-v1',accent:'#efce89',road:82,runoff:108,wall:132,patches:[],points:[
    [-650,650],[50,650],[650,400],[850,-100],[500,-450],[50,-300],
    [-150,-600],[200,-950],[700,-1000],[900,-1400],[400,-1650],
    [-150,-1250],[-600,-1550],[-1100,-1200],[-900,-700],[-1300,-250],[-1050,300]
  ].map(p=>p.map(v=>v*.9))}
};
const VEHICLES={
  clubsport:{id:'clubsport',name:'Clubsport R',tag:'BALANCED / RWD',description:'The original. Progressive slides and a predictable balance.',sprite:1,power:242,ceiling:620,drag:.00056,grip:1,steering:1,wheelbase:46,brakes:330,offroad:1,length:44,width:24,bars:[.75,.75,.75]},
  sprint:{id:'sprint',name:'Sprint GT',tag:'FAST / RWD',description:'More power and speed. Brake early and manage the rear.',sprite:5,power:275,ceiling:700,drag:.00052,grip:.94,steering:.92,wheelbase:49,brakes:350,offroad:1.08,length:48,width:25,bars:[.97,.66,.58]},
  rally:{id:'rally',name:'Offroad',tag:'GRIPPY / AWD',description:'Nimble steering, more grip, and better recovery off the road.',sprite:4,power:232,ceiling:585,drag:.00060,grip:1.1,steering:1.1,wheelbase:43,brakes:335,offroad:.7,length:44,width:25,bars:[.66,.93,.96]}
};
const PAINTS={red:{name:'Ember',hex:'#eb782d'},blue:{name:'Ocean',hex:'#3299cb'},green:{name:'Forest',hex:'#36bb72'},yellow:{name:'Sunburst',hex:'#edc34b'},black:{name:'Graphite',hex:'#66666a'}};
let activeCar=VEHICLES.clubsport,paint='red',pickerMode='tracks',pendingTrack='juniper',pendingCar='clubsport',pendingPaint='red',pickerWasPaused=false;
let activeMap=MAPS.juniper,controlPoints=activeMap.points;
const track = [], keys = new Set(), skidmarks = [], particles = [];
const spatial={size:240,cells:new Map(),visited:new Uint32Array(0),stamp:0};
const skidBatches=Array.from({length:12},()=>[]);
let skidClock=0,lastSkid=[null,null];
const car = { x:0,y:0,vx:0,vy:0,angle:0,yaw:0,steer:0,surface:'ASPHALT',slip:0,throttle:0,brake:0,slickTime:0 };
const camera = {x:0,y:0,zoom:1};
const race = {started:false,time:0,last:null,best:null,lap:1,next:1,previous:0,invalid:false,travel:0,stuck:0};
const timing={splits:[],best:[],last:[],sectorStart:0,delta:null,flashTime:0,flashLabel:'',flashDelta:null};
const feedback={impact:0,impactCooldown:0,rumble:0};
let audioLayers=null;
let accumulator=0, paused=false, toastTimer=0, movingTime=0, worldCanvas, worldCtx, ctx, lastHUD=0;
let carArt, treeArt, audioCtx, engine, engineGain, soundEnabled=false, mapCtx;
let trackBounds, worldBounds;
const $ = id => document.getElementById(id);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const lerpTo = (a,b,t) => a+(b-a)*t;
function seededRandom(seed) { return () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; }; }

function narrowFactor(progress) {
  if(activeMap.id!=='canyon')return 1;
  let squeeze=0;
  for(const [start,end] of [[.15,.26],[.52,.64]]){
    const t=clamp((progress-start)/.025,0,1)*clamp((end-progress)/.025,0,1);
    squeeze=Math.max(squeeze,t*t*(3-2*t));
  }
  return 1-.14*squeeze;
}
function widthAt(kind,progress){return CFG[kind]*narrowFactor(progress);}
function bestKeyFor(map=activeMap,vehicle=activeCar){return map.bestKey+(vehicle.id==='clubsport'?'':'-'+vehicle.id);}
function configureCar(id,color=paint){if(!Object.hasOwn(VEHICLES,id)||!Object.hasOwn(PAINTS,color))return false;activeCar=VEHICLES[id];paint=color;BEST_KEY=bestKeyFor();return true;}
function carImagePath(id=activeCar.id,color=paint){return 'assets/kenney/PNG/Cars/car_'+color+'_'+VEHICLES[id].sprite+'.png';}
function loadCarArt(){carArt=new Image();carArt.src=carImagePath();}
function readBest(){race.best=null;timing.best=[];try{const saved=JSON.parse(localStorage.getItem(BEST_KEY));if(typeof saved==='number'&&saved>0&&Number.isFinite(saved))race.best=saved;const session=JSON.parse(localStorage.getItem(BEST_KEY+'-sectors-v1'));if(validSession(session,race.best))timing.best=session.sectors.slice();}catch(_){}}
function validSession(session,best){
  return !!session&&session.version===1&&Number.isFinite(best)&&Number.isFinite(session.time)&&Math.abs(session.time-best)<.02&&Array.isArray(session.sectors)&&session.sectors.length===4&&session.sectors.every(t=>Number.isFinite(t)&&t>0)&&Math.abs(session.sectors.reduce((a,b)=>a+b,0)-best)<.03;
}
function beginLap(){timing.splits=[];timing.sectorStart=0;}
function configureTrack(id){
  if(!Object.hasOwn(MAPS,id))return false;
  activeMap=MAPS[id];controlPoints=activeMap.points;BEST_KEY=bestKeyFor();
  for(const key of ['road','runoff','wall'])CFG[key]=activeMap[key];
  makeTrack();return true;
}
function changeTrack(id,announce=true){
  if(!configureTrack(id))return;
  keys.clear();skidmarks.length=0;particles.length=0;skidClock=0;lastSkid=[null,null];accumulator=0;movingTime=0;lastHUD=0;
  Object.assign(race,{started:false,time:0,last:null,lap:1,next:1,previous:0,invalid:false,travel:0,stuck:0});timing.last=[];timing.flashTime=0;feedback.impact=0;beginLap();readBest();
  Object.assign(car,{surface:'ASPHALT',throttle:0,brake:0,slickTime:0});recover(false);
  buildWorld();camera.x=car.x;camera.y=car.y;camera.zoom=desiredZoom();
  $('open-tracks').textContent=activeMap.name+' ▾';$('track-label').textContent=activeMap.label;$('track-title').textContent=activeMap.name;$('track-subtitle').textContent=activeMap.subtitle;
  $('temperature').textContent=activeMap.temperature;$('grip-label').textContent=activeMap.gripLabel;
  document.documentElement.style.setProperty('--lime',activeMap.accent);$('game').style.background=activeMap.id==='canyon'?'#d5a36d':activeMap.id==='alpine'?'#dbe6e3':'#8ba274';
  $('hint').style.opacity='1';$('hint').textContent=activeMap.id==='canyon'?'W to drive · Brake early. Avoid the sand drifts. Mind the narrow passes.':activeMap.id==='alpine'?'W to drive · Three ice patches. Ease off and keep steering smooth.':activeMap.id==='rallycross'?'W to drive · Dirt needs a slide. Asphalt needs a clean exit.':'W to drive · Find your apex. Avoid the dark oil slicks.';
  try{localStorage.setItem('apex-selected-track',id);}catch(_){}
  setPaused(false);updateHUD();drawMinimap();if(announce)notify(activeMap.name.toUpperCase()+' · '+(id==='canyon'?'EXPERT CIRCUIT':'FLOW CIRCUIT'));
}

function sampleCurve(points,steps=40){
  const samples=[];
  for(let i=0;i<points.length;i++) {
    const p0=points[(i+points.length-1)%points.length],p1=points[i],p2=points[(i+1)%points.length],p3=points[(i+2)%points.length];
    for(let j=0;j<steps;j++) {
      const t=j/steps,t2=t*t,t3=t2*t;
      // Uniform cubic B-splines keep curvature continuous through the linked bends.
      const spline=k=>(p0[k]*(1-t)**3+p1[k]*(3*t3-6*t2+4)+p2[k]*(-3*t3+3*t2+3*t+1)+p3[k]*t3)/6;
      samples.push({x:spline(0),y:spline(1),s:0});
    }
  }
  return samples;
}
function makeTrack() {
  track.length=0;track.push(...sampleCurve(controlPoints));
  let distance=0;
  for(let i=0;i<track.length;i++) {
    const p=track[i],q=track[(i+1)%track.length];
    const dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy);
    p.tx=dx/len;p.ty=dy/len;p.nx=-p.ty;p.ny=p.tx;p.s=distance;distance+=len;
  }
  track.totalLength=distance;
  buildSpatialIndex();
  const xs=track.map(p=>p.x),ys=track.map(p=>p.y);
  trackBounds={left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)};
  const margin=600;
  worldBounds={x:Math.floor(trackBounds.left-margin),y:Math.floor(trackBounds.top-margin),width:Math.ceil(trackBounds.right-trackBounds.left+margin*2),height:Math.ceil(trackBounds.bottom-trackBounds.top+margin*2)};
}

function buildSpatialIndex(){
  spatial.cells.clear();spatial.visited=new Uint32Array(track.length);spatial.stamp=0;const size=spatial.size;
  for(let i=0;i<track.length;i++){const a=track[i],b=track[(i+1)%track.length];for(let x=Math.floor(Math.min(a.x,b.x)/size);x<=Math.floor(Math.max(a.x,b.x)/size);x++)for(let y=Math.floor(Math.min(a.y,b.y)/size);y<=Math.floor(Math.max(a.y,b.y)/size);y++){const key=x+','+y;if(!spatial.cells.has(key))spatial.cells.set(key,[]);spatial.cells.get(key).push(i);}}
}
function nearest(x,y) {
  let bestD2=Infinity,bestI=0,bestT=0,bestX=0,bestY=0;
  if(++spatial.stamp>=4294967295){spatial.visited.fill(0);spatial.stamp=1;}
  const stamp=spatial.stamp,size=spatial.size,cx=Math.floor(x/size),cy=Math.floor(y/size);
  function check(i){if(spatial.visited[i]===stamp)return;spatial.visited[i]=stamp;const a=track[i],b=track[(i+1)%track.length],dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy),0,1),px=a.x+t*dx,py=a.y+t*dy,d2=(x-px)**2+(y-py)**2;if(d2<bestD2||(d2===bestD2&&i<bestI)){bestD2=d2;bestI=i;bestT=t;bestX=px;bestY=py;}}
  function cell(gx,gy){const indices=spatial.cells.get(gx+','+gy);if(indices)for(const i of indices)check(i);}
  for(let radius=0;radius<=8;radius++){
    if(radius===0)cell(cx,cy);else{for(let dx=-radius;dx<=radius;dx++){cell(cx+dx,cy-radius);cell(cx+dx,cy+radius);}for(let dy=1-radius;dy<radius;dy++){cell(cx-radius,cy+dy);cell(cx+radius,cy+dy);}}
    // Unvisited segments lie outside this square, so this is an exact lower bound.
    const bound=Math.min(x-(cx-radius)*size,(cx+radius+1)*size-x,y-(cy-radius)*size,(cy+radius+1)*size-y);
    if(bestD2<=bound*bound)break;
    if(radius===8)for(let i=0;i<track.length;i++)check(i);
  }
  const a=track[bestI],distance=Math.sqrt(bestD2),side=(x-bestX)*a.nx+(y-bestY)*a.ny>=0?1:-1;
  return {d2:bestD2,x:bestX,y:bestY,i:bestI,t:bestT,tx:a.tx,ty:a.ty,nx:a.nx,ny:a.ny,progress:(bestI+bestT)/track.length,distance,side};
}

function surfaceAt(n) {
  if(n.distance<=widthAt('road',n.progress)+7){for(const patch of activeMap.patches){if(inPatch(n,patch))return patch.type;}return rallySurface(n.progress);}
  if(n.distance<widthAt('runoff',n.progress)) return 'RUNOFF';
  if(activeMap.id==='canyon')return 'SAND';
  if(activeMap.id==='alpine')return 'SNOW';
  // Gravel at the outer edge of fast turns; grass covers the remaining verge.
  return ((n.progress>.12&&n.progress<.38)||(n.progress>.51&&n.progress<.77)) ? 'GRAVEL' : 'GRASS';
}
function dirtProgress(progress){return (progress>=.14&&progress<.36)||(progress>=.57&&progress<.79);}
function rallySurface(progress){return activeMap.id==='rallycross'&&dirtProgress(progress)?'DIRT':'ASPHALT';}
function patchFrame(patch){const p=track[Math.floor(patch.progress*track.length)%track.length];return {x:p.x+p.nx*patch.lateral,y:p.y+p.ny*patch.lateral,tx:p.tx,ty:p.ty};}
function inPatch(n,patch){
  const p=patchFrame(patch),x=n.x+n.nx*n.distance*n.side-p.x,y=n.y+n.ny*n.distance*n.side-p.y;
  const u=(x*p.tx+y*p.ty)/patch.length,v=(-x*p.ty+y*p.tx)/patch.width;
  return Math.hypot(u,v)<=patchRadius(patch,Math.atan2(v,u));
}
function patchRadius(patch,angle){return 1+.065*Math.sin(angle*3+patch.progress*31)+.045*Math.sin(angle*7+patch.progress*19);}
function patchOutline(c,patch,scale=1){c.beginPath();for(let i=0;i<72;i++){const a=i/72*Math.PI*2,r=patchRadius(patch,a)*scale,x=Math.cos(a)*patch.length*r,y=Math.sin(a)*patch.width*r;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();}

function initPicker(){
  $('open-tracks').onclick=()=>openPicker('tracks');$('open-garage').onclick=()=>openPicker('garage');
  $('picker-close').onclick=()=>closePicker();$('picker-apply').onclick=applyPicker;
  $('selection-dialog').addEventListener('cancel',e=>{e.preventDefault();closePicker();});
  $('selection-dialog').addEventListener('click',e=>{if(e.target===$('selection-dialog'))closePicker();});
  syncCarHUD();
}
function syncCarHUD(){$('car-name').textContent=activeCar.name.toUpperCase();$('car-drive').textContent=activeCar.id==='rally'?'AWD':'RWD';$('open-tracks').setAttribute('aria-label','Tracks: '+activeMap.name);}
function openPicker(mode){
  pickerMode=mode;pendingTrack=activeMap.id;pendingCar=activeCar.id;pendingPaint=paint;pickerWasPaused=paused;
  setPaused(true);document.body.classList.add('choosing');renderPicker();$('selection-dialog').showModal();
}
function closePicker(resume=false){$('selection-dialog').close();document.body.classList.remove('choosing');setPaused(resume?false:pickerWasPaused);}
function renderPicker(){
  const tracks=pickerMode==='tracks';$('picker-title').textContent=tracks?'Find your next apex.':'Make it yours.';
  $('picker-eyebrow').textContent=tracks?'THE CIRCUIT COLLECTION':'THE CLUB GARAGE';
  $('picker-description').textContent=tracks?'Four landscapes. Four different challenges. Records for '+activeCar.name+'.':'Choose your handling, then your paint. Changing cars starts a fresh run.';
  $('picker-apply').textContent=tracks?(pendingTrack===activeMap.id?'CONTINUE ON TRACK →':'DRIVE '+MAPS[pendingTrack].name.toUpperCase()+' →'):'APPLY & DRIVE →';
  $('picker-footnote').textContent=tracks?'Each track and car has its own saved personal best.':'Paint is cosmetic. Your car and color are remembered.';
  if(tracks){
    $('picker-content').innerHTML='<div class="choice-grid">'+Object.values(MAPS).map((map,i)=>{
      let best=null;try{const value=JSON.parse(localStorage.getItem(bestKeyFor(map,activeCar)));if(typeof value==='number'&&value>0&&Number.isFinite(value))best=value;}catch(_){}
      const selected=map.id===pendingTrack;
      return '<button class="track-choice '+(selected?'selected':'')+'" data-track="'+map.id+'" aria-label="Choose '+map.name+'" aria-pressed="'+selected+'" style="--card-accent:'+map.accent+'"><span class="choice-number">0'+(i+1)+' / '+(map.id==='juniper'?'WOODLAND':map.id==='canyon'?'DESERT':map.id==='rallycross'?'RALLYCROSS':'ALPINE')+'</span><span class="choice-check">'+(selected?'✓':'↗')+'</span><canvas id="preview-'+map.id+'" width="480" height="270" aria-label="'+map.name+' track layout"></canvas><span class="choice-body"><span class="choice-tag">'+map.label+'</span><strong>'+map.name+'</strong><span class="choice-description">'+map.description+'</span><span class="choice-details"><span>'+map.temperature+' · '+(map.id==='canyon'?'NARROW PASSES':map.id==='alpine'?'3 ICE PATCHES':map.id==='rallycross'?'ASPHALT + DIRT':'3 OIL SLICKS')+'</span><span class="choice-best">BEST '+formatTime(best)+'</span></span></span></button>';
    }).join('')+'</div>';
    for(const map of Object.values(MAPS)){drawTrackPreview($('preview-'+map.id),map);document.querySelector('[data-track="'+map.id+'"]').onclick=()=>{pendingTrack=map.id;renderPicker();document.querySelector('[data-track="'+map.id+'"]').focus();};}
  }else{
    $('picker-content').innerHTML='<div class="choice-grid garage-grid">'+Object.values(VEHICLES).map(vehicle=>{
      const selected=vehicle.id===pendingCar;
      return '<button class="car-choice '+(selected?'selected':'')+'" data-car="'+vehicle.id+'" aria-label="Choose '+vehicle.name+'" aria-pressed="'+selected+'"><span class="choice-check">'+(selected?'✓':'↗')+'</span><span class="car-platform"><img src="'+carImagePath(vehicle.id,pendingPaint)+'" alt="'+vehicle.name+' in '+PAINTS[pendingPaint].name+' paint"></span><span class="choice-body"><span class="choice-tag">'+vehicle.tag+'</span><strong>'+vehicle.name+'</strong><span class="choice-description">'+vehicle.description+'</span><span class="car-stats">'+['PACE','HANDLING','OFF ROAD'].map((label,i)=>'<span>'+label+'<i><b style="width:'+vehicle.bars[i]*100+'%"></b></i></span>').join('')+'</span></span></button>';
    }).join('')+'</div><div class="paint-row"><span>PAINT / <b>'+PAINTS[pendingPaint].name+'</b></span><div class="swatches">'+Object.entries(PAINTS).map(([id,color])=>'<button class="swatch '+(id===pendingPaint?'selected':'')+'" data-paint="'+id+'" aria-label="Paint '+color.name+'" aria-pressed="'+(id===pendingPaint)+'" style="--paint:'+color.hex+'">'+(id===pendingPaint?'✓':'')+'</button>').join('')+'</div></div>';
    for(const vehicle of Object.values(VEHICLES))document.querySelector('[data-car="'+vehicle.id+'"]').onclick=()=>{pendingCar=vehicle.id;renderPicker();document.querySelector('[data-car="'+vehicle.id+'"]').focus();};
    for(const id of Object.keys(PAINTS))document.querySelector('[data-paint="'+id+'"]').onclick=()=>{pendingPaint=id;renderPicker();document.querySelector('[data-paint="'+id+'"]').focus();};
  }
}
function applyPicker(){
  if(pickerMode==='tracks'){if(pendingTrack!==activeMap.id)changeTrack(pendingTrack,false);}
  else{
    const changed=pendingCar!==activeCar.id;configureCar(pendingCar,pendingPaint);loadCarArt();
    try{localStorage.setItem('apex-garage',JSON.stringify({car:activeCar.id,paint}));}catch(_){}
    if(changed)changeTrack(activeMap.id,false);syncCarHUD();
  }
  closePicker(true);syncCarHUD();notify(activeMap.name.toUpperCase()+' · '+activeCar.name.toUpperCase());
}
function drawTrackPreview(canvas,map){
  const c=canvas.getContext('2d'),points=sampleCurve(map.points,16),xs=points.map(p=>p.x),ys=points.map(p=>p.y),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys),scale=Math.min(380/(right-left),205/(bottom-top));
  c.fillStyle=map.id==='canyon'?'#694a37':map.id==='alpine'?'#52686e':map.id==='rallycross'?'#5b5b3e':'#354b3d';c.fillRect(0,0,480,270);
  const rand=seededRandom(map.id==='canyon'?513:map.id==='alpine'?719:318);
  for(let i=0;i<24;i++){c.fillStyle=map.id==='canyon'?'#bf80572b':map.id==='alpine'?'#d6ebe324':'#a5c78516';c.beginPath();c.ellipse(rand()*480,rand()*270,10+rand()*45,8+rand()*30,rand()*6.28,0,6.28);c.fill();}
  c.save();c.translate(240,135);c.scale(scale,scale);c.translate(-(left+right)/2,-(top+bottom)/2);
  ribbon(c,'#12202166',20/scale,points);ribbon(c,map.accent,9/scale,points);ribbon(c,'#243435',5/scale,points);
  if(map.id==='rallycross'){c.strokeStyle='#d1a873';c.lineWidth=5/scale;for(let i=0;i<points.length;i++){if(!dirtProgress(i/points.length))continue;const p=points[i],q=points[(i+1)%points.length];c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke();}}
  for(const patch of map.patches){const p=points[Math.floor(patch.progress*points.length)];c.fillStyle=patch.type==='ICE'?'#c7f6ff':patch.type==='OIL'?'#b8a4f9':'#efb571';c.beginPath();c.arc(p.x,p.y,3.2/scale,0,6.28);c.fill();}
  c.fillStyle='#fff5dc';const start=points[0];c.beginPath();c.arc(start.x,start.y,4/scale,0,6.28);c.fill();c.restore();
}

function setup() {
  const host=$('game'),canvas=createCanvas(host.clientWidth,host.clientHeight);
  canvas.parent(host);pixelDensity(Math.min(window.devicePixelRatio||1,2));ctx=drawingContext;
  try{const saved=JSON.parse(localStorage.getItem('apex-garage'));if(saved)configureCar(saved.car,saved.paint);}catch(_){}
  loadCarArt();
  treeArt=new Image();treeArt.onload=()=>{if(track.length)buildWorld();};treeArt.src='assets/tree-top.png';
  mapCtx=$('minimap').getContext('2d');
  let initial='juniper';try{const saved=localStorage.getItem('apex-selected-track');if(Object.hasOwn(MAPS,saved))initial=saved;}catch(_){}
  changeTrack(initial,false);initPicker();
  $('pause').onclick=()=>setPaused(!paused);$('resume').onclick=()=>setPaused(false);$('sound').onclick=toggleSound;
  window.addEventListener('keydown',e=>{
    if($('selection-dialog').open)return;
    if(['KeyW','KeyA','KeyS','KeyD','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
    keys.add(e.code);if(e.repeat)return;
    if(e.code==='KeyR')recover(true);if(e.code==='Escape'||e.code==='KeyP')setPaused(!paused);
  });
  window.addEventListener('keyup',e=>keys.delete(e.code));
  window.addEventListener('blur',()=>{keys.clear();setPaused(true);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();setPaused(true);}});
  updateHUD();
}

function setPaused(value) {paused=value;keys.clear();accumulator=0;$('pause-screen').classList.toggle('open',paused);$('pause').textContent=paused?'▶ Resume':'Ⅱ Pause';if(engineGain)engineGain.gain.setTargetAtTime(paused?0:.025,audioCtx.currentTime,.05);}
function notify(message) {$('toast').textContent=message;$('toast').classList.add('visible');toastTimer=3.5;}
function recover(showMessage=true) {
  const n=track.length?nearest(car.x,car.y):null;
  const p=track[showMessage?n.i:track.length-8];
  Object.assign(car,{x:p.x,y:p.y,vx:0,vy:0,angle:Math.atan2(p.ty,p.tx),yaw:0,steer:0,slip:0,slickTime:0});
  race.stuck=0;
  lastSkid=[null,null];skidClock=0;
  if(showMessage){race.invalid=true;timing.delta=null;notify('CAR RECOVERED · Cross the line to start a fresh lap');}
  race.previous=nearest(car.x,car.y).progress;
}

function desiredZoom(){return clamp(Math.min(width/1050,height/760),.55,1.12);}
function windowResized(){const h=$('game');resizeCanvas(h.clientWidth,h.clientHeight);}

function simulate(dt) {
  feedback.impact*=Math.exp(-7*dt);feedback.impactCooldown=Math.max(0,feedback.impactCooldown-dt);timing.flashTime=Math.max(0,timing.flashTime-dt);
  const n=nearest(car.x,car.y),surface=surfaceAt(n);car.surface=surface;
  car.slickTime=surface==='OIL'?1.15:Math.max(0,car.slickTime-dt);
  const fx=Math.cos(car.angle),fy=Math.sin(car.angle),rx=-fy,ry=fx;
  let forward=car.vx*fx+car.vy*fy,lateral=car.vx*rx+car.vy*ry;
  const speed=Math.hypot(car.vx,car.vy),gas=keys.has('KeyW')||keys.has('ArrowUp'),braking=keys.has('KeyS')||keys.has('ArrowDown'),hand=keys.has('Space');
  const steering=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
  car.steer=lerpTo(car.steer,steering,1-Math.exp(-9*dt));
  car.throttle=gas?1:0;car.brake=braking||hand?1:0;
  const offroad=['GRASS','GRAVEL','SAND','SAND PATCH','SNOW'].includes(surface);
  const baseGrip=surface==='DIRT'?.62:surface==='ICE'?.13:surface==='OIL'?.12:surface==='SAND PATCH'?.48:surface==='SAND'?.32:surface==='SNOW'?.4:surface==='GRASS'?.58:surface==='GRAVEL'?.43:surface==='RUNOFF'?.9:activeMap.id==='canyon'?.92:activeMap.id==='alpine'?.95:1;
  const loose=offroad||surface==='DIRT';
  const oilGrip=1-.8*clamp(car.slickTime/1.15,0,1),grip=baseGrip*activeCar.grip*oilGrip;
  let acceleration=0;
  if(gas)acceleration+=forward<-8?activeCar.brakes:activeCar.power*(1-clamp(forward/activeCar.ceiling,0,.93));
  if(braking)acceleration+=forward>8?-activeCar.brakes:-95*(1-clamp(-forward/115,0,1));
  if(hand&&Math.abs(forward)>2)acceleration-=Math.sign(forward)*105;
  if(surface==='ICE')acceleration*=.3;
  if(surface==='OIL')acceleration*=.55;
  // Aerodynamic drag plus surface-dependent rolling resistance.
  acceleration-=forward*.12+forward*Math.abs(forward)*activeCar.drag;
  if(offroad)acceleration-=forward*(surface==='SAND'?1.4:surface==='SAND PATCH'?.85:surface==='SNOW'?.85:surface==='GRAVEL'?1.15:.58)*activeCar.offroad;
  if(surface==='DIRT')acceleration-=forward*.23*activeCar.offroad;
  if(!gas&&!braking&&Math.abs(forward)<3)forward=0;
  forward+=acceleration*dt;
  const steeringAngle=car.steer*(.52/(1+Math.abs(forward)/190))*activeCar.steering;
  const targetYaw=forward/activeCar.wheelbase*Math.tan(steeringAngle)*(hand?1.42:1);
  car.yaw=lerpTo(car.yaw,targetYaw,1-Math.exp(-(hand?5.2:8)*dt));
  // Friction has a finite lateral acceleration budget, so excessive speed breaks traction.
  const availableGrip=(hand?105:420)*grip*(braking?.83:1);
  const correction=clamp(-lateral*(hand?2.1:9.5)*grip,-availableGrip,availableGrip)*dt;
  lateral+=correction;
  car.vx=fx*forward+rx*lateral;car.vy=fy*forward+ry*lateral;
  car.angle+=car.yaw*dt;
  const prevX=car.x,prevY=car.y;
  car.x+=car.vx*dt;car.y+=car.vy*dt;
  // Resolve the car's oriented box against both continuous hard boundaries.
  const after=nearest(car.x,car.y),ax=Math.cos(car.angle),ay=Math.sin(car.angle);
  const support=Math.abs(ax*after.nx+ay*after.ny)*activeCar.length/2+Math.abs(-ay*after.nx+ax*after.ny)*activeCar.width/2;
  const limit=widthAt('wall',after.progress)-6-support;
  if(after.distance>limit) {
    const nx=after.nx*after.side,ny=after.ny*after.side;
    car.x=after.x+nx*limit;car.y=after.y+ny*limit;
    const impact=car.vx*nx+car.vy*ny;
    if(impact>0){car.vx-=nx*impact*1.26;car.vy-=ny*impact*1.26;car.vx*=.84;car.vy*=.84;car.yaw*=.4;if(impact>65){burst(car.x+nx*17,car.y+ny*17,'spark',7);triggerImpact(impact);}}
  }
  car.slip=Math.abs(lateral);
  const leavingMarks=speed>45&&((Math.abs(lateral)>23)||(hand)||(braking&&forward>110));
  if(leavingMarks) {
    skidClock+=dt;
    if(skidClock>=1/45){skidClock%=1/45;for(const side of [-1,1]){
      const index=side===-1?0:1,x=car.x-ax*13-ay*side*9,y=car.y-ay*13+ax*side*9,previous=lastSkid[index];
      skidmarks.push({x,y,px:previous?previous.x:x-(car.x-prevX),py:previous?previous.y:y-(car.y-prevY),life:26,alpha:clamp(Math.abs(lateral)/100,.15,.65),loose});lastSkid[index]={x,y};
    }}
    if(Math.random()<dt*17)burst(car.x-ax*19,car.y-ay*19,loose?'dust':'smoke',1);
  } else{skidClock=0;lastSkid=[null,null];if(loose&&speed>35&&Math.random()<dt*25)burst(car.x-ax*18,car.y-ay*18,'dust',1);}
  const before=track[(after.i-5+track.length)%track.length],ahead=track[(after.i+5)%track.length],turn=before.tx*ahead.ty-before.ty*ahead.tx;
  feedback.rumble=speed>60&&Math.abs(turn)>.12&&after.side===Math.sign(turn)&&after.distance>widthAt('road',after.progress)-3&&after.distance<widthAt('road',after.progress)+12?clamp(speed/250,0,1):0;
  if(skidmarks.length>4200)skidmarks.splice(0,skidmarks.length-4200);
  if(speed>4){movingTime+=dt;if(movingTime>3)$('hint').style.opacity='0';}
  if(!race.started&&speed>8){race.started=true;race.time=0;race.previous=after.progress;beginLap();}
  if(race.started)updateRace(dt,after);
  if(offroad&&speed<7&&gas){race.stuck+=dt;if(race.stuck>5)recover(true);}else race.stuck=0;
  for(let i=skidmarks.length-1;i>=0;i--){skidmarks[i].life-=dt;if(skidmarks[i].life<=0)skidmarks.splice(i,1);}
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.r+=dt*7;if(p.life<=0)particles.splice(i,1);}
}

function updateRace(dt,n) {
  const beforeTime=race.time;
  race.time+=dt;
  const previous=race.previous,progress=n.progress;
  let delta=progress-previous;if(delta>.5)delta-=1;if(delta<-.5)delta+=1;
  // A sampled gate must be crossed in the forward direction on the actual road.
  if(Math.abs(delta)<.035)race.travel+=delta;
  const gate=race.next*.25;
  if(race.next<=3&&previous<gate&&progress>=gate&&delta>0&&n.distance<widthAt('road',progress)+10){
    const crossingTime=beforeTime+dt*clamp((gate-previous)/delta,0,1);
    finishSector(crossingTime,race.next-1);race.next++;
  }
  if(previous>.93&&progress<.07&&delta>0&&n.distance<widthAt('road',progress)+10){
    const crossingTime=beforeTime+dt*clamp((1-previous)/delta,0,1),remainder=race.time-crossingTime;
    if(race.next===4&&race.travel>.85&&!race.invalid){
      finishSector(crossingTime,3);race.last=crossingTime;race.lap++;timing.last=timing.splits.slice();
      if(race.best===null||race.last<race.best){
        race.best=race.last;timing.best=timing.splits.slice();const session={version:1,time:race.best,sectors:timing.best.slice()};
        try{localStorage.setItem(BEST_KEY,JSON.stringify(race.best));localStorage.setItem(BEST_KEY+'-sectors-v1',JSON.stringify(session));}catch(_){/* Timing remains available for this session. */}
        notify('PERSONAL BEST · '+formatTime(race.best));
      }
      else notify('LAP COMPLETE · '+formatTime(race.last));
    }else if(race.invalid)notify('FRESH LAP · Make it a clean one');
    else if(race.time>8)notify('LAP NOT COUNTED · Pass every sector on the track');
    race.time=remainder;race.next=1;race.travel=0;race.invalid=false;beginLap();
  }
  race.previous=progress;
}
function finishSector(time,index){const elapsed=time-timing.sectorStart;timing.splits[index]=elapsed;timing.sectorStart=time;timing.flashLabel='SECTOR '+(index+1)+' · '+formatSector(elapsed);timing.flashDelta=timing.best[index]!==undefined?elapsed-timing.best[index]:null;timing.flashTime=3.5;}
function triggerImpact(speed){feedback.impact=Math.max(feedback.impact,clamp(speed/250,.15,1));if(feedback.impactCooldown===0){playImpact(feedback.impact);feedback.impactCooldown=.15;}}

function burst(x,y,type,count){for(let i=0;i<count;i++)particles.push({x,y,vx:(Math.random()-.5)*35,vy:(Math.random()-.5)*35,r:type==='spark'?1.5:3,life:type==='spark'?.35:1,max:type==='spark'?.35:1,type});if(particles.length>128)particles.splice(0,particles.length-128);}
function drawSkidmarks(c){
  for(const batch of skidBatches)batch.length=0;
  const halfW=width/(camera.zoom*2)+100,halfH=height/(camera.zoom*2)+100;
  for(const s of skidmarks){if(Math.abs(s.x-camera.x)>halfW||Math.abs(s.y-camera.y)>halfH)continue;const alpha=s.alpha*Math.min(s.life/6,1),level=clamp(Math.ceil(alpha/.12)-1,0,5);skidBatches[(s.loose?6:0)+level].push(s);}
  c.lineCap='round';c.lineWidth=3;
  for(let i=0;i<12;i++){const batch=skidBatches[i];if(!batch.length)continue;c.strokeStyle=i>=6?'rgba(103,73,44,'+((i%6+1)*.12)+')':'rgba(22,27,26,'+((i%6+1)*.12)+')';c.beginPath();for(const s of batch){c.moveTo(s.px,s.py);c.lineTo(s.x,s.y);}c.stroke();}
}

function draw() {
  const elapsed=Math.min(deltaTime/1000,.08);
  if(!paused){accumulator+=elapsed;while(accumulator>=CFG.step){simulate(CFG.step);accumulator-=CFG.step;}}
  const smoothing=1-Math.exp(-4.5*elapsed);
  camera.x=lerpTo(camera.x,car.x+car.vx*.42,smoothing);camera.y=lerpTo(camera.y,car.y+car.vy*.42,smoothing);
  camera.zoom=lerpTo(camera.zoom,desiredZoom()*(1-clamp(Math.hypot(car.vx,car.vy)/1700,0,.19)),smoothing);
  ctx.save();ctx.setTransform(pixelDensity(),0,0,pixelDensity(),0,0);ctx.fillStyle=activeMap.id==='canyon'?'#d5a36d':activeMap.id==='alpine'?'#dbe6e3':'#8ba274';ctx.fillRect(0,0,width,height);
  ctx.translate(width/2,height*.54);ctx.scale(camera.zoom,camera.zoom);ctx.translate(-camera.x,-camera.y);
  ctx.drawImage(worldCanvas,worldBounds.x,worldBounds.y);
  drawSkidmarks(ctx);
  for(const p of particles){ctx.globalAlpha=p.life/p.max*.35;ctx.fillStyle=p.type==='dust'?'#dfca9b':p.type==='spark'?'#ffdf85':'#f0e9da';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
  drawPatchHighlights(ctx,millis()/1000);drawCar(ctx);ctx.restore();
  if(feedback.impact>.03){ctx.save();ctx.fillStyle='rgba(247,130,92,'+feedback.impact*.065+')';ctx.fillRect(0,0,width,height);ctx.restore();}
  if(toastTimer>0&&!paused){toastTimer-=elapsed;if(toastTimer<=0)$('toast').classList.remove('visible');}
  if(millis()-lastHUD>70){updateHUD();drawMinimap();lastHUD=millis();}
  updateAudio();
}

function drawCar(c) {
  c.save();c.translate(car.x,car.y);c.rotate(car.angle);
  c.fillStyle='#10201b40';roundedRect(c,-19+3,-11+4,43,24,5);c.fill();
  // Front tires visibly steer independently from the body.
  for(const side of [-1,1]){c.save();c.translate(12,side*11);c.rotate(car.steer*.35);c.fillStyle='#182124';c.fillRect(-5,-3,10,6);c.restore();c.fillStyle='#182124';c.fillRect(-17,side*11-3,10,6);}
  if(carArt.complete&&carArt.naturalWidth){c.save();c.rotate(Math.PI/2);c.drawImage(carArt,-activeCar.width/2,-activeCar.length/2,activeCar.width,activeCar.length);c.restore();}
  else{c.fillStyle=PAINTS[paint].hex;roundedRect(c,-activeCar.length/2,-activeCar.width/2,activeCar.length,activeCar.width,5);c.fill();c.fillStyle='#b9dedb';c.fillRect(4,-8,7,16);c.fillStyle='#293c3f';c.fillRect(-9,-8,6,16);}
  c.save();if(car.brake){c.shadowColor='#ff4b35';c.shadowBlur=7;}c.fillStyle=car.brake?'#ff6a4f':'#942d27';c.fillRect(-activeCar.length/2,-9,2,5);c.fillRect(-activeCar.length/2,4,2,5);c.restore();
  c.restore();
}

function roundedRect(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);}
function path(c,points,offset=0,close=true){c.beginPath();points.forEach((p,i)=>{const d=typeof offset==='function'?offset(i/points.length):offset,x=p.x+(p.nx||0)*d,y=p.y+(p.ny||0)*d;i?c.lineTo(x,y):c.moveTo(x,y);});if(close)c.closePath();}
function ribbon(c,color,width,points=track){c.strokeStyle=color;c.lineJoin='round';c.lineCap='round';if(typeof width!=='function'){path(c,points);c.lineWidth=width;c.stroke();return;}for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length];c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.lineWidth=(width(i/points.length)+width(((i+1)%points.length)/points.length))/2;c.stroke();}}

function buildWorld() {
  worldCanvas=document.createElement('canvas');worldCanvas.width=worldBounds.width;worldCanvas.height=worldBounds.height;worldCtx=worldCanvas.getContext('2d');
  const desert=activeMap.id==='canyon',alpine=activeMap.id==='alpine',c=worldCtx,rand=seededRandom(desert?4081:alpine?6327:879),w=worldBounds.width,h=worldBounds.height;c.fillStyle=desert?'#d5a36d':alpine?'#dbe6e3':'#8ba274';c.fillRect(0,0,w,h);c.translate(-worldBounds.x,-worldBounds.y);
  // All scenery is orthographic: tree crowns, roof planes, and flat ground markings.
  for(let i=0;i<140;i++){c.fillStyle=desert?(i%2?'#dfb780':'#c59160'):alpine?(i%2?'#eff5ee':'#c7d5d3'):(i%2?'#91a97c':'#849d6e');c.beginPath();c.ellipse(rand()*w+worldBounds.x,rand()*h+worldBounds.y,70+rand()*200,60+rand()*150,rand()*6.28,0,Math.PI*2);c.fill();}
  for(let i=0;i<32000;i++){c.fillStyle=desert?(i%2?'#84543825':'#ffe2ab40'):alpine?(i%2?'#90aeb326':'#ffffff5a'):(i%2?'#6f8a5b30':'#b4c28d35');const x=rand()*w+worldBounds.x,y=rand()*h+worldBounds.y;c.fillRect(x,y,1+rand()*2,1+rand()*2);}
  if(desert)paintCanyonMesas(c,rand,w,h);
  if(alpine)paintAlpineRidges(c,rand,w,h);
  ribbon(c,desert?'#a96549':alpine?'#b7c9cb':'#71895e',p=>widthAt('wall',p)*2+25);ribbon(c,desert?'#ddb27b':alpine?'#edf2e9':'#a3ac87',p=>widthAt('wall',p)*2);
  for(const [from,to]of [[.12,.38],[.51,.77]]){
    const section=track.slice(Math.floor(from*track.length),Math.ceil(to*track.length));
    if(!desert&&!alpine){c.beginPath();section.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle='#cbb88f';c.lineWidth=(CFG.wall-4)*2;c.lineCap='butt';c.stroke();}
  }
  // Scatter actual gravel grains on the trap areas, outside the paved runoff.
  for(let i=0;i<17000;i++){if(alpine)break;const index=Math.floor(rand()*track.length),p=track[index],progress=index/track.length;const side=rand()<.5?-1:1,offset=(widthAt('runoff',progress)+1+rand()*(widthAt('wall',progress)-widthAt('runoff',progress)-5))*side;if(!desert&&!((progress>.12&&progress<.38)||(progress>.51&&progress<.77)))continue;c.fillStyle=desert?(i%2?'#915b3b55':'#ffe4aa6c'):(i%2?'#ae9c793f':'#e2d3b55c');c.fillRect(p.x+p.nx*offset,p.y+p.ny*offset,1.5,1.5);}
  ribbon(c,desert?'#a28c74':alpine?'#95a8ae':'#757e76',p=>widthAt('runoff',p)*2);ribbon(c,desert?'#8c8170':alpine?'#81969c':'#6a746e',p=>widthAt('road',p)*2+24);ribbon(c,desert?'#f5d5a0':alpine?'#eaf4ef':'#e4e5ca',p=>widthAt('road',p)*2+5);ribbon(c,desert?'#4f5150':alpine?'#46555c':'#424d50',p=>widthAt('road',p)*2);
  // Seeded asphalt grain avoids photographic perspective and repeats cleanly.
  c.save();path(c,track);c.lineWidth=CFG.road*2;c.strokeStyle='#424d50';
  for(let i=0;i<18000;i++){const index=Math.floor(rand()*track.length),p=track[index],offset=(rand()-.5)*widthAt('road',index/track.length)*1.96;c.fillStyle=i%2?'#9ba8a017':'#1823291c';c.fillRect(p.x+p.nx*offset,p.y+p.ny*offset,1.2,1.2);}c.restore();
  if(activeMap.id==='rallycross')paintRallyRoad(c,rand);
  // Narrow edge dashes on the apron.
  for(const side of [-1,1]){path(c,track,p=>(widthAt('runoff',p)-10)*side);c.strokeStyle='#d7d6b474';c.lineWidth=2;c.setLineDash([12,15]);c.stroke();c.setLineDash([]);}
  // Apex curbs only appear on the inside of meaningful bends.
  for(let i=0;i<track.length;i++){
    const p=track[i],q=track[(i+1)%track.length],prev=track[(i-5+track.length)%track.length],next=track[(i+5)%track.length];
    const turn=prev.tx*next.ty-prev.ty*next.tx;if(Math.abs(turn)<.12)continue;
    const side=turn>0?1:-1;
    const wp=widthAt('road',i/track.length)+4,wq=widthAt('road',((i+1)%track.length)/track.length)+4;
    c.beginPath();c.moveTo(p.x+p.nx*wp*side,p.y+p.ny*wp*side);c.lineTo(q.x+q.nx*wq*side,q.y+q.ny*wq*side);c.strokeStyle=Math.floor(i/2)%2?(desert?'#f9ddb0':'#e3dfcd'):(desert?'#d98449':alpine?'#759fb3':'#d86f58');c.lineWidth=14;c.lineCap='butt';c.stroke();
  }
  // Continuous rail follows the exact boundary used by collision detection.
  for(const side of [-1,1]){
    path(c,track,p=>widthAt('wall',p)*side);c.strokeStyle=desert?'#6e4235':'#394d43';c.lineWidth=desert?15:11;c.stroke();
    path(c,track,p=>widthAt('wall',p)*side);c.strokeStyle=desert?'#b77750':'#c5ccba';c.lineWidth=desert?9:6;c.stroke();
    path(c,track,p=>widthAt('wall',p)*side);c.strokeStyle=desert?'#f1ba80':'#eceddb';c.lineWidth=2;c.stroke();
    for(let i=0;i<track.length;i+=4){const p=track[i],offset=widthAt('wall',i/track.length);c.fillStyle=desert?'#84513a':'#4b5b50';c.beginPath();c.arc(p.x+p.nx*offset*side,p.y+p.ny*offset*side,3,0,Math.PI*2);c.fill();}
  }
  // Start/finish strip and grid boxes are painted on the road surface.
  const start=track[0];c.save();c.translate(start.x,start.y);c.rotate(Math.atan2(start.ty,start.tx));
  for(let row=0;row<2;row++)for(let col=0;col<16;col++){c.fillStyle=(row+col)%2?'#eceddc':'#253438';c.fillRect(row*8-8,-CFG.road+col*(CFG.road/8),8,CFG.road/8);}
  c.strokeStyle='#cbd2c071';c.lineWidth=2;for(let i=1;i<7;i++){const x=-i*70;c.strokeRect(x,-(i%2?52:-20),36,25);}
  c.fillStyle='#e5e9d2';c.font='700 27px Barlow, sans-serif';c.textAlign='center';c.fillText('START / FINISH',0,-122);c.restore();
  // Top-down paddock roofs; deliberately no building facades or side-view sprites.
  const paddock={x:start.x,y:start.y+330};
  c.save();c.translate(paddock.x,paddock.y);c.fillStyle=desert?'#ac835f':alpine?'#8da6a8':'#627557';roundedRect(c,-240,-50,520,135,7);c.fill();
  for(let i=0;i<6;i++){c.fillStyle=i%2?'#d3ccad':'#e1d7b7';c.fillRect(-216+i*79,-35,69,80);c.strokeStyle='#b7af92';c.lineWidth=2;c.strokeRect(-211+i*79,-30,59,70);c.fillStyle='#7d8f82';c.fillRect(-196+i*79,-21,28,18);}c.restore();
  // Circuit lettering is on the grass, read from directly overhead.
  c.save();c.translate(alpine?-350:-500,alpine?840:-220);c.fillStyle=desert?'#ffe0a77a':alpine?'#829ea77a':'#d1ddba70';c.font='italic 900 92px Barlow Condensed, Impact, sans-serif';c.textAlign='center';c.fillText('APEX /',0,0);c.font='600 14px Barlow, sans-serif';c.fillText(desert?'D E S E R T   C A N Y O N':alpine?'A L P I N E   P A S S':activeMap.id==='rallycross'?'R I D G E W A Y   R X':'J U N I P E R   R A C E W A Y',0,30);c.restore();
  for(let i=0;i<280;i++){
    const x=rand()*w+worldBounds.x,y=rand()*h+worldBounds.y,n=nearest(x,y);if(n.distance<CFG.wall+50)continue;if(Math.abs(x-paddock.x)<300&&Math.abs(y-paddock.y)<110)continue;
    const size=35+rand()*48;
    if(desert){paintDesertProp(c,x,y,size,rand);continue;}
    if(alpine){paintAlpineProp(c,x,y,size,rand);continue;}
    c.save();c.translate(x,y);c.rotate(rand()*Math.PI*2);
    c.fillStyle='#365b3826';c.beginPath();c.arc(3,4,size*.43,0,Math.PI*2);c.fill();
    if(treeArt&&treeArt.complete&&treeArt.naturalWidth){c.globalAlpha=.85;c.drawImage(treeArt,-size/2,-size/2,size,size);c.globalCompositeOperation='source-atop';}
    else{c.fillStyle='#52734c';for(let k=0;k<6;k++){c.beginPath();c.arc(Math.cos(k)*size*.17,Math.sin(k)*size*.17,size*.27,0,Math.PI*2);c.fill();}c.fillStyle='#658457';c.beginPath();c.arc(-3,-3,size*.29,0,Math.PI*2);c.fill();}c.restore();
  }
  // Direction arrows and numbered apex boards are flat markings.
  for(let i=30;i<track.length;i+=65){const p=track[i];c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(p.ty,p.tx));c.strokeStyle='#e4e7ca25';c.lineWidth=3;c.beginPath();c.moveTo(-13,-9);c.lineTo(0,0);c.lineTo(-13,9);c.stroke();c.restore();}
  // Braking references sit on the apron before the infield hairpin.
  const markers=desert?[[275,'150'],[290,'100'],[305,'50']]:[[403,'150'],[418,'100'],[433,'50']];
  for(const [index,label] of markers){const p=track[index];c.save();c.translate(p.x+p.nx*(widthAt('road',index/track.length)+25),p.y+p.ny*(widthAt('road',index/track.length)+25));c.rotate(Math.atan2(p.ty,p.tx));c.fillStyle='#e4e7cf';c.fillRect(-13,-9,26,18);c.fillStyle='#263737';c.font='bold 11px Arial';c.textAlign='center';c.fillText(label,0,4);c.restore();}
  if(desert)for(const progress of [.15,.52]){const p=track[Math.floor(progress*track.length)];c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(p.ty,p.tx));for(const side of [-1,1]){c.fillStyle='#f5c472';c.fillRect(-18,side*(CFG.road+27)-9,36,18);c.fillStyle='#5d4030';c.font='bold 10px Arial';c.textAlign='center';c.fillText('NARROW',0,side*(CFG.road+27)+3);}c.restore();}
  if(alpine)for(const [index,label] of [[240,'01'],[560,'02'],[880,'03']]){const p=track[index];c.save();c.translate(p.x+p.nx*(CFG.road+23),p.y+p.ny*(CFG.road+23));c.rotate(Math.atan2(p.ty,p.tx));c.fillStyle='#dceff4';c.fillRect(-14,-10,28,20);c.fillStyle='#355c72';c.font='bold 12px Arial';c.textAlign='center';c.fillText(label,0,4);c.restore();}
  for(let gate=1;gate<=3;gate++){const p=track[Math.floor(track.length*gate/4)],half=widthAt('road',gate/4);c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(p.ty,p.tx));c.strokeStyle=activeMap.accent+'77';c.lineWidth=2;c.setLineDash([8,8]);c.beginPath();c.moveTo(0,-half);c.lineTo(0,half);c.stroke();c.setLineDash([]);c.fillStyle=activeMap.accent;c.font='bold 10px Arial';c.textAlign='center';c.fillText('S'+gate,0,-half-15);c.restore();}
  paintSurfacePatches(c);
}
function paintRallyRoad(c,rand){
  c.lineCap='round';c.strokeStyle='#a78660';c.lineWidth=CFG.road*2-5;
  for(let i=0;i<track.length;i++){if(!dirtProgress(i/track.length))continue;const p=track[i],q=track[(i+1)%track.length];c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke();}
  for(let i=0;i<16000;i++){const index=Math.floor(rand()*track.length),p=track[index];if(!dirtProgress(index/track.length))continue;const d=(rand()-.5)*(CFG.road*2-9);c.fillStyle=i%3?'#6e51353b':'#e1bb8299';c.fillRect(p.x+p.nx*d,p.y+p.ny*d,1+rand()*2,1+rand()*2);}
  for(const offset of [-24,24]){c.strokeStyle='#72553c45';c.lineWidth=3;for(let i=0;i<track.length;i++){if(!dirtProgress(i/track.length))continue;const p=track[i],q=track[(i+1)%track.length];c.beginPath();c.moveTo(p.x+p.nx*offset,p.y+p.ny*offset);c.lineTo(q.x+q.nx*offset,q.y+q.ny*offset);c.stroke();}}
  for(const progress of [.14,.36,.57,.79]){const index=Math.floor(progress*track.length);for(let i=-5;i<=5;i++){const p=track[(index+i+track.length)%track.length];for(let j=0;j<55;j++){const d=(rand()-.5)*(CFG.road*2-8);c.fillStyle='#bc986c70';c.fillRect(p.x+p.nx*d+(rand()-.5)*12,p.y+p.ny*d+(rand()-.5)*12,2,2);}}}
}

function paintSurfacePatches(c){
  c.save();c.beginPath();
  for(const side of [-1,1]){track.forEach((p,i)=>{const d=widthAt('road',i/track.length)*side,x=p.x+p.nx*d,y=p.y+p.ny*d;i?c.lineTo(x,y):c.moveTo(x,y);});c.closePath();}c.clip('evenodd');
  activeMap.patches.forEach((patch,index)=>{
    const p=patchFrame(patch);c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(p.ty,p.tx));paintPatch(c,patch,index);c.restore();
  });c.restore();
}
function paintPatch(c,patch,index=0){
  const rand=seededRandom(771+index*91),ice=patch.type==='ICE',oil=patch.type==='OIL',L=patch.length,W=patch.width;
  c.save();patchOutline(c,patch);c.clip();
  const gradient=c.createLinearGradient(-L,-W,L,W);
  gradient.addColorStop(0,ice?'#94c9dfd9':oil?'#0b131bf5':'#9f754bdf');gradient.addColorStop(.45,ice?'#d8f2f3ed':oil?'#161e29f5':'#e6bf86f2');gradient.addColorStop(1,ice?'#69a4c6dc':oil?'#0e1720fa':'#bb905edb');
  c.fillStyle=gradient;c.fillRect(-L*1.15,-W*1.15,L*2.3,W*2.3);
  if(oil){
    const colors=['#64b5ba55','#8b88c966','#c292bf55','#bda76a48','#6488be5f'];
    c.globalCompositeOperation='screen';
    for(let k=0;k<10;k++){const y=(k-5)*W*.17;c.strokeStyle=colors[k%colors.length];c.lineWidth=1.3+(k%3)*.65;c.beginPath();c.moveTo(-L,y);c.bezierCurveTo(-L*.4,y-W*.65,L*.05,y+W*.75,L*.6,y-W*.2);c.bezierCurveTo(L*.9,y-W*.3,L*.75,y+W*.05,L,y+W*.2);c.stroke();}
    c.globalCompositeOperation='source-over';c.strokeStyle='#c5e1f367';c.lineWidth=1.1;c.beginPath();c.moveTo(-L*.7,-W*.32);c.bezierCurveTo(-L*.25,-W*.7,L*.05,-W*.1,L*.32,-W*.45);c.stroke();
    for(let k=0;k<30;k++){c.fillStyle=k%3?'#e4efff12':'#060f1f4a';c.beginPath();c.ellipse((rand()-.5)*L*1.8,(rand()-.5)*W*1.8,rand()*3+.5,rand()*1.5+.5,rand()*6.28,0,6.28);c.fill();}
  }else if(ice){
    for(let k=0;k<24;k++){const x=(rand()-.5)*L*2,y=(rand()-.5)*W*2;c.fillStyle=k%2?'#f5ffff35':'#2d77a423';c.beginPath();c.moveTo(x,y);c.lineTo(x+(rand()-.3)*40,y+(rand()-.7)*30);c.lineTo(x+(rand()-.6)*35,y+(rand()-.4)*30);c.closePath();c.fill();}
    for(let k=0;k<11;k++){const x=(rand()-.5)*L*1.8,y=(rand()-.5)*W*1.6;c.strokeStyle=k%3?'#f6ffffa0':'#32749c65';c.lineWidth=k%3?.75:1.3;c.beginPath();c.moveTo(x-20,y-9);c.lineTo(x-6,y-3);c.lineTo(x,y+7);c.lineTo(x+15,y+2);c.lineTo(x+28,y+9);c.moveTo(x,y+7);c.lineTo(x+2,y+18);c.lineTo(x-8,y+24);c.stroke();}
    c.fillStyle='#fffefeb0';for(let k=0;k<90;k++){const a=rand()*6.28,r=.78+rand()*.26;c.beginPath();c.arc(Math.cos(a)*L*r,Math.sin(a)*W*r,.4+rand()*1.3,0,6.28);c.fill();}
  }else{
    for(let k=0;k<1050;k++){const size=.4+rand()*1.5;c.fillStyle=k%3?'#79502e55':'#ffe7b9aa';c.fillRect((rand()-.5)*L*2.2,(rand()-.5)*W*2.2,size,size);}
    for(let k=-6;k<=6;k++){const y=k*W*.15;c.lineWidth=1.2;c.strokeStyle='#805b3747';c.beginPath();c.moveTo(-L,y);c.bezierCurveTo(-L*.5,y-8,L*.3,y+10,L,y-5);c.stroke();c.strokeStyle='#ffe6b985';c.beginPath();c.moveTo(-L,y+2);c.bezierCurveTo(-L*.5,y-6,L*.3,y+12,L,y-3);c.stroke();}
    for(const y of [-11,11]){c.strokeStyle='#8c633c55';c.lineWidth=4;c.beginPath();c.moveTo(-L,y);c.bezierCurveTo(-L*.3,y-4,L*.3,y+4,L,y);c.stroke();c.strokeStyle='#e7c39170';c.lineWidth=1;c.stroke();}
    for(let k=0;k<18;k++){const x=(rand()-.5)*L*1.8,y=(rand()-.5)*W*1.7;c.fillStyle='#8e6543';c.beginPath();c.ellipse(x,y,1.1+rand()*1.5,.7+rand(),rand()*6.28,0,6.28);c.fill();}
  }
  c.restore();patchOutline(c,patch);c.strokeStyle=ice?'#e9ffffa0':oil?'#91a3bd3b':'#e9cc9855';c.lineWidth=ice?1.4:1;c.stroke();
}
function paintAlpineRidges(c,rand,w,h){
  for(let i=0;i<100;i++){const x=worldBounds.x+rand()*w,y=worldBounds.y+rand()*h,r=65+rand()*165;if(nearest(x,y).distance<CFG.wall+r+40)continue;c.save();c.translate(x,y);c.rotate(rand()*6.28);for(const [scale,color] of [[1,'#a4b6b8'],[.88,'#c1cfcf'],[.67,'#edf3ed'],[.43,'#d5e2df']]){c.fillStyle=color;c.beginPath();for(let j=0;j<8;j++){const a=j/8*6.28,radius=r*(j%2?.76:1)*scale;j?c.lineTo(Math.cos(a)*radius,Math.sin(a)*radius):c.moveTo(Math.cos(a)*radius,Math.sin(a)*radius);}c.closePath();c.fill();}c.restore();}
  // Continuous overhead ridge contours sit between successive road traverses.
  c.lineCap='round';c.lineJoin='round';
  for(const y of [830,35,-800])for(const [width,color] of [[180,'#9dafb2'],[148,'#bccdcd'],[110,'#e7eeea'],[60,'#d4e1de']]){c.beginPath();c.moveTo(-850,y);c.bezierCurveTo(-380,y-110,310,y+120,860,y-30);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
}
function paintAlpineProp(c,x,y,size,rand){
  c.save();c.translate(x,y);c.rotate(rand()*6.28);c.fillStyle='#829da833';c.beginPath();c.arc(3,4,size*.45,0,6.28);c.fill();
  if(rand()<.8){for(const [scale,color] of [[1,'#486e62'],[.78,'#dcebe0'],[.5,'#fafbf2']]){c.fillStyle=color;c.beginPath();for(let k=0;k<16;k++){const a=k/16*6.28,r=size*(k%2?.24:.48)*scale;k?c.lineTo(Math.cos(a)*r,Math.sin(a)*r):c.moveTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.fill();}}
  else{c.fillStyle='#879da1';c.beginPath();c.ellipse(0,0,size*.4,size*.28,.2,0,6.28);c.fill();c.fillStyle='#f1f5ed';c.beginPath();c.ellipse(-3,-3,size*.3,size*.2,.2,0,6.28);c.fill();}c.restore();
}

function paintCanyonMesas(c,rand,w,h){
  for(let i=0;i<190;i++){
    const x=worldBounds.x+rand()*w,y=worldBounds.y+rand()*h,r=70+rand()*175;
    if(nearest(x,y).distance<CFG.wall+r+35)continue;
    const vertices=Array.from({length:9},(_,j)=>{const angle=j/9*Math.PI*2;return {x:Math.cos(angle)*r*(.8+rand()*.25),y:Math.sin(angle)*r*(.7+rand()*.3)};});
    c.save();c.translate(x,y);c.rotate(rand()*6.28);
    for(const [scale,color] of [[1.08,'#86503b2b'],[1,'#a46148'],[.9,'#d39062'],[.76,'#b97250'],[.69,'#e1a16d'],[.52,'#c48057']]){
      c.beginPath();vertices.forEach((p,j)=>j?c.lineTo(p.x*scale,p.y*scale):c.moveTo(p.x*scale,p.y*scale));c.closePath();c.fillStyle=color;c.fill();
    }
    c.strokeStyle='#9f62443f';c.lineWidth=2;
    for(let j=0;j<4;j++){c.beginPath();c.moveTo(-r*.25,-r*.25+j*r*.15);c.bezierCurveTo(0,-r*.4+j*r*.15,r*.2,-r*.15+j*r*.15,r*.32,-r*.22+j*r*.15);c.stroke();}c.restore();
  }
}
function paintDesertProp(c,x,y,size,rand){
  c.save();c.translate(x,y);c.rotate(rand()*6.28);
  if(rand()<.6){
    c.fillStyle='#754f3728';c.beginPath();c.ellipse(3,4,size*.42,size*.32,0,0,Math.PI*2);c.fill();
    c.fillStyle='#a66349';c.beginPath();for(let j=0;j<7;j++){const a=j/7*6.28,r=size*(.28+rand()*.1);j?c.lineTo(Math.cos(a)*r,Math.sin(a)*r):c.moveTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.fill();c.strokeStyle='#e7ad77';c.lineWidth=3;c.stroke();
    c.fillStyle='#c68558';c.beginPath();c.ellipse(-2,-2,size*.22,size*.15,.4,0,6.28);c.fill();
  }else{
    // Cactus seen from above: radial crowns and ribs, with no side-view trunk.
    for(let j=0;j<3;j++){const a=j/3*6.28,px=Math.cos(a)*size*.15,py=Math.sin(a)*size*.15;c.fillStyle='#526b48';c.beginPath();c.arc(px,py,size*.16,0,6.28);c.fill();c.strokeStyle='#8ca26a';c.lineWidth=1.5;for(let k=0;k<5;k++){const b=k/5*6.28;c.beginPath();c.moveTo(px,py);c.lineTo(px+Math.cos(b)*size*.12,py+Math.sin(b)*size*.12);c.stroke();}}
  }c.restore();
}

function formatTime(t){if(t===null)return '— — : — —';const ms=Math.floor(t*1000),minutes=Math.floor(ms/60000),seconds=Math.floor(ms/1000)%60;return String(minutes).padStart(2,'0')+':'+String(seconds).padStart(2,'0')+'.'+String(ms%1000).padStart(3,'0');}
function formatSector(t){return Number.isFinite(t)?t.toFixed(3)+'s':'—';}
function formatDelta(t){return Number.isFinite(t)?(t<0?'−':'+')+Math.abs(t).toFixed(3)+'s':'—';}
function drawPatchHighlights(c,time){
  for(const patch of activeMap.patches){if(patch.type!=='ICE'&&patch.type!=='OIL')continue;const p=patchFrame(patch);if(Math.abs(p.x-camera.x)>width/camera.zoom||Math.abs(p.y-camera.y)>height/camera.zoom)continue;c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(p.ty,p.tx));c.globalAlpha=.12+.08*Math.sin(time*1.2+patch.progress*30);c.strokeStyle=patch.type==='ICE'?'#ffffff':'#b3dff5';c.lineWidth=1;for(let i=0;i<3;i++){const x=patch.length*(i-.9)*.4,y=Math.sin(i*4+patch.progress*10)*patch.width*.35;c.beginPath();c.moveTo(x-3,y);c.lineTo(x+3,y);c.moveTo(x,y-3);c.lineTo(x,y+3);c.stroke();}c.restore();}
}
function playImpact(strength){if(!soundEnabled||!audioCtx||!audioLayers)return;const source=audioCtx.createBufferSource(),gain=audioCtx.createGain(),filter=audioCtx.createBiquadFilter();source.buffer=audioLayers.buffer;filter.type='lowpass';filter.frequency.value=600;gain.gain.setValueAtTime(Math.min(.12,strength*.1),audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.13);source.connect(filter);filter.connect(gain);gain.connect(audioCtx.destination);source.start();source.stop(audioCtx.currentTime+.14);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};}
function updateHUD(){
  const speed=Math.hypot(car.vx,car.vy),signed=car.vx*Math.cos(car.angle)+car.vy*Math.sin(car.angle),kmh=Math.round(speed*.46);
  $('speed').textContent=kmh;$('gear').textContent=speed<5?'N':signed<0?'R':Math.min(5,1+Math.floor(kmh/36));
  $('rpm').style.width=Math.min(100,kmh/170*100)+'%';$('throttle').style.width=car.throttle*100+'%';$('brake').style.width=car.brake*100+'%';
  $('clock').textContent=formatTime(race.time);$('best').textContent=formatTime(race.best);$('last').textContent=formatTime(race.last);$('lap').textContent=String(race.lap).padStart(2,'0');
  const surfaceLabel=car.slickTime>0&&car.surface!=='OIL'?'OILY TIRES':car.slip>35&&car.surface==='ASPHALT'?'SLIDING':car.surface;
  $('surface').textContent='●  '+surfaceLabel;$('surface').style.color=car.surface==='ICE'?'#c0f0ff':car.slickTime>0?'#c8b7ed':car.surface.startsWith('SAND')?'#ffd49a':car.surface==='SNOW'?'#e0f4ff':car.surface==='GRAVEL'?'#e9c795':car.surface==='GRASS'?'#b5d686':activeMap.accent;
  $('clock').style.color=race.invalid?'#e7a083':'';
  [...$('sector').children].forEach((el,i)=>el.classList.toggle('passed',i<race.next-1));
  const status=car.surface==='ICE'?'ICE · LOW GRIP':car.slickTime>0?'OIL · GRIP RECOVERING':car.surface==='DIRT'?'DIRT · LOOSE SURFACE':car.surface.startsWith('SAND')?'SAND · LOSING SPEED':car.slip>35?'SLIDING · COUNTERSTEER':car.brake&&speed>40?'BRAKING':car.surface+' · '+(race.started?'ON TRACK':'READY');
  $('grip-status').textContent=status;$('grip-status').style.color=$('surface').style.color;
  const delta=race.invalid||timing.flashTime<=0?null:timing.flashDelta;$('lap-delta').textContent=race.invalid?'INVALID LAP':formatDelta(delta);$('lap-delta').style.color=delta===null?'#9eb0a4':delta<=0?'#d5f578':'#f0a28a';
  for(let i=0;i<4;i++){
    const running=race.started&&i===race.next-1,value=timing.splits[i]??(running?Math.max(0,race.time-timing.sectorStart):timing.best[i]??timing.last[i]??null),difference=timing.splits[i]!==undefined&&timing.best[i]!==undefined?timing.splits[i]-timing.best[i]:null;
    $('sector-time-'+i).textContent=value===null?'—':formatSector(value);$('sector-time-'+i).style.color=running?activeMap.accent:'#e5ede2';
    $('sector-diff-'+i).textContent=difference!==null?formatDelta(difference):running?'RUNNING':timing.best[i]!==undefined?'PERSONAL BEST':'';$('sector-diff-'+i).style.color=difference===null?'#8fa697':difference<=0?'#d5f578':'#efa18b';
  }
  $('split-flash').textContent=timing.flashTime>0?timing.flashLabel+(timing.flashDelta!==null?' / '+formatDelta(timing.flashDelta):''):'';
  $('sector-status').textContent=timing.best.length?'Comparing with your best lap sectors.':'Complete a clean lap to set sector references.';
}

function drawMinimap(){if(!mapCtx)return;const c=mapCtx,b=trackBounds,scale=Math.min(280/(b.right-b.left),225/(b.bottom-b.top));c.clearRect(0,0,320,266);c.save();c.translate(160,132);c.scale(scale,scale);c.translate(-(b.left+b.right)/2,-(b.top+b.bottom)/2);ribbon(c,'#536258',9/scale);ribbon(c,'#abbca2',3/scale);const p=track[0];c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(p.ty,p.tx));c.fillStyle=activeMap.accent;c.fillRect(-1/scale,-5/scale,2/scale,10/scale);c.restore();c.save();c.translate(car.x,car.y);c.rotate(car.angle);c.scale(1/scale,1/scale);c.fillStyle=activeMap.accent;c.beginPath();c.moveTo(5,0);c.lineTo(-3.5,-3.5);c.lineTo(-2,0);c.lineTo(-3.5,3.5);c.closePath();c.fill();c.restore();c.restore();}

function toggleSound(){
  soundEnabled=!soundEnabled;
  if(soundEnabled&&!audioCtx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio){soundEnabled=false;notify('Audio is unavailable in this browser');return;}audioCtx=new Audio();engine=audioCtx.createOscillator();engine.type='sawtooth';const filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=300;engineGain=audioCtx.createGain();engineGain.gain.value=.025;engine.connect(filter);filter.connect(engineGain);engineGain.connect(audioCtx.destination);engine.start();}
  if(audioCtx&&!audioLayers)createFeedbackAudio();
  if(audioCtx&&soundEnabled)audioCtx.resume();$('sound').textContent=soundEnabled?'♪ Sound on':'♪ Sound off';$('sound').classList.toggle('sound-on',soundEnabled);$('sound').setAttribute('aria-pressed',String(soundEnabled));updateAudio();
}
function createFeedbackAudio(){
  const buffer=audioCtx.createBuffer(1,audioCtx.sampleRate,audioCtx.sampleRate),samples=buffer.getChannelData(0);let previous=0;for(let i=0;i<samples.length;i++){previous=(previous+(Math.random()*2-1)*.11)/1.04;samples[i]=previous*3;}
  const source=audioCtx.createBufferSource();source.buffer=buffer;source.loop=true;const tireFilter=audioCtx.createBiquadFilter(),looseFilter=audioCtx.createBiquadFilter(),tireGain=audioCtx.createGain(),looseGain=audioCtx.createGain(),rumbleGain=audioCtx.createGain(),rumble=audioCtx.createOscillator();
  tireFilter.type='bandpass';tireFilter.frequency.value=1600;tireFilter.Q.value=.7;looseFilter.type='lowpass';looseFilter.frequency.value=550;for(const gain of [tireGain,looseGain,rumbleGain]){gain.gain.value=0;gain.connect(audioCtx.destination);}source.connect(tireFilter);source.connect(looseFilter);tireFilter.connect(tireGain);looseFilter.connect(looseGain);rumble.type='triangle';rumble.frequency.value=65;rumble.connect(rumbleGain);source.start();rumble.start();audioLayers={buffer,tireGain,looseGain,rumbleGain,looseFilter,tireFilter};
}
function updateAudio(){
  if(!engine)return;const speed=Math.hypot(car.vx,car.vy),enabled=soundEnabled&&!paused,t=audioCtx.currentTime;
  engine.frequency.setTargetAtTime(35+speed*.26+car.throttle*13,t,.08);engineGain.gain.setTargetAtTime(enabled?.018+car.throttle*.014:0,t,.08);
  if(!audioLayers)return;const loose=['DIRT','GRAVEL','SAND','SAND PATCH','GRASS','SNOW','ICE'].includes(car.surface),velocity=clamp(speed/230,0,1),slide=clamp((car.slip-17)/95,0,1);
  audioLayers.tireGain.gain.setTargetAtTime(enabled&&!loose?slide*velocity*.065:0,t,.07);audioLayers.looseGain.gain.setTargetAtTime(enabled&&loose?velocity*(car.surface==='ICE'?.018:.055):0,t,.07);audioLayers.rumbleGain.gain.setTargetAtTime(enabled?feedback.rumble*.025:0,t,.04);audioLayers.looseFilter.frequency.setTargetAtTime(car.surface==='ICE'?1800:car.surface==='GRAVEL'||car.surface==='DIRT'?950:420,t,.1);audioLayers.tireFilter.frequency.setTargetAtTime(1000+slide*1300,t,.1);
}


// Run with `node verify.cjs`. Exercises the real simulation without a browser.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const nodes = new Map();
const node = id => {if(!nodes.has(id)) nodes.set(id,{style:{},classList:{add(){},remove(){},toggle(){}},children:[]});return nodes.get(id);};
const storage = new Map();
const sandbox = {window:{},document:{getElementById:node},console,localStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)||null}};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(__dirname+'/main.js','utf8')+'\nmakeTrack();window.test={car,race,track,keys,simulate,recover,nearest,surfaceAt,CFG,updateRace,skidmarks,configureTrack,widthAt,readBest,MAPS,VEHICLES,configureCar,bestKeyFor,patchFrame,carImagePath,beginLap,timing,jungle,updateJungle,amazonRiver,startingGrid,chooseStartingSlot,paddockPoint,getPaddock:()=>paddock,pitLane,nearestDriving};',sandbox);
const {car,race,track,keys,simulate,recover,nearest,surfaceAt,CFG,updateRace,skidmarks,configureTrack,widthAt,readBest,MAPS,VEHICLES,configureCar,bestKeyFor,patchFrame,carImagePath,beginLap,timing,jungle,updateJungle,amazonRiver,startingGrid,chooseStartingSlot,paddockPoint,getPaddock,pitLane,nearestDriving}=sandbox.window.test;
function reset(i=0){keys.clear();beginLap();const p=track[i];Object.assign(car,{x:p.x,y:p.y,vx:0,vy:0,angle:Math.atan2(p.ty,p.tx),yaw:0,steer:0,slickTime:0,slip:0});Object.assign(race,{started:false,time:0,next:1,previous:i/track.length,invalid:false,travel:0,stuck:0,lap:1,best:null,last:null});}
function step(seconds){for(let i=0;i<seconds/CFG.step;i++)simulate(CFG.step);}
function speed(){return Math.hypot(car.vx,car.vy);}
function withinDrivingRails(){const n=nearestDriving(car.x,car.y);return n.distance<n.wall-8;}

// Curves must accommodate a full-width continuous barrier without folding.
let minRadius=Infinity;
const straightSegments=[];
for(let i=0;i<track.length;i++){
  const a=track[(i+track.length-1)%track.length],b=track[i],c=track[(i+1)%track.length];
  const cross=Math.abs((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x));
  const radius=Math.hypot(b.x-a.x,b.y-a.y)*Math.hypot(c.x-b.x,c.y-b.y)*Math.hypot(c.x-a.x,c.y-a.y)/(2*cross);
  minRadius=Math.min(minRadius,radius);
  straightSegments.push(radius>1000?Math.hypot(c.x-b.x,c.y-b.y):0);
}
assert(minRadius>CFG.wall+10,'Barriers must not fold on tight bends');
let straightRun=0,longestStraight=0;
for(const length of straightSegments.concat(straightSegments)){
  straightRun=length>0?straightRun+length:0;
  longestStraight=Math.max(longestStraight,straightRun);
}
assert(longestStraight<800,'Flow circuit must not contain long near-straight stretches');
// The new esses must deflect by more than the full road width, so their
// opposing apexes cannot be connected by a straight line on the asphalt.
for(const [entry,apex,exit] of [[40,80,120],[720,760,800]]){
  const a=track[entry],b=track[apex],c=track[exit];
  const deviation=Math.abs((c.x-a.x)*(a.y-b.y)-(a.x-b.x)*(c.y-a.y))/Math.hypot(c.x-a.x,c.y-a.y);
  assert(deviation>CFG.road*2+60,'Deep esses must require a deliberate steering change');
}
assert.equal(MAPS.juniper.patches.length,3,'Keep the original number of oil slicks');
for(const patch of MAPS.juniper.patches){const gap=track[patch.corner*40].s-track[Math.floor(patch.progress*track.length)].s;assert(gap>patch.length&&gap<180,'Oil must sit shortly before a demanding corner, not on a distant straight');}
for(let i=0;i<track.length;i+=4)for(let j=i+4;j<track.length;j+=4){
  const a=track[i],b=track[j],arc=Math.min(b.s-a.s,track.totalLength-(b.s-a.s));
  if(arc<CFG.wall*3)continue;
  assert(Math.hypot(a.x-b.x,a.y-b.y)>CFG.wall*2+10,'Separate track sections must leave space for both barriers');
}

// Measure the actual drivetrain on a virtual straight, isolated from cornering.
reset();keys.add('KeyW');
for(let i=0;i<30/CFG.step;i++){car.x=track[0].x;car.y=track[0].y;simulate(CFG.step);}
const topKmh=speed()*.46;
assert(topKmh>155&&topKmh<170,'Faster car should settle near 158 km/h');

reset();keys.add('KeyW');step(1.5);const accelerated=speed();assert(accelerated>150,'Throttle must accelerate');
keys.clear();keys.add('KeyS');step(.5);assert(speed()<accelerated*.6,'Brake must slow the car');
reset();keys.add('KeyS');step(1);assert(car.vx*Math.cos(car.angle)+car.vy*Math.sin(car.angle)<-30,'Brake at rest must engage reverse');

// Compare equal initial speed on pavement, grass, and gravel.
function coastAt(i,offset){reset(i);const p=track[i];car.x+=p.nx*offset;car.y+=p.ny*offset;car.vx=p.tx*100;car.vy=p.ty*100;step(.25);return speed();}
const asphalt=coastAt(0,0),grass=coastAt(0,CFG.runoff+12),gravel=coastAt(Math.floor(track.length*.2),CFG.runoff+12);
assert(grass<asphalt&&gravel<grass,'Runoff surfaces must add progressive resistance');
assert.equal(surfaceAt(nearest(track[0].x,track[0].y)),'ASPHALT');

// Exercise both rails over the entire track at speeds above the normal maximum.
for(let i=0;i<track.length;i+=5)for(const side of [-1,1]){
  reset(i);const p=track[i];car.x+=p.nx*side*(CFG.wall-30);car.y+=p.ny*side*(CFG.wall-30);car.vx=p.nx*side*650;car.vy=p.ny*side*650;
  step(.18);assert(withinDrivingRails(),'Car must remain inside hard barriers');
  assert(Number.isFinite(car.x+car.y+car.vx+car.vy),'Collision must remain stable');
}

reset();car.vx=track[0].tx*240;car.vy=track[0].ty*240;keys.add('KeyD');keys.add('Space');step(.7);
assert(car.slip>25&&skidmarks.length>10,'Handbrake cornering must produce lateral slip and tire marks');

function completeLap(){for(let i=1;i<=track.length;i++){const p=track[i%track.length];updateRace(.1,{progress:(i%track.length)/track.length,distance:0});}}
reset();race.started=true;completeLap();assert.equal(race.lap,2,'Ordered checkpoints must record a complete lap');assert(race.best>0&&storage.has(MAPS.juniper.bestKey),'Best lap must persist');
reset();race.started=true;race.previous=.98;race.travel=.99;updateRace(.1,{progress:.01,distance:0});assert.equal(race.lap,1,'Skipping sector gates must not record a lap');
reset();race.started=true;race.invalid=true;completeLap();assert.equal(race.lap,1,'Recovered laps must not record a time');assert.equal(race.invalid,false,'Finish line must restore lap eligibility');
reset();recover(true);assert.equal(race.invalid,true,'Recovery must invalidate the lap');assert(speed()===0,'Recovery must stop the car');
console.log('PASS: track curvature and clearance, top speed, throttle, brakes, reverse, surface drag, '+Math.ceil(track.length/5)*2+' rail impacts, drift/tire marks, valid laps, shortcut rejection, recovery, and best-time persistence.');
console.log('Minimum bend radius:',Math.round(minRadius),'| Circuit length:',Math.round(track.totalLength));
console.log('Top speed:',topKmh.toFixed(1),'km/h');
console.log('Longest near-straight section:',Math.round(longestStraight));

// A second circuit must load distinct geometry and preserve the existing record.
const originalGeometry=JSON.stringify(track),juniperRecord=storage.get(MAPS.juniper.bestKey);
assert(configureTrack('canyon'));const canyonCount=track.length;
assert.notEqual(JSON.stringify(track),originalGeometry,'Canyon must have its own layout');
assert(CFG.road<86&&CFG.wall<160,'Canyon must be narrower than Juniper');
assert(widthAt('road',.2)<CFG.road&&widthAt('wall',.57)<CFG.wall,'Canyon passes must physically narrow');
assert.equal(surfaceAt({distance:widthAt('runoff',.2)+2,progress:.2}),'SAND');
assert.equal(surfaceAt({distance:0,progress:.2}),'ASPHALT');
readBest();assert.equal(race.best,null,'A new circuit must not inherit another circuit record');
configureTrack('canyon');assert.equal(track.length,canyonCount,'Switching maps must replace, not append, geometry');
assert.equal(configureTrack('missing-map'),false,'Unknown tracks must be ignored');

let canyonMinRadius=Infinity;
for(let i=0;i<track.length;i++){
  const a=track[(i+track.length-1)%track.length],b=track[i],c=track[(i+1)%track.length];
  const cross=Math.abs((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x));
  const radius=Math.hypot(b.x-a.x,b.y-a.y)*Math.hypot(c.x-b.x,c.y-b.y)*Math.hypot(c.x-a.x,c.y-a.y)/(2*cross);
  canyonMinRadius=Math.min(canyonMinRadius,radius);
  if(i%4)continue;
  for(let j=i+4;j<track.length;j+=4){
    const d=track[j].s-b.s;if(Math.min(d,track.totalLength-d)<CFG.wall*3)continue;
    assert(Math.hypot(b.x-track[j].x,b.y-track[j].y)>widthAt('wall',i/track.length)+widthAt('wall',j/track.length)+10,'Canyon walls must not overlap');
  }
}
assert(canyonMinRadius>CFG.wall+10,'Canyon curves must leave space for hard walls');
const canyonAsphalt=coastAt(0,0),sand=coastAt(0,CFG.runoff+8);
assert(sand<canyonAsphalt*.85,'Sand must substantially slow the car');
for(let i=0;i<track.length;i+=5)for(const side of [-1,1]){
  reset(i);const p=track[i],wall=widthAt('wall',i/track.length);
  car.x+=p.nx*side*(wall-30);car.y+=p.ny*side*(wall-30);car.vx=p.nx*side*650;car.vy=p.ny*side*650;
  step(.18);const n=nearestDriving(car.x,car.y);
  assert(n.distance<n.wall-8,'Canyon collisions must follow narrowed walls');
  assert(Number.isFinite(car.x+car.y+car.vx+car.vy));
}
reset();race.started=true;completeLap();assert.equal(race.lap,2,'Canyon checkpoints must record valid laps');
assert(storage.has(MAPS.canyon.bestKey),'Canyon must save a separate best time');
const canyonRecord=storage.get(MAPS.canyon.bestKey);
configureTrack('juniper');assert.equal(JSON.stringify(track),originalGeometry,'Juniper geometry must remain identical');
readBest();assert.equal(race.best,JSON.parse(juniperRecord),'Juniper best must survive switching');
configureTrack('canyon');readBest();assert.equal(race.best,JSON.parse(canyonRecord),'Canyon best must survive switching');
console.log('PASS: Canyon geometry, narrowed-wall collisions, sand drag, checkpoints, repeated track switches, unchanged Juniper, and isolated persistent records.');
console.log('Canyon minimum bend radius:',Math.round(canyonMinRadius),'| Circuit length:',Math.round(track.totalLength));

configureTrack('alpine');
assert.equal(MAPS.alpine.patches.length,3,'Alpine must contain only three ice patches');
for(const index of [240,560,880]){const before=track[index-55],after=track[index+55];assert(before.tx*after.tx+before.ty*after.ty<-.7,'Alpine must have three substantial reversing switchbacks');}
let alpineRun=0,alpineLongest=0,alpineMinRadius=Infinity;
for(let n=0;n<track.length*2;n++){const i=n%track.length,a=track[(i+track.length-1)%track.length],b=track[i],c=track[(i+1)%track.length],cross=Math.abs((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x)),r=Math.hypot(b.x-a.x,b.y-a.y)*Math.hypot(c.x-b.x,c.y-b.y)*Math.hypot(c.x-a.x,c.y-a.y)/(2*cross);alpineMinRadius=Math.min(alpineMinRadius,r);alpineRun=r>1000?alpineRun+Math.hypot(c.x-b.x,c.y-b.y):0;alpineLongest=Math.max(alpineLongest,alpineRun);}
assert(alpineMinRadius>CFG.wall+10);assert(alpineLongest<500,'Mountain traverses must be winding rather than long straights');
assert(MAPS.alpine.patches.reduce((sum,p)=>sum+p.length*2,0)/track.totalLength<.06,'Ice must cover only a small portion of the circuit');
for(let i=0;i<track.length;i+=5)for(const side of [-1,1]){
  reset(i);const p=track[i];car.x+=p.nx*side*(CFG.wall-30);car.y+=p.ny*side*(CFG.wall-30);car.vx=p.nx*side*650;car.vy=p.ny*side*650;
  step(.18);const n=nearestDriving(car.x,car.y);assert(n.distance<n.wall-8,'Alpine barriers must contain the car');
}
for(let i=0;i<track.length;i+=4)for(let j=i+4;j<track.length;j+=4){const a=track[i],b=track[j],d=b.s-a.s;if(Math.min(d,track.totalLength-d)<CFG.wall*3)continue;assert(Math.hypot(a.x-b.x,a.y-b.y)>CFG.wall*2+10,'Alpine track sections must not overlap');}
function atPatch(mapId,index=0){configureTrack(mapId);const patch=MAPS[mapId].patches[index];reset(Math.floor(patch.progress*track.length));const p=patchFrame(patch);car.x=p.x;car.y=p.y;car.angle=Math.atan2(p.ty,p.tx);return p;}
for(const id of ['juniper','canyon','alpine'])for(let i=0;i<MAPS[id].patches.length;i++){
  atPatch(id,i);assert.equal(surfaceAt(nearest(car.x,car.y)),MAPS[id].patches[i].type,'Visible patch geometry must match the physics surface');
}
configureTrack('alpine');reset();car.vx=Math.cos(car.angle)*140;car.vy=Math.sin(car.angle)*140;keys.add('KeyS');step(.15);const normalBraking=speed();
atPatch('alpine');car.vx=Math.cos(car.angle)*140;car.vy=Math.sin(car.angle)*140;keys.add('KeyS');step(.15);assert(speed()>normalBraking+20,'Ice must substantially reduce braking grip');
atPatch('alpine');car.vx=-Math.sin(car.angle)*100;car.vy=Math.cos(car.angle)*100;step(CFG.step);const iceSlip=car.slip;
reset();car.vx=-Math.sin(car.angle)*100;car.vy=Math.cos(car.angle)*100;step(CFG.step);assert(iceSlip>car.slip+2,'Ice must reduce lateral traction');
atPatch('canyon');car.vx=Math.cos(car.angle)*150;car.vy=Math.sin(car.angle)*150;step(.2);const driftSandSpeed=speed();
configureTrack('canyon');reset();car.vx=Math.cos(car.angle)*150;car.vy=Math.sin(car.angle)*150;step(.2);assert(driftSandSpeed<speed()*.91,'On-road sand patches must slow the car');
atPatch('juniper');step(CFG.step);assert(car.slickTime>1,'Oil must leave a short-lived effect on the tires');
for(let i=0;i<.5/CFG.step;i++){car.x=track[0].x;car.y=track[0].y;car.vx=car.vy=0;simulate(CFG.step);}assert(car.slickTime>0,'Oil must still affect traction briefly after leaving the patch');
for(let i=0;i<1/CFG.step;i++){car.x=track[0].x;car.y=track[0].y;simulate(CFG.step);}assert.equal(car.slickTime,0,'Oil traction must recover within a short time');

// Cars change performance and collision size; paint changes only the artwork.
const measured={};
assert.equal(VEHICLES.rally.sprite,4);assert.equal(VEHICLES.rally.name,'Offroad');
for(const id of Object.keys(VEHICLES)){
  assert(configureCar(id,'blue'));reset();keys.add('KeyW');
  for(let i=0;i<25/CFG.step;i++){car.x=track[0].x;car.y=track[0].y;simulate(CFG.step);}measured[id]=speed()*.46;
  assert(fs.existsSync(__dirname+'/'+carImagePath()),'Every selectable sprite must exist');
  for(let i=0;i<track.length;i+=100)for(const side of [-1,1]){reset(i);const p=track[i];car.x+=p.nx*side*(CFG.wall-32);car.y+=p.ny*side*(CFG.wall-32);car.vx=p.nx*side*650;car.vy=p.ny*side*650;step(.15);assert(withinDrivingRails(),'All car shapes must collide safely');}
}
assert(measured.sprint>measured.clubsport+10&&measured.rally<measured.clubsport,'Selectable cars must have distinct performance');
configureCar('sprint','green');const sprintKey=bestKeyFor();reset();race.started=true;completeLap();assert(storage.has(sprintKey),'Car records must be stored separately');
configureCar('sprint','yellow');assert.equal(bestKeyFor(),sprintKey,'Paint must not affect the personal-best category');readBest();assert(race.best>0);
configureCar('clubsport','red');assert.notEqual(bestKeyFor(),sprintKey);readBest();assert.equal(race.best,JSON.parse(juniperRecord),'Original car record must be preserved');
assert.equal(configureCar('unknown','red'),false);assert.equal(configureCar('clubsport','unknown'),false);
console.log('PASS: Alpine geometry and barriers; all visible hazard hitboxes; sparse ice, ice braking/steering, sand slowdown, oil recovery; car performance, sprite paths, collision sizes, and car-specific records.');
console.log('Car top speeds (km/h):',measured);

// Check the acceleration index against a full segment search, including points
// far outside the circuit where the fallback path is needed.
let seed=37;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
for(const id of Object.keys(MAPS)){
  configureTrack(id);
  for(let n=0;n<250;n++){
    const a=track[Math.floor(random()*track.length)],x=a.x+(random()-.5)*5000,y=a.y+(random()-.5)*5000;
    let best=Infinity;
    for(let i=0;i<track.length;i++){const p=track[i],q=track[(i+1)%track.length],dx=q.x-p.x,dy=q.y-p.y,t=Math.max(0,Math.min(1,((x-p.x)*dx+(y-p.y)*dy)/(dx*dx+dy*dy)));best=Math.min(best,(x-p.x-t*dx)**2+(y-p.y-t*dy)**2);}
    assert(Math.abs(nearest(x,y).d2-best)<1e-7,'Indexed track lookup must match a full search on '+id);
  }
}
configureTrack('rallycross');configureCar('clubsport','red');
assert.equal(surfaceAt({distance:0,progress:.2}),'DIRT');assert.equal(surfaceAt({distance:0,progress:.4}),'ASPHALT');
for(let i=0;i<track.length;i+=4){
  const a=track[(i+track.length-1)%track.length],b=track[i],c=track[(i+1)%track.length],cross=Math.abs((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x));
  assert(Math.hypot(b.x-a.x,b.y-a.y)*Math.hypot(c.x-b.x,c.y-b.y)*Math.hypot(c.x-a.x,c.y-a.y)/(2*cross)>CFG.wall+10,'Rallycross barriers must fit bends');
  for(let j=i+4;j<track.length;j+=4){const p=track[j],d=p.s-b.s;if(Math.min(d,track.totalLength-d)<CFG.wall*3)continue;assert(Math.hypot(b.x-p.x,b.y-p.y)>CFG.wall*2+10,'Rallycross sections must not overlap');}
  for(const side of [-1,1]){reset(i);car.x+=b.nx*side*(CFG.wall-30);car.y+=b.ny*side*(CFG.wall-30);car.vx=b.nx*side*650;car.vy=b.ny*side*650;step(.18);assert(withinDrivingRails());}
}
reset();race.started=true;completeLap();
assert.equal(timing.last.length,4);assert(timing.last.every(v=>v>0));assert(Math.abs(timing.last.reduce((a,b)=>a+b,0)-race.last)<1e-8,'Four sectors must sum to the recorded lap');
const savedSectors=JSON.stringify(timing.best);timing.best=[];readBest();assert.equal(JSON.stringify(timing.best),savedSectors,'Best sector references must survive reload');
reset();race.started=true;race.invalid=true;completeLap();assert.equal(JSON.stringify(timing.best),savedSectors,'Invalid lap must not replace sector references');
console.log('PASS: exact spatial lookup on all maps, Rallycross surface transitions/geometry/barriers, four-sector timing and persistence.');

// Tight jungle curves must accommodate rails and two drivable river fords.
configureTrack('amazonas');configureCar('clubsport','red');
let amazonRadius=Infinity,amazonStraight=0,amazonLongest=0;
for(let i=0;i<track.length;i++){
  const a=track[(i+track.length-1)%track.length],b=track[i],c=track[(i+1)%track.length];
  const cross=Math.abs((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x));
  const radius=Math.hypot(b.x-a.x,b.y-a.y)*Math.hypot(c.x-b.x,c.y-b.y)*Math.hypot(c.x-a.x,c.y-a.y)/(2*cross);
  amazonRadius=Math.min(amazonRadius,radius);
  amazonStraight=radius>1000?amazonStraight+Math.hypot(c.x-b.x,c.y-b.y):0;
  amazonLongest=Math.max(amazonLongest,amazonStraight);
  if(i%4===0)for(const side of [-1,1]){reset(i);car.x+=b.nx*side*(CFG.wall-30);car.y+=b.ny*side*(CFG.wall-30);car.vx=b.nx*side*650;car.vy=b.ny*side*650;step(.18);assert(withinDrivingRails(),'Amazonas rails must contain the car');}
  if(i%4===0)for(let j=i+4;j<track.length;j+=4){const q=track[j],arc=Math.min(q.s-b.s,track.totalLength-(q.s-b.s));if(arc>CFG.wall*3)assert(Math.hypot(q.x-b.x,q.y-b.y)>CFG.wall*2+10,'Jungle sections must leave room for both rails');}
}
assert(amazonRadius>CFG.wall+10,'Small-radius corners must still fit continuous rails');
assert(amazonLongest<350,'Amazonas must not have long straights');
let crossings=0;
for(let i=0;i<track.length;i++){const p=track[i],q=track[(i+track.length-1)%track.length];if(surfaceAt(nearest(p.x,p.y))==='FORD'&&surfaceAt(nearest(q.x,q.y))!=='FORD')crossings++;}
assert.equal(crossings,2,'The diagonal river must cross the road twice');
const fordIndex=track.findIndex(p=>surfaceAt(nearest(p.x,p.y))==='FORD');
const fordSpeed=coastAt(fordIndex,0),dryIndex=track.findIndex(p=>surfaceAt(nearest(p.x,p.y))==='ASPHALT'),drySpeed=coastAt(dryIndex,0);
assert(fordSpeed<drySpeed*.95,'Driving through a shallow ford must add water resistance');
reset(fordIndex);keys.add('KeyW');step(1);assert(speed()>30,'Cars must be able to drive through the river');
assert(amazonRiver[0].x<amazonRiver.at(-1).x&&amazonRiver[0].y<amazonRiver.at(-1).y,'River must run diagonally northwest to southeast');
reset(Math.floor(track.length*.32));car.vx=track[Math.floor(track.length*.32)].tx*180;car.vy=track[Math.floor(track.length*.32)].ty*180;
updateJungle(CFG.step);assert.equal(jungle.coconuts.length,1,'Monkey must throw at a passing car');
updateJungle(CFG.step);assert.equal(jungle.coconuts.length,1,'Throw cooldown must prevent spam');
const nut=jungle.coconuts[0];nut.age=nut.duration-CFG.step;car.x=nut.tx;car.y=nut.ty;updateJungle(CFG.step);
assert(car.coconutSlip>0&&nut.hit,'A coconut landing on the car must briefly reduce grip');
const velocityAfterHit=car.vx;updateJungle(CFG.step);assert.equal(car.vx,velocityAfterHit,'Each coconut may hit only once');
car.x=10000;car.y=10000;for(let i=0;i<500;i++)updateJungle(CFG.step);
assert.equal(car.coconutSlip,0,'Coconut grip penalty must expire');assert.equal(jungle.coconuts.length,0,'Old coconuts must be cleaned up');
reset(Math.floor(track.length*.32));car.vx=180;updateJungle(CFG.step);assert(jungle.coconuts.length>0);
configureTrack('juniper');assert.equal(jungle.coconuts.length,0,'Switching tracks must clear jungle hazards');assert.equal(car.coconutSlip,0);
updateJungle(1);assert.equal(jungle.coconuts.length,0,'Monkey hazards must only run on Amazonas');
console.log('PASS: Amazonas tight curves, rail impacts and spacing, two drivable river crossings and water drag, monkey throws/cooldown, coconut impacts/recovery, and map switching.');

for(const id of Object.keys(MAPS)){
  configureTrack(id);reset();
  for(let i=0;i<startingGrid.length;i++){
    const slot=startingGrid[i];
    assert(chooseStartingSlot(i),'A grid slot must be selectable before driving');
    assert.equal(car.x,slot.x);assert.equal(car.y,slot.y);assert(speed()===0,'Selecting a slot must leave the car stationary');
    assert(Math.abs(Math.cos(car.angle)*slot.tx+Math.sin(car.angle)*slot.ty-1)<1e-8,'Spawn must face along the local track tangent');
    for(const x of [-26,26])for(const y of [-14,14])assert(nearest(slot.x+slot.tx*x-slot.ty*y,slot.y+slot.ty*x+slot.tx*y).distance<CFG.road,'Every grid box must fit on the curved road');
  }
  race.started=true;const x=car.x,y=car.y;assert.equal(chooseStartingSlot(0),false);assert.equal(car.x,x);assert.equal(car.y,y);
}
console.log('PASS: selectable grid slots fit every circuit, align spawn direction, and cannot teleport during a race.');

for(const id of Object.keys(MAPS)){
  configureTrack(id);const placement=getPaddock();
  assert(Math.abs(placement.tx*track[0].tx+placement.ty*track[0].ty-1)<1e-8,'Paddock roofs must align with the local circuit');
  for(let x=-240;x<=280;x+=10)for(let y=-50;y<=85;y+=10){
    const p=paddockPoint(x,y),n=nearest(p.x,p.y);
    assert(n.distance>widthAt('wall',n.progress)+20,'The whole paddock and apron must clear all track barriers on '+id);
    if(id==='amazonas'){let riverDistance=Infinity;for(const q of amazonRiver)riverDistance=Math.min(riverDistance,Math.hypot(p.x-q.x,p.y-q.y));assert(riverDistance>130,'Paddock must stay clear of the river and banks');}
  }
}
console.log('PASS: all five paddocks align with the circuit, clear every road/barrier, and avoid the river.');

for(const id of Object.keys(MAPS)){
  configureTrack(id);reset();race.started=true;
  for(let i=1;i<=track.length;i++){const progress=(i%track.length)/track.length;updateRace(.1,{progress,distance:widthAt('wall',progress)-25});}
  assert.equal(race.lap,2,'A complete lap along the outer verge must count on '+id);assert.equal(timing.last.length,4);
  for(const gate of [.25,.5,.75]){
    reset();race.next=gate*4;race.previous=gate-.001;updateRace(.1,{progress:gate+.001,distance:widthAt('wall',gate)+1});assert.equal(race.next,gate*4,'Crossings beyond a barrier must not count');
    race.previous=gate+.001;updateRace(.1,{progress:gate-.001,distance:0});assert.equal(race.next,gate*4,'Reverse crossings must not count');
  }
  reset();race.previous=.999;race.next=4;race.travel=.95;updateRace(.1,{progress:.001,distance:widthAt('wall',0)+1});assert.equal(race.lap,1,'Finish crossings outside the barrier must not count');
}
console.log('PASS: full-width sector/finish gates count verge crossings on all maps and reject out-of-bounds/reverse crossings.');

for(const id of Object.keys(MAPS)){
  configureTrack(id);reset();
  assert(pitLane.points.length>100,'Each map must have a complete alternate paddock road');
  assert(nearest(pitLane.points[0].x,pitLane.points[0].y).distance<1e-6,'Pit entry must meet the circuit');
  assert(nearest(pitLane.points.at(-1).x,pitLane.points.at(-1).y).distance<1e-6,'Pit exit must meet the circuit');
  for(let i=1;i<pitLane.points.length-1;i++){
    const a=pitLane.points[i-1],b=pitLane.points[i],c=pitLane.points[i+1],cross=Math.abs((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x)),radius=Math.hypot(b.x-a.x,b.y-a.y)*Math.hypot(c.x-b.x,c.y-b.y)*Math.hypot(c.x-a.x,c.y-a.y)/(2*cross);
    assert(radius>pitLane.wall+10,'Pit curves must fit cars and barriers on '+id);
    reset();car.x=b.x;car.y=b.y;car.angle=Math.atan2(b.ty,b.tx);car.vx=b.tx*90;car.vy=b.ty*90;
    const x=car.x,y=car.y;step(CFG.step);assert(Math.hypot(car.x-x,car.y-y)<2,'Pit route must not hit an invisible main-track barrier on '+id);
    const n=nearestDriving(b.x,b.y);assert(n.distance<n.wall-20,'Pit centerline must be inside the drivable corridor');
  }
  // Take a complete lap through the pit lane instead of the main finish.
  reset();race.started=true;
  const exit=pitLane.exit,entry=pitLane.entry;race.previous=exit;
  for(let progress=exit+.001;progress<entry;progress+=.001)updateRace(.02,{progress,distance:0});
  for(const p of pitLane.points){const n=nearestDriving(p.x,p.y);updateRace(.02,n);}
  assert.equal(race.lap,2,'A full lap through the pits must count on '+id);
}
console.log('PASS: pit routes connect on all maps, fit cars/barriers, allow both merges, and preserve lap timing.');

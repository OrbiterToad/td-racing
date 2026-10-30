// Run with `node verify.cjs`. Exercises the real simulation without a browser.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const nodes = new Map();
const node = id => {if(!nodes.has(id)) nodes.set(id,{style:{},classList:{add(){},remove(){},toggle(){}},children:[]});return nodes.get(id);};
const storage = new Map();
const sandbox = {window:{},document:{getElementById:node},console,localStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)||null}};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(__dirname+'/main.js','utf8')+'\nmakeTrack();window.test={car,race,track,keys,simulate,recover,nearest,surfaceAt,CFG,updateRace,skidmarks,configureTrack,widthAt,readBest,MAPS,VEHICLES,configureCar,bestKeyFor,patchFrame,carImagePath,beginLap,timing,jungle,updateJungle,amazonRiver,startingGrid,chooseStartingSlot,paddockPoint,getPaddock:()=>paddock,pitLane,nearestDriving,lapGhost,recordGhostFrame,ghostPose,loadLapGhost,amazonRiverFrame,ghostStatus,startCountdown,liveGhostDelta,visibleGhostPose,coast,coastLandDistance,sceneryDetails,sceneryClear,cityTraffic,spawnCityTraffic,updateCityTraffic,updateTrafficPose,resolveCityTraffic,nearestPit,withinPitDistance,coastShoreFrame,SCENERY_ASSETS,paddockAssetLayout};',sandbox);
const {car,race,track,keys,simulate,recover,nearest,surfaceAt,CFG,updateRace,skidmarks,configureTrack,widthAt,readBest,MAPS,VEHICLES,configureCar,bestKeyFor,patchFrame,carImagePath,beginLap,timing,jungle,updateJungle,amazonRiver,startingGrid,chooseStartingSlot,paddockPoint,getPaddock,pitLane,nearestDriving,lapGhost,recordGhostFrame,ghostPose,loadLapGhost,amazonRiverFrame,ghostStatus,startCountdown,liveGhostDelta,visibleGhostPose,coast,coastLandDistance,sceneryDetails,sceneryClear,cityTraffic,spawnCityTraffic,updateCityTraffic,updateTrafficPose,resolveCityTraffic,nearestPit,withinPitDistance,coastShoreFrame,SCENERY_ASSETS,paddockAssetLayout}=sandbox.window.test;
function reset(i=0){keys.clear();beginLap();const p=track[i];Object.assign(car,{x:p.x,y:p.y,vx:0,vy:0,angle:Math.atan2(p.ty,p.tx),yaw:0,steer:0,slickTime:0,slip:0});Object.assign(race,{started:false,crossedStart:false,countdown:0,goTime:0,time:0,next:1,previous:i/track.length,invalid:false,travel:0,stuck:0,lap:1,best:null,last:null});}
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
console.log('PASS: all circuit paddocks align with the circuit, clear every road/barrier, and avoid the river.');

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

configureTrack('amazonas');configureCar('clubsport','red');
const waterIndex=track.findIndex(p=>surfaceAt(nearest(p.x,p.y))==='FORD');reset(waterIndex);
const waterStart={x:car.x,y:car.y},flow=amazonRiverFrame(car.x,car.y);step(.5);
const pull=(car.x-waterStart.x)*flow.tx+(car.y-waterStart.y)*flow.ty;
assert(pull>.05&&pull<5,'The southeast current must pull the car only slightly');
const dryStartIndex=track.findIndex(p=>surfaceAt(nearest(p.x,p.y))==='ASPHALT');reset(dryStartIndex);const stationary={x:car.x,y:car.y};step(.5);
assert(Math.hypot(car.x-stationary.x,car.y-stationary.y)<1e-8,'The current must not affect cars on dry asphalt');

configureTrack('juniper');configureCar('clubsport','red');reset();race.started=true;
for(let i=1;i<=track.length;i++){
  lapGhost.previous=[car.x,car.y,car.angle];const p=track[i%track.length];car.x=p.x;car.y=p.y;car.angle=Math.atan2(p.ty,p.tx);
  updateRace(.1,{progress:(i%track.length)/track.length,distance:0});recordGhostFrame();
}
const ghostKey=bestKeyFor()+'-ghost-v1',savedGhost=storage.get(ghostKey),savedGhostTime=race.best;
assert(savedGhost&&lapGhost.best,'A new best lap must record and save its ghost');
assert(Math.abs(lapGhost.best.time-race.last)<1e-8,'Ghost time must match the fastest lap');
const middle=ghostPose(savedGhostTime/2),middlePoint=track[Math.floor(track.length/2)];
assert(Math.hypot(middle.x-middlePoint.x,middle.y-middlePoint.y)<2,'Playback must follow the recorded car positions');
assert.equal(ghostPose(savedGhostTime+1),null,'A ghost must stop at its finish time');
readBest();assert(lapGhost.best&&Math.abs(lapGhost.best.time-savedGhostTime)<1e-8,'The best ghost must survive reload');
reset();race.best=savedGhostTime;race.started=true;
for(let i=1;i<=track.length;i++){lapGhost.previous=[car.x,car.y,car.angle];const p=track[i%track.length];car.x=p.x;car.y=p.y;car.angle=Math.atan2(p.ty,p.tx);updateRace(.2,{progress:(i%track.length)/track.length,distance:0});recordGhostFrame();}
assert.equal(storage.get(ghostKey),savedGhost,'A slower lap must preserve the fastest ghost');
configureCar('clubsport','blue');readBest();assert(lapGhost.best,'Changing paint must preserve the ghost');
configureCar('sprint','blue');readBest();assert.equal(lapGhost.best,null,'Each car must replay its own ghost');
configureTrack('canyon');readBest();assert.equal(lapGhost.best,null,'A ghost must never leak into another map');
configureTrack('juniper');configureCar('clubsport','red');readBest();assert(lapGhost.best,'Returning to a circuit must restore its ghost');
const realGhost=lapGhost.best;lapGhost.best={time:1,frames:[[0,0,0,Math.PI-.1],[1,10,0,-Math.PI+.1]]};lapGhost.cursor=0;
assert(Math.abs(Math.abs(ghostPose(.5).angle)-Math.PI)<1e-8,'Ghost headings must interpolate smoothly across angle wrap');lapGhost.best=realGhost;
storage.set(ghostKey,JSON.stringify({version:1,time:savedGhostTime,frames:[[0,0,0,0]]}));loadLapGhost();assert.equal(lapGhost.best,null,'Incomplete ghost data must be ignored');storage.set(ghostKey,savedGhost);readBest();assert(lapGhost.best);
console.log('PASS: gentle southeast river current only in water; best-lap ghost recording, interpolation, persistence, slower-lap preservation, map/car isolation, paint changes, and invalid data handling.');

// Existing best-time records predate trajectories. They must not prevent the
// first recorded ghost, or make a valid stored trajectory disappear on reload.
function driveRecordedLap(dt,invalid=false){
  reset();readBest();beginLap();race.started=true;race.invalid=invalid;
  for(let i=1;i<=track.length;i++){
    lapGhost.previous=[car.x,car.y,car.angle];const p=track[i%track.length];
    car.x=p.x;car.y=p.y;car.angle=Math.atan2(p.ty,p.tx);
    updateRace(dt,{progress:(i%track.length)/track.length,distance:0});recordGhostFrame();
  }
}
for(const id of Object.keys(MAPS)){
  configureTrack(id);configureCar('clubsport','red');const key=bestKeyFor()+'-ghost-v1';
  storage.set(bestKeyFor(),JSON.stringify(10));storage.delete(key);readBest();
  assert.equal(lapGhost.best,null);assert(ghostStatus().includes('Complete a clean lap'),'The HUD must explain how to get a missing ghost');
  driveRecordedLap(.1);assert(lapGhost.best,'First clean recorded lap must create a ghost despite an older faster best on '+id);
  assert.equal(race.best,10,'Creating a ghost must preserve the historic personal best');
  const first=lapGhost.best.time;readBest();assert.equal(lapGhost.best.time,first,'A recorded ghost slower than a historic best must survive reload');
  race.started=false;assert(ghostStatus().includes('READY'));assert(ghostPose(0),'Stored trajectory data must remain readable before driving');
  driveRecordedLap(.08);assert(lapGhost.best.time<first&&lapGhost.best.time>race.best,'The fastest recorded path must replace the ghost without beating an older best');
  const fastest=storage.get(key);driveRecordedLap(.12);assert.equal(storage.get(key),fastest,'A slower recorded lap must not replace the ghost');
  driveRecordedLap(.05,true);assert.equal(storage.get(key),fastest,'An invalid lap must not replace the ghost');
}
console.log('PASS: ghosts seed from a first clean lap with historic records, persist independently, improve with faster recorded laps, survive slower/invalid laps, and expose ready/recording status on all maps.');

configureTrack('amazonas');reset();keys.add('KeyW');startCountdown();const gridPosition={x:car.x,y:car.y};step(2.9);
assert(race.countdown>0&&race.time===0&&!race.started,'The countdown must not start lap timing');assert.equal(speed(),0);assert.equal(car.x,gridPosition.x);assert.equal(car.y,gridPosition.y);
assert.equal(lapGhost.frames.length,1,'Waiting for GO must not record an idle lap');step(.3);assert.equal(race.countdown,0);assert(speed()>8&&race.started,'Held throttle must drive after GO');assert(race.goTime>0,'GO must remain visible briefly');
keys.clear();reset();lapGhost.best={time:20,sectors:[5,5,5,5],frames:[[0,0,0,0],[5,100,0,0],[10,100,100,1.57],[15,0,100,3.14],[20,0,0,-1.57]]};race.started=true;race.crossedStart=true;race.next=1;race.time=1.5;car.x=50;car.y=0;
assert(Math.abs(liveGhostDelta()+1)<1e-8,'Delta must compare time at the same position, not at the same replay time');race.time=3.5;assert(Math.abs(liveGhostDelta()-1)<1e-8,'A slower driver must see a positive delta');
race.next=4;race.time=19;car.x=0;car.y=10;assert(Math.abs(liveGhostDelta()+.5)<1e-8,'Sector windows must distinguish the start from the finish');race.invalid=true;assert.equal(liveGhostDelta(),null,'Invalid laps must not show a misleading delta');race.invalid=false;car.x=10000;car.y=10000;assert.equal(liveGhostDelta(),null,'A driver far from the recorded path must not get a misleading delta');lapGhost.best=null;assert.equal(liveGhostDelta(),null);
console.log('PASS: 3–2–1–GO holds the car and timer, releases held throttle, and live ghost deltas compare matching positions with correct sign and finish-sector handling.');

for(const id of Object.keys(MAPS)){
  configureTrack(id);reset();const p=track[0];lapGhost.best={time:10,frames:[[0,p.x,p.y,0],[10,p.x+100,p.y,0]]};
  assert.equal(visibleGhostPose(),null,'Ghost must stay hidden on the grid on '+id);
  race.started=true;race.time=2;race.previous=.98;assert.equal(visibleGhostPose(),null,'Moving off the grid must not release the ghost');assert.equal(liveGhostDelta(),null);
  assert(ghostStatus().includes('Cross the start line'),'HUD must explain the waiting ghost');
  race.previous=.999;updateRace(.01,{progress:.001,distance:widthAt('wall',0)+10});assert.equal(visibleGhostPose(),null,'Crossing outside the barriers must not release the ghost');
  race.previous=.001;updateRace(.01,{progress:.999,distance:0});assert.equal(visibleGhostPose(),null,'Reverse crossing must not release the ghost');
  race.previous=.999;updateRace(.01,{progress:.001,distance:0});assert(race.crossedStart&&visibleGhostPose(),'Forward start crossing must release the ghost on '+id);assert(race.time<.01,'Ghost playback must start at the crossing rather than include the grid approach');
  const first=visibleGhostPose();assert(Math.abs(first.x-p.x)<1,'Ghost must begin at the start of its recording');
  updateRace(.1,{progress:.002,distance:0});assert(visibleGhostPose().x>first.x,'Ghost playback must advance after crossing');
  configureTrack(id);lapGhost.best={time:10,frames:[[0,p.x,p.y,0],[10,p.x+100,p.y,0]]};assert.equal(visibleGhostPose(),null,'A fresh run must hide the saved ghost again');
}
console.log('PASS: ghost car, minimap visibility, and live delta wait for a forward start crossing and reset on a fresh run on every map.');

configureTrack('coast');configureCar('clubsport','red');
assert.equal(MAPS.coast.name,'Costa Azul');assert.equal(MAPS.coast.patches.length,2,'The beach must have exactly two avoidable sand drifts');
let coastRadius=Infinity,coastRun=0,coastLongest=0;
for(let k=0;k<track.length*2;k++){
  const i=k%track.length,a=track[(i+track.length-1)%track.length],b=track[i],c=track[(i+1)%track.length],cross=Math.abs((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x)),radius=Math.hypot(b.x-a.x,b.y-a.y)*Math.hypot(c.x-b.x,c.y-b.y)*Math.hypot(c.x-a.x,c.y-a.y)/(2*cross);
  coastRadius=Math.min(coastRadius,radius);coastRun=radius>1000?coastRun+Math.hypot(c.x-b.x,c.y-b.y):0;coastLongest=Math.max(coastLongest,coastRun);
  if(k<track.length&&i%4===0){
    for(const side of [-1,1]){const x=b.x+b.nx*(CFG.wall+12)*side,y=b.y+b.ny*(CFG.wall+12)*side;assert(coastLandDistance(x,y)>150,'Sea and waves must stay outside both main-track barriers');}
    for(let j=i+4;j<track.length;j+=4){const q=track[j],arc=Math.min(q.s-b.s,track.totalLength-(q.s-b.s));if(arc>CFG.wall*3)assert(Math.hypot(q.x-b.x,q.y-b.y)>CFG.wall*2+10,'Coastal bends must leave space for both barriers');}
  }
}
assert(coastRadius>CFG.wall+10,'Coastal corner radii must fit the barriers');assert(coastLongest<400,'Costa Azul must have short links rather than long straights');
for(const p of pitLane.points)assert(coastLandDistance(p.x,p.y)>pitLane.wall+150,'The marina pit lane must stay on dry land');
assert(coastLandDistance(coast.lighthouse.x,coast.lighthouse.y)>100,'The lighthouse must stand on a dry headland');
for(const patch of MAPS.coast.patches){
  const p=patchFrame(patch);assert.equal(surfaceAt(nearest(p.x,p.y)),'SAND PATCH');
  const n=track[Math.floor(patch.progress*track.length)],offset=patch.lateral>0?-32:32;assert.equal(surfaceAt(nearest(n.x+n.nx*offset,n.y+n.ny*offset)),'ASPHALT','Each sand drift must leave an avoidance line');
}
console.log('PASS: Costa Azul short curves and barrier spacing, dry shoreline clearance, lighthouse, marina pit lane, and two avoidable sand drifts.');

for(const id of Object.keys(MAPS)){
  configureTrack(id);assert(sceneryDetails.length>25,'Each map must gain meaningful roadside detail');
  for(const prop of sceneryDetails)assert(sceneryClear(prop.x,prop.y,prop.radius),'Scenery must clear the main road, pits, paddock and water on '+id);
  const p=track[0];assert.equal(sceneryClear(p.x,p.y,30),false,'Scenery placement must reject the road');
  const pit=pitLane.points[Math.floor(pitLane.points.length/2)];assert.equal(sceneryClear(pit.x,pit.y,30),false,'Scenery placement must reject the pit road');
  const pad=getPaddock();assert.equal(sceneryClear(pad.x,pad.y,30),false,'Scenery placement must reject the paddock');
}
console.log('PASS: extra biome-specific scenery on every map stays clear of all driving corridors, paddocks, and water.');

configureTrack('city');configureCar('clubsport','red');reset();
assert.equal(MAPS.city.name,'City Streets');assert.equal(MAPS.city.patches.length,0,'Existing city streets should use traffic rather than circuit surface gimmicks');
let cityRadius=Infinity,downtownTight=0,suburbanSweep=0;
for(let i=0;i<track.length;i++){
  const a=track[(i+track.length-1)%track.length],b=track[i],c=track[(i+1)%track.length],cross=Math.abs((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x)),r=Math.hypot(b.x-a.x,b.y-a.y)*Math.hypot(c.x-b.x,c.y-b.y)*Math.hypot(c.x-a.x,c.y-a.y)/(2*cross);
  cityRadius=Math.min(cityRadius,r);if(b.y<-550&&r<135)downtownTight++;if(b.y>0&&r>180&&r<300)suburbanSweep++;
  if(i%4===0)for(let j=i+4;j<track.length;j+=4){const q=track[j],arc=Math.min(q.s-b.s,track.totalLength-(q.s-b.s));if(arc>CFG.wall*3)assert(Math.hypot(q.x-b.x,q.y-b.y)>CFG.wall*2+10,'City road sections and sidewalks must not overlap');}
}
assert(cityRadius>CFG.wall+10);assert(downtownTight>30&&suburbanSweep>40,'City must have distinct tight downtown corners and sweeping suburb bends');
assert.equal(cityTraffic.cars.length,0);updateCityTraffic(3.9);assert.equal(cityTraffic.cars.length,0,'Traffic must be occasional rather than spawn immediately');updateCityTraffic(.2);assert.equal(cityTraffic.cars.length,1,'Traffic must enter the street network');
const civilian=cityTraffic.cars[0];assert(Math.hypot(civilian.x-car.x,civilian.y-car.y)>600,'Traffic must start outside the camera, not appear on the player');const trafficPosition={x:civilian.x,y:civilian.y};updateCityTraffic(.5);assert(Math.hypot(civilian.x-trafficPosition.x,civilian.y-trafficPosition.y)>20,'Traffic must move along the roads');
assert(spawnCityTraffic());assert.equal(spawnCityTraffic(),false);assert.equal(cityTraffic.cars.length,2,'City may have at most two civilian cars');
const leader=cityTraffic.cars[1];civilian.s=2000;leader.s=2065;for(const vehicle of [civilian,leader]){vehicle.direction=1;vehicle.cruise=120;vehicle.speed=120;vehicle.brake=0;}updateCityTraffic(.2);assert(civilian.speed<leader.speed,'Civilian traffic must slow when following another car');
for(const direction of [-1,1])for(let i=0;i<track.length;i+=7){civilian.s=track[i].s;civilian.direction=direction;updateTrafficPose(civilian);assert(nearest(civilian.x,civilian.y).distance<CFG.road-10,'Both directions of traffic must remain inside the street lanes');}
civilian.s=track[10].s;civilian.direction=1;civilian.speed=110;updateTrafficPose(civilian);const tx=Math.cos(civilian.angle),ty=Math.sin(civilian.angle);Object.assign(car,{x:civilian.x-tx*14,y:civilian.y-ty*14,angle:civilian.angle,vx:tx*220,vy:ty*220});resolveCityTraffic();
assert(civilian.brake>0&&speed()<220,'Traffic contact must slow the player and brake the civilian');assert(Number.isFinite(car.x+car.y+car.vx+car.vy)&&withinDrivingRails(),'Traffic contact must stay stable and inside the street boundary');
cityTraffic.wait=100;car.x=10000;car.y=10000;for(const car of cityTraffic.cars)car.age=car.life+1;updateCityTraffic(.01);assert.equal(cityTraffic.cars.length,0,'Old traffic must disappear only when away from the player');
configureTrack('juniper');assert.equal(cityTraffic.cars.length,0);updateCityTraffic(100);assert.equal(cityTraffic.cars.length,0,'Other maps must not spawn civilian traffic');
console.log('PASS: City Streets tight downtown turns, wavy suburbs, street clearance, sparse two-way traffic, spawn cap, lane following, collisions/braking, cleanup and map isolation.');

// Independent full scans verify that cached segment data and bounding-box
// rejections preserve the exact nearest corridor, including pit entrances.
function brutePathDistance(points,x,y,closed=false){
  let best=Infinity;
  for(let i=0;i<points.length-(closed?0:1);i++){const p=points[i],q=points[(i+1)%points.length],dx=q.x-p.x,dy=q.y-p.y,t=Math.max(0,Math.min(1,((x-p.x)*dx+(y-p.y)*dy)/(dx*dx+dy*dy)));best=Math.min(best,Math.hypot(x-p.x-t*dx,y-p.y-t*dy));}
  return best;
}
for(const id of Object.keys(MAPS)){
  configureTrack(id);
  for(let i=0;i<350;i++){
    const p=i%3===0?pitLane.points[Math.floor(random()*pitLane.points.length)]:track[Math.floor(random()*track.length)],x=p.x+(random()-.5)*(i%3===2?10000:800),y=p.y+(random()-.5)*(i%3===2?10000:800),expectedPit=brutePathDistance(pitLane.points,x,y),main=nearest(x,y),actual=nearestDriving(x,y),pitWins=expectedPit-pitLane.wall<main.distance-widthAt('wall',main.progress);
    assert(Math.abs(nearestPit(x,y).distance-expectedPit)<1e-7,'Cached pit segments must match a full scan on '+id);
    assert.equal(!!actual.pit,pitWins,'Bounding rejection must choose the same drivable corridor on '+id);
    assert(Math.abs(actual.distance-(pitWins?expectedPit:main.distance))<1e-7);
    for(const radius of [0,20,80,200,600])assert.equal(withinPitDistance(x,y,radius),expectedPit<radius,'Pit proximity must match exact geometry');
  }
}
for(let i=0;i<200;i++){
  const x=(random()-.5)*10000,y=(random()-.5)*10000;
  assert(Math.abs(amazonRiverFrame(x,y).distance-brutePathDistance(amazonRiver,x,y))<1e-7,'River lookup must preserve its exact distance');
  assert(Math.abs(coastShoreFrame(x,y).distance-brutePathDistance(coast.shore,x,y,true))<1e-7,'Coast lookup must preserve its exact distance');
}
console.log('PASS: optimized road/pit selection, proximity rejection, river and shoreline queries match independent full scans across all maps.');

assert(measured.drift>178&&measured.drift<200,'Drift Spec must be a little slower than its original 207 km/h tuning');
assert(measured.formula>300&&measured.formula<370&&measured.formula>measured.sprint*1.6,'Formula X must have substantially higher speed');
function steadyCorner(id){
  configureTrack('juniper');configureCar(id,'red');reset();const p=track[0];car.vx=p.tx*250;car.vy=p.ty*250;keys.add('KeyW');keys.add('KeyD');
  for(let i=0;i<.8/CFG.step;i++){car.x=p.x;car.y=p.y;simulate(CFG.step);}return car.slip;
}
const clubSlip=steadyCorner('clubsport'),driftSlip=steadyCorner('drift');assert(driftSlip>clubSlip*2,'The drift coupe must hold a substantially larger powered slide');
keys.clear();keys.add('KeyA');for(let i=0;i<.6/CFG.step;i++){car.x=track[0].x;car.y=track[0].y;simulate(CFG.step);}assert(car.slip<driftSlip*.4,'Lifting and countersteering must catch a drift');
const formulaSlip=steadyCorner('formula');assert(formulaSlip<clubSlip*.6,'Formula X must remain planted in the same powered corner');
function brakeProbe(id){configureTrack('juniper');configureCar(id);reset();const p=track[0];car.vx=p.tx*300;car.vy=p.ty*300;keys.add('KeyS');for(let i=0;i<.2/CFG.step;i++){car.x=p.x;car.y=p.y;simulate(CFG.step);}return speed();}
assert(brakeProbe('formula')<brakeProbe('clubsport')*.65,'The formula car must have braking power to match its speed');
for(const id of Object.keys(VEHICLES))for(const color of ['red','blue','green','yellow','black']){
  const path=carImagePath(id,color);assert(path.startsWith('assets/cars/')&&path.endsWith('.svg'),'All six cars must have dedicated vector artwork');assert(fs.existsSync(__dirname+'/'+path),'Every car/paint asset must exist');
}
for(const id of ['drift','formula','muscle'])for(const map of Object.keys(MAPS)){
  configureTrack(map);configureCar(id);reset();
  for(let i=0;i<track.length;i+=35)for(const side of [-1,1]){reset(i);const p=track[i];car.x+=p.nx*side*(widthAt('wall',i/track.length)-34);car.y+=p.ny*side*(widthAt('wall',i/track.length)-34);car.vx=p.nx*side*1000;car.vy=p.ny*side*1000;step(.15);assert(withinDrivingRails(),'New cars must stay inside barriers at high impact speeds');assert(Number.isFinite(car.x+car.y+car.vx+car.vy));}
  for(let i=0;i<pitLane.points.length;i+=9){const p=pitLane.points[i];reset();car.x=p.x;car.y=p.y;car.angle=Math.atan2(p.ty,p.tx);car.vx=p.tx*90;car.vy=p.ty*90;const x=car.x,y=car.y;step(CFG.step);assert(Math.hypot(car.x-x,car.y-y)<2,'All new car sizes must fit through pit/service roads');}
}
configureTrack('juniper');const originalRecord=storage.get(MAPS.juniper.bestKey),newKeys=[];
for(const id of ['drift','formula','muscle']){configureCar(id,'red');driveRecordedLap(.1);const key=bestKeyFor();newKeys.push(key);assert(storage.has(key)&&storage.has(key+'-ghost-v1'),'All new cars must save separate best laps and ghosts');configureCar(id,'blue');assert.equal(bestKeyFor(),key,'Paint must preserve each new car’s record');readBest();assert(lapGhost.best);}
assert.notEqual(newKeys[0],newKeys[1]);assert.equal(storage.get(MAPS.juniper.bestKey),originalRecord,'New car records must not overwrite the original car');
console.log('PASS: slower controllable Drift Spec, very fast/high-grip Formula X, strong formula braking, all 30 SVG paints, high-speed collisions/pit clearance on every map, and separate records/ghosts.');

assert(measured.muscle>200&&measured.muscle<240,'Iron V8 must have strong muscle-car pace');
steadyCorner('clubsport');const agileYaw=car.yaw;steadyCorner('muscle');assert(car.yaw<agileYaw,'The muscle car must turn more deliberately than the balanced coupe');
assert.equal(VEHICLES.muscle.art,'muscle');assert(VEHICLES.muscle.power>VEHICLES.drift.power&&VEHICLES.muscle.steering<VEHICLES.drift.steering,'Iron V8 must emphasize torque over drift-car agility');
console.log('PASS: Iron V8 torque, deliberate steering, distinct pace and dedicated five-color muscle-car assets.');

assert(SCENERY_ASSETS.length>=36,'The new scenery library must include substantial tree, house, paddock and support-asset variety');
assert.equal(new Set(SCENERY_ASSETS).size,SCENERY_ASSETS.length,'Every scenery asset key must be unique');
for(const key of SCENERY_ASSETS)assert(fs.existsSync(__dirname+'/assets/scenery/'+key+'.svg'),'Every registered scenery asset must exist locally');
for(const id of Object.keys(MAPS)){
  configureTrack(id);const layout=paddockAssetLayout();assert.equal(layout.filter(p=>p.bay).length,5,'Each paddock must have five visible service bays');
  assert(layout.some(p=>p.key.startsWith('control-room')),'Each paddock must include a control building');
  assert(layout.some(p=>p.key==='tyre-rack')&&layout.some(p=>p.key==='fuel-store'),'Each paddock must include new service equipment');
  for(const prop of layout){
    assert(SCENERY_ASSETS.includes(prop.key),'Every paddock model must use a registered asset');
    for(const x of [-prop.w/2,prop.w/2])for(const y of [-prop.h/2,prop.h/2]){
      const lx=prop.x+Math.cos(prop.angle)*x-Math.sin(prop.angle)*y,ly=prop.y+Math.sin(prop.angle)*x+Math.cos(prop.angle)*y;
      assert(lx>=-240&&lx<=280&&ly>=-50&&ly<=85,'Paddock equipment must fit its reserved footprint');
      const p=paddockPoint(lx,ly),n=nearest(p.x,p.y);assert(n.distance>widthAt('wall',n.progress)+20,'New paddock assets must not cover the main road or barriers');assert(nearestPit(p.x,p.y).distance>pitLane.wall+10,'New paddock assets must stay outside the service lane');
    }
  }
  for(const prop of sceneryDetails){if(['cabin','hut','picnic','bench','canopy','tires'].includes(prop.kind))assert(Math.hypot(prop.size*.8,prop.size*.7)<=prop.radius,'New scenery assets must fit their tested clearance radius');}
}
console.log('PASS: 36 local scenery models, unique catalog, themed paddock bays/control buildings/equipment, safe footprints and service-lane clearance on every map.');

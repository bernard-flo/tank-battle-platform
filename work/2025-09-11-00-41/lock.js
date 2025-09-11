// Hyperion-lock - generated 2025-09-11T00:56:57.208Z
function name(){return "Hyperion-lock-1";}
function type(){return Type.TANKER;}
let __s1={last:null,lastVel:null,tick:0};
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  const P={"rMin":160,"rMax":280,"strafe":30,"strafeSpread":16,"strafeTick":2,"threatR":196,"fleeBias":12,"sep":60,"sepSpread":22,"edge":52,"leadCap":16,"leadW":0.96,"smoothPrev":0.6,"aimJitter":0.08,"healthW":1.18,"distW":0.14,"cxW":0.02,"cyW":0.02,"finisherHP":28,"aggrRemain":3,"aggrIn":22,"aggrOut":16,"bias":-12,"horizon":10,"samp":7,"avoidW":1,"edgeW":0.5,"rangeW":0.22,"rangeSpread":18,"ttcW":4,"jTick":1,"jSeed":11,"openTicks":24,"open":10,"openSpread":18};
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI, H=Math.hypot, clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  __s1.tick=(__s1.tick||0)+1;

  // 0) Team centroid and enemy selection (weighted by health and distance)
  let cx=tank.x, cy=tank.y; if(allies && allies.length){ let sx=tank.x, sy=tank.y; for(const a of allies){ sx+=a.x; sy+=a.y; } cx=sx/(allies.length+1); cy=sy/(allies.length+1); }
  let tgt=null,b=1e9; for(const e of enemies){ const k=e.health*P.healthW + e.distance*P.distW + Math.abs(e.x-cx)*P.cxW + Math.abs(e.y-cy)*P.cyW; if(k<b){b=k;tgt=e;} }

  // 1) Predictive aim with EW smoothing of enemy velocity and capped lead time
  if(tgt){ let ax=tgt.x, ay=tgt.y; if(__s1.last){
      const vx=tgt.x-__s1.last.x, vy=tgt.y-__s1.last.y;
      const lvx=__s1.lastVel?__s1.lastVel.vx:0, lvy=__s1.lastVel?__s1.lastVel.vy:0;
      const svx=lvx*P.smoothPrev+vx*(1-P.smoothPrev), svy=lvy*P.smoothPrev+vy*(1-P.smoothPrev); __s1.lastVel={vx:svx,vy:svy};
      const d=tgt.distance; const t=clamp(d/8,0,P.leadCap); ax=tgt.x+svx*P.leadW*t; ay=tgt.y+svy*P.leadW*t; }
    const dj=(((__s1.tick*P.jTick + ((tank.x*31+tank.y*17+P.jSeed)%23))%23)-11)*0.07;
    const jitter=dj*P.aimJitter*(1-Math.min(1,(tgt.distance/600))); // less jitter at long range
    tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); __s1.last={x:tgt.x,y:tgt.y}; }

  let _tries=0; const go=(a)=>{ if(_tries>=10) return false; _tries++; return tank.move(norm(a)); };

  // 2) Bullet avoidance using time-to-closest-approach heuristic
  let hot=null,score=1e9; for(const bu of bulletInfo){ const dx=bu.x-tank.x, dy=bu.y-tank.y; const v=H(bu.vx,bu.vy)||1; const nx=bu.vx/v, ny=bu.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=bu.x-proj*nx, py=bu.y-proj*ny; const d=H(px-tank.x,py-tank.y); const tt=proj/v; const sc=d + tt*P.ttcW; if(d<P.threatR && sc<score){ score=sc; hot=bu; } } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); const side=(((__s1.tick>>2)%2)?1:-1)*P.fleeBias + P.bias*0.6; const cand=[a+90+side, a-90-side, a+120, a-120, a+70, a-70, a+150, a-150]; for(const c of cand){ if(go(c)) return; }}

  // 2.5) Opening book movement (first few ticks): spread and break line-of-fire
  if(__s1.tick <= P.openTicks){
    const forward = tank.x < 450 ? 0 : 180;
    const prefer = norm(forward + P.open);
    if(go(prefer)) return;
    if(go(prefer + P.openSpread)) return;
    if(go(prefer - P.openSpread)) return;
  }

  // 3) Edge avoidance band
  if(tank.x<P.edge){ if(go(0))return; } if(tank.x>900-P.edge){ if(go(180))return; } if(tank.y<P.edge){ if(go(90))return; } if(tank.y>600-P.edge){ if(go(270))return; }

  // 4) Ally separation
  let near=null,ad=1e9; for(const a of allies){ if(a.distance<ad){ad=a.distance;near=a;} } if(near && ad<P.sep){ const away=toDeg(tank.x-near.x,tank.y-near.y); if(go(away))return; if(go(away+P.sepSpread))return; if(go(away-P.sepSpread))return; }

  // 5) Range control relative to target + adaptive strafing
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let minR=P.rMin, maxR=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ minR=Math.max(80,minR-P.aggrIn); maxR=Math.max(minR+30,maxR-P.aggrOut); }
    if(d<minR){ const away=to+180+P.bias*0.4; if(go(away))return; if(go(away+P.rangeSpread))return; if(go(away-P.rangeSpread))return; }
    else if(d>maxR){ if(go(to))return; if(go(to+P.rangeSpread))return; if(go(to-P.rangeSpread))return; }
    else { const dir = (((__s1.tick>>P.strafeTick)&1)?P.strafe:-P.strafe); const side=to + dir + P.bias*0.5; if(go(side))return; if(go(side+P.strafeSpread))return; if(go(side-P.strafeSpread))return; } }

  // 6) Fallback sweep
  const sweep=[0,45,90,135,180,225,270,315]; for(const s of sweep){ if(go(s+P.bias)) return; }
}


// ===== 다음 로봇 =====

function name(){return "Hyperion-lock-2";}
function type(){return Type.DEALER;}
let __s2={last:null,lastVel:null,tick:0};
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  const P={"rMin":184,"rMax":315,"strafe":34,"strafeSpread":16,"strafeTick":2,"threatR":196,"fleeBias":22,"sep":60,"sepSpread":22,"edge":52,"leadCap":16,"leadW":0.96,"smoothPrev":0.6,"aimJitter":0.08,"healthW":1.18,"distW":0.14,"cxW":0.02,"cyW":0.02,"finisherHP":28,"aggrRemain":3,"aggrIn":22,"aggrOut":16,"bias":20,"horizon":10,"samp":7,"avoidW":1,"edgeW":0.5,"rangeW":0.22,"rangeSpread":18,"ttcW":4,"jTick":1,"jSeed":8,"openTicks":24,"open":25,"openSpread":18};
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI, H=Math.hypot, clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  __s2.tick=(__s2.tick||0)+1;

  // 0) Team centroid and enemy selection (weighted by health and distance)
  let cx=tank.x, cy=tank.y; if(allies && allies.length){ let sx=tank.x, sy=tank.y; for(const a of allies){ sx+=a.x; sy+=a.y; } cx=sx/(allies.length+1); cy=sy/(allies.length+1); }
  let tgt=null,b=1e9; for(const e of enemies){ const k=e.health*P.healthW + e.distance*P.distW + Math.abs(e.x-cx)*P.cxW + Math.abs(e.y-cy)*P.cyW; if(k<b){b=k;tgt=e;} }

  // 1) Predictive aim with EW smoothing of enemy velocity and capped lead time
  if(tgt){ let ax=tgt.x, ay=tgt.y; if(__s2.last){
      const vx=tgt.x-__s2.last.x, vy=tgt.y-__s2.last.y;
      const lvx=__s2.lastVel?__s2.lastVel.vx:0, lvy=__s2.lastVel?__s2.lastVel.vy:0;
      const svx=lvx*P.smoothPrev+vx*(1-P.smoothPrev), svy=lvy*P.smoothPrev+vy*(1-P.smoothPrev); __s2.lastVel={vx:svx,vy:svy};
      const d=tgt.distance; const t=clamp(d/8,0,P.leadCap); ax=tgt.x+svx*P.leadW*t; ay=tgt.y+svy*P.leadW*t; }
    const dj=(((__s2.tick*P.jTick + ((tank.x*31+tank.y*17+P.jSeed)%23))%23)-11)*0.07;
    const jitter=dj*P.aimJitter*(1-Math.min(1,(tgt.distance/600))); // less jitter at long range
    tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); __s2.last={x:tgt.x,y:tgt.y}; }

  let _tries=0; const go=(a)=>{ if(_tries>=10) return false; _tries++; return tank.move(norm(a)); };

  // 2) Bullet avoidance using time-to-closest-approach heuristic
  let hot=null,score=1e9; for(const bu of bulletInfo){ const dx=bu.x-tank.x, dy=bu.y-tank.y; const v=H(bu.vx,bu.vy)||1; const nx=bu.vx/v, ny=bu.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=bu.x-proj*nx, py=bu.y-proj*ny; const d=H(px-tank.x,py-tank.y); const tt=proj/v; const sc=d + tt*P.ttcW; if(d<P.threatR && sc<score){ score=sc; hot=bu; } } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); const side=(((__s2.tick>>2)%2)?1:-1)*P.fleeBias + P.bias*0.6; const cand=[a+90+side, a-90-side, a+120, a-120, a+70, a-70, a+150, a-150]; for(const c of cand){ if(go(c)) return; }}

  // 2.5) Opening book movement (first few ticks): spread and break line-of-fire
  if(__s2.tick <= P.openTicks){
    const forward = tank.x < 450 ? 0 : 180;
    const prefer = norm(forward + P.open);
    if(go(prefer)) return;
    if(go(prefer + P.openSpread)) return;
    if(go(prefer - P.openSpread)) return;
  }

  // 3) Edge avoidance band
  if(tank.x<P.edge){ if(go(0))return; } if(tank.x>900-P.edge){ if(go(180))return; } if(tank.y<P.edge){ if(go(90))return; } if(tank.y>600-P.edge){ if(go(270))return; }

  // 4) Ally separation
  let near=null,ad=1e9; for(const a of allies){ if(a.distance<ad){ad=a.distance;near=a;} } if(near && ad<P.sep){ const away=toDeg(tank.x-near.x,tank.y-near.y); if(go(away))return; if(go(away+P.sepSpread))return; if(go(away-P.sepSpread))return; }

  // 5) Range control relative to target + adaptive strafing
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let minR=P.rMin, maxR=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ minR=Math.max(80,minR-P.aggrIn); maxR=Math.max(minR+30,maxR-P.aggrOut); }
    if(d<minR){ const away=to+180+P.bias*0.4; if(go(away))return; if(go(away+P.rangeSpread))return; if(go(away-P.rangeSpread))return; }
    else if(d>maxR){ if(go(to))return; if(go(to+P.rangeSpread))return; if(go(to-P.rangeSpread))return; }
    else { const dir = (((__s2.tick>>P.strafeTick)&1)?P.strafe:-P.strafe); const side=to + dir + P.bias*0.5; if(go(side))return; if(go(side+P.strafeSpread))return; if(go(side-P.strafeSpread))return; } }

  // 6) Fallback sweep
  const sweep=[0,45,90,135,180,225,270,315]; for(const s of sweep){ if(go(s+P.bias)) return; }
}


// ===== 다음 로봇 =====

function name(){return "Hyperion-lock-3";}
function type(){return Type.NORMAL;}
let __s3={last:null,lastVel:null,tick:0};
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  const P={"rMin":170,"rMax":298,"strafe":30,"strafeSpread":16,"strafeTick":2,"threatR":196,"fleeBias":16,"sep":60,"sepSpread":22,"edge":52,"leadCap":16,"leadW":0.96,"smoothPrev":0.6,"aimJitter":0.08,"healthW":1.18,"distW":0.14,"cxW":0.02,"cyW":0.02,"finisherHP":28,"aggrRemain":3,"aggrIn":22,"aggrOut":16,"bias":6,"horizon":10,"samp":7,"avoidW":1,"edgeW":0.5,"rangeW":0.22,"rangeSpread":18,"ttcW":4,"jTick":1,"jSeed":5,"openTicks":24,"open":18,"openSpread":18};
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI, H=Math.hypot, clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  __s3.tick=(__s3.tick||0)+1;

  // 0) Team centroid and enemy selection (weighted by health and distance)
  let cx=tank.x, cy=tank.y; if(allies && allies.length){ let sx=tank.x, sy=tank.y; for(const a of allies){ sx+=a.x; sy+=a.y; } cx=sx/(allies.length+1); cy=sy/(allies.length+1); }
  let tgt=null,b=1e9; for(const e of enemies){ const k=e.health*P.healthW + e.distance*P.distW + Math.abs(e.x-cx)*P.cxW + Math.abs(e.y-cy)*P.cyW; if(k<b){b=k;tgt=e;} }

  // 1) Predictive aim with EW smoothing of enemy velocity and capped lead time
  if(tgt){ let ax=tgt.x, ay=tgt.y; if(__s3.last){
      const vx=tgt.x-__s3.last.x, vy=tgt.y-__s3.last.y;
      const lvx=__s3.lastVel?__s3.lastVel.vx:0, lvy=__s3.lastVel?__s3.lastVel.vy:0;
      const svx=lvx*P.smoothPrev+vx*(1-P.smoothPrev), svy=lvy*P.smoothPrev+vy*(1-P.smoothPrev); __s3.lastVel={vx:svx,vy:svy};
      const d=tgt.distance; const t=clamp(d/8,0,P.leadCap); ax=tgt.x+svx*P.leadW*t; ay=tgt.y+svy*P.leadW*t; }
    const dj=(((__s3.tick*P.jTick + ((tank.x*31+tank.y*17+P.jSeed)%23))%23)-11)*0.07;
    const jitter=dj*P.aimJitter*(1-Math.min(1,(tgt.distance/600))); // less jitter at long range
    tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); __s3.last={x:tgt.x,y:tgt.y}; }

  let _tries=0; const go=(a)=>{ if(_tries>=10) return false; _tries++; return tank.move(norm(a)); };

  // 2) Bullet avoidance using time-to-closest-approach heuristic
  let hot=null,score=1e9; for(const bu of bulletInfo){ const dx=bu.x-tank.x, dy=bu.y-tank.y; const v=H(bu.vx,bu.vy)||1; const nx=bu.vx/v, ny=bu.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=bu.x-proj*nx, py=bu.y-proj*ny; const d=H(px-tank.x,py-tank.y); const tt=proj/v; const sc=d + tt*P.ttcW; if(d<P.threatR && sc<score){ score=sc; hot=bu; } } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); const side=(((__s3.tick>>2)%2)?1:-1)*P.fleeBias + P.bias*0.6; const cand=[a+90+side, a-90-side, a+120, a-120, a+70, a-70, a+150, a-150]; for(const c of cand){ if(go(c)) return; }}

  // 2.5) Opening book movement (first few ticks): spread and break line-of-fire
  if(__s3.tick <= P.openTicks){
    const forward = tank.x < 450 ? 0 : 180;
    const prefer = norm(forward + P.open);
    if(go(prefer)) return;
    if(go(prefer + P.openSpread)) return;
    if(go(prefer - P.openSpread)) return;
  }

  // 3) Edge avoidance band
  if(tank.x<P.edge){ if(go(0))return; } if(tank.x>900-P.edge){ if(go(180))return; } if(tank.y<P.edge){ if(go(90))return; } if(tank.y>600-P.edge){ if(go(270))return; }

  // 4) Ally separation
  let near=null,ad=1e9; for(const a of allies){ if(a.distance<ad){ad=a.distance;near=a;} } if(near && ad<P.sep){ const away=toDeg(tank.x-near.x,tank.y-near.y); if(go(away))return; if(go(away+P.sepSpread))return; if(go(away-P.sepSpread))return; }

  // 5) Range control relative to target + adaptive strafing
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let minR=P.rMin, maxR=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ minR=Math.max(80,minR-P.aggrIn); maxR=Math.max(minR+30,maxR-P.aggrOut); }
    if(d<minR){ const away=to+180+P.bias*0.4; if(go(away))return; if(go(away+P.rangeSpread))return; if(go(away-P.rangeSpread))return; }
    else if(d>maxR){ if(go(to))return; if(go(to+P.rangeSpread))return; if(go(to-P.rangeSpread))return; }
    else { const dir = (((__s3.tick>>P.strafeTick)&1)?P.strafe:-P.strafe); const side=to + dir + P.bias*0.5; if(go(side))return; if(go(side+P.strafeSpread))return; if(go(side-P.strafeSpread))return; } }

  // 6) Fallback sweep
  const sweep=[0,45,90,135,180,225,270,315]; for(const s of sweep){ if(go(s+P.bias)) return; }
}


// ===== 다음 로봇 =====

function name(){return "Hyperion-lock-4";}
function type(){return Type.DEALER;}
let __s4={last:null,lastVel:null,tick:0};
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  const P={"rMin":190,"rMax":305,"strafe":34,"strafeSpread":16,"strafeTick":2,"threatR":196,"fleeBias":22,"sep":60,"sepSpread":22,"edge":52,"leadCap":16,"leadW":0.96,"smoothPrev":0.6,"aimJitter":0.08,"healthW":1.18,"distW":0.14,"cxW":0.02,"cyW":0.02,"finisherHP":28,"aggrRemain":3,"aggrIn":22,"aggrOut":16,"bias":22,"horizon":10,"samp":7,"avoidW":1,"edgeW":0.5,"rangeW":0.22,"rangeSpread":18,"ttcW":4,"jTick":1,"jSeed":10,"openTicks":24,"open":25,"openSpread":18};
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI, H=Math.hypot, clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  __s4.tick=(__s4.tick||0)+1;

  // 0) Team centroid and enemy selection (weighted by health and distance)
  let cx=tank.x, cy=tank.y; if(allies && allies.length){ let sx=tank.x, sy=tank.y; for(const a of allies){ sx+=a.x; sy+=a.y; } cx=sx/(allies.length+1); cy=sy/(allies.length+1); }
  let tgt=null,b=1e9; for(const e of enemies){ const k=e.health*P.healthW + e.distance*P.distW + Math.abs(e.x-cx)*P.cxW + Math.abs(e.y-cy)*P.cyW; if(k<b){b=k;tgt=e;} }

  // 1) Predictive aim with EW smoothing of enemy velocity and capped lead time
  if(tgt){ let ax=tgt.x, ay=tgt.y; if(__s4.last){
      const vx=tgt.x-__s4.last.x, vy=tgt.y-__s4.last.y;
      const lvx=__s4.lastVel?__s4.lastVel.vx:0, lvy=__s4.lastVel?__s4.lastVel.vy:0;
      const svx=lvx*P.smoothPrev+vx*(1-P.smoothPrev), svy=lvy*P.smoothPrev+vy*(1-P.smoothPrev); __s4.lastVel={vx:svx,vy:svy};
      const d=tgt.distance; const t=clamp(d/8,0,P.leadCap); ax=tgt.x+svx*P.leadW*t; ay=tgt.y+svy*P.leadW*t; }
    const dj=(((__s4.tick*P.jTick + ((tank.x*31+tank.y*17+P.jSeed)%23))%23)-11)*0.07;
    const jitter=dj*P.aimJitter*(1-Math.min(1,(tgt.distance/600))); // less jitter at long range
    tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); __s4.last={x:tgt.x,y:tgt.y}; }

  let _tries=0; const go=(a)=>{ if(_tries>=10) return false; _tries++; return tank.move(norm(a)); };

  // 2) Bullet avoidance using time-to-closest-approach heuristic
  let hot=null,score=1e9; for(const bu of bulletInfo){ const dx=bu.x-tank.x, dy=bu.y-tank.y; const v=H(bu.vx,bu.vy)||1; const nx=bu.vx/v, ny=bu.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=bu.x-proj*nx, py=bu.y-proj*ny; const d=H(px-tank.x,py-tank.y); const tt=proj/v; const sc=d + tt*P.ttcW; if(d<P.threatR && sc<score){ score=sc; hot=bu; } } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); const side=(((__s4.tick>>2)%2)?1:-1)*P.fleeBias + P.bias*0.6; const cand=[a+90+side, a-90-side, a+120, a-120, a+70, a-70, a+150, a-150]; for(const c of cand){ if(go(c)) return; }}

  // 2.5) Opening book movement (first few ticks): spread and break line-of-fire
  if(__s4.tick <= P.openTicks){
    const forward = tank.x < 450 ? 0 : 180;
    const prefer = norm(forward + P.open);
    if(go(prefer)) return;
    if(go(prefer + P.openSpread)) return;
    if(go(prefer - P.openSpread)) return;
  }

  // 3) Edge avoidance band
  if(tank.x<P.edge){ if(go(0))return; } if(tank.x>900-P.edge){ if(go(180))return; } if(tank.y<P.edge){ if(go(90))return; } if(tank.y>600-P.edge){ if(go(270))return; }

  // 4) Ally separation
  let near=null,ad=1e9; for(const a of allies){ if(a.distance<ad){ad=a.distance;near=a;} } if(near && ad<P.sep){ const away=toDeg(tank.x-near.x,tank.y-near.y); if(go(away))return; if(go(away+P.sepSpread))return; if(go(away-P.sepSpread))return; }

  // 5) Range control relative to target + adaptive strafing
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let minR=P.rMin, maxR=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ minR=Math.max(80,minR-P.aggrIn); maxR=Math.max(minR+30,maxR-P.aggrOut); }
    if(d<minR){ const away=to+180+P.bias*0.4; if(go(away))return; if(go(away+P.rangeSpread))return; if(go(away-P.rangeSpread))return; }
    else if(d>maxR){ if(go(to))return; if(go(to+P.rangeSpread))return; if(go(to-P.rangeSpread))return; }
    else { const dir = (((__s4.tick>>P.strafeTick)&1)?P.strafe:-P.strafe); const side=to + dir + P.bias*0.5; if(go(side))return; if(go(side+P.strafeSpread))return; if(go(side-P.strafeSpread))return; } }

  // 6) Fallback sweep
  const sweep=[0,45,90,135,180,225,270,315]; for(const s of sweep){ if(go(s+P.bias)) return; }
}


// ===== 다음 로봇 =====

function name(){return "Hyperion-lock-5";}
function type(){return Type.NORMAL;}
let __s5={last:null,lastVel:null,tick:0};
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  const P={"rMin":170,"rMax":298,"strafe":30,"strafeSpread":16,"strafeTick":2,"threatR":196,"fleeBias":16,"sep":60,"sepSpread":22,"edge":52,"leadCap":16,"leadW":0.96,"smoothPrev":0.6,"aimJitter":0.08,"healthW":1.18,"distW":0.14,"cxW":0.02,"cyW":0.02,"finisherHP":28,"aggrRemain":3,"aggrIn":22,"aggrOut":16,"bias":4,"horizon":10,"samp":7,"avoidW":1,"edgeW":0.5,"rangeW":0.22,"rangeSpread":18,"ttcW":4,"jTick":1,"jSeed":7,"openTicks":24,"open":18,"openSpread":18};
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI, H=Math.hypot, clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  __s5.tick=(__s5.tick||0)+1;

  // 0) Team centroid and enemy selection (weighted by health and distance)
  let cx=tank.x, cy=tank.y; if(allies && allies.length){ let sx=tank.x, sy=tank.y; for(const a of allies){ sx+=a.x; sy+=a.y; } cx=sx/(allies.length+1); cy=sy/(allies.length+1); }
  let tgt=null,b=1e9; for(const e of enemies){ const k=e.health*P.healthW + e.distance*P.distW + Math.abs(e.x-cx)*P.cxW + Math.abs(e.y-cy)*P.cyW; if(k<b){b=k;tgt=e;} }

  // 1) Predictive aim with EW smoothing of enemy velocity and capped lead time
  if(tgt){ let ax=tgt.x, ay=tgt.y; if(__s5.last){
      const vx=tgt.x-__s5.last.x, vy=tgt.y-__s5.last.y;
      const lvx=__s5.lastVel?__s5.lastVel.vx:0, lvy=__s5.lastVel?__s5.lastVel.vy:0;
      const svx=lvx*P.smoothPrev+vx*(1-P.smoothPrev), svy=lvy*P.smoothPrev+vy*(1-P.smoothPrev); __s5.lastVel={vx:svx,vy:svy};
      const d=tgt.distance; const t=clamp(d/8,0,P.leadCap); ax=tgt.x+svx*P.leadW*t; ay=tgt.y+svy*P.leadW*t; }
    const dj=(((__s5.tick*P.jTick + ((tank.x*31+tank.y*17+P.jSeed)%23))%23)-11)*0.07;
    const jitter=dj*P.aimJitter*(1-Math.min(1,(tgt.distance/600))); // less jitter at long range
    tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); __s5.last={x:tgt.x,y:tgt.y}; }

  let _tries=0; const go=(a)=>{ if(_tries>=10) return false; _tries++; return tank.move(norm(a)); };

  // 2) Bullet avoidance using time-to-closest-approach heuristic
  let hot=null,score=1e9; for(const bu of bulletInfo){ const dx=bu.x-tank.x, dy=bu.y-tank.y; const v=H(bu.vx,bu.vy)||1; const nx=bu.vx/v, ny=bu.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=bu.x-proj*nx, py=bu.y-proj*ny; const d=H(px-tank.x,py-tank.y); const tt=proj/v; const sc=d + tt*P.ttcW; if(d<P.threatR && sc<score){ score=sc; hot=bu; } } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); const side=(((__s5.tick>>2)%2)?1:-1)*P.fleeBias + P.bias*0.6; const cand=[a+90+side, a-90-side, a+120, a-120, a+70, a-70, a+150, a-150]; for(const c of cand){ if(go(c)) return; }}

  // 2.5) Opening book movement (first few ticks): spread and break line-of-fire
  if(__s5.tick <= P.openTicks){
    const forward = tank.x < 450 ? 0 : 180;
    const prefer = norm(forward + P.open);
    if(go(prefer)) return;
    if(go(prefer + P.openSpread)) return;
    if(go(prefer - P.openSpread)) return;
  }

  // 3) Edge avoidance band
  if(tank.x<P.edge){ if(go(0))return; } if(tank.x>900-P.edge){ if(go(180))return; } if(tank.y<P.edge){ if(go(90))return; } if(tank.y>600-P.edge){ if(go(270))return; }

  // 4) Ally separation
  let near=null,ad=1e9; for(const a of allies){ if(a.distance<ad){ad=a.distance;near=a;} } if(near && ad<P.sep){ const away=toDeg(tank.x-near.x,tank.y-near.y); if(go(away))return; if(go(away+P.sepSpread))return; if(go(away-P.sepSpread))return; }

  // 5) Range control relative to target + adaptive strafing
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let minR=P.rMin, maxR=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ minR=Math.max(80,minR-P.aggrIn); maxR=Math.max(minR+30,maxR-P.aggrOut); }
    if(d<minR){ const away=to+180+P.bias*0.4; if(go(away))return; if(go(away+P.rangeSpread))return; if(go(away-P.rangeSpread))return; }
    else if(d>maxR){ if(go(to))return; if(go(to+P.rangeSpread))return; if(go(to-P.rangeSpread))return; }
    else { const dir = (((__s5.tick>>P.strafeTick)&1)?P.strafe:-P.strafe); const side=to + dir + P.bias*0.5; if(go(side))return; if(go(side+P.strafeSpread))return; if(go(side-P.strafeSpread))return; } }

  // 6) Fallback sweep
  const sweep=[0,45,90,135,180,225,270,315]; for(const s of sweep){ if(go(s+P.bias)) return; }
}


// ===== 다음 로봇 =====

function name(){return "Hyperion-lock-6";}
function type(){return Type.TANKER;}
let __s6={last:null,lastVel:null,tick:0};
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  const P={"rMin":154,"rMax":280,"strafe":30,"strafeSpread":16,"strafeTick":2,"threatR":196,"fleeBias":12,"sep":60,"sepSpread":22,"edge":52,"leadCap":16,"leadW":0.96,"smoothPrev":0.6,"aimJitter":0.08,"healthW":1.18,"distW":0.14,"cxW":0.02,"cyW":0.02,"finisherHP":28,"aggrRemain":3,"aggrIn":22,"aggrOut":16,"bias":-10,"horizon":10,"samp":7,"avoidW":1,"edgeW":0.5,"rangeW":0.22,"rangeSpread":18,"ttcW":4,"jTick":1,"jSeed":16,"openTicks":24,"open":10,"openSpread":18};
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI, H=Math.hypot, clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  __s6.tick=(__s6.tick||0)+1;

  // 0) Team centroid and enemy selection (weighted by health and distance)
  let cx=tank.x, cy=tank.y; if(allies && allies.length){ let sx=tank.x, sy=tank.y; for(const a of allies){ sx+=a.x; sy+=a.y; } cx=sx/(allies.length+1); cy=sy/(allies.length+1); }
  let tgt=null,b=1e9; for(const e of enemies){ const k=e.health*P.healthW + e.distance*P.distW + Math.abs(e.x-cx)*P.cxW + Math.abs(e.y-cy)*P.cyW; if(k<b){b=k;tgt=e;} }

  // 1) Predictive aim with EW smoothing of enemy velocity and capped lead time
  if(tgt){ let ax=tgt.x, ay=tgt.y; if(__s6.last){
      const vx=tgt.x-__s6.last.x, vy=tgt.y-__s6.last.y;
      const lvx=__s6.lastVel?__s6.lastVel.vx:0, lvy=__s6.lastVel?__s6.lastVel.vy:0;
      const svx=lvx*P.smoothPrev+vx*(1-P.smoothPrev), svy=lvy*P.smoothPrev+vy*(1-P.smoothPrev); __s6.lastVel={vx:svx,vy:svy};
      const d=tgt.distance; const t=clamp(d/8,0,P.leadCap); ax=tgt.x+svx*P.leadW*t; ay=tgt.y+svy*P.leadW*t; }
    const dj=(((__s6.tick*P.jTick + ((tank.x*31+tank.y*17+P.jSeed)%23))%23)-11)*0.07;
    const jitter=dj*P.aimJitter*(1-Math.min(1,(tgt.distance/600))); // less jitter at long range
    tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); __s6.last={x:tgt.x,y:tgt.y}; }

  let _tries=0; const go=(a)=>{ if(_tries>=10) return false; _tries++; return tank.move(norm(a)); };

  // 2) Bullet avoidance using time-to-closest-approach heuristic
  let hot=null,score=1e9; for(const bu of bulletInfo){ const dx=bu.x-tank.x, dy=bu.y-tank.y; const v=H(bu.vx,bu.vy)||1; const nx=bu.vx/v, ny=bu.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=bu.x-proj*nx, py=bu.y-proj*ny; const d=H(px-tank.x,py-tank.y); const tt=proj/v; const sc=d + tt*P.ttcW; if(d<P.threatR && sc<score){ score=sc; hot=bu; } } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); const side=(((__s6.tick>>2)%2)?1:-1)*P.fleeBias + P.bias*0.6; const cand=[a+90+side, a-90-side, a+120, a-120, a+70, a-70, a+150, a-150]; for(const c of cand){ if(go(c)) return; }}

  // 2.5) Opening book movement (first few ticks): spread and break line-of-fire
  if(__s6.tick <= P.openTicks){
    const forward = tank.x < 450 ? 0 : 180;
    const prefer = norm(forward + P.open);
    if(go(prefer)) return;
    if(go(prefer + P.openSpread)) return;
    if(go(prefer - P.openSpread)) return;
  }

  // 3) Edge avoidance band
  if(tank.x<P.edge){ if(go(0))return; } if(tank.x>900-P.edge){ if(go(180))return; } if(tank.y<P.edge){ if(go(90))return; } if(tank.y>600-P.edge){ if(go(270))return; }

  // 4) Ally separation
  let near=null,ad=1e9; for(const a of allies){ if(a.distance<ad){ad=a.distance;near=a;} } if(near && ad<P.sep){ const away=toDeg(tank.x-near.x,tank.y-near.y); if(go(away))return; if(go(away+P.sepSpread))return; if(go(away-P.sepSpread))return; }

  // 5) Range control relative to target + adaptive strafing
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let minR=P.rMin, maxR=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ minR=Math.max(80,minR-P.aggrIn); maxR=Math.max(minR+30,maxR-P.aggrOut); }
    if(d<minR){ const away=to+180+P.bias*0.4; if(go(away))return; if(go(away+P.rangeSpread))return; if(go(away-P.rangeSpread))return; }
    else if(d>maxR){ if(go(to))return; if(go(to+P.rangeSpread))return; if(go(to-P.rangeSpread))return; }
    else { const dir = (((__s6.tick>>P.strafeTick)&1)?P.strafe:-P.strafe); const side=to + dir + P.bias*0.5; if(go(side))return; if(go(side+P.strafeSpread))return; if(go(side-P.strafeSpread))return; } }

  // 6) Fallback sweep
  const sweep=[0,45,90,135,180,225,270,315]; for(const s of sweep){ if(go(s+P.bias)) return; }
}

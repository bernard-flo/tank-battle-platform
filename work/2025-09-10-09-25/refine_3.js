function name(){return "Helios-1";}
function type(){return 1;}
// Persistent state (simulator secure runner preserves; browser fallback is stateless)
var __state = (typeof __state !== 'undefined' && __state) || { tick:0, last:null, lastVel:null };
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  const P={"leadCap":14,"leadWeight":0.9979159990749527,"aimJitter":0.2507993648786407,"velSmooth":0.7458941140191793,"minRange":163,"maxRange":277,"strafeAngle":32,"strafeSpread":18,"approachSpread":16,"escapeSpread":9,"threatRadius":151,"threatFleeBias":-13,"allySep":74,"edgeMargin":31,"bias":-13,"targetHealthWeight":1.264594715156069,"targetDistWeight":0.15769846413263,"finishHp":31,"finishRemain":3,"finishMinDelta":41,"finishMaxDelta":25};
  __state.tick = (__state.tick||0)+1;
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const hypot=Math.hypot;
  const clamp=(v,lo,hi)=>v<lo?lo:(v>hi?hi:v);
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};

  // 1) Target selection: health-weighted then distance
  let tgt=null; let best=1e9;
  for(const e of enemies){
    // Prefer low health and closer targets
    const key = e.health*P.targetHealthWeight + e.distance*P.targetDistWeight;
    if(key<best){best=key; tgt=e;}
  }

  // 2) Predictive aim using simple linear lead (simulator keeps state)
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last){
      const vx=(tgt.x-__state.last.x);
      const vy=(tgt.y-__state.last.y);
      let lvx=__state.lastVel?__state.lastVel.vx:0;
      let lvy=__state.lastVel?__state.lastVel.vy:0;
      const svx = lvx*P.velSmooth + vx*(1-P.velSmooth);
      const svy = lvy*P.velSmooth + vy*(1-P.velSmooth);
      __state.lastVel = { vx: svx, vy: svy };
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead=clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + svx*P.leadWeight*tLead;
      aimY = tgt.y + svy*P.leadWeight*tLead;
    }
    const jitter = (((tank.x*31+tank.y*17)%23)-11) * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x:tgt.x, y:tgt.y };
  }

  let attempts=0; const tryMove=(a)=>{attempts++; return tank.move(norm(a));};

  // 3) Bullet avoidance: steer perpendicular away from hottest threat
  let threat=null; let minApproach=1e9;
  for(const b of bulletInfo){
    const rx=b.x-tank.x, ry=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=rx*nx+ry*ny; // forward component
    if(proj>0){
      // perpendicular distance at closest approach
      const px=b.x-nx*proj, py=b.y-ny*proj; const d=hypot(px-tank.x,py-tank.y);
      if(d<minApproach){minApproach=d; threat={b, nx, ny, proj, d};}
    }
  }
  if(threat && threat.d < P.threatRadius){
    const base = toDeg(threat.nx, threat.ny); // bullet heading
    const side = ( ((tank.x*97+tank.y*131)|0)%2 ? 1 : -1 ) * P.threatFleeBias;
    const cands = [base+90+side, base-90-side, base+120, base-120, base+70, base-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // 5) Ally separation to reduce clustering
  let closestAlly=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; closestAlly=a; } }
  if(closestAlly && ad < P.allySep){
    const away = toDeg(tank.x-closestAlly.x, tank.y-closestAlly.y);
    if(tryMove(away)) return; if(tryMove(away+20)) return; if(tryMove(away-20)) return;
  }

  // 6) Engagement spacing and strafing
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    let minR=P.minRange, maxR=P.maxRange;
    const remain = enemies.length;
    if((tgt.health <= P.finishHp) || remain <= P.finishRemain){ minR -= P.finishMinDelta; maxR -= P.finishMaxDelta; }
    if(d < minR){
      const away = to+180 + P.bias*0.4;
      if(tryMove(away)) return; if(tryMove(away+P.escapeSpread)) return; if(tryMove(away-P.escapeSpread)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+P.approachSpread)) return; if(tryMove(to-P.approachSpread)) return;
    } else {
      const side = to + ((((tank.x*13+tank.y*7)|0)%2)?P.strafeAngle:-P.strafeAngle) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+P.strafeSpread)) return; if(tryMove(side-P.strafeSpread)) return;
    }
  }

  // 7) Fallback sweep
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}



// ===== 다음 로봇 =====


function name(){return "Helios-2";}
function type(){return 2;}
// Persistent state (simulator secure runner preserves; browser fallback is stateless)
var __state = (typeof __state !== 'undefined' && __state) || { tick:0, last:null, lastVel:null };
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  const P={"leadCap":14,"leadWeight":0.9979159990749527,"aimJitter":0.29505807632781256,"velSmooth":0.7458941140191793,"minRange":179,"maxRange":293,"strafeAngle":40,"strafeSpread":18,"approachSpread":16,"escapeSpread":9,"threatRadius":151,"threatFleeBias":13,"allySep":74,"edgeMargin":31,"bias":-13,"targetHealthWeight":1.264594715156069,"targetDistWeight":0.15769846413263,"finishHp":31,"finishRemain":3,"finishMinDelta":41,"finishMaxDelta":25};
  __state.tick = (__state.tick||0)+1;
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const hypot=Math.hypot;
  const clamp=(v,lo,hi)=>v<lo?lo:(v>hi?hi:v);
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};

  // 1) Target selection: health-weighted then distance
  let tgt=null; let best=1e9;
  for(const e of enemies){
    // Prefer low health and closer targets
    const key = e.health*P.targetHealthWeight + e.distance*P.targetDistWeight;
    if(key<best){best=key; tgt=e;}
  }

  // 2) Predictive aim using simple linear lead (simulator keeps state)
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last){
      const vx=(tgt.x-__state.last.x);
      const vy=(tgt.y-__state.last.y);
      let lvx=__state.lastVel?__state.lastVel.vx:0;
      let lvy=__state.lastVel?__state.lastVel.vy:0;
      const svx = lvx*P.velSmooth + vx*(1-P.velSmooth);
      const svy = lvy*P.velSmooth + vy*(1-P.velSmooth);
      __state.lastVel = { vx: svx, vy: svy };
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead=clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + svx*P.leadWeight*tLead;
      aimY = tgt.y + svy*P.leadWeight*tLead;
    }
    const jitter = (((tank.x*31+tank.y*17)%23)-11) * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x:tgt.x, y:tgt.y };
  }

  let attempts=0; const tryMove=(a)=>{attempts++; return tank.move(norm(a));};

  // 3) Bullet avoidance: steer perpendicular away from hottest threat
  let threat=null; let minApproach=1e9;
  for(const b of bulletInfo){
    const rx=b.x-tank.x, ry=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=rx*nx+ry*ny; // forward component
    if(proj>0){
      // perpendicular distance at closest approach
      const px=b.x-nx*proj, py=b.y-ny*proj; const d=hypot(px-tank.x,py-tank.y);
      if(d<minApproach){minApproach=d; threat={b, nx, ny, proj, d};}
    }
  }
  if(threat && threat.d < P.threatRadius){
    const base = toDeg(threat.nx, threat.ny); // bullet heading
    const side = ( ((tank.x*97+tank.y*131)|0)%2 ? 1 : -1 ) * P.threatFleeBias;
    const cands = [base+90+side, base-90-side, base+120, base-120, base+70, base-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // 5) Ally separation to reduce clustering
  let closestAlly=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; closestAlly=a; } }
  if(closestAlly && ad < P.allySep){
    const away = toDeg(tank.x-closestAlly.x, tank.y-closestAlly.y);
    if(tryMove(away)) return; if(tryMove(away+20)) return; if(tryMove(away-20)) return;
  }

  // 6) Engagement spacing and strafing
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    let minR=P.minRange, maxR=P.maxRange;
    const remain = enemies.length;
    if((tgt.health <= P.finishHp) || remain <= P.finishRemain){ minR -= P.finishMinDelta; maxR -= P.finishMaxDelta; }
    if(d < minR){
      const away = to+180 + P.bias*0.4;
      if(tryMove(away)) return; if(tryMove(away+P.escapeSpread)) return; if(tryMove(away-P.escapeSpread)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+P.approachSpread)) return; if(tryMove(to-P.approachSpread)) return;
    } else {
      const side = to + ((((tank.x*13+tank.y*7)|0)%2)?P.strafeAngle:-P.strafeAngle) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+P.strafeSpread)) return; if(tryMove(side-P.strafeSpread)) return;
    }
  }

  // 7) Fallback sweep
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}



// ===== 다음 로봇 =====


function name(){return "Helios-3";}
function type(){return 2;}
// Persistent state (simulator secure runner preserves; browser fallback is stateless)
var __state = (typeof __state !== 'undefined' && __state) || { tick:0, last:null, lastVel:null };
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  const P={"leadCap":14,"leadWeight":0.9979159990749527,"aimJitter":0.33931678777698443,"velSmooth":0.7458941140191793,"minRange":163,"maxRange":277,"strafeAngle":32,"strafeSpread":18,"approachSpread":16,"escapeSpread":9,"threatRadius":151,"threatFleeBias":-13,"allySep":74,"edgeMargin":31,"bias":-13,"targetHealthWeight":1.264594715156069,"targetDistWeight":0.15769846413263,"finishHp":31,"finishRemain":3,"finishMinDelta":41,"finishMaxDelta":25};
  __state.tick = (__state.tick||0)+1;
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const hypot=Math.hypot;
  const clamp=(v,lo,hi)=>v<lo?lo:(v>hi?hi:v);
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};

  // 1) Target selection: health-weighted then distance
  let tgt=null; let best=1e9;
  for(const e of enemies){
    // Prefer low health and closer targets
    const key = e.health*P.targetHealthWeight + e.distance*P.targetDistWeight;
    if(key<best){best=key; tgt=e;}
  }

  // 2) Predictive aim using simple linear lead (simulator keeps state)
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last){
      const vx=(tgt.x-__state.last.x);
      const vy=(tgt.y-__state.last.y);
      let lvx=__state.lastVel?__state.lastVel.vx:0;
      let lvy=__state.lastVel?__state.lastVel.vy:0;
      const svx = lvx*P.velSmooth + vx*(1-P.velSmooth);
      const svy = lvy*P.velSmooth + vy*(1-P.velSmooth);
      __state.lastVel = { vx: svx, vy: svy };
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead=clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + svx*P.leadWeight*tLead;
      aimY = tgt.y + svy*P.leadWeight*tLead;
    }
    const jitter = (((tank.x*31+tank.y*17)%23)-11) * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x:tgt.x, y:tgt.y };
  }

  let attempts=0; const tryMove=(a)=>{attempts++; return tank.move(norm(a));};

  // 3) Bullet avoidance: steer perpendicular away from hottest threat
  let threat=null; let minApproach=1e9;
  for(const b of bulletInfo){
    const rx=b.x-tank.x, ry=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=rx*nx+ry*ny; // forward component
    if(proj>0){
      // perpendicular distance at closest approach
      const px=b.x-nx*proj, py=b.y-ny*proj; const d=hypot(px-tank.x,py-tank.y);
      if(d<minApproach){minApproach=d; threat={b, nx, ny, proj, d};}
    }
  }
  if(threat && threat.d < P.threatRadius){
    const base = toDeg(threat.nx, threat.ny); // bullet heading
    const side = ( ((tank.x*97+tank.y*131)|0)%2 ? 1 : -1 ) * P.threatFleeBias;
    const cands = [base+90+side, base-90-side, base+120, base-120, base+70, base-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // 5) Ally separation to reduce clustering
  let closestAlly=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; closestAlly=a; } }
  if(closestAlly && ad < P.allySep){
    const away = toDeg(tank.x-closestAlly.x, tank.y-closestAlly.y);
    if(tryMove(away)) return; if(tryMove(away+20)) return; if(tryMove(away-20)) return;
  }

  // 6) Engagement spacing and strafing
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    let minR=P.minRange, maxR=P.maxRange;
    const remain = enemies.length;
    if((tgt.health <= P.finishHp) || remain <= P.finishRemain){ minR -= P.finishMinDelta; maxR -= P.finishMaxDelta; }
    if(d < minR){
      const away = to+180 + P.bias*0.4;
      if(tryMove(away)) return; if(tryMove(away+P.escapeSpread)) return; if(tryMove(away-P.escapeSpread)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+P.approachSpread)) return; if(tryMove(to-P.approachSpread)) return;
    } else {
      const side = to + ((((tank.x*13+tank.y*7)|0)%2)?P.strafeAngle:-P.strafeAngle) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+P.strafeSpread)) return; if(tryMove(side-P.strafeSpread)) return;
    }
  }

  // 7) Fallback sweep
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}



// ===== 다음 로봇 =====


function name(){return "Helios-4";}
function type(){return 0;}
// Persistent state (simulator secure runner preserves; browser fallback is stateless)
var __state = (typeof __state !== 'undefined' && __state) || { tick:0, last:null, lastVel:null };
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  const P={"leadCap":14,"leadWeight":0.9979159990749527,"aimJitter":0.2507993648786407,"velSmooth":0.7458941140191793,"minRange":179,"maxRange":293,"strafeAngle":40,"strafeSpread":18,"approachSpread":16,"escapeSpread":9,"threatRadius":151,"threatFleeBias":13,"allySep":74,"edgeMargin":31,"bias":13,"targetHealthWeight":1.264594715156069,"targetDistWeight":0.15769846413263,"finishHp":31,"finishRemain":3,"finishMinDelta":41,"finishMaxDelta":25};
  __state.tick = (__state.tick||0)+1;
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const hypot=Math.hypot;
  const clamp=(v,lo,hi)=>v<lo?lo:(v>hi?hi:v);
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};

  // 1) Target selection: health-weighted then distance
  let tgt=null; let best=1e9;
  for(const e of enemies){
    // Prefer low health and closer targets
    const key = e.health*P.targetHealthWeight + e.distance*P.targetDistWeight;
    if(key<best){best=key; tgt=e;}
  }

  // 2) Predictive aim using simple linear lead (simulator keeps state)
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last){
      const vx=(tgt.x-__state.last.x);
      const vy=(tgt.y-__state.last.y);
      let lvx=__state.lastVel?__state.lastVel.vx:0;
      let lvy=__state.lastVel?__state.lastVel.vy:0;
      const svx = lvx*P.velSmooth + vx*(1-P.velSmooth);
      const svy = lvy*P.velSmooth + vy*(1-P.velSmooth);
      __state.lastVel = { vx: svx, vy: svy };
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead=clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + svx*P.leadWeight*tLead;
      aimY = tgt.y + svy*P.leadWeight*tLead;
    }
    const jitter = (((tank.x*31+tank.y*17)%23)-11) * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x:tgt.x, y:tgt.y };
  }

  let attempts=0; const tryMove=(a)=>{attempts++; return tank.move(norm(a));};

  // 3) Bullet avoidance: steer perpendicular away from hottest threat
  let threat=null; let minApproach=1e9;
  for(const b of bulletInfo){
    const rx=b.x-tank.x, ry=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=rx*nx+ry*ny; // forward component
    if(proj>0){
      // perpendicular distance at closest approach
      const px=b.x-nx*proj, py=b.y-ny*proj; const d=hypot(px-tank.x,py-tank.y);
      if(d<minApproach){minApproach=d; threat={b, nx, ny, proj, d};}
    }
  }
  if(threat && threat.d < P.threatRadius){
    const base = toDeg(threat.nx, threat.ny); // bullet heading
    const side = ( ((tank.x*97+tank.y*131)|0)%2 ? 1 : -1 ) * P.threatFleeBias;
    const cands = [base+90+side, base-90-side, base+120, base-120, base+70, base-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // 5) Ally separation to reduce clustering
  let closestAlly=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; closestAlly=a; } }
  if(closestAlly && ad < P.allySep){
    const away = toDeg(tank.x-closestAlly.x, tank.y-closestAlly.y);
    if(tryMove(away)) return; if(tryMove(away+20)) return; if(tryMove(away-20)) return;
  }

  // 6) Engagement spacing and strafing
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    let minR=P.minRange, maxR=P.maxRange;
    const remain = enemies.length;
    if((tgt.health <= P.finishHp) || remain <= P.finishRemain){ minR -= P.finishMinDelta; maxR -= P.finishMaxDelta; }
    if(d < minR){
      const away = to+180 + P.bias*0.4;
      if(tryMove(away)) return; if(tryMove(away+P.escapeSpread)) return; if(tryMove(away-P.escapeSpread)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+P.approachSpread)) return; if(tryMove(to-P.approachSpread)) return;
    } else {
      const side = to + ((((tank.x*13+tank.y*7)|0)%2)?P.strafeAngle:-P.strafeAngle) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+P.strafeSpread)) return; if(tryMove(side-P.strafeSpread)) return;
    }
  }

  // 7) Fallback sweep
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}



// ===== 다음 로봇 =====


function name(){return "Helios-5";}
function type(){return 2;}
// Persistent state (simulator secure runner preserves; browser fallback is stateless)
var __state = (typeof __state !== 'undefined' && __state) || { tick:0, last:null, lastVel:null };
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  const P={"leadCap":14,"leadWeight":0.9979159990749527,"aimJitter":0.29505807632781256,"velSmooth":0.7458941140191793,"minRange":163,"maxRange":277,"strafeAngle":32,"strafeSpread":18,"approachSpread":16,"escapeSpread":9,"threatRadius":151,"threatFleeBias":-13,"allySep":74,"edgeMargin":31,"bias":13,"targetHealthWeight":1.264594715156069,"targetDistWeight":0.15769846413263,"finishHp":31,"finishRemain":3,"finishMinDelta":41,"finishMaxDelta":25};
  __state.tick = (__state.tick||0)+1;
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const hypot=Math.hypot;
  const clamp=(v,lo,hi)=>v<lo?lo:(v>hi?hi:v);
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};

  // 1) Target selection: health-weighted then distance
  let tgt=null; let best=1e9;
  for(const e of enemies){
    // Prefer low health and closer targets
    const key = e.health*P.targetHealthWeight + e.distance*P.targetDistWeight;
    if(key<best){best=key; tgt=e;}
  }

  // 2) Predictive aim using simple linear lead (simulator keeps state)
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last){
      const vx=(tgt.x-__state.last.x);
      const vy=(tgt.y-__state.last.y);
      let lvx=__state.lastVel?__state.lastVel.vx:0;
      let lvy=__state.lastVel?__state.lastVel.vy:0;
      const svx = lvx*P.velSmooth + vx*(1-P.velSmooth);
      const svy = lvy*P.velSmooth + vy*(1-P.velSmooth);
      __state.lastVel = { vx: svx, vy: svy };
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead=clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + svx*P.leadWeight*tLead;
      aimY = tgt.y + svy*P.leadWeight*tLead;
    }
    const jitter = (((tank.x*31+tank.y*17)%23)-11) * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x:tgt.x, y:tgt.y };
  }

  let attempts=0; const tryMove=(a)=>{attempts++; return tank.move(norm(a));};

  // 3) Bullet avoidance: steer perpendicular away from hottest threat
  let threat=null; let minApproach=1e9;
  for(const b of bulletInfo){
    const rx=b.x-tank.x, ry=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=rx*nx+ry*ny; // forward component
    if(proj>0){
      // perpendicular distance at closest approach
      const px=b.x-nx*proj, py=b.y-ny*proj; const d=hypot(px-tank.x,py-tank.y);
      if(d<minApproach){minApproach=d; threat={b, nx, ny, proj, d};}
    }
  }
  if(threat && threat.d < P.threatRadius){
    const base = toDeg(threat.nx, threat.ny); // bullet heading
    const side = ( ((tank.x*97+tank.y*131)|0)%2 ? 1 : -1 ) * P.threatFleeBias;
    const cands = [base+90+side, base-90-side, base+120, base-120, base+70, base-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // 5) Ally separation to reduce clustering
  let closestAlly=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; closestAlly=a; } }
  if(closestAlly && ad < P.allySep){
    const away = toDeg(tank.x-closestAlly.x, tank.y-closestAlly.y);
    if(tryMove(away)) return; if(tryMove(away+20)) return; if(tryMove(away-20)) return;
  }

  // 6) Engagement spacing and strafing
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    let minR=P.minRange, maxR=P.maxRange;
    const remain = enemies.length;
    if((tgt.health <= P.finishHp) || remain <= P.finishRemain){ minR -= P.finishMinDelta; maxR -= P.finishMaxDelta; }
    if(d < minR){
      const away = to+180 + P.bias*0.4;
      if(tryMove(away)) return; if(tryMove(away+P.escapeSpread)) return; if(tryMove(away-P.escapeSpread)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+P.approachSpread)) return; if(tryMove(to-P.approachSpread)) return;
    } else {
      const side = to + ((((tank.x*13+tank.y*7)|0)%2)?P.strafeAngle:-P.strafeAngle) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+P.strafeSpread)) return; if(tryMove(side-P.strafeSpread)) return;
    }
  }

  // 7) Fallback sweep
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}



// ===== 다음 로봇 =====


function name(){return "Helios-6";}
function type(){return 1;}
// Persistent state (simulator secure runner preserves; browser fallback is stateless)
var __state = (typeof __state !== 'undefined' && __state) || { tick:0, last:null, lastVel:null };
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  const P={"leadCap":14,"leadWeight":0.9979159990749527,"aimJitter":0.33931678777698443,"velSmooth":0.7458941140191793,"minRange":179,"maxRange":293,"strafeAngle":40,"strafeSpread":18,"approachSpread":16,"escapeSpread":9,"threatRadius":151,"threatFleeBias":13,"allySep":74,"edgeMargin":31,"bias":13,"targetHealthWeight":1.264594715156069,"targetDistWeight":0.15769846413263,"finishHp":31,"finishRemain":3,"finishMinDelta":41,"finishMaxDelta":25};
  __state.tick = (__state.tick||0)+1;
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const hypot=Math.hypot;
  const clamp=(v,lo,hi)=>v<lo?lo:(v>hi?hi:v);
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};

  // 1) Target selection: health-weighted then distance
  let tgt=null; let best=1e9;
  for(const e of enemies){
    // Prefer low health and closer targets
    const key = e.health*P.targetHealthWeight + e.distance*P.targetDistWeight;
    if(key<best){best=key; tgt=e;}
  }

  // 2) Predictive aim using simple linear lead (simulator keeps state)
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last){
      const vx=(tgt.x-__state.last.x);
      const vy=(tgt.y-__state.last.y);
      let lvx=__state.lastVel?__state.lastVel.vx:0;
      let lvy=__state.lastVel?__state.lastVel.vy:0;
      const svx = lvx*P.velSmooth + vx*(1-P.velSmooth);
      const svy = lvy*P.velSmooth + vy*(1-P.velSmooth);
      __state.lastVel = { vx: svx, vy: svy };
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead=clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + svx*P.leadWeight*tLead;
      aimY = tgt.y + svy*P.leadWeight*tLead;
    }
    const jitter = (((tank.x*31+tank.y*17)%23)-11) * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x:tgt.x, y:tgt.y };
  }

  let attempts=0; const tryMove=(a)=>{attempts++; return tank.move(norm(a));};

  // 3) Bullet avoidance: steer perpendicular away from hottest threat
  let threat=null; let minApproach=1e9;
  for(const b of bulletInfo){
    const rx=b.x-tank.x, ry=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=rx*nx+ry*ny; // forward component
    if(proj>0){
      // perpendicular distance at closest approach
      const px=b.x-nx*proj, py=b.y-ny*proj; const d=hypot(px-tank.x,py-tank.y);
      if(d<minApproach){minApproach=d; threat={b, nx, ny, proj, d};}
    }
  }
  if(threat && threat.d < P.threatRadius){
    const base = toDeg(threat.nx, threat.ny); // bullet heading
    const side = ( ((tank.x*97+tank.y*131)|0)%2 ? 1 : -1 ) * P.threatFleeBias;
    const cands = [base+90+side, base-90-side, base+120, base-120, base+70, base-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // 5) Ally separation to reduce clustering
  let closestAlly=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; closestAlly=a; } }
  if(closestAlly && ad < P.allySep){
    const away = toDeg(tank.x-closestAlly.x, tank.y-closestAlly.y);
    if(tryMove(away)) return; if(tryMove(away+20)) return; if(tryMove(away-20)) return;
  }

  // 6) Engagement spacing and strafing
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    let minR=P.minRange, maxR=P.maxRange;
    const remain = enemies.length;
    if((tgt.health <= P.finishHp) || remain <= P.finishRemain){ minR -= P.finishMinDelta; maxR -= P.finishMaxDelta; }
    if(d < minR){
      const away = to+180 + P.bias*0.4;
      if(tryMove(away)) return; if(tryMove(away+P.escapeSpread)) return; if(tryMove(away-P.escapeSpread)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+P.approachSpread)) return; if(tryMove(to-P.approachSpread)) return;
    } else {
      const side = to + ((((tank.x*13+tank.y*7)|0)%2)?P.strafeAngle:-P.strafeAngle) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+P.strafeSpread)) return; if(tryMove(side-P.strafeSpread)) return;
    }
  }

  // 7) Fallback sweep
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}

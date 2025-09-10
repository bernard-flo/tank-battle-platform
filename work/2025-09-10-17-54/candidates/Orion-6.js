function name(){return "Orion-6-Q1";}
function type(){return Type.TANKER;}
// VM-persistent state per robot
let __state = { last:null, tick:0, lastVel:null };
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131)|0)%2?1:-1; // deterministic per spawn
  const P={"leadCap":14,"leadWeight":1.08,"aimJitter":0.24,"minRange":198,"maxRange":286,"strafeAngle":34,"threatRadius":196,"threatFleeBias":16,"allySep":66,"edgeMargin":56,"bias":-13,"targetHealthWeight":1.25,"targetDistWeight":0.1,"finishHp":22,"finishRemain":3,"finishMinDelta":35,"finishMaxDelta":25};

  __state.tick = (__state.tick||0) + 1;

  // 1) Target selection: lowest health priority, then nearest
  let tgt=null; let best=1e9;
  for(const e of enemies){
    const key = e.health*1.25 + e.distance*0.1;
    if(key<best){best=key; tgt=e;}
  }

  // 2) Predictive aim with simple linear lead (based on last observed velocity)
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last && __state.last.x!==undefined){
      const vx=(tgt.x-__state.last.x);
      const vy=(tgt.y-__state.last.y);
      // smooth velocity a bit
      let lvx=__state.lastVel?__state.lastVel.vx:0;
      let lvy=__state.lastVel?__state.lastVel.vy:0;
      const svx = lvx*0.5 + vx*0.5;
      const svy = lvy*0.5 + vy*0.5;
      __state.lastVel = { vx: svx, vy: svy };
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead=clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + svx*P.leadWeight*tLead;
      aimY = tgt.y + svy*P.leadWeight*tLead;
    }
    const jitter = (((tank.x*31+tank.y*17)%23)-11)*0.08 * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x:tgt.x, y:tgt.y };
  }

  // Helpers
  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // 3) Bullet avoidance (nearest approach within radius)
  let hot=null; let minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatRadius){ minD=d; hot=b; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const side = (rnd>0?1:-1)*P.threatFleeBias + P.bias*0.6;
    const cands=[a+90+side, a-90-side, a+120, a-120, a+70, a-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // 5) Ally separation
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.allySep){
    const away = toDeg(tank.x-near.x, tank.y-near.y);
    if(tryMove(away)) return; if(tryMove(away+28)) return; if(tryMove(away-28)) return;
  }

  // 6) Engagement spacing + strafing (adaptive aggression)
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    let minR=P.minRange, maxR=P.maxRange;
    const remain = enemies.length;
    if((tgt.health<=P.finishHp) || remain<=P.finishRemain){ minR-=P.finishMinDelta; maxR-=P.finishMaxDelta; }
    if(d < minR){
      const away = to+180 + P.bias*0.4;
      if(tryMove(away)) return; if(tryMove(away+24)) return; if(tryMove(away-24)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+18)) return; if(tryMove(to-18)) return;
    } else {
      const side = to + ((((tank.x*13+tank.y*7)|0)%2)?P.strafeAngle:-P.strafeAngle) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+18)) return; if(tryMove(side-18)) return;
    }
  }

  // 7) Fallback sweeping
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}


// ===== 다음 로봇 =====



function name(){return "Orion-6-Q2";}
function type(){return Type.TANKER;}
// VM-persistent state per robot
let __state = { last:null, tick:0, lastVel:null };
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131)|0)%2?1:-1; // deterministic per spawn
  const P={"leadCap":14,"leadWeight":1.08,"aimJitter":0.24,"minRange":208,"maxRange":296,"strafeAngle":34,"threatRadius":196,"threatFleeBias":16,"allySep":66,"edgeMargin":56,"bias":11,"targetHealthWeight":1.25,"targetDistWeight":0.1,"finishHp":22,"finishRemain":3,"finishMinDelta":35,"finishMaxDelta":25};

  __state.tick = (__state.tick||0) + 1;

  // 1) Target selection: lowest health priority, then nearest
  let tgt=null; let best=1e9;
  for(const e of enemies){
    const key = e.health*1.25 + e.distance*0.1;
    if(key<best){best=key; tgt=e;}
  }

  // 2) Predictive aim with simple linear lead (based on last observed velocity)
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last && __state.last.x!==undefined){
      const vx=(tgt.x-__state.last.x);
      const vy=(tgt.y-__state.last.y);
      // smooth velocity a bit
      let lvx=__state.lastVel?__state.lastVel.vx:0;
      let lvy=__state.lastVel?__state.lastVel.vy:0;
      const svx = lvx*0.5 + vx*0.5;
      const svy = lvy*0.5 + vy*0.5;
      __state.lastVel = { vx: svx, vy: svy };
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead=clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + svx*P.leadWeight*tLead;
      aimY = tgt.y + svy*P.leadWeight*tLead;
    }
    const jitter = (((tank.x*31+tank.y*17)%23)-11)*0.08 * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x:tgt.x, y:tgt.y };
  }

  // Helpers
  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // 3) Bullet avoidance (nearest approach within radius)
  let hot=null; let minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatRadius){ minD=d; hot=b; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const side = (rnd>0?1:-1)*P.threatFleeBias + P.bias*0.6;
    const cands=[a+90+side, a-90-side, a+120, a-120, a+70, a-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // 5) Ally separation
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.allySep){
    const away = toDeg(tank.x-near.x, tank.y-near.y);
    if(tryMove(away)) return; if(tryMove(away+28)) return; if(tryMove(away-28)) return;
  }

  // 6) Engagement spacing + strafing (adaptive aggression)
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    let minR=P.minRange, maxR=P.maxRange;
    const remain = enemies.length;
    if((tgt.health<=P.finishHp) || remain<=P.finishRemain){ minR-=P.finishMinDelta; maxR-=P.finishMaxDelta; }
    if(d < minR){
      const away = to+180 + P.bias*0.4;
      if(tryMove(away)) return; if(tryMove(away+24)) return; if(tryMove(away-24)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+18)) return; if(tryMove(to-18)) return;
    } else {
      const side = to + ((((tank.x*13+tank.y*7)|0)%2)?P.strafeAngle:-P.strafeAngle) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+18)) return; if(tryMove(side-18)) return;
    }
  }

  // 7) Fallback sweeping
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}


// ===== 다음 로봇 =====



function name(){return "Orion-6-Q3";}
function type(){return Type.DEALER;}
// VM-persistent state per robot
let __state = { last:null, tick:0, lastVel:null };
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131)|0)%2?1:-1; // deterministic per spawn
  const P={"leadCap":14,"leadWeight":1.08,"aimJitter":0.24,"minRange":272,"maxRange":402,"strafeAngle":40,"threatRadius":188,"threatFleeBias":16,"allySep":66,"edgeMargin":56,"bias":-5,"targetHealthWeight":1.25,"targetDistWeight":0.1,"finishHp":22,"finishRemain":3,"finishMinDelta":35,"finishMaxDelta":25};

  __state.tick = (__state.tick||0) + 1;

  // 1) Target selection: lowest health priority, then nearest
  let tgt=null; let best=1e9;
  for(const e of enemies){
    const key = e.health*1.25 + e.distance*0.1;
    if(key<best){best=key; tgt=e;}
  }

  // 2) Predictive aim with simple linear lead (based on last observed velocity)
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last && __state.last.x!==undefined){
      const vx=(tgt.x-__state.last.x);
      const vy=(tgt.y-__state.last.y);
      // smooth velocity a bit
      let lvx=__state.lastVel?__state.lastVel.vx:0;
      let lvy=__state.lastVel?__state.lastVel.vy:0;
      const svx = lvx*0.5 + vx*0.5;
      const svy = lvy*0.5 + vy*0.5;
      __state.lastVel = { vx: svx, vy: svy };
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead=clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + svx*P.leadWeight*tLead;
      aimY = tgt.y + svy*P.leadWeight*tLead;
    }
    const jitter = (((tank.x*31+tank.y*17)%23)-11)*0.08 * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x:tgt.x, y:tgt.y };
  }

  // Helpers
  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // 3) Bullet avoidance (nearest approach within radius)
  let hot=null; let minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatRadius){ minD=d; hot=b; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const side = (rnd>0?1:-1)*P.threatFleeBias + P.bias*0.6;
    const cands=[a+90+side, a-90-side, a+120, a-120, a+70, a-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // 5) Ally separation
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.allySep){
    const away = toDeg(tank.x-near.x, tank.y-near.y);
    if(tryMove(away)) return; if(tryMove(away+28)) return; if(tryMove(away-28)) return;
  }

  // 6) Engagement spacing + strafing (adaptive aggression)
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    let minR=P.minRange, maxR=P.maxRange;
    const remain = enemies.length;
    if((tgt.health<=P.finishHp) || remain<=P.finishRemain){ minR-=P.finishMinDelta; maxR-=P.finishMaxDelta; }
    if(d < minR){
      const away = to+180 + P.bias*0.4;
      if(tryMove(away)) return; if(tryMove(away+24)) return; if(tryMove(away-24)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+18)) return; if(tryMove(to-18)) return;
    } else {
      const side = to + ((((tank.x*13+tank.y*7)|0)%2)?P.strafeAngle:-P.strafeAngle) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+18)) return; if(tryMove(side-18)) return;
    }
  }

  // 7) Fallback sweeping
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}


// ===== 다음 로봇 =====



function name(){return "Orion-6-Q4";}
function type(){return Type.DEALER;}
// VM-persistent state per robot
let __state = { last:null, tick:0, lastVel:null };
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131)|0)%2?1:-1; // deterministic per spawn
  const P={"leadCap":14,"leadWeight":1.08,"aimJitter":0.24,"minRange":272,"maxRange":402,"strafeAngle":28,"threatRadius":188,"threatFleeBias":16,"allySep":66,"edgeMargin":56,"bias":3,"targetHealthWeight":1.25,"targetDistWeight":0.1,"finishHp":22,"finishRemain":3,"finishMinDelta":35,"finishMaxDelta":25};

  __state.tick = (__state.tick||0) + 1;

  // 1) Target selection: lowest health priority, then nearest
  let tgt=null; let best=1e9;
  for(const e of enemies){
    const key = e.health*1.25 + e.distance*0.1;
    if(key<best){best=key; tgt=e;}
  }

  // 2) Predictive aim with simple linear lead (based on last observed velocity)
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last && __state.last.x!==undefined){
      const vx=(tgt.x-__state.last.x);
      const vy=(tgt.y-__state.last.y);
      // smooth velocity a bit
      let lvx=__state.lastVel?__state.lastVel.vx:0;
      let lvy=__state.lastVel?__state.lastVel.vy:0;
      const svx = lvx*0.5 + vx*0.5;
      const svy = lvy*0.5 + vy*0.5;
      __state.lastVel = { vx: svx, vy: svy };
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead=clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + svx*P.leadWeight*tLead;
      aimY = tgt.y + svy*P.leadWeight*tLead;
    }
    const jitter = (((tank.x*31+tank.y*17)%23)-11)*0.08 * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x:tgt.x, y:tgt.y };
  }

  // Helpers
  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // 3) Bullet avoidance (nearest approach within radius)
  let hot=null; let minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatRadius){ minD=d; hot=b; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const side = (rnd>0?1:-1)*P.threatFleeBias + P.bias*0.6;
    const cands=[a+90+side, a-90-side, a+120, a-120, a+70, a-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // 5) Ally separation
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.allySep){
    const away = toDeg(tank.x-near.x, tank.y-near.y);
    if(tryMove(away)) return; if(tryMove(away+28)) return; if(tryMove(away-28)) return;
  }

  // 6) Engagement spacing + strafing (adaptive aggression)
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    let minR=P.minRange, maxR=P.maxRange;
    const remain = enemies.length;
    if((tgt.health<=P.finishHp) || remain<=P.finishRemain){ minR-=P.finishMinDelta; maxR-=P.finishMaxDelta; }
    if(d < minR){
      const away = to+180 + P.bias*0.4;
      if(tryMove(away)) return; if(tryMove(away+24)) return; if(tryMove(away-24)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+18)) return; if(tryMove(to-18)) return;
    } else {
      const side = to + ((((tank.x*13+tank.y*7)|0)%2)?P.strafeAngle:-P.strafeAngle) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+18)) return; if(tryMove(side-18)) return;
    }
  }

  // 7) Fallback sweeping
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}


// ===== 다음 로봇 =====



function name(){return "Orion-6-Q5";}
function type(){return Type.NORMAL;}
// VM-persistent state per robot
let __state = { last:null, tick:0, lastVel:null };
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131)|0)%2?1:-1; // deterministic per spawn
  const P={"leadCap":14,"leadWeight":1.08,"aimJitter":0.24,"minRange":230,"maxRange":340,"strafeAngle":36,"threatRadius":188,"threatFleeBias":16,"allySep":66,"edgeMargin":56,"bias":-7,"targetHealthWeight":1.25,"targetDistWeight":0.1,"finishHp":22,"finishRemain":3,"finishMinDelta":35,"finishMaxDelta":25};

  __state.tick = (__state.tick||0) + 1;

  // 1) Target selection: lowest health priority, then nearest
  let tgt=null; let best=1e9;
  for(const e of enemies){
    const key = e.health*1.25 + e.distance*0.1;
    if(key<best){best=key; tgt=e;}
  }

  // 2) Predictive aim with simple linear lead (based on last observed velocity)
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last && __state.last.x!==undefined){
      const vx=(tgt.x-__state.last.x);
      const vy=(tgt.y-__state.last.y);
      // smooth velocity a bit
      let lvx=__state.lastVel?__state.lastVel.vx:0;
      let lvy=__state.lastVel?__state.lastVel.vy:0;
      const svx = lvx*0.5 + vx*0.5;
      const svy = lvy*0.5 + vy*0.5;
      __state.lastVel = { vx: svx, vy: svy };
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead=clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + svx*P.leadWeight*tLead;
      aimY = tgt.y + svy*P.leadWeight*tLead;
    }
    const jitter = (((tank.x*31+tank.y*17)%23)-11)*0.08 * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x:tgt.x, y:tgt.y };
  }

  // Helpers
  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // 3) Bullet avoidance (nearest approach within radius)
  let hot=null; let minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatRadius){ minD=d; hot=b; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const side = (rnd>0?1:-1)*P.threatFleeBias + P.bias*0.6;
    const cands=[a+90+side, a-90-side, a+120, a-120, a+70, a-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // 5) Ally separation
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.allySep){
    const away = toDeg(tank.x-near.x, tank.y-near.y);
    if(tryMove(away)) return; if(tryMove(away+28)) return; if(tryMove(away-28)) return;
  }

  // 6) Engagement spacing + strafing (adaptive aggression)
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    let minR=P.minRange, maxR=P.maxRange;
    const remain = enemies.length;
    if((tgt.health<=P.finishHp) || remain<=P.finishRemain){ minR-=P.finishMinDelta; maxR-=P.finishMaxDelta; }
    if(d < minR){
      const away = to+180 + P.bias*0.4;
      if(tryMove(away)) return; if(tryMove(away+24)) return; if(tryMove(away-24)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+18)) return; if(tryMove(to-18)) return;
    } else {
      const side = to + ((((tank.x*13+tank.y*7)|0)%2)?P.strafeAngle:-P.strafeAngle) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+18)) return; if(tryMove(side-18)) return;
    }
  }

  // 7) Fallback sweeping
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}


// ===== 다음 로봇 =====



function name(){return "Orion-6-Q6";}
function type(){return Type.NORMAL;}
// VM-persistent state per robot
let __state = { last:null, tick:0, lastVel:null };
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131)|0)%2?1:-1; // deterministic per spawn
  const P={"leadCap":14,"leadWeight":1.08,"aimJitter":0.24,"minRange":230,"maxRange":340,"strafeAngle":32,"threatRadius":188,"threatFleeBias":16,"allySep":66,"edgeMargin":56,"bias":5,"targetHealthWeight":1.25,"targetDistWeight":0.1,"finishHp":22,"finishRemain":3,"finishMinDelta":35,"finishMaxDelta":25};

  __state.tick = (__state.tick||0) + 1;

  // 1) Target selection: lowest health priority, then nearest
  let tgt=null; let best=1e9;
  for(const e of enemies){
    const key = e.health*1.25 + e.distance*0.1;
    if(key<best){best=key; tgt=e;}
  }

  // 2) Predictive aim with simple linear lead (based on last observed velocity)
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last && __state.last.x!==undefined){
      const vx=(tgt.x-__state.last.x);
      const vy=(tgt.y-__state.last.y);
      // smooth velocity a bit
      let lvx=__state.lastVel?__state.lastVel.vx:0;
      let lvy=__state.lastVel?__state.lastVel.vy:0;
      const svx = lvx*0.5 + vx*0.5;
      const svy = lvy*0.5 + vy*0.5;
      __state.lastVel = { vx: svx, vy: svy };
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead=clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + svx*P.leadWeight*tLead;
      aimY = tgt.y + svy*P.leadWeight*tLead;
    }
    const jitter = (((tank.x*31+tank.y*17)%23)-11)*0.08 * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x:tgt.x, y:tgt.y };
  }

  // Helpers
  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // 3) Bullet avoidance (nearest approach within radius)
  let hot=null; let minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatRadius){ minD=d; hot=b; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const side = (rnd>0?1:-1)*P.threatFleeBias + P.bias*0.6;
    const cands=[a+90+side, a-90-side, a+120, a-120, a+70, a-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // 5) Ally separation
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.allySep){
    const away = toDeg(tank.x-near.x, tank.y-near.y);
    if(tryMove(away)) return; if(tryMove(away+28)) return; if(tryMove(away-28)) return;
  }

  // 6) Engagement spacing + strafing (adaptive aggression)
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    let minR=P.minRange, maxR=P.maxRange;
    const remain = enemies.length;
    if((tgt.health<=P.finishHp) || remain<=P.finishRemain){ minR-=P.finishMinDelta; maxR-=P.finishMaxDelta; }
    if(d < minR){
      const away = to+180 + P.bias*0.4;
      if(tryMove(away)) return; if(tryMove(away+24)) return; if(tryMove(away-24)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+18)) return; if(tryMove(to-18)) return;
    } else {
      const side = to + ((((tank.x*13+tank.y*7)|0)%2)?P.strafeAngle:-P.strafeAngle) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+18)) return; if(tryMove(side-18)) return;
    }
  }

  // 7) Fallback sweeping
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}

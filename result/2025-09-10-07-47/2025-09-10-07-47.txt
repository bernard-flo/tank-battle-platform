
function name(){return "Nova-Q1";}
function type(){return Type.TANKER;}
// VM-persistent state per robot
let __state = { last:null, tick:0, lastD:null };
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131)|0)%2?1:-1; // deterministic per spawn
  const P={
    leadCap:14,
    leadWeight:1.06,
    aimJitter:0.2,
    minRange:150,
    maxRange:238,
    strafeAngle:28,
    threatRadius:80,
    threatFleeBias:16,
    allySep:62,
    edgeMargin:46,
    bias:-12
  };

  __state.tick = (__state.tick||0) + 1;

  // 1) Target selection: prioritize lowest health, tie-break by distance
  let tgt=null; let keyBest=1e9;
  for(const e of enemies){
    const k = e.health*1.25 + e.distance*0.12; // health-first
    if(k<keyBest){ keyBest=k; tgt=e; }
  }

  // 2) Predictive aim (linear lead capped by distance/bullet speed)
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last&&__state.last.x!==undefined){
      const vx=(tgt.x-__state.last.x);
      const vy=(tgt.y-__state.last.y);
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead=clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + vx*P.leadWeight*tLead;
      aimY = tgt.y + vy*P.leadWeight*tLead;
    }
    const jitter = (((tank.x*31+tank.y*17)%23)-11)*0.08 * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x:tgt.x, y:tgt.y };
  }

  // 3) Movement helpers
  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // 4) Bullet avoidance: nearest-approach with lateral dodge set selection
  let hot=null; let minD=1e9; let eta=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatRadius){ minD=d; hot=b; eta=proj/v; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const side = (rnd>0?1:-1)*P.threatFleeBias + P.bias*0.6;
    const cands=[a+90+side, a-90-side, a+120, a-120, a+70, a-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // 5) Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // 6) Ally separation (simple repulsion)
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.allySep){
    const away = toDeg(tank.x-near.x, tank.y-near.y);
    if(tryMove(away)) return; if(tryMove(away+28)) return; if(tryMove(away-28)) return;
  }

  // 7) Engagement spacing + strafing
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    // adaptive aggression if low hp target or few enemies remain
    const remain = enemies.length;
    let minR=P.minRange, maxR=P.maxRange;
    if((tgt.health<=20) || remain<=3){ minR-=35; maxR-=25; }

    if(d < minR){
      const away = to+180 + P.bias*0.4;
      if(tryMove(away)) return; if(tryMove(away+24)) return; if(tryMove(away-24)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+18)) return; if(tryMove(to-18)) return;
    } else {
      const side = to + (((tank.x*13+tank.y*7)|0)%2?P.strafeAngle:-P.strafeAngle) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+18)) return; if(tryMove(side-18)) return;
    }
  }

  // 8) Fallback sweeping
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}


// ===== 다음 로봇 =====


function name(){return "Nova-Q2";}
function type(){return Type.TANKER;}
// VM-persistent state per robot
let __state = { last:null, tick:0, lastD:null };
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131)|0)%2?1:-1; // deterministic per spawn
  const P={
    leadCap:14,
    leadWeight:1.06,
    aimJitter:0.2,
    minRange:150,
    maxRange:238,
    strafeAngle:28,
    threatRadius:80,
    threatFleeBias:16,
    allySep:62,
    edgeMargin:46,
    bias:12
  };

  __state.tick = (__state.tick||0) + 1;

  // 1) Target selection: prioritize lowest health, tie-break by distance
  let tgt=null; let keyBest=1e9;
  for(const e of enemies){
    const k = e.health*1.25 + e.distance*0.12; // health-first
    if(k<keyBest){ keyBest=k; tgt=e; }
  }

  // 2) Predictive aim (linear lead capped by distance/bullet speed)
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last&&__state.last.x!==undefined){
      const vx=(tgt.x-__state.last.x);
      const vy=(tgt.y-__state.last.y);
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead=clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + vx*P.leadWeight*tLead;
      aimY = tgt.y + vy*P.leadWeight*tLead;
    }
    const jitter = (((tank.x*31+tank.y*17)%23)-11)*0.08 * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x:tgt.x, y:tgt.y };
  }

  // 3) Movement helpers
  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // 4) Bullet avoidance: nearest-approach with lateral dodge set selection
  let hot=null; let minD=1e9; let eta=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatRadius){ minD=d; hot=b; eta=proj/v; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const side = (rnd>0?1:-1)*P.threatFleeBias + P.bias*0.6;
    const cands=[a+90+side, a-90-side, a+120, a-120, a+70, a-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // 5) Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // 6) Ally separation (simple repulsion)
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.allySep){
    const away = toDeg(tank.x-near.x, tank.y-near.y);
    if(tryMove(away)) return; if(tryMove(away+28)) return; if(tryMove(away-28)) return;
  }

  // 7) Engagement spacing + strafing
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    // adaptive aggression if low hp target or few enemies remain
    const remain = enemies.length;
    let minR=P.minRange, maxR=P.maxRange;
    if((tgt.health<=20) || remain<=3){ minR-=35; maxR-=25; }

    if(d < minR){
      const away = to+180 + P.bias*0.4;
      if(tryMove(away)) return; if(tryMove(away+24)) return; if(tryMove(away-24)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+18)) return; if(tryMove(to-18)) return;
    } else {
      const side = to + (((tank.x*13+tank.y*7)|0)%2?P.strafeAngle:-P.strafeAngle) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+18)) return; if(tryMove(side-18)) return;
    }
  }

  // 8) Fallback sweeping
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}


// ===== 다음 로봇 =====


function name(){return "Nova-Q3";}
function type(){return Type.NORMAL;}
// VM-persistent state per robot
let __state = { last:null, tick:0, lastD:null };
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131)|0)%2?1:-1; // deterministic per spawn
  const P={
    leadCap:14,
    leadWeight:1.06,
    aimJitter:0.2,
    minRange:170,
    maxRange:260,
    strafeAngle:28,
    threatRadius:78,
    threatFleeBias:14,
    allySep:62,
    edgeMargin:46,
    bias:-6
  };

  __state.tick = (__state.tick||0) + 1;

  // 1) Target selection: prioritize lowest health, tie-break by distance
  let tgt=null; let keyBest=1e9;
  for(const e of enemies){
    const k = e.health*1.25 + e.distance*0.12; // health-first
    if(k<keyBest){ keyBest=k; tgt=e; }
  }

  // 2) Predictive aim (linear lead capped by distance/bullet speed)
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last&&__state.last.x!==undefined){
      const vx=(tgt.x-__state.last.x);
      const vy=(tgt.y-__state.last.y);
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead=clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + vx*P.leadWeight*tLead;
      aimY = tgt.y + vy*P.leadWeight*tLead;
    }
    const jitter = (((tank.x*31+tank.y*17)%23)-11)*0.08 * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x:tgt.x, y:tgt.y };
  }

  // 3) Movement helpers
  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // 4) Bullet avoidance: nearest-approach with lateral dodge set selection
  let hot=null; let minD=1e9; let eta=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatRadius){ minD=d; hot=b; eta=proj/v; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const side = (rnd>0?1:-1)*P.threatFleeBias + P.bias*0.6;
    const cands=[a+90+side, a-90-side, a+120, a-120, a+70, a-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // 5) Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // 6) Ally separation (simple repulsion)
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.allySep){
    const away = toDeg(tank.x-near.x, tank.y-near.y);
    if(tryMove(away)) return; if(tryMove(away+28)) return; if(tryMove(away-28)) return;
  }

  // 7) Engagement spacing + strafing
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    // adaptive aggression if low hp target or few enemies remain
    const remain = enemies.length;
    let minR=P.minRange, maxR=P.maxRange;
    if((tgt.health<=20) || remain<=3){ minR-=35; maxR-=25; }

    if(d < minR){
      const away = to+180 + P.bias*0.4;
      if(tryMove(away)) return; if(tryMove(away+24)) return; if(tryMove(away-24)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+18)) return; if(tryMove(to-18)) return;
    } else {
      const side = to + (((tank.x*13+tank.y*7)|0)%2?P.strafeAngle:-P.strafeAngle) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+18)) return; if(tryMove(side-18)) return;
    }
  }

  // 8) Fallback sweeping
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}


// ===== 다음 로봇 =====


function name(){return "Nova-Q4";}
function type(){return Type.DEALER;}
// VM-persistent state per robot
let __state = { last:null, tick:0, lastD:null };
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131)|0)%2?1:-1; // deterministic per spawn
  const P={
    leadCap:14,
    leadWeight:1.06,
    aimJitter:0.2,
    minRange:212,
    maxRange:318,
    strafeAngle:34,
    threatRadius:74,
    threatFleeBias:12,
    allySep:62,
    edgeMargin:46,
    bias:6
  };

  __state.tick = (__state.tick||0) + 1;

  // 1) Target selection: prioritize lowest health, tie-break by distance
  let tgt=null; let keyBest=1e9;
  for(const e of enemies){
    const k = e.health*1.25 + e.distance*0.12; // health-first
    if(k<keyBest){ keyBest=k; tgt=e; }
  }

  // 2) Predictive aim (linear lead capped by distance/bullet speed)
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last&&__state.last.x!==undefined){
      const vx=(tgt.x-__state.last.x);
      const vy=(tgt.y-__state.last.y);
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead=clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + vx*P.leadWeight*tLead;
      aimY = tgt.y + vy*P.leadWeight*tLead;
    }
    const jitter = (((tank.x*31+tank.y*17)%23)-11)*0.08 * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x:tgt.x, y:tgt.y };
  }

  // 3) Movement helpers
  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // 4) Bullet avoidance: nearest-approach with lateral dodge set selection
  let hot=null; let minD=1e9; let eta=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatRadius){ minD=d; hot=b; eta=proj/v; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const side = (rnd>0?1:-1)*P.threatFleeBias + P.bias*0.6;
    const cands=[a+90+side, a-90-side, a+120, a-120, a+70, a-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // 5) Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // 6) Ally separation (simple repulsion)
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.allySep){
    const away = toDeg(tank.x-near.x, tank.y-near.y);
    if(tryMove(away)) return; if(tryMove(away+28)) return; if(tryMove(away-28)) return;
  }

  // 7) Engagement spacing + strafing
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    // adaptive aggression if low hp target or few enemies remain
    const remain = enemies.length;
    let minR=P.minRange, maxR=P.maxRange;
    if((tgt.health<=20) || remain<=3){ minR-=35; maxR-=25; }

    if(d < minR){
      const away = to+180 + P.bias*0.4;
      if(tryMove(away)) return; if(tryMove(away+24)) return; if(tryMove(away-24)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+18)) return; if(tryMove(to-18)) return;
    } else {
      const side = to + (((tank.x*13+tank.y*7)|0)%2?P.strafeAngle:-P.strafeAngle) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+18)) return; if(tryMove(side-18)) return;
    }
  }

  // 8) Fallback sweeping
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}


// ===== 다음 로봇 =====


function name(){return "Nova-Q5";}
function type(){return Type.DEALER;}
// VM-persistent state per robot
let __state = { last:null, tick:0, lastD:null };
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131)|0)%2?1:-1; // deterministic per spawn
  const P={
    leadCap:14,
    leadWeight:1.06,
    aimJitter:0.2,
    minRange:212,
    maxRange:318,
    strafeAngle:34,
    threatRadius:74,
    threatFleeBias:12,
    allySep:62,
    edgeMargin:46,
    bias:-3
  };

  __state.tick = (__state.tick||0) + 1;

  // 1) Target selection: prioritize lowest health, tie-break by distance
  let tgt=null; let keyBest=1e9;
  for(const e of enemies){
    const k = e.health*1.25 + e.distance*0.12; // health-first
    if(k<keyBest){ keyBest=k; tgt=e; }
  }

  // 2) Predictive aim (linear lead capped by distance/bullet speed)
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last&&__state.last.x!==undefined){
      const vx=(tgt.x-__state.last.x);
      const vy=(tgt.y-__state.last.y);
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead=clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + vx*P.leadWeight*tLead;
      aimY = tgt.y + vy*P.leadWeight*tLead;
    }
    const jitter = (((tank.x*31+tank.y*17)%23)-11)*0.08 * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x:tgt.x, y:tgt.y };
  }

  // 3) Movement helpers
  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // 4) Bullet avoidance: nearest-approach with lateral dodge set selection
  let hot=null; let minD=1e9; let eta=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatRadius){ minD=d; hot=b; eta=proj/v; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const side = (rnd>0?1:-1)*P.threatFleeBias + P.bias*0.6;
    const cands=[a+90+side, a-90-side, a+120, a-120, a+70, a-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // 5) Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // 6) Ally separation (simple repulsion)
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.allySep){
    const away = toDeg(tank.x-near.x, tank.y-near.y);
    if(tryMove(away)) return; if(tryMove(away+28)) return; if(tryMove(away-28)) return;
  }

  // 7) Engagement spacing + strafing
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    // adaptive aggression if low hp target or few enemies remain
    const remain = enemies.length;
    let minR=P.minRange, maxR=P.maxRange;
    if((tgt.health<=20) || remain<=3){ minR-=35; maxR-=25; }

    if(d < minR){
      const away = to+180 + P.bias*0.4;
      if(tryMove(away)) return; if(tryMove(away+24)) return; if(tryMove(away-24)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+18)) return; if(tryMove(to-18)) return;
    } else {
      const side = to + (((tank.x*13+tank.y*7)|0)%2?P.strafeAngle:-P.strafeAngle) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+18)) return; if(tryMove(side-18)) return;
    }
  }

  // 8) Fallback sweeping
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}


// ===== 다음 로봇 =====


function name(){return "Nova-Q6";}
function type(){return Type.DEALER;}
// VM-persistent state per robot
let __state = { last:null, tick:0, lastD:null };
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131)|0)%2?1:-1; // deterministic per spawn
  const P={
    leadCap:14,
    leadWeight:1.06,
    aimJitter:0.2,
    minRange:212,
    maxRange:318,
    strafeAngle:34,
    threatRadius:74,
    threatFleeBias:12,
    allySep:62,
    edgeMargin:46,
    bias:3
  };

  __state.tick = (__state.tick||0) + 1;

  // 1) Target selection: prioritize lowest health, tie-break by distance
  let tgt=null; let keyBest=1e9;
  for(const e of enemies){
    const k = e.health*1.25 + e.distance*0.12; // health-first
    if(k<keyBest){ keyBest=k; tgt=e; }
  }

  // 2) Predictive aim (linear lead capped by distance/bullet speed)
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last&&__state.last.x!==undefined){
      const vx=(tgt.x-__state.last.x);
      const vy=(tgt.y-__state.last.y);
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead=clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + vx*P.leadWeight*tLead;
      aimY = tgt.y + vy*P.leadWeight*tLead;
    }
    const jitter = (((tank.x*31+tank.y*17)%23)-11)*0.08 * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x:tgt.x, y:tgt.y };
  }

  // 3) Movement helpers
  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // 4) Bullet avoidance: nearest-approach with lateral dodge set selection
  let hot=null; let minD=1e9; let eta=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatRadius){ minD=d; hot=b; eta=proj/v; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const side = (rnd>0?1:-1)*P.threatFleeBias + P.bias*0.6;
    const cands=[a+90+side, a-90-side, a+120, a-120, a+70, a-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // 5) Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // 6) Ally separation (simple repulsion)
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.allySep){
    const away = toDeg(tank.x-near.x, tank.y-near.y);
    if(tryMove(away)) return; if(tryMove(away+28)) return; if(tryMove(away-28)) return;
  }

  // 7) Engagement spacing + strafing
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    // adaptive aggression if low hp target or few enemies remain
    const remain = enemies.length;
    let minR=P.minRange, maxR=P.maxRange;
    if((tgt.health<=20) || remain<=3){ minR-=35; maxR-=25; }

    if(d < minR){
      const away = to+180 + P.bias*0.4;
      if(tryMove(away)) return; if(tryMove(away+24)) return; if(tryMove(away-24)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+18)) return; if(tryMove(to-18)) return;
    } else {
      const side = to + (((tank.x*13+tank.y*7)|0)%2?P.strafeAngle:-P.strafeAngle) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+18)) return; if(tryMove(side-18)) return;
    }
  }

  // 8) Fallback sweeping
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}

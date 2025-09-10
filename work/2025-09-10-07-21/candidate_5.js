
function name(){return "Vanguard-A1";}
function type(){return Type.TANKER;}
// Persistent state per-robot (VM context persists across ticks)
let __state = { last: null };
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const sq=(x)=>x*x;
  const dist=(x1,y1,x2,y2)=>Math.hypot(x1-x2,y1-y2);
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const P={
    leadCap:10,
    leadWeight:0.9,
    aimJitter:0.25,
    minRange:160,
    maxRange:260,
    strafeAngle:24,
    threatRadius:70,
    allySep:60,
    edgeMargin:45,
    bias:-12
  };

  // Choose focus target: lowest health, then nearest
  let tgt=null; let best=1e9;
  for(const e of enemies){
    const key = e.health*1.2 + e.distance*0.1; // weight health first
    if(key<best){best=key; tgt=e;}
  }
  // Predictive aim
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last && __state.last.hasOwnProperty('x')){
      const dt=1; // ticks between calls
      const vx=(tgt.x-__state.last.x)/dt;
      const vy=(tgt.y-__state.last.y)/dt;
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y;
      const d=Math.hypot(dx,dy);
      const tLead=clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + vx*P.leadWeight*tLead;
      aimY = tgt.y + vy*P.leadWeight*tLead;
    }
    const jitter = ((tank.x*31+tank.y*17)%23-11)*0.09 * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x: tgt.x, y: tgt.y };
  }

  // Helper for attempts
  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // Bullet threat detection using nearest-approach
  let hot=null; let minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=Math.hypot(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v;
    const proj=dx*nx+dy*ny; if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=Math.hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatRadius){ minD=d; hot=b; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const cand=[a+90+P.bias, a-90-P.bias, a+110, a-110];
    for(const c of cand){ if(tryMove(c)) return; }
  }

  // Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // Ally separation
  let nearA=null; let ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; nearA=a; } }
  if(nearA && ad < P.allySep){
    const away = toDeg(tank.x-nearA.x, tank.y-nearA.y);
    if(tryMove(away)) return; if(tryMove(away+30)) return; if(tryMove(away-30)) return;
  }

  // Engagement spacing and strafe
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    if(d < P.minRange){
      const away = to+180 + P.bias*0.5;
      if(tryMove(away)) return; if(tryMove(away+25)) return; if(tryMove(away-25)) return;
    } else if(d > P.maxRange){
      if(tryMove(to)) return; if(tryMove(to+18)) return; if(tryMove(to-18)) return;
    } else {
      const side = to + ( (tank.x*13+tank.y*7)%2 ? P.strafeAngle : -P.strafeAngle ) + P.bias*0.4;
      if(tryMove(side)) return; if(tryMove(side+18)) return; if(tryMove(side-18)) return;
    }
  }

  // Fallback sweeping
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}


// ===== 다음 로봇 =====


function name(){return "Vanguard-A2";}
function type(){return Type.TANKER;}
// Persistent state per-robot (VM context persists across ticks)
let __state = { last: null };
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const sq=(x)=>x*x;
  const dist=(x1,y1,x2,y2)=>Math.hypot(x1-x2,y1-y2);
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const P={
    leadCap:10,
    leadWeight:0.9,
    aimJitter:0.25,
    minRange:160,
    maxRange:260,
    strafeAngle:24,
    threatRadius:70,
    allySep:60,
    edgeMargin:45,
    bias:12
  };

  // Choose focus target: lowest health, then nearest
  let tgt=null; let best=1e9;
  for(const e of enemies){
    const key = e.health*1.2 + e.distance*0.1; // weight health first
    if(key<best){best=key; tgt=e;}
  }
  // Predictive aim
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last && __state.last.hasOwnProperty('x')){
      const dt=1; // ticks between calls
      const vx=(tgt.x-__state.last.x)/dt;
      const vy=(tgt.y-__state.last.y)/dt;
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y;
      const d=Math.hypot(dx,dy);
      const tLead=clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + vx*P.leadWeight*tLead;
      aimY = tgt.y + vy*P.leadWeight*tLead;
    }
    const jitter = ((tank.x*31+tank.y*17)%23-11)*0.09 * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x: tgt.x, y: tgt.y };
  }

  // Helper for attempts
  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // Bullet threat detection using nearest-approach
  let hot=null; let minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=Math.hypot(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v;
    const proj=dx*nx+dy*ny; if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=Math.hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatRadius){ minD=d; hot=b; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const cand=[a+90+P.bias, a-90-P.bias, a+110, a-110];
    for(const c of cand){ if(tryMove(c)) return; }
  }

  // Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // Ally separation
  let nearA=null; let ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; nearA=a; } }
  if(nearA && ad < P.allySep){
    const away = toDeg(tank.x-nearA.x, tank.y-nearA.y);
    if(tryMove(away)) return; if(tryMove(away+30)) return; if(tryMove(away-30)) return;
  }

  // Engagement spacing and strafe
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    if(d < P.minRange){
      const away = to+180 + P.bias*0.5;
      if(tryMove(away)) return; if(tryMove(away+25)) return; if(tryMove(away-25)) return;
    } else if(d > P.maxRange){
      if(tryMove(to)) return; if(tryMove(to+18)) return; if(tryMove(to-18)) return;
    } else {
      const side = to + ( (tank.x*13+tank.y*7)%2 ? P.strafeAngle : -P.strafeAngle ) + P.bias*0.4;
      if(tryMove(side)) return; if(tryMove(side+18)) return; if(tryMove(side-18)) return;
    }
  }

  // Fallback sweeping
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}


// ===== 다음 로봇 =====


function name(){return "Vanguard-A3";}
function type(){return Type.NORMAL;}
// Persistent state per-robot (VM context persists across ticks)
let __state = { last: null };
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const sq=(x)=>x*x;
  const dist=(x1,y1,x2,y2)=>Math.hypot(x1-x2,y1-y2);
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const P={
    leadCap:10,
    leadWeight:0.9,
    aimJitter:0.25,
    minRange:160,
    maxRange:260,
    strafeAngle:24,
    threatRadius:68,
    allySep:60,
    edgeMargin:45,
    bias:-6
  };

  // Choose focus target: lowest health, then nearest
  let tgt=null; let best=1e9;
  for(const e of enemies){
    const key = e.health*1.2 + e.distance*0.1; // weight health first
    if(key<best){best=key; tgt=e;}
  }
  // Predictive aim
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last && __state.last.hasOwnProperty('x')){
      const dt=1; // ticks between calls
      const vx=(tgt.x-__state.last.x)/dt;
      const vy=(tgt.y-__state.last.y)/dt;
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y;
      const d=Math.hypot(dx,dy);
      const tLead=clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + vx*P.leadWeight*tLead;
      aimY = tgt.y + vy*P.leadWeight*tLead;
    }
    const jitter = ((tank.x*31+tank.y*17)%23-11)*0.09 * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x: tgt.x, y: tgt.y };
  }

  // Helper for attempts
  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // Bullet threat detection using nearest-approach
  let hot=null; let minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=Math.hypot(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v;
    const proj=dx*nx+dy*ny; if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=Math.hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatRadius){ minD=d; hot=b; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const cand=[a+90+P.bias, a-90-P.bias, a+110, a-110];
    for(const c of cand){ if(tryMove(c)) return; }
  }

  // Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // Ally separation
  let nearA=null; let ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; nearA=a; } }
  if(nearA && ad < P.allySep){
    const away = toDeg(tank.x-nearA.x, tank.y-nearA.y);
    if(tryMove(away)) return; if(tryMove(away+30)) return; if(tryMove(away-30)) return;
  }

  // Engagement spacing and strafe
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    if(d < P.minRange){
      const away = to+180 + P.bias*0.5;
      if(tryMove(away)) return; if(tryMove(away+25)) return; if(tryMove(away-25)) return;
    } else if(d > P.maxRange){
      if(tryMove(to)) return; if(tryMove(to+18)) return; if(tryMove(to-18)) return;
    } else {
      const side = to + ( (tank.x*13+tank.y*7)%2 ? P.strafeAngle : -P.strafeAngle ) + P.bias*0.4;
      if(tryMove(side)) return; if(tryMove(side+18)) return; if(tryMove(side-18)) return;
    }
  }

  // Fallback sweeping
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}


// ===== 다음 로봇 =====


function name(){return "Vanguard-A4";}
function type(){return Type.NORMAL;}
// Persistent state per-robot (VM context persists across ticks)
let __state = { last: null };
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const sq=(x)=>x*x;
  const dist=(x1,y1,x2,y2)=>Math.hypot(x1-x2,y1-y2);
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const P={
    leadCap:10,
    leadWeight:0.9,
    aimJitter:0.25,
    minRange:160,
    maxRange:260,
    strafeAngle:24,
    threatRadius:68,
    allySep:60,
    edgeMargin:45,
    bias:6
  };

  // Choose focus target: lowest health, then nearest
  let tgt=null; let best=1e9;
  for(const e of enemies){
    const key = e.health*1.2 + e.distance*0.1; // weight health first
    if(key<best){best=key; tgt=e;}
  }
  // Predictive aim
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last && __state.last.hasOwnProperty('x')){
      const dt=1; // ticks between calls
      const vx=(tgt.x-__state.last.x)/dt;
      const vy=(tgt.y-__state.last.y)/dt;
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y;
      const d=Math.hypot(dx,dy);
      const tLead=clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + vx*P.leadWeight*tLead;
      aimY = tgt.y + vy*P.leadWeight*tLead;
    }
    const jitter = ((tank.x*31+tank.y*17)%23-11)*0.09 * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x: tgt.x, y: tgt.y };
  }

  // Helper for attempts
  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // Bullet threat detection using nearest-approach
  let hot=null; let minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=Math.hypot(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v;
    const proj=dx*nx+dy*ny; if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=Math.hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatRadius){ minD=d; hot=b; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const cand=[a+90+P.bias, a-90-P.bias, a+110, a-110];
    for(const c of cand){ if(tryMove(c)) return; }
  }

  // Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // Ally separation
  let nearA=null; let ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; nearA=a; } }
  if(nearA && ad < P.allySep){
    const away = toDeg(tank.x-nearA.x, tank.y-nearA.y);
    if(tryMove(away)) return; if(tryMove(away+30)) return; if(tryMove(away-30)) return;
  }

  // Engagement spacing and strafe
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    if(d < P.minRange){
      const away = to+180 + P.bias*0.5;
      if(tryMove(away)) return; if(tryMove(away+25)) return; if(tryMove(away-25)) return;
    } else if(d > P.maxRange){
      if(tryMove(to)) return; if(tryMove(to+18)) return; if(tryMove(to-18)) return;
    } else {
      const side = to + ( (tank.x*13+tank.y*7)%2 ? P.strafeAngle : -P.strafeAngle ) + P.bias*0.4;
      if(tryMove(side)) return; if(tryMove(side+18)) return; if(tryMove(side-18)) return;
    }
  }

  // Fallback sweeping
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}


// ===== 다음 로봇 =====


function name(){return "Vanguard-A5";}
function type(){return Type.DEALER;}
// Persistent state per-robot (VM context persists across ticks)
let __state = { last: null };
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const sq=(x)=>x*x;
  const dist=(x1,y1,x2,y2)=>Math.hypot(x1-x2,y1-y2);
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const P={
    leadCap:10,
    leadWeight:0.9,
    aimJitter:0.25,
    minRange:210,
    maxRange:310,
    strafeAngle:30,
    threatRadius:68,
    allySep:60,
    edgeMargin:45,
    bias:-3
  };

  // Choose focus target: lowest health, then nearest
  let tgt=null; let best=1e9;
  for(const e of enemies){
    const key = e.health*1.2 + e.distance*0.1; // weight health first
    if(key<best){best=key; tgt=e;}
  }
  // Predictive aim
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last && __state.last.hasOwnProperty('x')){
      const dt=1; // ticks between calls
      const vx=(tgt.x-__state.last.x)/dt;
      const vy=(tgt.y-__state.last.y)/dt;
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y;
      const d=Math.hypot(dx,dy);
      const tLead=clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + vx*P.leadWeight*tLead;
      aimY = tgt.y + vy*P.leadWeight*tLead;
    }
    const jitter = ((tank.x*31+tank.y*17)%23-11)*0.09 * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x: tgt.x, y: tgt.y };
  }

  // Helper for attempts
  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // Bullet threat detection using nearest-approach
  let hot=null; let minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=Math.hypot(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v;
    const proj=dx*nx+dy*ny; if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=Math.hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatRadius){ minD=d; hot=b; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const cand=[a+90+P.bias, a-90-P.bias, a+110, a-110];
    for(const c of cand){ if(tryMove(c)) return; }
  }

  // Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // Ally separation
  let nearA=null; let ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; nearA=a; } }
  if(nearA && ad < P.allySep){
    const away = toDeg(tank.x-nearA.x, tank.y-nearA.y);
    if(tryMove(away)) return; if(tryMove(away+30)) return; if(tryMove(away-30)) return;
  }

  // Engagement spacing and strafe
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    if(d < P.minRange){
      const away = to+180 + P.bias*0.5;
      if(tryMove(away)) return; if(tryMove(away+25)) return; if(tryMove(away-25)) return;
    } else if(d > P.maxRange){
      if(tryMove(to)) return; if(tryMove(to+18)) return; if(tryMove(to-18)) return;
    } else {
      const side = to + ( (tank.x*13+tank.y*7)%2 ? P.strafeAngle : -P.strafeAngle ) + P.bias*0.4;
      if(tryMove(side)) return; if(tryMove(side+18)) return; if(tryMove(side-18)) return;
    }
  }

  // Fallback sweeping
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}


// ===== 다음 로봇 =====


function name(){return "Vanguard-A6";}
function type(){return Type.DEALER;}
// Persistent state per-robot (VM context persists across ticks)
let __state = { last: null };
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const sq=(x)=>x*x;
  const dist=(x1,y1,x2,y2)=>Math.hypot(x1-x2,y1-y2);
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const P={
    leadCap:10,
    leadWeight:0.9,
    aimJitter:0.25,
    minRange:210,
    maxRange:310,
    strafeAngle:30,
    threatRadius:68,
    allySep:60,
    edgeMargin:45,
    bias:3
  };

  // Choose focus target: lowest health, then nearest
  let tgt=null; let best=1e9;
  for(const e of enemies){
    const key = e.health*1.2 + e.distance*0.1; // weight health first
    if(key<best){best=key; tgt=e;}
  }
  // Predictive aim
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last && __state.last.hasOwnProperty('x')){
      const dt=1; // ticks between calls
      const vx=(tgt.x-__state.last.x)/dt;
      const vy=(tgt.y-__state.last.y)/dt;
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y;
      const d=Math.hypot(dx,dy);
      const tLead=clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + vx*P.leadWeight*tLead;
      aimY = tgt.y + vy*P.leadWeight*tLead;
    }
    const jitter = ((tank.x*31+tank.y*17)%23-11)*0.09 * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x: tgt.x, y: tgt.y };
  }

  // Helper for attempts
  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // Bullet threat detection using nearest-approach
  let hot=null; let minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=Math.hypot(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v;
    const proj=dx*nx+dy*ny; if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=Math.hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatRadius){ minD=d; hot=b; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const cand=[a+90+P.bias, a-90-P.bias, a+110, a-110];
    for(const c of cand){ if(tryMove(c)) return; }
  }

  // Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // Ally separation
  let nearA=null; let ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; nearA=a; } }
  if(nearA && ad < P.allySep){
    const away = toDeg(tank.x-nearA.x, tank.y-nearA.y);
    if(tryMove(away)) return; if(tryMove(away+30)) return; if(tryMove(away-30)) return;
  }

  // Engagement spacing and strafe
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    if(d < P.minRange){
      const away = to+180 + P.bias*0.5;
      if(tryMove(away)) return; if(tryMove(away+25)) return; if(tryMove(away-25)) return;
    } else if(d > P.maxRange){
      if(tryMove(to)) return; if(tryMove(to+18)) return; if(tryMove(to-18)) return;
    } else {
      const side = to + ( (tank.x*13+tank.y*7)%2 ? P.strafeAngle : -P.strafeAngle ) + P.bias*0.4;
      if(tryMove(side)) return; if(tryMove(side+18)) return; if(tryMove(side-18)) return;
    }
  }

  // Fallback sweeping
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}

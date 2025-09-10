function name(){return "Astra-v18-T1";}
function type(){return Type.TANKER;}
let __s = { last: null, tick: 0 };
function update(tank, enemies, allies, bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131+11)|0)%2?1:-1;
  const P={"rMin":176.2,"rMax":278.7,"strafe":29.6,"threatR":72.3,"fleeBias":12.9,"sep":70.3,"edge":49.5,"bias":5.1,"leadCap":14.2,"leadW":1,"aimJitter":0.1,"healthW":1.3,"distW":0.1,"finisherHP":22.5,"aggrRemain":2,"aggrIn":33.8,"aggrOut":29.9};

  __s.tick=(__s.tick||0)+1;

  // Target selection: lowest effective HP then distance
  let tgt=null; let best=1e9;
  for(const e of enemies){
    const k = e.health*P.healthW + e.distance*P.distW;
    if(k<best){ best=k; tgt=e; }
  }

  // Predictive lead using last observation of same slot target
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__s.last){
      const vx=(tgt.x-__s.last.x);
      const vy=(tgt.y-__s.last.y);
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead = clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + vx*P.leadW*tLead;
      aimY = tgt.y + vy*P.leadW*tLead;
    }
    const jitter = ((((tank.x*31+tank.y*17+11)%23)-11)*0.07) * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __s.last = { x:tgt.x, y:tgt.y };
  }

  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // Bullet avoidance: lateral dodge relative to bullet vector
  let hot=null; let minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatR){ minD=d; hot=b; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const side = (rnd>0?1:-1)*P.fleeBias + P.bias*0.6;
    const cands=[a+90+side, a-90-side, a+120, a-120, a+70, a-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // Edge avoidance
  if(tank.x < P.edge){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edge){ if(tryMove(180)) return; }
  if(tank.y < P.edge){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edge){ if(tryMove(270)) return; }

  // Ally separation
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.sep){
    const away = toDeg(tank.x-near.x, tank.y-near.y);
    if(tryMove(away)) return; if(tryMove(away+24)) return; if(tryMove(away-24)) return;
  }

  // Engagement spacing + strafe
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d  = tgt.distance;
    let minR=P.rMin, maxR=P.rMax;
    if((tgt.health<=P.finisherHP) || enemies.length<=P.aggrRemain){ minR-=P.aggrIn; maxR-=P.aggrOut; }
    if(d < minR){
      const away = to+180 + P.bias*0.4; if(tryMove(away)) return; if(tryMove(away+22)) return; if(tryMove(away-22)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+16)) return; if(tryMove(to-16)) return;
    } else {
      const side = to + (((tank.x*13+tank.y*7+11)|0)%2?P.strafe:-P.strafe) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+16)) return; if(tryMove(side-16)) return;
    }
  }

  // Fallback sweep
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}


// ===== 다음 로봇 =====


function name(){return "Astra-v18-T2";}
function type(){return Type.TANKER;}
let __s = { last: null, tick: 0 };
function update(tank, enemies, allies, bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131+19)|0)%2?1:-1;
  const P={"rMin":173,"rMax":268.3,"strafe":34.1,"threatR":75.4,"fleeBias":12.7,"sep":63.1,"edge":42.5,"bias":7.8,"leadCap":11.5,"leadW":1.1,"aimJitter":0.1,"healthW":1.4,"distW":0.1,"finisherHP":17.3,"aggrRemain":4,"aggrIn":34.2,"aggrOut":27.5};

  __s.tick=(__s.tick||0)+1;

  // Target selection: lowest effective HP then distance
  let tgt=null; let best=1e9;
  for(const e of enemies){
    const k = e.health*P.healthW + e.distance*P.distW;
    if(k<best){ best=k; tgt=e; }
  }

  // Predictive lead using last observation of same slot target
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__s.last){
      const vx=(tgt.x-__s.last.x);
      const vy=(tgt.y-__s.last.y);
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead = clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + vx*P.leadW*tLead;
      aimY = tgt.y + vy*P.leadW*tLead;
    }
    const jitter = ((((tank.x*31+tank.y*17+19)%23)-11)*0.07) * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __s.last = { x:tgt.x, y:tgt.y };
  }

  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // Bullet avoidance: lateral dodge relative to bullet vector
  let hot=null; let minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatR){ minD=d; hot=b; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const side = (rnd>0?1:-1)*P.fleeBias + P.bias*0.6;
    const cands=[a+90+side, a-90-side, a+120, a-120, a+70, a-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // Edge avoidance
  if(tank.x < P.edge){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edge){ if(tryMove(180)) return; }
  if(tank.y < P.edge){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edge){ if(tryMove(270)) return; }

  // Ally separation
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.sep){
    const away = toDeg(tank.x-near.x, tank.y-near.y);
    if(tryMove(away)) return; if(tryMove(away+24)) return; if(tryMove(away-24)) return;
  }

  // Engagement spacing + strafe
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d  = tgt.distance;
    let minR=P.rMin, maxR=P.rMax;
    if((tgt.health<=P.finisherHP) || enemies.length<=P.aggrRemain){ minR-=P.aggrIn; maxR-=P.aggrOut; }
    if(d < minR){
      const away = to+180 + P.bias*0.4; if(tryMove(away)) return; if(tryMove(away+22)) return; if(tryMove(away-22)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+16)) return; if(tryMove(to-16)) return;
    } else {
      const side = to + (((tank.x*13+tank.y*7+19)|0)%2?P.strafe:-P.strafe) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+16)) return; if(tryMove(side-16)) return;
    }
  }

  // Fallback sweep
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}


// ===== 다음 로봇 =====


function name(){return "Astra-v18-N1";}
function type(){return Type.NORMAL;}
let __s = { last: null, tick: 0 };
function update(tank, enemies, allies, bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131+-7)|0)%2?1:-1;
  const P={"rMin":212,"rMax":289.7,"strafe":33.6,"threatR":77.4,"fleeBias":12.9,"sep":69.9,"edge":52.9,"bias":-3.4,"leadCap":12.3,"leadW":1.1,"aimJitter":0.2,"healthW":1.2,"distW":0.1,"finisherHP":16.4,"aggrRemain":2,"aggrIn":30.1,"aggrOut":27.5};

  __s.tick=(__s.tick||0)+1;

  // Target selection: lowest effective HP then distance
  let tgt=null; let best=1e9;
  for(const e of enemies){
    const k = e.health*P.healthW + e.distance*P.distW;
    if(k<best){ best=k; tgt=e; }
  }

  // Predictive lead using last observation of same slot target
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__s.last){
      const vx=(tgt.x-__s.last.x);
      const vy=(tgt.y-__s.last.y);
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead = clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + vx*P.leadW*tLead;
      aimY = tgt.y + vy*P.leadW*tLead;
    }
    const jitter = ((((tank.x*31+tank.y*17+-7)%23)-11)*0.07) * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __s.last = { x:tgt.x, y:tgt.y };
  }

  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // Bullet avoidance: lateral dodge relative to bullet vector
  let hot=null; let minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatR){ minD=d; hot=b; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const side = (rnd>0?1:-1)*P.fleeBias + P.bias*0.6;
    const cands=[a+90+side, a-90-side, a+120, a-120, a+70, a-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // Edge avoidance
  if(tank.x < P.edge){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edge){ if(tryMove(180)) return; }
  if(tank.y < P.edge){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edge){ if(tryMove(270)) return; }

  // Ally separation
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.sep){
    const away = toDeg(tank.x-near.x, tank.y-near.y);
    if(tryMove(away)) return; if(tryMove(away+24)) return; if(tryMove(away-24)) return;
  }

  // Engagement spacing + strafe
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d  = tgt.distance;
    let minR=P.rMin, maxR=P.rMax;
    if((tgt.health<=P.finisherHP) || enemies.length<=P.aggrRemain){ minR-=P.aggrIn; maxR-=P.aggrOut; }
    if(d < minR){
      const away = to+180 + P.bias*0.4; if(tryMove(away)) return; if(tryMove(away+22)) return; if(tryMove(away-22)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+16)) return; if(tryMove(to-16)) return;
    } else {
      const side = to + (((tank.x*13+tank.y*7+-7)|0)%2?P.strafe:-P.strafe) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+16)) return; if(tryMove(side-16)) return;
    }
  }

  // Fallback sweep
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}


// ===== 다음 로봇 =====


function name(){return "Astra-v18-N2";}
function type(){return Type.NORMAL;}
let __s = { last: null, tick: 0 };
function update(tank, enemies, allies, bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131+5)|0)%2?1:-1;
  const P={"rMin":213.1,"rMax":321.1,"strafe":32.1,"threatR":71.9,"fleeBias":13.7,"sep":64.6,"edge":44.7,"bias":6.9,"leadCap":13.8,"leadW":1,"aimJitter":0.1,"healthW":1.2,"distW":0.1,"finisherHP":22.3,"aggrRemain":2,"aggrIn":38.4,"aggrOut":21.4};

  __s.tick=(__s.tick||0)+1;

  // Target selection: lowest effective HP then distance
  let tgt=null; let best=1e9;
  for(const e of enemies){
    const k = e.health*P.healthW + e.distance*P.distW;
    if(k<best){ best=k; tgt=e; }
  }

  // Predictive lead using last observation of same slot target
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__s.last){
      const vx=(tgt.x-__s.last.x);
      const vy=(tgt.y-__s.last.y);
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead = clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + vx*P.leadW*tLead;
      aimY = tgt.y + vy*P.leadW*tLead;
    }
    const jitter = ((((tank.x*31+tank.y*17+5)%23)-11)*0.07) * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __s.last = { x:tgt.x, y:tgt.y };
  }

  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // Bullet avoidance: lateral dodge relative to bullet vector
  let hot=null; let minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatR){ minD=d; hot=b; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const side = (rnd>0?1:-1)*P.fleeBias + P.bias*0.6;
    const cands=[a+90+side, a-90-side, a+120, a-120, a+70, a-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // Edge avoidance
  if(tank.x < P.edge){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edge){ if(tryMove(180)) return; }
  if(tank.y < P.edge){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edge){ if(tryMove(270)) return; }

  // Ally separation
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.sep){
    const away = toDeg(tank.x-near.x, tank.y-near.y);
    if(tryMove(away)) return; if(tryMove(away+24)) return; if(tryMove(away-24)) return;
  }

  // Engagement spacing + strafe
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d  = tgt.distance;
    let minR=P.rMin, maxR=P.rMax;
    if((tgt.health<=P.finisherHP) || enemies.length<=P.aggrRemain){ minR-=P.aggrIn; maxR-=P.aggrOut; }
    if(d < minR){
      const away = to+180 + P.bias*0.4; if(tryMove(away)) return; if(tryMove(away+22)) return; if(tryMove(away-22)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+16)) return; if(tryMove(to-16)) return;
    } else {
      const side = to + (((tank.x*13+tank.y*7+5)|0)%2?P.strafe:-P.strafe) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+16)) return; if(tryMove(side-16)) return;
    }
  }

  // Fallback sweep
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}


// ===== 다음 로봇 =====


function name(){return "Astra-v18-D1";}
function type(){return Type.DEALER;}
let __s = { last: null, tick: 0 };
function update(tank, enemies, allies, bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131+-13)|0)%2?1:-1;
  const P={"rMin":262.9,"rMax":362.4,"strafe":38.6,"threatR":74.8,"fleeBias":14.4,"sep":61.4,"edge":40.8,"bias":1,"leadCap":11.4,"leadW":1,"aimJitter":0.2,"healthW":1.2,"distW":0.1,"finisherHP":25.2,"aggrRemain":2,"aggrIn":31.7,"aggrOut":19.4};

  __s.tick=(__s.tick||0)+1;

  // Target selection: lowest effective HP then distance
  let tgt=null; let best=1e9;
  for(const e of enemies){
    const k = e.health*P.healthW + e.distance*P.distW;
    if(k<best){ best=k; tgt=e; }
  }

  // Predictive lead using last observation of same slot target
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__s.last){
      const vx=(tgt.x-__s.last.x);
      const vy=(tgt.y-__s.last.y);
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead = clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + vx*P.leadW*tLead;
      aimY = tgt.y + vy*P.leadW*tLead;
    }
    const jitter = ((((tank.x*31+tank.y*17+-13)%23)-11)*0.07) * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __s.last = { x:tgt.x, y:tgt.y };
  }

  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // Bullet avoidance: lateral dodge relative to bullet vector
  let hot=null; let minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatR){ minD=d; hot=b; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const side = (rnd>0?1:-1)*P.fleeBias + P.bias*0.6;
    const cands=[a+90+side, a-90-side, a+120, a-120, a+70, a-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // Edge avoidance
  if(tank.x < P.edge){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edge){ if(tryMove(180)) return; }
  if(tank.y < P.edge){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edge){ if(tryMove(270)) return; }

  // Ally separation
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.sep){
    const away = toDeg(tank.x-near.x, tank.y-near.y);
    if(tryMove(away)) return; if(tryMove(away+24)) return; if(tryMove(away-24)) return;
  }

  // Engagement spacing + strafe
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d  = tgt.distance;
    let minR=P.rMin, maxR=P.rMax;
    if((tgt.health<=P.finisherHP) || enemies.length<=P.aggrRemain){ minR-=P.aggrIn; maxR-=P.aggrOut; }
    if(d < minR){
      const away = to+180 + P.bias*0.4; if(tryMove(away)) return; if(tryMove(away+22)) return; if(tryMove(away-22)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+16)) return; if(tryMove(to-16)) return;
    } else {
      const side = to + (((tank.x*13+tank.y*7+-13)|0)%2?P.strafe:-P.strafe) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+16)) return; if(tryMove(side-16)) return;
    }
  }

  // Fallback sweep
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}


// ===== 다음 로봇 =====


function name(){return "Astra-v18-D2";}
function type(){return Type.DEALER;}
let __s = { last: null, tick: 0 };
function update(tank, enemies, allies, bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131+23)|0)%2?1:-1;
  const P={"rMin":250.2,"rMax":369.5,"strafe":40.9,"threatR":72.1,"fleeBias":13.6,"sep":58.7,"edge":41.3,"bias":11.9,"leadCap":14.4,"leadW":1.1,"aimJitter":0.1,"healthW":1.1,"distW":0.1,"finisherHP":23.2,"aggrRemain":3,"aggrIn":40.1,"aggrOut":22.2};

  __s.tick=(__s.tick||0)+1;

  // Target selection: lowest effective HP then distance
  let tgt=null; let best=1e9;
  for(const e of enemies){
    const k = e.health*P.healthW + e.distance*P.distW;
    if(k<best){ best=k; tgt=e; }
  }

  // Predictive lead using last observation of same slot target
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__s.last){
      const vx=(tgt.x-__s.last.x);
      const vy=(tgt.y-__s.last.y);
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead = clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + vx*P.leadW*tLead;
      aimY = tgt.y + vy*P.leadW*tLead;
    }
    const jitter = ((((tank.x*31+tank.y*17+23)%23)-11)*0.07) * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __s.last = { x:tgt.x, y:tgt.y };
  }

  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // Bullet avoidance: lateral dodge relative to bullet vector
  let hot=null; let minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatR){ minD=d; hot=b; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const side = (rnd>0?1:-1)*P.fleeBias + P.bias*0.6;
    const cands=[a+90+side, a-90-side, a+120, a-120, a+70, a-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // Edge avoidance
  if(tank.x < P.edge){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edge){ if(tryMove(180)) return; }
  if(tank.y < P.edge){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edge){ if(tryMove(270)) return; }

  // Ally separation
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.sep){
    const away = toDeg(tank.x-near.x, tank.y-near.y);
    if(tryMove(away)) return; if(tryMove(away+24)) return; if(tryMove(away-24)) return;
  }

  // Engagement spacing + strafe
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d  = tgt.distance;
    let minR=P.rMin, maxR=P.rMax;
    if((tgt.health<=P.finisherHP) || enemies.length<=P.aggrRemain){ minR-=P.aggrIn; maxR-=P.aggrOut; }
    if(d < minR){
      const away = to+180 + P.bias*0.4; if(tryMove(away)) return; if(tryMove(away+22)) return; if(tryMove(away-22)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+16)) return; if(tryMove(to-16)) return;
    } else {
      const side = to + (((tank.x*13+tank.y*7+23)|0)%2?P.strafe:-P.strafe) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+16)) return; if(tryMove(side-16)) return;
    }
  }

  // Fallback sweep
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}
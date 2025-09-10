function name(){return "Astra-v9-T1";}
function type(){return Type.TANKER;}
let __s = { last: null, tick: 0 };
function update(tank, enemies, allies, bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131+11)|0)%2?1:-1;
  const P={"rMin":151.5,"rMax":244.8,"strafe":24.1,"threatR":76.6,"fleeBias":15.6,"sep":59,"edge":44.2,"bias":1.7,"leadCap":12.3,"leadW":1.2,"aimJitter":0.2,"healthW":1.3,"distW":0.1,"finisherHP":18.5,"aggrRemain":4,"aggrIn":35.5,"aggrOut":23.3};

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


function name(){return "Astra-v9-T2";}
function type(){return Type.TANKER;}
let __s = { last: null, tick: 0 };
function update(tank, enemies, allies, bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131+19)|0)%2?1:-1;
  const P={"rMin":142.4,"rMax":239.5,"strafe":28.1,"threatR":83.2,"fleeBias":15.6,"sep":65.6,"edge":46.7,"bias":5.2,"leadCap":10.8,"leadW":1,"aimJitter":0.1,"healthW":1.4,"distW":0.1,"finisherHP":25.9,"aggrRemain":3,"aggrIn":31.7,"aggrOut":27.1};

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


function name(){return "Astra-v9-N1";}
function type(){return Type.NORMAL;}
let __s = { last: null, tick: 0 };
function update(tank, enemies, allies, bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131+-7)|0)%2?1:-1;
  const P={"rMin":164.7,"rMax":242.8,"strafe":29.1,"threatR":76,"fleeBias":12.4,"sep":66.5,"edge":46.2,"bias":6,"leadCap":11.8,"leadW":1,"aimJitter":0.2,"healthW":1.4,"distW":0.1,"finisherHP":17.9,"aggrRemain":3,"aggrIn":24.9,"aggrOut":30.6};

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


function name(){return "Astra-v9-N2";}
function type(){return Type.NORMAL;}
let __s = { last: null, tick: 0 };
function update(tank, enemies, allies, bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131+5)|0)%2?1:-1;
  const P={"rMin":177.1,"rMax":242.9,"strafe":33.2,"threatR":85.8,"fleeBias":16.1,"sep":63.1,"edge":43.1,"bias":-5.9,"leadCap":13.5,"leadW":1.2,"aimJitter":0.2,"healthW":1.4,"distW":0.1,"finisherHP":21.2,"aggrRemain":4,"aggrIn":37.5,"aggrOut":21.9};

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


function name(){return "Astra-v9-D1";}
function type(){return Type.DEALER;}
let __s = { last: null, tick: 0 };
function update(tank, enemies, allies, bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131+-13)|0)%2?1:-1;
  const P={"rMin":205.4,"rMax":296.5,"strafe":37.1,"threatR":73.7,"fleeBias":14,"sep":58.3,"edge":40.9,"bias":2.2,"leadCap":10.6,"leadW":1.2,"aimJitter":0.2,"healthW":1.3,"distW":0.1,"finisherHP":22.5,"aggrRemain":2,"aggrIn":24.7,"aggrOut":29.2};

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


function name(){return "Astra-v9-D2";}
function type(){return Type.DEALER;}
let __s = { last: null, tick: 0 };
function update(tank, enemies, allies, bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131+23)|0)%2?1:-1;
  const P={"rMin":200.1,"rMax":317.1,"strafe":36.9,"threatR":78.6,"fleeBias":17.2,"sep":64.2,"edge":46.8,"bias":4.8,"leadCap":13.5,"leadW":1,"aimJitter":0.2,"healthW":1.2,"distW":0.1,"finisherHP":16.4,"aggrRemain":4,"aggrIn":30.1,"aggrOut":27.7};

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
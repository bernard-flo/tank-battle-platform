function name(){return "Astra-v2-T1";}
function type(){return Type.TANKER;}
let __s = { last: null, tick: 0 };
function update(tank, enemies, allies, bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131+11)|0)%2?1:-1;
  const P={"rMin":154.3,"rMax":233.9,"strafe":25.4,"threatR":76,"fleeBias":18.8,"sep":63.9,"edge":49.4,"bias":-6.7,"leadCap":15,"leadW":0.9,"aimJitter":0.1,"healthW":1.4,"distW":0.1,"finisherHP":17.3,"aggrRemain":3,"aggrIn":23.2,"aggrOut":19.5};

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


function name(){return "Astra-v2-T2";}
function type(){return Type.TANKER;}
let __s = { last: null, tick: 0 };
function update(tank, enemies, allies, bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131+19)|0)%2?1:-1;
  const P={"rMin":147.8,"rMax":227.1,"strafe":26.6,"threatR":85,"fleeBias":16.9,"sep":67.3,"edge":44.1,"bias":-5.9,"leadCap":13.1,"leadW":1,"aimJitter":0.2,"healthW":1.1,"distW":0.1,"finisherHP":23.9,"aggrRemain":2,"aggrIn":32.8,"aggrOut":17.4};

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


function name(){return "Astra-v2-N1";}
function type(){return Type.NORMAL;}
let __s = { last: null, tick: 0 };
function update(tank, enemies, allies, bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131+-7)|0)%2?1:-1;
  const P={"rMin":160.5,"rMax":247.7,"strafe":26.3,"threatR":81.6,"fleeBias":17.9,"sep":61,"edge":47.9,"bias":-3.4,"leadCap":14.1,"leadW":0.9,"aimJitter":0.1,"healthW":1.2,"distW":0.1,"finisherHP":17.1,"aggrRemain":3,"aggrIn":29.8,"aggrOut":31.1};

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


function name(){return "Astra-v2-N2";}
function type(){return Type.NORMAL;}
let __s = { last: null, tick: 0 };
function update(tank, enemies, allies, bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131+5)|0)%2?1:-1;
  const P={"rMin":162.9,"rMax":247.2,"strafe":28.8,"threatR":79.7,"fleeBias":14.8,"sep":66.9,"edge":43.9,"bias":1.9,"leadCap":12.9,"leadW":1,"aimJitter":0.1,"healthW":1.4,"distW":0.1,"finisherHP":24.2,"aggrRemain":4,"aggrIn":34.2,"aggrOut":22.7};

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


function name(){return "Astra-v2-D1";}
function type(){return Type.DEALER;}
let __s = { last: null, tick: 0 };
function update(tank, enemies, allies, bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131+-13)|0)%2?1:-1;
  const P={"rMin":212.7,"rMax":292.3,"strafe":32.5,"threatR":81.7,"fleeBias":12.5,"sep":63.9,"edge":48.5,"bias":-5.1,"leadCap":13,"leadW":1.1,"aimJitter":0.1,"healthW":1.4,"distW":0.1,"finisherHP":25.5,"aggrRemain":3,"aggrIn":38.4,"aggrOut":16.6};

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


function name(){return "Astra-v2-D2";}
function type(){return Type.DEALER;}
let __s = { last: null, tick: 0 };
function update(tank, enemies, allies, bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131+23)|0)%2?1:-1;
  const P={"rMin":228.8,"rMax":331.8,"strafe":32.7,"threatR":80.2,"fleeBias":15.4,"sep":64.9,"edge":43.2,"bias":3.8,"leadCap":14.6,"leadW":0.9,"aimJitter":0.1,"healthW":1.1,"distW":0.1,"finisherHP":22.6,"aggrRemain":2,"aggrIn":24.6,"aggrOut":20.6};

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
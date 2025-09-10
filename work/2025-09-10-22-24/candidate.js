function name(){return "Nova-6-T1";}
function type(){return Type.TANKER;}
let __state={last:null, lastVel:null, tick:0};
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v; const hypot=Math.hypot;
  const P=Object.assign({}, {"leadCap":13.337,"leadWeight":1.035,"aimJitter":0.164,"minRange":164.749,"maxRange":254.879,"strafeAngle":28.476,"threatRadius":160.146,"threatFleeBias":14.017,"allySep":63.428,"edgeMargin":46.015,"bias":-10.169,"targetHealthWeight":1.641,"targetDistWeight":0.106,"finishHp":24.432,"finishRemain":2.513,"finishMinDelta":34.527,"finishMaxDelta":24.587,"lowHp":40.642,"lowHpPad":34.77,"sweep":[0,60,120,180,240,300]});
  // mix in per-robot bias to desync patterns
  P.bias = (P.bias||0) + (-10).toFixed ? -10 : (-10||0);
  __state.tick=(__state.tick||0)+1;

  // 1) target selection: prioritize low HP then distance
  let tgt=null, best=1e9;
  for(const e of enemies){ const key = e.health*P.targetHealthWeight + e.distance*P.targetDistWeight; if(key<best){best=key; tgt=e;} }

  // 2) predictive aim with simple velocity smoothing
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last){
      const vx=(tgt.x-__state.last.x); const vy=(tgt.y-__state.last.y);
      let lvx=__state.lastVel?__state.lastVel.vx:0; let lvy=__state.lastVel?__state.lastVel.vy:0;
      const svx=lvx*0.5 + vx*0.5; const svy=lvy*0.5 + vy*0.5; __state.lastVel={vx:svx,vy:svy};
      const d=hypot(tgt.x-tank.x,tgt.y-tank.y); const tLead=clamp(d/8,0,P.leadCap);
      aimX = tgt.x + svx*P.leadWeight*tLead; aimY = tgt.y + svy*P.leadWeight*tLead;
    }
    // small deterministic jitter to break symmetry
    const jitter = ((((tank.x*31+tank.y*17)|0)%23)-11)*0.06*P.aimJitter;
    tank.fire(toDeg(aimX-tank.x,aimY-tank.y)+jitter);
    __state.last={x:tgt.x,y:tgt.y};
  }

  let tries=0; const go=(a)=>{tries++; return tank.move(norm(a));};

  // 3) bullet avoidance: respond to nearest projected approach inside radius
  let hot=null, md=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y); if(d<md && d<P.threatRadius){ md=d; hot=b; } } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); const side = P.threatFleeBias + P.bias*0.4; const cand=[a+90+side, a-90-side, a+120, a-120, a+70, a-70]; for(const c of cand){ if(go(c)) return; } }

  // 4) edge avoidance (map 900x600)
  if(tank.x < P.edgeMargin){ if(go(0)) return; } if(tank.x > 900-P.edgeMargin){ if(go(180)) return; } if(tank.y < P.edgeMargin){ if(go(90)) return; } if(tank.y > 600-P.edgeMargin){ if(go(270)) return; }

  // 5) ally separation
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.allySep){ const away=toDeg(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+26)) return; if(go(away-26)) return; }

  // 6) spacing + strafing with health-aware aggression
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y); const d=tgt.distance; let MIN=P.minRange, MAX=P.maxRange;
    if(tgt.health<=P.finishHp || enemies.length<=P.finishRemain) { MIN-=P.finishMinDelta; MAX-=P.finishMaxDelta; }
    if(tank.health< P.lowHp){ MIN+=P.lowHpPad; }
    if(d<MIN){ const away=to+180 + P.bias*0.4; if(go(away)) return; if(go(away+22)) return; if(go(away-22)) return; }
    else if(d>MAX){ if(go(to)) return; if(go(to+16)) return; if(go(to-16)) return; }
    else { const side = to + ((((__state.tick+tank.x+tank.y)|0)%2)?P.strafeAngle:-P.strafeAngle) + P.bias*0.5; if(go(side)) return; if(go(side+16)) return; if(go(side-16)) return; }
  }

  // 7) fallback sweeping
  for(const s of P.sweep){ if(go(s+P.bias)) return; }
}


// ===== 다음 로봇 =====

function name(){return "Nova-6-T2";}
function type(){return Type.TANKER;}
let __state={last:null, lastVel:null, tick:0};
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v; const hypot=Math.hypot;
  const P=Object.assign({}, {"leadCap":13.635,"leadWeight":0.963,"aimJitter":0.136,"minRange":164.464,"maxRange":254.871,"strafeAngle":27.553,"threatRadius":159.485,"threatFleeBias":14.274,"allySep":63.866,"edgeMargin":46.03,"bias":-10.561,"targetHealthWeight":1.111,"targetDistWeight":0.139,"finishHp":24.517,"finishRemain":3.304,"finishMinDelta":35.213,"finishMaxDelta":24.971,"lowHp":40.26,"lowHpPad":34.967,"sweep":[0,60,120,180,240,300]});
  // mix in per-robot bias to desync patterns
  P.bias = (P.bias||0) + (8).toFixed ? 8 : (8||0);
  __state.tick=(__state.tick||0)+1;

  // 1) target selection: prioritize low HP then distance
  let tgt=null, best=1e9;
  for(const e of enemies){ const key = e.health*P.targetHealthWeight + e.distance*P.targetDistWeight; if(key<best){best=key; tgt=e;} }

  // 2) predictive aim with simple velocity smoothing
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last){
      const vx=(tgt.x-__state.last.x); const vy=(tgt.y-__state.last.y);
      let lvx=__state.lastVel?__state.lastVel.vx:0; let lvy=__state.lastVel?__state.lastVel.vy:0;
      const svx=lvx*0.5 + vx*0.5; const svy=lvy*0.5 + vy*0.5; __state.lastVel={vx:svx,vy:svy};
      const d=hypot(tgt.x-tank.x,tgt.y-tank.y); const tLead=clamp(d/8,0,P.leadCap);
      aimX = tgt.x + svx*P.leadWeight*tLead; aimY = tgt.y + svy*P.leadWeight*tLead;
    }
    // small deterministic jitter to break symmetry
    const jitter = ((((tank.x*31+tank.y*17)|0)%23)-11)*0.06*P.aimJitter;
    tank.fire(toDeg(aimX-tank.x,aimY-tank.y)+jitter);
    __state.last={x:tgt.x,y:tgt.y};
  }

  let tries=0; const go=(a)=>{tries++; return tank.move(norm(a));};

  // 3) bullet avoidance: respond to nearest projected approach inside radius
  let hot=null, md=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y); if(d<md && d<P.threatRadius){ md=d; hot=b; } } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); const side = P.threatFleeBias + P.bias*0.4; const cand=[a+90+side, a-90-side, a+120, a-120, a+70, a-70]; for(const c of cand){ if(go(c)) return; } }

  // 4) edge avoidance (map 900x600)
  if(tank.x < P.edgeMargin){ if(go(0)) return; } if(tank.x > 900-P.edgeMargin){ if(go(180)) return; } if(tank.y < P.edgeMargin){ if(go(90)) return; } if(tank.y > 600-P.edgeMargin){ if(go(270)) return; }

  // 5) ally separation
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.allySep){ const away=toDeg(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+26)) return; if(go(away-26)) return; }

  // 6) spacing + strafing with health-aware aggression
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y); const d=tgt.distance; let MIN=P.minRange, MAX=P.maxRange;
    if(tgt.health<=P.finishHp || enemies.length<=P.finishRemain) { MIN-=P.finishMinDelta; MAX-=P.finishMaxDelta; }
    if(tank.health< P.lowHp){ MIN+=P.lowHpPad; }
    if(d<MIN){ const away=to+180 + P.bias*0.4; if(go(away)) return; if(go(away+22)) return; if(go(away-22)) return; }
    else if(d>MAX){ if(go(to)) return; if(go(to+16)) return; if(go(to-16)) return; }
    else { const side = to + ((((__state.tick+tank.x+tank.y)|0)%2)?P.strafeAngle:-P.strafeAngle) + P.bias*0.5; if(go(side)) return; if(go(side+16)) return; if(go(side-16)) return; }
  }

  // 7) fallback sweeping
  for(const s of P.sweep){ if(go(s+P.bias)) return; }
}


// ===== 다음 로봇 =====

function name(){return "Nova-6-D1";}
function type(){return Type.DEALER;}
let __state={last:null, lastVel:null, tick:0};
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v; const hypot=Math.hypot;
  const P=Object.assign({}, {"leadCap":15.159,"leadWeight":0.7,"aimJitter":0.264,"minRange":240.461,"maxRange":380.617,"strafeAngle":36.286,"threatRadius":170.47,"threatFleeBias":16.412,"allySep":61.686,"edgeMargin":43.597,"bias":11.696,"targetHealthWeight":1.882,"targetDistWeight":0.074,"finishHp":21.484,"finishRemain":2.484,"finishMinDelta":39.755,"finishMaxDelta":35.645,"lowHp":35.409,"lowHpPad":49.759,"sweep":[0,50,100,150,200,250,300,350]});
  // mix in per-robot bias to desync patterns
  P.bias = (P.bias||0) + (-14).toFixed ? -14 : (-14||0);
  __state.tick=(__state.tick||0)+1;

  // 1) target selection: prioritize low HP then distance
  let tgt=null, best=1e9;
  for(const e of enemies){ const key = e.health*P.targetHealthWeight + e.distance*P.targetDistWeight; if(key<best){best=key; tgt=e;} }

  // 2) predictive aim with simple velocity smoothing
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last){
      const vx=(tgt.x-__state.last.x); const vy=(tgt.y-__state.last.y);
      let lvx=__state.lastVel?__state.lastVel.vx:0; let lvy=__state.lastVel?__state.lastVel.vy:0;
      const svx=lvx*0.5 + vx*0.5; const svy=lvy*0.5 + vy*0.5; __state.lastVel={vx:svx,vy:svy};
      const d=hypot(tgt.x-tank.x,tgt.y-tank.y); const tLead=clamp(d/8,0,P.leadCap);
      aimX = tgt.x + svx*P.leadWeight*tLead; aimY = tgt.y + svy*P.leadWeight*tLead;
    }
    // small deterministic jitter to break symmetry
    const jitter = ((((tank.x*31+tank.y*17)|0)%23)-11)*0.06*P.aimJitter;
    tank.fire(toDeg(aimX-tank.x,aimY-tank.y)+jitter);
    __state.last={x:tgt.x,y:tgt.y};
  }

  let tries=0; const go=(a)=>{tries++; return tank.move(norm(a));};

  // 3) bullet avoidance: respond to nearest projected approach inside radius
  let hot=null, md=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y); if(d<md && d<P.threatRadius){ md=d; hot=b; } } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); const side = P.threatFleeBias + P.bias*0.4; const cand=[a+90+side, a-90-side, a+120, a-120, a+70, a-70]; for(const c of cand){ if(go(c)) return; } }

  // 4) edge avoidance (map 900x600)
  if(tank.x < P.edgeMargin){ if(go(0)) return; } if(tank.x > 900-P.edgeMargin){ if(go(180)) return; } if(tank.y < P.edgeMargin){ if(go(90)) return; } if(tank.y > 600-P.edgeMargin){ if(go(270)) return; }

  // 5) ally separation
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.allySep){ const away=toDeg(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+26)) return; if(go(away-26)) return; }

  // 6) spacing + strafing with health-aware aggression
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y); const d=tgt.distance; let MIN=P.minRange, MAX=P.maxRange;
    if(tgt.health<=P.finishHp || enemies.length<=P.finishRemain) { MIN-=P.finishMinDelta; MAX-=P.finishMaxDelta; }
    if(tank.health< P.lowHp){ MIN+=P.lowHpPad; }
    if(d<MIN){ const away=to+180 + P.bias*0.4; if(go(away)) return; if(go(away+22)) return; if(go(away-22)) return; }
    else if(d>MAX){ if(go(to)) return; if(go(to+16)) return; if(go(to-16)) return; }
    else { const side = to + ((((__state.tick+tank.x+tank.y)|0)%2)?P.strafeAngle:-P.strafeAngle) + P.bias*0.5; if(go(side)) return; if(go(side+16)) return; if(go(side-16)) return; }
  }

  // 7) fallback sweeping
  for(const s of P.sweep){ if(go(s+P.bias)) return; }
}


// ===== 다음 로봇 =====

function name(){return "Nova-6-D2";}
function type(){return Type.DEALER;}
let __state={last:null, lastVel:null, tick:0};
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v; const hypot=Math.hypot;
  const P=Object.assign({}, {"leadCap":15.06,"leadWeight":1.1,"aimJitter":0.278,"minRange":239.737,"maxRange":380.124,"strafeAngle":35.472,"threatRadius":169.46,"threatFleeBias":16.452,"allySep":62.436,"edgeMargin":43.549,"bias":12.507,"targetHealthWeight":1.635,"targetDistWeight":0.008,"finishHp":21.611,"finishRemain":2.805,"finishMinDelta":40.537,"finishMaxDelta":34.619,"lowHp":34.742,"lowHpPad":49.91,"sweep":[0,50,100,150,200,250,300,350]});
  // mix in per-robot bias to desync patterns
  P.bias = (P.bias||0) + (12).toFixed ? 12 : (12||0);
  __state.tick=(__state.tick||0)+1;

  // 1) target selection: prioritize low HP then distance
  let tgt=null, best=1e9;
  for(const e of enemies){ const key = e.health*P.targetHealthWeight + e.distance*P.targetDistWeight; if(key<best){best=key; tgt=e;} }

  // 2) predictive aim with simple velocity smoothing
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last){
      const vx=(tgt.x-__state.last.x); const vy=(tgt.y-__state.last.y);
      let lvx=__state.lastVel?__state.lastVel.vx:0; let lvy=__state.lastVel?__state.lastVel.vy:0;
      const svx=lvx*0.5 + vx*0.5; const svy=lvy*0.5 + vy*0.5; __state.lastVel={vx:svx,vy:svy};
      const d=hypot(tgt.x-tank.x,tgt.y-tank.y); const tLead=clamp(d/8,0,P.leadCap);
      aimX = tgt.x + svx*P.leadWeight*tLead; aimY = tgt.y + svy*P.leadWeight*tLead;
    }
    // small deterministic jitter to break symmetry
    const jitter = ((((tank.x*31+tank.y*17)|0)%23)-11)*0.06*P.aimJitter;
    tank.fire(toDeg(aimX-tank.x,aimY-tank.y)+jitter);
    __state.last={x:tgt.x,y:tgt.y};
  }

  let tries=0; const go=(a)=>{tries++; return tank.move(norm(a));};

  // 3) bullet avoidance: respond to nearest projected approach inside radius
  let hot=null, md=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y); if(d<md && d<P.threatRadius){ md=d; hot=b; } } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); const side = P.threatFleeBias + P.bias*0.4; const cand=[a+90+side, a-90-side, a+120, a-120, a+70, a-70]; for(const c of cand){ if(go(c)) return; } }

  // 4) edge avoidance (map 900x600)
  if(tank.x < P.edgeMargin){ if(go(0)) return; } if(tank.x > 900-P.edgeMargin){ if(go(180)) return; } if(tank.y < P.edgeMargin){ if(go(90)) return; } if(tank.y > 600-P.edgeMargin){ if(go(270)) return; }

  // 5) ally separation
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.allySep){ const away=toDeg(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+26)) return; if(go(away-26)) return; }

  // 6) spacing + strafing with health-aware aggression
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y); const d=tgt.distance; let MIN=P.minRange, MAX=P.maxRange;
    if(tgt.health<=P.finishHp || enemies.length<=P.finishRemain) { MIN-=P.finishMinDelta; MAX-=P.finishMaxDelta; }
    if(tank.health< P.lowHp){ MIN+=P.lowHpPad; }
    if(d<MIN){ const away=to+180 + P.bias*0.4; if(go(away)) return; if(go(away+22)) return; if(go(away-22)) return; }
    else if(d>MAX){ if(go(to)) return; if(go(to+16)) return; if(go(to-16)) return; }
    else { const side = to + ((((__state.tick+tank.x+tank.y)|0)%2)?P.strafeAngle:-P.strafeAngle) + P.bias*0.5; if(go(side)) return; if(go(side+16)) return; if(go(side-16)) return; }
  }

  // 7) fallback sweeping
  for(const s of P.sweep){ if(go(s+P.bias)) return; }
}


// ===== 다음 로봇 =====

function name(){return "Nova-6-D3";}
function type(){return Type.DEALER;}
let __state={last:null, lastVel:null, tick:0};
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v; const hypot=Math.hypot;
  const P=Object.assign({}, {"leadCap":15.43,"leadWeight":1.1,"aimJitter":0.272,"minRange":239.647,"maxRange":380.053,"strafeAngle":35.657,"threatRadius":169.645,"threatFleeBias":15.759,"allySep":61.547,"edgeMargin":44.293,"bias":11.779,"targetHealthWeight":0.737,"targetDistWeight":0.128,"finishHp":22.488,"finishRemain":2.753,"finishMinDelta":39.538,"finishMaxDelta":34.396,"lowHp":35.177,"lowHpPad":50.633,"sweep":[0,50,100,150,200,250,300,350]});
  // mix in per-robot bias to desync patterns
  P.bias = (P.bias||0) + (2).toFixed ? 2 : (2||0);
  __state.tick=(__state.tick||0)+1;

  // 1) target selection: prioritize low HP then distance
  let tgt=null, best=1e9;
  for(const e of enemies){ const key = e.health*P.targetHealthWeight + e.distance*P.targetDistWeight; if(key<best){best=key; tgt=e;} }

  // 2) predictive aim with simple velocity smoothing
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last){
      const vx=(tgt.x-__state.last.x); const vy=(tgt.y-__state.last.y);
      let lvx=__state.lastVel?__state.lastVel.vx:0; let lvy=__state.lastVel?__state.lastVel.vy:0;
      const svx=lvx*0.5 + vx*0.5; const svy=lvy*0.5 + vy*0.5; __state.lastVel={vx:svx,vy:svy};
      const d=hypot(tgt.x-tank.x,tgt.y-tank.y); const tLead=clamp(d/8,0,P.leadCap);
      aimX = tgt.x + svx*P.leadWeight*tLead; aimY = tgt.y + svy*P.leadWeight*tLead;
    }
    // small deterministic jitter to break symmetry
    const jitter = ((((tank.x*31+tank.y*17)|0)%23)-11)*0.06*P.aimJitter;
    tank.fire(toDeg(aimX-tank.x,aimY-tank.y)+jitter);
    __state.last={x:tgt.x,y:tgt.y};
  }

  let tries=0; const go=(a)=>{tries++; return tank.move(norm(a));};

  // 3) bullet avoidance: respond to nearest projected approach inside radius
  let hot=null, md=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y); if(d<md && d<P.threatRadius){ md=d; hot=b; } } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); const side = P.threatFleeBias + P.bias*0.4; const cand=[a+90+side, a-90-side, a+120, a-120, a+70, a-70]; for(const c of cand){ if(go(c)) return; } }

  // 4) edge avoidance (map 900x600)
  if(tank.x < P.edgeMargin){ if(go(0)) return; } if(tank.x > 900-P.edgeMargin){ if(go(180)) return; } if(tank.y < P.edgeMargin){ if(go(90)) return; } if(tank.y > 600-P.edgeMargin){ if(go(270)) return; }

  // 5) ally separation
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.allySep){ const away=toDeg(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+26)) return; if(go(away-26)) return; }

  // 6) spacing + strafing with health-aware aggression
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y); const d=tgt.distance; let MIN=P.minRange, MAX=P.maxRange;
    if(tgt.health<=P.finishHp || enemies.length<=P.finishRemain) { MIN-=P.finishMinDelta; MAX-=P.finishMaxDelta; }
    if(tank.health< P.lowHp){ MIN+=P.lowHpPad; }
    if(d<MIN){ const away=to+180 + P.bias*0.4; if(go(away)) return; if(go(away+22)) return; if(go(away-22)) return; }
    else if(d>MAX){ if(go(to)) return; if(go(to+16)) return; if(go(to-16)) return; }
    else { const side = to + ((((__state.tick+tank.x+tank.y)|0)%2)?P.strafeAngle:-P.strafeAngle) + P.bias*0.5; if(go(side)) return; if(go(side+16)) return; if(go(side-16)) return; }
  }

  // 7) fallback sweeping
  for(const s of P.sweep){ if(go(s+P.bias)) return; }
}


// ===== 다음 로봇 =====

function name(){return "Nova-6-N1";}
function type(){return Type.NORMAL;}
let __state={last:null, lastVel:null, tick:0};
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v; const hypot=Math.hypot;
  const P=Object.assign({}, {"leadCap":14.484,"leadWeight":0.938,"aimJitter":0.162,"minRange":199.63,"maxRange":319.597,"strafeAngle":31.486,"threatRadius":164.652,"threatFleeBias":14.423,"allySep":62.159,"edgeMargin":46.582,"bias":-5.524,"targetHealthWeight":0.952,"targetDistWeight":0.1,"finishHp":22.376,"finishRemain":2.617,"finishMinDelta":36.21,"finishMaxDelta":27.928,"lowHp":39.581,"lowHpPad":40.662,"sweep":[0,60,120,180,240,300]});
  // mix in per-robot bias to desync patterns
  P.bias = (P.bias||0) + (-6).toFixed ? -6 : (-6||0);
  __state.tick=(__state.tick||0)+1;

  // 1) target selection: prioritize low HP then distance
  let tgt=null, best=1e9;
  for(const e of enemies){ const key = e.health*P.targetHealthWeight + e.distance*P.targetDistWeight; if(key<best){best=key; tgt=e;} }

  // 2) predictive aim with simple velocity smoothing
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last){
      const vx=(tgt.x-__state.last.x); const vy=(tgt.y-__state.last.y);
      let lvx=__state.lastVel?__state.lastVel.vx:0; let lvy=__state.lastVel?__state.lastVel.vy:0;
      const svx=lvx*0.5 + vx*0.5; const svy=lvy*0.5 + vy*0.5; __state.lastVel={vx:svx,vy:svy};
      const d=hypot(tgt.x-tank.x,tgt.y-tank.y); const tLead=clamp(d/8,0,P.leadCap);
      aimX = tgt.x + svx*P.leadWeight*tLead; aimY = tgt.y + svy*P.leadWeight*tLead;
    }
    // small deterministic jitter to break symmetry
    const jitter = ((((tank.x*31+tank.y*17)|0)%23)-11)*0.06*P.aimJitter;
    tank.fire(toDeg(aimX-tank.x,aimY-tank.y)+jitter);
    __state.last={x:tgt.x,y:tgt.y};
  }

  let tries=0; const go=(a)=>{tries++; return tank.move(norm(a));};

  // 3) bullet avoidance: respond to nearest projected approach inside radius
  let hot=null, md=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y); if(d<md && d<P.threatRadius){ md=d; hot=b; } } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); const side = P.threatFleeBias + P.bias*0.4; const cand=[a+90+side, a-90-side, a+120, a-120, a+70, a-70]; for(const c of cand){ if(go(c)) return; } }

  // 4) edge avoidance (map 900x600)
  if(tank.x < P.edgeMargin){ if(go(0)) return; } if(tank.x > 900-P.edgeMargin){ if(go(180)) return; } if(tank.y < P.edgeMargin){ if(go(90)) return; } if(tank.y > 600-P.edgeMargin){ if(go(270)) return; }

  // 5) ally separation
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.allySep){ const away=toDeg(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+26)) return; if(go(away-26)) return; }

  // 6) spacing + strafing with health-aware aggression
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y); const d=tgt.distance; let MIN=P.minRange, MAX=P.maxRange;
    if(tgt.health<=P.finishHp || enemies.length<=P.finishRemain) { MIN-=P.finishMinDelta; MAX-=P.finishMaxDelta; }
    if(tank.health< P.lowHp){ MIN+=P.lowHpPad; }
    if(d<MIN){ const away=to+180 + P.bias*0.4; if(go(away)) return; if(go(away+22)) return; if(go(away-22)) return; }
    else if(d>MAX){ if(go(to)) return; if(go(to+16)) return; if(go(to-16)) return; }
    else { const side = to + ((((__state.tick+tank.x+tank.y)|0)%2)?P.strafeAngle:-P.strafeAngle) + P.bias*0.5; if(go(side)) return; if(go(side+16)) return; if(go(side-16)) return; }
  }

  // 7) fallback sweeping
  for(const s of P.sweep){ if(go(s+P.bias)) return; }
}

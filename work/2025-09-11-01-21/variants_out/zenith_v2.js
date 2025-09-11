function name(){return "ZenithX-T1";}
function type(){return Type.TANKER;}
function update(tank,enemies,allies,bulletInfo){
  const D=(x,y)=>Math.atan2(y,x)*180/Math.PI; const N=(a)=>{a%=360;return a<0?a+360:a;}; const C=(v,l,h)=>v<l?l:v>h?h:v; const H=(dx,dy)=>Math.hypot(dx,dy);
  const P={"minR":160,"maxR":280,"strafe":30,"threat":84,"thTime":16,"sep":66,"edge":46,"bias":-16,"leadCap":10,"leadW":0.9,"hW":1.45,"dW":0.13,"finN":30,"finX":20,"lastN":36,"lastX":36,"minCap":150,"finH":24,"jA":28,"jB":22,"jM":23,"jH":10,"jF":0.09};
  // Per-bot state
  if(!update.__S) update.__S={}; const key='k'; const S=(update.__S[key] ||= {ex:0,ey:0,t:0});

  // Select target: weighted by low health and proximity
  let T=null, sc=1e12; for(const e of enemies){ const s = e.health*P.hW + e.distance*P.dW + (e.health < 20 ? P.lowH : 0); if(s<sc){sc=s; T=e;} }

  // Fire with leading and micro jitter
  if(T){ let ax=T.x, ay=T.y; if(S.t>0){ const vx=T.x-S.ex, vy=T.y-S.ey; const d=H(T.x-tank.x,T.y-tank.y); const t=C(d/8,0,P.leadCap); ax=T.x+vx*P.leadW*t; ay=T.y+vy*P.leadW*t; }
    const j=((tank.x*P.jA+tank.y*P.jB)%(P.jM)-P.jH)*P.jF; tank.fire(D(ax-tank.x,ay-tank.y)+j); S.ex=T.x; S.ey=T.y; S.t++; }

  // Desired engagement range by type (adaptive)
  let MIN=P.minR, MAX=P.maxR; if(T){
    const aN = allies.length, eN = enemies.length;
    let push = 0; if (aN > eN) push += (P.advPush||0); if (eN <= 2) push += (P.endPush||0);
    if(T.health<P.finH){ MIN-=P.finN; MAX-=P.finX; push += (P.finPush||0); }
    MIN -= push; MAX -= push; MIN=Math.max(MIN,P.minCap);
  }

  // Movement executor with retries (engine limits internally)
  const GO=(a)=>tank.move(N(a));

  // Bullet avoidance: predict closest approach and sidestep
  let threat=null, md=1e12; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=H(px-tank.x,py-tank.y); const t=proj/v; if(d<md && d<P.threat && t<P.thTime){ md=d; threat=b; } } }
  if(threat){ const a=D(threat.vx,threat.vy); const k=(tank.x*13+tank.y*7)%2?1:-1; for(const off of [90+P.bias*k, -90-P.bias*k, 120, -120]){ if(GO(a+off)) return; } }

  // Arena bounds push-back
  if(tank.x<P.edge){ if(GO(0)) return; } if(tank.x>900-P.edge){ if(GO(180)) return; } if(tank.y<P.edge){ if(GO(90)) return; } if(tank.y>600-P.edge){ if(GO(270)) return; }

  // Ally separation
  let nearestA=null, ad=1e12; for(const a of allies){ if(a.distance<ad){ ad=a.distance; nearestA=a; } } if(nearestA && ad<P.sep){ const aw=D(tank.x-nearestA.x,tank.y-nearestA.y); if(GO(aw)) return; if(GO(aw+25)) return; if(GO(aw-25)) return; }

  // Engage target: approach/retreat/strafing
  if(T){ const to=D(T.x-tank.x,T.y-tank.y), d=T.distance; if(d<MIN){ const aw=to+180+P.bias*0.5; if(GO(aw)) return; if(GO(aw+22)) return; if(GO(aw-22)) return; }
    else if(d>MAX){ if(GO(to)) return; if(GO(to+14)) return; if(GO(to-14)) return; }
    else { const side=to+(((tank.x*17+tank.y*11)%2)?P.strafe:-P.strafe)+P.bias*0.35; if(GO(side)) return; if(GO(side+14)) return; if(GO(side-14)) return; } }

  // Fallback search pattern
  for(const s of [0,60,120,180,240,300]){ if(GO(s+P.bias)) return; }
}


// ===== 다음 로봇 =====

function name(){return "ZenithX-D1";}
function type(){return Type.DEALER;}
function update(tank,enemies,allies,bulletInfo){
  const D=(x,y)=>Math.atan2(y,x)*180/Math.PI; const N=(a)=>{a%=360;return a<0?a+360:a;}; const C=(v,l,h)=>v<l?l:v>h?h:v; const H=(dx,dy)=>Math.hypot(dx,dy);
  const P={"minR":270,"maxR":420,"strafe":48,"threat":92,"thTime":22,"sep":60,"edge":48,"bias":-12,"leadCap":13,"leadW":1.05,"hW":1.7,"dW":0.09,"finN":28,"finX":20,"lastN":34,"lastX":34,"minCap":190,"finH":22,"jA":35,"jB":27,"jM":24,"jH":11,"jF":0.11};
  // Per-bot state
  if(!update.__S) update.__S={}; const key='k'; const S=(update.__S[key] ||= {ex:0,ey:0,t:0});

  // Select target: weighted by low health and proximity
  let T=null, sc=1e12; for(const e of enemies){ const s = e.health*P.hW + e.distance*P.dW + (e.health < 20 ? P.lowH : 0); if(s<sc){sc=s; T=e;} }

  // Fire with leading and micro jitter
  if(T){ let ax=T.x, ay=T.y; if(S.t>0){ const vx=T.x-S.ex, vy=T.y-S.ey; const d=H(T.x-tank.x,T.y-tank.y); const t=C(d/8,0,P.leadCap); ax=T.x+vx*P.leadW*t; ay=T.y+vy*P.leadW*t; }
    const j=((tank.x*P.jA+tank.y*P.jB)%(P.jM)-P.jH)*P.jF; tank.fire(D(ax-tank.x,ay-tank.y)+j); S.ex=T.x; S.ey=T.y; S.t++; }

  // Desired engagement range by type (adaptive)
  let MIN=P.minR, MAX=P.maxR; if(T){
    const aN = allies.length, eN = enemies.length;
    let push = 0; if (aN > eN) push += (P.advPush||0); if (eN <= 2) push += (P.endPush||0);
    if(T.health<P.finH){ MIN-=P.finN; MAX-=P.finX; push += (P.finPush||0); }
    MIN -= push; MAX -= push; MIN=Math.max(MIN,P.minCap);
  }

  // Movement executor with retries (engine limits internally)
  const GO=(a)=>tank.move(N(a));

  // Bullet avoidance: predict closest approach and sidestep
  let threat=null, md=1e12; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=H(px-tank.x,py-tank.y); const t=proj/v; if(d<md && d<P.threat && t<P.thTime){ md=d; threat=b; } } }
  if(threat){ const a=D(threat.vx,threat.vy); const k=(tank.x*13+tank.y*7)%2?1:-1; for(const off of [90+P.bias*k, -90-P.bias*k, 120, -120]){ if(GO(a+off)) return; } }

  // Arena bounds push-back
  if(tank.x<P.edge){ if(GO(0)) return; } if(tank.x>900-P.edge){ if(GO(180)) return; } if(tank.y<P.edge){ if(GO(90)) return; } if(tank.y>600-P.edge){ if(GO(270)) return; }

  // Ally separation
  let nearestA=null, ad=1e12; for(const a of allies){ if(a.distance<ad){ ad=a.distance; nearestA=a; } } if(nearestA && ad<P.sep){ const aw=D(tank.x-nearestA.x,tank.y-nearestA.y); if(GO(aw)) return; if(GO(aw+25)) return; if(GO(aw-25)) return; }

  // Engage target: approach/retreat/strafing
  if(T){ const to=D(T.x-tank.x,T.y-tank.y), d=T.distance; if(d<MIN){ const aw=to+180+P.bias*0.5; if(GO(aw)) return; if(GO(aw+22)) return; if(GO(aw-22)) return; }
    else if(d>MAX){ if(GO(to)) return; if(GO(to+14)) return; if(GO(to-14)) return; }
    else { const side=to+(((tank.x*17+tank.y*11)%2)?P.strafe:-P.strafe)+P.bias*0.35; if(GO(side)) return; if(GO(side+14)) return; if(GO(side-14)) return; } }

  // Fallback search pattern
  for(const s of [0,60,120,180,240,300]){ if(GO(s+P.bias)) return; }
}


// ===== 다음 로봇 =====

function name(){return "ZenithX-N1";}
function type(){return Type.NORMAL;}
function update(tank,enemies,allies,bulletInfo){
  const D=(x,y)=>Math.atan2(y,x)*180/Math.PI; const N=(a)=>{a%=360;return a<0?a+360:a;}; const C=(v,l,h)=>v<l?l:v>h?h:v; const H=(dx,dy)=>Math.hypot(dx,dy);
  const P={"minR":210,"maxR":330,"strafe":36,"threat":88,"thTime":18,"sep":64,"edge":46,"bias":-4,"leadCap":12,"leadW":1,"hW":1.6,"dW":0.11,"finN":28,"finX":18,"lastN":34,"lastX":34,"minCap":165,"finH":22,"jA":42,"jB":32,"jM":25,"jH":12,"jF":0.13};
  // Per-bot state
  if(!update.__S) update.__S={}; const key='k'; const S=(update.__S[key] ||= {ex:0,ey:0,t:0});

  // Select target: weighted by low health and proximity
  let T=null, sc=1e12; for(const e of enemies){ const s = e.health*P.hW + e.distance*P.dW + (e.health < 20 ? P.lowH : 0); if(s<sc){sc=s; T=e;} }

  // Fire with leading and micro jitter
  if(T){ let ax=T.x, ay=T.y; if(S.t>0){ const vx=T.x-S.ex, vy=T.y-S.ey; const d=H(T.x-tank.x,T.y-tank.y); const t=C(d/8,0,P.leadCap); ax=T.x+vx*P.leadW*t; ay=T.y+vy*P.leadW*t; }
    const j=((tank.x*P.jA+tank.y*P.jB)%(P.jM)-P.jH)*P.jF; tank.fire(D(ax-tank.x,ay-tank.y)+j); S.ex=T.x; S.ey=T.y; S.t++; }

  // Desired engagement range by type (adaptive)
  let MIN=P.minR, MAX=P.maxR; if(T){
    const aN = allies.length, eN = enemies.length;
    let push = 0; if (aN > eN) push += (P.advPush||0); if (eN <= 2) push += (P.endPush||0);
    if(T.health<P.finH){ MIN-=P.finN; MAX-=P.finX; push += (P.finPush||0); }
    MIN -= push; MAX -= push; MIN=Math.max(MIN,P.minCap);
  }

  // Movement executor with retries (engine limits internally)
  const GO=(a)=>tank.move(N(a));

  // Bullet avoidance: predict closest approach and sidestep
  let threat=null, md=1e12; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=H(px-tank.x,py-tank.y); const t=proj/v; if(d<md && d<P.threat && t<P.thTime){ md=d; threat=b; } } }
  if(threat){ const a=D(threat.vx,threat.vy); const k=(tank.x*13+tank.y*7)%2?1:-1; for(const off of [90+P.bias*k, -90-P.bias*k, 120, -120]){ if(GO(a+off)) return; } }

  // Arena bounds push-back
  if(tank.x<P.edge){ if(GO(0)) return; } if(tank.x>900-P.edge){ if(GO(180)) return; } if(tank.y<P.edge){ if(GO(90)) return; } if(tank.y>600-P.edge){ if(GO(270)) return; }

  // Ally separation
  let nearestA=null, ad=1e12; for(const a of allies){ if(a.distance<ad){ ad=a.distance; nearestA=a; } } if(nearestA && ad<P.sep){ const aw=D(tank.x-nearestA.x,tank.y-nearestA.y); if(GO(aw)) return; if(GO(aw+25)) return; if(GO(aw-25)) return; }

  // Engage target: approach/retreat/strafing
  if(T){ const to=D(T.x-tank.x,T.y-tank.y), d=T.distance; if(d<MIN){ const aw=to+180+P.bias*0.5; if(GO(aw)) return; if(GO(aw+22)) return; if(GO(aw-22)) return; }
    else if(d>MAX){ if(GO(to)) return; if(GO(to+14)) return; if(GO(to-14)) return; }
    else { const side=to+(((tank.x*17+tank.y*11)%2)?P.strafe:-P.strafe)+P.bias*0.35; if(GO(side)) return; if(GO(side+14)) return; if(GO(side-14)) return; } }

  // Fallback search pattern
  for(const s of [0,60,120,180,240,300]){ if(GO(s+P.bias)) return; }
}


// ===== 다음 로봇 =====

function name(){return "ZenithX-N2";}
function type(){return Type.NORMAL;}
function update(tank,enemies,allies,bulletInfo){
  const D=(x,y)=>Math.atan2(y,x)*180/Math.PI; const N=(a)=>{a%=360;return a<0?a+360:a;}; const C=(v,l,h)=>v<l?l:v>h?h:v; const H=(dx,dy)=>Math.hypot(dx,dy);
  const P={"minR":210,"maxR":330,"strafe":36,"threat":88,"thTime":18,"sep":64,"edge":46,"bias":4,"leadCap":12,"leadW":1,"hW":1.6,"dW":0.11,"finN":28,"finX":18,"lastN":34,"lastX":34,"minCap":165,"finH":22,"jA":49,"jB":37,"jM":26,"jH":13,"jF":0.09};
  // Per-bot state
  if(!update.__S) update.__S={}; const key='k'; const S=(update.__S[key] ||= {ex:0,ey:0,t:0});

  // Select target: weighted by low health and proximity
  let T=null, sc=1e12; for(const e of enemies){ const s = e.health*P.hW + e.distance*P.dW + (e.health < 20 ? P.lowH : 0); if(s<sc){sc=s; T=e;} }

  // Fire with leading and micro jitter
  if(T){ let ax=T.x, ay=T.y; if(S.t>0){ const vx=T.x-S.ex, vy=T.y-S.ey; const d=H(T.x-tank.x,T.y-tank.y); const t=C(d/8,0,P.leadCap); ax=T.x+vx*P.leadW*t; ay=T.y+vy*P.leadW*t; }
    const j=((tank.x*P.jA+tank.y*P.jB)%(P.jM)-P.jH)*P.jF; tank.fire(D(ax-tank.x,ay-tank.y)+j); S.ex=T.x; S.ey=T.y; S.t++; }

  // Desired engagement range by type (adaptive)
  let MIN=P.minR, MAX=P.maxR; if(T){
    const aN = allies.length, eN = enemies.length;
    let push = 0; if (aN > eN) push += (P.advPush||0); if (eN <= 2) push += (P.endPush||0);
    if(T.health<P.finH){ MIN-=P.finN; MAX-=P.finX; push += (P.finPush||0); }
    MIN -= push; MAX -= push; MIN=Math.max(MIN,P.minCap);
  }

  // Movement executor with retries (engine limits internally)
  const GO=(a)=>tank.move(N(a));

  // Bullet avoidance: predict closest approach and sidestep
  let threat=null, md=1e12; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=H(px-tank.x,py-tank.y); const t=proj/v; if(d<md && d<P.threat && t<P.thTime){ md=d; threat=b; } } }
  if(threat){ const a=D(threat.vx,threat.vy); const k=(tank.x*13+tank.y*7)%2?1:-1; for(const off of [90+P.bias*k, -90-P.bias*k, 120, -120]){ if(GO(a+off)) return; } }

  // Arena bounds push-back
  if(tank.x<P.edge){ if(GO(0)) return; } if(tank.x>900-P.edge){ if(GO(180)) return; } if(tank.y<P.edge){ if(GO(90)) return; } if(tank.y>600-P.edge){ if(GO(270)) return; }

  // Ally separation
  let nearestA=null, ad=1e12; for(const a of allies){ if(a.distance<ad){ ad=a.distance; nearestA=a; } } if(nearestA && ad<P.sep){ const aw=D(tank.x-nearestA.x,tank.y-nearestA.y); if(GO(aw)) return; if(GO(aw+25)) return; if(GO(aw-25)) return; }

  // Engage target: approach/retreat/strafing
  if(T){ const to=D(T.x-tank.x,T.y-tank.y), d=T.distance; if(d<MIN){ const aw=to+180+P.bias*0.5; if(GO(aw)) return; if(GO(aw+22)) return; if(GO(aw-22)) return; }
    else if(d>MAX){ if(GO(to)) return; if(GO(to+14)) return; if(GO(to-14)) return; }
    else { const side=to+(((tank.x*17+tank.y*11)%2)?P.strafe:-P.strafe)+P.bias*0.35; if(GO(side)) return; if(GO(side+14)) return; if(GO(side-14)) return; } }

  // Fallback search pattern
  for(const s of [0,60,120,180,240,300]){ if(GO(s+P.bias)) return; }
}


// ===== 다음 로봇 =====

function name(){return "ZenithX-D2";}
function type(){return Type.DEALER;}
function update(tank,enemies,allies,bulletInfo){
  const D=(x,y)=>Math.atan2(y,x)*180/Math.PI; const N=(a)=>{a%=360;return a<0?a+360:a;}; const C=(v,l,h)=>v<l?l:v>h?h:v; const H=(dx,dy)=>Math.hypot(dx,dy);
  const P={"minR":270,"maxR":420,"strafe":48,"threat":92,"thTime":22,"sep":60,"edge":48,"bias":12,"leadCap":13,"leadW":1.05,"hW":1.7,"dW":0.09,"finN":28,"finX":20,"lastN":34,"lastX":34,"minCap":190,"finH":22,"jA":15,"jB":42,"jM":27,"jH":14,"jF":0.11};
  // Per-bot state
  if(!update.__S) update.__S={}; const key='k'; const S=(update.__S[key] ||= {ex:0,ey:0,t:0});

  // Select target: weighted by low health and proximity
  let T=null, sc=1e12; for(const e of enemies){ const s = e.health*P.hW + e.distance*P.dW + (e.health < 20 ? P.lowH : 0); if(s<sc){sc=s; T=e;} }

  // Fire with leading and micro jitter
  if(T){ let ax=T.x, ay=T.y; if(S.t>0){ const vx=T.x-S.ex, vy=T.y-S.ey; const d=H(T.x-tank.x,T.y-tank.y); const t=C(d/8,0,P.leadCap); ax=T.x+vx*P.leadW*t; ay=T.y+vy*P.leadW*t; }
    const j=((tank.x*P.jA+tank.y*P.jB)%(P.jM)-P.jH)*P.jF; tank.fire(D(ax-tank.x,ay-tank.y)+j); S.ex=T.x; S.ey=T.y; S.t++; }

  // Desired engagement range by type (adaptive)
  let MIN=P.minR, MAX=P.maxR; if(T){
    const aN = allies.length, eN = enemies.length;
    let push = 0; if (aN > eN) push += (P.advPush||0); if (eN <= 2) push += (P.endPush||0);
    if(T.health<P.finH){ MIN-=P.finN; MAX-=P.finX; push += (P.finPush||0); }
    MIN -= push; MAX -= push; MIN=Math.max(MIN,P.minCap);
  }

  // Movement executor with retries (engine limits internally)
  const GO=(a)=>tank.move(N(a));

  // Bullet avoidance: predict closest approach and sidestep
  let threat=null, md=1e12; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=H(px-tank.x,py-tank.y); const t=proj/v; if(d<md && d<P.threat && t<P.thTime){ md=d; threat=b; } } }
  if(threat){ const a=D(threat.vx,threat.vy); const k=(tank.x*13+tank.y*7)%2?1:-1; for(const off of [90+P.bias*k, -90-P.bias*k, 120, -120]){ if(GO(a+off)) return; } }

  // Arena bounds push-back
  if(tank.x<P.edge){ if(GO(0)) return; } if(tank.x>900-P.edge){ if(GO(180)) return; } if(tank.y<P.edge){ if(GO(90)) return; } if(tank.y>600-P.edge){ if(GO(270)) return; }

  // Ally separation
  let nearestA=null, ad=1e12; for(const a of allies){ if(a.distance<ad){ ad=a.distance; nearestA=a; } } if(nearestA && ad<P.sep){ const aw=D(tank.x-nearestA.x,tank.y-nearestA.y); if(GO(aw)) return; if(GO(aw+25)) return; if(GO(aw-25)) return; }

  // Engage target: approach/retreat/strafing
  if(T){ const to=D(T.x-tank.x,T.y-tank.y), d=T.distance; if(d<MIN){ const aw=to+180+P.bias*0.5; if(GO(aw)) return; if(GO(aw+22)) return; if(GO(aw-22)) return; }
    else if(d>MAX){ if(GO(to)) return; if(GO(to+14)) return; if(GO(to-14)) return; }
    else { const side=to+(((tank.x*17+tank.y*11)%2)?P.strafe:-P.strafe)+P.bias*0.35; if(GO(side)) return; if(GO(side+14)) return; if(GO(side-14)) return; } }

  // Fallback search pattern
  for(const s of [0,60,120,180,240,300]){ if(GO(s+P.bias)) return; }
}


// ===== 다음 로봇 =====

function name(){return "ZenithX-T2";}
function type(){return Type.TANKER;}
function update(tank,enemies,allies,bulletInfo){
  const D=(x,y)=>Math.atan2(y,x)*180/Math.PI; const N=(a)=>{a%=360;return a<0?a+360:a;}; const C=(v,l,h)=>v<l?l:v>h?h:v; const H=(dx,dy)=>Math.hypot(dx,dy);
  const P={"minR":160,"maxR":280,"strafe":30,"threat":84,"thTime":16,"sep":66,"edge":46,"bias":16,"leadCap":10,"leadW":0.9,"hW":1.45,"dW":0.13,"finN":30,"finX":20,"lastN":36,"lastX":36,"minCap":150,"finH":24,"jA":22,"jB":10,"jM":28,"jH":10,"jF":0.13};
  // Per-bot state
  if(!update.__S) update.__S={}; const key='k'; const S=(update.__S[key] ||= {ex:0,ey:0,t:0});

  // Select target: weighted by low health and proximity
  let T=null, sc=1e12; for(const e of enemies){ const s = e.health*P.hW + e.distance*P.dW + (e.health < 20 ? P.lowH : 0); if(s<sc){sc=s; T=e;} }

  // Fire with leading and micro jitter
  if(T){ let ax=T.x, ay=T.y; if(S.t>0){ const vx=T.x-S.ex, vy=T.y-S.ey; const d=H(T.x-tank.x,T.y-tank.y); const t=C(d/8,0,P.leadCap); ax=T.x+vx*P.leadW*t; ay=T.y+vy*P.leadW*t; }
    const j=((tank.x*P.jA+tank.y*P.jB)%(P.jM)-P.jH)*P.jF; tank.fire(D(ax-tank.x,ay-tank.y)+j); S.ex=T.x; S.ey=T.y; S.t++; }

  // Desired engagement range by type (adaptive)
  let MIN=P.minR, MAX=P.maxR; if(T){
    const aN = allies.length, eN = enemies.length;
    let push = 0; if (aN > eN) push += (P.advPush||0); if (eN <= 2) push += (P.endPush||0);
    if(T.health<P.finH){ MIN-=P.finN; MAX-=P.finX; push += (P.finPush||0); }
    MIN -= push; MAX -= push; MIN=Math.max(MIN,P.minCap);
  }

  // Movement executor with retries (engine limits internally)
  const GO=(a)=>tank.move(N(a));

  // Bullet avoidance: predict closest approach and sidestep
  let threat=null, md=1e12; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=H(px-tank.x,py-tank.y); const t=proj/v; if(d<md && d<P.threat && t<P.thTime){ md=d; threat=b; } } }
  if(threat){ const a=D(threat.vx,threat.vy); const k=(tank.x*13+tank.y*7)%2?1:-1; for(const off of [90+P.bias*k, -90-P.bias*k, 120, -120]){ if(GO(a+off)) return; } }

  // Arena bounds push-back
  if(tank.x<P.edge){ if(GO(0)) return; } if(tank.x>900-P.edge){ if(GO(180)) return; } if(tank.y<P.edge){ if(GO(90)) return; } if(tank.y>600-P.edge){ if(GO(270)) return; }

  // Ally separation
  let nearestA=null, ad=1e12; for(const a of allies){ if(a.distance<ad){ ad=a.distance; nearestA=a; } } if(nearestA && ad<P.sep){ const aw=D(tank.x-nearestA.x,tank.y-nearestA.y); if(GO(aw)) return; if(GO(aw+25)) return; if(GO(aw-25)) return; }

  // Engage target: approach/retreat/strafing
  if(T){ const to=D(T.x-tank.x,T.y-tank.y), d=T.distance; if(d<MIN){ const aw=to+180+P.bias*0.5; if(GO(aw)) return; if(GO(aw+22)) return; if(GO(aw-22)) return; }
    else if(d>MAX){ if(GO(to)) return; if(GO(to+14)) return; if(GO(to-14)) return; }
    else { const side=to+(((tank.x*17+tank.y*11)%2)?P.strafe:-P.strafe)+P.bias*0.35; if(GO(side)) return; if(GO(side+14)) return; if(GO(side-14)) return; } }

  // Fallback search pattern
  for(const s of [0,60,120,180,240,300]){ if(GO(s+P.bias)) return; }
}

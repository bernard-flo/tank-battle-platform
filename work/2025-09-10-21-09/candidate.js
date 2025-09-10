function name(){return "NovaE-T1";}
function type(){return Type.TANKER;}
let __S_0={last:null,tick:0,lastVel:null,side: ((0*17)%2?1:-1)};
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI; const N=(a)=>{a%=360; return a<0?a+360:a;}; const C=(v,l,h)=>v<l?l:v>h?h:v;
  const P={"minR":190,"maxR":310,"strafe":36,"threat":85,"sep":66,"edge":46,"bias":-12,"jA":31,"jB":17,"jM":29,"jH":14,"jF":0.14,"leadCap":11,"leadW":0.92,"hW":1.55,"dW":0.11,"finN":28,"finX":18,"lastN":34,"lastX":34,"minCap":160}; const S=__S_0; S.tick=(S.tick||0)+1;
  // 1) Target selection (health priority, distance tie)
  let T=null, sc=1e18; for(const e of enemies){ const s=e.health*P.hW + e.distance*P.dW; if(s<sc){sc=s; T=e;} }
  // 2) Predictive aim using quadratic intercept (fallback to linear lead)
  if(T){ let ax=T.x, ay=T.y; let vx=0, vy=0; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0; const ivx=(T.x-S.last.x), ivy=(T.y-S.last.y); vx=lvx*0.5+ivx*0.5; vy=lvy*0.5+ivy*0.5; S.lastVel={vx,vy}; const rx=T.x-tank.x, ry=T.y-tank.y; const s2=64; const aa=vx*vx+vy*vy-s2; const bb=2*(rx*vx+ry*vy); const cc=rx*rx+ry*ry; let tHit=0; if(Math.abs(aa)<1e-6){ tHit = bb!==0 ? C(-cc/bb,0,P.leadCap) : 0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc); const t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); const tc=(t1>0&&t2>0)?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); tHit=C(tc,0,P.leadCap); } else { const d=H(rx,ry); tHit=C(d/8,0,P.leadCap); } } ax=T.x+vx*P.leadW*tHit; ay=T.y+vy*P.leadW*tHit; } const jit=(((S.tick*13 + tank.x*7 + tank.y*3 + 0*11)%23)-11)*(P.jF||0.1) + (P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y)+jit); S.last={x:T.x,y:T.y}; }
  // 3) Bullet avoidance with time weighting
  let Ht=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v; const pj=dx*nx+dy*ny; if(pj>0){ const px=b.x-pj*nx, py=b.y-pj*ny; const dist=H(px-tank.x,py-tank.y); const tt=pj/v; const s=dist + tt*(P.threatH||4); if(dist<P.threat && s<score){ score=s; Ht=b; } } }
  let moved=0; const GO=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  if(Ht){ const a=D(Ht.vx,Ht.vy); const side=(S.side||1)*(P.fleeBias||16) + (P.bias||0)*0.4; for(const c of [a+90+side, a-90-side, a+120, a-120, a+70, a-70]){ if(GO(c)) return; } }
  // 4) Edges
  if(tank.x<P.edge){ if(GO(0)) return; } if(tank.x>900-P.edge){ if(GO(180)) return; } if(tank.y<P.edge){ if(GO(90)) return; } if(tank.y>600-P.edge){ if(GO(270)) return; }
  // 5) Ally separation
  let A=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; A=a; } } if(A && ad<P.sep){ const aw=D(tank.x-A.x,tank.y-A.y); if(GO(aw)) return; if(GO(aw+18)) return; if(GO(aw-18)) return; }
  // 6) Range + strafing
  if(T){ const to=D(T.x-tank.x,T.y-tank.y), d=T.distance; let r0=P.minR, r1=P.maxR; if((T.health<=(P.finHP||24))||enemies.length<=P.lastN2){ r0=Math.max(P.minCap||140, r0-(P.aggrIn||30)); r1=Math.max((P.minCap||140)+40, r1-(P.aggrOut||20)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(GO(aw)) return; if(GO(aw+16)) return; if(GO(aw-16)) return; } else if(d>r1){ if(GO(to)) return; if(GO(to+14)) return; if(GO(to-14)) return; } else { const s=to + ((S.side||1)*(P.strafe||30)) + (P.bias||0)*0.5; if(GO(s)) return; if(GO(s+16)) return; if(GO(s-16)) return; } }
  for(const s of [0,60,120,180,240,300]){ if(GO(s+(P.bias||0))) return; }
}

// ===== 다음 로봇 =====

function name(){return "NovaE-T2";}
function type(){return Type.TANKER;}
let __S_1={last:null,tick:0,lastVel:null,side: ((1*17)%2?1:-1)};
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI; const N=(a)=>{a%=360; return a<0?a+360:a;}; const C=(v,l,h)=>v<l?l:v>h?h:v;
  const P={"minR":190,"maxR":310,"strafe":36,"threat":85,"sep":66,"edge":46,"bias":-12,"jA":31,"jB":17,"jM":29,"jH":14,"jF":0.14,"leadCap":11,"leadW":0.92,"hW":1.55,"dW":0.11,"finN":28,"finX":18,"lastN":34,"lastX":34,"minCap":160}; const S=__S_1; S.tick=(S.tick||0)+1;
  // 1) Target selection (health priority, distance tie)
  let T=null, sc=1e18; for(const e of enemies){ const s=e.health*P.hW + e.distance*P.dW; if(s<sc){sc=s; T=e;} }
  // 2) Predictive aim using quadratic intercept (fallback to linear lead)
  if(T){ let ax=T.x, ay=T.y; let vx=0, vy=0; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0; const ivx=(T.x-S.last.x), ivy=(T.y-S.last.y); vx=lvx*0.5+ivx*0.5; vy=lvy*0.5+ivy*0.5; S.lastVel={vx,vy}; const rx=T.x-tank.x, ry=T.y-tank.y; const s2=64; const aa=vx*vx+vy*vy-s2; const bb=2*(rx*vx+ry*vy); const cc=rx*rx+ry*ry; let tHit=0; if(Math.abs(aa)<1e-6){ tHit = bb!==0 ? C(-cc/bb,0,P.leadCap) : 0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc); const t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); const tc=(t1>0&&t2>0)?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); tHit=C(tc,0,P.leadCap); } else { const d=H(rx,ry); tHit=C(d/8,0,P.leadCap); } } ax=T.x+vx*P.leadW*tHit; ay=T.y+vy*P.leadW*tHit; } const jit=(((S.tick*13 + tank.x*7 + tank.y*3 + 1*11)%23)-11)*(P.jF||0.1) + (P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y)+jit); S.last={x:T.x,y:T.y}; }
  // 3) Bullet avoidance with time weighting
  let Ht=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v; const pj=dx*nx+dy*ny; if(pj>0){ const px=b.x-pj*nx, py=b.y-pj*ny; const dist=H(px-tank.x,py-tank.y); const tt=pj/v; const s=dist + tt*(P.threatH||4); if(dist<P.threat && s<score){ score=s; Ht=b; } } }
  let moved=0; const GO=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  if(Ht){ const a=D(Ht.vx,Ht.vy); const side=(S.side||1)*(P.fleeBias||16) + (P.bias||0)*0.4; for(const c of [a+90+side, a-90-side, a+120, a-120, a+70, a-70]){ if(GO(c)) return; } }
  // 4) Edges
  if(tank.x<P.edge){ if(GO(0)) return; } if(tank.x>900-P.edge){ if(GO(180)) return; } if(tank.y<P.edge){ if(GO(90)) return; } if(tank.y>600-P.edge){ if(GO(270)) return; }
  // 5) Ally separation
  let A=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; A=a; } } if(A && ad<P.sep){ const aw=D(tank.x-A.x,tank.y-A.y); if(GO(aw)) return; if(GO(aw+18)) return; if(GO(aw-18)) return; }
  // 6) Range + strafing
  if(T){ const to=D(T.x-tank.x,T.y-tank.y), d=T.distance; let r0=P.minR, r1=P.maxR; if((T.health<=(P.finHP||24))||enemies.length<=P.lastN2){ r0=Math.max(P.minCap||140, r0-(P.aggrIn||30)); r1=Math.max((P.minCap||140)+40, r1-(P.aggrOut||20)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(GO(aw)) return; if(GO(aw+16)) return; if(GO(aw-16)) return; } else if(d>r1){ if(GO(to)) return; if(GO(to+14)) return; if(GO(to-14)) return; } else { const s=to + ((S.side||1)*(P.strafe||30)) + (P.bias||0)*0.5; if(GO(s)) return; if(GO(s+16)) return; if(GO(s-16)) return; } }
  for(const s of [0,60,120,180,240,300]){ if(GO(s+(P.bias||0))) return; }
}

// ===== 다음 로봇 =====

function name(){return "NovaE-D1";}
function type(){return Type.DEALER;}
let __S_2={last:null,tick:0,lastVel:null,side: ((2*17)%2?1:-1)};
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI; const N=(a)=>{a%=360; return a<0?a+360:a;}; const C=(v,l,h)=>v<l?l:v>h?h:v;
  const P={"minR":260,"maxR":380,"strafe":40,"threat":88,"sep":62,"edge":46,"bias":-14,"jA":17,"jB":13,"jM":25,"jH":12,"jF":0.11,"leadCap":12,"leadW":1,"hW":1.6,"dW":0.09,"finN":26,"finX":18,"lastN":32,"lastX":32,"minCap":180}; const S=__S_2; S.tick=(S.tick||0)+1;
  // 1) Target selection (health priority, distance tie)
  let T=null, sc=1e18; for(const e of enemies){ const s=e.health*P.hW + e.distance*P.dW; if(s<sc){sc=s; T=e;} }
  // 2) Predictive aim using quadratic intercept (fallback to linear lead)
  if(T){ let ax=T.x, ay=T.y; let vx=0, vy=0; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0; const ivx=(T.x-S.last.x), ivy=(T.y-S.last.y); vx=lvx*0.5+ivx*0.5; vy=lvy*0.5+ivy*0.5; S.lastVel={vx,vy}; const rx=T.x-tank.x, ry=T.y-tank.y; const s2=64; const aa=vx*vx+vy*vy-s2; const bb=2*(rx*vx+ry*vy); const cc=rx*rx+ry*ry; let tHit=0; if(Math.abs(aa)<1e-6){ tHit = bb!==0 ? C(-cc/bb,0,P.leadCap) : 0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc); const t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); const tc=(t1>0&&t2>0)?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); tHit=C(tc,0,P.leadCap); } else { const d=H(rx,ry); tHit=C(d/8,0,P.leadCap); } } ax=T.x+vx*P.leadW*tHit; ay=T.y+vy*P.leadW*tHit; } const jit=(((S.tick*13 + tank.x*7 + tank.y*3 + 2*11)%23)-11)*(P.jF||0.1) + (P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y)+jit); S.last={x:T.x,y:T.y}; }
  // 3) Bullet avoidance with time weighting
  let Ht=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v; const pj=dx*nx+dy*ny; if(pj>0){ const px=b.x-pj*nx, py=b.y-pj*ny; const dist=H(px-tank.x,py-tank.y); const tt=pj/v; const s=dist + tt*(P.threatH||4); if(dist<P.threat && s<score){ score=s; Ht=b; } } }
  let moved=0; const GO=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  if(Ht){ const a=D(Ht.vx,Ht.vy); const side=(S.side||1)*(P.fleeBias||16) + (P.bias||0)*0.4; for(const c of [a+90+side, a-90-side, a+120, a-120, a+70, a-70]){ if(GO(c)) return; } }
  // 4) Edges
  if(tank.x<P.edge){ if(GO(0)) return; } if(tank.x>900-P.edge){ if(GO(180)) return; } if(tank.y<P.edge){ if(GO(90)) return; } if(tank.y>600-P.edge){ if(GO(270)) return; }
  // 5) Ally separation
  let A=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; A=a; } } if(A && ad<P.sep){ const aw=D(tank.x-A.x,tank.y-A.y); if(GO(aw)) return; if(GO(aw+18)) return; if(GO(aw-18)) return; }
  // 6) Range + strafing
  if(T){ const to=D(T.x-tank.x,T.y-tank.y), d=T.distance; let r0=P.minR, r1=P.maxR; if((T.health<=(P.finHP||24))||enemies.length<=P.lastN2){ r0=Math.max(P.minCap||140, r0-(P.aggrIn||30)); r1=Math.max((P.minCap||140)+40, r1-(P.aggrOut||20)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(GO(aw)) return; if(GO(aw+16)) return; if(GO(aw-16)) return; } else if(d>r1){ if(GO(to)) return; if(GO(to+14)) return; if(GO(to-14)) return; } else { const s=to + ((S.side||1)*(P.strafe||30)) + (P.bias||0)*0.5; if(GO(s)) return; if(GO(s+16)) return; if(GO(s-16)) return; } }
  for(const s of [0,60,120,180,240,300]){ if(GO(s+(P.bias||0))) return; }
}

// ===== 다음 로봇 =====

function name(){return "NovaE-D2";}
function type(){return Type.DEALER;}
let __S_3={last:null,tick:0,lastVel:null,side: ((3*17)%2?1:-1)};
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI; const N=(a)=>{a%=360; return a<0?a+360:a;}; const C=(v,l,h)=>v<l?l:v>h?h:v;
  const P={"minR":260,"maxR":380,"strafe":40,"threat":88,"sep":62,"edge":46,"bias":-14,"jA":17,"jB":13,"jM":25,"jH":12,"jF":0.11,"leadCap":12,"leadW":1,"hW":1.6,"dW":0.09,"finN":26,"finX":18,"lastN":32,"lastX":32,"minCap":180}; const S=__S_3; S.tick=(S.tick||0)+1;
  // 1) Target selection (health priority, distance tie)
  let T=null, sc=1e18; for(const e of enemies){ const s=e.health*P.hW + e.distance*P.dW; if(s<sc){sc=s; T=e;} }
  // 2) Predictive aim using quadratic intercept (fallback to linear lead)
  if(T){ let ax=T.x, ay=T.y; let vx=0, vy=0; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0; const ivx=(T.x-S.last.x), ivy=(T.y-S.last.y); vx=lvx*0.5+ivx*0.5; vy=lvy*0.5+ivy*0.5; S.lastVel={vx,vy}; const rx=T.x-tank.x, ry=T.y-tank.y; const s2=64; const aa=vx*vx+vy*vy-s2; const bb=2*(rx*vx+ry*vy); const cc=rx*rx+ry*ry; let tHit=0; if(Math.abs(aa)<1e-6){ tHit = bb!==0 ? C(-cc/bb,0,P.leadCap) : 0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc); const t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); const tc=(t1>0&&t2>0)?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); tHit=C(tc,0,P.leadCap); } else { const d=H(rx,ry); tHit=C(d/8,0,P.leadCap); } } ax=T.x+vx*P.leadW*tHit; ay=T.y+vy*P.leadW*tHit; } const jit=(((S.tick*13 + tank.x*7 + tank.y*3 + 3*11)%23)-11)*(P.jF||0.1) + (P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y)+jit); S.last={x:T.x,y:T.y}; }
  // 3) Bullet avoidance with time weighting
  let Ht=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v; const pj=dx*nx+dy*ny; if(pj>0){ const px=b.x-pj*nx, py=b.y-pj*ny; const dist=H(px-tank.x,py-tank.y); const tt=pj/v; const s=dist + tt*(P.threatH||4); if(dist<P.threat && s<score){ score=s; Ht=b; } } }
  let moved=0; const GO=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  if(Ht){ const a=D(Ht.vx,Ht.vy); const side=(S.side||1)*(P.fleeBias||16) + (P.bias||0)*0.4; for(const c of [a+90+side, a-90-side, a+120, a-120, a+70, a-70]){ if(GO(c)) return; } }
  // 4) Edges
  if(tank.x<P.edge){ if(GO(0)) return; } if(tank.x>900-P.edge){ if(GO(180)) return; } if(tank.y<P.edge){ if(GO(90)) return; } if(tank.y>600-P.edge){ if(GO(270)) return; }
  // 5) Ally separation
  let A=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; A=a; } } if(A && ad<P.sep){ const aw=D(tank.x-A.x,tank.y-A.y); if(GO(aw)) return; if(GO(aw+18)) return; if(GO(aw-18)) return; }
  // 6) Range + strafing
  if(T){ const to=D(T.x-tank.x,T.y-tank.y), d=T.distance; let r0=P.minR, r1=P.maxR; if((T.health<=(P.finHP||24))||enemies.length<=P.lastN2){ r0=Math.max(P.minCap||140, r0-(P.aggrIn||30)); r1=Math.max((P.minCap||140)+40, r1-(P.aggrOut||20)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(GO(aw)) return; if(GO(aw+16)) return; if(GO(aw-16)) return; } else if(d>r1){ if(GO(to)) return; if(GO(to+14)) return; if(GO(to-14)) return; } else { const s=to + ((S.side||1)*(P.strafe||30)) + (P.bias||0)*0.5; if(GO(s)) return; if(GO(s+16)) return; if(GO(s-16)) return; } }
  for(const s of [0,60,120,180,240,300]){ if(GO(s+(P.bias||0))) return; }
}

// ===== 다음 로봇 =====

function name(){return "NovaE-N1";}
function type(){return Type.NORMAL;}
let __S_4={last:null,tick:0,lastVel:null,side: ((4*17)%2?1:-1)};
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI; const N=(a)=>{a%=360; return a<0?a+360:a;}; const C=(v,l,h)=>v<l?l:v>h?h:v;
  const P={"minR":220,"maxR":340,"strafe":38,"threat":86,"sep":64,"edge":46,"bias":-12,"jA":19,"jB":29,"jM":27,"jH":13,"jF":0.12,"leadCap":11,"leadW":0.96,"hW":1.55,"dW":0.1,"finN":28,"finX":18,"lastN":34,"lastX":34,"minCap":170}; const S=__S_4; S.tick=(S.tick||0)+1;
  // 1) Target selection (health priority, distance tie)
  let T=null, sc=1e18; for(const e of enemies){ const s=e.health*P.hW + e.distance*P.dW; if(s<sc){sc=s; T=e;} }
  // 2) Predictive aim using quadratic intercept (fallback to linear lead)
  if(T){ let ax=T.x, ay=T.y; let vx=0, vy=0; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0; const ivx=(T.x-S.last.x), ivy=(T.y-S.last.y); vx=lvx*0.5+ivx*0.5; vy=lvy*0.5+ivy*0.5; S.lastVel={vx,vy}; const rx=T.x-tank.x, ry=T.y-tank.y; const s2=64; const aa=vx*vx+vy*vy-s2; const bb=2*(rx*vx+ry*vy); const cc=rx*rx+ry*ry; let tHit=0; if(Math.abs(aa)<1e-6){ tHit = bb!==0 ? C(-cc/bb,0,P.leadCap) : 0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc); const t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); const tc=(t1>0&&t2>0)?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); tHit=C(tc,0,P.leadCap); } else { const d=H(rx,ry); tHit=C(d/8,0,P.leadCap); } } ax=T.x+vx*P.leadW*tHit; ay=T.y+vy*P.leadW*tHit; } const jit=(((S.tick*13 + tank.x*7 + tank.y*3 + 4*11)%23)-11)*(P.jF||0.1) + (P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y)+jit); S.last={x:T.x,y:T.y}; }
  // 3) Bullet avoidance with time weighting
  let Ht=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v; const pj=dx*nx+dy*ny; if(pj>0){ const px=b.x-pj*nx, py=b.y-pj*ny; const dist=H(px-tank.x,py-tank.y); const tt=pj/v; const s=dist + tt*(P.threatH||4); if(dist<P.threat && s<score){ score=s; Ht=b; } } }
  let moved=0; const GO=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  if(Ht){ const a=D(Ht.vx,Ht.vy); const side=(S.side||1)*(P.fleeBias||16) + (P.bias||0)*0.4; for(const c of [a+90+side, a-90-side, a+120, a-120, a+70, a-70]){ if(GO(c)) return; } }
  // 4) Edges
  if(tank.x<P.edge){ if(GO(0)) return; } if(tank.x>900-P.edge){ if(GO(180)) return; } if(tank.y<P.edge){ if(GO(90)) return; } if(tank.y>600-P.edge){ if(GO(270)) return; }
  // 5) Ally separation
  let A=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; A=a; } } if(A && ad<P.sep){ const aw=D(tank.x-A.x,tank.y-A.y); if(GO(aw)) return; if(GO(aw+18)) return; if(GO(aw-18)) return; }
  // 6) Range + strafing
  if(T){ const to=D(T.x-tank.x,T.y-tank.y), d=T.distance; let r0=P.minR, r1=P.maxR; if((T.health<=(P.finHP||24))||enemies.length<=P.lastN2){ r0=Math.max(P.minCap||140, r0-(P.aggrIn||30)); r1=Math.max((P.minCap||140)+40, r1-(P.aggrOut||20)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(GO(aw)) return; if(GO(aw+16)) return; if(GO(aw-16)) return; } else if(d>r1){ if(GO(to)) return; if(GO(to+14)) return; if(GO(to-14)) return; } else { const s=to + ((S.side||1)*(P.strafe||30)) + (P.bias||0)*0.5; if(GO(s)) return; if(GO(s+16)) return; if(GO(s-16)) return; } }
  for(const s of [0,60,120,180,240,300]){ if(GO(s+(P.bias||0))) return; }
}

// ===== 다음 로봇 =====

function name(){return "NovaE-N2";}
function type(){return Type.NORMAL;}
let __S_5={last:null,tick:0,lastVel:null,side: ((5*17)%2?1:-1)};
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI; const N=(a)=>{a%=360; return a<0?a+360:a;}; const C=(v,l,h)=>v<l?l:v>h?h:v;
  const P={"minR":220,"maxR":340,"strafe":38,"threat":86,"sep":64,"edge":46,"bias":-12,"jA":19,"jB":29,"jM":27,"jH":13,"jF":0.12,"leadCap":11,"leadW":0.96,"hW":1.55,"dW":0.1,"finN":28,"finX":18,"lastN":34,"lastX":34,"minCap":170}; const S=__S_5; S.tick=(S.tick||0)+1;
  // 1) Target selection (health priority, distance tie)
  let T=null, sc=1e18; for(const e of enemies){ const s=e.health*P.hW + e.distance*P.dW; if(s<sc){sc=s; T=e;} }
  // 2) Predictive aim using quadratic intercept (fallback to linear lead)
  if(T){ let ax=T.x, ay=T.y; let vx=0, vy=0; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0; const ivx=(T.x-S.last.x), ivy=(T.y-S.last.y); vx=lvx*0.5+ivx*0.5; vy=lvy*0.5+ivy*0.5; S.lastVel={vx,vy}; const rx=T.x-tank.x, ry=T.y-tank.y; const s2=64; const aa=vx*vx+vy*vy-s2; const bb=2*(rx*vx+ry*vy); const cc=rx*rx+ry*ry; let tHit=0; if(Math.abs(aa)<1e-6){ tHit = bb!==0 ? C(-cc/bb,0,P.leadCap) : 0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc); const t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); const tc=(t1>0&&t2>0)?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); tHit=C(tc,0,P.leadCap); } else { const d=H(rx,ry); tHit=C(d/8,0,P.leadCap); } } ax=T.x+vx*P.leadW*tHit; ay=T.y+vy*P.leadW*tHit; } const jit=(((S.tick*13 + tank.x*7 + tank.y*3 + 5*11)%23)-11)*(P.jF||0.1) + (P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y)+jit); S.last={x:T.x,y:T.y}; }
  // 3) Bullet avoidance with time weighting
  let Ht=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v; const pj=dx*nx+dy*ny; if(pj>0){ const px=b.x-pj*nx, py=b.y-pj*ny; const dist=H(px-tank.x,py-tank.y); const tt=pj/v; const s=dist + tt*(P.threatH||4); if(dist<P.threat && s<score){ score=s; Ht=b; } } }
  let moved=0; const GO=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  if(Ht){ const a=D(Ht.vx,Ht.vy); const side=(S.side||1)*(P.fleeBias||16) + (P.bias||0)*0.4; for(const c of [a+90+side, a-90-side, a+120, a-120, a+70, a-70]){ if(GO(c)) return; } }
  // 4) Edges
  if(tank.x<P.edge){ if(GO(0)) return; } if(tank.x>900-P.edge){ if(GO(180)) return; } if(tank.y<P.edge){ if(GO(90)) return; } if(tank.y>600-P.edge){ if(GO(270)) return; }
  // 5) Ally separation
  let A=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; A=a; } } if(A && ad<P.sep){ const aw=D(tank.x-A.x,tank.y-A.y); if(GO(aw)) return; if(GO(aw+18)) return; if(GO(aw-18)) return; }
  // 6) Range + strafing
  if(T){ const to=D(T.x-tank.x,T.y-tank.y), d=T.distance; let r0=P.minR, r1=P.maxR; if((T.health<=(P.finHP||24))||enemies.length<=P.lastN2){ r0=Math.max(P.minCap||140, r0-(P.aggrIn||30)); r1=Math.max((P.minCap||140)+40, r1-(P.aggrOut||20)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(GO(aw)) return; if(GO(aw+16)) return; if(GO(aw-16)) return; } else if(d>r1){ if(GO(to)) return; if(GO(to+14)) return; if(GO(to-14)) return; } else { const s=to + ((S.side||1)*(P.strafe||30)) + (P.bias||0)*0.5; if(GO(s)) return; if(GO(s+16)) return; if(GO(s-16)) return; } }
  for(const s of [0,60,120,180,240,300]){ if(GO(s+(P.bias||0))) return; }
}
function name(){return "AstraX-T1";}
function type(){return Type.TANKER;}
let __S_0={tick:0,lastT:null,lastTV:null,side:1,lastHP:null};
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI, N=(a)=>{a%=360;return a<0?a+360:a;}, C=(v,l,h)=>v<l?l:v>h?h:v; const S=__S_0; S.tick=(S.tick||0)+1;
  const P={minR:165,maxR:280,strafe:30,threat:90,threatH:5,sep:62,edge:46,bias:-6,jF:0.08,aimBias:-0.05,leadCap:14,leadW:1.06,hW:1.5,dW:0.085,finHP:28,aggrIn:34,aggrOut:22,lastN2:3,minCap:140,fleeBias:14};
  let T=null,sc=1e18; for(const e of enemies){ const s=e.health*P.hW + e.distance*P.dW; if(s<sc){sc=s; T=e;} }
  if (S.lastHP!=null && tank.health < S.lastHP) S.side = (S.side||1)*-1; if((S.tick%45)===0) S.side=(S.side||1)*-1; S.lastHP=tank.health;
  if(T){ let ax=T.x, ay=T.y; let vx=0, vy=0; if(S.lastT){ const ivx=T.x-S.lastT.x, ivy=T.y-S.lastT.y; const lvx=S.lastTV?S.lastTV.vx:0, lvy=S.lastTV?S.lastTV.vy:0; vx=lvx*0.4+ivx*0.6; vy=lvy*0.4+ivy*0.6; S.lastTV={vx,vy}; const rx=T.x-tank.x, ry=T.y-tank.y, s2=64; const aa=vx*vx+vy*vy-s2; const bb=2*(rx*vx+ry*vy); const cc=rx*rx+ry*ry; let tHit=0; if(Math.abs(aa)<1e-6){ tHit = bb!==0 ? C(-cc/bb,0,P.leadCap) : 0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc); const t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); const tc=(t1>0&&t2>0)?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); tHit=C(tc,0,P.leadCap); } else { const d=H(rx,ry); tHit=C(d/8,0,P.leadCap); } } ax=T.x+vx*P.leadW*tHit; ay=T.y+vy*P.leadW*tHit; }
    const jit=(((S.tick*11 + (tank.x|0)*5 + (tank.y|0)*3 + 0*7)%19)-9)*(P.jF) + (P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y)+jit); S.lastT={x:T.x,y:T.y}; }
  let Ht=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v; const pj=dx*nx+dy*ny; if(pj>0){ const px=b.x-pj*nx, py=b.y-pj*ny; const dist=H(px-tank.x,py-tank.y); const tt=pj/v; const s=dist + tt*(P.threatH); if(dist<P.threat && s<score){ score=s; Ht=b; } } }
  let moved=0; const GO=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  if(Ht){ const a=D(Ht.vx,Ht.vy); const side=(S.side||1)*(P.fleeBias) + (P.bias)*0.4; for(const c of [a+90+side, a-90-side, a+120, a-120, a+60, a-60]){ if(GO(c)) return; } }
  if(tank.x<P.edge){ if(GO(0)) return; } if(tank.x>900-P.edge){ if(GO(180)) return; } if(tank.y<P.edge){ if(GO(90)) return; } if(tank.y>600-P.edge){ if(GO(270)) return; }
  let A=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; A=a; } } if(A && ad<P.sep){ const aw=D(tank.x-A.x,tank.y-A.y); if(GO(aw)) return; if(GO(aw+18)) return; if(GO(aw-18)) return; }
  if(T){ const to=D(T.x-tank.x,T.y-tank.y), d=T.distance; let r0=P.minR, r1=P.maxR; if((T.health<=P.finHP)||enemies.length<=P.lastN2){ r0=Math.max(P.minCap, r0-P.aggrIn); r1=Math.max(P.minCap+40, r1-P.aggrOut); } if(d<r0){ const aw=to+180+(P.bias)*0.4; if(GO(aw)) return; if(GO(aw+16)) return; if(GO(aw-16)) return; } else if(d>r1){ if(GO(to)) return; if(GO(to+14)) return; if(GO(to-14)) return; } else { const s=to + ((S.side||1)*(P.strafe)) + (P.bias)*0.5; if(GO(s)) return; if(GO(s+16)) return; if(GO(s-16)) return; } }
  for(const s of [0,60,120,180,240,300]){ if(GO(s+(P.bias))) return; }
}

// ===== 다음 로봇 =====

function name(){return "AstraX-T2";}
function type(){return Type.TANKER;}
let __S_1={tick:0,lastT:null,lastTV:null,side:-1,lastHP:null};
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI, N=(a)=>{a%=360;return a<0?a+360:a;}, C=(v,l,h)=>v<l?l:v>h?h:v; const S=__S_1; S.tick=(S.tick||0)+1;
  const P={minR:170,maxR:285,strafe:30,threat:90,threatH:5,sep:62,edge:46,bias:6,jF:0.08,aimBias:0.05,leadCap:14,leadW:1.06,hW:1.5,dW:0.085,finHP:28,aggrIn:34,aggrOut:22,lastN2:3,minCap:140,fleeBias:14};
  let T=null,sc=1e18; for(const e of enemies){ const s=e.health*P.hW + e.distance*P.dW; if(s<sc){sc=s; T=e;} }
  if (S.lastHP!=null && tank.health < S.lastHP) S.side = (S.side||1)*-1; if((S.tick%47)===0) S.side=(S.side||1)*-1; S.lastHP=tank.health;
  if(T){ let ax=T.x, ay=T.y; let vx=0, vy=0; if(S.lastT){ const ivx=T.x-S.lastT.x, ivy=T.y-S.lastT.y; const lvx=S.lastTV?S.lastTV.vx:0, lvy=S.lastTV?S.lastTV.vy:0; vx=lvx*0.4+ivx*0.6; vy=lvy*0.4+ivy*0.6; S.lastTV={vx,vy}; const rx=T.x-tank.x, ry=T.y-tank.y, s2=64; const aa=vx*vx+vy*vy-s2; const bb=2*(rx*vx+ry*vy); const cc=rx*rx+ry*ry; let tHit=0; if(Math.abs(aa)<1e-6){ tHit = bb!==0 ? C(-cc/bb,0,P.leadCap) : 0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc); const t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); const tc=(t1>0&&t2>0)?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); tHit=C(tc,0,P.leadCap); } else { const d=H(rx,ry); tHit=C(d/8,0,P.leadCap); } } ax=T.x+vx*P.leadW*tHit; ay=T.y+vy*P.leadW*tHit; }
    const jit=(((S.tick*11 + (tank.x|0)*5 + (tank.y|0)*3 + 1*7)%19)-9)*(P.jF) + (P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y)+jit); S.lastT={x:T.x,y:T.y}; }
  let Ht=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v; const pj=dx*nx+dy*ny; if(pj>0){ const px=b.x-pj*nx, py=b.y-pj*ny; const dist=H(px-tank.x,py-tank.y); const tt=pj/v; const s=dist + tt*(P.threatH); if(dist<P.threat && s<score){ score=s; Ht=b; } } }
  let moved=0; const GO=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  if(Ht){ const a=D(Ht.vx,Ht.vy); const side=(S.side||1)*(P.fleeBias) + (P.bias)*0.4; for(const c of [a+90+side, a-90-side, a+120, a-120, a+60, a-60]){ if(GO(c)) return; } }
  if(tank.x<P.edge){ if(GO(0)) return; } if(tank.x>900-P.edge){ if(GO(180)) return; } if(tank.y<P.edge){ if(GO(90)) return; } if(tank.y>600-P.edge){ if(GO(270)) return; }
  let A=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; A=a; } } if(A && ad<P.sep){ const aw=D(tank.x-A.x,tank.y-A.y); if(GO(aw)) return; if(GO(aw+18)) return; if(GO(aw-18)) return; }
  if(T){ const to=D(T.x-tank.x,T.y-tank.y), d=T.distance; let r0=P.minR, r1=P.maxR; if((T.health<=P.finHP)||enemies.length<=P.lastN2){ r0=Math.max(P.minCap, r0-P.aggrIn); r1=Math.max(P.minCap+40, r1-P.aggrOut); } if(d<r0){ const aw=to+180+(P.bias)*0.4; if(GO(aw)) return; if(GO(aw+16)) return; if(GO(aw-16)) return; } else if(d>r1){ if(GO(to)) return; if(GO(to+14)) return; if(GO(to-14)) return; } else { const s=to + ((S.side||1)*(P.strafe)) + (P.bias)*0.5; if(GO(s)) return; if(GO(s+16)) return; if(GO(s-16)) return; } }
  for(const s of [0,60,120,180,240,300]){ if(GO(s+(P.bias))) return; }
}

// ===== 다음 로봇 =====

function name(){return "AstraX-D1";}
function type(){return Type.DEALER;}
let __S_2={tick:0,lastT:null,lastTV:null,side:1,lastHP:null};
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI, N=(a)=>{a%=360;return a<0?a+360:a;}, C=(v,l,h)=>v<l?l:v>h?h:v; const S=__S_2; S.tick=(S.tick||0)+1;
  const P={minR:230,maxR:360,strafe:36,threat:110,threatH:6,sep:62,edge:48,bias:-8,jF:0.07,aimBias:-0.1,leadCap:12,leadW:1.08,hW:1.45,dW:0.08,finHP:22,aggrIn:30,aggrOut:22,lastN2:3,minCap:160,fleeBias:12};
  let T=null,sc=1e18; for(const e of enemies){ const s=e.health*P.hW + e.distance*P.dW; if(s<sc){sc=s; T=e;} }
  if (S.lastHP!=null && tank.health < S.lastHP) S.side = (S.side||1)*-1; S.lastHP=tank.health;
  if(T){ let ax=T.x, ay=T.y; let vx=0, vy=0; if(S.lastT){ const ivx=T.x-S.lastT.x, ivy=T.y-S.lastT.y; const lvx=S.lastTV?S.lastTV.vx:0, lvy=S.lastTV?S.lastTV.vy:0; vx=lvx*0.35+ivx*0.65; vy=lvy*0.35+ivy*0.65; S.lastTV={vx,vy}; const rx=T.x-tank.x, ry=T.y-tank.y, s2=64; const aa=vx*vx+vy*vy-s2; const bb=2*(rx*vx+ry*vy); const cc=rx*rx+ry*ry; let tHit=0; if(Math.abs(aa)<1e-6){ tHit = bb!==0 ? C(-cc/bb,0,P.leadCap) : 0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc); const t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); const tc=(t1>0&&t2>0)?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); tHit=C(tc,0,P.leadCap);} else { const d=H(rx,ry); tHit=C(d/8,0,P.leadCap);} } ax=T.x+vx*P.leadW*tHit; ay=T.y+vy*P.leadW*tHit; }
    const jit=(((S.tick*13 + (tank.x|0)*5 + (tank.y|0)*5 + 2*7)%23)-11)*(P.jF) + (P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y)+jit); S.lastT={x:T.x,y:T.y}; }
  let Ht=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v; const pj=dx*nx+dy*ny; if(pj>0){ const px=b.x-pj*nx, py=b.y-pj*ny; const dist=H(px-tank.x,py-tank.y); const tt=pj/v; const s=dist + tt*(P.threatH); if(dist<P.threat && s<score){ score=s; Ht=b; } } }
  let moved=0; const GO=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  if(Ht){ const a=D(Ht.vx,Ht.vy); const side=(S.side||1)*(P.fleeBias) + (P.bias)*0.4; for(const c of [a+90+side, a-90-side, a+120, a-120, a+70, a-70]){ if(GO(c)) return; } }
  if(tank.x<P.edge){ if(GO(0)) return; } if(tank.x>900-P.edge){ if(GO(180)) return; } if(tank.y<P.edge){ if(GO(90)) return; } if(tank.y>600-P.edge){ if(GO(270)) return; }
  let A=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; A=a; } } if(A && ad<P.sep){ const aw=D(tank.x-A.x,tank.y-A.y); if(GO(aw)) return; if(GO(aw+18)) return; if(GO(aw-18)) return; }
  if(T){ const to=D(T.x-tank.x,T.y-tank.y), d=T.distance; let r0=P.minR, r1=P.maxR; if((T.health<=P.finHP)||enemies.length<=P.lastN2){ r0=Math.max(P.minCap, r0-P.aggrIn); r1=Math.max(P.minCap+40, r1-P.aggrOut); } if(d<r0){ const aw=to+180+(P.bias)*0.4; if(GO(aw)) return; if(GO(aw+16)) return; if(GO(aw-16)) return; } else if(d>r1){ if(GO(to)) return; if(GO(to+14)) return; if(GO(to-14)) return; } else { const s=to + ((S.side||1)*(P.strafe)) + (P.bias)*0.5; if(GO(s)) return; if(GO(s+16)) return; if(GO(s-16)) return; } }
  for(const s of [0,60,120,180,240,300]){ if(GO(s+(P.bias))) return; }
}

// ===== 다음 로봇 =====

function name(){return "AstraX-D2";}
function type(){return Type.DEALER;}
let __S_3={tick:0,lastT:null,lastTV:null,side:-1,lastHP:null};
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI, N=(a)=>{a%=360;return a<0?a+360:a;}, C=(v,l,h)=>v<l?l:v>h?h:v; const S=__S_3; S.tick=(S.tick||0)+1;
  const P={minR:235,maxR:365,strafe:36,threat:110,threatH:6,sep:62,edge:48,bias:8,jF:0.07,aimBias:0.1,leadCap:12,leadW:1.08,hW:1.45,dW:0.08,finHP:22,aggrIn:30,aggrOut:22,lastN2:3,minCap:160,fleeBias:12};
  let T=null,sc=1e18; for(const e of enemies){ const s=e.health*P.hW + e.distance*P.dW; if(s<sc){sc=s; T=e;} }
  if (S.lastHP!=null && tank.health < S.lastHP) S.side = (S.side||1)*-1; S.lastHP=tank.health;
  if(T){ let ax=T.x, ay=T.y; let vx=0, vy=0; if(S.lastT){ const ivx=T.x-S.lastT.x, ivy=T.y-S.lastT.y; const lvx=S.lastTV?S.lastTV.vx:0, lvy=S.lastTV?S.lastTV.vy:0; vx=lvx*0.35+ivx*0.65; vy=lvy*0.35+ivy*0.65; S.lastTV={vx,vy}; const rx=T.x-tank.x, ry=T.y-tank.y, s2=64; const aa=vx*vx+vy*vy-s2; const bb=2*(rx*vx+ry*vy); const cc=rx*rx+ry*ry; let tHit=0; if(Math.abs(aa)<1e-6){ tHit = bb!==0 ? C(-cc/bb,0,P.leadCap) : 0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc); const t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); const tc=(t1>0&&t2>0)?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); tHit=C(tc,0,P.leadCap);} else { const d=H(rx,ry); tHit=C(d/8,0,P.leadCap);} } ax=T.x+vx*P.leadW*tHit; ay=T.y+vy*P.leadW*tHit; }
    const jit=(((S.tick*13 + (tank.x|0)*5 + (tank.y|0)*5 + 3*7)%23)-11)*(P.jF) + (P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y)+jit); S.lastT={x:T.x,y:T.y}; }
  let Ht=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v; const pj=dx*nx+dy*ny; if(pj>0){ const px=b.x-pj*nx, py=b.y-pj*ny; const dist=H(px-tank.x,py-tank.y); const tt=pj/v; const s=dist + tt*(P.threatH); if(dist<P.threat && s<score){ score=s; Ht=b; } } }
  let moved=0; const GO=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  if(Ht){ const a=D(Ht.vx,Ht.vy); const side=(S.side||1)*(P.fleeBias) + (P.bias)*0.4; for(const c of [a+90+side, a-90-side, a+120, a-120, a+70, a-70]){ if(GO(c)) return; } }
  if(tank.x<P.edge){ if(GO(0)) return; } if(tank.x>900-P.edge){ if(GO(180)) return; } if(tank.y<P.edge){ if(GO(90)) return; } if(tank.y>600-P.edge){ if(GO(270)) return; }
  let A=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; A=a; } } if(A && ad<P.sep){ const aw=D(tank.x-A.x,tank.y-A.y); if(GO(aw)) return; if(GO(aw+18)) return; if(GO(aw-18)) return; }
  if(T){ const to=D(T.x-tank.x,T.y-tank.y), d=T.distance; let r0=P.minR, r1=P.maxR; if((T.health<=P.finHP)||enemies.length<=P.lastN2){ r0=Math.max(P.minCap, r0-P.aggrIn); r1=Math.max(P.minCap+40, r1-P.aggrOut); } if(d<r0){ const aw=to+180+(P.bias)*0.4; if(GO(aw)) return; if(GO(aw+16)) return; if(GO(aw-16)) return; } else if(d>r1){ if(GO(to)) return; if(GO(to+14)) return; if(GO(to-14)) return; } else { const s=to + ((S.side||1)*(P.strafe)) + (P.bias)*0.5; if(GO(s)) return; if(GO(s+16)) return; if(GO(s-16)) return; } }
  for(const s of [0,60,120,180,240,300]){ if(GO(s+(P.bias))) return; }
}

// ===== 다음 로봇 =====

function name(){return "AstraX-D3";}
function type(){return Type.DEALER;}
let __S_4={tick:0,lastT:null,lastTV:null,side:1,lastHP:null};
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI, N=(a)=>{a%=360;return a<0?a+360:a;}, C=(v,l,h)=>v<l?l:v>h?h:v; const S=__S_4; S.tick=(S.tick||0)+1;
  const P={minR:225,maxR:345,strafe:36,threat:110,threatH:6,sep:62,edge:48,bias:-7,jF:0.07,aimBias:-0.08,leadCap:12,leadW:1.08,hW:1.5,dW:0.08,finHP:22,aggrIn:30,aggrOut:20,lastN2:3,minCap:160,fleeBias:12};
  let T=null,sc=1e18; for(const e of enemies){ const s=e.health*P.hW + e.distance*P.dW; if(s<sc){sc=s; T=e;} }
  if (S.lastHP!=null && tank.health < S.lastHP) S.side = (S.side||1)*-1; if((S.tick%43)===0) S.side=(S.side||1)*-1; S.lastHP=tank.health;
  if(T){ let ax=T.x, ay=T.y; let vx=0, vy=0; if(S.lastT){ const ivx=T.x-S.lastT.x, ivy=T.y-S.lastT.y; const lvx=S.lastTV?S.lastTV.vx:0, lvy=S.lastTV?S.lastTV.vy:0; vx=lvx*0.38+ivx*0.62; vy=lvy*0.38+ivy*0.62; S.lastTV={vx,vy}; const rx=T.x-tank.x, ry=T.y-tank.y, s2=64; const aa=vx*vx+vy*vy-s2; const bb=2*(rx*vx+ry*vy); const cc=rx*rx+ry*ry; let tHit=0; if(Math.abs(aa)<1e-6){ tHit = bb!==0 ? C(-cc/bb,0,P.leadCap) : 0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc); const t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); const tc=(t1>0&&t2>0)?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); tHit=C(tc,0,P.leadCap);} else { const d=H(rx,ry); tHit=C(d/8,0,P.leadCap);} } ax=T.x+vx*P.leadW*tHit; ay=T.y+vy*P.leadW*tHit; }
    const jit=(((S.tick*11 + (tank.x|0)*5 + (tank.y|0)*5 + 4*7)%21)-10)*(P.jF) + (P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y)+jit); S.lastT={x:T.x,y:T.y}; }
  let Ht=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v; const pj=dx*nx+dy*ny; if(pj>0){ const px=b.x-pj*nx, py=b.y-pj*ny; const dist=H(px-tank.x,py-tank.y); const tt=pj/v; const s=dist + tt*(P.threatH); if(dist<P.threat && s<score){ score=s; Ht=b; } } }
  let moved=0; const GO=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  if(Ht){ const a=D(Ht.vx,Ht.vy); const side=(S.side||1)*(P.fleeBias) + (P.bias)*0.4; for(const c of [a+90+side, a-90-side, a+120, a-120, a+70, a-70]){ if(GO(c)) return; } }
  if(tank.x<P.edge){ if(GO(0)) return; } if(tank.x>900-P.edge){ if(GO(180)) return; } if(tank.y<P.edge){ if(GO(90)) return; } if(tank.y>600-P.edge){ if(GO(270)) return; }
  let A=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; A=a; } } if(A && ad<P.sep){ const aw=D(tank.x-A.x,tank.y-A.y); if(GO(aw)) return; if(GO(aw+18)) return; if(GO(aw-18)) return; }
  if(T){ const to=D(T.x-tank.x,T.y-tank.y), d=T.distance; let r0=P.minR, r1=P.maxR; if((T.health<=P.finHP)||enemies.length<=P.lastN2){ r0=Math.max(P.minCap, r0-P.aggrIn); r1=Math.max(P.minCap+40, r1-P.aggrOut); } if(d<r0){ const aw=to+180+(P.bias)*0.4; if(GO(aw)) return; if(GO(aw+16)) return; if(GO(aw-16)) return; } else if(d>r1){ if(GO(to)) return; if(GO(to+14)) return; if(GO(to-14)) return; } else { const s=to + ((S.side||1)*(P.strafe)) + (P.bias)*0.5; if(GO(s)) return; if(GO(s+16)) return; if(GO(s-16)) return; } }
  for(const s of [0,60,120,180,240,300]){ if(GO(s+(P.bias))) return; }
}

// ===== 다음 로봇 =====

function name(){return "AstraX-D4";}
function type(){return Type.DEALER;}
let __S_5={tick:0,lastT:null,lastTV:null,side:-1,lastHP:null};
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI, N=(a)=>{a%=360;return a<0?a+360:a;}, C=(v,l,h)=>v<l?l:v>h?h:v; const S=__S_5; S.tick=(S.tick||0)+1;
  const P={minR:230,maxR:350,strafe:36,threat:110,threatH:6,sep:62,edge:48,bias:7,jF:0.07,aimBias:0.08,leadCap:12,leadW:1.08,hW:1.5,dW:0.08,finHP:22,aggrIn:30,aggrOut:20,lastN2:3,minCap:160,fleeBias:12};
  let T=null,sc=1e18; for(const e of enemies){ const s=e.health*P.hW + e.distance*P.dW; if(s<sc){sc=s; T=e;} }
  if (S.lastHP!=null && tank.health < S.lastHP) S.side = (S.side||1)*-1; if((S.tick%41)===0) S.side=(S.side||1)*-1; S.lastHP=tank.health;
  if(T){ let ax=T.x, ay=T.y; let vx=0, vy=0; if(S.lastT){ const ivx=T.x-S.lastT.x, ivy=T.y-S.lastT.y; const lvx=S.lastTV?S.lastTV.vx:0, lvy=S.lastTV?S.lastTV.vy:0; vx=lvx*0.38+ivx*0.62; vy=lvy*0.38+ivy*0.62; S.lastTV={vx,vy}; const rx=T.x-tank.x, ry=T.y-tank.y, s2=64; const aa=vx*vx+vy*vy-s2; const bb=2*(rx*vx+ry*vy); const cc=rx*rx+ry*ry; let tHit=0; if(Math.abs(aa)<1e-6){ tHit = bb!==0 ? C(-cc/bb,0,P.leadCap) : 0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc); const t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); const tc=(t1>0&&t2>0)?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); tHit=C(tc,0,P.leadCap);} else { const d=H(rx,ry); tHit=C(d/8,0,P.leadCap);} } ax=T.x+vx*P.leadW*tHit; ay=T.y+vy*P.leadW*tHit; }
    const jit=(((S.tick*11 + (tank.x|0)*5 + (tank.y|0)*5 + 5*7)%21)-10)*(P.jF) + (P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y)+jit); S.lastT={x:T.x,y:T.y}; }
  let Ht=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v; const pj=dx*nx+dy*ny; if(pj>0){ const px=b.x-pj*nx, py=b.y-pj*ny; const dist=H(px-tank.x,py-tank.y); const tt=pj/v; const s=dist + tt*(P.threatH); if(dist<P.threat && s<score){ score=s; Ht=b; } } }
  let moved=0; const GO=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  if(Ht){ const a=D(Ht.vx,Ht.vy); const side=(S.side||1)*(P.fleeBias) + (P.bias)*0.4; for(const c of [a+90+side, a-90-side, a+120, a-120, a+70, a-70]){ if(GO(c)) return; } }
  if(tank.x<P.edge){ if(GO(0)) return; } if(tank.x>900-P.edge){ if(GO(180)) return; } if(tank.y<P.edge){ if(GO(90)) return; } if(tank.y>600-P.edge){ if(GO(270)) return; }
  let A=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; A=a; } } if(A && ad<P.sep){ const aw=D(tank.x-A.x,tank.y-A.y); if(GO(aw)) return; if(GO(aw+18)) return; if(GO(aw-18)) return; }
  if(T){ const to=D(T.x-tank.x,T.y-tank.y), d=T.distance; let r0=P.minR, r1=P.maxR; if((T.health<=P.finHP)||enemies.length<=P.lastN2){ r0=Math.max(P.minCap, r0-P.aggrIn); r1=Math.max(P.minCap+40, r1-P.aggrOut); } if(d<r0){ const aw=to+180+(P.bias)*0.4; if(GO(aw)) return; if(GO(aw+16)) return; if(GO(aw-16)) return; } else if(d>r1){ if(GO(to)) return; if(GO(to+14)) return; if(GO(to-14)) return; } else { const s=to + ((S.side||1)*(P.strafe)) + (P.bias)*0.5; if(GO(s)) return; if(GO(s+16)) return; if(GO(s-16)) return; } }
  for(const s of [0,60,120,180,240,300]){ if(GO(s+(P.bias))) return; }
}

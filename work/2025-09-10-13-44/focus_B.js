
function name(){return "Ares-B-T1";}
function type(){return Type.TANKER;}
let __state_1 = { last:null, tick:0, lastVel:null, side: ((1*17)%2?1:-1) };
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const N=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const CL=(v,l,h)=>v<l?l:v>h?h:v;
  const P={"leadCap":12,"leadW":1.08,"aimJitter":0.17,"edge":52,"sep":64,"threatR":210,"fleeBias":14,"finisherHP":22,"aggrRemain":3,"aggrIn":34,"aggrOut":26,"healthW":1.28,"distW":0.1,"rMin":160,"rMax":245,"strafe":26,"bias":-8};
  const S=__state_1;
  S.tick=(S.tick||0)+1;
  let tgt=null, best=1e18;
  for(const e of enemies){ const k = e.health*1.28 + e.distance*0.1; if(k<best){best=k; tgt=e;} }
  if(tgt){ let ax=tgt.x, ay=tgt.y; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0; const ivx=(tgt.x-S.last.x), ivy=(tgt.y-S.last.y); const svx = lvx*0.5 + ivx*0.5, svy = lvy*0.5 + ivy*0.5; S.lastVel={vx:svx,vy:svy}; const rx=tgt.x-tank.x, ry=tgt.y-tank.y; const s2=64; const aa=svx*svx+svy*svy - s2; const bb=2*(rx*svx+ry*svy); const cc=rx*rx+ry*ry; let t=0; if(Math.abs(aa)<1e-6){ t = bb!==0 ? CL(-cc/bb,0,P.leadCap) : 0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc); const t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); const tc = t1>0&&t2>0?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); t=CL(tc,0,P.leadCap); } else { const d=H(rx,ry); t=CL(d/8,0,P.leadCap); } } ax=tgt.x+svx*P.leadW*t; ay=tgt.y+svy*P.leadW*t; } const jitter = (((S.tick*13 + tank.x*7 + tank.y*3 + 1*11)%23)-11) * (P.aimJitter||0.12) * 0.07 + (P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y) + jitter); S.last={x:tgt.x,y:tgt.y}; }
  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  let hot=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const dist=H(px-tank.x,py-tank.y); const tt=proj/v; const s = dist + tt*(P.threatH||4); if(dist<P.threatR && s<score){ score=s; hot=b; } } }
  if(hot){ const a=D(hot.vx,hot.vy); const side=(S.side||1)*P.fleeBias + (P.bias||0)*0.5; const options=[a+90+side, a-90-side, a+120, a-120, a+70, a-70, a+150, a-150]; for(const c of options){ if(go(c)) return; } }
  if(tank.x < P.edge){ if(go(0)) return; } if(tank.x > 900-P.edge){ if(go(180)) return; } if(tank.y < P.edge){ if(go(90)) return; } if(tank.y > 600-P.edge){ if(go(270)) return; }
  let near=null, ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }
  if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=P.rMin, r1=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(110,r0-(P.aggrIn||36)); r1=Math.max(160,r1-(P.aggrOut||28)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; } else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; } else { const side=to + ((((tank.x*13+tank.y*7)|0)%2)?P.strafe:-P.strafe) + (P.bias||0)*0.5; if(go(side)) return; if(go(side+14)) return; if(go(side-14)) return; } }
  const sweep=[0,50,100,150,200,250,300,350]; for(const s of sweep){ if(go(s+(P.bias||0))) return; }
}


// ===== 다음 로봇 =====



function name(){return "Ares-B-T2";}
function type(){return Type.TANKER;}
let __state_2 = { last:null, tick:0, lastVel:null, side: ((2*17)%2?1:-1) };
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const N=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const CL=(v,l,h)=>v<l?l:v>h?h:v;
  const P={"leadCap":12,"leadW":1.08,"aimJitter":0.17,"edge":52,"sep":64,"threatR":210,"fleeBias":14,"finisherHP":22,"aggrRemain":3,"aggrIn":34,"aggrOut":26,"healthW":1.28,"distW":0.1,"rMin":165,"rMax":250,"strafe":24,"bias":8};
  const S=__state_2;
  S.tick=(S.tick||0)+1;
  let tgt=null, best=1e18;
  for(const e of enemies){ const k = e.health*1.28 + e.distance*0.1; if(k<best){best=k; tgt=e;} }
  if(tgt){ let ax=tgt.x, ay=tgt.y; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0; const ivx=(tgt.x-S.last.x), ivy=(tgt.y-S.last.y); const svx = lvx*0.5 + ivx*0.5, svy = lvy*0.5 + ivy*0.5; S.lastVel={vx:svx,vy:svy}; const rx=tgt.x-tank.x, ry=tgt.y-tank.y; const s2=64; const aa=svx*svx+svy*svy - s2; const bb=2*(rx*svx+ry*svy); const cc=rx*rx+ry*ry; let t=0; if(Math.abs(aa)<1e-6){ t = bb!==0 ? CL(-cc/bb,0,P.leadCap) : 0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc); const t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); const tc = t1>0&&t2>0?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); t=CL(tc,0,P.leadCap); } else { const d=H(rx,ry); t=CL(d/8,0,P.leadCap); } } ax=tgt.x+svx*P.leadW*t; ay=tgt.y+svy*P.leadW*t; } const jitter = (((S.tick*13 + tank.x*7 + tank.y*3 + 2*11)%23)-11) * (P.aimJitter||0.12) * 0.07 + (P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y) + jitter); S.last={x:tgt.x,y:tgt.y}; }
  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  let hot=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const dist=H(px-tank.x,py-tank.y); const tt=proj/v; const s = dist + tt*(P.threatH||4); if(dist<P.threatR && s<score){ score=s; hot=b; } } }
  if(hot){ const a=D(hot.vx,hot.vy); const side=(S.side||1)*P.fleeBias + (P.bias||0)*0.5; const options=[a+90+side, a-90-side, a+120, a-120, a+70, a-70, a+150, a-150]; for(const c of options){ if(go(c)) return; } }
  if(tank.x < P.edge){ if(go(0)) return; } if(tank.x > 900-P.edge){ if(go(180)) return; } if(tank.y < P.edge){ if(go(90)) return; } if(tank.y > 600-P.edge){ if(go(270)) return; }
  let near=null, ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }
  if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=P.rMin, r1=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(110,r0-(P.aggrIn||36)); r1=Math.max(160,r1-(P.aggrOut||28)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; } else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; } else { const side=to + ((((tank.x*13+tank.y*7)|0)%2)?P.strafe:-P.strafe) + (P.bias||0)*0.5; if(go(side)) return; if(go(side+14)) return; if(go(side-14)) return; } }
  const sweep=[0,50,100,150,200,250,300,350]; for(const s of sweep){ if(go(s+(P.bias||0))) return; }
}


// ===== 다음 로봇 =====



function name(){return "Ares-B-D1";}
function type(){return Type.DEALER;}
let __state_3 = { last:null, tick:0, lastVel:null, side: ((3*17)%2?1:-1) };
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const N=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const CL=(v,l,h)=>v<l?l:v>h?h:v;
  const P={"leadCap":12,"leadW":1.08,"aimJitter":0.17,"edge":52,"sep":64,"threatR":210,"fleeBias":14,"finisherHP":22,"aggrRemain":3,"aggrIn":34,"aggrOut":26,"healthW":1.28,"distW":0.1,"rMin":200,"rMax":315,"strafe":36,"bias":-6};
  const S=__state_3;
  S.tick=(S.tick||0)+1;
  let tgt=null, best=1e18;
  for(const e of enemies){ const k = e.health*1.28 + e.distance*0.1; if(k<best){best=k; tgt=e;} }
  if(tgt){ let ax=tgt.x, ay=tgt.y; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0; const ivx=(tgt.x-S.last.x), ivy=(tgt.y-S.last.y); const svx = lvx*0.5 + ivx*0.5, svy = lvy*0.5 + ivy*0.5; S.lastVel={vx:svx,vy:svy}; const rx=tgt.x-tank.x, ry=tgt.y-tank.y; const s2=64; const aa=svx*svx+svy*svy - s2; const bb=2*(rx*svx+ry*svy); const cc=rx*rx+ry*ry; let t=0; if(Math.abs(aa)<1e-6){ t = bb!==0 ? CL(-cc/bb,0,P.leadCap) : 0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc); const t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); const tc = t1>0&&t2>0?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); t=CL(tc,0,P.leadCap); } else { const d=H(rx,ry); t=CL(d/8,0,P.leadCap); } } ax=tgt.x+svx*P.leadW*t; ay=tgt.y+svy*P.leadW*t; } const jitter = (((S.tick*13 + tank.x*7 + tank.y*3 + 3*11)%23)-11) * (P.aimJitter||0.12) * 0.07 + (P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y) + jitter); S.last={x:tgt.x,y:tgt.y}; }
  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  let hot=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const dist=H(px-tank.x,py-tank.y); const tt=proj/v; const s = dist + tt*(P.threatH||4); if(dist<P.threatR && s<score){ score=s; hot=b; } } }
  if(hot){ const a=D(hot.vx,hot.vy); const side=(S.side||1)*P.fleeBias + (P.bias||0)*0.5; const options=[a+90+side, a-90-side, a+120, a-120, a+70, a-70, a+150, a-150]; for(const c of options){ if(go(c)) return; } }
  if(tank.x < P.edge){ if(go(0)) return; } if(tank.x > 900-P.edge){ if(go(180)) return; } if(tank.y < P.edge){ if(go(90)) return; } if(tank.y > 600-P.edge){ if(go(270)) return; }
  let near=null, ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }
  if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=P.rMin, r1=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(110,r0-(P.aggrIn||36)); r1=Math.max(160,r1-(P.aggrOut||28)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; } else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; } else { const side=to + ((((tank.x*13+tank.y*7)|0)%2)?P.strafe:-P.strafe) + (P.bias||0)*0.5; if(go(side)) return; if(go(side+14)) return; if(go(side-14)) return; } }
  const sweep=[0,50,100,150,200,250,300,350]; for(const s of sweep){ if(go(s+(P.bias||0))) return; }
}


// ===== 다음 로봇 =====



function name(){return "Ares-B-D2";}
function type(){return Type.DEALER;}
let __state_4 = { last:null, tick:0, lastVel:null, side: ((4*17)%2?1:-1) };
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const N=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const CL=(v,l,h)=>v<l?l:v>h?h:v;
  const P={"leadCap":12,"leadW":1.08,"aimJitter":0.17,"edge":52,"sep":64,"threatR":210,"fleeBias":14,"finisherHP":22,"aggrRemain":3,"aggrIn":34,"aggrOut":26,"healthW":1.28,"distW":0.1,"rMin":205,"rMax":320,"strafe":34,"bias":6};
  const S=__state_4;
  S.tick=(S.tick||0)+1;
  let tgt=null, best=1e18;
  for(const e of enemies){ const k = e.health*1.28 + e.distance*0.1; if(k<best){best=k; tgt=e;} }
  if(tgt){ let ax=tgt.x, ay=tgt.y; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0; const ivx=(tgt.x-S.last.x), ivy=(tgt.y-S.last.y); const svx = lvx*0.5 + ivx*0.5, svy = lvy*0.5 + ivy*0.5; S.lastVel={vx:svx,vy:svy}; const rx=tgt.x-tank.x, ry=tgt.y-tank.y; const s2=64; const aa=svx*svx+svy*svy - s2; const bb=2*(rx*svx+ry*svy); const cc=rx*rx+ry*ry; let t=0; if(Math.abs(aa)<1e-6){ t = bb!==0 ? CL(-cc/bb,0,P.leadCap) : 0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc); const t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); const tc = t1>0&&t2>0?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); t=CL(tc,0,P.leadCap); } else { const d=H(rx,ry); t=CL(d/8,0,P.leadCap); } } ax=tgt.x+svx*P.leadW*t; ay=tgt.y+svy*P.leadW*t; } const jitter = (((S.tick*13 + tank.x*7 + tank.y*3 + 4*11)%23)-11) * (P.aimJitter||0.12) * 0.07 + (P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y) + jitter); S.last={x:tgt.x,y:tgt.y}; }
  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  let hot=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const dist=H(px-tank.x,py-tank.y); const tt=proj/v; const s = dist + tt*(P.threatH||4); if(dist<P.threatR && s<score){ score=s; hot=b; } } }
  if(hot){ const a=D(hot.vx,hot.vy); const side=(S.side||1)*P.fleeBias + (P.bias||0)*0.5; const options=[a+90+side, a-90-side, a+120, a-120, a+70, a-70, a+150, a-150]; for(const c of options){ if(go(c)) return; } }
  if(tank.x < P.edge){ if(go(0)) return; } if(tank.x > 900-P.edge){ if(go(180)) return; } if(tank.y < P.edge){ if(go(90)) return; } if(tank.y > 600-P.edge){ if(go(270)) return; }
  let near=null, ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }
  if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=P.rMin, r1=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(110,r0-(P.aggrIn||36)); r1=Math.max(160,r1-(P.aggrOut||28)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; } else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; } else { const side=to + ((((tank.x*13+tank.y*7)|0)%2)?P.strafe:-P.strafe) + (P.bias||0)*0.5; if(go(side)) return; if(go(side+14)) return; if(go(side-14)) return; } }
  const sweep=[0,50,100,150,200,250,300,350]; for(const s of sweep){ if(go(s+(P.bias||0))) return; }
}


// ===== 다음 로봇 =====



function name(){return "Ares-B-N1";}
function type(){return Type.NORMAL;}
let __state_5 = { last:null, tick:0, lastVel:null, side: ((5*17)%2?1:-1) };
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const N=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const CL=(v,l,h)=>v<l?l:v>h?h:v;
  const P={"leadCap":12,"leadW":1.08,"aimJitter":0.17,"edge":52,"sep":64,"threatR":210,"fleeBias":14,"finisherHP":22,"aggrRemain":3,"aggrIn":34,"aggrOut":26,"healthW":1.28,"distW":0.1,"rMin":185,"rMax":295,"strafe":30,"bias":-3};
  const S=__state_5;
  S.tick=(S.tick||0)+1;
  let tgt=null, best=1e18;
  for(const e of enemies){ const k = e.health*1.28 + e.distance*0.1; if(k<best){best=k; tgt=e;} }
  if(tgt){ let ax=tgt.x, ay=tgt.y; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0; const ivx=(tgt.x-S.last.x), ivy=(tgt.y-S.last.y); const svx = lvx*0.5 + ivx*0.5, svy = lvy*0.5 + ivy*0.5; S.lastVel={vx:svx,vy:svy}; const rx=tgt.x-tank.x, ry=tgt.y-tank.y; const s2=64; const aa=svx*svx+svy*svy - s2; const bb=2*(rx*svx+ry*svy); const cc=rx*rx+ry*ry; let t=0; if(Math.abs(aa)<1e-6){ t = bb!==0 ? CL(-cc/bb,0,P.leadCap) : 0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc); const t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); const tc = t1>0&&t2>0?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); t=CL(tc,0,P.leadCap); } else { const d=H(rx,ry); t=CL(d/8,0,P.leadCap); } } ax=tgt.x+svx*P.leadW*t; ay=tgt.y+svy*P.leadW*t; } const jitter = (((S.tick*13 + tank.x*7 + tank.y*3 + 5*11)%23)-11) * (P.aimJitter||0.12) * 0.07 + (P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y) + jitter); S.last={x:tgt.x,y:tgt.y}; }
  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  let hot=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const dist=H(px-tank.x,py-tank.y); const tt=proj/v; const s = dist + tt*(P.threatH||4); if(dist<P.threatR && s<score){ score=s; hot=b; } } }
  if(hot){ const a=D(hot.vx,hot.vy); const side=(S.side||1)*P.fleeBias + (P.bias||0)*0.5; const options=[a+90+side, a-90-side, a+120, a-120, a+70, a-70, a+150, a-150]; for(const c of options){ if(go(c)) return; } }
  if(tank.x < P.edge){ if(go(0)) return; } if(tank.x > 900-P.edge){ if(go(180)) return; } if(tank.y < P.edge){ if(go(90)) return; } if(tank.y > 600-P.edge){ if(go(270)) return; }
  let near=null, ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }
  if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=P.rMin, r1=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(110,r0-(P.aggrIn||36)); r1=Math.max(160,r1-(P.aggrOut||28)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; } else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; } else { const side=to + ((((tank.x*13+tank.y*7)|0)%2)?P.strafe:-P.strafe) + (P.bias||0)*0.5; if(go(side)) return; if(go(side+14)) return; if(go(side-14)) return; } }
  const sweep=[0,50,100,150,200,250,300,350]; for(const s of sweep){ if(go(s+(P.bias||0))) return; }
}


// ===== 다음 로봇 =====



function name(){return "Ares-B-N2";}
function type(){return Type.NORMAL;}
let __state_6 = { last:null, tick:0, lastVel:null, side: ((6*17)%2?1:-1) };
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const N=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const CL=(v,l,h)=>v<l?l:v>h?h:v;
  const P={"leadCap":12,"leadW":1.08,"aimJitter":0.17,"edge":52,"sep":64,"threatR":210,"fleeBias":14,"finisherHP":22,"aggrRemain":3,"aggrIn":34,"aggrOut":26,"healthW":1.28,"distW":0.1,"rMin":190,"rMax":300,"strafe":28,"bias":3};
  const S=__state_6;
  S.tick=(S.tick||0)+1;
  let tgt=null, best=1e18;
  for(const e of enemies){ const k = e.health*1.28 + e.distance*0.1; if(k<best){best=k; tgt=e;} }
  if(tgt){ let ax=tgt.x, ay=tgt.y; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0; const ivx=(tgt.x-S.last.x), ivy=(tgt.y-S.last.y); const svx = lvx*0.5 + ivx*0.5, svy = lvy*0.5 + ivy*0.5; S.lastVel={vx:svx,vy:svy}; const rx=tgt.x-tank.x, ry=tgt.y-tank.y; const s2=64; const aa=svx*svx+svy*svy - s2; const bb=2*(rx*svx+ry*svy); const cc=rx*rx+ry*ry; let t=0; if(Math.abs(aa)<1e-6){ t = bb!==0 ? CL(-cc/bb,0,P.leadCap) : 0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc); const t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); const tc = t1>0&&t2>0?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); t=CL(tc,0,P.leadCap); } else { const d=H(rx,ry); t=CL(d/8,0,P.leadCap); } } ax=tgt.x+svx*P.leadW*t; ay=tgt.y+svy*P.leadW*t; } const jitter = (((S.tick*13 + tank.x*7 + tank.y*3 + 6*11)%23)-11) * (P.aimJitter||0.12) * 0.07 + (P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y) + jitter); S.last={x:tgt.x,y:tgt.y}; }
  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  let hot=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const dist=H(px-tank.x,py-tank.y); const tt=proj/v; const s = dist + tt*(P.threatH||4); if(dist<P.threatR && s<score){ score=s; hot=b; } } }
  if(hot){ const a=D(hot.vx,hot.vy); const side=(S.side||1)*P.fleeBias + (P.bias||0)*0.5; const options=[a+90+side, a-90-side, a+120, a-120, a+70, a-70, a+150, a-150]; for(const c of options){ if(go(c)) return; } }
  if(tank.x < P.edge){ if(go(0)) return; } if(tank.x > 900-P.edge){ if(go(180)) return; } if(tank.y < P.edge){ if(go(90)) return; } if(tank.y > 600-P.edge){ if(go(270)) return; }
  let near=null, ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }
  if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=P.rMin, r1=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(110,r0-(P.aggrIn||36)); r1=Math.max(160,r1-(P.aggrOut||28)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; } else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; } else { const side=to + ((((tank.x*13+tank.y*7)|0)%2)?P.strafe:-P.strafe) + (P.bias||0)*0.5; if(go(side)) return; if(go(side+14)) return; if(go(side-14)) return; } }
  const sweep=[0,50,100,150,200,250,300,350]; for(const s of sweep){ if(go(s+(P.bias||0))) return; }
}

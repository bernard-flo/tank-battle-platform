function name(){return "HYDRA-T1";}
function type(){return Type.TANKER;}
let __H0 = {tick:0,last:null,lastVel:null,side:-1,flipTick:0};
function update(tank,enemies,allies,bulletInfo){
  var H=Math.hypot;function D(x,y){return Math.atan2(y,x)*180/Math.PI;}function N(a){a%=360; if(a<0)a+=360; return a;}function CL(v,l,h){return v<l?l:v>h?h:v;}
  var P={rMin:170.04,rMax:280.28,strafe:21.88,edge:63.03,sep:82.22,threatR:217.7,threatH:5.08,leadCap:22.98,leadW:1.02,jitter:0.12,healthW:1.28,distW:0.1,finisherHP:26.62,aggrRemain:2.87,aggrIn:29.2,aggrOut:21.25,bias:-5.76,flipEvery:92.67,centerBias:0.05};
  var S=__H0; S.tick=(S.tick||0)+1;
  // 1) target selection
  var tgt=null,best=1e18; for(var i=0;i<enemies.length;i++){var e=enemies[i]; var tW=(e.health<40?0.9:1.0); var key=e.health*(P.healthW*tW)+e.distance*(P.distW)+i*0.0003; if(key<best){best=key;tgt=e;}}
  // 2) predictive fire
  if(tgt){var aimX=tgt.x,aimY=tgt.y,vx=0,vy=0; if(S.last){var lvx=S.lastVel?S.lastVel.vx:0,lvy=S.lastVel?S.lastVel.vy:0; var ivx=(tgt.x-S.last.x),ivy=(tgt.y-S.last.y); vx=lvx*0.55+ivx*0.45; vy=lvy*0.55+ivy*0.45; S.lastVel={vx:vx,vy:vy}; var rx=tgt.x-tank.x, ry=tgt.y-tank.y; var s2=64; var aa=vx*vx+vy*vy-s2; var bb=2*(rx*vx+ry*vy); var cc=rx*rx+ry*ry; var tHit=0; if(Math.abs(aa)<1e-6){tHit=bb!==0?CL(-cc/bb,0,P.leadCap):0;} else {var disc=bb*bb-4*aa*cc; if(disc>=0){var sd=Math.sqrt(disc); var t1=(-bb-sd)/(2*aa),t2=(-bb+sd)/(2*aa); var tc=(t1>0&&t2>0)?(t1<t2?t1:t2):(t1>0?t1:(t2>0?t2:0)); tHit=CL(tc,0,P.leadCap);} else {var d=H(rx,ry); tHit=CL(d/8,0,P.leadCap);} }
    aimX=tgt.x+vx*(P.leadW)*tHit; aimY=tgt.y+vy*(P.leadW)*tHit; }
    var jitterSeed=(S.tick*13 + ((tank.x*97+tank.y*131)|0) + 0*17)%23 - 11; var jitter=jitterSeed*P.jitter*0.07 + (P.bias||0)*0.02; tank.fire(D(aimX-tank.x,aimY-tank.y)+jitter); S.last={x:tgt.x,y:tgt.y};
  }
  // movement helper
  var moved=0; function go(a){ if(moved>20) return true; moved++; return tank.move(N(a)); }
  // 3) bullet avoidance scoring
  var hot=null,score=1e18; for(var bi=0;bi<bulletInfo.length;bi++){var b=bulletInfo[bi]; var dx=b.x-tank.x,dy=b.y-tank.y; var v=H(b.vx,b.vy)||1; var nx=b.vx/v,ny=b.vy/v; var proj=dx*nx+dy*ny; if(proj>0){var px=b.x-proj*nx, py=b.y-proj*ny; var dist=H(px-tank.x,py-tank.y); var tt=proj/v; var s=dist + tt*P.threatH; if(dist<P.threatR && s<score){score=s; hot=b;}}}
  if(hot){ var ba=D(hot.vx,hot.vy); var sideBias=(S.side||1)*16 + (P.bias||0)*0.5; var c=[ba+90+sideBias,ba-90-sideBias,ba+120,ba-120,ba+70,ba-70,ba+150,ba-150];
    function risk(a){ var r=0; var rad=a*Math.PI/180; var nx=tank.x+Math.cos(rad)*tank.speed, ny=tank.y+Math.sin(rad)*tank.speed; for(var i=0;i<bulletInfo.length;i++){var b=bulletInfo[i]; var dx=b.x-nx, dy=b.y-ny; var v=H(b.vx,b.vy)||1; var ux=b.vx/v,uy=b.vy/v; var pj=dx*ux+dy*uy; if(pj<=0) continue; var px=b.x-pj*ux, py=b.y-pj*uy; var ds=H(px-nx,py-ny); var tt=pj/v; if(ds>P.threatR) continue; r += (1/(1+ds)) + tt*0.002*P.threatH; } if(nx<P.edge||nx>900-P.edge||ny<P.edge||ny>600-P.edge) r+=0.5; var cx=Math.abs(450-nx)/450, cy=Math.abs(300-ny)/300; r+=P.centerBias*(cx+cy); return r; }
    c.sort(function(a,b){return risk(a)-risk(b);}); for(var j=0;j<c.length;j++){ if(go(c[j])) return; }
  }
  // 4) edge avoidance
  if(tank.x<P.edge){ if(go(0)) return; }
  if(tank.x>900-P.edge){ if(go(180)) return; }
  if(tank.y<P.edge){ if(go(90)) return; }
  if(tank.y>600-P.edge){ if(go(270)) return; }
  // 5) ally separation
  var near=null, ad=1e18; for(var ai=0;ai<allies.length;ai++){var a=allies[ai]; if(a.distance<ad){ad=a.distance; near=a;}} if(near && ad<P.sep){ var away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+16)) return; if(go(away-16)) return; }
  // 6) range control and strafing
  if(tgt){ var to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; var r0=P.rMin, r1=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(120,r0-P.aggrIn); r1=Math.max(160,r1-P.aggrOut); }
    if(d<r0){ var aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+14)) return; if(go(aw-14)) return; }
    else if(d>r1){ if(go(to)) return; if(go(to+12)) return; if(go(to-12)) return; }
    else { if((S.tick-(S.flipTick||0))>P.flipEvery){ S.side=-S.side; S.flipTick=S.tick; } var s=to + (S.side*P.strafe) + (P.bias||0)*0.5; if(go(s)) return; if(go(s+14)) return; if(go(s-14)) return; }
  }
  // 7) fallback sweep
  var sw=[0,60,120,180,240,300]; for(var q=0;q<sw.length;q++){ if(go(sw[q]+(P.bias||0))) return; }
}

// ===== 다음 로봇 =====

function name(){return "HYDRA-T2";}
function type(){return Type.TANKER;}
let __H1 = {tick:0,last:null,lastVel:null,side:1,flipTick:0};
function update(tank,enemies,allies,bulletInfo){
  var H=Math.hypot;function D(x,y){return Math.atan2(y,x)*180/Math.PI;}function N(a){a%=360; if(a<0)a+=360; return a;}function CL(v,l,h){return v<l?l:v>h?h:v;}
  var P={rMin:187.47,rMax:298.7,strafe:24.65,edge:57.5,sep:84.1,threatR:252.16,threatH:4.98,leadCap:20.29,leadW:1.05,jitter:0.13,healthW:1.3,distW:0.1,finisherHP:26.13,aggrRemain:2.76,aggrIn:29.51,aggrOut:19.04,bias:6.32,flipEvery:98.39,centerBias:0.05};
  var S=__H1; S.tick=(S.tick||0)+1;
  var tgt=null,best=1e18; for(var i=0;i<enemies.length;i++){var e=enemies[i]; var tW=(e.health<40?0.9:1.0); var key=e.health*(P.healthW*tW)+e.distance*(P.distW)+i*0.0003; if(key<best){best=key;tgt=e;}}
  if(tgt){var aimX=tgt.x,aimY=tgt.y,vx=0,vy=0; if(S.last){var lvx=S.lastVel?S.lastVel.vx:0,lvy=S.lastVel?S.lastVel.vy:0; var ivx=(tgt.x-S.last.x),ivy=(tgt.y-S.last.y); vx=lvx*0.55+ivx*0.45; vy=lvy*0.55+ivy*0.45; S.lastVel={vx:vx,vy:vy}; var rx=tgt.x-tank.x, ry=tgt.y-tank.y; var s2=64; var aa=vx*vx+vy*vy-s2; var bb=2*(rx*vx+ry*vy); var cc=rx*rx+ry*ry; var tHit=0; if(Math.abs(aa)<1e-6){tHit=bb!==0?CL(-cc/bb,0,P.leadCap):0;} else {var disc=bb*bb-4*aa*cc; if(disc>=0){var sd=Math.sqrt(disc); var t1=(-bb-sd)/(2*aa),t2=(-bb+sd)/(2*aa); var tc=(t1>0&&t2>0)?(t1<t2?t1:t2):(t1>0?t1:(t2>0?t2:0)); tHit=CL(tc,0,P.leadCap);} else {var d=H(rx,ry); tHit=CL(d/8,0,P.leadCap);} }
    aimX=tgt.x+vx*(P.leadW)*tHit; aimY=tgt.y+vy*(P.leadW)*tHit; }
    var jitterSeed=(S.tick*13 + ((tank.x*97+tank.y*131)|0) + 1*17)%23 - 11; var jitter=jitterSeed*P.jitter*0.07 + (P.bias||0)*0.02; tank.fire(D(aimX-tank.x,aimY-tank.y)+jitter); S.last={x:tgt.x,y:tgt.y};
  }
  var moved=0; function go(a){ if(moved>20) return true; moved++; return tank.move(N(a)); }
  var hot=null,score=1e18; for(var bi=0;bi<bulletInfo.length;bi++){var b=bulletInfo[bi]; var dx=b.x-tank.x,dy=b.y-tank.y; var v=H(b.vx,b.vy)||1; var nx=b.vx/v,ny=b.vy/v; var proj=dx*nx+dy*ny; if(proj>0){var px=b.x-proj*nx, py=b.y-proj*ny; var dist=H(px-tank.x,py-tank.y); var tt=proj/v; var s=dist + tt*P.threatH; if(dist<P.threatR && s<score){score=s; hot=b;}}}
  if(hot){ var ba=D(hot.vx,hot.vy); var sideBias=(S.side||1)*16 + (P.bias||0)*0.5; var c=[ba+90+sideBias,ba-90-sideBias,ba+120,ba-120,ba+70,ba-70,ba+150,ba-150]; function risk(a){ var r=0; var rad=a*Math.PI/180; var nx=tank.x+Math.cos(rad)*tank.speed, ny=tank.y+Math.sin(rad)*tank.speed; for(var i=0;i<bulletInfo.length;i++){var b=bulletInfo[i]; var dx=b.x-nx, dy=b.y-ny; var v=H(b.vx,b.vy)||1; var ux=b.vx/v,uy=b.vy/v; var pj=dx*ux+dy*uy; if(pj<=0) continue; var px=b.x-pj*ux, py=b.y-pj*uy; var ds=H(px-nx,py-ny); var tt=pj/v; if(ds>P.threatR) continue; r += (1/(1+ds)) + tt*0.002*P.threatH; } if(nx<P.edge||nx>900-P.edge||ny<P.edge||ny>600-P.edge) r+=0.5; var cx=Math.abs(450-nx)/450, cy=Math.abs(300-ny)/300; r+=P.centerBias*(cx+cy); return r; } c.sort(function(a,b){return risk(a)-risk(b);}); for(var j=0;j<c.length;j++){ if(go(c[j])) return; } }
  if(tank.x<P.edge){ if(go(0)) return; } if(tank.x>900-P.edge){ if(go(180)) return; } if(tank.y<P.edge){ if(go(90)) return; } if(tank.y>600-P.edge){ if(go(270)) return; }
  var near=null, ad=1e18; for(var ai=0;ai<allies.length;ai++){var a=allies[ai]; if(a.distance<ad){ad=a.distance; near=a;}} if(near && ad<P.sep){ var away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+14)) return; if(go(away-14)) return; }
  if(tgt){ var to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; var r0=P.rMin, r1=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(120,r0-P.aggrIn); r1=Math.max(160,r1-P.aggrOut); }
    if(d<r0){ var aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+12)) return; if(go(aw-12)) return; }
    else if(d>r1){ if(go(to)) return; if(go(to+10)) return; if(go(to-10)) return; }
    else { if((S.tick-(S.flipTick||0))>P.flipEvery){ S.side=-S.side; S.flipTick=S.tick; } var s=to + (S.side*P.strafe) + (P.bias||0)*0.5; if(go(s)) return; if(go(s+12)) return; if(go(s-12)) return; }
  }
  var sw=[0,60,120,180,240,300]; for(var q=0;q<sw.length;q++){ if(go(sw[q]+(P.bias||0))) return; }
}

// ===== 다음 로봇 =====

function name(){return "HYDRA-T3";}
function type(){return Type.TANKER;}
let __H2 = {tick:0,last:null,lastVel:null,side:-1,flipTick:0};
function update(tank,enemies,allies,bulletInfo){
  var H=Math.hypot;function D(x,y){return Math.atan2(y,x)*180/Math.PI;}function N(a){a%=360; if(a<0)a+=360; return a;}function CL(v,l,h){return v<l?l:v>h?h:v;}
  var P={rMin:186.78,rMax:297.38,strafe:19,edge:54.82,sep:80.42,threatR:232,threatH:5.34,leadCap:20.98,leadW:1.02,jitter:0.11,healthW:1.32,distW:0.09,finisherHP:31.27,aggrRemain:2.8,aggrIn:28.47,aggrOut:23.25,bias:0,flipEvery:102.92,centerBias:0.05};
  var S=__H2; S.tick=(S.tick||0)+1;
  var tgt=null,best=1e18; for(var i=0;i<enemies.length;i++){var e=enemies[i]; var tW=(e.health<40?0.9:1.0); var key=e.health*(P.healthW*tW)+e.distance*(P.distW)+i*0.0003; if(key<best){best=key;tgt=e;}}
  if(tgt){var aimX=tgt.x,aimY=tgt.y,vx=0,vy=0; if(S.last){var lvx=S.lastVel?S.lastVel.vx:0,lvy=S.lastVel?S.lastVel.vy:0; var ivx=(tgt.x-S.last.x),ivy=(tgt.y-S.last.y); vx=lvx*0.55+ivx*0.45; vy=lvy*0.55+ivy*0.45; S.lastVel={vx:vx,vy:vy}; var rx=tgt.x-tank.x, ry=tgt.y-tank.y; var s2=64; var aa=vx*vx+vy*vy-s2; var bb=2*(rx*vx+ry*vy); var cc=rx*rx+ry*ry; var tHit=0; if(Math.abs(aa)<1e-6){tHit=bb!==0?CL(-cc/bb,0,P.leadCap):0;} else {var disc=bb*bb-4*aa*cc; if(disc>=0){var sd=Math.sqrt(disc); var t1=(-bb-sd)/(2*aa),t2=(-bb+sd)/(2*aa); var tc=(t1>0&&t2>0)?(t1<t2?t1:t2):(t1>0?t1:(t2>0?t2:0)); tHit=CL(tc,0,P.leadCap);} else {var d=H(rx,ry); tHit=CL(d/8,0,P.leadCap);} }
    aimX=tgt.x+vx*(P.leadW)*tHit; aimY=tgt.y+vy*(P.leadW)*tHit; }
    var jitterSeed=(S.tick*13 + ((tank.x*97+tank.y*131)|0) + 2*17)%23 - 11; var jitter=jitterSeed*P.jitter*0.07 + (P.bias||0)*0.02; tank.fire(D(aimX-tank.x,aimY-tank.y)+jitter); S.last={x:tgt.x,y:tgt.y};
  }
  var moved=0; function go(a){ if(moved>20) return true; moved++; return tank.move(N(a)); }
  var hot=null,score=1e18; for(var bi=0;bi<bulletInfo.length;bi++){var b=bulletInfo[bi]; var dx=b.x-tank.x,dy=b.y-tank.y; var v=H(b.vx,b.vy)||1; var nx=b.vx/v,ny=b.vy/v; var proj=dx*nx+dy*ny; if(proj>0){var px=b.x-proj*nx, py=b.y-proj*ny; var dist=H(px-tank.x,py-tank.y); var tt=proj/v; var s=dist + tt*P.threatH; if(dist<P.threatR && s<score){score=s; hot=b;}}}
  if(hot){ var ba=D(hot.vx,hot.vy); var sideBias=(S.side||1)*16 + (P.bias||0)*0.5; var c=[ba+90+sideBias,ba-90-sideBias,ba+120,ba-120,ba+70,ba-70,ba+150,ba-150]; function risk(a){ var r=0; var rad=a*Math.PI/180; var nx=tank.x+Math.cos(rad)*tank.speed, ny=tank.y+Math.sin(rad)*tank.speed; for(var i=0;i<bulletInfo.length;i++){var b=bulletInfo[i]; var dx=b.x-nx, dy=b.y-ny; var v=H(b.vx,b.vy)||1; var ux=b.vx/v,uy=b.vy/v; var pj=dx*ux+dy*uy; if(pj<=0) continue; var px=b.x-pj*ux, py=b.y-pj*uy; var ds=H(px-nx,py-ny); var tt=pj/v; if(ds>P.threatR) continue; r += (1/(1+ds)) + tt*0.002*P.threatH; } if(nx<P.edge||nx>900-P.edge||ny<P.edge||ny>600-P.edge) r+=0.5; var cx=Math.abs(450-nx)/450, cy=Math.abs(300-ny)/300; r+=P.centerBias*(cx+cy); return r; } c.sort(function(a,b){return risk(a)-risk(b);}); for(var j=0;j<c.length;j++){ if(go(c[j])) return; } }
  if(tank.x<P.edge){ if(go(0)) return; } if(tank.x>900-P.edge){ if(go(180)) return; } if(tank.y<P.edge){ if(go(90)) return; } if(tank.y>600-P.edge){ if(go(270)) return; }
  var near=null, ad=1e18; for(var ai=0;ai<allies.length;ai++){var a=allies[ai]; if(a.distance<ad){ad=a.distance; near=a;}} if(near && ad<P.sep){ var away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+12)) return; if(go(away-12)) return; }
  if(tgt){ var to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; var r0=P.rMin, r1=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(120,r0-P.aggrIn); r1=Math.max(160,r1-P.aggrOut); }
    if(d<r0){ var aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+12)) return; if(go(aw-12)) return; }
    else if(d>r1){ if(go(to)) return; if(go(to+10)) return; if(go(to-10)) return; }
    else { if((S.tick-(S.flipTick||0))>P.flipEvery){ S.side=-S.side; S.flipTick=S.tick; } var s=to + (S.side*P.strafe) + (P.bias||0)*0.5; if(go(s)) return; if(go(s+12)) return; if(go(s-12)) return; }
  }
  var sw=[0,60,120,180,240,300]; for(var q=0;q<sw.length;q++){ if(go(sw[q]+(P.bias||0))) return; }
}

// ===== 다음 로봇 =====

function name(){return "HYDRA-D1";}
function type(){return Type.DEALER;}
let __H3 = {tick:0,last:null,lastVel:null,side:1,flipTick:0};
function update(tank,enemies,allies,bulletInfo){
  var H=Math.hypot;function D(x,y){return Math.atan2(y,x)*180/Math.PI;}function N(a){a%=360; if(a<0)a+=360; return a;}function CL(v,l,h){return v<l?l:v>h?h:v;}
  var P={rMin:206.06,rMax:388.45,strafe:26.91,edge:74.79,sep:95.48,threatR:244.08,threatH:6.4,leadCap:25.28,leadW:1.06,jitter:0.11,healthW:1.15,distW:0.11,finisherHP:25.53,aggrRemain:2.11,aggrIn:24.5,aggrOut:18.54,bias:9.36,flipEvery:84.96,centerBias:0.04};
  var S=__H3; S.tick=(S.tick||0)+1;
  var tgt=null,best=1e18; for(var i=0;i<enemies.length;i++){var e=enemies[i]; var key=e.health*(P.healthW)+e.distance*(P.distW)+ (i*0.0002); if(key<best){best=key;tgt=e;}}
  if(tgt){var aimX=tgt.x,aimY=tgt.y,vx=0,vy=0; if(S.last){var lvx=S.lastVel?S.lastVel.vx:0,lvy=S.lastVel?S.lastVel.vy:0; var ivx=(tgt.x-S.last.x),ivy=(tgt.y-S.last.y); vx=lvx*0.5+ivx*0.5; vy=lvy*0.5+ivy*0.5; S.lastVel={vx:vx,vy:vy}; var rx=tgt.x-tank.x, ry=tgt.y-tank.y; var s2=64; var aa=vx*vx+vy*vy-s2; var bb=2*(rx*vx+ry*vy); var cc=rx*rx+ry*ry; var tHit=0; if(Math.abs(aa)<1e-6){tHit=bb!==0?CL(-cc/bb,0,P.leadCap):0;} else {var disc=bb*bb-4*aa*cc; if(disc>=0){var sd=Math.sqrt(disc); var t1=(-bb-sd)/(2*aa),t2=(-bb+sd)/(2*aa); var tc=(t1>0&&t2>0)?(t1<t2?t1:t2):(t1>0?t1:(t2>0?t2:0)); tHit=CL(tc,0,P.leadCap);} else {var d=H(rx,ry); tHit=CL(d/8,0,P.leadCap);} }
    aimX=tgt.x+vx*(P.leadW)*tHit; aimY=tgt.y+vy*(P.leadW)*tHit; }
    var jitterSeed=(S.tick*13 + ((tank.x*97+tank.y*131)|0) + 3*17)%23 - 11; var jitter=jitterSeed*P.jitter*0.06 + (P.bias||0)*0.02; tank.fire(D(aimX-tank.x,aimY-tank.y)+jitter); S.last={x:tgt.x,y:tgt.y};
  }
  var moved=0; function go(a){ if(moved>20) return true; moved++; return tank.move(N(a)); }
  var hot=null,score=1e18; for(var bi=0;bi<bulletInfo.length;bi++){var b=bulletInfo[bi]; var dx=b.x-tank.x,dy=b.y-tank.y; var v=H(b.vx,b.vy)||1; var nx=b.vx/v,ny=b.vy/v; var proj=dx*nx+dy*ny; if(proj>0){var px=b.x-proj*nx, py=b.y-proj*ny; var dist=H(px-tank.x,py-tank.y); var tt=proj/v; var s=dist + tt*P.threatH; if(dist<P.threatR && s<score){score=s; hot=b;}}}
  if(hot){ var ba=D(hot.vx,hot.vy); var sideBias=(S.side||1)*18 + (P.bias||0)*0.5; var c=[ba+90+sideBias,ba-90-sideBias,ba+120,ba-120,ba+70,ba-70,ba+150,ba-150]; function risk(a){ var r=0; var rad=a*Math.PI/180; var nx=tank.x+Math.cos(rad)*tank.speed, ny=tank.y+Math.sin(rad)*tank.speed; for(var i=0;i<bulletInfo.length;i++){var b=bulletInfo[i]; var dx=b.x-nx, dy=b.y-ny; var v=H(b.vx,b.vy)||1; var ux=b.vx/v,uy=b.vy/v; var pj=dx*ux+dy*uy; if(pj<=0) continue; var px=b.x-pj*ux, py=b.y-pj*uy; var ds=H(px-nx,py-ny); var tt=pj/v; if(ds>P.threatR) continue; r += (1/(1+ds)) + tt*0.002*P.threatH; } if(nx<P.edge||nx>900-P.edge||ny<P.edge||ny>600-P.edge) r+=0.6; var cx=Math.abs(450-nx)/450, cy=Math.abs(300-ny)/300; r+=P.centerBias*(cx+cy); return r; } c.sort(function(a,b){return risk(a)-risk(b);}); for(var j=0;j<c.length;j++){ if(go(c[j])) return; } }
  if(tank.x<P.edge){ if(go(0)) return; } if(tank.x>900-P.edge){ if(go(180)) return; } if(tank.y<P.edge){ if(go(90)) return; } if(tank.y>600-P.edge){ if(go(270)) return; }
  var near=null, ad=1e18; for(var ai=0;ai<allies.length;ai++){var a=allies[ai]; if(a.distance<ad){ad=a.distance; near=a;}} if(near && ad<P.sep){ var away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+12)) return; if(go(away-12)) return; }
  if(tgt){ var to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; var r0=P.rMin, r1=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(160,r0-P.aggrIn); r1=Math.max(220,r1-P.aggrOut); }
    if(d<r0){ var aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+12)) return; if(go(aw-12)) return; }
    else if(d>r1){ if(go(to)) return; if(go(to+10)) return; if(go(to-10)) return; }
    else { if((S.tick-(S.flipTick||0))>P.flipEvery){ S.side=-S.side; S.flipTick=S.tick; } var s=to + (S.side*P.strafe) + (P.bias||0)*0.6; if(go(s)) return; if(go(s+12)) return; if(go(s-12)) return; }
  }
  var sw=[0,60,120,180,240,300]; for(var q=0;q<sw.length;q++){ if(go(sw[q]+(P.bias||0))) return; }
}

// ===== 다음 로봇 =====

function name(){return "HYDRA-D2";}
function type(){return Type.DEALER;}
let __H4 = {tick:0,last:null,lastVel:null,side:-1,flipTick:0};
function update(tank,enemies,allies,bulletInfo){
  var H=Math.hypot;function D(x,y){return Math.atan2(y,x)*180/Math.PI;}function N(a){a%=360; if(a<0)a+=360; return a;}function CL(v,l,h){return v<l?l:v>h?h:v;}
  var P={rMin:223.49,rMax:341.84,strafe:30.67,edge:71.47,sep:97.61,threatR:240.65,threatH:5.72,leadCap:24.99,leadW:1.13,jitter:0.1,healthW:1.21,distW:0.11,finisherHP:25.11,aggrRemain:2.12,aggrIn:24.75,aggrOut:19.28,bias:-7.66,flipEvery:89.68,centerBias:0.04};
  var S=__H4; S.tick=(S.tick||0)+1;
  var tgt=null,best=1e18; for(var i=0;i<enemies.length;i++){var e=enemies[i]; var key=e.health*(P.healthW)+e.distance*(P.distW)+ (i*0.0002); if(key<best){best=key;tgt=e;}}
  if(tgt){var aimX=tgt.x,aimY=tgt.y,vx=0,vy=0; if(S.last){var lvx=S.lastVel?S.lastVel.vx:0,lvy=S.lastVel?S.lastVel.vy:0; var ivx=(tgt.x-S.last.x),ivy=(tgt.y-S.last.y); vx=lvx*0.5+ivx*0.5; vy=lvy*0.5+ivy*0.5; S.lastVel={vx:vx,vy:vy}; var rx=tgt.x-tank.x, ry=tgt.y-tank.y; var s2=64; var aa=vx*vx+vy*vy-s2; var bb=2*(rx*vx+ry*vy); var cc=rx*rx+ry*ry; var tHit=0; if(Math.abs(aa)<1e-6){tHit=bb!==0?CL(-cc/bb,0,P.leadCap):0;} else {var disc=bb*bb-4*aa*cc; if(disc>=0){var sd=Math.sqrt(disc); var t1=(-bb-sd)/(2*aa),t2=(-bb+sd)/(2*aa); var tc=(t1>0&&t2>0)?(t1<t2?t1:t2):(t1>0?t1:(t2>0?t2:0)); tHit=CL(tc,0,P.leadCap);} else {var d=H(rx,ry); tHit=CL(d/8,0,P.leadCap);} }
    aimX=tgt.x+vx*(P.leadW)*tHit; aimY=tgt.y+vy*(P.leadW)*tHit; }
    var jitterSeed=(S.tick*13 + ((tank.x*97+tank.y*131)|0) + 4*17)%23 - 11; var jitter=jitterSeed*P.jitter*0.06 + (P.bias||0)*0.02; tank.fire(D(aimX-tank.x,aimY-tank.y)+jitter); S.last={x:tgt.x,y:tgt.y};
  }
  var moved=0; function go(a){ if(moved>20) return true; moved++; return tank.move(N(a)); }
  var hot=null,score=1e18; for(var bi=0;bi<bulletInfo.length;bi++){var b=bulletInfo[bi]; var dx=b.x-tank.x,dy=b.y-tank.y; var v=H(b.vx,b.vy)||1; var nx=b.vx/v,ny=b.vy/v; var proj=dx*nx+dy*ny; if(proj>0){var px=b.x-proj*nx, py=b.y-proj*ny; var dist=H(px-tank.x,py-tank.y); var tt=proj/v; var s=dist + tt*P.threatH; if(dist<P.threatR && s<score){score=s; hot=b;}}}
  if(hot){ var ba=D(hot.vx,hot.vy); var sideBias=(S.side||1)*18 + (P.bias||0)*0.5; var c=[ba+90+sideBias,ba-90-sideBias,ba+120,ba-120,ba+70,ba-70,ba+150,ba-150]; function risk(a){ var r=0; var rad=a*Math.PI/180; var nx=tank.x+Math.cos(rad)*tank.speed, ny=tank.y+Math.sin(rad)*t ank.speed; for(var i=0;i<bulletInfo.length;i++){var b=bulletInfo[i]; var dx=b.x-nx, dy=b.y-ny; var v=H(b.vx,b.vy)||1; var ux=b.vx/v,uy=b.vy/v; var pj=dx*ux+dy*uy; if(pj<=0) continue; var px=b.x-pj*ux, py=b.y-pj*uy; var ds=H(px-nx,py-ny); var tt=pj/v; if(ds>P.threatR) continue; r += (1/(1+ds)) + tt*0.002*P.threatH; } if(nx<P.edge||nx>900-P.edge||ny<P.edge||ny>600-P.edge) r+=0.6; var cx=Math.abs(450-nx)/450, cy=Math.abs(300-ny)/300; r+=P.centerBias*(cx+cy); return r; } c.sort(function(a,b){return risk(a)-risk(b);}); for(var j=0;j<c.length;j++){ if(go(c[j])) return; } }
  if(tank.x<P.edge){ if(go(0)) return; } if(tank.x>900-P.edge){ if(go(180)) return; } if(tank.y<P.edge){ if(go(90)) return; } if(tank.y>600-P.edge){ if(go(270)) return; }
  var near=null, ad=1e18; for(var ai=0;ai<allies.length;ai++){var a=allies[ai]; if(a.distance<ad){ad=a.distance; near=a;}} if(near && ad<P.sep){ var away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+12)) return; if(go(away-12)) return; }
  if(tgt){ var to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; var r0=P.rMin, r1=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(160,r0-P.aggrIn); r1=Math.max(220,r1-P.aggrOut); }
    if(d<r0){ var aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+12)) return; if(go(aw-12)) return; }
    else if(d>r1){ if(go(to)) return; if(go(to+10)) return; if(go(to-10)) return; }
    else { if((S.tick-(S.flipTick||0))>P.flipEvery){ S.side=-S.side; S.flipTick=S.tick; } var s=to + (S.side*P.strafe) + (P.bias||0)*0.6; if(go(s)) return; if(go(s+12)) return; if(go(s-12)) return; }
  }
  var sw=[0,60,120,180,240,300]; for(var q=0;q<sw.length;q++){ if(go(sw[q]+(P.bias||0))) return; }
}

// ===== 다음 로봇 =====

function name(){return "HYDRA-D3";}
function type(){return Type.DEALER;}
let __H5 = {tick:0,last:null,lastVel:null,side:1,flipTick:0};
function update(tank,enemies,allies,bulletInfo){
  var H=Math.hypot;function D(x,y){return Math.atan2(y,x)*180/Math.PI;}function N(a){a%=360; if(a<0)a+=360; return a;}function CL(v,l,h){return v<l?l:v>h?h:v;}
  var P={rMin:226.48,rMax:386.41,strafe:25.96,edge:66.5,sep:94.13,threatR:246.25,threatH:6.01,leadCap:23.43,leadW:1.02,jitter:0.09,healthW:1.11,distW:0.11,finisherHP:23.8,aggrRemain:1.89,aggrIn:26.32,aggrOut:18.64,bias:0,flipEvery:83.8,centerBias:0.04};
  var S=__H5; S.tick=(S.tick||0)+1;
  var tgt=null,best=1e18; for(var i=0;i<enemies.length;i++){var e=enemies[i]; var key=e.health*(P.healthW)+e.distance*(P.distW)+ (i*0.0002); if(key<best){best=key;tgt=e;}}
  if(tgt){var aimX=tgt.x,aimY=tgt.y,vx=0,vy=0; if(S.last){var lvx=S.lastVel?S.lastVel.vx:0,lvy=S.lastVel?S.lastVel.vy:0; var ivx=(tgt.x-S.last.x),ivy=(tgt.y-S.last.y); vx=lvx*0.5+ivx*0.5; vy=lvy*0.5+ivy*0.5; S.lastVel={vx:vx,vy:vy}; var rx=tgt.x-tank.x, ry=tgt.y-tank.y; var s2=64; var aa=vx*vx+vy*vy-s2; var bb=2*(rx*vx+ry*vy); var cc=rx*rx+ry*ry; var tHit=0; if(Math.abs(aa)<1e-6){tHit=bb!==0?CL(-cc/bb,0,P.leadCap):0;} else {var disc=bb*bb-4*aa*cc; if(disc>=0){var sd=Math.sqrt(disc); var t1=(-bb-sd)/(2*aa),t2=(-bb+sd)/(2*aa); var tc=(t1>0&&t2>0)?(t1<t2?t1:t2):(t1>0?t1:(t2>0?t2:0)); tHit=CL(tc,0,P.leadCap);} else {var d=H(rx,ry); tHit=CL(d/8,0,P.leadCap);} }
    aimX=tgt.x+vx*(P.leadW)*tHit; aimY=tgt.y+vy*(P.leadW)*tHit; }
    var jitterSeed=(S.tick*13 + ((tank.x*97+tank.y*131)|0) + 5*17)%23 - 11; var jitter=jitterSeed*P.jitter*0.06 + (P.bias||0)*0.02; tank.fire(D(aimX-tank.x,aimY-tank.y)+jitter); S.last={x:tgt.x,y:tgt.y};
  }
  var moved=0; function go(a){ if(moved>20) return true; moved++; return tank.move(N(a)); }
  var hot=null,score=1e18; for(var bi=0;bi<bulletInfo.length;bi++){var b=bulletInfo[bi]; var dx=b.x-tank.x,dy=b.y-tank.y; var v=H(b.vx,b.vy)||1; var nx=b.vx/v,ny=b.vy/v; var proj=dx*nx+dy*ny; if(proj>0){var px=b.x-proj*nx, py=b.y-proj*ny; var dist=H(px-tank.x,py-tank.y); var tt=proj/v; var s=dist + tt*P.threatH; if(dist<P.threatR && s<score){score=s; hot=b;}}}
  if(hot){ var ba=D(hot.vx,hot.vy); var sideBias=(S.side||1)*18 + (P.bias||0)*0.5; var c=[ba+90+sideBias,ba-90-sideBias,ba+120,ba-120,ba+70,ba-70,ba+150,ba-150]; function risk(a){ var r=0; var rad=a*Math.PI/180; var nx=tank.x+Math.cos(rad)*tank.speed, ny=tank.y+Math.sin(rad)*tank.speed; for(var i=0;i<bulletInfo.length;i++){var b=bulletInfo[i]; var dx=b.x-nx, dy=b.y-ny; var v=H(b.vx,b.vy)||1; var ux=b.vx/v,uy=b.vy/v; var pj=dx*ux+dy*uy; if(pj<=0) continue; var px=b.x-pj*ux, py=b.y-pj*uy; var ds=H(px-nx,py-ny); var tt=pj/v; if(ds>P.threatR) continue; r += (1/(1+ds)) + tt*0.002*P.threatH; } if(nx<P.edge||nx>900-P.edge||ny<P.edge||ny>600-P.edge) r+=0.6; var cx=Math.abs(450-nx)/450, cy=Math.abs(300-ny)/300; r+=P.centerBias*(cx+cy); return r; } c.sort(function(a,b){return risk(a)-risk(b);}); for(var j=0;j<c.length;j++){ if(go(c[j])) return; } }
  if(tank.x<P.edge){ if(go(0)) return; } if(tank.x>900-P.edge){ if(go(180)) return; } if(tank.y<P.edge){ if(go(90)) return; } if(tank.y>600-P.edge){ if(go(270)) return; }
  var near=null, ad=1e18; for(var ai=0;ai<allies.length;ai++){var a=allies[ai]; if(a.distance<ad){ad=a.distance; near=a;}} if(near && ad<P.sep){ var away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+12)) return; if(go(away-12)) return; }
  if(tgt){ var to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; var r0=P.rMin, r1=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(160,r0-P.aggrIn); r1=Math.max(220,r1-P.aggrOut); }
    if(d<r0){ var aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+12)) return; if(go(aw-12)) return; }
    else if(d>r1){ if(go(to)) return; if(go(to+10)) return; if(go(to-10)) return; }
    else { if((S.tick-(S.flipTick||0))>P.flipEvery){ S.side=-S.side; S.flipTick=S.tick; } var s=to + (S.side*P.strafe) + (P.bias||0)*0.6; if(go(s)) return; if(go(s+12)) return; if(go(s-12)) return; }
  }
  var sw=[0,60,120,180,240,300]; for(var q=0;q<sw.length;q++){ if(go(sw[q]+(P.bias||0))) return; }
}

function name(){return "Helix3-T1";}
function type(){return Type.TANKER;}
var __S_H31={tick:0,last:null,lastVel:null,side:1};
function update(tank,enemies,allies,bulletInfo){
  var S=__S_H31; S.tick=(S.tick||0)+1; if(S.tick%140===0) S.side=-S.side;
  var H=Math.hypot, D=function(x,y){return Math.atan2(y,x)*180/Math.PI;}, N=function(a){a%=360; if(a<0)a+=360; return a;}, CL=function(v,l,h){return v<l?l:v>h?h:v;};
  var P={rMin:191.48,rMax:274.82,strafe:20.86,edge:60.81,sep:87.18,threatR:243.64,threatH:7.28,fleeBias:20.71,aimJitter:0.08,leadCap:20.16,leadW:1.11,finisherHP:29.81,aggrRemain:1.93,aggrIn:21.07,aggrOut:15.84};
  if(!enemies.length) return;
  var tgt=null,best=1e18; for(var i=0;i<enemies.length;i++){ var e=enemies[i]; var key=e.health*1.25 + e.distance*0.10 + i*1e-4; if(key<best){best=key; tgt=e;} }
  if(tgt){ var aimX=tgt.x, aimY=tgt.y, vx=0, vy=0; if(S.last){ var lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0; var ivx=tgt.x-S.last.x, ivy=tgt.y-S.last.y; vx=lvx*0.55+ivx*0.45; vy=lvy*0.55+ivy*0.45; S.lastVel={vx:vx,vy:vy}; var rx=tgt.x-tank.x, ry=tgt.y-tank.y, s2=64; var aa=vx*vx+vy*vy - s2; var bb=2*(rx*vx+ry*vy); var cc=rx*rx+ry*ry; var tHit=0; if(Math.abs(aa)<1e-6){ tHit = bb!==0?CL(-cc/bb,0,P.leadCap):0; } else { var disc=bb*bb-4*aa*cc; if(disc>=0){ var sd=Math.sqrt(disc); var t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); var tc=(t1>0&&t2>0)?(t1<t2?t1:t2):(t1>0?t1:(t2>0?t2:0)); tHit=CL(tc,0,P.leadCap);} else { tHit=CL(H(rx,ry)/8,0,P.leadCap);} } aimX=tgt.x+vx*P.leadW*tHit; aimY=tgt.y+vy*P.leadW*tHit; }
    var jitterSeed=(S.tick*17 + ((tank.x*61+tank.y*73)|0))%23 - 11; var jitter=jitterSeed*P.aimJitter*0.07; tank.fire(D(aimX-tank.x,aimY-tank.y)+jitter); S.last={x:tgt.x,y:tgt.y}; }
  var moved=0; function go(a){ if(moved>20) return true; moved++; return tank.move(N(a)); }
  function risk(a){ var rad=a*Math.PI/180; var nx=tank.x+Math.cos(rad)*tank.speed, ny=tank.y+Math.sin(rad)*tank.speed; var r=0; for(var k=0;k<bulletInfo.length;k++){ var b=bulletInfo[k]; var dx=b.x-nx, dy=b.y-ny; var v=H(b.vx,b.vy)||1; var ux=b.vx/v, uy=b.vy/v; var proj=dx*ux+dy*uy; if(proj<=0) continue; var px=b.x-proj*ux,py=b.y-proj*uy; var dist=H(px-nx,py-ny); var tt=proj/v; if(dist>P.threatR) continue; r += (1/(1+dist)) + tt*0.012; } if(nx<P.edge||nx>900-P.edge||ny<P.edge||ny>600-P.edge) r+=0.7; return r; }
  var hot=null,score=1e18; for(var i2=0;i2<bulletInfo.length;i2++){ var b=bulletInfo[i2]; var dx=b.x-tank.x, dy=b.y-tank.y; var v=H(b.vx,b.vy)||1; var ux=b.vx/v, uy=b.vy/v; var proj=dx*ux+dy*uy; if(proj<=0) continue; var px=b.x-proj*ux,py=b.y-proj*uy; var dist=H(px-tank.x,py-tank.y); var tt=proj/v; if(dist>P.threatR) continue; var s=dist + tt*P.threatH; if(s<score){ score=s; hot=b; } }
  if(hot){ var ba=D(hot.vx,hot.vy); var c=[ba+100+P.fleeBias, ba-100-P.fleeBias, ba+130, ba-130, ba+80, ba-80]; c.sort(function(a,b){return risk(a)-risk(b);}); for(var j=0;j<c.length;j++){ if(go(c[j])) return; } }
  if(tank.x < P.edge){ if(go(0)) return; } if(tank.x > 900-P.edge){ if(go(180)) return; } if(tank.y < P.edge){ if(go(90)) return; } if(tank.y > 600-P.edge){ if(go(270)) return; }
  var near=null, ad=1e18; for(var ai=0;ai<allies.length;ai++){ var a=allies[ai]; if(a.distance<ad){ad=a.distance; near=a;} } if(near && ad<P.sep){ var aw=D(tank.x-near.x, tank.y-near.y); if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; }
  if(tgt){ var dx=tgt.x-tank.x, dy=tgt.y-tank.y, to=D(dx,dy), dist=H(dx,dy); var r0=P.rMin, r1=P.rMax; if(tgt.health<=P.finisherHP || enemies.length<=P.aggrRemain){ r0=Math.max(170,r0-P.aggrIn); r1=Math.max(210,r1-P.aggrOut);} if(dist<r0){ var aw=to+180; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; } else if(dist>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; } else { var side=to+(S.side>0?P.strafe:-P.strafe); if(go(side)) return; if(go(side+12)) return; if(go(side-12)) return; } }
  var sw=[0,60,120,180,240,300]; for(var i3=0;i3<sw.length;i3++){ if(go(sw[i3])) return; }
}

// ===== 다음 로봇 =====

function name(){return "Helix3-T2";}
function type(){return Type.TANKER;}
var __S_H32={tick:0,last:null,lastVel:null,side:-1};
function update(tank,enemies,allies,bulletInfo){
  var S=__S_H32; S.tick=(S.tick||0)+1; if(S.tick%140===0) S.side=-S.side;
  var H=Math.hypot, D=function(x,y){return Math.atan2(y,x)*180/Math.PI;}, N=function(a){a%=360; if(a<0)a+=360; return a;}, CL=function(v,l,h){return v<l?l:v>h?h:v;};
  var P={rMin:185.69,rMax:272.87,strafe:20.76,edge:62.63,sep:86.56,threatR:268.9,threatH:6.71,fleeBias:16.68,aimJitter:0.08,leadCap:20.13,leadW:1.02,finisherHP:25.89,aggrRemain:1.87,aggrIn:22.99,aggrOut:16.14};
  if(!enemies.length) return; var tgt=null,best=1e18; for(var i=0;i<enemies.length;i++){ var e=enemies[i]; var key=e.health*1.25 + e.distance*0.10 + i*1e-4; if(key<best){best=key; tgt=e;} }
  if(tgt){ var aimX=tgt.x, aimY=tgt.y, vx=0, vy=0; if(S.last){ var lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0; var ivx=tgt.x-S.last.x, ivy=tgt.y-S.last.y; vx=lvx*0.55+ivx*0.45; vy=lvy*0.55+ivy*0.45; S.lastVel={vx:vx,vy:vy}; var rx=tgt.x-tank.x, ry=tgt.y-tank.y, s2=64; var aa=vx*vx+vy*vy - s2; var bb=2*(rx*vx+ry*vy); var cc=rx*rx+ry*ry; var tHit=0; if(Math.abs(aa)<1e-6){ tHit=bb!==0?CL(-cc/bb,0,P.leadCap):0; } else { var disc=bb*bb-4*aa*cc; if(disc>=0){ var sd=Math.sqrt(disc); var t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); var tc=(t1>0&&t2>0)?(t1<t2?t1:t2):(t1>0?t1:(t2>0?t2:0)); tHit=CL(tc,0,P.leadCap);} else { tHit=CL(H(rx,ry)/8,0,P.leadCap);} } aimX=tgt.x+vx*P.leadW*tHit; aimY=tgt.y+vy*P.leadW*tHit; }
    var jitterSeed=(S.tick*21 + ((tank.x*59+tank.y*67)|0))%23 - 11; var jitter=jitterSeed*P.aimJitter*0.07; tank.fire(D(aimX-tank.x,aimY-tank.y)+jitter); S.last={x:tgt.x,y:tgt.y}; }
  var moved=0; function go(a){ if(moved>20) return true; moved++; return tank.move(N(a)); }
  function risk(a){ var rad=a*Math.PI/180; var nx=tank.x+Math.cos(rad)*tank.speed, ny=tank.y+Math.sin(rad)*tank.speed; var r=0; for(var k=0;k<bulletInfo.length;k++){ var b=bulletInfo[k]; var dx=b.x-nx, dy=b.y-ny; var v=H(b.vx,b.vy)||1; var ux=b.vx/v, uy=b.vy/v; var proj=dx*ux+dy*uy; if(proj<=0) continue; var px=b.x-proj*ux,py=b.y-proj*uy; var dist=H(px-nx,py-ny); var tt=proj/v; if(dist>P.threatR) continue; r += (1/(1+dist)) + tt*0.012; } if(nx<P.edge||nx>900-P.edge||ny<P.edge||ny>600-P.edge) r+=0.7; return r; }
  var ba=null,score=1e18; for(var i2=0;i2<bulletInfo.length;i2++){ var b=bulletInfo[i2]; var dx=b.x-tank.x, dy=b.y-tank.y; var v=H(b.vx,b.vy)||1; var ux=b.vx/v, uy=b.vy/v; var proj=dx*ux+dy*uy; if(proj<=0) continue; var px=b.x-proj*ux,py=b.y-proj*uy; var dist=H(px-tank.x,py-tank.y); var tt=proj/v; if(dist>P.threatR) continue; var s=dist+tt*P.threatH; if(s<score){ score=s; ba=D(b.vx,b.vy);} }
  if(ba!==null){ var cands=[ba+100+P.fleeBias,ba-100-P.fleeBias,ba+130,ba-130,ba+80,ba-80]; cands.sort(function(a,b){return risk(a)-risk(b);}); for(var j=0;j<cands.length;j++){ if(go(c[j])) return; } }
  if(tank.x < P.edge){ if(go(0)) return; } if(tank.x > 900-P.edge){ if(go(180)) return; } if(tank.y < P.edge){ if(go(90)) return; } if(tank.y > 600-P.edge){ if(go(270)) return; }
  var near=null, ad=1e18; for(var ai=0;ai<allies.length;ai++){ var a=allies[ai]; if(a.distance<ad){ad=a.distance; near=a;} } if(near && ad<P.sep){ var aw=D(tank.x-near.x, tank.y-near.y); if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; }
  if(tgt){ var dx=tgt.x-tank.x, dy=tgt.y-tank.y, to=D(dx,dy), dist=H(dx,dy); var r0=P.rMin, r1=P.rMax; if(tgt.health<=P.finisherHP || enemies.length<=P.aggrRemain){ r0=Math.max(170,r0-P.aggrIn); r1=Math.max(210,r1-P.aggrOut);} if(dist<r0){ var aw=to+180; if(go(aw)) return; } else if(dist>r1){ if(go(to)) return; } else { var side=to+(S.side>0?P.strafe:-P.strafe); if(go(side)) return; if(go(side+12)) return; if(go(side-12)) return; } }
  var sw=[10,70,130,190,250,310]; for(var i3=0;i3<sw.length;i3++){ if(go(sw[i3])) return; }
}

// ===== 다음 로봇 =====

function name(){return "Helix3-N1";}
function type(){return Type.NORMAL;}
var __S_H33={tick:0,last:null,lastVel:null,side:1};
function update(tank,enemies,allies,bulletInfo){
  var S=__S_H33; S.tick=(S.tick||0)+1; if(S.tick%130===0) S.side=-S.side;
  var H=Math.hypot, D=function(x,y){return Math.atan2(y,x)*180/Math.PI;}, N=function(a){a%=360; if(a<0)a+=360; return a;}, CL=function(v,l,h){return v<l?l:v>h?h:v;};
  var P={rMin:199.45,rMax:289.06,strafe:22.57,edge:58.23,sep:69.48,threatR:246.51,threatH:6.22,fleeBias:16.26,aimJitter:0.08,leadCap:18.77,leadW:0.99,finisherHP:23.42,aggrRemain:1.95,aggrIn:21.7,aggrOut:16.52};
  if(!enemies.length) return; var tgt=null,best=1e18; for(var i=0;i<enemies.length;i++){ var e=enemies[i]; var key=e.health*1.2+ e.distance*0.10 + i*1e-4; if(key<best){best=key; tgt=e;} }
  if(tgt){ var aimX=tgt.x, aimY=tgt.y, vx=0, vy=0; if(S.last){ var lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0; var ivx=tgt.x-S.last.x, ivy=tgt.y-S.last.y; vx=lvx*0.55+ivx*0.45; vy=lvy*0.55+ivy*0.45; S.lastVel={vx:vx,vy:vy}; var rx=tgt.x-tank.x, ry=tgt.y-tank.y, s2=64; var aa=vx*vx+vy*vy - s2; var bb=2*(rx*vx+ry*vy); var cc=rx*rx+ry*ry; var tHit=0; if(Math.abs(aa)<1e-6){ tHit=bb!==0?CL(-cc/bb,0,P.leadCap):0; } else { var disc=bb*bb-4*aa*cc; if(disc>=0){ var sd=Math.sqrt(disc); var t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); var tc=(t1>0&&t2>0)?(t1<t2?t1:t2):(t1>0?t1:(t2>0?t2:0)); tHit=CL(tc,0,P.leadCap);} else { tHit=CL(H(rx,ry)/8,0,P.leadCap);} } aimX=tgt.x+vx*P.leadW*tHit; aimY=tgt.y+vy*P.leadW*tHit; }
    var jitterSeed=(S.tick*17 + ((tank.x*53+tank.y*71)|0))%23 - 11; var jitter=jitterSeed*P.aimJitter*0.08; tank.fire(D(aimX-tank.x,aimY-tank.y)+jitter); S.last={x:tgt.x,y:tgt.y}; }
  var moved=0; function go(a){ if(moved>20) return true; moved++; return tank.move(N(a)); }
  function risk(a){ var rad=a*Math.PI/180; var nx=tank.x+Math.cos(rad)*tank.speed, ny=tank.y+Math.sin(rad)*tank.speed; var r=0; for(var k=0;k<bulletInfo.length;k++){ var b=bulletInfo[k]; var dx=b.x-nx, dy=b.y-ny; var v=H(b.vx,b.vy)||1; var ux=b.vx/v, uy=b.vy/v; var proj=dx*ux+dy*uy; if(proj<=0) continue; var px=b.x-proj*ux,py=b.y-proj*uy; var dist=H(px-nx,py-ny); var tt=proj/v; if(dist>P.threatR) continue; r += (1/(1+dist)) + tt*0.010; } if(nx<P.edge||nx>900-P.edge||ny<P.edge||ny>600-P.edge) r+=0.6; return r; }
  var ba=null,score=1e18; for(var i2=0;i2<bulletInfo.length;i2++){ var b=bulletInfo[i2]; var dx=b.x-tank.x, dy=b.y-tank.y; var v=H(b.vx,b.vy)||1; var ux=b.vx/v, uy=b.vy/v; var proj=dx*ux+dy*uy; if(proj<=0) continue; var px=b.x-proj*ux,py=b.y-proj*uy; var dist=H(px-tank.x,py-tank.y); var tt=proj/v; if(dist>P.threatR) continue; var s=dist+tt*P.threatH; if(s<score){ score=s; ba=D(b.vx,b.vy);} }
  if(ba!==null){ var cands=[ba+90+P.fleeBias,ba-90-P.fleeBias,ba+120,ba-120,ba+70,ba-70]; cands.sort(function(a,b){return risk(a)-risk(b);}); for(var j=0;j<cands.length;j++){ if(go(cands[j])) return; } }
  if(tank.x < P.edge){ if(go(0)) return; } if(tank.x > 900-P.edge){ if(go(180)) return; } if(tank.y < P.edge){ if(go(90)) return; } if(tank.y > 600-P.edge){ if(go(270)) return; }
  var near=null, ad=1e18; for(var ai=0;ai<allies.length;ai++){ var a=allies[ai]; if(a.distance<ad){ ad=a.distance; near=a; } } if(near && ad<P.sep){ var aw=D(tank.x-near.x,tank.y-near.y); if(go(aw)) return; if(go(aw+14)) return; if(go(aw-14)) return; }
  var dx=tgt.x-tank.x, dy=tgt.y-tank.y, to=D(dx,dy), dist=H(dx,dy), r0=P.rMin, r1=P.rMax; if(tgt.health<=P.finisherHP || enemies.length<=P.aggrRemain){ r0=Math.max(180,r0-P.aggrIn); r1=Math.max(220,r1-P.aggrOut);} if(dist<r0){ var aw=to+180; if(go(aw)) return; } else if(dist>r1){ if(go(to)) return; } else { var side=to+(S.side>0?P.strafe:-P.strafe); if(go(side)) return; if(go(side+12)) return; if(go(side-12)) return; }
  var sw=[0,60,120,180,240,300]; for(var i3=0;i3<sw.length;i3++){ if(go(sw[i3])) return; }
}

// ===== 다음 로봇 =====

function name(){return "Helix3-D1";}
function type(){return Type.DEALER;}
var __S_H34={tick:0,last:null,lastVel:null,side:-1};
function update(tank,enemies,allies,bulletInfo){
  var S=__S_H34; S.tick=(S.tick||0)+1; if(S.tick%120===0) S.side=-S.side;
  var H=Math.hypot, D=function(x,y){return Math.atan2(y,x)*180/Math.PI;}, N=function(a){a%=360; if(a<0)a+=360; return a;}, CL=function(v,l,h){return v<l?l:v>h?h:v;};
  var P={rMin:219.56,rMax:371.54,strafe:22.79,edge:48.43,sep:66.17,threatR:221.56,threatH:5.33,fleeBias:17.1,aimJitter:0.08,leadCap:15.62,leadW:1.1,finisherHP:22.61,aggrRemain:2.16,aggrIn:19.13,aggrOut:14.68};
  if(!enemies.length) return; var tgt=null,best=1e18; for(var i=0;i<enemies.length;i++){ var e=enemies[i]; var key=e.health*1.25 + e.distance*0.10 + i*2e-4; if(key<best){best=key; tgt=e;} }
  if(tgt){ var aimX=tgt.x, aimY=tgt.y, vx=0, vy=0; if(S.last){ var lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0; var ivx=tgt.x-S.last.x, ivy=tgt.y-S.last.y; vx=lvx*0.5+ivx*0.5; vy=lvy*0.5+ivy*0.5; S.lastVel={vx:vx,vy:vy}; var rx=tgt.x-tank.x, ry=tgt.y-tank.y, s2=64; var aa=vx*vx+vy*vy - s2; var bb=2*(rx*vx+ry*vy); var cc=rx*rx+ry*ry; var tHit=0; if(Math.abs(aa)<1e-6){ tHit=bb!==0?CL(-cc/bb,0,P.leadCap):0; } else { var disc=bb*bb-4*aa*cc; if(disc>=0){ var sd=Math.sqrt(disc); var t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); var tc=(t1>0&&t2>0)?(t1<t2?t1:t2):(t1>0?t1:(t2>0?t2:0)); tHit=CL(tc,0,P.leadCap);} else { tHit=CL(H(rx,ry)/8,0,P.leadCap);} } aimX=tgt.x+vx*P.leadW*tHit; aimY=tgt.y+vy*P.leadW*tHit; }
    var jitterSeed=(S.tick*23 + ((tank.x*67+tank.y*59)|0))%23 - 11; var jitter=jitterSeed*P.aimJitter*0.07; tank.fire(D(aimX-tank.x,aimY-tank.y)+jitter); S.last={x:tgt.x,y:tgt.y}; }
  var moved=0; function go(a){ if(moved>20) return true; moved++; return tank.move(N(a)); }
  function risk(a){ var rad=a*Math.PI/180; var nx=tank.x+Math.cos(rad)*tank.speed, ny=tank.y+Math.sin(rad)*tank.speed; var r=0; for(var k=0;k<bulletInfo.length;k++){ var b=bulletInfo[k]; var dx=b.x-nx, dy=b.y-ny; var v=H(b.vx,b.vy)||1; var ux=b.vx/v, uy=b.vy/v; var proj=dx*ux+dy*uy; if(proj<=0) continue; var px=b.x-proj*ux,py=b.y-proj*uy; var dist=H(px-nx,py-ny); var tt=proj/v; if(dist>P.threatR) continue; r += (1/(1+dist)) + tt*0.010; } if(nx<P.edge||nx>900-P.edge||ny<P.edge||ny>600-P.edge) r+=0.5; return r; }
  var ba=null,score=1e18; for(var i2=0;i2<bulletInfo.length;i2++){ var b=bulletInfo[i2]; var dx=b.x-tank.x, dy=b.y-tank.y; var v=H(b.vx,b.vy)||1; var ux=b.vx/v, uy=b.vy/v; var proj=dx*ux+dy*uy; if(proj<=0) continue; var px=b.x-proj*ux,py=b.y-proj*uy; var dist=H(px-tank.x,py-tank.y); var tt=proj/v; if(dist>P.threatR) continue; var s=dist+tt*P.threatH; if(s<score){ score=s; ba=D(b.vx,b.vy);} }
  if(ba!==null){ var cands=[ba-90-P.fleeBias,ba+90+P.fleeBias,ba-120,ba+120,ba-70,ba+70]; cands.sort(function(a,b){return risk(a)-risk(b);}); for(var j=0;j<cands.length;j++){ if(go(cands[j])) return; } }
  if(tank.x < P.edge){ if(go(0)) return; } if(tank.x > 900-P.edge){ if(go(180)) return; } if(tank.y < P.edge){ if(go(90)) return; } if(tank.y > 600-P.edge){ if(go(270)) return; }
  var near=null, ad=1e18; for(var ai=0;ai<allies.length;ai++){ var a=allies[ai]; if(a.distance<ad){ad=a.distance; near=a;} } if(near && ad<P.sep){ var aw=D(tank.x-near.x,tank.y-near.y); if(go(aw)) return; if(go(aw+14)) return; if(go(aw-14)) return; }
  var dx=tgt.x-tank.x, dy=tgt.y-tank.y, to=D(dx,dy), dist=H(dx,dy), r0=P.rMin, r1=P.rMax; if(tgt.health<=P.finisherHP || enemies.length<=P.aggrRemain){ r0=Math.max(170,r0-P.aggrIn); r1=Math.max(210,r1-P.aggrOut);} if(dist<r0){ var aw=to+180; if(go(aw)) return; } else if(dist>r1){ if(go(to)) return; } else { var side=to+(S.side>0?P.strafe:-P.strafe); if(go(side)) return; if(go(side+12)) return; if(go(side-12)) return; }
  var sw=[20,80,140,200,260,320]; for(var i3=0;i3<sw.length;i3++){ if(go(sw[i3])) return; }
}

// ===== 다음 로봇 =====

function name(){return "Helix3-D2";}
function type(){return Type.DEALER;}
var __S_H35={tick:0,last:null,lastVel:null,side:1};
function update(tank,enemies,allies,bulletInfo){
  var S=__S_H35; S.tick=(S.tick||0)+1; if(S.tick%120===0) S.side=-S.side;
  var H=Math.hypot, D=function(x,y){return Math.atan2(y,x)*180/Math.PI;}, N=function(a){a%=360; if(a<0)a+=360; return a;}, CL=function(v,l,h){return v<l?l:v>h?h:v;};
  var P={rMin:216.26,rMax:362.77,strafe:22.39,edge:55.07,sep:63.82,threatR:243.2,threatH:5.07,fleeBias:13.01,aimJitter:0.08,leadCap:15.49,leadW:1.12,finisherHP:22.03,aggrRemain:2.05,aggrIn:18.69,aggrOut:14.24};
  if(!enemies.length) return; var tgt=null,best=1e18; for(var i=0;i<enemies.length;i++){ var e=enemies[i]; var key=e.health*1.25 + e.distance*0.10 + i*2e-4; if(key<best){best=key; tgt=e;} }
  if(tgt){ var aimX=tgt.x, aimY=tgt.y, vx=0, vy=0; if(S.last){ var lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0; var ivx=tgt.x-S.last.x, ivy=tgt.y-S.last.y; vx=lvx*0.5+ivx*0.5; vy=lvy*0.5+ivy*0.5; S.lastVel={vx:vx,vy:vy}; var rx=tgt.x-tank.x, ry=tgt.y-tank.y, s2=64; var aa=vx*vx+vy*vy - s2; var bb=2*(rx*vx+ry*vy); var cc=rx*rx+ry*ry; var tHit=0; if(Math.abs(aa)<1e-6){ tHit=bb!==0?CL(-cc/bb,0,P.leadCap):0; } else { var disc=bb*bb-4*aa*cc; if(disc>=0){ var sd=Math.sqrt(disc); var t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); var tc=(t1>0&&t2>0)?(t1<t2?t1:t2):(t1>0?t1:(t2>0?t2:0)); tHit=CL(tc,0,P.leadCap);} else { tHit=CL(H(rx,ry)/8,0,P.leadCap);} } aimX=tgt.x+vx*P.leadW*tHit; aimY=tgt.y+vy*P.leadW*tHit; }
    var jitterSeed=(S.tick*21 + ((tank.x*67+tank.y*53)|0))%23 - 11; var jitter=jitterSeed*P.aimJitter*0.07; tank.fire(D(aimX-tank.x,aimY-tank.y)+jitter); S.last={x:tgt.x,y:tgt.y}; }
  var moved=0; function go(a){ if(moved>20) return true; moved++; return tank.move(N(a)); }
  function risk(a){ var rad=a*Math.PI/180; var nx=tank.x+Math.cos(rad)*tank.speed, ny=tank.y+Math.sin(rad)*tank.speed; var r=0; for(var k=0;k<bulletInfo.length;k++){ var b=bulletInfo[k]; var dx=b.x-nx, dy=b.y-ny; var v=H(b.vx,b.vy)||1; var ux=b.vx/v, uy=b.vy/v; var proj=dx*ux+dy*uy; if(proj<=0) continue; var px=b.x-proj*ux,py=b.y-proj*uy; var dist=H(px-nx,py-ny); var tt=proj/v; if(dist>P.threatR) continue; r += (1/(1+dist)) + tt*0.010; } if(nx<P.edge||nx>900-P.edge||ny<P.edge||ny>600-P.edge) r+=0.5; return r; }
  var ba=null,score=1e18; for(var i2=0;i2<bulletInfo.length;i2++){ var b=bulletInfo[i2]; var dx=b.x-tank.x, dy=b.y-tank.y; var v=H(b.vx,b.vy)||1; var ux=b.vx/v, uy=b.vy/v; var proj=dx*ux+dy*uy; if(proj<=0) continue; var px=b.x-proj*ux,py=b.y-proj*uy; var dist=H(px-tank.x,py-tank.y); var tt=proj/v; if(dist>P.threatR) continue; var s=dist+tt*P.threatH; if(s<score){ score=s; ba=D(b.vx,b.vy);} }
  if(ba!==null){ var cands=[ba-90-P.fleeBias,ba+90+P.fleeBias,ba-120,ba+120,ba-70,ba+70]; cands.sort(function(a,b){return risk(a)-risk(b);}); for(var j=0;j<cands.length;j++){ if(go(cands[j])) return; } }
  if(tank.x < P.edge){ if(go(0)) return; } if(tank.x > 900-P.edge){ if(go(180)) return; } if(tank.y < P.edge){ if(go(90)) return; } if(tank.y > 600-P.edge){ if(go(270)) return; }
  var near=null, ad=1e18; for(var ai=0;ai<allies.length;ai++){ var a=allies[ai]; if(a.distance<ad){ad=a.distance; near=a;} } if(near && ad<P.sep){ var aw=D(tank.x-near.x,tank.y-near.y); if(go(aw)) return; if(go(aw+14)) return; if(go(aw-14)) return; }
  var dx=tgt.x-tank.x, dy=tgt.y-tank.y, to=D(dx,dy), dist=H(dx,dy), r0=P.rMin, r1=P.rMax; if(tgt.health<=P.finisherHP || enemies.length<=P.aggrRemain){ r0=Math.max(180,r0-P.aggrIn); r1=Math.max(220,r1-P.aggrOut);} if(dist<r0){ var aw=to+180; if(go(aw)) return; } else if(dist>r1){ if(go(to)) return; } else { var side=to+(S.side>0?P.strafe:-P.strafe); if(go(side)) return; if(go(side+12)) return; if(go(side-12)) return; }
  var sw=[20,80,140,200,260,320]; for(var i3=0;i3<sw.length;i3++){ if(go(sw[i3])) return; }
}


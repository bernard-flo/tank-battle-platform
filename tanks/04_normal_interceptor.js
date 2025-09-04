// Normal Interceptor v1 — 탄 차단 회피, 반격
function name() { return 'Normal Interceptor'; }
function type() { return Type.NORMAL; }

const ST4 = { frames:0 };
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function dist(a,b){const dx=a.x-b.x,dy=a.y-b.y;return Math.hypot(dx,dy);} 
function angleTo(ax,ay,bx,by){return Math.atan2(by-ay,bx-ax);} 
function norm(a){while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;}
function pickTarget(tank,enemies){ if(!enemies||!enemies.length) return null; enemies=enemies.slice(); enemies.sort((a,b)=>{const d1=dist(tank,a),d2=dist(tank,b); if(Math.abs(d1-d2)>5) return d1-d2; const h1=a.hp??100,h2=b.hp??100; if(h1!==h2) return h1-h2; return 0;}); return enemies[0]; }
function scoreBullet(tank,b){ const dx=b.x-tank.x, dy=b.y-tank.y; const d=Math.hypot(dx,dy)+1e-3; const v=Math.hypot(b.vx,b.vy)+1e-3; const approach=-(dx*b.vx+dy*b.vy)/(d*v); return approach*(1/d); }
function mostThreatBullet(tank,bullets){ if(!bullets||!bullets.length) return null; let best=null,score=-1e9; for(const b of bullets){const s=scoreBullet(tank,b); if(s>score){score=s; best=b;}} return best; }
function perpEscape(b){ const a=Math.atan2(b.vy,b.vx); const base=a+(Math.random()<0.5?Math.PI/2:-Math.PI/2); return base + (Math.random()-0.5)*(Math.PI/24); }
function wall(tank,a){ const W=800,H=600,m=26; let r=a; if(tank.x<m) r=0; else if(tank.x>W-m) r=Math.PI; if(tank.y<m) r=Math.PI/2; else if(tank.y>H-m) r=-Math.PI/2; return r; }
function leadAngle(src,dst,vBullet){ const dx=dst.x-src.x, dy=dst.y-src.y; const dvx=dst.vx||0,dvy=dst.vy||0; const A=dvx*dvx+dvy*dvy - vBullet*vBullet, B=2*(dx*dvx+dy*dvy), C=dx*dx+dy*dy; let t=0; const D=B*B-4*A*C; if(Math.abs(A)<1e-6) t=-C/(B||-1); else if(D>=0){const t1=(-B+Math.sqrt(D))/(2*A),t2=(-B-Math.sqrt(D))/(2*A); t=Math.max(t1,t2);} if(!isFinite(t)||t<0) t=0; const tx=dst.x+dvx*t, ty=dst.y+dvy*t; return Math.atan2(ty-src.y, tx-src.x); }

function update(tank,enemies,allies,bulletInfo){
  ST4.frames++; const P=(typeof PARAMS!=='undefined'&&PARAMS)||{}; const BULLET_SPEED=P.bulletSpeed??400; const fireEvery=P.fire_every_frames??5; const evadeWeight=P.evade_weight??1.0;
  const tb=mostThreatBullet(tank,bulletInfo);
  if(tb && evadeWeight>0){ let a=perpEscape(tb); a=wall(tank,a); let ok=tank.move(a); if(!ok){ for(let i=1;i<=5 && !ok;i++){ ok=tank.move(a+i*Math.PI/16)||tank.move(a-i*Math.PI/16);} } }
  else {
    const t=pickTarget(tank,enemies); if(t){ const to=angleTo(tank.x,tank.y,t.x,t.y); let ok=tank.move(to); if(!ok){ for(let i=1;i<=5 && !ok;i++){ ok=tank.move(to+i*Math.PI/16)||tank.move(to-i*Math.PI/16);} } }
  }
  if(ST4.frames%fireEvery===0){ const t=pickTarget(tank,enemies); if(t){ const base=angleTo(tank.x,tank.y,t.x,t.y); let fa=base; try{ const la=leadAngle({x:tank.x,y:tank.y},t,BULLET_SPEED); const delta=norm(la-base); fa=base+clamp(delta,-Math.PI/10,Math.PI/10);}catch(_){} tank.fire(fa);} }
}


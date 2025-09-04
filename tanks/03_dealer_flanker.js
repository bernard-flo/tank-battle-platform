// Dealer Flanker v1 — 측후방 진입, 원운동 오비트, 틈새 사격
function name() { return 'Dealer Flanker'; }
function type() { return Type.DEALER; }

const ST = { frames:0, orbitSign: (Math.random()<0.5?1:-1), radiusPhase:0 };
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function dist(a,b){const dx=a.x-b.x,dy=a.y-b.y;return Math.hypot(dx,dy);} 
function angleTo(ax,ay,bx,by){return Math.atan2(by-ay,bx-ax);} 
function norm(a){while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;}
function leadAngle(src,dst,vBullet){
  const dx=dst.x-src.x, dy=dst.y-src.y; const dvx=dst.vx||0,dvy=dst.vy||0;
  const A=dvx*dvx+dvy*dvy - vBullet*vBullet, B=2*(dx*dvx+dy*dvy), C=dx*dx+dy*dy; let t=0; const D=B*B-4*A*C;
  if(Math.abs(A)<1e-6) t=-C/(B||-1); else if(D>=0){const t1=(-B+Math.sqrt(D))/(2*A), t2=(-B-Math.sqrt(D))/(2*A); t=Math.max(t1,t2);} if(!isFinite(t)||t<0) t=0;
  const tx=dst.x+dvx*t, ty=dst.y+dvy*t; return Math.atan2(ty-src.y, tx-src.x);
}
function pick(enemies,tank){ if(!enemies||!enemies.length) return null; enemies=enemies.slice(); enemies.sort((a,b)=> dist(tank,a)-dist(tank,b)); return enemies[0]; }
function threatBullet(tank,bullets){ if(!bullets||!bullets.length) return null; let best=null,score=-1e9; for(const b of bullets){const dx=b.x-tank.x,dy=b.y-tank.y; const d=Math.hypot(dx,dy)+1e-3; const v=Math.hypot(b.vx,b.vy)+1e-3; const s=-(dx*b.vx+dy*b.vy)/(d*v)*(1/d); if(s>score){score=s; best=b;}} return best; }
function perp(b){ const a=Math.atan2(b.vy,b.vx); return a + (Math.random()<0.5?Math.PI/2:-Math.PI/2); }
function wall(tank,a){ const W=800,H=600,m=24; let r=a; if(tank.x<m) r=0; else if(tank.x>W-m) r=Math.PI; if(tank.y<m) r=Math.PI/2; else if(tank.y>H-m) r=-Math.PI/2; return r; }

function update(tank,enemies,allies,bulletInfo){
  ST.frames++; const P=(typeof PARAMS!=='undefined'&&PARAMS)||{}; const BULLET_SPEED=P.bulletSpeed??400; const baseR=P.orbit_range??220; const jitterR=P.orbit_jitter??40; const orbitDeg=P.orbit_deg??90; const fireEvery=P.fire_every_frames??4;
  const tb=threatBullet(tank,bulletInfo); if(tb){ let a=perp(tb); a=wall(tank,a); let ok=tank.move(a); for(let i=1;i<=5 && !ok;i++){ok=tank.move(a+i*Math.PI/16)||tank.move(a-i*Math.PI/16);} }
  else {
    const t=pick(enemies,tank); if(t){
      const d=dist(tank,t); const desiredR = baseR + Math.sin(ST.frames*0.05)*jitterR; // 반경 파형으로 충돌/벽 회피
      let to=angleTo(tank.x,tank.y,t.x,t.y);
      let moveA = to + ST.orbitSign * (orbitDeg*Math.PI/180);
      // 반경 조절
      if(d>desiredR*1.1) moveA = to; else if(d<desiredR*0.9) moveA = to+Math.PI;
      moveA = wall(tank, moveA);
      let ok=tank.move(moveA); if(!ok){for(let i=1;i<=5 && !ok;i++){ok=tank.move(moveA+i*Math.PI/18)||tank.move(moveA-i*Math.PI/18);}}
    }
  }
  if(ST.frames%fireEvery===0){ const t=pick(enemies,tank); if(t){ const base=angleTo(tank.x,tank.y,t.x,t.y); let fa=base; try{ const la=leadAngle({x:tank.x,y:tank.y},t,BULLET_SPEED); const delta=norm(la-base); fa=base+clamp(delta,-Math.PI/10,Math.PI/10);}catch(_){} tank.fire(fa);} }
}


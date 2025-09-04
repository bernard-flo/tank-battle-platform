// Dealer Sniper v1 — 장거리 정밀 사격, 카이팅, 회피 우선
function name() { return 'Dealer Sniper'; }
function type() { return Type.DEALER; }

const S = { frames: 0, orbitSign: 1 };

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function dist(a,b){const dx=a.x-b.x,dy=a.y-b.y;return Math.hypot(dx,dy);} 
function angleTo(ax,ay,bx,by){return Math.atan2(by-ay,bx-ax);} 
function norm(a){while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;}
function leadAngle(src,dst,vBullet){
  const dx=dst.x-src.x, dy=dst.y-src.y;
  const dvx=dst.vx||0, dvy=dst.vy||0;
  const a=dvx*dvx+dvy*dvy - vBullet*vBullet;
  const b=2*(dx*dvx+dy*dvy);
  const c=dx*dx+dy*dy; let t=0; const disc=b*b-4*a*c;
  if (Math.abs(a)<1e-6) t=-c/(b||-1);
  else if (disc>=0){const t1=(-b+Math.sqrt(disc))/(2*a),t2=(-b-Math.sqrt(disc))/(2*a);t=Math.max(t1,t2);} 
  if(!isFinite(t)||t<0)t=0; const tx=dst.x+dvx*t, ty=dst.y+dvy*t; return Math.atan2(ty-src.y, tx-src.x);
}
function pickTarget(tank,enemies){
  if(!enemies||!enemies.length)return null; const cx=400, cy=300; enemies=enemies.slice();
  enemies.sort((a,b)=>{const d1=dist(tank,a),d2=dist(tank,b); if(Math.abs(d1-d2)>5)return d1-d2; const h1=a.hp??100,h2=b.hp??100; if(h1!==h2)return h1-h2; const c1=Math.hypot(a.x-cx,a.y-cy),c2=Math.hypot(b.x-cx,b.y-cy); return c1-c2;});
  // 체력 낮은 적 우선
  enemies.sort((a,b)=> (a.hp??100)-(b.hp??100));
  return enemies[0];
}
function mostThreatBullet(tank,bullets){
  if(!bullets||!bullets.length)return null; let best=null,score=-Infinity;
  for(const b of bullets){const dx=b.x-tank.x,dy=b.y-tank.y; const d=Math.hypot(dx,dy)+1e-3; const v=Math.hypot(b.vx,b.vy)+1e-3; const approach=-(dx*b.vx+dy*b.vy)/(d*v); const s=approach*(1/d); if(s>score){score=s;best=b;}}
  return best;
}
function perpendicularEscapeAngle(b){const a=Math.atan2(b.vy,b.vx); const base=a+ (Math.random()<0.5? Math.PI/2:-Math.PI/2); return base + (Math.random()-0.5)* (Math.PI/32);}
function wallSlide(tank,a){const W=800,H=600,m=28; let r=a; if(tank.x<m) r=0; else if(tank.x>W-m) r=Math.PI; if(tank.y<m) r=Math.PI/2; else if(tank.y>H-m) r=-Math.PI/2; return r;}

function update(tank,enemies,allies,bulletInfo){
  S.frames++; if(S.frames%600===0) S.orbitSign*=-1; // 가끔 방향 전환
  const P=(typeof PARAMS!=='undefined'&&PARAMS)||{};
  const BULLET_SPEED = P.bulletSpeed ?? 400;
  const ideal = P.ideal_range ?? 360; // 장거리 유지
  const fireEvery = P.fire_every_frames ?? 6;
  const orbitDeg = P.orbit_deg ?? 25;
  const kitePush = P.kite_push ?? 0.9;

  const threat=mostThreatBullet(tank,bulletInfo);
  if(threat){
    let ang=perpendicularEscapeAngle(threat); ang=wallSlide(tank,ang);
    let ok=tank.move(ang); for(let i=1;i<=5 && !ok;i++){ok=tank.move(ang+i*Math.PI/12)||tank.move(ang-i*Math.PI/12);} 
  } else {
    const t=pickTarget(tank,enemies); if(t){
      const d=dist(tank,t); let moveAng=angleTo(tank.x,tank.y,t.x,t.y);
      // 카이팅: 너무 가까우면 반대, 너무 멀면 접근
      if(d<ideal*0.9) moveAng = moveAng+Math.PI; else if(d>ideal*1.1) {/*keep*/}
      // 오비트 섞기
      moveAng += S.orbitSign * (orbitDeg*Math.PI/180);
      moveAng = wallSlide(tank,moveAng);
      let ok=tank.move(moveAng); if(!ok){for(let i=1;i<=5 && !ok;i++){ok=tank.move(moveAng+i*Math.PI/16)||tank.move(moveAng-i*Math.PI/16);}}
    }
  }

  if(S.frames % fireEvery===0){
    const t=pickTarget(tank,enemies); if(t){
      const base=angleTo(tank.x,tank.y,t.x,t.y);
      let fa=base; try{ const la=leadAngle({x:tank.x,y:tank.y},t,BULLET_SPEED); const delta=norm(la-base); fa=base+clamp(delta,-Math.PI/12,Math.PI/12);}catch(_){}
      tank.fire(fa);
    }
  }
}


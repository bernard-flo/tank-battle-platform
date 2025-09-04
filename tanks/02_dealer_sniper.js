// Dealer Sniper — 장거리 정밀 사격, 카이팅, 회피 우선
function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
function dist(ax, ay, bx, by){ const dx=bx-ax, dy=by-ay; return Math.hypot(dx,dy); }
function angleTo(ax, ay, bx, by){ return Math.atan2(by-ay, bx-ax); }
function safeLead(src, dst, bulletSpeed){
  const rx = dst.x - src.x, ry = dst.y - src.y;
  const vx = dst.vx||0, vy = dst.vy||0;
  const a = vx*vx + vy*vy - bulletSpeed*bulletSpeed;
  const b = 2*(rx*vx + ry*vy);
  const c = rx*rx + ry*ry;
  let t=0;
  if (Math.abs(a) < 1e-6){ if (Math.abs(b)>1e-6) t = -c/b; }
  else {
    const disc = b*b - 4*a*c;
    if (disc>=0){ const s=Math.sqrt(disc); const t1=(-b+s)/(2*a), t2=(-b-s)/(2*a); t = Math.min(t1,t2)>0?Math.min(t1,t2):Math.max(t1,t2); if(!isFinite(t)||t<0) t=0; }
  }
  const aimX = dst.x + (dst.vx||0)*t;
  const aimY = dst.y + (dst.vy||0)*t;
  return Math.atan2(aimY - src.y, aimX - src.x);
}
function pickTargetSniper(tank, enemies){
  // 체력 낮음 우선, 그 다음 거리
  let best=null, score=1e9;
  for(const e of enemies||[]){
    const d = dist(tank.x,tank.y,e.x,e.y);
    const hp = e.hp!=null? e.hp: 100;
    const s = hp*0.7 + d*0.3;
    if (s<score){ score=s; best=e; }
  }
  return best;
}
function mostThreatBullet(tank, bullets){
  let best=null, bestScore=-Infinity;
  for(const b of bullets||[]){
    const d = dist(tank.x,tank.y,b.x,b.y)+1e-3;
    const toMeX = tank.x - b.x, toMeY = tank.y - b.y;
    const approach = ((b.vx||0)*toMeX + (b.vy||0)*toMeY)/d;
    const score = approach / d;
    if (score>bestScore){ bestScore=score; best=b; }
  }
  return best;
}

function name(){ return 'Dealer Sniper'; }
function type(){ return Type.DEALER; }

function update(tank, enemies, allies, bulletInfo){
  const BULLET_SPEED = 400;
  const IDEAL_RANGE = 300; // 카이팅 유지 사거리
  const FAR_RANGE = 360;   // 멀어지기 임계
  const NEAR_RANGE = 220;  // 거리 벌리기 임계
  const jitter = (Math.random()-0.5)*0.08;

  // 1) 회피 최우선: 위협탄 수직 회피
  const th = mostThreatBullet(tank, bulletInfo);
  if (th){
    let ang = Math.atan2(th.vy||0, th.vx||0) + (Math.random()<0.5?1:-1)*Math.PI/2;
    for(let i=0;i<10;i++){ if (tank.move(ang)) break; ang += ((i%2?1:-1) * 15*Math.PI/180); }
  }

  // 2) 타겟팅 및 카이팅
  const tgt = pickTargetSniper(tank, enemies||[]);
  if (tgt){
    const d = dist(tank.x,tank.y,tgt.x,tgt.y);
    // 카이팅: 너무 가까우면 멀어지고, 너무 멀면 접근하되 대각으로
    let moveAng;
    if (d < NEAR_RANGE) moveAng = angleTo(tank.x,tank.y,tank.x - (tgt.x - tank.x), tank.y - (tgt.y - tank.y));
    else if (d > FAR_RANGE) moveAng = angleTo(tank.x,tank.y,tgt.x,tgt.y) + (Math.random()<0.5?1:-1)*20*Math.PI/180; 
    else moveAng = angleTo(tank.x,tank.y,tgt.x,tgt.y) + (Math.random()<0.5?1:-1)*90*Math.PI/180; // 큰 오비트
    moveAng += jitter;
    for(let i=0;i<10;i++){ if (tank.move(moveAng)) break; moveAng += ((i%2?1:-1) * 12*Math.PI/180); }

    // 사격: 평균 속도 리드샷
    const ang = safeLead(tank, tgt, BULLET_SPEED) + (Math.random()-0.5)*0.02;
    tank.fire(ang);
  }
}


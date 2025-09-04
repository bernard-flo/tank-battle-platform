// Tanker Guardian — 선두 방패, 팀 중심 유지, 근접 위협 제어
// 유틸리티 (파일 내부 전용)
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function dist(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return Math.hypot(dx, dy); }
function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
function norm(a){ while(a>Math.PI) a-=2*Math.PI; while(a<-Math.PI) a+=2*Math.PI; return a; }
function leadAngle(src, dst, bulletSpeed){
  const rx = dst.x - src.x, ry = dst.y - src.y;
  const vx = dst.vx||0, vy = dst.vy||0;
  const a = vx*vx + vy*vy - bulletSpeed*bulletSpeed;
  const b = 2*(rx*vx + ry*vy);
  const c = rx*rx + ry*ry;
  let t;
  if (Math.abs(a) < 1e-6) {
    t = -c / b; // linear
  } else {
    const disc = b*b - 4*a*c;
    if (disc < 0) return Math.atan2(ry, rx);
    const t1 = (-b + Math.sqrt(disc)) / (2*a);
    const t2 = (-b - Math.sqrt(disc)) / (2*a);
    t = Math.min(t1, t2) > 0 ? Math.min(t1, t2) : Math.max(t1, t2);
  }
  if (!isFinite(t) || t < 0) t = 0;
  const aimX = dst.x + (dst.vx||0)*t;
  const aimY = dst.y + (dst.vy||0)*t;
  return Math.atan2(aimY - src.x2, aimX - src.x1); // fallback guard not used; correct below
}
// 안전한 리드샷 (간단 버전)
function safeLead(src, dst, bulletSpeed){
  const rx = dst.x - src.x, ry = dst.y - src.y;
  const vx = dst.vx||0, vy = dst.vy||0;
  const a = vx*vx + vy*vy - bulletSpeed*bulletSpeed;
  const b = 2*(rx*vx + ry*vy);
  const c = rx*rx + ry*ry;
  let t = 0;
  if (Math.abs(a) < 1e-6) {
    if (Math.abs(b) > 1e-6) t = -c / b; else t = 0;
  } else {
    const disc = b*b - 4*a*c;
    if (disc >= 0) {
      const s = Math.sqrt(disc);
      const t1 = (-b + s) / (2*a);
      const t2 = (-b - s) / (2*a);
      t = Math.min(t1, t2) > 0 ? Math.min(t1, t2) : Math.max(t1, t2);
      if (!isFinite(t) || t < 0) t = 0;
    }
  }
  const aimX = dst.x + vx*t;
  const aimY = dst.y + vy*t;
  return Math.atan2(aimY - src.y, aimX - src.x);
}
function pickTarget(tank, enemies){
  let best=null, score=1e9;
  for (const e of enemies){
    if (!e) continue;
    const d = dist(tank.x, tank.y, e.x, e.y);
    const s = d*0.6 + (e.hp||100)*0.4 + Math.hypot(e.x-400, e.y-300)*0.1;
    if (s < score){ score=s; best=e; }
  }
  return best;
}
function mostThreatBullet(tank, bulletInfo){
  let best=null, bestScore=-Infinity;
  for (const b of bulletInfo||[]){
    const d = dist(tank.x, tank.y, b.x, b.y) + 1e-3;
    const toMeX = tank.x - b.x, toMeY = tank.y - b.y;
    const relSpeed = (b.vx||0)*(toMeX/d) + (b.vy||0)*(toMeY/d); // 접근속도(양수면 접근)
    const score = relSpeed/d;
    if (score > bestScore){ bestScore=score; best=b; }
  }
  return best;
}

function name(){ return 'Tanker Guardian'; }
function type(){ return Type.TANKER; }

function update(tank, enemies, allies, bulletInfo){
  // 기본 파라미터
  const BULLET_SPEED = 400;
  const CENTER_X = 400, CENTER_Y = 300;
  const WALL_MARGIN = 32;
  const jitter = (Math.random()-0.5)*0.1;

  // 1) 우선 회피
  const threat = mostThreatBullet(tank, bulletInfo);
  if (threat){
    const ang = Math.atan2(threat.vy||0, threat.vx||0) + (Math.random()<0.5?1:-1)*Math.PI/2;
    let tryAng = ang;
    for (let i=0;i<10;i++){
      const ok = tank.move(tryAng);
      if (ok) break;
      tryAng += ((i%2?1:-1) * (15*Math.PI/180));
    }
  } else {
    // 팀 중심 유지 (아군 평균으로 보정)
    let cx=CENTER_X, cy=CENTER_Y;
    if (allies && allies.length){
      let sx=0, sy=0, n=0;
      for(const a of allies){ if(!a) continue; sx+=a.x; sy+=a.y; n++; }
      if (n){ cx=sx/n; cy=sy/n; }
    }
    const toCenter = angleTo(tank.x, tank.y, cx, cy) + jitter;
    let moveAng = toCenter;

    // 벽/충돌 방지 재시도
    const nearWall = (tank.x < WALL_MARGIN || tank.x > 800-WALL_MARGIN || tank.y < WALL_MARGIN || tank.y > 600-WALL_MARGIN);
    if (nearWall){
      // 벽과 평행하게 미끄러지기
      if (tank.x < WALL_MARGIN || tank.x > 800-WALL_MARGIN) moveAng = Math.sign(tank.vy||1)>0 ? Math.PI/2 : -Math.PI/2;
      if (tank.y < WALL_MARGIN || tank.y > 600-WALL_MARGIN) moveAng = Math.sign(tank.vx||1)>0 ? 0 : Math.PI;
    }
    for (let i=0;i<10;i++){
      if (tank.move(moveAng)) break;
      moveAng += ((i%2?1:-1) * (12*Math.PI/180));
    }
  }

  // 2) 타겟팅: 최근접 우선, 짧은 리드샷
  const tgt = pickTarget(tank, enemies||[]);
  if (tgt){
    const base = angleTo(tank.x, tank.y, tgt.x, tgt.y);
    const lead = safeLead(tank, tgt, BULLET_SPEED);
    const mix = base*0.6 + lead*0.4 + jitter;
    tank.fire(mix);
  }
}


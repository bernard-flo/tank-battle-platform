// Tanker Guardian v1 — 선두 방패/팀 중심 유지/보스턴 회피/짧은 리드샷
function name() { return 'Tanker Guardian'; }
function type() { return Type.TANKER; }

function update(tank, enemies, allies, bulletInfo) {
  // ===== 유틸 =====
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function dist(ax, ay, bx, by) { const dx = bx-ax, dy = by-ay; return Math.hypot(dx, dy); }
  function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax) * 180 / Math.PI; }
  function normAngle(a){ while(a>180)a-=360; while(a<-180)a+=360; return a; }
  function tryMove(angleDeg) {
    // 실패 시 ±15°씩 보정 재시도 (최대 10회 내)
    const step = 15;
    for (let i=0;i<10;i++) {
      const offs = ((i>>1)+1) * step * (i%2===0?1:-1);
      const ang = angleDeg + (i===0?0:offs);
      if (tank.move(ang)) return true;
    }
    return false;
  }
  function mostCentralEnemyScore(e){
    // 중앙 근접 가중(450,300)
    const dCenter = dist(e.x, e.y, 450, 300);
    return -dCenter;
  }
  function pickTarget() {
    if (enemies.length===0) return null;
    let best = enemies[0];
    function score(e){
      const d = dist(tank.x, tank.y, e.x, e.y);
      return -d + (1000 - e.health)*0.001 + mostCentralEnemyScore(e)*0.0005;
    }
    for (const e of enemies) if (score(e)>score(best)) best = e;
    return best;
  }
  function leadAngle(src, dst, bulletSpeed){
    // 적 속도 불명 → 짧은 리드: 목표각에 소량 랜덤 오프셋
    const base = angleTo(src.x, src.y, dst.x, dst.y);
    const jitter = (Math.random()*2-1)*4; // ±4도
    return base + jitter;
  }
  function evadeFromBullets(){
    if (!bulletInfo || bulletInfo.length===0) return false;
    // 위협 점수: 접근속도 * 역거리
    let best=null, bestScore=-1e9;
    for (const b of bulletInfo){
      const rx = tank.x - b.x, ry = tank.y - b.y;
      const r = Math.hypot(rx, ry)+1e-6;
      const vdot = (b.vx*rx + b.vy*ry) / r; // >0이면 접근
      const score = vdot / r;
      if (score>bestScore){ best=b; bestScore=score; }
    }
    if (!best) return false;
    // 탄 속도 벡터에 수직(±90°)으로 이동, 더 멀어지는 쪽 선택
    const bang = Math.atan2(best.vy, best.vx)*180/Math.PI;
    const a1 = bang + 90, a2 = bang - 90;
    const d1x = Math.cos(a1*Math.PI/180), d1y = Math.sin(a1*Math.PI/180);
    const d2x = Math.cos(a2*Math.PI/180), d2y = Math.sin(a2*Math.PI/180);
    const s1 = d1x*(tank.x-best.x) + d1y*(tank.y-best.y);
    const s2 = d2x*(tank.x-best.x) + d2y*(tank.y-best.y);
    const ang = (s1>s2)?a1:a2;
    return tryMove(ang);
  }

  // ===== 메인 로직 =====
  // 1) 탄 회피 우선
  if (evadeFromBullets()) {
    // 회피 중에도 근접 시 사격
    const tgt = pickTarget();
    if (tgt) tank.fire(leadAngle(tank, tgt, 8));
    return;
  }

  // 2) 팀 중심 유지(선두 방패)
  let cx = tank.x, cy = tank.y;
  if (allies && allies.length>0){
    cx = allies.reduce((s,a)=>s+a.x, 0)/allies.length;
    cy = allies.reduce((s,a)=>s+a.y, 0)/allies.length;
  }
  // 팀 중심과 필드 중심 사이 근방에 위치하도록 약하게 끌림
  const gx = (cx*2 + 450)/3, gy = (cy*2 + 300)/3;

  const target = pickTarget();
  if (target){
    // 근접 위협 각도 제어: 보스턴/각도 조절(짧은 오프셋)
    const desired = angleTo(tank.x, tank.y, target.x, target.y);
    const offset = (Math.random()<0.5? -10: 10);
    tryMove(desired + offset);
    tank.fire(leadAngle(tank, target, 8));
  } else {
    // 타겟 없으면 팀 중심 쪽으로 위치 교정
    const ang = angleTo(tank.x, tank.y, gx, gy);
    tryMove(ang);
  }
}


// Dealer Sniper v1 — 장거리 정밀 사격/카이팅/탄 회피 우선
function name() { return 'Dealer Sniper'; }
function type() { return Type.DEALER; }

function update(tank, enemies, allies, bulletInfo) {
  // ===== 유틸 =====
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function dist(ax, ay, bx, by) { const dx = bx-ax, dy = by-ay; return Math.hypot(dx, dy); }
  function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax) * 180 / Math.PI; }
  function tryMove(angleDeg) {
    const step = 15;
    for (let i=0;i<10;i++){
      const offs = ((i>>1)+1)*step*(i%2===0?1:-1);
      const ang = angleDeg + (i===0?0:offs);
      if (tank.move(ang)) return true;
    }
    return false;
  }
  function pickTarget() {
    if (enemies.length===0) return null;
    // 가장 체력 낮은 적 우선, 동일하면 가까운 순
    return enemies.slice().sort((a,b)=> (a.health-b.health) || (dist(tank.x,tank.y,a.x,a.y)-dist(tank.x,tank.y,b.x,b.y)))[0];
  }
  function leadAngle(src, dst){
    // 평균 속도 기반 근사 → 제공 정보 제한으로 짧은 리드 + 원거리 보정
    const base = angleTo(src.x, src.y, dst.x, dst.y);
    const d = dist(src.x, src.y, dst.x, dst.y);
    const bias = clamp((d-250)/300, 0, 1) * (Math.random()<0.5?-6:6); // 원거리일수록 ±6도까지
    return base + bias;
  }
  function evade(){
    if (!bulletInfo || bulletInfo.length===0) return false;
    let best=null, bestScore=-1e9;
    for (const b of bulletInfo){
      const rx = tank.x - b.x, ry = tank.y - b.y; const r=Math.hypot(rx,ry)+1e-6;
      const vdot = (b.vx*rx + b.vy*ry) / r; // 접근 속도
      const score = vdot / r;
      if (score>bestScore){ best=b; bestScore=score; }
    }
    if (!best) return false;
    const bang = Math.atan2(best.vy, best.vx)*180/Math.PI;
    const a1 = bang + 90, a2 = bang - 90;
    // 더 멀어지는 쪽 선택
    const s = (ang)=>{
      const rad=ang*Math.PI/180; const dx=Math.cos(rad), dy=Math.sin(rad);
      return dx*(tank.x-best.x)+dy*(tank.y-best.y);
    };
    return tryMove(s(a1)>s(a2)?a1:a2);
  }

  // ===== 로직 =====
  if (evade()) { const t=pickTarget(); if (t) tank.fire(leadAngle(tank,t)); return; }

  const target = pickTarget();
  if (!target) return;

  // 장거리 유지(카이팅): 이상 거리 320~420 유지 (난수화)
  const ideal = 370 + (Math.random()*2-1)*50;
  const d = dist(tank.x, tank.y, target.x, target.y);
  const toEnemy = angleTo(tank.x, tank.y, target.x, target.y);
  if (d < ideal*0.85) {
    // 너무 가까우면 반대 방향으로 이탈
    tryMove(toEnemy + 180 + (Math.random()<0.5?-20:20));
  } else if (d > ideal*1.2) {
    // 너무 멀면 접근하되, 옆으로 약간 오비트
    tryMove(toEnemy + (Math.random()<0.5?15:-15));
  } else {
    // 원 궤도 유지 — 넓은 반경 오비트
    tryMove(toEnemy + (Math.random()<0.5?90:-90));
  }

  // 사격 쿨은 엔진에서 처리, 여기선 각 프레임 기회시 정밀 발사 시도
  tank.fire(leadAngle(tank, target));
}


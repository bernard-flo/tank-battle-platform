function name() { return "Tanker Guardian"; }
function type() { return Type.TANKER; }
function update(tank, enemies, allies, bulletInfo) {
  // 유틸리티 (파일 내부 한정)
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function dist(ax, ay, bx, by){ return Math.hypot(ax-bx, ay-by); }
  function angleTo(ax, ay, bx, by){ return Math.atan2(by - ay, bx - ax) * 180/Math.PI; }
  function norm(a){ a%=360; return a<0?a+360:a; }
  function tryMoveDir(dir){
    dir = norm(dir);
    if (tank.move(dir)) return true;
    // 벽/충돌 시 소폭 보정 재시도
    for (let d=10; d<=40; d+=10){
      if (tank.move(norm(dir + d))) return true;
      if (tank.move(norm(dir - d))) return true;
    }
    return false;
  }
  function mostDangerousBullet() {
    let best = null;
    let bestScore = -Infinity;
    for (const b of bulletInfo) {
      const rx = tank.x - b.x, ry = tank.y - b.y;
      const vx = b.vx, vy = b.vy;
      const vv = vx*vx + vy*vy;
      if (vv === 0) continue;
      const t = -(rx*vx + ry*vy)/vv; // 최근접 시점
      if (t < 0) continue; // 멀어지는 탄은 무시
      const cx = rx + vx*t, cy = ry + vy*t;
      const cd = Math.hypot(cx, cy);
      const score = 1000/(1+cd) + 0.5/(1+t);
      if (score > bestScore) { bestScore = score; best = {b, t, cd}; }
    }
    return best;
  }

  // 1) 회피 우선
  const threat = mostDangerousBullet();
  if (threat && threat.cd < (tank.size/2 + 20)) {
    const dir = Math.atan2(threat.b.vy, threat.b.vx) * 180/Math.PI;
    // 탄 궤적 수직 방향으로 이동, 약간의 난수화
    const offset = (Math.random()<0.5? -90: 90) + (Math.random()-0.5)*12;
    tryMoveDir(dir + offset);
  } else if (enemies.length) {
    // 2) 선두 방패: 최근접 적에게 각도 우선 확보(짧은 리드샷)
    let target = enemies[0];
    for (const e of enemies) if (e.distance < target.distance) target = e;

    // 접근: 과도한 근접은 피하고, 탱커답게 중근거리(120~220)
    const desired = clamp(target.distance - 170, -180, 180);
    const dirTo = angleTo(tank.x, tank.y, target.x, target.y);
    const moveDir = desired > 0 ? dirTo : norm(dirTo + 180);
    tryMoveDir(moveDir + (Math.random()-0.5)*10);

    // 짧은 리드샷: 거리 기반 소폭 보정
    const lead = clamp(target.distance/20, -12, 12) * (Math.random()<0.5?1:-1);
    tank.fire(norm(dirTo + lead));
  } else {
    // 대기 중 랜덤 드리프트로 포지션 조정
    tryMoveDir(Math.random()*360);
  }
}


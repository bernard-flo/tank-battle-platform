function name() {
  return 'Dealer Sniper';
}

function type() {
  return Type.DEALER;
}

function update(tank, enemies, allies, bulletInfo) {
  // -------- utils --------
  const toDeg = (r) => r * 180 / Math.PI;
  const norm = (a) => ((a % 360) + 360) % 360;
  const angleTo = (x1, y1, x2, y2) => toDeg(Math.atan2(y2 - y1, x2 - x1));

  function moveSafe(a) {
    a = norm(a);
    if (tank.move(a)) return true;
    for (let d of [15, -15, 30, -30, 60, -60, 90, -90]) {
      if (tank.move(norm(a + d))) return true;
    }
    return false;
  }

  function pickThreatBullet() {
    if (!bulletInfo || bulletInfo.length === 0) return null;
    let best = null, bestScore = -1e9;
    for (const b of bulletInfo) {
      const rx = tank.x - b.x, ry = tank.y - b.y;
      const r = Math.hypot(rx, ry) || 1e-6;
      const rv = (-(b.vx * rx + b.vy * ry) / r);
      if (rv <= 0) continue;
      const score = rv + 150 / (r + 1);
      if (score > bestScore) { bestScore = score; best = b; }
    }
    return best;
  }

  function dodge(b) {
    const ang = toDeg(Math.atan2(b.vy, b.vx));
    const evade = ang + (((tank.x + tank.y) % 100 < 50) ? 90 : -90);
    moveSafe(evade);
  }

  if (!enemies || enemies.length === 0) return;

  // 타겟: 체력 낮은 적 우선 → 거리 보조
  let tgt = enemies[0];
  for (const e of enemies) {
    const better = (e.health < tgt.health - 1) || (e.health === tgt.health && e.distance < tgt.distance);
    if (better) tgt = e;
  }

  const threat = pickThreatBullet();
  if (threat) {
    dodge(threat);
  } else {
    const desired = 300; // 유지 거리
    if (tgt.distance < 220) {
      // 이탈
      moveSafe(norm(angleTo(tank.x, tank.y, tgt.x, tgt.y) + 180));
    } else if (tgt.distance > 340) {
      // 접근
      moveSafe(angleTo(tank.x, tank.y, tgt.x, tgt.y));
    } else {
      // 오비트(완만)
      const base = angleTo(tank.x, tank.y, tgt.x, tgt.y) + 90;
      const jitter = ((Math.floor((tank.x * 3 + tank.y) / 57) % 2) ? 10 : -10);
      moveSafe(base + jitter);
    }
  }

  // 사격: 장거리 조준 + 미세 오프셋
  const f = angleTo(tank.x, tank.y, tgt.x, tgt.y) + (((tank.x ^ tank.y) & 2) ? 1.5 : -1.5);
  tank.fire(norm(f));
}


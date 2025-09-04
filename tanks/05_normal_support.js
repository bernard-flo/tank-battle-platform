function name() {
  return 'Normal Support';
}

function type() {
  return Type.NORMAL;
}

function update(tank, enemies, allies, bulletInfo) {
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

  function threatBullet() {
    if (!bulletInfo || bulletInfo.length === 0) return null;
    let b0 = null, sc = -1e9;
    for (const b of bulletInfo) {
      const rx = tank.x - b.x, ry = tank.y - b.y, r = Math.hypot(rx, ry) || 1e-6;
      const rv = (-(b.vx * rx + b.vy * ry) / r);
      if (rv <= 0) continue;
      const s = rv + 160 / (r + 1);
      if (s > sc) { sc = s; b0 = b; }
    }
    return b0;
  }

  function dodge(b) {
    const ang = toDeg(Math.atan2(b.vy, b.vx));
    const flip = (((tank.x * 13 + tank.y) % 101) < 50) ? 1 : -1;
    moveSafe(ang + 90 * flip);
  }

  // 아군 중심
  let cx = tank.x, cy = tank.y;
  if (allies && allies.length > 0) {
    let sx = tank.x, sy = tank.y, n = 1;
    for (const a of allies) { sx += a.x; sy += a.y; n++; }
    cx = sx / n; cy = sy / n;
  }

  // 타겟: 체력 낮음 → 가까움
  let tgt = null;
  if (enemies && enemies.length > 0) {
    tgt = enemies[0];
    for (const e of enemies) {
      const better = (e.health < tgt.health - 1) || (e.health === tgt.health && e.distance < tgt.distance);
      if (better) tgt = e;
    }
  }

  const th = threatBullet();
  if (th) {
    dodge(th);
  } else {
    const dc = Math.hypot(tank.x - cx, tank.y - cy);
    if (dc > 140) moveSafe(angleTo(tank.x, tank.y, cx, cy));
    else {
      // 팀 중심을 기준으로 완만한 오비트
      const base = angleTo(cx, cy, tank.x, tank.y) + 90;
      moveSafe(base + (((tank.x + tank.y) & 1) ? 10 : -10));
    }
  }

  if (tgt) {
    const f = angleTo(tank.x, tank.y, tgt.x, tgt.y) + (((tank.x ^ tank.y) & 2) ? 1 : -1);
    tank.fire(norm(f));
  }
}


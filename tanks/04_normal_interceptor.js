function name() {
  return 'Normal Interceptor';
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
    for (let d of [15, -15, 35, -35, 55, -55, 85, -85]) {
      if (tank.move(norm(a + d))) return true;
    }
    return false;
  }

  function mostThreat() {
    if (!bulletInfo || bulletInfo.length === 0) return null;
    let best = null, score = -1e9;
    for (const b of bulletInfo) {
      const rx = tank.x - b.x, ry = tank.y - b.y;
      const r = Math.hypot(rx, ry) || 1e-6;
      const rv = (-(b.vx * rx + b.vy * ry) / r);
      if (rv <= 0) continue;
      const lat = Math.abs(b.vx * ry - b.vy * rx) / r;
      const s = rv * 1.4 + 220 / (r + 1) - 0.2 * lat;
      if (s > score) { score = s; best = b; }
    }
    return best;
  }

  function dodge(b) {
    const ang = toDeg(Math.atan2(b.vy, b.vx));
    // 수직 회피 + 미세 요동
    const off = ((Math.floor((tank.x * 5 - tank.y) / 41) % 2) ? 90 : -90);
    moveSafe(ang + off);
  }

  let tgt = null;
  if (enemies && enemies.length > 0) {
    tgt = enemies[0];
    for (const e of enemies) if (e.distance < tgt.distance) tgt = e;
  }

  const th = mostThreat();
  if (th) {
    dodge(th);
  } else if (tgt) {
    // 약한 전진으로 각 잡기
    if (tgt.distance > 200) moveSafe(angleTo(tank.x, tank.y, tgt.x, tgt.y));
    else {
      const base = angleTo(tank.x, tank.y, tgt.x, tgt.y) + 90;
      moveSafe(base + (((tank.x + tank.y) & 1) ? 8 : -8));
    }
  }

  if (tgt) {
    const f = angleTo(tank.x, tank.y, tgt.x, tgt.y) + (((tank.x ^ tank.y) & 1) ? 1 : -1);
    tank.fire(norm(f));
  }
}


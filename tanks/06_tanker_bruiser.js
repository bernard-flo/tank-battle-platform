function name() {
  return 'Tanker Bruiser';
}

function type() {
  return Type.TANKER;
}

function update(tank, enemies, allies, bulletInfo) {
  const toDeg = (r) => r * 180 / Math.PI;
  const norm = (a) => ((a % 360) + 360) % 360;
  const angleTo = (x1, y1, x2, y2) => toDeg(Math.atan2(y2 - y1, x2 - x1));

  function moveSafe(a) {
    a = norm(a);
    if (tank.move(a)) return true;
    for (let d of [15, -15, 30, -30, 60, -60, 90, -90, 120, -120]) {
      if (tank.move(norm(a + d))) return true;
    }
    return false;
  }

  function threatBullet() {
    if (!bulletInfo || bulletInfo.length === 0) return null;
    let best = null, score = -1e9;
    for (const b of bulletInfo) {
      const rx = tank.x - b.x, ry = tank.y - b.y, r = Math.hypot(rx, ry) || 1e-6;
      const rv = (-(b.vx * rx + b.vy * ry) / r);
      if (rv <= 0) continue;
      const s = rv * 1.1 + 180 / (r + 1);
      if (s > score) { score = s; best = b; }
    }
    return best;
  }

  function dodge(b) {
    const ang = toDeg(Math.atan2(b.vy, b.vx));
    // 지그재그 유지: 수직 + 오프셋
    const flip = ((Math.floor((tank.x + 2 * tank.y) / 50) % 2) ? 1 : -1);
    moveSafe(ang + 90 * flip);
  }

  if (!enemies || enemies.length === 0) return;
  let tgt = enemies[0];
  for (const e of enemies) if (e.distance < tgt.distance) tgt = e;

  const th = threatBullet();
  if (th) {
    dodge(th);
  } else {
    const base = angleTo(tank.x, tank.y, tgt.x, tgt.y);
    if (tgt.distance > 160) {
      // 지그재그 전진
      const zig = ((Math.floor((tank.x + tank.y) / 40) % 2) ? 22 : -22);
      moveSafe(base + zig);
    } else {
      // 근접 오비트
      moveSafe(base + (((tank.x * 3 + tank.y) % 100 < 50) ? 90 : -90));
    }
  }

  const f = angleTo(tank.x, tank.y, tgt.x, tgt.y) + (((tank.x ^ tank.y) & 1) ? 2 : -2);
  tank.fire(norm(f));
}


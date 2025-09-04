function name() {
  return 'Dealer Flanker';
}

function type() {
  return Type.DEALER;
}

function update(tank, enemies, allies, bulletInfo) {
  const toDeg = (r) => r * 180 / Math.PI;
  const norm = (a) => ((a % 360) + 360) % 360;
  const angleTo = (x1, y1, x2, y2) => toDeg(Math.atan2(y2 - y1, x2 - x1));

  function moveSafe(a) {
    a = norm(a);
    if (tank.move(a)) return true;
    for (let d of [20, -20, 40, -40, 70, -70, 110, -110]) {
      if (tank.move(norm(a + d))) return true;
    }
    return false;
  }

  function mostThreatBullet() {
    if (!bulletInfo || bulletInfo.length === 0) return null;
    let b0 = null, sc = -1e9;
    for (const b of bulletInfo) {
      const rx = tank.x - b.x, ry = tank.y - b.y;
      const r = Math.hypot(rx, ry) || 1e-6;
      const rv = (-(b.vx * rx + b.vy * ry) / r);
      if (rv <= 0) continue;
      const score = rv + 180 / (r + 1);
      if (score > sc) { sc = score; b0 = b; }
    }
    return b0;
  }

  function dodge(b) {
    const a = toDeg(Math.atan2(b.vy, b.vx));
    const flip = ((Math.floor((tank.x - tank.y) / 43) & 1) ? 1 : -1);
    moveSafe(a + 90 * flip);
  }

  if (!enemies || enemies.length === 0) return;
  let tgt = enemies[0];
  for (const e of enemies) if (e.distance < tgt.distance) tgt = e;

  const threat = mostThreatBullet();
  if (threat) {
    dodge(threat);
  } else {
    // 접근 후 측후방 오비트
    if (tgt.distance > 220) {
      moveSafe(angleTo(tank.x, tank.y, tgt.x, tgt.y));
    } else {
      const base = angleTo(tank.x, tank.y, tgt.x, tgt.y) + (((tank.x + tank.y) % 120 < 60) ? 90 : -90);
      // 반경 보정: 너무 붙으면 약간 이탈, 멀면 접근
      const adj = tgt.distance < 160 ? -20 : (tgt.distance > 240 ? 20 : 0);
      moveSafe(base + adj);
    }
  }

  const f = angleTo(tank.x, tank.y, tgt.x, tgt.y) + (((tank.x * 7 + tank.y) % 2) ? 1 : -1);
  tank.fire(norm(f));
}


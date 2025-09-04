function name() {
  return 'Tanker Guardian';
}

function type() {
  return Type.TANKER;
}

function update(tank, enemies, allies, bulletInfo) {
  // -------- utils --------
  const toDeg = (r) => r * 180 / Math.PI;
  const toRad = (d) => d * Math.PI / 180;
  const norm = (a) => ((a % 360) + 360) % 360;
  const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  const angleTo = (x1, y1, x2, y2) => toDeg(Math.atan2(y2 - y1, x2 - x1));
  const cross = (ax, ay, bx, by) => ax * by - ay * bx;

  function moveSafe(a) {
    a = norm(a);
    if (tank.move(a)) return true;
    const cand = [15, -15, 30, -30, 60, -60, 90, -90, 120, -120, 180];
    for (let d of cand) {
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
      const rv = (-(b.vx * rx + b.vy * ry) / r); // approaching speed along LOS
      if (rv <= 0) continue; // moving away
      const ttc = r / (Math.hypot(b.vx, b.vy) + 1e-6);
      const score = rv * 1.2 + 200 / (r + 1) - ttc * 0.1;
      if (score > bestScore) { bestScore = score; best = b; }
    }
    return best;
  }

  function dodge(b) {
    const bang = toDeg(Math.atan2(b.vy, b.vx));
    const rx = tank.x - b.x, ry = tank.y - b.y;
    const side = Math.sign(cross(b.vx, b.vy, rx, ry)) || 1;
    const evade = bang + (side > 0 ? 90 : -90);
    moveSafe(evade);
  }

  if (!enemies || enemies.length === 0) return;

  // 공통 타겟: 가장 가까운 적
  let tgt = enemies[0];
  for (const e of enemies) if (e.distance < tgt.distance) tgt = e;

  // 위협 탄 회피 우선
  const threat = pickThreatBullet();
  if (threat) {
    dodge(threat);
  } else {
    // 근접 압박 -> 근접시 오비트로 각 흔들기
    if (tgt.distance > 180) {
      moveSafe(angleTo(tank.x, tank.y, tgt.x, tgt.y));
    } else {
      const base = angleTo(tank.x, tank.y, tgt.x, tgt.y) + 90;
      // 위치 기반 소폭 요동(의사 난수)
      const jitter = ((Math.floor((tank.x + tank.y) / 35) % 2) ? 12 : -12);
      moveSafe(base + jitter);
    }
  }

  // 사격: 단순 조준 + 소폭 오프셋
  const f = angleTo(tank.x, tank.y, tgt.x, tgt.y) + (((tank.x ^ tank.y) & 1) ? 2 : -2);
  tank.fire(norm(f));
}


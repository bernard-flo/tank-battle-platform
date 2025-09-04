// Dealer Sniper — 장거리 정밀 사격, 카이팅, 탄 회피 우선
function name() { return 'Dealer Sniper'; }
function type() { return Type.DEALER; }

function update(tank, enemies, allies, bulletInfo) {
  "use strict";
  // ===== 유틸 =====
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax) * 180 / Math.PI;
  const norm = (a) => ((a % 360) + 360) % 360;
  const hashSign = (v) => (Math.sin(v * 0.002) >= 0 ? 1 : -1);
  const tryMove = (ang) => {
    const deltas = [0, 15, -15, 30, -30, 45, -45, 60, -60, 90];
    for (let d of deltas) { if (tank.move(norm(ang + d))) return true; }
    return false;
  };
  const BULLET_SPEED = 8;
  const assumedTargetSpeed = 4.5; // 평균적 이동속도 가정
  const leadAngle = (sx, sy, tx, ty) => {
    // 간이 리드: 거리 기반 작은 보정(최대 10도)
    const base = angleTo(sx, sy, tx, ty);
    const d = Math.hypot(tx - sx, ty - sy);
    const off = clamp((assumedTargetSpeed / BULLET_SPEED) * (d / 80), 0, 10);
    return base + off * hashSign(sx + sy + tx + ty);
  };

  // ===== 탄 위협 우선 회피 =====
  const threat = (() => {
    let bBest = null, sBest = 0;
    for (const b of bulletInfo) {
      const dx = tank.x - b.x, dy = tank.y - b.y;
      const d = Math.hypot(dx, dy) + 1e-3;
      const toward = -(b.vx * (dx / d) + b.vy * (dy / d));
      if (toward <= 0) continue;
      const score = toward * (1 / d);
      if (score > sBest) { sBest = score; bBest = b; }
    }
    return bBest;
  })();

  if (threat) {
    const ba = Math.atan2(threat.vy, threat.vx) * 180 / Math.PI;
    const dx = tank.x - threat.x, dy = tank.y - threat.y;
    const cross = threat.vx * dy - threat.vy * dx;
    const side = cross >= 0 ? -1 : 1;
    const evade = norm(ba + side * 90);
    if (!tryMove(evade)) tryMove(norm(ba - side * 90));
  } else {
    // ===== 타겟 선정: 체력 낮음 우선, 이후 근접 =====
    let target = null;
    for (const e of enemies) {
      if (!target) { target = e; continue; }
      if (e.health < target.health - 1e-6) target = e;
      else if (Math.abs(e.health - target.health) < 1e-6 && e.distance < target.distance) target = e;
    }

    if (target) {
      const d = target.distance;
      // 카이팅: 이상적 사거리 ~ 320
      const ideal = 320;
      const aTo = angleTo(tank.x, tank.y, target.x, target.y);
      const orbitDir = hashSign(tank.x * 7.7 + tank.y * 3.1 + target.x * 2.3);

      if (d < ideal * 0.85) {
        // 너무 가까우면 멀어지며 스트레이프
        const away = norm(aTo + 180 + orbitDir * 20);
        tryMove(away);
      } else if (d > ideal * 1.25) {
        // 너무 멀면 접근하되 큰 반경 유지
        const inA = norm(aTo + orbitDir * 25);
        tryMove(inA);
      } else {
        // 적을 크게 오비트(±90 근처)
        const strafe = norm(aTo + orbitDir * 90);
        tryMove(strafe);
      }

      // 사격: 리드샷 + 소량 난수 오프셋
      const fireAng = leadAngle(tank.x, tank.y, target.x, target.y);
      tank.fire(fireAng);
    } else {
      // 타겟 없으면 중앙과의 거리 유지하며 라우팅
      const center = { x: 450, y: 300 };
      const a = angleTo(tank.x, tank.y, center.x, center.y) + 90 * hashSign(tank.x + tank.y);
      tryMove(norm(a));
    }
  }
}


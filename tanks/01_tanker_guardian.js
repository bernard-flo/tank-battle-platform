// Tanker Guardian — 선두 방패, 팀 중심 유지, 근접 위협 각도 제어 및 짧은 리드샷
function name() { return 'Tanker Guardian'; }
function type() { return Type.TANKER; }

function update(tank, enemies, allies, bulletInfo) {
  "use strict";
  // ===== 유틸리티 =====
  const P = (typeof PARAMS === 'object' && PARAMS) || {};
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax) * 180 / Math.PI;
  const norm = (a) => ((a % 360) + 360) % 360;
  const angDiff = (a, b) => {
    let d = norm(a) - norm(b); if (d > 180) d -= 360; if (d < -180) d += 360; return d;
  };
  // 발사체 속도(엔진 기준 8)
  const BULLET_SPEED = 8;
  const shortLeadAngle = (sx, sy, tx, ty) => {
    // 짧은 리드샷: 목표까지 각도 + 작은 가속 오프셋
    const base = angleTo(sx, sy, tx, ty);
    // 거리 비례로 0~6도 사이 보정
    const d = Math.hypot(tx - sx, ty - sy);
    const off = clamp(d / 100, 0, (P.short_lead_max_deg ?? 6));
    return base + (hashSign(sx + sy + tx + ty) * off);
  };
  const tryMove = (ang) => {
    // 실패 시 ±15° 보정 재시도 (최대 9회)
    const deltas = [0, 15, -15, 30, -30, 45, -45, 60, -60, 90];
    for (let d of deltas) {
      if (tank.move(norm(ang + d))) return true;
    }
    return false;
  };
  const hashSign = (v) => (Math.sin(v * 0.001) >= 0 ? 1 : -1);

  // ===== 팀 중심/전장 중심 =====
  const center = { x: 450, y: 300 };
  let allyCenter = { x: tank.x, y: tank.y };
  if (allies.length > 0) {
    let sx = tank.x, sy = tank.y, n = 1;
    for (const a of allies) { sx += a.x; sy += a.y; n++; }
    allyCenter = { x: sx / n, y: sy / n };
  }

  // ===== 위협 탄환 평가: 접근속도 * 역거리 =====
  const bestThreat = (() => {
    let best = null; let bestScore = 0;
    for (const b of bulletInfo) {
      const dx = tank.x - b.x, dy = tank.y - b.y;
      const d = Math.hypot(dx, dy) + 1e-3;
      const relSpeedToward = -(b.vx * (dx / d) + b.vy * (dy / d)); // +면 접근
      if (relSpeedToward <= 0) continue;
      const score = relSpeedToward * (1 / d);
      if (score > bestScore) { bestScore = score; best = b; }
    }
    return best;
  })();

  // ===== 회피 우선 =====
  if (bestThreat) {
    const ba = Math.atan2(bestThreat.vy, bestThreat.vx) * 180 / Math.PI;
    const dx = tank.x - bestThreat.x, dy = tank.y - bestThreat.y;
    const cross = bestThreat.vx * dy - bestThreat.vy * dx;
    const side = cross >= 0 ? -1 : 1; // 궤적 법선 중 멀어지는 쪽 선택
    const evade = norm(ba + side * 90);
    if (!tryMove(evade)) {
      // 마지막 수단: 반대편으로
      tryMove(norm(ba - side * 90));
    }
  } else {
    // ===== 기본 포지셔닝: 아군 중심과 전장 중심 사이에서 방패 역할 =====
    // 최근접 적을 추적하며 접근 각도 제어
    let target = null;
    for (const e of enemies) {
      if (!target || e.distance < target.distance ||
          (Math.abs(e.distance - target.distance) < 1e-3 && e.health < target.health)) {
        target = e;
      }
    }

    const stayPoint = {
      x: allyCenter.x * 0.7 + center.x * 0.3,
      y: allyCenter.y * 0.7 + center.y * 0.3
    };

    if (target) {
      // 타깃과 아군 중심 사이에 위치하도록 살짝 전진
      const mid = { x: (target.x + allyCenter.x) / 2, y: (target.y + allyCenter.y) / 2 };
      const desired = angleTo(tank.x, tank.y, mid.x, mid.y);
      // 보스턴 느낌의 작은 선회(±12도)로 각도 제어
      const spin = (P.spin_deg ?? 12) * hashSign(tank.x + tank.y + target.x + target.y);
      tryMove(norm(desired + spin));

      // 짧은 리드샷
      const fireAng = shortLeadAngle(tank.x, tank.y, target.x, target.y);
      tank.fire(fireAng);
    } else {
      // 타겟 없으면 아군 중심 근처 유지
      const a = angleTo(tank.x, tank.y, stayPoint.x, stayPoint.y);
      tryMove(a);
    }
  }
}

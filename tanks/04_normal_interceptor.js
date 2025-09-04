// Normal Interceptor — 위협탄 우선 수직 회피, 여유 시 리드샷
function name() { return 'Normal Interceptor'; }
function type() { return Type.NORMAL; }

function update(tank, enemies, allies, bulletInfo) {
  "use strict";
  // ===== 유틸 =====
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax) * 180 / Math.PI;
  const norm = (a) => ((a % 360) + 360) % 360;
  const tryMove = (ang) => { const ds=[0,15,-15,30,-30,45,-45,60,-60,90]; for(const d of ds){ if(tank.move(norm(ang+d))) return true; } return false; };
  const BULLET_SPEED = 8;
  const assumedTargetSpeed = 4.5;
  const leadAngle = (sx, sy, tx, ty) => {
    const base = angleTo(sx, sy, tx, ty);
    const d = Math.hypot(tx - sx, ty - sy);
    const off = clamp((assumedTargetSpeed / BULLET_SPEED) * (d / 100), 0, 8);
    return base + off * (Math.sin((sx + sy + tx + ty) * 0.002) >= 0 ? 1 : -1);
  };

  // ===== 위협 평가: 접근속도 * 역거리 =====
  let danger = null, bestScore = 0;
  for (const b of bulletInfo) {
    const dx = tank.x - b.x, dy = tank.y - b.y; const d = Math.hypot(dx, dy) + 1e-3;
    const toward = -(b.vx * (dx / d) + b.vy * (dy / d));
    if (toward <= 0) continue;
    const score = toward * (1 / d);
    if (score > bestScore) { bestScore = score; danger = b; }
  }

  if (danger) {
    const ba = Math.atan2(danger.vy, danger.vx) * 180 / Math.PI;
    const dx = tank.x - danger.x, dy = tank.y - danger.y;
    const side = (danger.vx * dy - danger.vy * dx) >= 0 ? -1 : 1;
    if (!tryMove(norm(ba + side * 90))) tryMove(norm(ba - side * 90));
  } else {
    // 여유 시 최근접 적에게 리드샷 + 얕은 스트레이프
    let target = null;
    for (const e of enemies) { if (!target || e.distance < target.distance) target = e; }
    if (target) {
      const aTo = angleTo(tank.x, tank.y, target.x, target.y);
      // 얕은 스트레이프 이동(±70)
      const sign = (Math.sin((tank.x + tank.y + target.x) * 0.003) >= 0) ? 1 : -1;
      tryMove(norm(aTo + sign * 70));
      tank.fire(leadAngle(tank.x, tank.y, target.x, target.y));
    } else {
      // 타겟 없을 때 중앙 순찰
      const center = { x: 450, y: 300 };
      tryMove(norm(angleTo(tank.x, tank.y, center.x, center.y) + 120));
    }
  }
}


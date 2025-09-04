// Dealer Flanker — 측후방 진입, 원운동 오비트, 연속 사격
function name() { return 'Dealer Flanker'; }
function type() { return Type.DEALER; }

function update(tank, enemies, allies, bulletInfo) {
  "use strict";
  // ===== 유틸 =====
  const P = (typeof PARAMS === 'object' && PARAMS) || {};
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax) * 180 / Math.PI;
  const norm = (a) => ((a % 360) + 360) % 360;
  const tryMove = (ang) => {
    const deltas = [0, 15, -15, 30, -30, 45, -45, 60, -60, 90];
    for (let d of deltas) { if (tank.move(norm(ang + d))) return true; }
    return false;
  };
  const hashSign = (v) => (Math.sin(v * 0.003) >= 0 ? 1 : -1);

  // ===== 탄 회피(간단) =====
  let danger = null, best = 0;
  for (const b of bulletInfo) {
    const dx = tank.x - b.x, dy = tank.y - b.y; const d = Math.hypot(dx, dy) + 1e-3;
    const toward = -(b.vx * (dx / d) + b.vy * (dy / d));
    const score = toward > 0 ? toward / d : 0;
    if (score > best) { best = score; danger = b; }
  }
  if (danger) {
    const ba = Math.atan2(danger.vy, danger.vx) * 180 / Math.PI;
    const dx = tank.x - danger.x, dy = tank.y - danger.y;
    const side = (danger.vx * dy - danger.vy * dx) >= 0 ? -1 : 1;
    if (tryMove(norm(ba + side * 90))) return; else tryMove(norm(ba - side * 90));
  }

  // ===== 타겟 선정: 가장 가까운 적 =====
  let target = null;
  for (const e of enemies) { if (!target || e.distance < target.distance) target = e; }
  if (!target) {
    // 중앙 근처 순찰
    const center = { x: 450, y: 300 };
    return void tryMove(norm(angleTo(tank.x, tank.y, center.x, center.y) + 90));
  }

  // ===== 원운동: 타겟 법선 방향(±90°)
  const aTo = angleTo(tank.x, tank.y, target.x, target.y);
  const orbitSign = hashSign(tank.x * 5.1 + tank.y * 2.9 + target.x * 1.7);
  let radius = clamp(target.distance, (P.radius_min ?? 140), (P.radius_max ?? 260));
  // 주기적 반경 조절: 벽/충돌 회피를 위한 미세 진폭
  const wiggle = (P.wiggle ?? 20) * orbitSign;
  const want = norm(aTo + orbitSign * (P.orbit_deg ?? 90));
  // 반경 보정: 너무 가깝다면 바깥쪽으로, 멀다면 안쪽으로 살짝
  const radialBias = (target.distance < radius ? -15 : (target.distance > radius ? 15 : 0));
  tryMove(norm(want + radialBias + wiggle * Math.sin((tank.x + tank.y) * 0.01)));

  // ===== 사격: 기본 조준 + 소량 오프셋
  const fireAngle = aTo + orbitSign * clamp(target.distance / 50, 0, 8);
  tank.fire(norm(fireAngle));
}

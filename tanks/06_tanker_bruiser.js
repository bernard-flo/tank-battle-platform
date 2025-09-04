// Tanker Bruiser — 전면 압박, 벽-슬라이딩, 지속 사격, 지그재그 회피
function name() { return 'Tanker Bruiser'; }
function type() { return Type.TANKER; }

function update(tank, enemies, allies, bulletInfo) {
  "use strict";
  // ===== 유틸 =====
  const P = (typeof PARAMS === 'object' && PARAMS) || {};
  const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax) * 180 / Math.PI;
  const norm = (a) => ((a % 360) + 360) % 360;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const tryMove = (ang) => { const ds=[0,15,-15,30,-30,45,-45,60,-60,90]; for (const d of ds){ if (tank.move(norm(ang+d))) return true; } return false; };
  const hashSign = (v) => (Math.sin(v * 0.0025) >= 0 ? 1 : -1);

  // ===== 위협 탄 회피(간헐) =====
  let danger = null, score = 0;
  for (const b of bulletInfo) {
    const dx = tank.x - b.x, dy = tank.y - b.y; const d = Math.hypot(dx, dy) + 1e-3;
    const toward = -(b.vx * (dx / d) + b.vy * (dy / d));
    const s = toward > 0 ? toward / d : 0;
    if (s > score) { score = s; danger = b; }
  }
  if (danger) {
    const ba = Math.atan2(danger.vy, danger.vx) * 180 / Math.PI;
    const dx = tank.x - danger.x, dy = tank.y - danger.y;
    const side = (danger.vx * dy - danger.vy * dx) >= 0 ? -1 : 1;
    if (!tryMove(norm(ba + side * 90))) tryMove(norm(ba - side * 90));
  } else {
    // ===== 압박 방향: 적 군집 중심 향해 전진
    let cx = 450, cy = 300, n = 0;
    for (const e of enemies) { cx += e.x; cy += e.y; n++; }
    if (n > 0) { cx = cx / (n + 1); cy = cy / (n + 1); }
    const aTo = angleTo(tank.x, tank.y, cx, cy);

    // 벽-슬라이딩: 벽 근처면 평행 이동(±90)
    const margin = (P.wall_margin ?? 60) + tank.size * 0.5;
    const nearLeft = tank.x < margin, nearRight = tank.x > 900 - margin;
    const nearTop = tank.y < margin, nearBot = tank.y > 600 - margin;
    let moveAng = aTo;
    if (nearLeft || nearRight) {
      moveAng = norm((nearLeft ? 0 : 180) + hashSign(tank.y) * 90); // 수평 벽과 평행
    } else if (nearTop || nearBot) {
      moveAng = norm((nearTop ? 90 : 270) + hashSign(tank.x) * 90); // 수직 벽과 평행
    } else {
      // 지그재그 오프셋
      const zig = (P.zig_deg ?? 20) * hashSign(Math.floor((tank.x + tank.y) / 20));
      moveAng = norm(aTo + zig);
    }
    tryMove(moveAng);

    // 지속 사격: 전진 방향 또는 가장 가까운 적 조준
    let target = null;
    for (const e of enemies) { if (!target || e.distance < target.distance) target = e; }
    if (target) tank.fire(angleTo(tank.x, tank.y, target.x, target.y));
    else tank.fire(moveAng);
  }
}

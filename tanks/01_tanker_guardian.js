function name() { return 'Tanker Guardian'; }

function type() { return Type.TANKER; }

function update(tank, enemies, allies, bulletInfo) {
  'use strict';

  // ===== Utilities (local only) =====
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function dist(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return Math.hypot(dx, dy); }
  function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax) * 180 / Math.PI; }
  function normAngle(a){ while(a>180) a-=360; while(a<-180) a+=360; return a; }
  function tryMove(angle){
    // engine limits to 10 attempts per tick
    const order = [0, 15, -15, 30, -30, 45, -45, 60, -60, 90];
    for (let i=0;i<order.length;i++){
      if (tank.move(angle + order[i])) return true;
    }
    return false;
  }
  function fireAtAngle(a){ tank.fire(a + (Math.random()*2-1)*3); }
  const BULLET_SPEED = 8;

  // Lead shot: short lead using assumed target lateral motion (unknown), add tiny jitter
  function leadAngle(src, dst){
    // Without velocity info, use direct aim with tiny forward bias
    return angleTo(src.x, src.y, dst.x, dst.y);
  }

  // Threat scoring for bullets: approaching speed * inverse distance
  function mostThreateningBullet() {
    let best = null; let bestScore = 0;
    for (const b of bulletInfo){
      const dx = tank.x - b.x, dy = tank.y - b.y;
      const d = Math.hypot(dx, dy) + 1e-6;
      const approach = (-(b.vx*dx + b.vy*dy) / d); // >0 if approaching
      const score = (approach>0?approach:0) * (1/(d));
      if (score > bestScore){ bestScore = score; best = b; }
    }
    return {bullet: best, score: bestScore};
  }

  function evadeBullet(b){
    // Move perpendicular to bullet velocity, pick side that increases separation
    const base = Math.atan2(b.vy, b.vx) * 180/Math.PI;
    const left = base + 90;
    const right = base - 90;
    // Pick the side with greater dot product away from bullet path
    const toTank = {x: tank.x - b.x, y: tank.y - b.y};
    function projAway(moveDeg){
      const r = moveDeg * Math.PI/180;
      const ux = Math.cos(r), uy = Math.sin(r);
      return (ux*toTank.x + uy*toTank.y);
    }
    const dir = projAway(left) > projAway(right) ? left : right;
    // small random to avoid predictability
    return tryMove(dir + (Math.random()*2-1)*8);
  }

  // Target selection: distance -> low health -> centrality of enemy
  function pickTarget(list){
    if (!list || list.length===0) return null;
    const cx = 450, cy = 300;
    let best = null; let bestKey = null;
    for (const e of list){
      const k = [ Math.round(e.distance), Math.round(e.health), Math.round(dist(e.x,e.y,cx,cy)) ];
      if (!best || k[0]<bestKey[0] || (k[0]===bestKey[0] && (k[1]<bestKey[1] || (k[1]===bestKey[1] && k[2]<bestKey[2])))){
        best = e; bestKey = k;
      }
    }
    return best;
  }

  // ===== Behavior =====
  // 1) Bullet evasion (high priority)
  const threat = mostThreateningBullet();
  if (threat.bullet && threat.score > 0.002) { // threshold tuned for MVP
    if (!evadeBullet(threat.bullet)) {
      // fallback: radial move away from bullet
      const away = angleTo(threat.bullet.x, threat.bullet.y, tank.x, tank.y);
      tryMove(away + (Math.random()*2-1)*10);
    }
  } else {
    // 2) Defensive positioning: stay near team center as front shield
    let ax=0, ay=0, n=0;
    for (const a of allies){ ax+=a.x; ay+=a.y; n++; }
    const center = n>0 ? {x: ax/n, y: ay/n} : {x: 450, y: 300};
    const toCenter = angleTo(tank.x, tank.y, center.x, center.y);
    const dCenter = dist(tank.x, tank.y, center.x, center.y);
    // Keep ~80px radius from allied center
    const desired = dCenter>90 ? toCenter : (toCenter+180);
    tryMove(desired + (Math.random()*2-1)*6);
  }

  // 3) Engage nearest threat with short lead
  const target = pickTarget(enemies);
  if (target){
    const fireDeg = leadAngle({x:tank.x,y:tank.y}, target) + (Math.random()*2-1)*2;
    fireAtAngle(fireDeg);
  }
}


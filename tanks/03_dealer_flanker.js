// Dealer Flanker v1 — 측후방 진입/원운동 오비트/주기적 반경 조절
function name() { return 'Dealer Flanker'; }
function type() { return Type.DEALER; }

function update(tank, enemies, allies, bulletInfo) {
  // ===== 유틸 =====
  function dist(ax, ay, bx, by) { const dx = bx-ax, dy = by-ay; return Math.hypot(dx, dy); }
  function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax) * 180 / Math.PI; }
  function tryMove(angleDeg) {
    const step = 15;
    for (let i=0;i<10;i++){
      const offs=((i>>1)+1)*step*(i%2===0?1:-1);
      const ang = angleDeg + (i===0?0:offs);
      if (tank.move(ang)) return true;
    }
    return false;
  }
  function pickTarget(){
    if (enemies.length===0) return null;
    // 가까움 우선 → 체력 낮음
    return enemies.slice().sort((a,b)=>{
      const da = dist(tank.x,tank.y,a.x,a.y), db=dist(tank.x,tank.y,b.x,b.y);
      return (da-db) || (a.health-b.health);
    })[0];
  }
  function leadAngle(src, dst){
    const base = angleTo(src.x, src.y, dst.x, dst.y);
    const jitter = (Math.random()*2-1)*5;
    return base + jitter;
  }
  function evade(){
    if (!bulletInfo || bulletInfo.length===0) return false;
    let best=null, bestScore=-1e9;
    for (const b of bulletInfo){
      const rx=tank.x-b.x, ry=tank.y-b.y; const r=Math.hypot(rx,ry)+1e-6;
      const vdot=(b.vx*rx+b.vy*ry)/r; const score=vdot/r;
      if (score>bestScore){ best=b; bestScore=score; }
    }
    if (!best) return false;
    const bang=Math.atan2(best.vy,best.vx)*180/Math.PI;
    const a1=bang+90,a2=bang-90;
    const s=(ang)=>{const rad=ang*Math.PI/180;return Math.cos(rad)*(tank.x-best.x)+Math.sin(rad)*(tank.y-best.y);};
    return tryMove(s(a1)>s(a2)?a1:a2);
  }

  // ===== 로직 =====
  if (evade()) { const t=pickTarget(); if (t) tank.fire(leadAngle(tank,t)); return; }
  const target = pickTarget();
  if (!target) return;

  // 원운동: 타겟 법선(±90°)으로 오비트, 주기적으로 반경 가감
  const toEnemy = angleTo(tank.x, tank.y, target.x, target.y);
  const orbitDir = (Math.random()<0.5? -90: 90);
  let ang = toEnemy + orbitDir;
  const d = dist(tank.x, tank.y, target.x, target.y);
  if (d < 220) ang += 20; // 반경 증가
  if (d > 380) ang -= 20; // 반경 감소
  tryMove(ang);

  tank.fire(leadAngle(tank, target));
}


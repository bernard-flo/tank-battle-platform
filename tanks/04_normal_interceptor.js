// Normal Interceptor v1 — 탄 차단 회피/반격, 위협 점수 기반 수직 회피
function name() { return 'Normal Interceptor'; }
function type() { return Type.NORMAL; }

function update(tank, enemies, allies, bulletInfo) {
  // ===== 유틸 =====
  function dist(ax, ay, bx, by) { const dx = bx-ax, dy = by-ay; return Math.hypot(dx, dy); }
  function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax) * 180 / Math.PI; }
  function tryMove(angleDeg){
    const step=15;
    for(let i=0;i<10;i++){
      const offs=((i>>1)+1)*step*(i%2===0?1:-1);
      const ang = angleDeg + (i===0?0:offs);
      if (tank.move(ang)) return true;
    }
    return false;
  }
  function pickNearest(){
    if (enemies.length===0) return null;
    let best=enemies[0], bd=dist(tank.x,tank.y,best.x,best.y);
    for(const e of enemies){ const d=dist(tank.x,tank.y,e.x,e.y); if(d<bd){bd=d;best=e;} }
    return best;
  }
  function leadAngle(src, dst){
    // 간단한 리드: 근거리일수록 작은 오프셋
    const base = angleTo(src.x, src.y, dst.x, dst.y);
    const d = dist(src.x, src.y, dst.x, dst.y);
    const jitter = Math.max(0, 6 - d*0.01) * (Math.random()<0.5?-1:1);
    return base + jitter;
  }
  function evade(){
    if (!bulletInfo || bulletInfo.length===0) return false;
    let best=null, bestScore=-1e9;
    for (const b of bulletInfo){
      const rx=tank.x-b.x, ry=tank.y-b.y; const r=Math.hypot(rx,ry)+1e-6;
      const vdot=(b.vx*rx+b.vy*ry)/r; // 접근 양수
      const score = vdot / r; // 역거리 가중
      if (score>bestScore){ best=b; bestScore=score; }
    }
    if (!best) return false;
    const bang=Math.atan2(best.vy,best.vx)*180/Math.PI;
    const a1=bang+90,a2=bang-90;
    const s=(ang)=>{const rad=ang*Math.PI/180;return Math.cos(rad)*(tank.x-best.x)+Math.sin(rad)*(tank.y-best.y);};
    return tryMove(s(a1)>s(a2)?a1:a2);
  }

  // ===== 로직 =====
  if (evade()) { const t=pickNearest(); if (t) tank.fire(leadAngle(tank,t)); return; }
  const t = pickNearest();
  if (!t) return;
  // 여유 시 접근하며 사격
  const to = angleTo(tank.x, tank.y, t.x, t.y);
  tryMove(to);
  tank.fire(leadAngle(tank, t));
}


// Tanker Bruiser v1 — 전면 압박/벽-슬라이딩/지그재그 예측 회피
function name() { return 'Tanker Bruiser'; }
function type() { return Type.TANKER; }

function update(tank, enemies, allies, bulletInfo) {
  // ===== 유틸 =====
  function dist(ax, ay, bx, by) { const dx=bx-ax, dy=by-ay; return Math.hypot(dx, dy); }
  function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax) * 180 / Math.PI; }
  function tryMove(angleDeg){
    const step=15;
    for(let i=0;i<10;i++){
      const offs=((i>>1)+1)*step*(i%2===0?1:-1);
      const ang=angleDeg+(i===0?0:offs);
      if(tank.move(ang)) return true;
    }
    return false;
  }
  function pickClosest(){
    if (enemies.length===0) return null;
    let best=enemies[0], bd=dist(tank.x,tank.y,best.x,best.y);
    for(const e of enemies){const d=dist(tank.x,tank.y,e.x,e.y); if(d<bd){bd=d;best=e;}}
    return best;
  }
  function leadAngle(src, dst){
    const base = angleTo(src.x, src.y, dst.x, dst.y);
    return base + ((Math.random()<0.5)?-3:3);
  }
  function evade(){
    if(!bulletInfo||bulletInfo.length===0) return false;
    let best=null,bestScore=-1e9;
    for(const b of bulletInfo){
      const rx=tank.x-b.x, ry=tank.y-b.y; const r=Math.hypot(rx,ry)+1e-6;
      const vdot=(b.vx*rx+b.vy*ry)/r; const score=vdot/r;
      if(score>bestScore){best=b;bestScore=score;}
    }
    if(!best) return false;
    const bang=Math.atan2(best.vy,best.vx)*180/Math.PI;
    const a1=bang+90,a2=bang-90;
    const s=(ang)=>{const rad=ang*Math.PI/180;return Math.cos(rad)*(tank.x-best.x)+Math.sin(rad)*(tank.y-best.y);};
    return tryMove(s(a1)>s(a2)?a1:a2);
  }

  // ===== 로직 =====
  if (evade()) { const t=pickClosest(); if (t) tank.fire(leadAngle(tank,t)); return; }
  const t = pickClosest(); if (!t) return;

  // 전면 압박 + 지그재그
  const to = angleTo(tank.x,tank.y,t.x,t.y);
  const strafe = (Math.random()<0.5? -20: 20);
  let ang = to + strafe;

  // 벽-슬라이딩: 벽 근처면 평행 이동
  const margin = 40 + tank.size/2;
  if (tank.x < margin) ang = 0 + (Math.random()<0.5? 10:-10);
  else if (tank.x > 900 - margin) ang = 180 + (Math.random()<0.5? 10:-10);
  if (tank.y < margin) ang = 90 + (Math.random()<0.5? 10:-10);
  else if (tank.y > 600 - margin) ang = 270 + (Math.random()<0.5? 10:-10);

  tryMove(ang);
  tank.fire(leadAngle(tank, t));
}


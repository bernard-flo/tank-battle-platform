// Tanker Bruiser — 전면 압박, 벽-슬라이딩, 지그재그 예측 회피
function dist(ax,ay,bx,by){ const dx=bx-ax, dy=by-ay; return Math.hypot(dx,dy); }
function angleTo(ax,ay,bx,by){ return Math.atan2(by-ay, bx-ax); }
function safeLead(src, dst, bulletSpeed){
  const rx=dst.x-src.x, ry=dst.y-src.y; const vx=dst.vx||0, vy=dst.vy||0;
  const a=vx*vx+vy*vy-bulletSpeed*bulletSpeed, b=2*(rx*vx+ry*vy), c=rx*rx+ry*ry; let t=0;
  if (Math.abs(a)<1e-6){ if(Math.abs(b)>1e-6) t=-c/b; }
  else { const disc=b*b-4*a*c; if(disc>=0){ const s=Math.sqrt(disc); const t1=(-b+s)/(2*a), t2=(-b-s)/(2*a); t=Math.min(t1,t2)>0?Math.min(t1,t2):Math.max(t1,t2); if(!isFinite(t)||t<0) t=0; }}
  const axp=dst.x+(dst.vx||0)*t, ayp=dst.y+(dst.vy||0)*t; return Math.atan2(ayp-src.y, axp-src.x);
}
function pickPressureTarget(tank, enemies){
  let best=null, score=1e9; for(const e of enemies||[]){ const d=dist(tank.x,tank.y,e.x,e.y); const s=d*0.7 + (e.hp||100)*0.3; if(s<score){score=s;best=e;} } return best;
}

function name(){ return 'Tanker Bruiser'; }
function type(){ return Type.TANKER; }

function update(tank, enemies, allies, bulletInfo){
  const BULLET_SPEED=400; const jitter=(Math.random()-0.5)*0.08;
  const tgt = pickPressureTarget(tank, enemies||[]);
  // 지그재그 타이머
  if (!tank.__zig) tank.__zig = {dir: (Math.random()<0.5?1:-1), t: 30+Math.floor(Math.random()*30)};
  tank.__zig.t -= 1; if (tank.__zig.t<=0){ tank.__zig.t = 30+Math.floor(Math.random()*30); tank.__zig.dir *= -1; }

  if (tgt){
    let base = angleTo(tank.x,tank.y,tgt.x,tgt.y);
    // 벽-슬라이딩 보정
    const M=26; if (tank.x<M) base = 0; else if (tank.x>800-M) base=Math.PI; if (tank.y<M) base=Math.PI/2; else if (tank.y>600-M) base=-Math.PI/2;
    // 지그재그 측면 오프셋
    let moveAng = base + tank.__zig.dir * 20*Math.PI/180 + jitter;
    for(let i=0;i<10;i++){ if (tank.move(moveAng)) break; moveAng += ((i%2?1:-1) * 12*Math.PI/180); }
    const fireAng = safeLead(tank, tgt, BULLET_SPEED) + (Math.random()-0.5)*0.02; tank.fire(fireAng);
  } else {
    // 타겟 없을 때 중앙으로 압박
    let ang = angleTo(tank.x,tank.y,400,300) + tank.__zig.dir*20*Math.PI/180 + jitter;
    for(let i=0;i<10;i++){ if (tank.move(ang)) break; ang += ((i%2?1:-1) * 12*Math.PI/180); }
  }
}


function name() { return "Tanker Bruiser"; }
function type() { return Type.TANKER; }
function update(tank, enemies, allies, bulletInfo) {
  function angleTo(ax,ay,bx,by){return Math.atan2(by-ay,bx-ax)*180/Math.PI;}
  function norm(a){a%=360;return a<0?a+360:a;}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function tryMoveDir(dir){
    dir = norm(dir);
    if (tank.move(dir)) return true;
    // 벽-슬라이딩: 평행 방향으로 재시도
    for (let d of [15,30,45]){
      if (tank.move(norm(dir + d))) return true;
      if (tank.move(norm(dir - d))) return true;
    }
    return false;
  }
  function mostDangerousBullet(){
    let best=null,score=-1; for(const b of bulletInfo){
      const rx=tank.x-b.x, ry=tank.y-b.y; const vx=b.vx, vy=b.vy; const vv=vx*vx+vy*vy; if(!vv) continue;
      const t=-(rx*vx+ry*vy)/vv; if(t<0) continue; const cx=rx+vx*t, cy=ry+vy*t; const cd=Math.hypot(cx,cy);
      const sc=900/(1+cd)+0.5/(1+t); if(sc>score){score=sc; best={b,cd,t};}
    } return best;
  }

  // 1) 위협 회피(가벼운 지그재그 유지)
  const threat = mostDangerousBullet();
  if (threat && threat.cd < (tank.size/2 + 22)){
    const dir = Math.atan2(threat.b.vy, threat.b.vx)*180/Math.PI;
    const zig = (Math.random()<0.5? -1:1) * (10 + Math.random()*10);
    tryMoveDir(dir + 90 + zig);
  }

  // 2) 압박 전진: 최근접 적에게 접근, 소폭 지그재그로 예측 회피
  if (enemies.length){
    let t = enemies[0]; for(const e of enemies) if(e.distance<t.distance) t=e;
    const to = angleTo(tank.x,tank.y,t.x,t.y);
    const zig = (Math.random()<0.5? -1:1) * (8 + Math.random()*10);
    const desired = t.distance > 140 ? to : norm(to + 180); // 너무 붙으면 살짝 이탈
    tryMoveDir(desired + zig);

    const lead = clamp(t.distance/24, -12, 12) * (Math.random()<0.5?1:-1);
    tank.fire(norm(to + lead + (Math.random()-0.5)*6));
  } else {
    tryMoveDir(Math.random()*360);
  }
}


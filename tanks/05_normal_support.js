function name() { return "Normal Support"; }
function type() { return Type.NORMAL; }
function update(tank, enemies, allies, bulletInfo) {
  function angleTo(ax,ay,bx,by){return Math.atan2(by-ay,bx-ax)*180/Math.PI;}
  function norm(a){a%=360;return a<0?a+360:a;}
  function tryMoveDir(dir){
    dir = norm(dir);
    if (tank.move(dir)) return true;
    for (let d=10; d<=40; d+=10){
      if (tank.move(norm(dir + d))) return true;
      if (tank.move(norm(dir - d))) return true;
    }
    return false;
  }
  function centroid(points){
    if (!points.length) return {x:tank.x, y:tank.y};
    let sx= tank.x, sy=tank.y, c=1;
    for(const p of points){ sx+=p.x; sy+=p.y; c++; }
    return {x:sx/c, y:sy/c};
  }
  function mostDangerousBullet(){
    let best=null,score=-1; for(const b of bulletInfo){
      const rx=tank.x-b.x, ry=tank.y-b.y; const vx=b.vx, vy=b.vy; const vv=vx*vx+vy*vy; if(!vv) continue;
      const t=-(rx*vx+ry*vy)/vv; if(t<0) continue; const cx=rx+vx*t, cy=ry+vy*t; const cd=Math.hypot(cx,cy);
      const sc=1000/(1+cd)+0.5/(1+t); if(sc>score){score=sc; best={b,cd,t};}
    } return best;
  }

  // 1) 아군 중심 방어 포지셔닝 + 위협 회피
  const allyCenter = centroid(allies);
  const threat = mostDangerousBullet();
  if (threat && threat.cd < (tank.size/2 + 20)){
    const dir = Math.atan2(threat.b.vy, threat.b.vx)*180/Math.PI;
    tryMoveDir(dir + (Math.random()<0.5? -90:90));
  } else if (enemies.length){
    // 공통 타겟: 아군 중심에서 가장 가까운 적
    let focus = enemies[0];
    let bestd = Math.hypot(enemies[0].x - allyCenter.x, enemies[0].y - allyCenter.y);
    for (const e of enemies){
      const d = Math.hypot(e.x - allyCenter.x, e.y - allyCenter.y);
      if (d < bestd) { bestd = d; focus = e; }
    }

    // 중거리(200~300) 유지하며 중심과 각도 정렬
    const to = angleTo(tank.x,tank.y,focus.x,focus.y);
    let moveDir = to;
    if (focus.distance < 200) moveDir = norm(to + 180);
    else if (focus.distance > 300) moveDir = to;
    else moveDir = norm(angleTo(tank.x,tank.y,allyCenter.x,allyCenter.y)); // 중심 정렬
    tryMoveDir(moveDir + (Math.random()-0.5)*8);

    // 포커스 파이어: 소폭 지터
    const jitter = (Math.random()-0.5)*6;
    tank.fire(norm(to + jitter));
  } else {
    tryMoveDir(Math.random()*360);
  }
}


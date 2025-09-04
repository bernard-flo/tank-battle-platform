function name() { return "Dealer Sniper"; }
function type() { return Type.DEALER; }
function update(tank, enemies, allies, bulletInfo) {
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function angleTo(ax,ay,bx,by){return Math.atan2(by-ay,bx-ax)*180/Math.PI;}
  function norm(a){a%=360;return a<0?a+360:a;}
  function tryMoveDir(dir){
    dir = norm(dir);
    if (tank.move(dir)) return true;
    for (let d=8; d<=32; d+=8){
      if (tank.move(norm(dir + d))) return true;
      if (tank.move(norm(dir - d))) return true;
    }
    return false;
  }
  function mostDangerousBullet(){
    let best=null,bestScore=-1;
    for (const b of bulletInfo){
      const rx=tank.x-b.x, ry=tank.y-b.y; const vx=b.vx, vy=b.vy; const vv=vx*vx+vy*vy; if(!vv) continue;
      const t=-(rx*vx+ry*vy)/vv; if(t<0) continue; const cx=rx+vx*t, cy=ry+vy*t; const cd=Math.hypot(cx,cy);
      const sc=1200/(1+cd)+0.6/(1+t); if(sc>bestScore){bestScore=sc; best={b,cd,t};}
    }
    return best;
  }

  // 장거리 카이팅: 위협 우선 회피 -> 최대 사거리 유지 -> 정밀 사격
  const threat = mostDangerousBullet();
  if (threat && threat.cd < (tank.size/2 + 24)){
    const dir = Math.atan2(threat.b.vy, threat.b.vx)*180/Math.PI;
    const offset = (Math.random()<0.5?-90:90) + (Math.random()-0.5)*10;
    tryMoveDir(dir + offset);
  }

  if (enemies.length){
    // 타겟: 체력 낮음 우선, 동률이면 원거리 유지가 쉬운 대상
    let target = enemies[0];
    for (const e of enemies){
      if (e.health < target.health - 5) target = e; else if (Math.abs(e.health - target.health) <= 5 && e.distance > target.distance) target = e;
    }
    const dirTo = angleTo(tank.x,tank.y,target.x,target.y);
    // 거리 밸런스: 260~360 선호
    const preferMin=260, preferMax=360;
    let moveDir = dirTo;
    if (target.distance < preferMin) moveDir = norm(dirTo + 180); // 벌리기
    else if (target.distance > preferMax) moveDir = dirTo; // 추적
    else moveDir = norm(dirTo + (Math.random()<0.5?90:-90)); // 측면 유지
    tryMoveDir(moveDir + (Math.random()-0.5)*8);

    // 사격: 작은 리드와 분산
    const jitter = (Math.random()-0.5)*8;
    const lead = clamp(target.distance/18, -14, 14) * (Math.random()<0.5?1:-1);
    tank.fire(norm(dirTo + lead + jitter));
  } else {
    tryMoveDir(Math.random()*360);
  }
}


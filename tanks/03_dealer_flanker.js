function name() { return "Dealer Flanker"; }
function type() { return Type.DEALER; }
function update(tank, enemies, allies, bulletInfo) {
  function angleTo(ax,ay,bx,by){return Math.atan2(by-ay,bx-ax)*180/Math.PI;}
  function norm(a){a%=360; return a<0?a+360:a;}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function tryMoveDir(dir){
    dir = norm(dir);
    if (tank.move(dir)) return true;
    for (let d=10; d<=40; d+=10){
      if (tank.move(norm(dir + d))) return true;
      if (tank.move(norm(dir - d))) return true;
    }
    return false;
  }
  function mostDangerousBullet(){
    let best=null,score=-1;
    for(const b of bulletInfo){
      const rx=tank.x-b.x, ry=tank.y-b.y; const vx=b.vx, vy=b.vy; const vv=vx*vx+vy*vy; if(!vv) continue;
      const t=-(rx*vx+ry*vy)/vv; if (t<0) continue; const cx=rx+vx*t, cy=ry+vy*t; const cd=Math.hypot(cx,cy);
      const sc=900/(1+cd)+0.5/(1+t); if (sc>score){score=sc; best={b,cd,t};}
    }
    return best;
  }

  // 위협 회피 우선
  const threat = mostDangerousBullet();
  if (threat && threat.cd < (tank.size/2 + 18)){
    const dir = Math.atan2(threat.b.vy, threat.b.vx)*180/Math.PI;
    tryMoveDir(dir + (Math.random()<0.5? -90:90));
  }

  if (enemies.length){
    let target = enemies[0]; for (const e of enemies) if (e.distance < target.distance) target = e;
    const to = angleTo(tank.x,tank.y,target.x,target.y);
    // 오비트: 타겟 법선 방향으로 원운동. 반경은 160~240를 들쑥날쑥 유지
    const prefer = 200 + (Math.random()-0.5)*80;
    let moveDir = norm(to + (Math.random()<0.55? 90: -90));
    if (target.distance < prefer - 30) moveDir = norm(to + 180); // 거리를 벌려 반경 회복
    if (target.distance > prefer + 30) moveDir = to;            // 반경 안으로 진입
    tryMoveDir(moveDir + (Math.random()-0.5)*8);

    // 사격: 오비트 방향으로 약간 앞을 긁는 리드
    const sweep = (moveDir - to); // +90/-90 근사
    const lead = clamp((target.distance/22), -10, 10) * Math.sign(sweep || 1);
    const jitter = (Math.random()-0.5)*6;
    tank.fire(norm(to + lead + jitter));
  } else {
    tryMoveDir(Math.random()*360);
  }
}


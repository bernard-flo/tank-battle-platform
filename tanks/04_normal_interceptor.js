function name() { return "Normal Interceptor"; }
function type() { return Type.NORMAL; }
function update(tank, enemies, allies, bulletInfo) {
  function angleTo(ax,ay,bx,by){return Math.atan2(by-ay,bx-ax)*180/Math.PI;}
  function norm(a){a%=360;return a<0?a+360:a;}
  function tryMoveDir(dir){
    dir = norm(dir);
    if (tank.move(dir)) return true;
    for (let d=12; d<=48; d+=12){
      if (tank.move(norm(dir + d))) return true;
      if (tank.move(norm(dir - d))) return true;
    }
    return false;
  }
  function threatScore(b){
    const rx=tank.x-b.x, ry=tank.y-b.y; const vx=b.vx, vy=b.vy; const vv=vx*vx+vy*vy; if(!vv) return -1;
    const closing=-(rx*vx+ry*vy)/Math.sqrt(vv); // 접근 성분
    const t=-(rx*vx+ry*vy)/vv; // 최근접 시간
    const cx=rx+vx*Math.max(0,t), cy=ry+vy*Math.max(0,t);
    const cd=Math.hypot(cx,cy);
    return (closing>0? closing:0)/(1+cd) + 0.6/(1+Math.max(0,t));
  }
  function mostDangerousBullet(){
    let best=null, bs=-1;
    for(const b of bulletInfo){
      const s=threatScore(b); if (s>bs){bs=s; best=b;}
    }
    return best;
  }

  // 1) 가장 위협적인 탄에 수직 회피
  const b = mostDangerousBullet();
  if (b){
    const dir = Math.atan2(b.vy,b.vx)*180/Math.PI;
    const offset = (Math.random()<0.5? -90:90) + (Math.random()-0.5)*12;
    tryMoveDir(dir + offset);
  }

  // 2) 반격: 최근접 적에게 약한 리드샷
  if (enemies.length){
    let target=enemies[0]; for(const e of enemies) if(e.distance<target.distance) target=e;
    const to = angleTo(tank.x,tank.y,target.x,target.y);
    const lead = Math.min(10, target.distance/25) * (Math.random()<0.5?1:-1);
    tank.fire(norm(to + lead + (Math.random()-0.5)*5));
  }
}


// Dealer Sniper — 장거리 정밀 사격, 카이팅, 탄 회피 우선
function name() { return 'Dealer Sniper'; }
function type() { try { return Type.DEALER; } catch(e) { return 3; } }

function update(tank, enemies, allies, bulletInfo) {
  // ---- 유틸 ----
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function dist(a,b){var dx=a.x-b.x, dy=a.y-b.y; return Math.hypot(dx,dy);} 
  function angleTo(ax,ay,bx,by){return Math.atan2(by-ay,bx-ax)*180/Math.PI;}
  function leadAngle(src,dst,bulletSpeed){
    var rx=dst.x-src.x, ry=dst.y-src.y;
    var dvx=dst.vx||0, dvy=dst.vy||0;
    var a=dvx*dvx+dvy*dvy-bulletSpeed*bulletSpeed;
    var b=2*(rx*dvx+ry*dvy);
    var c=rx*rx+ry*ry; var t;
    if(Math.abs(a)<1e-6){ t=(c>1e-6)?(-c/b):0; }
    else { var disc=b*b-4*a*c; if(disc<0)disc=0; var t1=(-b+Math.sqrt(disc))/(2*a); var t2=(-b-Math.sqrt(disc))/(2*a); t=Math.max(t1,t2); }
    if(!isFinite(t) || t<0) t=0;
    var axx = dst.x + (dst.vx||0)*t; var ayy = dst.y + (dst.vy||0)*t;
    return angleTo(src.x, src.y, axx, ayy);
  }
  function tryMove(angleDeg){
    for(var i=0;i<10;i++){
      var off=(i%2===0?1:-1)*Math.ceil(i/2)*12;
      tank.move(angleDeg+off);
    }
  }
  function pickLowestHP(list){
    var best=null, bh=1e9, bd=1e9; var cx=400, cy=300; // 중앙 근사
    for(var i=0;i<list.length;i++){
      var e=list[i]; var hp=e.hp!=null?e.hp:(e.health!=null?e.health:100);
      var d=dist(e,tank); var c=dist(e,{x:cx,y:cy});
      var key=[hp,d,c]; // hp 우선 → 가까움 → 중앙가까움
      if(!best){best=e; bh=hp; bd=d; var bc=c;}
      else{
        if(hp<bh || (hp===bh && (d<bd || (d===bd && c<bc)))){best=e; bh=hp; bd=d; bc=c;}
      }
    }
    return best;
  }

  // ---- 파라미터 ----
  var P=(typeof PARAMS!=='undefined')?PARAMS:{};
  var keepRange = P.ideal_range ?? 350;
  var orbitDeg = P.orbit_deg ?? 25;
  var bulletSpeed = P.bulletSpeed ?? 400;

  // ---- 탄 회피 우선 ----
  var threat=null, bestScore=-1e9;
  for(var i=0;i<(bulletInfo?bulletInfo.length:0);i++){
    var b=bulletInfo[i]; var rx=tank.x-b.x, ry=tank.y-b.y; var d=Math.hypot(rx,ry)+1e-6;
    var rel = -(rx*(b.vx||0)+ry*(b.vy||0))/d; var score=rel/d;
    if(score>bestScore){bestScore=score; threat=b;}
  }
  if(threat && bestScore>0){
    var ang = Math.atan2(threat.vy||0, threat.vx||0)*180/Math.PI;
    var evade = ang + 90*(Math.random()<0.5?1:-1);
    tryMove(evade);
  } else if(enemies && enemies.length){
    var tgt = pickLowestHP(enemies);
    var d = dist(tgt, tank);
    // 카이팅: 최대 사거리 유지 + 큰 오비트
    var base = angleTo(tank.x, tank.y, tgt.x, tgt.y);
    var dir = (tank._sn_dir = (tank._sn_dir|| (Math.random()<0.5?1:-1)) );
    var moveAng = base + dir * orbitDeg + (d>keepRange?0:180);
    tryMove(moveAng);
    // 사격 쿨 관리(간단 타이머)
    var now = (tank._sn_t||0)+1; tank._sn_t=now;
    var fireGap = P.fire_every ?? 6; // 프레임 기준 추정치
    if(now % fireGap === 0){
      var aim = leadAngle(tank, tgt, bulletSpeed);
      tank.fire(aim + (Math.random()*3-1.5));
    }
  }
}


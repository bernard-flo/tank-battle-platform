// Normal Interceptor — 탄 차단 회피, 반격 및 리드샷
function name(){ return 'Normal Interceptor'; }
function type(){ try { return Type.NORMAL; } catch(e){ return 1; } }

function update(tank, enemies, allies, bulletInfo){
  function dist(a,b){var dx=a.x-b.x, dy=a.y-b.y; return Math.hypot(dx,dy);} 
  function angleTo(ax,ay,bx,by){return Math.atan2(by-ay,bx-ax)*180/Math.PI;}
  function tryMove(a){ for(var i=0;i<10;i++){ var off=(i%2===0?1:-1)*Math.ceil(i/2)*15; tank.move(a+off);} }
  function leadAngle(src,dst,bs){
    var rx=dst.x-src.x, ry=dst.y-src.y; var dvx=dst.vx||0, dvy=dst.vy||0;
    var a=dvx*dvx+dvy*dvy-bs*bs, b=2*(rx*dvx+ry*dvy), c=rx*rx+ry*ry; var t;
    if(Math.abs(a)<1e-6){ t=(c>1e-6)?(-c/b):0; } else { var disc=b*b-4*a*c; if(disc<0)disc=0; var t1=(-b+Math.sqrt(disc))/(2*a); var t2=(-b-Math.sqrt(disc))/(2*a); t=Math.max(t1,t2);} if(!isFinite(t)||t<0) t=0;
    return angleTo(src.x,src.y, dst.x+(dst.vx||0)*t, dst.y+(dst.vy||0)*t);
  }

  var P=(typeof PARAMS!=='undefined')?PARAMS:{};
  var bulletSpeed = P.bulletSpeed ?? 400;

  // 위협 점수 = 접근속도·역거리 가중
  var threat=null, best=-1e9;
  for(var i=0;i<(bulletInfo?bulletInfo.length:0);i++){
    var b=bulletInfo[i]; var rx=tank.x-b.x, ry=tank.y-b.y; var d=Math.hypot(rx,ry)+1e-6; var rel=-(rx*(b.vx||0)+ry*(b.vy||0))/d; var sc=rel/d; if(sc>best){best=sc; threat=b;}
  }
  if(threat && best>0){
    var ang=Math.atan2(threat.vy||0, threat.vx||0)*180/Math.PI;
    tryMove(ang+90*(Math.random()<0.5?1:-1));
  } else if(enemies && enemies.length){
    // 여유 시 최근접 적에게 리드샷
    var tgt=null, bd=1e9; for(var i=0;i<enemies.length;i++){ var d=dist(tank,enemies[i]); if(d<bd){bd=d; tgt=enemies[i];}}
    if(tgt){
      var aim=leadAngle(tank,tgt,bulletSpeed);
      tank.fire(aim + (Math.random()*2-1));
      // 접근 각도로 작은 이동
      var moveAng=angleTo(tank.x,tank.y,tgt.x,tgt.y) + (Math.random()<0.5?10:-10);
      tryMove(moveAng);
    }
  }
}


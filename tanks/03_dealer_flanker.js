// Dealer Flanker — 측후방 진입, 원운동 오비트, 반경 조절
function name() { return 'Dealer Flanker'; }
function type() { try { return Type.DEALER; } catch(e){ return 3; } }

function update(tank, enemies, allies, bulletInfo){
  // 유틸
  function dist(a,b){var dx=a.x-b.x, dy=a.y-b.y; return Math.hypot(dx,dy);} 
  function angleTo(ax,ay,bx,by){return Math.atan2(by-ay,bx-ax)*180/Math.PI;}
  function tryMove(a){ for(var i=0;i<10;i++){ var off=(i%2===0?1:-1)*Math.ceil(i/2)*12; tank.move(a+off);} }
  function leadAngle(src,dst,bs){
    var rx=dst.x-src.x, ry=dst.y-src.y; var dvx=dst.vx||0, dvy=dst.vy||0;
    var a=dvx*dvx+dvy*dvy-bs*bs, b=2*(rx*dvx+ry*dvy), c=rx*rx+ry*ry; var t;
    if(Math.abs(a)<1e-6){ t=(c>1e-6)?(-c/b):0; } else { var disc=b*b-4*a*c; if(disc<0)disc=0; var t1=(-b+Math.sqrt(disc))/(2*a); var t2=(-b-Math.sqrt(disc))/(2*a); t=Math.max(t1,t2);} if(!isFinite(t)||t<0) t=0;
    return angleTo(src.x,src.y, dst.x+(dst.vx||0)*t, dst.y+(dst.vy||0)*t);
  }

  var P=(typeof PARAMS!=='undefined')?PARAMS:{};
  var orbit = P.orbit_deg ?? 90; // ±90° 원운동 기본
  var radius = P.orbit_radius ?? 180;
  var radiusJitter = P.radius_jitter ?? 40;
  var bulletSpeed = P.bulletSpeed ?? 400;

  // 위협 탄 우선 회피
  var threat=null, s=-1e9; for(var i=0;i<(bulletInfo?bulletInfo.length:0);i++){ var b=bulletInfo[i]; var rx=tank.x-b.x, ry=tank.y-b.y; var d=Math.hypot(rx,ry)+1e-6; var rel=-(rx*(b.vx||0)+ry*(b.vy||0))/d; var sc=rel/d; if(sc>s){s=sc;threat=b;} }
  if(threat && s>0){ var ang=Math.atan2(threat.vy||0, threat.vx||0)*180/Math.PI; tryMove(ang+90*(Math.random()<0.5?1:-1)); return; }

  if(!enemies||!enemies.length) return;
  // 최근접 목표 선정
  var tgt=null, bd=1e9; for(var i=0;i<enemies.length;i++){ var d=dist(tank,enemies[i]); if(d<bd){bd=d; tgt=enemies[i];}}

  // 목표 법선 방향으로 원운동
  var base = angleTo(tank.x,tank.y,tgt.x,tgt.y);
  var dir = (tank._fl_dir = (tank._fl_dir || (Math.random()<0.5?1:-1)) );
  var desired = base + dir*orbit;

  // 반경 조절로 벽/충돌 회피(주기적 내/외 반경 스윕)
  var t = (tank._fl_t||0)+1; tank._fl_t=t;
  var rAim = radius + (Math.sin(t*0.1)*0.5+0.5)*radiusJitter; // 0..radiusJitter
  var d = bd;
  if (d < rAim*0.8) desired = base + 180 + dir*(orbit*0.5);
  else if (d > rAim*1.2) desired = base + dir*(orbit*0.8);
  desired += (Math.random()*6-3);

  tryMove(desired);

  // 연속 사격(틈새 노림)
  if (t % (P.fire_every??5) === 0){
    var aim=leadAngle(tank,tgt,bulletSpeed);
    tank.fire(aim + (Math.random()*2-1));
  }
}


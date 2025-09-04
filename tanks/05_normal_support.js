// Normal Support — 아군 중심 보호, 포커스 파이어 동조, 중거리 유지
function name(){ return 'Normal Support'; }
function type(){ try { return Type.NORMAL; } catch(e){ return 1; } }

function update(tank, enemies, allies, bulletInfo){
  function dist(a,b){var dx=a.x-b.x, dy=a.y-b.y; return Math.hypot(dx,dy);} 
  function angleTo(ax,ay,bx,by){return Math.atan2(by-ay,bx-ax)*180/Math.PI;}
  function tryMove(a){ for(var i=0;i<10;i++){ var off=(i%2===0?1:-1)*Math.ceil(i/2)*12; tank.move(a+off);} }
  function leadAngle(src,dst,bs){
    var rx=dst.x-src.x, ry=dst.y-src.y; var dvx=dst.vx||0, dvy=dst.vy||0;
    var a=dvx*dvx+dvy*dvy-bs*bs, b=2*(rx*dvx+ry*dvy), c=rx*rx+ry*ry; var t;
    if(Math.abs(a)<1e-6){ t=(c>1e-6)?(-c/b):0; } else { var disc=b*b-4*a*c; if(disc<0)disc=0; var t1=(-b+Math.sqrt(disc))/(2*a); var t2=(-b-Math.sqrt(disc))/(2*a); t=Math.max(t1,t2);} if(!isFinite(t)||t<0) t=0;
    return angleTo(src.x,src.y, dst.x+(dst.vx||0)*t, dst.y+(dst.vy||0)*t);
  }
  function alliesCenter(){ if(!allies||allies.length===0) return {x:tank.x,y:tank.y}; var sx=0,sy=0; for(var i=0;i<allies.length;i++){sx+=allies[i].x;sy+=allies[i].y;} return {x:sx/allies.length, y:sy/allies.length}; }

  var P=(typeof PARAMS!=='undefined')?PARAMS:{};
  var midRange = P.ideal_range ?? 220;
  var bulletSpeed = P.bulletSpeed ?? 400;

  // 공동 타겟 선정: 아군 중심과 가장 가까운 적
  var center = alliesCenter();
  var focus=null, bd=1e9; if(enemies){ for(var i=0;i<enemies.length;i++){ var d=dist(center,enemies[i]); if(d<bd){bd=d; focus=enemies[i];} } }
  if(!focus && enemies && enemies.length) focus=enemies[0];

  // 탄 회피 우선
  var threat=null, best=-1e9; for(var i=0;i<(bulletInfo?bulletInfo.length:0);i++){ var b=bulletInfo[i]; var rx=tank.x-b.x, ry=tank.y-b.y; var d=Math.hypot(rx,ry)+1e-6; var rel=-(rx*(b.vx||0)+ry*(b.vy||0))/d; var sc=rel/d; if(sc>best){best=sc; threat=b;} }
  if(threat && best>0){ var ang=Math.atan2(threat.vy||0, threat.vx||0)*180/Math.PI; tryMove(ang+90*(Math.random()<0.5?1:-1)); return; }

  if(focus){
    var d = dist(tank, focus);
    var base = angleTo(tank.x,tank.y, focus.x, focus.y);
    var moveAng = (d>midRange? base : base+180) + (Math.random()<0.5?8:-8);
    tryMove(moveAng);
    // 동조 사격
    var aim = leadAngle(tank, focus, bulletSpeed);
    if((tank._ns_t=(tank._ns_t||0)+1) % (P.fire_every??5)===0){ tank.fire(aim + (Math.random()*2-1)); }
  }
}


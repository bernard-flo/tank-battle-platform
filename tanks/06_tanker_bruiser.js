// Tanker Bruiser — 전면 압박, 벽-슬라이딩, 지속 사격, 지그재그
function name(){ return 'Tanker Bruiser'; }
function type(){ try { return Type.TANKER; } catch(e){ return 2; } }

function update(tank, enemies, allies, bulletInfo){
  function dist(a,b){var dx=a.x-b.x, dy=a.y-b.y; return Math.hypot(dx,dy);} 
  function angleTo(ax,ay,bx,by){return Math.atan2(by-ay,bx-ax)*180/Math.PI;}
  function tryMove(a){ for(var i=0;i<10;i++){ var off=(i%2===0?1:-1)*Math.ceil(i/2)*10; tank.move(a+off);} }
  function leadAngle(src,dst,bs){
    var rx=dst.x-src.x, ry=dst.y-src.y; var dvx=dst.vx||0, dvy=dst.vy||0;
    var a=dvx*dvx+dvy*dvy-bs*bs, b=2*(rx*dvx+ry*dvy), c=rx*rx+ry*ry; var t;
    if(Math.abs(a)<1e-6){ t=(c>1e-6)?(-c/b):0; } else { var disc=b*b-4*a*c; if(disc<0)disc=0; var t1=(-b+Math.sqrt(disc))/(2*a); var t2=(-b-Math.sqrt(disc))/(2*a); t=Math.max(t1,t2);} if(!isFinite(t)||t<0) t=0;
    return angleTo(src.x,src.y, dst.x+(dst.vx||0)*t, dst.y+(dst.vy||0)*t);
  }

  var P=(typeof PARAMS!=='undefined')?PARAMS:{};
  var engageRange = P.ideal_range ?? 180;
  var strafe = P.strafe_deg ?? 18;
  var bulletSpeed = P.bulletSpeed ?? 400;

  // 위협 탄 회피는 짧고 빈도 낮게: 전면 압박 유지
  var threat=null, s=-1e9; for(var i=0;i<(bulletInfo?bulletInfo.length:0);i++){ var b=bulletInfo[i]; var rx=tank.x-b.x, ry=tank.y-b.y; var d=Math.hypot(rx,ry)+1e-6; var rel=-(rx*(b.vx||0)+ry*(b.vy||0))/d; var sc=rel/d; if(sc>s){s=sc; threat=b;} }
  if(threat && s>0 && (tank._br_t||0)%7===0){ var ang=Math.atan2(threat.vy||0, threat.vx||0)*180/Math.PI; tryMove(ang+90*(Math.random()<0.5?1:-1)); }

  if(!enemies||!enemies.length) return;
  // 목표: 최근접 적에게 압박
  var tgt=null, bd=1e9; for(var i=0;i<enemies.length;i++){ var d=dist(tank,enemies[i]); if(d<bd){bd=d; tgt=enemies[i];}}
  var base=angleTo(tank.x,tank.y,tgt.x,tgt.y);
  var t=(tank._br_t||0)+1; tank._br_t=t;
  // 벽-슬라이딩 힌트: 화면 가장자리 근처면 평행 이동 가중(가볍게 ±20°)
  var slide=0; var margin = (tank.size||16)*2;
  if(tank.x < margin) slide = 20; else if(tank.x > 800-margin) slide = -20;
  if(tank.y < margin) slide += 20; else if(tank.y > 600-margin) slide -= 20;
  var zig = (Math.sin(t*0.25)>0?1:-1) * strafe;
  var moveAng = base + slide + zig + (bd>engageRange?0:180);
  tryMove(moveAng);

  // 지속 사격
  if(t % (P.fire_every??4) === 0){ var aim=leadAngle(tank,tgt,bulletSpeed); tank.fire(aim + (Math.random()*2-1)); }
}


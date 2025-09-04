// Tanker Guardian — 선두 방패, 팀 중심 유지, 근접 위협 각도 제어
function name() { return 'Tanker Guardian'; }
function type() { try { return Type.TANKER; } catch (e) { return 2; } }

function update(tank, enemies, allies, bulletInfo) {
  // ---- 유틸 ----
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function dist(a, b) { var dx=a.x-b.x, dy=a.y-b.y; return Math.hypot(dx, dy); }
  function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax) * 180 / Math.PI; }
  function normDeg(a){ a%=360; if(a<-180) a+=360; if(a>180) a-=360; return a; }
  function tryMove(angleDeg) {
    // 실패 시 ±15° 보정 재시도 (최대 10회)
    var step = 15;
    for (var i=0;i<10;i++) {
      var ang = angleDeg + ((i%2===0?1:-1) * Math.ceil(i/2) * step);
      tank.move(ang);
    }
  }
  function nearest(list, from){
    var best=null, bd=1e9;
    for(var i=0;i<list.length;i++){
      var d=dist(list[i], from); if(d<bd){ bd=d; best=list[i]; }
    }
    return best;
  }
  function alliesCenter() {
    if(!allies||allies.length===0) return {x:tank.x,y:tank.y};
    var sx=0, sy=0; for(var i=0;i<allies.length;i++){ sx+=allies[i].x; sy+=allies[i].y; }
    return {x:sx/allies.length, y:sy/allies.length};
  }
  function leadAngle(src, dst, bulletSpeed){
    // 간단한 짧은 리드샷: 상대 속도 평균이 없으므로 vx,vy 기반 추정만 사용
    var rx = dst.x - src.x, ry = dst.y - src.y;
    var dvx = dst.vx||0, dvy = dst.vy||0;
    var a = dvx*dvx + dvy*dvy - bulletSpeed*bulletSpeed;
    var b = 2*(rx*dvx + ry*dvy);
    var c = rx*rx + ry*ry;
    var t; // 충돌 시간 근사
    if (Math.abs(a) < 1e-6) {
      t = (c>1e-6) ? (-c/b) : 0;
    } else {
      var disc = b*b - 4*a*c; if (disc < 0) disc = 0;
      var t1 = (-b + Math.sqrt(disc)) / (2*a);
      var t2 = (-b - Math.sqrt(disc)) / (2*a);
      t = Math.max(t1, t2);
    }
    if (!isFinite(t) || t < 0) t = 0;
    var aimX = dst.x + (dst.vx||0)*t; var aimY = dst.y + (dst.vy||0)*t;
    return angleTo(src.x, src.y, aimX, aimY);
  }

  // ---- 파라미터 ----
  var PARAMS = (typeof PARAMS !== 'undefined') ? PARAMS : {};
  var idealRange = PARAMS.ideal_range ?? 200;
  var bulletSpeed = PARAMS.bulletSpeed ?? 400; // px/s (엔진에서는 per-tick 주입)

  // ---- 위협 탄 분석 ----
  var mostThreat=null, bestScore=-1e9;
  for(var i=0;i<(bulletInfo?bulletInfo.length:0);i++){
    var b = bulletInfo[i];
    var rx = tank.x - b.x, ry = tank.y - b.y;
    var d = Math.hypot(rx, ry) + 1e-6;
    var relSpeed = -(rx*(b.vx||0) + ry*(b.vy||0)) / d; // 접근 속도 성분
    var score = relSpeed / d; // 접근속도 · 역거리
    if (score > bestScore) { bestScore=score; mostThreat=b; }
  }

  if (mostThreat && bestScore > 0) {
    // 탄 궤적에 수직 이동(보스턴 회피)
    var ang = Math.atan2(mostThreat.vy||0, mostThreat.vx||0) * 180/Math.PI;
    var evade = ang + 90 * (Math.random()<0.5?1:-1);
    tryMove(evade);
  } else {
    // 팀 중심 근처 유지 + 최근접 적 추적
    var center = alliesCenter();
    var target = nearest(enemies||[], tank) || null;
    if (target) {
      // 거리 유지: idealRange로 수렴
      var d = dist(target, tank);
      var baseAng = angleTo(tank.x, tank.y, target.x, target.y);
      var moveAng = (d>idealRange? baseAng : baseAng+180);
      // 약간의 난수화로 예측 회피
      moveAng += (Math.random()*10-5);
      tryMove(moveAng);

      // 짧은 리드샷
      var aim = leadAngle(tank, target, bulletSpeed);
      var jitter = (Math.random()*4-2);
      tank.fire(aim + jitter);
    } else {
      // 타겟이 없으면 팀 중심에 정렬
      var angToC = angleTo(tank.x, tank.y, center.x, center.y);
      tryMove(angToC);
    }
  }
}


function name(){return 'Omega Anchor';}
function type(){return Type.TANKER;}
function update(tank,enemies,allies,bulletInfo){
    function tryMove(angles){for(let a of angles){if(tank.move(a))return true;}return false;}function bestThreat(){let best=null,score=1e9;for(let b of bulletInfo){const rx=b.x-tank.x,ry=b.y-tank.y,vx=b.vx,vy=b.vy;const s2=vx*vx+vy*vy;if(!s2)continue;const t=-(rx*vx+ry*vy)/s2;if(t<0||t>28)continue;const cx=rx+vx*t,cy=ry+vy*t;const d=Math.hypot(cx,cy);const safe=tank.size/2+10.101371250033973;if(d>safe+10.101371250033973)continue;const sc=d*0.88+t*3;if(sc<score){score=sc;best=b;}}return best;}
    if(!enemies||!enemies.length)return;
    const ecx=enemies.reduce((s,e)=>s+e.x,0)/enemies.length; const ecy=enemies.reduce((s,e)=>s+e.y,0)/enemies.length;
    const acx=allies.length?allies.reduce((s,a)=>s+a.x,0)/allies.length:tank.x; const acy=allies.length?allies.reduce((s,a)=>s+a.y,0)/allies.length:tank.y;
    const fx=(acx*2+ecx)/3, fy=(acy*2+ecy)/3; const toF=Math.atan2(fy-tank.y,fx-tank.x)*180/Math.PI; const df=Math.hypot(fx-tank.x,fy-tank.y);
    let ang = df<112.20839249657836? toF+90 : toF;
    let avoided=false; const th=bestThreat(); if(th){const deg=(Math.atan2(th.vy,th.vx)+Math.PI/2)*180/Math.PI; avoided=tryMove([deg,deg+20,deg-20,deg+35,deg-35]);}
    if(!avoided) tryMove([ang, ang+15, ang-15, toF]);
    let n=enemies[0]; for(let e of enemies){const s1=Math.max(0,n.health)*0.6+n.distance*0.25;const s2=Math.max(0,e.health)*0.6+e.distance*0.25; if(s2<s1)n=e;}
    const toN=Math.atan2(n.y-tank.y,n.x-tank.x)*180/Math.PI; const jitter=(Math.random()-0.5)*9.835678706828162; tank.fire(toN + jitter);
  }
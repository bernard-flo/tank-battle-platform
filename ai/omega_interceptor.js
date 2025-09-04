function name(){return 'Omega Interceptor';}
function type(){return Type.NORMAL;}
function update(tank,enemies,allies,bulletInfo){
    function tryMove(angles){for(let a of angles){if(tank.move(a))return true;}return false;}function bestThreat(){let best=null,score=1e9;for(let b of bulletInfo){const rx=b.x-tank.x,ry=b.y-tank.y,vx=b.vx,vy=b.vy;const s2=vx*vx+vy*vy;if(!s2)continue;const t=-(rx*vx+ry*vy)/s2;if(t<0||t>22.207730332429)continue;const cx=rx+vx*t,cy=ry+vy*t;const d=Math.hypot(cx,cy);const safe=tank.size/2+10;if(d>safe+10)continue;const sc=d*0.88+t*3;if(sc<score){score=sc;best=b;}}return best;}
    if(!enemies||!enemies.length)return;
    const ecx=enemies.reduce((s,e)=>s+e.x,0)/enemies.length; const ecy=enemies.reduce((s,e)=>s+e.y,0)/enemies.length; const toC=Math.atan2(ecy-tank.y,ecx-tank.x)*180/Math.PI;
    const th=bestThreat(); if(th){ const deg=(Math.atan2(th.vy,th.vx)+Math.PI/2)*180/Math.PI; if(!tryMove([deg,deg+25,deg-25,deg+45,deg-45])) tryMove([deg+160,deg-160]); }
    else { const d=Math.hypot(ecx-tank.x,ecy-tank.y); let ang=toC + (d<221.3745302191139?180:90)*(Math.random()<0.5?1:-1); tryMove([ang, ang+20, ang-20, toC]); }
    let n=enemies[0]; for(let e of enemies) if(e.distance<n.distance) n=e; const to=Math.atan2(n.y-tank.y,n.x-tank.x)*180/Math.PI; tank.fire(to);
  }
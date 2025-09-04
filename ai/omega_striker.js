function name(){return 'Omega Striker';}
function type(){return Type.DEALER;}
function update(tank,enemies,allies,bulletInfo){
    function tryMove(angles){for(let a of angles){if(tank.move(a))return true;}return false;}function bestThreat(){let best=null,score=1e9;for(let b of bulletInfo){const rx=b.x-tank.x,ry=b.y-tank.y,vx=b.vx,vy=b.vy;const s2=vx*vx+vy*vy;if(!s2)continue;const t=-(rx*vx+ry*vy)/s2;if(t<0||t>19.818809385104213)continue;const cx=rx+vx*t,cy=ry+vy*t;const d=Math.hypot(cx,cy);const safe=tank.size/2+8;if(d>safe+8)continue;const sc=d*0.88+t*3;if(sc<score){score=sc;best=b;}}return best;}
    if(!enemies||!enemies.length)return;
    let n=enemies[0]; for(let e of enemies){const s1=Math.max(0,n.health)*0.6+n.distance*0.25;const s2=Math.max(0,e.health)*0.6+e.distance*0.25; if(s2<s1)n=e;}
    const to=Math.atan2(n.y-tank.y,n.x-tank.x)*180/Math.PI; const err=n.distance-196.4340508912504;
    let strafe = to + 90*(Math.random()<0.5?1:-1);
    if(Math.abs(err)>33.40953239549262) strafe = err<0? to+180 : to;
    let dodged=false; const th=bestThreat(); if(th){ const deg=(Math.atan2(th.vy,th.vx)+Math.PI/2)*180/Math.PI; dodged=tryMove([deg,deg+20,deg-20,deg+40,deg-40]); }
    if(!dodged) tryMove([strafe, strafe+20, strafe-20, to, to+180]);
    const lead=Math.min(20, Math.max(-20, n.distance/11)); tank.fire(to + (err>0? (lead*0.28076667095350116) : 0));
  }
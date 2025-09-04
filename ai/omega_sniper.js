function name(){return 'Omega Sniper';}
function type(){return Type.DEALER;}
function update(tank,enemies,allies,bulletInfo){
    function tryMove(angles){for(let a of angles){if(tank.move(a))return true;}return false;}
    if(!enemies||!enemies.length)return;
    let t=enemies[0]; for(let e of enemies) if(e.health<t.health) t=e;
    const to=Math.atan2(t.y-tank.y,t.x-tank.x)*180/Math.PI; const err=t.distance-220;
    let ang=to+90*(Math.random()<0.5?1:-1); if(err<-33.33098247151628) ang=to+180; if(err>55.28106377097052) ang=to; tryMove([ang, ang+20, ang-20, to+180]);
    const lead=Math.min(24, Math.max(-24, t.distance/12)); const jitter=(Math.random()-0.5)*3.102309958895365; tank.fire(to + (err>0? lead*0.5:0) + jitter);
  }
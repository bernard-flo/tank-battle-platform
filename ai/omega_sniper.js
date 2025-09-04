function name(){return 'Omega Sniper';}
function type(){return Type.DEALER;}
function update(tank,enemies,allies,bulletInfo){
    function tryMove(angles){for(let a of angles){if(tank.move(a))return true;}return false;}
    if(!enemies||!enemies.length)return;
    let t=enemies[0]; for(let e of enemies) if(e.health<t.health) t=e;
    const to=Math.atan2(t.y-tank.y,t.x-tank.x)*180/Math.PI; const err=t.distance-255.61018678905822;
    let ang=to+90*(Math.random()<0.5?1:-1); if(err<-37.439345700851504) ang=to+180; if(err>60.567350546749715) ang=to; tryMove([ang, ang+20, ang-20, to+180]);
    const lead=Math.min(24, Math.max(-24, t.distance/8.142488140489172)); const jitter=(Math.random()-0.5)*7.7601010376876225; tank.fire(to + (err>0? lead*0.3218907119844187:0) + jitter);
  }
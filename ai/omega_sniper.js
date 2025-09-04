function name(){return 'Omega Sniper';}
function type(){return Type.DEALER;}
function update(tank,enemies,allies,bulletInfo){
    function tryMove(angles){for(let a of angles){if(tank.move(a))return true;}return false;}
    if(!enemies||!enemies.length)return;
    let t=enemies[0]; for(let e of enemies) if(e.health<t.health) t=e;
    const to=Math.atan2(t.y-tank.y,t.x-tank.x)*180/Math.PI; const err=t.distance-300.908426014434;
    let ang=to+90*(Math.random()<0.5?1:-1); if(err<-55.11927689228968) ang=to+180; if(err>114.73561010570663) ang=to; tryMove([ang, ang+20, ang-20, to+180]);
    const lead=Math.min(24, Math.max(-24, t.distance/8.174606249724278)); const jitter=(Math.random()-0.5)*6.845204801430592; tank.fire(to + (err>0? lead*0.4037259096742656:0) + jitter);
  }
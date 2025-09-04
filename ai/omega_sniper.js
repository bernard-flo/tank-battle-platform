function name(){return 'Omega Sniper';}
function type(){return Type.DEALER;}
function update(tank,enemies,allies,bulletInfo){
    function tryMove(angles){for(let a of angles){if(tank.move(a))return true;}return false;}
    if(!enemies||!enemies.length)return;
    let t=enemies[0]; for(let e of enemies) if(e.health<t.health) t=e;
    const to=Math.atan2(t.y-tank.y,t.x-tank.x)*180/Math.PI; const err=t.distance-233.36072941557032;
    let ang=to+90*(Math.random()<0.5?1:-1); if(err<-67.02975521982349) ang=to+180; if(err>57.181861530649) ang=to; tryMove([ang, ang+20, ang-20, to+180]);
    const lead=Math.min(24, Math.max(-24, t.distance/11.151773448277222)); const jitter=(Math.random()-0.5)*4.165615841020884; tank.fire(to + (err>0? lead*0.5:0) + jitter);
  }
function name(){return 'Omega Sweeper';}
function type(){return Type.NORMAL;}
function update(tank,enemies,allies,bulletInfo){
    function tryMove(angles){for(let a of angles){if(tank.move(a))return true;}return false;}
    if(!enemies||!enemies.length)return;
    const ecx=enemies.reduce((s,e)=>s+e.x,0)/enemies.length; const ecy=enemies.reduce((s,e)=>s+e.y,0)/enemies.length; const toC=Math.atan2(ecy-tank.y,ecx-tank.x)*180/Math.PI;
    const d=Math.hypot(ecx-tank.x,ecy-tank.y); let orbit=toC + (d<174.45524188174608?180:90); tryMove([orbit, orbit+20, orbit-20, toC]);
    let tgt=enemies[0]; for(let e of enemies){const s1=tgt.distance+Math.max(0,tgt.health)*0.02; const s2=e.distance+Math.max(0,e.health)*0.02; if(s2<s1) tgt=e;}
    const toT=Math.atan2(tgt.y-tank.y,tgt.x-tank.x)*180/Math.PI; const off=(tgt.distance>200? [-6,0,6] : [-4,0,4]); tank.fire(toT + off[Math.floor(Math.random()*off.length)]);
  }
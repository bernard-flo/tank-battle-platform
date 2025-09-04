import { runMatch, Type } from './engine.js';

const dumbBot = {
  name: 'Dumb',
  type: Type.NORMAL,
  typeName: 'NORMAL',
  params: {},
  update: (tank, enemies)=>{
    if (enemies && enemies[0]){
      const ex=enemies[0].x, ey=enemies[0].y;
      const ang = Math.atan2(ey - tank.y, ex - tank.x) * 180/Math.PI;
      tank.move(0);
      tank.fire(ang);
    }
  }
};

const res = runMatch({ botA: dumbBot, botB: dumbBot, seed: 1, rounds: 3 });
console.log(res);


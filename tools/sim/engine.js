import fs from 'fs';
import path from 'path';
import seedrandom from 'seedrandom';

export const DEFAULTS = Object.freeze({
  WIDTH: 800,
  HEIGHT: 600,
  TANK_R: 16,
  BULLET_R: 16,
  BULLET_SPEED: 400, // px/s
  BULLET_LIFE: 4.0,  // s
  FIRE_COOLDOWN: 0.5, // s
  TIME_LIMIT: 90, // s
  DT: 0.016,
  HP: 100,
  DAMAGE: 50,
  SPEEDS: { NORMAL: 120, TANKER: 105, DEALER: 130 },
});

export const Type = Object.freeze({ NORMAL: 1, TANKER: 2, DEALER: 3 });

function deg2rad(d){ return d * Math.PI / 180; }

function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

function vecFromAngleDeg(deg){ const r=deg2rad(deg); return [Math.cos(r), Math.sin(r)]; }

function dist2(a,b){ const dx=a.x-b.x, dy=a.y-b.y; return dx*dx+dy*dy; }

function makeTankApi(side, type, state, rng){
  // state: { x,y, hp, vx, vy, lastMoveDeg, fireCd, bullets:[] }
  return {
    get x(){ return state.x; },
    get y(){ return state.y; },
    get hp(){ return state.hp; },
    get size(){ return DEFAULTS.TANK_R; },
    move(angDeg){
      state.lastMoveDeg = angDeg; // 엔진 틱에서 적용 (deg→rad 변환)
    },
    fire(angDeg){
      if (state.fireCd > 0) return false;
      const [ux,uy] = vecFromAngleDeg(angDeg);
      state.fireQueue.push({ ux, uy });
      state.fireCd = DEFAULTS.FIRE_COOLDOWN; // enforce cooldown
      return true;
    },
    // 내부 상태 보관용(권장 X) — 호환을 위해 그대로 전달
    _state: state,
    Math: { random: () => rng() },
  };
}

function withinBounds(x, y){
  const r = DEFAULTS.TANK_R;
  return x>=r && x<=DEFAULTS.WIDTH-r && y>=r && y<=DEFAULTS.HEIGHT-r;
}

function stepSimulation(world, dt){
  const { bullets, tanks } = world;
  // 이동 적용
  for (const t of tanks){
    // 쿨다운 감소
    t.fireCd = Math.max(0, t.fireCd - dt);
    // 이동 적용 (deg→rad 변환된 lastMoveDeg 사용)
    const speed = t.speed;
    const [ux,uy] = vecFromAngleDeg(t.lastMoveDeg ?? 0);
    let nx = t.x + ux * speed * dt;
    let ny = t.y + uy * speed * dt;
    // 벽 충돌: 슬라이딩 느낌으로 가장자리에서 평행 유지
    const r = DEFAULTS.TANK_R;
    if (nx < r) { nx = r; }
    if (nx > DEFAULTS.WIDTH - r) { nx = DEFAULTS.WIDTH - r; }
    if (ny < r) { ny = r; }
    if (ny > DEFAULTS.HEIGHT - r) { ny = DEFAULTS.HEIGHT - r; }
    t.x = nx; t.y = ny;
    // 발사 처리(큐)
    if (t.fireQueue.length){
      const { ux:bx, uy:by } = t.fireQueue.shift();
      bullets.push({ x: t.x, y: t.y, vx: bx*DEFAULTS.BULLET_SPEED, vy: by*DEFAULTS.BULLET_SPEED, life: DEFAULTS.BULLET_LIFE, side: t.side, owner: t.id });
    }
  }

  // 탄 이동
  for (const b of bullets){
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  }
  // 탄 생존 필터(경계 밖/수명 만료 제거)
  for (let i=bullets.length-1;i>=0;i--){
    const b = bullets[i];
    if (b.life<=0 || b.x< -50 || b.y< -50 || b.x>DEFAULTS.WIDTH+50 || b.y>DEFAULTS.HEIGHT+50){ bullets.splice(i,1); }
  }
  // 충돌(아군/자기탄 무시)
  for (const b of bullets){
    for (const t of tanks){
      if (t.side === b.side) continue; // friendly ignore
      const rr = (DEFAULTS.TANK_R + DEFAULTS.BULLET_R);
      if ( (t.x-b.x)*(t.x-b.x) + (t.y-b.y)*(t.y-b.y) <= rr*rr ){
        t.hp -= DEFAULTS.DAMAGE;
        b.life = -1; // 소멸
      }
    }
  }
  // 사망 탄 정리
  for (let i=bullets.length-1;i>=0;i--){ if (bullets[i].life<=0) bullets.splice(i,1); }
}

function toPublicTank(t){
  return { x:t.x, y:t.y, vx:0, vy:0, hp:t.hp, health: t.hp };
}

export function runMatch({ botA, botB, seed = 42, rounds = 3 }){
  const results = [];
  const rng = seedrandom(String(seed));
  function R(){ return rng(); }

  for (let r=0; r<rounds; r++){
    // 초기 배치: 좌/우
    const tA = { id: 1, side: 'A', x: DEFAULTS.WIDTH*0.25, y: DEFAULTS.HEIGHT*0.5, hp: DEFAULTS.HP, speed: DEFAULTS.SPEEDS[botA.typeName], lastMoveDeg: 0, fireCd: 0, fireQueue: [] };
    const tB = { id: 2, side: 'B', x: DEFAULTS.WIDTH*0.75, y: DEFAULTS.HEIGHT*0.5, hp: DEFAULTS.HP, speed: DEFAULTS.SPEEDS[botB.typeName], lastMoveDeg: 180, fireCd: 0, fireQueue: [] };
    const world = { bullets: [], tanks: [tA, tB] };

    // PARAMS 주입: per-tick bulletSpeed 단위로
    const perTickBullet = DEFAULTS.BULLET_SPEED * DEFAULTS.DT;
    const P = (k)=>Object.freeze({ ...(botA.params||{}), bulletSpeed: perTickBullet });
    const Q = (k)=>Object.freeze({ ...(botB.params||{}), bulletSpeed: perTickBullet });

    // API 생성
    const apiA = makeTankApi('A', botA.type, tA, R);
    const apiB = makeTankApi('B', botB.type, tB, R);

    // 틱 루프
    let time = 0; let winA=0, winB=0;
    const maxTicks = Math.floor(DEFAULTS.TIME_LIMIT/DEFAULTS.DT);
    for (let tick=0; tick<maxTicks; tick++){
      // 공개 정보 구성
      const enemiesForA = [toPublicTank(tB)];
      const enemiesForB = [toPublicTank(tA)];
      const alliesA = []; const alliesB = [];
      const bulletInfoForA = world.bullets.filter(b=>b.side==='B').map(b=>({x:b.x,y:b.y,vx:b.vx,vy:b.vy}));
      const bulletInfoForB = world.bullets.filter(b=>b.side==='A').map(b=>({x:b.x,y:b.y,vx:b.vx,vy:b.vy}));

      // PARAMS/Type/Math.random 샌드박스 주입은 loader에서 처리, 여기선 update 호출만
      try { botA.update.call(null, apiA, enemiesForA, alliesA, bulletInfoForA, P('A')); } catch(e) { /* ignore */ }
      try { botB.update.call(null, apiB, enemiesForB, alliesB, bulletInfoForB, Q('B')); } catch(e) { /* ignore */ }

      stepSimulation(world, DEFAULTS.DT);
      time += DEFAULTS.DT;
      if (tA.hp<=0 || tB.hp<=0){
        if (tA.hp>tB.hp) winA=1; else if (tB.hp>tA.hp) winB=1; else { winA=0; winB=0; }
        break;
      }
    }
    if (tA.hp>0 && tB.hp>0){ // 시간 초과 판정
      if (tA.hp>tB.hp) winA=1; else if (tB.hp>tA.hp) winB=1; else { winA=0; winB=0; }
    }
    const aliveDiff = (tA.hp>0?1:0) - (tB.hp>0?1:0);
    results.push({ round:r+1, winA, winB, aliveDiff, time: Number(time.toFixed(3)) });
  }
  return results;
}

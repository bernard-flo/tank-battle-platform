import path from 'path';
import seedrandom from 'seedrandom';
import { loadBot } from './loader.js';

// 엔진 기본값 및 상수
export const DEFAULTS = Object.freeze({
  WIDTH: 800, HEIGHT: 600,
  TANK_R: 16, BULLET_R: 7,
  BULLET_SPEED: 400, FIRE_COOLDOWN: 0.5,
  SPEED: { NORMAL: 120, TANKER: 105, DEALER: 130 },
  DAMAGE: 35,
  BULLET_LIFE: 4.0, // seconds
  DT: 0.016, TIME_LIMIT: 90
});

export function makeRng(seed) {
  const rng = seedrandom(String(seed ?? 0));
  return () => rng.quick();
}

function typeToSpeedMask(t) {
  // Type bitmask: NORMAL=1, TANKER=2, DEALER=4
  if (t & 2) return 'TANKER';
  if (t & 4) return 'DEALER';
  return 'NORMAL';
}

function mkTankEntity(id, side, botApi) {
  const typeMask = botApi.type();
  const speedKey = typeToSpeedMask(typeMask);
  const hpBase = (speedKey === 'TANKER') ? 140 : (speedKey === 'DEALER' ? 90 : 110);
  return {
    id, side,
    x: 0, y: 0, vx: 0, vy: 0,
    hp: hpBase, alive: true,
    typeMask, speedKey,
    fireCd: 0,
    moved: false,
    // move/fire API는 라디안 각도 기준
    move: null,
    fire: null,
  };
}

export function runMatch(opts) {
  const { a, b, seed = 42, rounds = 5 } = opts;
  const rng = makeRng(seed);
  const APath = path.resolve(process.cwd(), a);
  const BPath = path.resolve(process.cwd(), b);
  const botA = loadBot(APath, { rng });
  const botB = loadBot(BPath, { rng });

  const perRound = [];
  let sumTime = 0, sumAliveDiff = 0, winA = 0, winB = 0;

  for (let r = 0; r < rounds; r++) {
    // 초기 배치
    const A = mkTankEntity('A', 0, botA);
    const B = mkTankEntity('B', 1, botB);
    A.x = DEFAULTS.WIDTH * 0.25; A.y = DEFAULTS.HEIGHT * 0.5;
    B.x = DEFAULTS.WIDTH * 0.75; B.y = DEFAULTS.HEIGHT * 0.5;

    const bullets = [];
    let t = 0;
    const dt = DEFAULTS.DT;
    const speedA = DEFAULTS.SPEED[A.speedKey] * dt;
    const speedB = DEFAULTS.SPEED[B.speedKey] * dt;
    const bulletStep = DEFAULTS.BULLET_SPEED * dt;
    const bulletLifeTicks = Math.floor(DEFAULTS.BULLET_LIFE / dt);

    // 노출용 탱크 API 래퍼
    function makeTankApi(ent, speedPerTick) {
      const api = {
        get x() { return ent.x; }, get y() { return ent.y; },
        get vx() { return ent.vx; }, get vy() { return ent.vy; },
        get hp() { return ent.hp; },
        get size() { return DEFAULTS.TANK_R; },
        // 스니펫은 degree 입력을 사용. 내부는 rad로 변환
        move(thetaDeg) {
          if (ent.moved || !ent.alive) return false;
          const theta = (thetaDeg ?? 0) * Math.PI / 180;
          const nx = ent.x + Math.cos(theta) * speedPerTick;
          const ny = ent.y + Math.sin(theta) * speedPerTick;
          // 벽 충돌 방지
          const r = DEFAULTS.TANK_R;
          if (nx - r < 0 || nx + r > DEFAULTS.WIDTH || ny - r < 0 || ny + r > DEFAULTS.HEIGHT) {
            return false;
          }
          ent.vx = nx - ent.x; ent.vy = ny - ent.y;
          ent.x = nx; ent.y = ny; ent.moved = true; return true;
        },
        fire(thetaDeg) {
          if (!ent.alive || ent.fireCd > 0) return false;
          const bx = ent.x, by = ent.y;
          const theta = (thetaDeg ?? 0) * Math.PI / 180;
          const vx = Math.cos(theta) * bulletStep;
          const vy = Math.sin(theta) * bulletStep;
          bullets.push({ x: bx, y: by, vx, vy, side: ent.side, owner: ent.id, life: bulletLifeTicks });
          ent.fireCd = Math.floor(DEFAULTS.FIRE_COOLDOWN / dt);
          return true;
        }
      };
      return api;
    }

    const apiA = makeTankApi(A, speedA);
    const apiB = makeTankApi(B, speedB);

    // 라운드 실행 루프
    let aliveDiff = 0;
    while (t < DEFAULTS.TIME_LIMIT && A.alive && B.alive) {
      // 쿨다운/상태 초기화
      A.moved = false; B.moved = false;
      if (A.fireCd > 0) A.fireCd--; if (B.fireCd > 0) B.fireCd--;

      // 적/아군/총알 정보 구성(상대 탄약만 제공)
      const aEnemies = [{ x: B.x, y: B.y, vx: B.vx, vy: B.vy, hp: B.hp, health: B.hp }];
      const bEnemies = [{ x: A.x, y: A.y, vx: A.vx, vy: A.vy, hp: A.hp, health: A.hp }];
      const aAllies = [];
      const bAllies = [];
      const aBullets = bullets.filter(bu => bu.side !== A.side).map(bu => ({ x: bu.x, y: bu.y, vx: bu.vx, vy: bu.vy }));
      const bBullets = bullets.filter(bu => bu.side !== B.side).map(bu => ({ x: bu.x, y: bu.y, vx: bu.vx, vy: bu.vy }));

      // 봇 업데이트 호출(샌드박스 로더에서 console 제거됨)
      try { botA.update(apiA, aEnemies, aAllies, aBullets); } catch (e) { /* 무시 */ }
      try { botB.update(apiB, bEnemies, bAllies, bBullets); } catch (e) { /* 무시 */ }

      // 총알 이동 및 수명 처리
      for (const bu of bullets) {
        bu.x += bu.vx; bu.y += bu.vy; bu.life--;
      }
      // 충돌 판정: 아군/자기탄 무시
      for (const bu of bullets) {
        if (bu.life <= 0) continue;
        // 벽 밖
        if (bu.x < 0 || bu.x > DEFAULTS.WIDTH || bu.y < 0 || bu.y > DEFAULTS.HEIGHT) { bu.life = 0; continue; }
        // A 명중
        if (A.alive && bu.side !== A.side) {
          const dx = A.x - bu.x, dy = A.y - bu.y;
          if (dx*dx + dy*dy <= (DEFAULTS.TANK_R + DEFAULTS.BULLET_R) ** 2) {
            A.hp -= DEFAULTS.DAMAGE; bu.life = 0; if (A.hp <= 0) { A.alive = false; }
          }
        }
        // B 명중
        if (B.alive && bu.side !== B.side) {
          const dx = B.x - bu.x, dy = B.y - bu.y;
          if (dx*dx + dy*dy <= (DEFAULTS.TANK_R + DEFAULTS.BULLET_R) ** 2) {
            B.hp -= DEFAULTS.DAMAGE; bu.life = 0; if (B.hp <= 0) { B.alive = false; }
          }
        }
      }
      // 탄환 정리
      for (let i = bullets.length - 1; i >= 0; i--) {
        if (bullets[i].life <= 0) bullets.splice(i, 1);
      }

      t += dt;
    }

    // 라운드 결과 집계
    const roundTime = t;
    const wA = (A.alive && !B.alive) ? 1 : 0;
    const wB = (B.alive && !A.alive) ? 1 : 0;
    if (wA) winA++; if (wB) winB++;
    aliveDiff = (A.alive?1:0) - (B.alive?1:0);
    sumTime += roundTime; sumAliveDiff += aliveDiff;
    perRound.push({ round: r+1, winA: wA, winB: wB, aliveDiff, time: roundTime });
  }

  const avgTime = sumTime / rounds;
  const avgAliveDiff = sumAliveDiff / rounds;
  return {
    rounds: perRound,
    summary: { a, b, seed, rounds, winA, winB, avgAliveDiff, avgTime }
  };
}

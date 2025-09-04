// NOTE: 시뮬레이터 엔진 골격 (추후 상세 구현)
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
  // TODO: seedrandom 적용 예정. 임시 RNG.
  let s = (typeof seed === 'number' ? seed : (seed||'').split('').reduce((a,c)=>a+c.charCodeAt(0), 0)) >>> 0;
  return function() { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s>>>0) / 0xffffffff); };
}

export function runMatch(opts) {
  // TODO: 실제 엔진 구현. 현재는 결과 스텁 저장만.
  const { a, b, seed = 42, rounds = 3, out = 'tools/sim/results/last_match.csv' } = opts;
  return { summary: { seed, rounds, a, b, winA: 0, winB: 0, avgAliveDiff: 0, avgTime: 0 }, out };
}

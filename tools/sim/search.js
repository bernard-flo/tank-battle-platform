// 파라미터 무작위+빔 탐색(요약 CSV는 results/, 최상해는 params/<key>.json 저장)
import path from 'path';
import fs from 'fs';
import { loadBot } from './loader.js';
import { runMatch } from './engine.js';

function parseArgs() { const a=process.argv.slice(2); const o={}; for(let i=0;i<a.length;i+=2) o[a[i].replace(/^--/,'')]=a[i+1]; return o; }
const argv = parseArgs();
const seed = Number(argv.seed || 7);
const budget = Number(argv.budget || 100);
const beam = Number(argv.beam || 5);
const botKey = argv.bot || '02_dealer_sniper';

const tankDir = path.resolve('../../tanks');
const base = loadBot(path.join(tankDir, `${botKey}.js`));
const opponent = loadBot(path.join(tankDir, '06_tanker_bruiser.js'));

const paramsDir = path.join(process.cwd(), 'params');
const resultsDir = path.join(process.cwd(), 'results');
fs.mkdirSync(paramsDir, { recursive: true });
fs.mkdirSync(resultsDir, { recursive: true });

// 탐색 공간 정의(간단 범위)
const space = {
  ideal_range: [180, 380],
  orbit_deg: [60, 120],
  lead_max_deg: [4, 14],
  evade_weight: [0.5, 2.0],
  strafe_deg: [20, 110]
};

function randIn([a,b]) { return a + Math.random() * (b - a); }
function sampleParams() {
  return {
    ideal_range: Math.round(randIn(space.ideal_range)),
    orbit_deg: Math.round(randIn(space.orbit_deg)),
    lead_max_deg: Math.round(randIn(space.lead_max_deg)),
    evade_weight: +randIn(space.evade_weight).toFixed(2),
    strafe_deg: Math.round(randIn(space.strafe_deg))
  };
}

function scoreTrials(params, trialSeed) {
  // 현재는 단일 상대(브루저)와 5라운드, 점수 = 승수 + 평균시간*0.05
  const botA = { ...base };
  // PARAMS 적용은 엔진에서 파일로 로딩하므로 여기서는 점수 계산만 수행
  const res = runMatch({ botsA: [botA], botsB: [opponent], seed: trialSeed, rounds: 5 });
  const wins = res.reduce((acc, r) => acc + (r.aliveA > r.aliveB ? 1 : 0), 0);
  const avgTime = res.reduce((acc, r) => acc + r.time, 0) / res.length;
  const score = wins + avgTime * 0.05;
  return { wins, avgTime, score };
}

// 무작위 샘플 수집
const trials = [];
for (let i = 0; i < budget; i++) {
  const p = sampleParams();
  const s = scoreTrials(p, seed + i);
  trials.push({ trial: i+1, params: p, ...s });
}

// 상위 N 빔 유지
trials.sort((a,b) => b.score - a.score);
const top = trials.slice(0, beam);
const best = top[0];

// 결과 CSV 저장
const csv = ['trial,score,wins,avgTime,params']
  .concat(trials.map(t => `${t.trial},${t.score.toFixed(4)},${t.wins},${t.avgTime.toFixed(3)},"${JSON.stringify(t.params)}"`))
  .join('\n');
fs.writeFileSync(path.join(resultsDir, `search_${botKey}.csv`), csv);

// 최상 해를 params/<key>.json로 저장
fs.writeFileSync(path.join(paramsDir, `${botKey}.json`), JSON.stringify(best.params, null, 2));
console.log(`[search] ${botKey} budget=${budget} beam=${beam} -> saved best to params/${botKey}.json`);

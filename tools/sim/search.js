// 파라미터 탐색(빔/GA/다상대) — 결과는 results/, 최상해는 params/<key>.json 저장
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
const mode = argv.mode || 'beam'; // beam | ga
const gens = Number(argv.gens || 20);
const pop = Number(argv.pop || 30);
const elite = Number(argv.elite || 4);
const mut = Number(argv.mut || 0.2);
const timeW = Number(argv.timeW || 0.05);
const check = argv.check === 'true' || argv.check === '1';
const opponentsList = (argv.opponents || '06_tanker_bruiser').split(',').map(s=>s.trim()).filter(Boolean);

const tankDir = path.resolve('../../tanks');
const base = loadBot(path.join(tankDir, `${botKey}.js`));
const opponents = opponentsList.map(k => loadBot(path.join(tankDir, `${k}.js`)));

const paramsDir = path.join(process.cwd(), 'params');
const historyDir = path.join(paramsDir, 'history', botKey);
const resultsDir = path.join(process.cwd(), 'results');
fs.mkdirSync(paramsDir, { recursive: true });
fs.mkdirSync(historyDir, { recursive: true });
fs.mkdirSync(resultsDir, { recursive: true });

// 탐색 공간 정의(간단 범위)
const space = {
  ideal_range: [180, 380],
  orbit_deg: [60, 120],
  lead_max_deg: [4, 14],
  evade_weight: [0.5, 2.0],
  strafe_deg: [20, 110]
};

const nowTs = () => new Date().toISOString().replace(/[:.]/g,'-');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function randIn([a,b]) { return a + Math.random() * (b - a); }
function gauss() { // Box-Muller
  let u=0,v=0; while(u===0) u=Math.random(); while(v===0) v=Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
}
function sampleParams() {
  return {
    ideal_range: Math.round(randIn(space.ideal_range)),
    orbit_deg: Math.round(randIn(space.orbit_deg)),
    lead_max_deg: Math.round(randIn(space.lead_max_deg)),
    evade_weight: +randIn(space.evade_weight).toFixed(2),
    strafe_deg: Math.round(randIn(space.strafe_deg))
  };
}

function mutate(p, rate=mut) {
  const q = { ...p };
  if (Math.random() < rate) q.ideal_range = Math.round(clamp(p.ideal_range + gauss()*20, ...space.ideal_range));
  if (Math.random() < rate) q.orbit_deg = Math.round(clamp(p.orbit_deg + gauss()*10, ...space.orbit_deg));
  if (Math.random() < rate) q.lead_max_deg = Math.round(clamp(p.lead_max_deg + gauss()*2, ...space.lead_max_deg));
  if (Math.random() < rate) q.evade_weight = +clamp(p.evade_weight + gauss()*0.2, ...space.evade_weight).toFixed(2);
  if (Math.random() < rate) q.strafe_deg = Math.round(clamp(p.strafe_deg + gauss()*10, ...space.strafe_deg));
  return q;
}

function crossover(a, b) {
  return {
    ideal_range: Math.random() < 0.5 ? a.ideal_range : b.ideal_range,
    orbit_deg: Math.random() < 0.5 ? a.orbit_deg : b.orbit_deg,
    lead_max_deg: Math.random() < 0.5 ? a.lead_max_deg : b.lead_max_deg,
    evade_weight: Math.random() < 0.5 ? a.evade_weight : b.evade_weight,
    strafe_deg: Math.random() < 0.5 ? a.strafe_deg : b.strafe_deg
  };
}

function writeParams(params) {
  const paramPath = path.join(paramsDir, `${botKey}.json`);
  fs.writeFileSync(paramPath, JSON.stringify(params, null, 2));
}

function snapshotParams() {
  const paramPath = path.join(paramsDir, `${botKey}.json`);
  if (fs.existsSync(paramPath)) {
    const snapPath = path.join(historyDir, `${nowTs()}.json`);
    fs.writeFileSync(snapPath, fs.readFileSync(paramPath));
  }
}

function evaluate(params, trialSeed) {
  // 샘플 파라미터를 실제 평가에 적용하기 위해 파일로 덮어쓰기
  writeParams(params);
  // 다상대 평가: 각 상대와 5라운드
  let totalWins = 0, totalTime = 0, trials = 0;
  const detail = [];
  for (const opp of opponents) {
    const res = runMatch({ botsA: [{...base}], botsB: [{...opp}], seed: trialSeed, rounds: 5 });
    const wins = res.reduce((acc, r) => acc + (r.aliveA > r.aliveB ? 1 : 0), 0);
    const avgTime = res.reduce((acc, r) => acc + r.time, 0) / res.length;
    totalWins += wins; totalTime += avgTime; trials++;
    detail.push({ opponent: opp.name, wins, avgTime: +avgTime.toFixed(3) });
  }
  const avgWins = trials ? (totalWins / trials) : 0;
  const avgTime = trials ? (totalTime / trials) : 0;
  const score = avgWins + avgTime * timeW;
  return { score, avgWins, avgTime, detail };
}

// 빔 탐색 모드
function runBeam() {
  const t0 = Date.now();
  const trials = [];
  for (let i = 0; i < budget; i++) {
    const p = sampleParams();
    const s = evaluate(p, seed + i);
    trials.push({ trial: i+1, params: p, score: s.score, wins: s.avgWins, avgTime: s.avgTime });
  }
  trials.sort((a,b) => b.score - a.score);
  const top = trials.slice(0, beam);
  const best = top[0];

  const csv = ['trial,score,wins,avgTime,params']
    .concat(trials.map(t => `${t.trial},${t.score.toFixed(4)},${t.wins.toFixed(3)},${t.avgTime.toFixed(3)},"${JSON.stringify(t.params)}"`))
    .join('\n');
  fs.writeFileSync(path.join(resultsDir, `search_${botKey}.csv`), csv);

  snapshotParams();
  writeParams(best.params);

  const ms = Date.now() - t0;
  console.log(`[search/beam] ${botKey} budget=${budget} beam=${beam} timeW=${timeW} -> best ${best.score.toFixed(3)} saved. perf=${ms}ms`);

  if (check) {
    const a = evaluate(best.params, seed + 999);
    const b = evaluate(best.params, seed + 999);
    const same = Math.abs(a.score - b.score) < 1e-9;
    console.log(`[search-check] seed=${seed+999} deterministic=${same} score ${a.score.toFixed(4)} vs ${b.score.toFixed(4)}`);
  }
}

// GA 탐색 모드
function runGA() {
  const t0 = Date.now();
  let popu = [];
  // 시드: 기존 params 파일 포함
  try {
    const cur = JSON.parse(fs.readFileSync(path.join(paramsDir, `${botKey}.json`), 'utf-8'));
    if (cur && typeof cur === 'object') popu.push(cur);
  } catch {}
  while (popu.length < pop) popu.push(sampleParams());

  const gaCsv = ['gen,bestScore,bestWins,bestTime,params'];
  for (let g = 0; g < gens; g++) {
    const scored = popu.map(p => ({ p, s: evaluate(p, seed + g) }));
    scored.sort((a,b) => b.s.score - a.s.score);
    const best = scored[0];
    gaCsv.push(`${g+1},${best.s.score.toFixed(4)},${best.s.avgWins.toFixed(3)},${best.s.avgTime.toFixed(3)},"${JSON.stringify(best.p)}"`);

    // 다음 세대 구성: 엘리트 보존
    const next = scored.slice(0, elite).map(e => e.p);
    while (next.length < pop) {
      const i = Math.floor(Math.random() * Math.min(popu.length, Math.max(elite*2, 8)));
      const j = Math.floor(Math.random() * Math.min(popu.length, Math.max(elite*2, 8)));
      const child = mutate(crossover(scored[i].p, scored[j].p));
      next.push(child);
    }
    popu = next;
  }

  fs.writeFileSync(path.join(resultsDir, `ga_${botKey}.csv`), gaCsv.join('\n'));

  // 최종 best 저장
  const finalScored = popu.map(p => ({ p, s: evaluate(p, seed + 12345) }));
  finalScored.sort((a,b) => b.s.score - a.s.score);
  const best = finalScored[0];
  snapshotParams();
  writeParams(best.p);

  const ms = Date.now() - t0;
  console.log(`[search/ga] ${botKey} gens=${gens} pop=${pop} elite=${elite} mut=${mut} timeW=${timeW} -> best ${best.s.score.toFixed(3)} saved. perf=${ms}ms`);

  if (check) {
    const a = evaluate(best.p, seed + 777);
    const b = evaluate(best.p, seed + 777);
    const same = Math.abs(a.score - b.score) < 1e-9;
    console.log(`[search-check] seed=${seed+777} deterministic=${same} score ${a.score.toFixed(4)} vs ${b.score.toFixed(4)}`);
  }
}

// 상대별 상세 결과(최근 평가 기준) 저장 유틸
function writeDetail(params) {
  const detailRows = ['opponent,wins,avgTime'];
  for (const opp of opponents) {
    const r = evaluate(params, seed + 2025);
    for (const d of r.detail) {
      if (d.opponent === opp.name) detailRows.push(`${JSON.stringify(d.opponent)},${d.wins},${d.avgTime}`);
    }
  }
  fs.writeFileSync(path.join(resultsDir, `search_detail_${botKey}.csv`), detailRows.join('\n'));
}

if (mode === 'ga') {
  runGA();
  // 세부 결과 기록(최종 파라미터 기준)
  try { const best = JSON.parse(fs.readFileSync(path.join(paramsDir, `${botKey}.json`), 'utf-8')); writeDetail(best); } catch {}
} else {
  runBeam();
  try { const best = JSON.parse(fs.readFileSync(path.join(paramsDir, `${botKey}.json`), 'utf-8')); writeDetail(best); } catch {}
}

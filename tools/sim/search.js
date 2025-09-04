#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { runMatch, makeRng } from './engine.js';

const argv = yargs(hideBin(process.argv))
  .option('bot', { type:'string', demandOption:true, desc:'bot key like 02_dealer_sniper' })
  .option('budget', { type:'number', default:50 })
  .option('beam', { type:'number', default:5 })
  .option('seed', { type:'number', default:7 })
  .option('mode', { type:'string', default:'beam' })
  .option('gens', { type:'number', default:12 })
  .option('pop', { type:'number', default:24 })
  .option('elite', { type:'number', default:4 })
  .option('mut', { type:'number', default:0.25 })
  .option('opponents', { type:'string', default:'01_tanker_guardian,06_tanker_bruiser' })
  .option('rounds', { type:'number', default:5 })
  .option('timeW', { type:'number', default:0.05 })
  .option('check', { type:'boolean', default:false })
  .help().argv;

fs.mkdirSync('results', { recursive: true });
fs.mkdirSync('params', { recursive: true });
fs.mkdirSync('params/history', { recursive: true });

const pickLast = (v) => Array.isArray(v) ? v[v.length-1] : v;
const BOT = pickLast(argv.bot);
const botKey = BOT.replace(/\.js$/,'');
const out = `results/search_${botKey}.csv`;
const outDetail = `results/search_detail_${botKey}.csv`;
fs.writeFileSync(out, 'trial,score,json\n');
fs.writeFileSync(outDetail, 'trial,opponent,winA,winB,avgTime\n');

const SEED = Number(pickLast(argv.seed));
const ROUNDS = Number(pickLast(argv.rounds));
const BEAM = Number(pickLast(argv.beam));
const TIMEW = Number(pickLast(argv.timeW));
const rng = makeRng(SEED);

// 파라미터 샘플러(합리적 기본 범위)
const SPACE = {
  ideal_range: [160, 520],
  orbit_deg: [10, 120],
  leadMaxDeg: [8, 26],
  evade_weight: [0.2, 2.0],
  strafe_deg: [8, 36],
  orbit_radius: [140, 320],
  radius_pulse: [40, 140],
  orbitFlipRate: [0.001, 0.02],
  fire_every_frames: [3, 9],
  aimJitterDeg: [0.5, 2.5],
  safeMargin: [16, 40],
  evadeReactDist: [160, 260]
};

function sampleParams() {
  const p = {};
  for (const [k,[lo,hi]] of Object.entries(SPACE)) {
    const r = rng();
    if (Number.isInteger(lo) && Number.isInteger(hi)) {
      p[k] = Math.round(lo + r*(hi-lo));
    } else {
      p[k] = lo + r*(hi-lo);
      // 일부는 정수화
      if (k === 'fire_every_frames') p[k] = Math.max(2, Math.round(p[k]));
    }
  }
  return p;
}

function writeParamsForTrial(key, obj) {
  const pth = `params/${key}.json`;
  fs.writeFileSync(pth, JSON.stringify(obj, null, 2));
}

function evalAgainst(botKey, oppKey, seed, rounds) {
  const aPath = path.resolve(process.cwd(), '../../tanks', `${botKey}.js`);
  const bPath = path.resolve(process.cwd(), '../../tanks', `${oppKey}.js`);
  const res = runMatch({ a: aPath, b: bPath, seed, rounds });
  return { winA: res.summary.winA, winB: res.summary.winB, avgTime: res.summary.avgTime };
}

const OPP = pickLast(argv.opponents);
const opponents = OPP.split(',').map(s=>s.trim()).filter(Boolean);

let best = { score: -1e9, params: null };
const beam = [];

const BUDGET = Number(pickLast(argv.budget));
if (argv.mode === 'ga') {
  // GA 모드: 엔진 기반 점수화
  const gaOut = `results/ga_${botKey}.csv`;
  fs.writeFileSync(gaOut, 'gen,bestScore\n');
  const GENS = Number(pickLast(argv.gens));
  const POP = Number(pickLast(argv.pop));
  const ELITE = Math.max(1, Number(pickLast(argv.elite)));
  const MUT = Number(pickLast(argv.mut));

  // 초기 개체군(기존 params 시드 1개 포함 시도)
  let population = [];
  function loadCurrentParams() {
    try {
      const pth = path.resolve(process.cwd(), 'params', `${botKey}.json`);
      if (fs.existsSync(pth)) {
        const obj = JSON.parse(fs.readFileSync(pth,'utf8'));
        if (obj && typeof obj === 'object') return obj;
      }
    } catch {}
    return null;
  }
  const seeded = loadCurrentParams();
  if (seeded) population.push(seeded);
  while (population.length < POP) population.push(sampleParams());

  function scoreParams(p) {
    writeParamsForTrial(botKey, p);
    let total = 0;
    for (const opp of opponents) {
      const { winA, winB, avgTime } = evalAgainst(botKey, opp, SEED, ROUNDS);
      total += (winA - winB) + (1/avgTime) * TIMEW;
    }
    return total / Math.max(1, opponents.length);
  }

  function clampToSpace(p) {
    const q = { ...p };
    for (const [k,[lo,hi]] of Object.entries(SPACE)) {
      if (q[k] == null) continue;
      q[k] = Math.min(hi, Math.max(lo, q[k]));
      if (Number.isInteger(lo) && Number.isInteger(hi)) q[k] = Math.round(q[k]);
    }
    return q;
  }

  function mutate(p) {
    const q = { ...p };
    for (const k of Object.keys(SPACE)) {
      if (rng() < MUT) {
        const [lo, hi] = SPACE[k];
        const range = hi - lo;
        // 간단 가우시안 근사: 박스-뮬러
        const u1 = Math.max(1e-9, rng());
        const u2 = Math.max(1e-9, rng());
        const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2*Math.PI*u2);
        const step = (range * 0.1) * z; // 범위의 10% 표준편차
        q[k] = (q[k] ?? (lo + rng()*(hi-lo))) + step;
      }
    }
    return clampToSpace(q);
  }

  for (let g=1; g<=GENS; g++) {
    // 평가
    const scored = population.map(p => ({ p, s: scoreParams(p) }));
    scored.sort((a,b)=>b.s-a.s);
    const bestGen = scored[0];
    if (bestGen.s > best.score) best = { score: bestGen.s, params: bestGen.p };
    fs.appendFileSync(gaOut, `${g},${bestGen.s.toFixed(4)}\n`);

    // 스냅샷 저장
    const tsG = new Date().toISOString().replace(/[:.]/g,'-');
    const histDirG = `params/history/${botKey}`;
    fs.mkdirSync(histDirG, { recursive: true });
    fs.writeFileSync(`${histDirG}/${tsG}.json`, JSON.stringify(bestGen.p, null, 2));

    // 다음 세대 구성: 엘리트 보존 + 변이 샘플로 채우기
    const elites = scored.slice(0, ELITE).map(e=>e.p);
    const next = elites.slice();
    while (next.length < POP) {
      const parent = elites[Math.floor(rng()*elites.length)] || scored[Math.floor(rng()*scored.length)].p;
      next.push(mutate(parent));
    }
    population = next;
  }
} else {
for (let trial=1; trial<=BUDGET; trial++) {
  const params = sampleParams();
  // 1) trial 파라미터를 실제 평가에 적용: 파일로 덮어쓰기
  writeParamsForTrial(botKey, params);

  // 2) 평가(다상대 의사 점수)
  let totalScore = 0;
  for (const opp of opponents) {
    const { winA, winB, avgTime } = evalAgainst(botKey, opp, SEED + trial, ROUNDS);
    const score = (winA - winB) + (1/avgTime) * TIMEW;
    totalScore += score;
    fs.appendFileSync(outDetail, `${trial},${opp},${winA},${winB},${avgTime.toFixed(2)}\n`);
  }

  // 3) 빔 유지
  beam.push({ score: totalScore, params });
  beam.sort((a,b)=>b.score-a.score);
  if (beam.length > BEAM) beam.pop();

  // 4) 요약 CSV 기록
  fs.appendFileSync(out, `${trial},${totalScore.toFixed(4)},${JSON.stringify(params)}\n`);

  if (totalScore > best.score) {
    best = { score: totalScore, params };
  }
}
}

// 최종 best 저장 + 스냅샷
const ts = new Date().toISOString().replace(/[:.]/g,'-');
const histDir = `params/history/${botKey}`;
fs.mkdirSync(histDir, { recursive: true });
fs.writeFileSync(`${histDir}/${ts}.json`, JSON.stringify(best.params, null, 2));
writeParamsForTrial(botKey, best.params);

// 결정성 셀프 체크(옵션)
if (argv.check) {
  const a = evalAgainst(botKey, opponents[0], SEED+1, ROUNDS);
  const b = evalAgainst(botKey, opponents[0], SEED+1, ROUNDS);
  const ok = (a.winA===b.winA && a.winB===b.winB && Math.abs(a.avgTime-b.avgTime)<1e-9);
  console.log(`search: deterministic check ${ok? 'OK':'FAIL'}`);
}

console.log(`search: bot=${botKey} budget=${BUDGET} beam=${BEAM} seed=${SEED}`);

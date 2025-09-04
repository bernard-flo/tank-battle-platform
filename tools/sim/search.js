#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { makeRng } from './engine.js';

const argv = yargs(hideBin(process.argv))
  .option('bot', { type:'string', demandOption:true, desc:'bot key like 02_dealer_sniper' })
  .option('budget', { type:'number', default:50 })
  .option('beam', { type:'number', default:5 })
  .option('seed', { type:'number', default:7 })
  .option('mode', { type:'string', default:'beam' })
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

function pseudoEvaluate(botA, botB, seed, rounds) {
  // 엔진이 미구현 상태이므로 결정적 의사 점수 생성
  const r = makeRng(seed ^ (botA.length*131 + botB.length*17));
  let winA = 0, winB = 0, tSum = 0;
  for (let i=0;i<rounds;i++) {
    const rv = r();
    if (rv < 0.5) winA++; else winB++;
    tSum += 50 + Math.floor(r()*40); // 50~90
  }
  const avgTime = tSum / rounds;
  return { winA, winB, avgTime };
}

const OPP = pickLast(argv.opponents);
const opponents = OPP.split(',').map(s=>s.trim()).filter(Boolean);

let best = { score: -1e9, params: null };
const beam = [];

const BUDGET = Number(pickLast(argv.budget));
if (argv.mode === 'ga') {
  const gaOut = `results/ga_${botKey}.csv`;
  fs.writeFileSync(gaOut, 'gen,bestScore\n');
  const gens = Math.max(1, Math.floor(BUDGET/3));
  let bestScore = -1e9;
  for (let g=1; g<=gens; g++) {
    const s = Math.round(rng()*10) + g; // 의사 점수 증가
    bestScore = Math.max(bestScore, s);
    fs.appendFileSync(gaOut, `${g},${bestScore}\n`);
  }
  // 간단 스냅샷 저장
  const snap = sampleParams();
  const ts2 = new Date().toISOString().replace(/[:.]/g,'-');
  const histDir2 = `params/history/${botKey}`;
  fs.mkdirSync(histDir2, { recursive: true });
  fs.writeFileSync(`${histDir2}/${ts2}.json`, JSON.stringify(snap, null, 2));
  writeParamsForTrial(botKey, snap);
} else {
for (let trial=1; trial<=BUDGET; trial++) {
  const params = sampleParams();
  // 1) trial 파라미터를 실제 평가에 적용: 파일로 덮어쓰기
  writeParamsForTrial(botKey, params);

  // 2) 평가(다상대 의사 점수)
  let totalScore = 0;
  for (const opp of opponents) {
    const { winA, winB, avgTime } = pseudoEvaluate(botKey, opp, SEED + trial, ROUNDS);
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
  const a = pseudoEvaluate(botKey, opponents[0], SEED+1, ROUNDS);
  const b = pseudoEvaluate(botKey, opponents[0], SEED+1, ROUNDS);
  const ok = (a.winA===b.winA && a.winB===b.winB && Math.abs(a.avgTime-b.avgTime)<1e-9);
  console.log(`search: deterministic check ${ok? 'OK':'FAIL'}`);
}

console.log(`search: bot=${botKey} budget=${BUDGET} beam=${BEAM} seed=${SEED}`);

#!/usr/bin/env node
/* eslint-disable no-console */
// 간단한 진화탐색 기반 DNN 정책 최적화 스크립트
// - simulator/engine과 bot_loader를 직접 호출하여 빠르게 평가
// - 목표: result/reference-ai.txt 상대로 높은 승률/에너지 우위를 갖는 가중치 탐색

const fs = require('fs');
const path = require('path');
const { runMatch } = require('../simulator/engine');
const { compileTeamFromCode } = require('../simulator/bot_loader');
const { buildTeamCode } = require('../ai/dnn_codegen');

// 네트워크 아키텍처(업데이트 코드와 일치)
const EN_K = 3, AL_K = 2, BL_K = 3;
const inDim = 8 + EN_K*4 + AL_K*4 + BL_K*5; // self(8) + enemy(3*4) + ally(2*4) + bullets(3*5)
const arch = { inDim, h1: 24, h2: 16, outDim: 5 };

function weightCount(a){ return a.inDim*a.h1 + a.h1 + a.h1*a.h2 + a.h2 + a.h2*a.outDim + a.outDim; }
const WN = weightCount(arch);

function randn(rng){
  // Box-Muller
  let u=0, v=0; while(u===0) u=rng(); while(v===0) v=rng();
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
}

function makeRng(seed) {
  // xorshift32 기반 결정적 난수
  let s = seed >>> 0;
  return function() {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    return (s % 0x100000000) / 0x100000000;
  };
}

function initWeights(rng) {
  // Xavier/Glorot-like 초기화
  const w = new Float64Array(WN);
  let idx = 0;
  function fill(n, scale) { for (let i=0;i<n;i++) w[idx++] = randn(rng)*scale; }
  const s1 = Math.sqrt(2/(arch.inDim+arch.h1));
  fill(arch.inDim*arch.h1, s1); fill(arch.h1, 0.0);
  const s2 = Math.sqrt(2/(arch.h1+arch.h2));
  fill(arch.h1*arch.h2, s2); fill(arch.h2, 0.0);
  const s3 = Math.sqrt(2/(arch.h2+arch.outDim));
  fill(arch.h2*arch.outDim, s3); fill(arch.outDim, 0.0);
  return w;
}

function mutate(base, rng, sigma) {
  const out = new Float64Array(base.length);
  for (let i=0;i<base.length;i++) out[i] = base[i] + randn(rng)*sigma;
  return out;
}

function evaluate(weights, refCode, seeds, opts={}) {
  const teamCode = buildTeamCode(weights, arch);
  const red = compileTeamFromCode(teamCode, 'red', 'secure');
  const blueRef = compileTeamFromCode(refCode, 'blue', 'secure');
  const redRef = compileTeamFromCode(refCode, 'red', 'secure');
  const blue = compileTeamFromCode(teamCode, 'blue', 'secure');

  let score = 0; // win:+1, draw:0, lose:-1
  let eneSum = 0; // 에너지 차(정규화)
  let wins = 0, losses = 0, draws = 0;

  for (const s of seeds) {
    // 우리=red vs ref=blue
    let r1 = runMatch([...red, ...blueRef], { seed: s, maxTicks: opts.maxTicks||3000, fast: true });
    if (r1.winner === 'red') { score += 1; wins++; }
    else if (r1.winner === 'blue') { score -= 1; losses++; }
    else draws++;
    eneSum += (r1.stats.redEnergy - r1.stats.blueEnergy) / 1000; // 스케일링

    // ref=red vs 우리=blue (사이드 스왑)
    let r2 = runMatch([...redRef, ...blue], { seed: s+12345, maxTicks: opts.maxTicks||3000, fast: true });
    if (r2.winner === 'blue') { score += 1; wins++; }
    else if (r2.winner === 'red') { score -= 1; losses++; }
    else draws++;
    eneSum += (r2.stats.blueEnergy - r2.stats.redEnergy) / 1000;
  }

  const fitness = score + eneSum*0.1; // 에너지 우위는 보조지표
  return { fitness, wins, losses, draws, code: teamCode };
}

async function main(){
  const outPath = path.resolve(__dirname, '..', 'result', 'dnn-ai.txt');
  const refPath = path.resolve(__dirname, '..', 'result', 'reference-ai.txt');
  const refCode = fs.readFileSync(refPath, 'utf8');

  // 탐색 설정
  const seedBase = parseInt(process.env.DNN_SEEDBASE || '20250909', 10);
  const nSeeds = Math.max(1, parseInt(process.env.DNN_SEEDS || '6', 10));
  const seeds = Array.from({length: nSeeds}, (_,i)=> seedBase + i*97);
  const rng = makeRng(seedBase);

  let bestW = initWeights(rng);
  let best = evaluate(bestW, refCode, seeds);
  console.log(`[init] fitness=${best.fitness.toFixed(3)} w/d/l=${best.wins}/${best.draws}/${best.losses}`);

  let sigma = parseFloat(process.env.DNN_SIGMA || '0.6');
  const iters = parseInt(process.env.DNN_ITERS || '60', 10);
  for (let t=1;t<=iters;t++){
    const candW = mutate(bestW, rng, sigma);
    const cand = evaluate(candW, refCode, seeds, { maxTicks: parseInt(process.env.DNN_TICKS || '3000', 10) });
    const improved = cand.fitness > best.fitness;
    if (improved) {
      best = cand; bestW = candW;
      sigma = Math.max(0.15, sigma*0.98); // 점진적 수렴
      console.log(`[${t}] improved fitness=${best.fitness.toFixed(3)} w/d/l=${best.wins}/${best.draws}/${best.losses} sigma=${sigma.toFixed(3)}`);
    } else if (t % 10 === 0) {
      console.log(`[${t}] keep fitness=${best.fitness.toFixed(3)} (sigma=${sigma.toFixed(3)})`);
    }
  }

  // 최종 코드 저장
  fs.writeFileSync(outPath, best.code, 'utf8');
  // 가중치 백업도 저장
  const wJson = path.resolve(__dirname, '..', 'result', 'dnn-ai-weights.json');
  fs.writeFileSync(wJson, JSON.stringify({ arch, WN, weights: Array.from(bestW) }), 'utf8');
  console.log(`Saved team code -> ${outPath}`);
  console.log(`Saved weights   -> ${wJson}`);
}

if (require.main === module) {
  main().catch((e)=>{ console.error(e); process.exit(1); });
}

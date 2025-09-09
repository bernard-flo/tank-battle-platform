#!/usr/bin/env node
/*
  Cross-Entropy Method(CEM)로 DNN 정책(공유 가중치)을 학습하여
  reference-ai.txt를 상대로 높은 승률을 목표로 합니다.

  사용법 예시:
    node src/train_cem.js --iters 12 --pop 60 --elite 12 --seeds 3 --runner secure --fast

  출력:
    - result/ai_dnn_team.txt: tank_battle_platform.html Import 가능한 최종 팀 코드
    - 콘솔: 각 이터레이션별 최고/평균 스코어 요약
*/

const fs = require('fs');
const path = require('path');
const { runMatch } = require('../simulator/engine');
const { compileTeamFromCode } = require('../simulator/bot_loader');
const { genMLPCode, initialWeights } = require('./generate_dnn_team');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    iters: 10,
    pop: 60,
    elite: 12,
    seeds: 3,
    sigmaInit: 0.6,
    sigmaDecay: 0.95,
    fast: true,
    runner: 'secure',
    maxTicks: 3500,
    concurrency: Math.max(1, (require('os').cpus()||[]).length - 1),
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--iters') opts.iters = +args[++i];
    else if (a === '--pop') opts.pop = +args[++i];
    else if (a === '--elite') opts.elite = +args[++i];
    else if (a === '--seeds') opts.seeds = +args[++i];
    else if (a === '--sigma') opts.sigmaInit = +args[++i];
    else if (a === '--fast') opts.fast = true;
    else if (a === '--no-fast') opts.fast = false;
    else if (a === '--runner') opts.runner = String(args[++i]);
    else if (a === '--ticks' || a === '--maxTicks') opts.maxTicks = +args[++i];
    else if (a === '--concurrency') opts.concurrency = Math.max(1, +args[++i]);
  }
  return opts;
}

function flatten(arr){
  if (arr instanceof Float64Array || arr instanceof Float32Array) return Array.from(arr);
  return arr.slice();
}

async function evaluatePopulation(population, refCode, opts) {
  // 병렬 평가: 워커를 사용해 각 후보의 평균 점수를 계산
  const path = require('path');
  const { Worker } = require('worker_threads');
  const inputSize = 8 + (4*5) + (3*5) + (5*6) + 3; // 76
  const hidden = [64,64];
  const outputSize = 5;
  const seeds = Array.from({ length: opts.seeds }, (_, i) => 1000 + i);
  const cfg = { inputSize, hidden, outputSize, refCode, seeds, maxTicks: opts.maxTicks, runner: opts.runner, fast: opts.fast };

  const workerPath = path.resolve(__dirname, 'cem_worker.js');
  const results = new Array(population.length);
  let next = 0;
  let running = 0;

  await new Promise((resolve, reject) => {
    function spawn() {
      while (running < opts.concurrency && next < population.length) {
        const idx = next++;
        running++;
        const w = new Worker(workerPath, { workerData: { weights: Array.from(population[idx]), cfg } });
        w.on('message', (msg) => {
          running--;
          if (msg && typeof msg.score === 'number') {
            results[idx] = msg.score;
          } else {
            results[idx] = -1e9; // 실패는 최저점 처리
          }
          spawn();
          if (next >= population.length && running === 0) resolve();
        });
        w.on('error', (e) => {
          running--;
          results[idx] = -1e9;
          spawn();
          if (next >= population.length && running === 0) resolve();
        });
      }
    }
    spawn();
  });
  return results;
}

async function main(){
  const opts = parseArgs();
  const refPath = path.resolve('result/reference-ai.txt');
  const refCode = fs.readFileSync(refPath, 'utf8');

  const inputSize = 8 + (4*5) + (3*5) + (5*6) + 3; // 76
  const hidden = [64,64];
  const outputSize = 5;
  const dim = inputSize*hidden[0] + hidden[0] + hidden[0]*hidden[1] + hidden[1] + hidden[1]*outputSize + outputSize;

  // CEM 초기화
  let mean = initialWeights(inputSize, hidden, outputSize, 0); // 0으로 채우기
  for (let i=0;i<mean.length;i++) mean[i] = 0;
  // 이전 학습 결과가 있으면 재시작
  const weightPath = path.resolve('result/ai_dnn_weights.json');
  if (fs.existsSync(weightPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(weightPath, 'utf8'));
      if (prev && prev.weights && prev.weights.length === mean.length) {
        mean = Float64Array.from(prev.weights);
        console.log(`[resume] load previous mean from ${weightPath}`);
      }
    } catch (e) {
      // ignore
    }
  }
  let sigma = opts.sigmaInit;

  function sample(){
    const w = new Float64Array(dim);
    for(let i=0;i<dim;i++){
      let u=0,v=0; while(u===0) u=Math.random(); while(v===0) v=Math.random();
      const z = Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
      w[i] = mean[i] + z * sigma;
    }
    return w;
  }

  let bestScore = -Infinity;
  let bestW = null;

  for(let it=0; it<opts.iters; it++){
    const population = [];
    for(let i=0;i<opts.pop;i++) population.push(sample());

    const scores = await evaluatePopulation(population, refCode, opts);
    const scored = population.map((w, i) => ({ w, score: scores[i] }));

    scored.sort((a,b)=>b.score - a.score);
    const elites = scored.slice(0, opts.elite);

    // 통계
    const avg = scored.reduce((s,o)=>s+o.score,0)/scored.length;
    const best = elites[0];
    if (best.score > bestScore) { bestScore = best.score; bestW = elites[0].w; }
    console.log(`[CEM] iter=${it+1}/${opts.iters}  best=${best.score.toFixed(2)}  avg=${avg.toFixed(2)}  sigma=${sigma.toFixed(3)}`);

    // mean 업데이트
    mean = new Float64Array(dim);
    for(const e of elites){
      for(let i=0;i<dim;i++) mean[i] += e.w[i];
    }
    for(let i=0;i<dim;i++) mean[i] /= elites.length;

    // sigma 감소로 수렴 유도
    sigma *= opts.sigmaDecay;

    // 중간 저장
    saveTeam(bestW || best.w);
  }

  // 최종 저장
  saveTeam(bestW);
}

function saveTeam(weights){
  const inputSize = 8 + (4*5) + (3*5) + (5*6) + 3; // 76
  const hidden = [64,64];
  const outputSize = 5;
  const code = genMLPCode({ inputSize, hiddenSizes: hidden, outputSize, weights });
  const outPath = path.resolve('result/ai_dnn_team.txt');
  fs.writeFileSync(outPath, code, 'utf8');
  console.log(`[save] ${outPath} 갱신`);
  // weights json도 저장
  const wjson = { inputSize, hiddenSizes: hidden, outputSize, weights: Array.from(weights) };
  const wpath = path.resolve('result/ai_dnn_weights.json');
  fs.writeFileSync(wpath, JSON.stringify(wjson), 'utf8');
}

if (require.main === module) {
  main().catch((e)=>{ console.error(e); process.exit(1); });
}

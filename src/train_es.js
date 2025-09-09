#!/usr/bin/env node
/*
  Evolution Strategies(OpenAI-ES)로 DNN 정책(공유 가중치)을 학습합니다.
  - Mirrored sampling으로 분산을 줄이고, 병렬 워커로 평가 가속
  - update()는 순수 DNN 추론만 사용(휴리스틱 없음)

  예)
    node src/train_es.js --iters 40 --pop 80 --sigma 0.2 --alpha 0.05 --seeds 4 --ticks 2500 --concurrency 8 --fast

  출력:
    - result/ai_dnn_team.txt / result/ai_dnn_weights.json 갱신
*/

const fs = require('fs');
const path = require('path');
const os = require('os');
const { Worker } = require('worker_threads');
const { genMLPCode, initialWeights } = require('./generate_dnn_team');

function parseArgs(){
  const args = process.argv.slice(2);
  const opts = {
    iters: 40,
    pop: 80,        // total evaluations per iter (must be even; mirrored)
    sigma: 0.2,     // noise std
    alpha: 0.05,    // step size
    seeds: 4,
    maxTicks: 3000,
    fast: true,
    runner: 'secure',
    concurrency: Math.max(1, (os.cpus()||[]).length - 1),
  };
  for (let i=0;i<args.length;i++){
    const a = args[i];
    if(a==='--iters') opts.iters = +args[++i];
    else if(a==='--pop') opts.pop = +args[++i];
    else if(a==='--sigma') opts.sigma = +args[++i];
    else if(a==='--alpha') opts.alpha = +args[++i];
    else if(a==='--seeds') opts.seeds = +args[++i];
    else if(a==='--ticks' || a==='--maxTicks') opts.maxTicks = +args[++i];
    else if(a==='--runner') opts.runner = String(args[++i]);
    else if(a==='--fast') opts.fast = true;
    else if(a==='--no-fast') opts.fast = false;
    else if(a==='--concurrency') opts.concurrency = Math.max(1, +args[++i]);
  }
  if (opts.pop % 2 !== 0) opts.pop += 1;
  return opts;
}

function loadMean(dim){
  // 기존 가중치가 있으면 불러오고, 없으면 0으로 초기화
  const wpath = path.resolve('result/ai_dnn_weights.json');
  if (fs.existsSync(wpath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(wpath, 'utf8'));
      if (prev && prev.weights && prev.weights.length) return Float64Array.from(prev.weights);
    } catch (_e) {}
  }
  return new Float64Array(dim).fill(0);
}

function saveTeam(weights){
  const inputSize = 8 + (4*5) + (3*5) + (5*6) + 3; // 76
  const hidden = [64,64];
  const outputSize = 9;
  const code = genMLPCode({ inputSize, hiddenSizes: hidden, outputSize, weights });
  const outPath = path.resolve('result/ai_dnn_team.txt');
  fs.writeFileSync(outPath, code, 'utf8');
  const wjson = { inputSize, hiddenSizes: hidden, outputSize, weights: Array.from(weights) };
  const wpath = path.resolve('result/ai_dnn_weights.json');
  fs.writeFileSync(wpath, JSON.stringify(wjson), 'utf8');
  console.log(`[save] ${outPath} 갱신`);
}

function dimOfNet(){
  const inputSize = 76, h1=64, h2=64, out=9;
  return inputSize*h1 + h1 + h1*h2 + h2 + h2*out + out;
}

async function evaluateBatch(center, noises, cfg){
  const workerPath = path.resolve(__dirname, 'es_worker.js');
  let next = 0; let running = 0; const results = new Array(noises.length);
  await new Promise((resolve) => {
    function spawn(){
      while(running < cfg.concurrency && next < noises.length){
        const idx = next++;
        running++;
        const payload = { center: Array.from(center), noise: Array.from(noises[idx]), cfg };
        const w = new Worker(workerPath, { workerData: payload });
        w.on('message', (msg)=>{
          running--;
          results[idx] = msg && typeof msg.score === 'number' ? msg.score : -1e9;
          spawn();
          if (next >= noises.length && running===0) resolve();
        });
        w.on('error', ()=>{
          running--; results[idx] = -1e9; spawn();
          if (next >= noises.length && running===0) resolve();
        });
      }
    }
    spawn();
  });
  return results;
}

async function main(){
  const opts = parseArgs();
  const dim = dimOfNet();
  let mean = loadMean(dim);

  // NES with mirrored sampling
  const half = Math.floor(opts.pop/2);
  const seeds = Array.from({length: opts.seeds}, (_,i)=> 2000+i);
  const cfg = { seeds, maxTicks: opts.maxTicks, runner: opts.runner, fast: opts.fast, sigma: opts.sigma };

  let bestScore = -Infinity; let bestW = Float64Array.from(mean);
  for(let it=0; it<opts.iters; it++){
    // sample noises
    const noises = new Array(half).fill(0).map(()=>{
      const eps = new Float64Array(dim);
      for(let i=0;i<dim;i++){
        let u=0,v=0; while(u===0) u=Math.random(); while(v===0) v=Math.random();
        const z = Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
        eps[i] = z;
      }
      return eps;
    });
    const evalNoises = [];
    for(let i=0;i<half;i++){ evalNoises.push({ idx:i, sign:+1 }); evalNoises.push({ idx:i, sign:-1 }); }

    // build parameter vectors for evaluation
    const paramVectors = evalNoises.map(({idx, sign}) => {
      const vec = new Float64Array(dim);
      const eps = noises[idx];
      for(let i=0;i<dim;i++) vec[i] = mean[i] + sign * opts.sigma * eps[i];
      return vec;
    });

    // evaluate
    const scores = await evaluateBatch(mean, paramVectors, { ...cfg, concurrency: opts.concurrency });

    // compute gradient estimate
    // pair scores: f(+) - f(-)
    const pairs = new Array(half).fill(0).map(()=>({ plus:0, minus:0 }));
    for(let i=0;i<evalNoises.length;i++){
      const { idx, sign } = evalNoises[i];
      if (sign>0) pairs[idx].plus = scores[i]; else pairs[idx].minus = scores[i];
    }
    // rank transform (optional): normalize returns to reduce outliers
    const deltas = pairs.map(p => p.plus - p.minus);
    // compute grad = sum_i delta_i * eps_i / (2*pop*sigma)
    const grad = new Float64Array(dim).fill(0);
    for(let k=0;k<half;k++){
      const scale = deltas[k] / (2 * half * opts.sigma);
      const eps = noises[k];
      for(let i=0;i<dim;i++) grad[i] += scale * eps[i];
    }

    // update
    for(let i=0;i<dim;i++) mean[i] += opts.alpha * grad[i];

    // track best by direct eval of mean
    const meanScore = await evaluateBatch(mean, [mean], { ...cfg, concurrency: 1 });
    if (meanScore[0] > bestScore) { bestScore = meanScore[0]; bestW = Float64Array.from(mean); }

    // log
    const sPlus = pairs.reduce((s,p)=>s+p.plus,0)/pairs.length;
    const sMinus = pairs.reduce((s,p)=>s+p.minus,0)/pairs.length;
    console.log(`[ES] iter=${it+1}/${opts.iters}  meanScore=${meanScore[0].toFixed(2)}  plus=${sPlus.toFixed(2)}  minus=${sMinus.toFixed(2)}  best=${bestScore.toFixed(2)}`);

    // save snapshot periodically
    if ((it+1)%2===0) saveTeam(bestW);
  }

  // final save
  saveTeam(bestW);
}

if(require.main===module){
  main().catch(e=>{ console.error(e); process.exit(1); });
}

// Cross-Entropy Method(CEM)으로 DNN 정책 가중치 최적화
// - 상대: result/reference-ai.txt
// - 목표: 승리 + 에너지 차이 최대화
// - 결과: result/ai_dnn_weights.json 저장 및 result/ai_dnn_team.txt 생성

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { runMatch } = require('../simulator/engine');
const { compileTeamFromCode } = require('../simulator/bot_loader');
const { getNetSpec, initWeights, generateTeamCode } = require('./generate_dnn_team');

function randn(rng) {
  // Box-Muller
  let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function defaultRng(seed = 123456789) {
  let s = seed >>> 0;
  return function rng() {
    // xorshift32
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 0x100000000) / 0x100000000;
  };
}

function flattenWeights(weights) {
  const { INPUT_SIZE, H1, H2, OUTPUT_SIZE } = weights;
  const W1 = weights.W1 || weights.W.slice(0, H1 * INPUT_SIZE);
  const b1 = weights.b1 || weights.b.slice(0, H1);
  const W2 = weights.W2 || weights.W.slice(H1 * INPUT_SIZE, H1 * INPUT_SIZE + H2 * H1);
  const b2 = weights.b2 || weights.b.slice(H1, H1 + H2);
  const W3 = weights.W3 || weights.W.slice(H1 * INPUT_SIZE + H2 * H1);
  const b3 = weights.b3 || weights.b.slice(H1 + H2);
  const vec = [...W1, ...b1, ...W2, ...b2, ...W3, ...b3];
  const shapes = { INPUT_SIZE, H1, H2, OUTPUT_SIZE };
  const sizes = { W1: W1.length, b1: b1.length, W2: W2.length, b2: b2.length, W3: W3.length, b3: b3.length };
  return { vec, shapes, sizes };
}

function unflatten(vec, shapes, sizes) {
  let idx = 0;
  function take(n){ const a = vec.slice(idx, idx+n); idx += n; return a; }
  const W1 = take(sizes.W1), b1 = take(sizes.b1);
  const W2 = take(sizes.W2), b2 = take(sizes.b2);
  const W3 = take(sizes.W3), b3 = take(sizes.b3);
  return { ...shapes, W1, b1, W2, b2, W3, b3 };
}

function scoreSummary(res){
  // 점수: 승리 보너스 1000, 에너지 차이(레드-블루), 생존 보너스 100*차이
  const base = res.winner === 'red' ? 1000 : (res.winner === 'blue' ? -1000 : 0);
  const ene = res.stats.redEnergy - res.stats.blueEnergy;
  const alive = (res.stats.redAlive - res.stats.blueAlive) * 100;
  return base + ene + alive;
}

function buildPlayers(codeRed, codeBlue, runnerMode='secure'){
  const red = compileTeamFromCode(codeRed, 'red', runnerMode);
  const blue = compileTeamFromCode(codeBlue, 'blue', runnerMode);
  return [...red, ...blue];
}

function evaluate(weights, opts){
  const {
    seeds = [0,1,2,3,4],
    maxTicks = 4000,
    fast = true,
    referenceCode,
    asRed = true,
  } = opts;

  const teamCode = generateTeamCode(weights);
  let total = 0;
  for(const s of seeds){
    const players = asRed ? buildPlayers(teamCode, referenceCode) : buildPlayers(referenceCode, teamCode);
    const result = runMatch(players, { seed: s, maxTicks, fast });
    const sc = scoreSummary(result) * (asRed ? 1 : -1);
    total += sc;
  }
  return total / seeds.length;
}

async function main(){
  const args = process.argv.slice(2);
  const iters = parseInt(getArg('--iters', '16'), 10);
  const pop = parseInt(getArg('--pop', '32'), 10);
  const eliteFrac = parseFloat(getArg('--elite', '0.2'));
  const sigmaInit = parseFloat(getArg('--sigma', '0.5'));
  const seed = parseInt(getArg('--seed', '42'), 10);
  const maxTicks = parseInt(getArg('--maxTicks', '4000'), 10);
  const fast = getFlag('--no-fast') ? false : true;
  const evalSeeds = getArg('--seeds', '0,1,2,3,4').split(',').map(s=>parseInt(s,10));
  const outWeights = getArg('--out', 'result/ai_dnn_weights.json');
  const outTeam = getArg('--team', 'result/ai_dnn_team.txt');
  const resume = getFlag('--resume');

  function getArg(flag, def){ const i = args.indexOf(flag); return i>=0 ? args[i+1] : def; }
  function getFlag(flag){ return args.includes(flag); }

  const refPath = path.resolve('result/reference-ai.txt');
  const referenceCode = fs.readFileSync(refPath, 'utf8');

  let w0 = initWeights(defaultRng(seed));
  let mu0, shapes, sizes;
  if (resume && fs.existsSync(path.resolve(outWeights))) {
    try {
      const prev = JSON.parse(fs.readFileSync(path.resolve(outWeights), 'utf8'));
      shapes = { INPUT_SIZE: prev.INPUT_SIZE, H1: prev.H1, H2: prev.H2, OUTPUT_SIZE: prev.OUTPUT_SIZE };
      sizes = { W1: prev.W1.length, b1: prev.b1.length, W2: prev.W2.length, b2: prev.b2.length, W3: prev.W3.length, b3: prev.b3.length };
      const vec = [...prev.W1, ...prev.b1, ...prev.W2, ...prev.b2, ...prev.W3, ...prev.b3];
      mu0 = vec;
      console.log(`[CEM] resume from ${outWeights} (vec=${vec.length})`);
    } catch (e) {
      console.warn('[CEM] resume failed, fallback to random init:', e.message);
      const f = flattenWeights(w0); mu0 = f.vec; shapes = f.shapes; sizes = f.sizes;
    }
  } else {
    const f = flattenWeights(w0); mu0 = f.vec; shapes = f.shapes; sizes = f.sizes;
  }
  let mu = mu0.slice();
  let sigma = new Array(mu.length).fill(sigmaInit);
  const rng = defaultRng(seed ^ 0x9e3779b9);

  let bestScore = -Infinity, bestVec = mu.slice();

  for(let iter=0; iter<iters; iter++){
    const cand = [];
    for(let i=0;i<pop;i++){
      const z = mu.map((m,j)=> m + sigma[j]*randn(rng));
      const weights = unflatten(z, shapes, sizes);
      const score = evaluate(weights, { seeds: evalSeeds, maxTicks, fast, referenceCode, asRed: true });
      cand.push({ z, score });
      if(score>bestScore){ bestScore=score; bestVec = z.slice(); }
    }
    cand.sort((a,b)=>b.score-a.score);
    const elites = cand.slice(0, Math.max(1, Math.floor(pop*eliteFrac)));
    // 업데이트: 평균/표준편차
    for(let j=0;j<mu.length;j++){
      let m=0; for(const e of elites) m += e.z[j]; m/=elites.length; mu[j]=m;
      let v=0; for(const e of elites) { const d=e.z[j]-mu[j]; v+=d*d; } v/=Math.max(1, elites.length-1); sigma[j] = Math.sqrt(v) * 0.9 + 1e-3; // 수축
    }
    console.log(`[CEM] iter ${iter+1}/${iters} best=${bestScore.toFixed(1)} muScore=${cand[0].score.toFixed(1)} sigma~${sigma[0].toFixed(3)}`);
  }

  const best = unflatten(bestVec, shapes, sizes);
  // 저장
  const out = { ...shapes, ...sizes, ...best };
  fs.writeFileSync(path.resolve(outWeights), JSON.stringify(out));
  console.log(`Saved weights -> ${outWeights}`);
  const code = generateTeamCode(best);
  fs.writeFileSync(path.resolve(outTeam), code);
  console.log(`Saved team -> ${outTeam}`);

  // 검증 매치(양 진영)
  const finalScoreRed = evaluate(best, { seeds: evalSeeds, maxTicks, fast, referenceCode, asRed: true });
  const finalScoreBlue = evaluate(best, { seeds: evalSeeds, maxTicks, fast, referenceCode, asRed: false });
  console.log(`[Final] asRed=${finalScoreRed.toFixed(1)} asBlue=${finalScoreBlue.toFixed(1)}`);
}

if (require.main === module) {
  main().catch((e)=>{ console.error(e); process.exit(1); });
}

module.exports = { defaultRng, randn, flattenWeights, unflatten };

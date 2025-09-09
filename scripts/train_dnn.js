/*
  DNN 학습 스크립트 (NES/ARS 스타일)
  - simulator 엔진을 직접 호출하여 빠르게 반복 평가
  - 목표: reference-ai.txt를 상대로 안정적 우위 확보
  - 결과물: result/dnn-ai-weights.json, result/dnn-ai.txt

  사용법 예시
    DNN_ITERS=60 DNN_POP=16 DNN_SEEDS=3 node scripts/train_dnn.js
*/

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { runMatch } = require('../simulator/engine');
const { compileTeamFromCode } = require('../simulator/bot_loader');
const { buildTeamCode } = require('../ai/dnn_codegen');

// 고정 아키텍처 (HTML/시뮬레이터 입력 특징 설계와 동기화)
const ARCH = { inDim: 43, h1: 24, h2: 16, outDim: 5 };

function weightCount(a) {
  return a.h1 * a.inDim + a.h1 + a.h2 * a.h1 + a.h2 + a.outDim * a.h2 + a.outDim;
}

function zeros(n) { return new Float64Array(n); }
function randn() {
  // Box-Muller
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function add(a, b, out) {
  const n = a.length; const o = out || new Float64Array(n);
  for (let i = 0; i < n; i++) o[i] = a[i] + b[i];
  return o;
}
function sub(a, b, out) {
  const n = a.length; const o = out || new Float64Array(n);
  for (let i = 0; i < n; i++) o[i] = a[i] - b[i];
  return o;
}
function scal(s, a, out) {
  const n = a.length; const o = out || new Float64Array(n);
  for (let i = 0; i < n; i++) o[i] = s * a[i];
  return o;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// 평가: 가중치 -> 팀 코드 생성 -> reference-ai와 대결 -> 점수
function evaluate(weights, seeds, opts = {}) {
  const arch = opts.arch || ARCH;
  const teamCode = buildTeamCode(Array.from(weights), arch);
  const refCode = fs.readFileSync(path.resolve('result/reference-ai.txt'), 'utf8');
  const red = compileTeamFromCode(teamCode, 'red', 'secure');
  const blue = compileTeamFromCode(refCode, 'blue', 'secure');
  const players = [...red, ...blue];

  let scoreSum = 0;
  let wins = 0;
  for (const s of seeds) {
    const r = runMatch(players, { seed: s, maxTicks: opts.maxTicks || 3500, fast: true });
    // 보상: 승/패 + 에너지 차 가중합
    const energyDiff = (r.stats.redEnergy - r.stats.blueEnergy);
    const aliveDiff = (r.stats.redAlive - r.stats.blueAlive);
    const winTerm = (r.winner === 'red') ? 1000 : (r.winner === 'blue') ? -1000 : 0;
    const sc = winTerm + 0.5 * aliveDiff + 0.02 * energyDiff - 0.001 * r.ticks; // 빠른 승리 선호
    scoreSum += sc;
    if (r.winner === 'red') wins += 1;
  }
  return { score: scoreSum / seeds.length, wins };
}

function saveResult(weights, arch, meta = {}) {
  const outDir = path.resolve('result');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const payload = { arch, weights: Array.from(weights), meta };
  fs.writeFileSync(path.join(outDir, 'dnn-ai-weights.json'), JSON.stringify(payload));
  const code = buildTeamCode(Array.from(weights), arch);
  fs.writeFileSync(path.join(outDir, 'dnn-ai.txt'), code);
}

async function main() {
  // 하이퍼파라미터
  const N = weightCount(ARCH);
  const iters = parseInt(process.env.DNN_ITERS || '60', 10);
  const pop = parseInt(process.env.DNN_POP || '16', 10); // antithetic pairs 수
  const evalSeeds = parseInt(process.env.DNN_SEEDS || '3', 10);
  const sigma = parseFloat(process.env.DNN_SIGMA || '0.35');
  const alpha = parseFloat(process.env.DNN_LR || '0.15');
  const maxTicks = parseInt(process.env.DNN_MAXTICKS || '3500', 10);
  const baseSeed = parseInt(process.env.DNN_BASESEED || `${Math.floor(Math.random()*1e9)}`, 10);

  // 초기 평균 가중치: 0 근방 랜덤 편차(바이어스가 모두 0이면 행동이 무기력할 수 있으므로 소량 랜덤)
  let m = zeros(N);
  for (let i = 0; i < N; i++) m[i] = 0.05 * randn();

  // 추적
  let bestW = m.slice(0);
  let bestScore = -Infinity;

  console.log(`[INIT] dims=${N}, iters=${iters}, pop=${pop}, seeds=${evalSeeds}, sigma=${sigma}, lr=${alpha}`);

  for (let t = 0; t < iters; t++) {
    // 샘플 생성 (antithetic)
    const epsList = [];
    for (let k = 0; k < pop; k++) {
      const e = zeros(N);
      for (let i = 0; i < N; i++) e[i] = randn();
      epsList.push(e);
    }

    // 시드 구성 다양화
    const seeds = Array.from({ length: evalSeeds }, (_, i) => baseSeed + t * 1000 + i);

    // 후보 평가
    const results = [];
    let grad = zeros(N);
    for (let k = 0; k < pop; k++) {
      const e = epsList[k];
      const wp = add(m, scal(sigma, e));
      const wm = sub(m, scal(sigma, e));
      const sp = evaluate(wp, seeds, { arch: ARCH, maxTicks });
      const sm = evaluate(wm, seeds, { arch: ARCH, maxTicks });
      const diff = sp.score - sm.score;
      // 누적 그라디언트(표준화는 간단히 편차 기반 가중)
      for (let i = 0; i < N; i++) grad[i] += diff * e[i];
      results.push({ k, sp: sp.score, sm: sm.score, diff });
    }

    // 스케일 정규화
    let diffMean = results.reduce((s, r) => s + r.diff, 0) / results.length;
    let diffStd = Math.sqrt(results.reduce((s, r) => s + (r.diff - diffMean) ** 2, 0) / Math.max(1, results.length - 1)) || 1;
    const scale = alpha / (pop * sigma * diffStd);
    m = add(m, scal(scale, grad));

    // 현재 평균 가중치 성능 평가 및 베스트 갱신
    const cur = evaluate(m, seeds, { arch: ARCH, maxTicks });
    if (cur.score > bestScore) {
      bestScore = cur.score; bestW = m.slice(0);
    }

    console.log(`[${t+1}/${iters}] meanScore=${cur.score.toFixed(2)} (wins:${cur.wins}/${evalSeeds}) best=${bestScore.toFixed(2)} diffStd=${diffStd.toFixed(3)}`);

    // 중간 저장(진행 상황 보존)
    if ((t + 1) % 5 === 0 || t === iters - 1) {
      saveResult(bestW, ARCH, { iter: t + 1, pop, evalSeeds, sigma, alpha, baseSeed, maxTicks });
      console.log(`  -> Saved interim to result/dnn-ai-*. (iter=${t+1})`);
    }
  }

  // 최종 저장
  saveResult(bestW, ARCH, { iter: iters, pop, evalSeeds, sigma, alpha, baseSeed, maxTicks, final: true });
  console.log('Done. Saved final weights/code to result/.');
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}


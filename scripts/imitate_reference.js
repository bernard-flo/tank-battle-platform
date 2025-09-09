/*
  Reference AI 모방 학습(지도학습) 스크립트
  - 시뮬레이터 상태에서 reference-ai.txt의 update 행동(사격각, 이동 시도 각 4개)을 관측하여 데이터셋 생성
  - 2-층 DNN(43 -> 24 -> 16 -> 5)을 직접 구현(순전파/역전파/Adam)하여 지도학습으로 각도 회귀 학습
  - 학습 완료 후 result/dnn-ai-weights.json, result/dnn-ai.txt 생성

  사용 예시:
    node scripts/imitate_reference.js  (환경변수로 반복/시드/샘플 수 조절)
*/

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createEngineWithTeams, Type } = require('../simulator/engine');
const { compileTeamFromCode } = require('../simulator/bot_loader');
const { buildTeamCode } = require('../ai/dnn_codegen');

// 고정 아키텍처(코드 생성기와 동기화)
// inDim: self(8)
//      + enemies EN_K=3 (dx,dy,health,dist,sin,cos) => 3*6=18
//      + allies  AL_K=2 (dx,dy,health,dist,sin,cos) => 2*6=12
//      + bullets BL_K=3 (dx,dy,vx,vy,dist,speed,approach) => 3*7=21
//      + counts(3) + walls(4) = 7
// 합계 8+18+12+21+7 = 66
// 각도 예측의 랩어라운드 문제를 줄이기 위해 출력 차원을 sin/cos(각도당 2차원)로 확장
// outDim = 10: [sin(m1),cos(m1), sin(m2),cos(m2), sin(m3),cos(m3), sin(m4),cos(m4), sin(f),cos(f)]
const ARCH = { inDim: 66, h1: 48, h2: 32, outDim: 10 };

function featureVector(tank, enemies, allies, bullets) {
  const W = 900, H = 600, EMAX = 150, SCL = 700, VX = 10, VY = 10;
  const EN_K = 3, AL_K = 2, BL_K = 3;
  const norm = (v, s) => (s ? v / s : v);
  const nearest = (arr, k) => {
    const tmp = arr.map((e) => ({ e, d: e.distance !== undefined ? e.distance : Math.hypot((e.x || 0) - tank.x, (e.y || 0) - tank.y) }));
    tmp.sort((a, b) => a.d - b.d);
    const out = []; for (let i = 0; i < k; i++) out.push(tmp[i] ? tmp[i].e : null);
    return out;
  };
  const s = Math.sin, c = Math.cos;

  const xSelf = [
    norm(tank.x, W),
    norm(tank.y, H),
    norm(tank.health, EMAX),
    norm(tank.energy, EMAX),
    norm(tank.size, 50),
    (tank.tankType === Type.NORMAL ? 1 : 0),
    (tank.tankType === Type.TANKER ? 1 : 0),
    (tank.tankType === Type.DEALER ? 1 : 0),
  ];

  const ens = nearest(enemies, EN_K);
  const als = nearest(allies, AL_K);
  const bls = nearest(bullets, BL_K);

  const xEn = [];
  for (let i = 0; i < EN_K; i++) {
    const e = ens[i];
    if (e) {
      const dx = e.x - tank.x, dy = e.y - tank.y;
      const ang = Math.atan2(dy, dx);
      xEn.push(norm(dx, W), norm(dy, H), norm(e.health, EMAX), norm(e.distance, SCL), s(ang), Math.cos(ang));
    } else xEn.push(0, 0, 0, 0, 0, 0);
  }
  const xAl = [];
  for (let i = 0; i < AL_K; i++) {
    const a = als[i];
    if (a) {
      const dx = a.x - tank.x, dy = a.y - tank.y;
      const ang = Math.atan2(dy, dx);
      xAl.push(norm(dx, W), norm(dy, H), norm(a.health, EMAX), norm(a.distance, SCL), s(ang), Math.cos(ang));
    } else xAl.push(0, 0, 0, 0, 0, 0);
  }
  const xBl = [];
  for (let i = 0; i < BL_K; i++) {
    const b = bls[i];
    if (b) {
      const dx = b.x - tank.x, dy = b.y - tank.y;
      const sp = Math.hypot(b.vx || 0, b.vy || 0) || 1;
      const appr = (dx * (b.vx || 0) + dy * (b.vy || 0)) > 0 ? 1 : 0;
      xBl.push(norm(dx, W), norm(dy, H), norm(b.vx || 0, VX), norm(b.vy || 0, VY), norm(b.distance, SCL), norm(sp, 12), appr);
    } else xBl.push(0, 0, 0, 0, 0, 0, 0);
  }

  const counts = [Math.min(1, enemies.length / 6), Math.min(1, allies.length / 5), Math.min(1, bullets.length / 6)];
  const walls = [norm(tank.x, W), norm(W - tank.x, W), norm(tank.y, H), norm(H - tank.y, H)];

  return new Float64Array([].concat(xSelf, xEn, xAl, xBl, counts, walls));
}

// reference update를 실행하여 (fireAngle, moveAngle들) 수집
function buildTeacherRunner(code) {
  const sandbox = {
    Type: Object.freeze({ NORMAL: 0, TANKER: 1, DEALER: 2 }),
    console: Object.freeze({ log() {}, warn() {}, error() {} }),
  };
  const context = vm.createContext(sandbox, { codeGeneration: { strings: true, wasm: false } });
  let updateFn = null;
  try {
    const script = new vm.Script(`"use strict";\n${code}\n;typeof update === 'function' ? update : null;`);
    updateFn = script.runInContext(context, { timeout: 50 });
  } catch (_e) { updateFn = null; }

  return function teacher(tankLike, enemies, allies, bullets) {
    const moves = [];
    let fire = null;
    const tankAPI = Object.freeze({
      move: Object.freeze((angle) => { moves.push(angle); return true; }),
      fire: Object.freeze((angle) => { if (fire == null) fire = angle; return true; }),
      x: tankLike.x, y: tankLike.y, health: tankLike.health, energy: tankLike.energy,
      type: tankLike.tankType, size: tankLike.size,
    });
    try { if (typeof updateFn === 'function') updateFn(tankAPI, enemies, allies, bullets); } catch (_e) {}
    // move는 최대 10회까지 들어올 수 있으나, 앞의 4개만 취함
    while (moves.length < 4) moves.push(0);
    const m = moves.slice(0, 4);
    if (fire == null) fire = 0;
    return { fire, moves: m };
  };
}

function deg2rad(d) { return (d % 360) * Math.PI / 180; }
function angWrap(d) { let a = d % 360; if (a < 0) a += 360; return a; }

function collectDataset(opts = {}) {
  const samplesTarget = opts.samples || 4000;
  const seeds = opts.seeds || [123, 456, 789, 101112, 131415];
  const refCode = fs.readFileSync(path.resolve('result/reference-ai.txt'), 'utf8');
  const red = compileTeamFromCode(refCode, 'red', 'secure');
  const blue = compileTeamFromCode(refCode, 'blue', 'secure');
  const players = [...red, ...blue];

  // teacher_runner: 각 로봇의 코드별로 분리되어 있으므로 tank.code를 이용
  const teacherCache = new Map();

  const X = [];
  const Y = [];
  for (const seed of seeds) {
    const engine = createEngineWithTeams(players, { seed, tickMs: 50, fast: true });
    let steps = 0;
    while (steps < 5000 && X.length < samplesTarget) {
      // 입력 생성용 스냅샷(엔진과 동일 로직)
      for (const t of engine.tanks) {
        if (!t.alive) continue;
        const enemies = engine.tanks.filter((u) => u.team !== t.team && u.alive).map((u) => ({
          x: u.x, y: u.y,
          distance: Math.hypot(u.x - t.x, u.y - t.y),
          angle: Math.atan2(u.y - t.y, u.x - t.x) * 180 / Math.PI,
          health: u.health,
        }));
        const allies = engine.tanks.filter((u) => u.team === t.team && u.alive && u.id !== t.id).map((u) => ({
          x: u.x, y: u.y,
          distance: Math.hypot(u.x - t.x, u.y - t.y),
          health: u.health,
        }));
        const bullets = engine.bullets.filter((b) => b.team !== t.team).map((b) => ({
          x: b.x, y: b.y, vx: b.vx, vy: b.vy,
          distance: Math.hypot(b.x - t.x, b.y - t.y),
        }));

        const feat = featureVector(t, enemies, allies, bullets);
        // teacher 실행
        let teacher = teacherCache.get(t.code);
        if (!teacher) { teacher = buildTeacherRunner(t.code); teacherCache.set(t.code, teacher); }
        const act = teacher(t, enemies, allies, bullets);
        // 각도 -> [sin, cos] 레이블(랩어라운드 안정)
        const toSinCos = (deg) => {
          const r = deg2rad(angWrap(deg || 0));
          return [Math.sin(r), Math.cos(r)];
        };
        const y = new Float64Array(10);
        const p0 = toSinCos(act.moves[0] || 0);
        const p1 = toSinCos(act.moves[1] || 0);
        const p2 = toSinCos(act.moves[2] || 0);
        const p3 = toSinCos(act.moves[3] || 0);
        const pf = toSinCos(act.fire || 0);
        y[0]=p0[0]; y[1]=p0[1];
        y[2]=p1[0]; y[3]=p1[1];
        y[4]=p2[0]; y[5]=p2[1];
        y[6]=p3[0]; y[7]=p3[1];
        y[8]=pf[0]; y[9]=pf[1];

        X.push(feat);
        Y.push(y);
        if (X.length >= samplesTarget) break;
      }
      // 엔진 1틱 진행(상태 다양화)
      engine.step();
      steps++;
    }
    if (X.length >= samplesTarget) break;
  }

  console.log(`[collect] X=${X.length}, Y=${Y.length}, seeds=${seeds.length}`);
  return { X, Y };
}

// 네트워크 파라미터 구조 분해/재구성 헬퍼
function paramSizes(a) {
  return {
    W1: [a.h1, a.inDim], b1: [a.h1],
    W2: [a.h2, a.h1], b2: [a.h2],
    W3: [a.outDim, a.h2], b3: [a.outDim],
  };
}

function initParams(a) {
  function randn() {
    let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
  const nW1 = a.h1 * a.inDim, nW2 = a.h2 * a.h1, nW3 = a.outDim * a.h2;
  const W1 = new Float64Array(nW1); const b1 = new Float64Array(a.h1);
  const W2 = new Float64Array(nW2); const b2 = new Float64Array(a.h2);
  const W3 = new Float64Array(nW3); const b3 = new Float64Array(a.outDim);
  // Xavier 초기화
  const s1 = Math.sqrt(2 / (a.inDim + a.h1));
  const s2 = Math.sqrt(2 / (a.h1 + a.h2));
  const s3 = Math.sqrt(2 / (a.h2 + a.outDim));
  for (let i = 0; i < nW1; i++) W1[i] = s1 * randn();
  for (let i = 0; i < nW2; i++) W2[i] = s2 * randn();
  for (let i = 0; i < nW3; i++) W3[i] = s3 * randn();
  // 바이어스는 0
  return { W1, b1, W2, b2, W3, b3 };
}

function forward(params, a, x) {
  const { W1, b1, W2, b2, W3, b3 } = params;
  const h1 = new Float64Array(a.h1);
  for (let i = 0; i < a.h1; i++) {
    let s = 0; const off = i * a.inDim;
    for (let j = 0; j < a.inDim; j++) s += W1[off + j] * x[j];
    h1[i] = Math.tanh(s + b1[i]);
  }
  const h2 = new Float64Array(a.h2);
  for (let i = 0; i < a.h2; i++) {
    let s = 0; const off = i * a.h1;
    for (let j = 0; j < a.h1; j++) s += W2[off + j] * h1[j];
    h2[i] = Math.tanh(s + b2[i]);
  }
  const y = new Float64Array(a.outDim);
  for (let i = 0; i < a.outDim; i++) {
    let s = 0; const off = i * a.h2;
    for (let j = 0; j < a.h2; j++) s += W3[off + j] * h2[j];
    y[i] = s + b3[i];
  }
  return { h1, h2, y };
}

function backward(params, a, x, cache, gy) {
  const { W1, b1, W2, b2, W3, b3 } = params;
  const { h1, h2 } = cache;
  // dL/dy = gy
  const gW3 = new Float64Array(W3.length); const gb3 = new Float64Array(b3.length);
  for (let i = 0; i < a.outDim; i++) {
    const off = i * a.h2; gb3[i] += gy[i];
    for (let j = 0; j < a.h2; j++) gW3[off + j] += gy[i] * h2[j];
  }
  // backprop to h2
  const gh2 = new Float64Array(a.h2);
  for (let j = 0; j < a.h2; j++) {
    let s = 0; for (let i = 0; i < a.outDim; i++) s += gy[i] * W3[i * a.h2 + j];
    gh2[j] = (1 - h2[j] * h2[j]) * s; // tanh'
  }
  const gW2 = new Float64Array(W2.length); const gb2 = new Float64Array(b2.length);
  for (let i = 0; i < a.h2; i++) {
    const off = i * a.h1; gb2[i] += gh2[i];
    for (let j = 0; j < a.h1; j++) gW2[off + j] += gh2[i] * h1[j];
  }
  // backprop to h1
  const gh1 = new Float64Array(a.h1);
  for (let j = 0; j < a.h1; j++) {
    let s = 0; for (let i = 0; i < a.h2; i++) s += gh2[i] * W2[i * a.h1 + j];
    gh1[j] = (1 - h1[j] * h1[j]) * s;
  }
  const gW1 = new Float64Array(W1.length); const gb1 = new Float64Array(b1.length);
  for (let i = 0; i < a.h1; i++) {
    const off = i * a.inDim; gb1[i] += gh1[i];
    for (let j = 0; j < a.inDim; j++) gW1[off + j] += gh1[i] * x[j];
  }

  return { gW1, gb1, gW2, gb2, gW3, gb3 };
}

function addInPlace(dst, src, scale = 1) {
  for (let i = 0; i < dst.length; i++) dst[i] += scale * src[i];
}

function adamInit(params) {
  const m = {}, v = {};
  for (const k of Object.keys(params)) {
    m[k] = new Float64Array(params[k].length);
    v[k] = new Float64Array(params[k].length);
  }
  return { m, v, t: 0 };
}

function adamStep(params, grads, opt, lr = 0.01, b1 = 0.9, b2 = 0.999, eps = 1e-8) {
  opt.t += 1;
  for (const k of Object.keys(params)) {
    const p = params[k], g = grads[k];
    const mk = opt.m[k], vk = opt.v[k];
    for (let i = 0; i < p.length; i++) {
      mk[i] = b1 * mk[i] + (1 - b1) * g[i];
      vk[i] = b2 * vk[i] + (1 - b2) * g[i] * g[i];
      const mhat = mk[i] / (1 - Math.pow(b1, opt.t));
      const vhat = vk[i] / (1 - Math.pow(b2, opt.t));
      p[i] -= lr * mhat / (Math.sqrt(vhat) + eps);
    }
  }
}

function packWeights(params, a) {
  const arr = [];
  arr.push(...params.W1, ...params.b1, ...params.W2, ...params.b2, ...params.W3, ...params.b3);
  return new Float64Array(arr);
}

function trainSupervised(dataset, a = ARCH, opts = {}) {
  const { X, Y } = dataset;
  const epochs = parseInt(process.env.IM_EPOCHS || `${opts.epochs || 6}`, 10);
  const bs = parseInt(process.env.IM_BATCH || `${opts.batch || 64}`, 10);
  const lr = parseFloat(process.env.IM_LR || `${opts.lr || 0.01}`);
  const l2 = parseFloat(process.env.IM_L2 || `${opts.l2 || 1e-6}`);

  const P = initParams(a);
  const opt = adamInit(P);

  const N = X.length;
  const idx = Array.from({ length: N }, (_, i) => i);

  for (let ep = 0; ep < epochs; ep++) {
    // 셔플
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }

    let lossSum = 0;
    for (let s = 0; s < N; s += bs) {
      const e = Math.min(N, s + bs);
      // 그라디언트 누적 버퍼
      const g = {
        gW1: new Float64Array(P.W1.length), gb1: new Float64Array(P.b1.length),
        gW2: new Float64Array(P.W2.length), gb2: new Float64Array(P.b2.length),
        gW3: new Float64Array(P.W3.length), gb3: new Float64Array(P.b3.length),
      };
      let batchLoss = 0;
      for (let ii = s; ii < e; ii++) {
        const i0 = idx[ii];
        const x = X[i0];
        const yTrue = Y[i0];
        const cache = forward(P, a, x);
        // MSE on sin/cos components (각 10차원)
        const gy = new Float64Array(a.outDim);
        for (let k = 0; k < a.outDim; k++) {
          const diff = cache.y[k] - yTrue[k];
          batchLoss += 0.5 * diff * diff;
          gy[k] = diff;
        }
        // backward
        const gg = backward(P, a, x, cache, gy);
        addInPlace(g.gW1, gg.gW1, 1); addInPlace(g.gb1, gg.gb1, 1);
        addInPlace(g.gW2, gg.gW2, 1); addInPlace(g.gb2, gg.gb2, 1);
        addInPlace(g.gW3, gg.gW3, 1); addInPlace(g.gb3, gg.gb3, 1);
      }
      // 평균 및 L2 정규화
      const scale = 1 / (e - s);
      for (let i = 0; i < g.gW1.length; i++) g.gW1[i] = g.gW1[i] * scale + l2 * P.W1[i];
      for (let i = 0; i < g.gW2.length; i++) g.gW2[i] = g.gW2[i] * scale + l2 * P.W2[i];
      for (let i = 0; i < g.gW3.length; i++) g.gW3[i] = g.gW3[i] * scale + l2 * P.W3[i];
      for (let i = 0; i < g.gb1.length; i++) g.gb1[i] = g.gb1[i] * scale;
      for (let i = 0; i < g.gb2.length; i++) g.gb2[i] = g.gb2[i] * scale;
      for (let i = 0; i < g.gb3.length; i++) g.gb3[i] = g.gb3[i] * scale;

      lossSum += batchLoss * scale;
      // 업데이트
      adamStep(P, { W1: g.gW1, b1: g.gb1, W2: g.gW2, b2: g.gb2, W3: g.gW3, b3: g.gb3 }, opt, lr);
    }
    console.log(`[epoch ${ep+1}/${epochs}] loss=${(lossSum).toFixed(4)}`);
  }

  return P;
}

function saveResultFromParams(P, arch, meta = {}) {
  const weights = packWeights(P, arch);
  const outDir = path.resolve('result');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'dnn-ai-weights.json'), JSON.stringify({ arch, weights: Array.from(weights), meta }));
  fs.writeFileSync(path.join(outDir, 'dnn-ai.txt'), buildTeamCode(Array.from(weights), arch));
}

async function main() {
  const samples = parseInt(process.env.IM_SAMPLES || '8000', 10);
  const dataset = collectDataset({ samples });
  const P = trainSupervised(dataset, ARCH, { epochs: 10, batch: 128, lr: 0.01, l2: 1e-6 });
  saveResultFromParams(P, ARCH, { mode: 'imitate-ref', samples, epochs: 10 });
  console.log('Saved to result/dnn-ai-weights.json and result/dnn-ai.txt');
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

// 코드 생성기: 주어진 가중치로 6개 로봇(DNN 전용) 팀 코드를 생성
// - tank_battle_platform.html 및 simulator/bot_loader.js 호환 형식
// - 블록 구성: function name(), function type(), function update(...)
// - 타입 순서 고정: [NORMAL, DEALER, TANKER, DEALER, TANKER, DEALER]

const fs = require('fs');
const path = require('path');

// 네트워크 구조 정의(생성기와 런타임 코드 동일하게 유지)
function getNetSpec() {
  // 입력 구성:
  // - 탱크 자체: x,y, health, energy, type onehot(3), size(정규화)
  // - 적 K_e = 3: 각 (dx, dy, distance, angle_sin, angle_cos, health)
  // - 아군 K_a = 2: 각 (dx, dy, distance, health)
  // - 총알 K_b = 4: 각 (dx, dy, distance, vx, vy)
  // 합계: self(1*8) + enemies(3*6) + allies(2*4) + bullets(4*5) = 8 + 18 + 8 + 20 = 54
  // 여유로 전역 정보 추가: [bias(1), mapW(1), mapH(1)] => 3, 총 57
  // 추가: 팀별 평균/최소 거리(적/아군) 4개 => 61
  // 추가: 카운트(적,아군,총알) 3개 => 64
  // 여유 입력을 위해 padding 0  => INPUT_SIZE = 64
  const INPUT_SIZE = 64;
  const H1 = 64;
  const H2 = 64;
  const OUTPUT_SIZE = 9; // [mv1x,mv1y,mv2x,mv2y, fx,fy, fire_logit, mv3x,mv3y]
  return { INPUT_SIZE, H1, H2, OUTPUT_SIZE };
}

function zeros(n) { return Array.from({ length: n }, () => 0); }

function initWeights(rand = Math.random) {
  const { INPUT_SIZE, H1, H2, OUTPUT_SIZE } = getNetSpec();
  const scale = 1/Math.sqrt(INPUT_SIZE);
  function randn() {
    // Box-Muller
    let u = 0, v = 0; while (u === 0) u = rand(); while (v === 0) v = rand();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
  function initDense(inDim, outDim) {
    const W = []; const b = [];
    for (let o = 0; o < outDim; o++) {
      for (let i = 0; i < inDim; i++) W.push(randn() * scale);
      b.push(0);
    }
    return { W, b };
  }
  const L1 = initDense(INPUT_SIZE, H1);
  const L2 = initDense(H1, H2);
  const L3 = initDense(H2, OUTPUT_SIZE);
  return { ...getNetSpec(), ...L1, ...L2, ...L3 };
}

function flattenWeights(w) {
  const { INPUT_SIZE, H1, H2, OUTPUT_SIZE } = w;
  return {
    INPUT_SIZE, H1, H2, OUTPUT_SIZE,
    W1: w.W.slice(0, H1 * INPUT_SIZE), b1: w.b.slice(0, H1),
    W2: w.W.slice(H1 * INPUT_SIZE, H1 * INPUT_SIZE + H2 * H1), b2: w.b.slice(H1, H1 + H2),
    W3: w.W.slice(H1 * INPUT_SIZE + H2 * H1), b3: w.b.slice(H1 + H2),
  };
}

// 문자열 코드 생성기
function generateRobotBlock(name, tankType, weights) {
  const { INPUT_SIZE, H1, H2, OUTPUT_SIZE, W1, b1, W2, b2, W3, b3 } = weights;
  const header = `const INPUT_SIZE = ${INPUT_SIZE};\nconst H1 = ${H1};\nconst H2 = ${H2};\nconst OUTPUT_SIZE = ${OUTPUT_SIZE};`;

  const arrays = [
    `const W1 = [\n  ${W1.map((v, i) => (i>0 && i%16===0?"\n  ":"") + v.toFixed(6)).join(',')}\n];`,
    `const b1 = [${b1.map(v => v.toFixed(6)).join(',')}];`,
    `const W2 = [\n  ${W2.map((v, i) => (i>0 && i%16===0?"\n  ":"") + v.toFixed(6)).join(',')}\n];`,
    `const b2 = [${b2.map(v => v.toFixed(6)).join(',')}];`,
    `const W3 = [${W3.map(v => v.toFixed(6)).join(',')}];`,
    `const b3 = [${b3.map(v => v.toFixed(6)).join(',')}];`,
  ].join('\n\n');

  const math = `
function clamp01(x){return x<0?0:(x>1?1:x);} 
function norm(x,a,b){return (x-a)/Math.max(1e-6,(b-a));}
function relu(x){return x>0?x:0;}
function tanh(x){const e=Math.exp; const a=e(x), b=e(-x); return (a-b)/(a+b);} 
function sigmoid(x){return 1/(1+Math.exp(-x));}
function gemv(W, x, outDim, inDim, b){
  const y = new Array(outDim).fill(0);
  for(let o=0;o<outDim;o++){
    let s = b?b[o]:0; const base=o*inDim;
    for(let i=0;i<inDim;i++) s += W[base+i]*x[i];
    y[o]=s;
  }
  return y;
}
function mlpForward(x){
  const h1 = gemv(W1, x, H1, INPUT_SIZE, b1).map(relu);
  const h2 = gemv(W2, h1, H2, H1, b2).map(relu);
  const o = gemv(W3, h2, OUTPUT_SIZE, H2, b3);
  const mv1 = Math.atan2(o[1], o[0]) * 180/Math.PI;
  const mv2 = Math.atan2(o[3], o[2]) * 180/Math.PI;
  const fireAngle = Math.atan2(o[5], o[4]) * 180/Math.PI;
  const fireP = sigmoid(o[6]);
  const mv3 = Math.atan2(o[8], o[7]) * 180/Math.PI;
  return { mv1, mv2, mv3, fireAngle, fireP };
}
`;

  const features = `
function buildFeatures(tank, enemies, allies, bulletInfo){
  const W = 900, H = 600; // 엔진과 동일
  const x=[];
  // self
  x.push(norm(tank.x,0,W));
  x.push(norm(tank.y,0,H));
  x.push(clamp01(tank.health/200));
  x.push(clamp01(tank.energy/200));
  x.push(tank.type===0?1:0);
  x.push(tank.type===1?1:0);
  x.push(tank.type===2?1:0);
  x.push(clamp01(tank.size/60));
  // enemies (top-3 by distance)
  const es = enemies.slice().sort((a,b)=>a.distance-b.distance).slice(0,3);
  for(let i=0;i<3;i++){
    const e = es[i];
    if(e){
      const dx=e.x-tank.x, dy=e.y-tank.y; const d=Math.hypot(dx,dy)||1;
      x.push(dx/900); x.push(dy/600); x.push(clamp01(d/1000));
      x.push(Math.sin(Math.atan2(dy,dx))); x.push(Math.cos(Math.atan2(dy,dx)));
      x.push(clamp01(e.health/200));
    }else{ x.push(0,0,1,0,1,0); }
  }
  // allies (top-2 by distance)
  const as = allies.slice().sort((a,b)=>a.distance-b.distance).slice(0,2);
  for(let i=0;i<2;i++){
    const a = as[i];
    if(a){ const dx=a.x-tank.x, dy=a.y-tank.y; const d=Math.hypot(dx,dy)||1; x.push(dx/900, dy/600, clamp01(d/1000), clamp01(a.health/200)); }
    else { x.push(0,0,1,0); }
  }
  // bullets (top-4 by distance)
  const bs = bulletInfo.slice().sort((a,b)=>a.distance-b.distance).slice(0,4);
  for(let i=0;i<4;i++){
    const b = bs[i];
    if(b){ const dx=b.x-tank.x, dy=b.y-tank.y; const d=Math.hypot(dx,dy)||1; x.push(dx/900, dy/600, clamp01(d/1000), b.vx/8, b.vy/8); }
    else { x.push(0,0,1,0,0); }
  }
  // global features
  x.push(1); // bias
  x.push(W/1000); x.push(H/1000);
  // aggregate dists
  function agg(arr){ if(arr.length===0) return {mn:1, av:1}; let mn=1e9, s=0; for(const d of arr){ if(d<mn) mn=d; s+=d; } return { mn: clamp01(mn/1000), av: clamp01((s/arr.length)/1000) }; }
  const ed = agg(enemies.map(e=>e.distance)); x.push(ed.mn, ed.av);
  const ad = agg(allies.map(a=>a.distance)); x.push(ad.mn, ad.av);
  // counts
  x.push(clamp01(enemies.length/6)); x.push(clamp01(allies.length/5)); x.push(clamp01(bulletInfo.length/20));
  // pad to INPUT_SIZE
  while(x.length<INPUT_SIZE) x.push(0);
  if(x.length>INPUT_SIZE) x.length=INPUT_SIZE;
  return x;
}
`;

  const policy = `
function policyStep(tank, enemies, allies, bulletInfo){
  const feat = buildFeatures(tank, enemies, allies, bulletInfo);
  const out = mlpForward(feat);
  // 순수 DNN 출력 각도로 발사(쿨다운은 엔진에서 처리)
  tank.fire(out.fireAngle);
  // DNN이 제안한 세 방향을 순차 시도
  if(!tank.move(out.mv1)){
    if(!tank.move(out.mv2)){
      tank.move(out.mv3);
    }
  }
}
`;

  const block = [
    header,
    arrays,
    math,
    features,
    policy,
    `function name(){ return ${JSON.stringify(name)}; }`,
    `function type(){ return Type.${tankType}; }`,
    `function update(tank, enemies, allies, bulletInfo){\n  policyStep(tank, enemies, allies, bulletInfo);\n}`,
  ].join('\n\n');

  return block;
}

function generateTeamCode(weights, names){
  const typeSeq = ['NORMAL','DEALER','TANKER','DEALER','TANKER','DEALER'];
  const blocks = [];
  for(let i=0;i<6;i++){
    const nm = names && names[i] ? names[i] : `DNN-${typeSeq[i][0]}${i+1}`; // 간단 이름
    blocks.push(generateRobotBlock(nm, typeSeq[i], weights));
    if(i<5) blocks.push('\n\n// ===== 다음 로봇 =====\n\n');
  }
  return blocks.join('');
}

function saveTeamTo(filePath, weights, names){
  const code = generateTeamCode(weights, names);
  fs.writeFileSync(path.resolve(filePath), code, 'utf8');
  return code.length;
}

// 범용 MLP 코드 생성기
// spec: { inputSize, hiddenSizes:[h1,h2], outputSize, weights: Float64Array|number[] }
// 출력 9 구성 가정: [mv1x,mv1y,mv2x,mv2y, fx,fy, fire_logit, mv3x,mv3y]
function genMLPCode(spec){
  const inputSize = spec.inputSize;
  const h1 = spec.hiddenSizes[0];
  const h2 = spec.hiddenSizes[1];
  const out = spec.outputSize; // 9 권장
  const W = Array.from(spec.weights || []);
  // 분할: [W1(input*h1), B1(h1), W2(h1*h2), B2(h2), W3(h2*out), B3(out)]
  const L1 = inputSize * h1;
  const B1 = h1;
  const L2 = h1 * h2;
  const B2 = h2;
  const L3 = h2 * out;
  const B3 = out;
  function slice(base, n){ return W.slice(base, base+n); }
  const W1 = slice(0, L1);
  const b1 = slice(L1, B1);
  const W2 = slice(L1+B1, L2);
  const b2 = slice(L1+B1+L2, B2);
  const W3 = slice(L1+B1+L2+B2, L3);
  const b3 = slice(L1+B1+L2+B2+L3, B3);

  // 특징 구성: 76 차원(자기 8 + 적4*5 + 아군3*5 + 총알5*6 + 통계3)
  const features76 = `
function clamp01(x){return x<0?0:(x>1?1:x);} 
function norm(x,a,b){return (x-a)/Math.max(1e-6,(b-a));}
function relu(x){return x>0?x:0;}
function tanh(x){const e=Math.exp; const a=e(x), b=e(-x); return (a-b)/(a+b);} 
function sigmoid(x){return 1/(1+Math.exp(-x));}
function gemv(W, x, outDim, inDim, b){
  const y = new Array(outDim).fill(0);
  for(let o=0;o<outDim;o++){
    let s = b?b[o]:0; const base=o*inDim;
    for(let i=0;i<inDim;i++) s += W[base+i]*x[i];
    y[o]=s;
  }
  return y;
}
function mlpForward(x){
  const h1 = gemv(W1, x, ${h1}, ${inputSize}, b1).map(relu);
  const h2 = gemv(W2, h1, ${h2}, ${h1}, b2).map(relu);
  const o  = gemv(W3, h2, ${out}, ${h2}, b3);
  const mv1 = Math.atan2(tanh(o[1]), tanh(o[0])) * 180/Math.PI;
  const mv2 = Math.atan2(tanh(o[3]), tanh(o[2])) * 180/Math.PI;
  const fireAngle = Math.atan2(tanh(o[5]), tanh(o[4])) * 180/Math.PI;
  const fireP = sigmoid(o[6]);
  const mv3 = Math.atan2(tanh(o[8]||0), tanh(o[7]||0)) * 180/Math.PI;
  return { mv1, mv2, mv3, fireAngle, fireP };
}
function buildFeatures(tank, enemies, allies, bulletInfo){
  const W=900, H=600;
  const x=[];
  // self 8
  x.push(norm(tank.x,0,W));
  x.push(norm(tank.y,0,H));
  x.push(clamp01(tank.health/200));
  x.push(clamp01(tank.energy/200));
  x.push(tank.type===0?1:0);
  x.push(tank.type===1?1:0);
  x.push(tank.type===2?1:0);
  x.push(clamp01(tank.size/60));
  function topK(arr,k){ return arr.slice().sort((a,b)=> (a.distance||1e9)-(b.distance||1e9)).slice(0,k); }
  // enemies 4*(dist, dx, dy, ang, hp)
  const es = topK(enemies,4);
  for(let i=0;i<4;i++){
    const e=es[i]; if(e){
      const dx=e.x-tank.x, dy=e.y-tank.y; const d=Math.hypot(dx,dy)||1;
      const ang=Math.atan2(dy,dx)/Math.PI; // -1..1
      x.push(clamp01(d/1100), clamp01(dx/900+0.5), clamp01(dy/600+0.5), ang, clamp01(e.health/200));
    } else { x.push(0,0.5,0.5,0,0); }
  }
  // allies 3*(dist, dx, dy, ang, hp)
  const as = topK(allies,3);
  for(let i=0;i<3;i++){
    const a=as[i]; if(a){
      const dx=a.x-tank.x, dy=a.y-tank.y; const d=Math.hypot(dx,dy)||1;
      const ang=Math.atan2(dy,dx)/Math.PI;
      x.push(clamp01(d/1100), clamp01(dx/900+0.5), clamp01(dy/600+0.5), ang, clamp01(a.health/200));
    } else { x.push(0,0.5,0.5,0,0); }
  }
  // bullets 5*(dist, dx, dy, ang, vx, vy)
  const bs = topK(bulletInfo,5);
  for(let i=0;i<5;i++){
    const b=bs[i]; if(b){
      const dx=b.x-tank.x, dy=b.y-tank.y; const d=Math.hypot(dx,dy)||1; const ang=Math.atan2(dy,dx)/Math.PI;
      x.push(clamp01(d/1100), clamp01(dx/900+0.5), clamp01(dy/600+0.5), ang, clamp01((b.vx+8)/16), clamp01((b.vy+8)/16));
    } else { x.push(0,0.5,0.5,0,0.5,0.5); }
  }
  // stats 3
  x.push(clamp01(enemies.length/6)); x.push(clamp01(allies.length/5)); x.push(clamp01(bulletInfo.length/12));
  // pad/cut
  while(x.length<${inputSize}) x.push(0);
  if(x.length>${inputSize}) x.length=${inputSize};
  return x;
}
function policyStep(tank, enemies, allies, bulletInfo){
  const feat = buildFeatures(tank, enemies, allies, bulletInfo);
  const out = mlpForward(feat);
  tank.fire(out.fireAngle);
  if(!tank.move(out.mv1)){
    if(!tank.move(out.mv2)){
      tank.move(out.mv3);
    }
  }
}`;

  // 가중치/상수 블록 생성기
  function blockFor(name, typeStr){
    const arrays = [
      `const W1 = [${W1.map(v=>Number(v).toFixed(6)).join(',')}];`,
      `const b1 = [${b1.map(v=>Number(v).toFixed(6)).join(',')}];`,
      `const W2 = [${W2.map(v=>Number(v).toFixed(6)).join(',')}];`,
      `const b2 = [${b2.map(v=>Number(v).toFixed(6)).join(',')}];`,
      `const W3 = [${W3.map(v=>Number(v).toFixed(6)).join(',')}];`,
      `const b3 = [${b3.map(v=>Number(v).toFixed(6)).join(',')}];`,
    ].join('\n');
    const head = `const INPUT_SIZE=${inputSize}; const H1=${h1}; const H2=${h2}; const OUTPUT_SIZE=${out};`;
    return [
      head,
      arrays,
      features76,
      `function name(){ return ${JSON.stringify(name)}; }`,
      `function type(){ return Type.${typeStr}; }`,
      `function update(tank, enemies, allies, bulletInfo){ policyStep(tank, enemies, allies, bulletInfo); }`,
    ].join('\n\n');
  }

  const typeSeq = ['NORMAL','DEALER','TANKER','DEALER','TANKER','DEALER'];
  const blocks = [];
  for(let i=0;i<6;i++){
    const nm = `DNN-${typeSeq[i][0]}${i+1}`;
    blocks.push(blockFor(nm, typeSeq[i]));
    if(i<5) blocks.push('\n\n// ===== 다음 로봇 =====\n\n');
  }
  return blocks.join('');
}

module.exports = { getNetSpec, initWeights, flattenWeights, generateRobotBlock, generateTeamCode, saveTeamTo, genMLPCode };

if (require.main === module) {
  // CLI: node src/generate_dnn_team.js result/ai_dnn_team.txt
  const out = process.argv[2] || 'result/ai_dnn_team.txt';
  const w = initWeights();
  const flat = {
    INPUT_SIZE: w.INPUT_SIZE, H1: w.H1, H2: w.H2, OUTPUT_SIZE: w.OUTPUT_SIZE,
    W1: w.W1 || w.W.slice(0, w.H1*w.INPUT_SIZE),
    b1: w.b1 || w.b.slice(0, w.H1),
    W2: w.W2 || w.W.slice(w.H1*w.INPUT_SIZE, w.H1*w.INPUT_SIZE + w.H2*w.H1),
    b2: w.b2 || w.b.slice(w.H1, w.H1 + w.H2),
    W3: w.W3 || w.W.slice(w.H1*w.INPUT_SIZE + w.H2*w.H1),
    b3: w.b3 || w.b.slice(w.H1 + w.H2),
  };
  const n = saveTeamTo(out, flat);
  console.log(`Generated team code -> ${out} (${n} bytes)`);
}

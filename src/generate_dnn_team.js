// DNN 기반 팀 코드 생성기
// - tank_battle_platform.html에서 Import 가능한 텍스트를 생성
// - update(tank, enemies, allies, bulletInfo) 내에서 모든 파라미터를 활용하는 피처 추출 + MLP 추론만 사용(휴리스틱 없음)

function genArray(name, arr, perLine = 16) {
  const lines = [];
  for (let i = 0; i < arr.length; i += perLine) {
    const chunk = arr.slice(i, i + perLine);
    lines.push(chunk.map((v) => Number(v).toFixed(6)).join(','));
  }
  return `const ${name} = [\n${lines.map((l) => '  ' + l).join('\n')}\n];`;
}

function genMLPCode(config) {
  const {
    inputSize,
    hiddenSizes, // [h1, h2]
    outputSize,  // 5: [move_x, move_y, fire_x, fire_y, fire_logit]
    weights,     // flat Float64Array
    typesOrder = [0, 2, 1, 2, 1, 2], // NORMAL, DEALER, TANKER, DEALER, TANKER, DEALER
    playerNames = ['DNN-N1','DNN-D1','DNN-T1','DNN-D2','DNN-T2','DNN-D3'],
  } = config;

  // 분해 인덱스 계산
  const L1 = inputSize * hiddenSizes[0];
  const B1 = hiddenSizes[0];
  const L2 = hiddenSizes[0] * hiddenSizes[1];
  const B2 = hiddenSizes[1];
  const L3 = hiddenSizes[1] * outputSize;
  const B3 = outputSize;

  if (weights.length !== L1 + B1 + L2 + B2 + L3 + B3) {
    throw new Error('weights length mismatch');
  }

  const w1 = weights.slice(0, L1);
  const b1 = weights.slice(L1, L1 + B1);
  const o1 = L1 + B1;
  const w2 = weights.slice(o1, o1 + L2);
  const b2 = weights.slice(o1 + L2, o1 + L2 + B2);
  const o2 = o1 + L2 + B2;
  const w3 = weights.slice(o2, o2 + L3);
  const b3 = weights.slice(o2 + L3, o2 + L3 + B3);

  const arrays = [
    genArray('W1', w1),
    genArray('B1', b1),
    genArray('W2', w2),
    genArray('B2', b2),
    genArray('W3', w3),
    genArray('B3', b3),
  ].join('\n');

  // 팀 코드 템플릿
  // - 순수 MLP 추론으로 move/fire 각도와 발사 의사결정(logit)을 산출
  // - 입력 피처는 update 파라미터들을 전부 사용하여 구성
  const common = `
const INPUT_SIZE = ${inputSize};
const H1 = ${hiddenSizes[0]};
const H2 = ${hiddenSizes[1]};
const OUTPUT_SIZE = ${outputSize}; // [mvx, mvy, fx, fy, fire_logit]

${arrays}

function relu(x){return x>0?x:0;}
function tanh(x){const e1=Math.exp(x), e2=Math.exp(-x); return (e1-e2)/(e1+e2);}
function sigmoid(x){return 1/(1+Math.exp(-x));}

function mlpForward(x){
  // x: length INPUT_SIZE
  const h1 = new Array(H1).fill(0);
  for(let i=0;i<H1;i++){
    let s = B1[i];
    for(let j=0;j<INPUT_SIZE;j++) s += W1[i*INPUT_SIZE + j]*x[j];
    h1[i] = relu(s);
  }
  const h2 = new Array(H2).fill(0);
  for(let i=0;i<H2;i++){
    let s = B2[i];
    for(let j=0;j<H1;j++) s += W2[i*H1 + j]*h1[j];
    h2[i] = relu(s);
  }
  const out = new Array(OUTPUT_SIZE).fill(0);
  for(let i=0;i<OUTPUT_SIZE;i++){
    let s = B3[i];
    for(let j=0;j<H2;j++) s += W3[i*H2 + j]*h2[j];
    out[i] = s;
  }
  // post-process
  const mvx = tanh(out[0]);
  const mvy = tanh(out[1]);
  const fx  = tanh(out[2]);
  const fy  = tanh(out[3]);
  const fireP = sigmoid(out[4]);
  // 각도 변환
  const mvAngle = Math.atan2(mvy, mvx) * 180/Math.PI;
  const fireAngle = Math.atan2(fy, fx) * 180/Math.PI;
  return { mvAngle, fireAngle, fireP };
}

function norm(x, a, b){ return (x - a) / (b - a); }
function clamp01(v){ return v<0?0:(v>1?1:v); }

function buildFeatures(tank, enemies, allies, bulletInfo){
  // 입력 피처 구성 (전부 사용)
  // - 탱크 자체 상태: x,y,health,energy,typeOneHot(3),size
  // - 적/아군 최근접 K명: 상대 위치(상대 좌표-자기 좌표), 거리, 각, 체력
  // - 총알 최근접 K발: 상대 위치/속도(상대 좌표-자기 좌표), 거리
  const W=900, H=600;
  const self = [
    norm(tank.x, 0, W),
    norm(tank.y, 0, H),
    clamp01(tank.health/200),
    clamp01(tank.energy/200),
    tank.type===0?1:0,
    tank.type===1?1:0,
    tank.type===2?1:0,
    clamp01(tank.size/60),
  ];

  // 정렬 및 K개 추출
  function topK(arr, k){
    const sorted = arr.slice().sort((a,b)=> (a.distance||1e9)-(b.distance||1e9));
    return sorted.slice(0,k);
  }
  const KE=4, KA=3, KB=5;
  const es = topK(enemies, KE);
  const as = topK(allies, KA);
  const bs = topK(bulletInfo, KB);

  const ef = [];
  for(let i=0;i<KE;i++){
    const e = es[i];
    if(e){
      const dx = e.x - tank.x; const dy = e.y - tank.y;
      const ang = Math.atan2(dy, dx)/Math.PI; // -1..1
      ef.push(clamp01(Math.hypot(dx,dy)/1100), clamp01(dx/900 + 0.5), clamp01(dy/600 + 0.5), ang, clamp01(e.health/200));
    }else{
      ef.push(0,0,0,0,0);
    }
  }
  const af = [];
  for(let i=0;i<KA;i++){
    const a = as[i];
    if(a){
      const dx = a.x - tank.x; const dy = a.y - tank.y;
      const ang = Math.atan2(dy, dx)/Math.PI;
      af.push(clamp01(Math.hypot(dx,dy)/1100), clamp01(dx/900 + 0.5), clamp01(dy/600 + 0.5), ang, clamp01(a.health/200));
    }else{
      af.push(0,0,0,0,0);
    }
  }
  const bf = [];
  for(let i=0;i<KB;i++){
    const b = bs[i];
    if(b){
      const dx = b.x - tank.x; const dy = b.y - tank.y;
      const ang = Math.atan2(dy, dx)/Math.PI;
      bf.push(clamp01(Math.hypot(dx,dy)/1100), clamp01(dx/900 + 0.5), clamp01(dy/600 + 0.5), ang,
              clamp01((b.vx+8)/16), clamp01((b.vy+8)/16));
    }else{
      bf.push(0,0,0,0,0,0);
    }
  }

  // 전역 통계(개수/합계)
  const stats = [
    clamp01(enemies.length/6),
    clamp01(allies.length/5),
    clamp01(bulletInfo.length/10),
  ];

  const x = self.concat(ef, af, bf, stats);
  // 길이 보정(정확히 INPUT_SIZE)
  if (x.length < INPUT_SIZE) {
    while (x.length < INPUT_SIZE) x.push(0);
  } else if (x.length > INPUT_SIZE) {
    x.length = INPUT_SIZE;
  }
  return x;
}

function policyStep(tank, enemies, allies, bulletInfo){
  const feat = buildFeatures(tank, enemies, allies, bulletInfo);
  const out = mlpForward(feat);
  // 액션 적용
  if (out.fireP > 0.5) {
    tank.fire(out.fireAngle);
  }
  tank.move(out.mvAngle);
}
`;

  function robotBlock(name, typeConst) {
    return `
function name(){ return ${JSON.stringify(name)}; }
function type(){ return Type.${typeConst}; }
function update(tank, enemies, allies, bulletInfo){
  policyStep(tank, enemies, allies, bulletInfo);
}
`;
  }

  const blocks = [];
  for (let i = 0; i < 6; i++) {
    const nm = playerNames[i] || `DNN-${i+1}`;
    const t = typesOrder[i];
    const typeConst = t === 0 ? 'NORMAL' : (t === 1 ? 'TANKER' : 'DEALER');
    // 각 로봇 블록에 공통 MLP 정의 포함(HTML/Node 분할 로더가 개별 블록만 실행하기 때문)
    blocks.push(common + '\n' + robotBlock(nm, typeConst));
  }

  return blocks.join('\n\n// ===== 다음 로봇 =====\n\n');
}

function initialWeights(inputSize, hiddenSizes, outputSize, sigma=0.5, rng=Math.random){
  const L1 = inputSize * hiddenSizes[0];
  const B1 = hiddenSizes[0];
  const L2 = hiddenSizes[0] * hiddenSizes[1];
  const B2 = hiddenSizes[1];
  const L3 = hiddenSizes[1] * outputSize;
  const B3 = outputSize;
  const n = L1+B1+L2+B2+L3+B3;
  const w = new Float64Array(n);
  for(let i=0;i<n;i++){
    // Xavier-like scaled normal approx using Box-Muller
    let u=0,v=0; while(u===0) u=rng(); while(v===0) v=rng();
    const z = Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
    w[i] = z * sigma;
  }
  return w;
}

module.exports = {
  genMLPCode,
  initialWeights,
};

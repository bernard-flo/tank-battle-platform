// DNN 기반 탱크 AI 코드 생성기
// - tank_battle_platform.html의 Import 포맷에 맞춘 6개 로봇 코드 문자열 생성
// - update 함수는 DNN 순전파만으로 의사결정(휴리스틱 금지)
// - 타입 고정 순서: dealer, normal, dealer, tanker, dealer, tanker

function genMatrixCode(name, mat) {
  const flat = mat.flat();
  return `const ${name} = [${flat.map((v) => +(+v).toFixed(8)).join(', ')}];`;
}

function genVectorCode(name, vec) {
  return `const ${name} = [${vec.map((v) => +(+v).toFixed(8)).join(', ')}];`;
}

function chunkWeights(weights, inDim, h1, h2, outDim) {
  // weights 배열을 [W1 (h1 x in), b1 (h1), W2 (h2 x h1), b2 (h2), W3 (out x h2), b3 (out)] 로 해석
  let idx = 0;
  const take = (n) => weights.slice(idx, (idx += n));
  const W1 = [];
  for (let r = 0; r < h1; r++) W1.push(take(inDim));
  const b1 = take(h1);
  const W2 = [];
  for (let r = 0; r < h2; r++) W2.push(take(h1));
  const b2 = take(h2);
  const W3 = [];
  for (let r = 0; r < outDim; r++) W3.push(take(h2));
  const b3 = take(outDim);
  return { W1, b1, W2, b2, W3, b3 };
}

function buildRobotCode(idx, weights, arch) {
  const { inDim, h1, h2, outDim } = arch;
  const { W1, b1, W2, b2, W3, b3 } = chunkWeights(weights, inDim, h1, h2, outDim);

  const typeSeq = [2, 0, 2, 1, 2, 1]; // DEALER, NORMAL, DEALER, TANKER, DEALER, TANKER
  const typeConst = ['Type.NORMAL', 'Type.TANKER', 'Type.DEALER'];
  const tankType = typeConst[typeSeq[idx]];

  // 이름은 식별 가능한 형태로 부여
  const robotName = `DNN-${idx + 1}`;

  // 코드 조각 생성
  const code = `function name(){ return "${robotName}"; }
function type(){ return ${tankType}; }
function update(tank,enemies,allies,bulletInfo){
  // ===== DNN 기반 정책 =====
  // 입력: self + 상위 K개의 enemy/allies/bullets 특징
  // 출력: [move1, move2, move3, move4, fireAngle] (각도: 0~360)

  // 고정 하이퍼파라미터(플랫폼 상수)
  const W=900, H=600; const EMAX=150, SCL=700; const VX=10, VY=10;
  const EN_K=3, AL_K=2, BL_K=3;

  // 특징 벡터 구성
  function norm(v, s){ return s ? v/s : v; }
  function angleWrap(a){ a%=360; if(a<0)a+=360; return a; }

  function nearest(arr, k){
    const tmp = arr.map((e)=>({e, d: e.distance!==undefined? e.distance : Math.hypot((e.x||0)-tank.x,(e.y||0)-tank.y)}));
    tmp.sort((a,b)=>a.d-b.d);
    const out=[]; for(let i=0;i<k;i++){ out.push(tmp[i]? tmp[i].e:null); }
    return out;
  }

  const xSelf = [
    norm(tank.x, W),
    norm(tank.y, H),
    norm(tank.health, EMAX),
    norm(tank.energy, EMAX),
    norm(tank.size, 50),
    (tank.type===0?1:0),
    (tank.type===1?1:0),
    (tank.type===2?1:0),
  ];

  const ens = nearest(enemies, EN_K);
  const als = nearest(allies, AL_K);
  const bls = nearest(bulletInfo, BL_K);

  const xEn = [];
  for(let i=0;i<EN_K;i++){
    const e = ens[i];
    if(e){
      xEn.push( norm(e.x - tank.x, W), norm(e.y - tank.y, H), norm(e.health, EMAX), norm(e.distance, SCL) );
    } else {
      xEn.push(0,0,0,0);
    }
  }

  const xAl = [];
  for(let i=0;i<AL_K;i++){
    const a = als[i];
    if(a){
      xAl.push( norm(a.x - tank.x, W), norm(a.y - tank.y, H), norm(a.health, EMAX), norm(a.distance, SCL) );
    } else {
      xAl.push(0,0,0,0);
    }
  }

  const xBl = [];
  for(let i=0;i<BL_K;i++){
    const b = bls[i];
    if(b){
      xBl.push( norm(b.x - tank.x, W), norm(b.y - tank.y, H), norm(b.vx, VX), norm(b.vy, VY), norm(b.distance, SCL) );
    } else {
      xBl.push(0,0,0,0,0);
    }
  }

  const X = [].concat(xSelf, xEn, xAl, xBl);

  // 네트워크 파라미터
  ${genMatrixCode('W1', W1)}
  ${genVectorCode('b1', b1)}
  ${genMatrixCode('W2', W2)}
  ${genVectorCode('b2', b2)}
  ${genMatrixCode('W3', W3)}
  ${genVectorCode('b3', b3)}

  function dotRow(mat, cols, r, vec){
    let s=0, off=r*cols;
    for(let c=0;c<cols;c++){ s += mat[off+c]*vec[c]; }
    return s;
  }
  function tanh(x){ return Math.tanh(x); }

  const IN=${arch.inDim}, H1=${arch.h1}, H2=${arch.h2}, OUT=${arch.outDim};
  const h1 = new Array(H1);
  for(let i=0;i<H1;i++){ h1[i] = tanh(dotRow(W1, IN, i, X) + b1[i]); }
  const h2 = new Array(H2);
  for(let i=0;i<H2;i++){ h2[i] = tanh(dotRow(W2, H1, i, h1) + b2[i]); }
  const y = new Array(OUT);
  for(let i=0;i<OUT;i++){ y[i] = dotRow(W3, H2, i, h2) + b3[i]; }

  // 각도 변환: y in R -> [0,360)
  function toDeg(v){
    if (!(v===v) || !isFinite(v)) v = 0; // NaN/Infinity 방지
    return angleWrap((v*180/Math.PI));
  }

  const m1 = toDeg(y[0]);
  const m2 = toDeg(y[1]);
  const m3 = toDeg(y[2]);
  const m4 = toDeg(y[3]);
  const fA = toDeg(y[4]);

  // 사격 및 이동 시도 (DNN 출력만 사용)
  tank.fire(fA);
  if(tank.move(m1)) return;
  if(tank.move(m2)) return;
  if(tank.move(m3)) return;
  if(tank.move(m4)) return;
}
`;
  return code;
}

function buildTeamCode(weights, arch) {
  const parts = [];
  for (let i = 0; i < 6; i++) {
    parts.push(buildRobotCode(i, weights, arch));
    if (i !== 5) parts.push('\n\n// ===== 다음 로봇 =====\n\n');
  }
  return parts.join('');
}

module.exports = {
  buildTeamCode,
  chunkWeights,
};

// DNN 기반 탱크 AI 코드 생성기
// - tank_battle_platform.html의 Import 포맷에 맞춘 6개 로봇 코드 문자열 생성
// - update 함수는 DNN 순전파만으로 의사결정(휴리스틱 금지)
// - 타입 고정 순서: dealer, normal, dealer, tanker, dealer, tanker
// - 특징 확장: 각도 sin/cos, 개수/벽거리/탄 접근성 등 추가 (결정은 오직 DNN)

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
  // 출력:
  //  - OUT=5  : [move1, move2, move3, move4, fireAngle] (라디안)
  //  - OUT=10 : [sin(m1),cos(m1), sin(m2),cos(m2), sin(m3),cos(m3), sin(m4),cos(m4), sin(f),cos(f)]

  // 고정 하이퍼파라미터(플랫폼 상수)
  const W=900, H=600; const EMAX=150, SCL=700; const VX=10, VY=10;
  const EN_K=3, AL_K=2, BL_K=3; // 최근접 개수 유지

  // 특징 벡터 구성
  function norm(v, s){ return s ? v/s : v; }
  function angleWrap(a){ a%=360; if(a<0)a+=360; return a; }

  function nearest(arr, k){
    const tmp = arr.map((e)=>({e, d: e.distance!==undefined? e.distance : Math.hypot((e.x||0)-tank.x,(e.y||0)-tank.y)}));
    tmp.sort((a,b)=>a.d-b.d);
    const out=[]; for(let i=0;i<k;i++){ out.push(tmp[i]? tmp[i].e:null); }
    return out;
  }
  function s(x){ return Math.sin(x); }
  function c(x){ return Math.cos(x); }
  function deg2rad(d){ return (d%360)*Math.PI/180; }

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
      const dx = (e.x - tank.x), dy = (e.y - tank.y);
      const ang = Math.atan2(dy, dx);
      xEn.push( norm(dx, W), norm(dy, H), norm(e.health, EMAX), norm(e.distance, SCL), s(ang), c(ang) );
    } else {
      xEn.push(0,0,0,0,0,0);
    }
  }

  const xAl = [];
  for(let i=0;i<AL_K;i++){
    const a = als[i];
    if(a){
      const dx = (a.x - tank.x), dy = (a.y - tank.y);
      const ang = Math.atan2(dy, dx);
      xAl.push( norm(dx, W), norm(dy, H), norm(a.health, EMAX), norm(a.distance, SCL), s(ang), c(ang) );
    } else {
      xAl.push(0,0,0,0,0,0);
    }
  }

  const xBl = [];
  for(let i=0;i<BL_K;i++){
    const b = bls[i];
    if(b){
      const dx = (b.x - tank.x), dy = (b.y - tank.y);
      const sp = Math.hypot(b.vx||0,b.vy||0) || 1;
      const appr = (dx*(b.vx||0) + dy*(b.vy||0)) > 0 ? 1 : 0; // 접근 여부(특징화만, 의사결정 아님)
      xBl.push( norm(dx, W), norm(dy, H), norm(b.vx||0, VX), norm(b.vy||0, VY), norm(b.distance, SCL), norm(sp, 12), appr );
    } else {
      xBl.push(0,0,0,0,0,0,0);
    }
  }

  // 글로벌 컨텍스트 특징: 개수/벽거리
  const counts = [ Math.min(1, enemies.length/6), Math.min(1, allies.length/5), Math.min(1, bulletInfo.length/6) ];
  const walls = [ norm(tank.x, W), norm(W - tank.x, W), norm(tank.y, H), norm(H - tank.y, H) ];

  const X = [].concat(xSelf, xEn, xAl, xBl, counts, walls);

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

  // 각도 변환: 라디안 출력 -> 도(deg)
  function toDegFromRad(v){
    if (!(v===v) || !isFinite(v)) v = 0; // NaN/Infinity 방지
    return angleWrap((v*180/Math.PI));
  }
  function toDegFromSinCos(s,c){
    // atan2(sin,cos) = angle(rad)
    const a = Math.atan2(s, c);
    return angleWrap(a*180/Math.PI);
  }

  let m1, m2, m3, m4, fA;
  if (OUT === 10) {
    m1 = toDegFromSinCos(y[0], y[1]);
    m2 = toDegFromSinCos(y[2], y[3]);
    m3 = toDegFromSinCos(y[4], y[5]);
    m4 = toDegFromSinCos(y[6], y[7]);
    fA = toDegFromSinCos(y[8], y[9]);
  } else {
    m1 = toDegFromRad(y[0]);
    m2 = toDegFromRad(y[1]);
    m3 = toDegFromRad(y[2]);
    m4 = toDegFromRad(y[3]);
    fA = toDegFromRad(y[4]);
  }

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

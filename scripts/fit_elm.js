#!/usr/bin/env node
/* eslint-disable no-console */
// Extreme Learning Machine 기반 각도 회귀
// - 은닉층(W1,b1,W2,b2) 랜덤 고정
// - 출력층(W3,b3) 릿지 회귀로 근사(타겟: 최근접 적에게 조준 각도)

const fs = require('fs');
const path = require('path');
const { Engine, Tank, Type } = require('../simulator/engine');
const { buildTeamCode } = require('../ai/dnn_codegen');

const EN_K = 3, AL_K = 2, BL_K = 3;
const inDim = 8 + EN_K*4 + AL_K*4 + BL_K*5;
const arch = { inDim, h1: 24, h2: 16, outDim: 5 };

function makeRng(seed){ let s=seed>>>0; return ()=>{ s^=s<<13; s^=s>>>17; s^=s<<5; s>>>=0; return (s%0x100000000)/0x100000000; }; }
function randn(r){ let u=0,v=0; while(u===0) u=r(); while(v===0) v=r(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }

function initHidden(rng){
  const { inDim, h1, h2, outDim } = arch;
  const total = inDim*h1 + h1 + h1*h2 + h2 + h2*outDim + outDim;
  const w = new Float64Array(total);
  let idx=0;
  const s1 = Math.sqrt(2/(inDim+h1));
  for(let i=0;i<inDim*h1;i++) w[idx++] = randn(rng)*s1; // W1
  for(let i=0;i<h1;i++) w[idx++] = 0.0; // b1
  const s2 = Math.sqrt(2/(h1+h2));
  for(let i=0;i<h1*h2;i++) w[idx++] = randn(rng)*s2; // W2
  for(let i=0;i<h2;i++) w[idx++] = 0.0; // b2
  // W3,b3 자리 확보(0으로 유지; 이후 학습)
  for(let i=0;i<h2*outDim;i++) w[idx++] = 0.0; // W3
  for(let i=0;i<outDim;i++) w[idx++] = 0.0; // b3
  return w;
}

function chunk(weights){
  const { inDim, h1, h2, outDim } = arch;
  let idx=0;
  const slice = (n)=>weights.slice(idx, (idx+=n));
  const W1=[]; for(let r=0;r<h1;r++) W1.push(slice(inDim));
  const b1=slice(h1);
  const W2=[]; for(let r=0;r<h2;r++) W2.push(slice(h1));
  const b2=slice(h2);
  const W3=[]; for(let r=0;r<outDim;r++) W3.push(slice(h2));
  const b3=slice(outDim);
  return {W1,b1,W2,b2,W3,b3};
}

function featuresOf(tank, enemies, allies, bullets){
  const W=900, H=600, EMAX=150, SCL=700, VX=10, VY=10;
  const norm=(v,s)=> s? v/s : v;
  const nearest=(arr,k)=>{ const tmp = arr.map((e)=>({e, d: e.distance!==undefined? e.distance : Math.hypot((e.x||0)-tank.x,(e.y||0)-tank.y)})); tmp.sort((a,b)=>a.d-b.d); const out=[]; for(let i=0;i<k;i++){ out.push(tmp[i]?tmp[i].e:null); } return out; };

  const xSelf=[ norm(tank.x,W), norm(tank.y,H), norm(tank.health,EMAX), norm(tank.energy,EMAX), norm(tank.size,50), (tank.tankType===0?1:0), (tank.tankType===1?1:0), (tank.tankType===2?1:0) ];
  const ens=nearest(enemies, EN_K), als=nearest(allies, AL_K), bls=nearest(bullets, BL_K);
  const xEn=[]; for(let i=0;i<EN_K;i++){ const e=ens[i]; if(e){ xEn.push(norm(e.x-tank.x,W), norm(e.y-tank.y,H), norm(e.health,EMAX), norm(e.distance,SCL)); } else { xEn.push(0,0,0,0); } }
  const xAl=[]; for(let i=0;i<AL_K;i++){ const a=als[i]; if(a){ xAl.push(norm(a.x-tank.x,W), norm(a.y-tank.y,H), norm(a.health,EMAX), norm(a.distance,SCL)); } else { xAl.push(0,0,0,0); } }
  const xBl=[]; for(let i=0;i<BL_K;i++){ const b=bls[i]; if(b){ xBl.push(norm(b.x-tank.x,W), norm(b.y-tank.y,H), norm(b.vx,VX), norm(b.vy,VY), norm(b.distance,SCL)); } else { xBl.push(0,0,0,0,0); } }
  return Float64Array.from([].concat(xSelf, xEn, xAl, xBl));
}

function tanh(x){ return Math.tanh(x); }
function forwardHidden(X, pars){
  const { W1,b1,W2,b2 } = pars; const H1 = new Float64Array(arch.h1); const H2 = new Float64Array(arch.h2);
  for(let i=0;i<arch.h1;i++){ let s=0; for(let j=0;j<arch.inDim;j++) s+= W1[i][j]*X[j]; H1[i]=tanh(s+b1[i]); }
  for(let i=0;i<arch.h2;i++){ let s=0; for(let j=0;j<arch.h1;j++) s+= W2[i][j]*H1[j]; H2[i]=tanh(s+b2[i]); }
  return H2;
}

function ridgeSolve(H, Y, lambda){
  // H: n x p (p=arch.h2+1 with bias), Y: n x o (o=5)
  const n=H.length, p=H[0].length, o=Y[0].length;
  // Compute A = H^T H + lam I  (p x p)
  const A = Array.from({length:p}, ()=>Array(p).fill(0));
  const B = Array.from({length:p}, ()=>Array(o).fill(0)); // H^T Y
  for(let i=0;i<n;i++){
    const hi=H[i]; const yi=Y[i];
    for(let r=0;r<p;r++){
      for(let c=0;c<p;c++) A[r][c]+= hi[r]*hi[c];
      for(let k=0;k<o;k++) B[r][k]+= hi[r]*yi[k];
    }
  }
  for(let d=0;d<p;d++) A[d][d]+= lambda;
  // Solve for each output dimension via Gauss-Jordan
  const W = Array.from({length:p}, ()=>Array(o).fill(0));
  for(let k=0;k<o;k++){
    // Augmented matrix [A | B[:,k]]
    const M = A.map((row,i)=> row.slice().concat([B[i][k]]));
    // Gauss-Jordan elimination
    for(let col=0; col<p; col++){
      // pivot
      let piv=col;
      for(let r=col+1;r<p;r++) if(Math.abs(M[r][col])>Math.abs(M[piv][col])) piv=r;
      if (Math.abs(M[piv][col])<1e-12) continue;
      if (piv!==col) { const tmp=M[piv]; M[piv]=M[col]; M[col]=tmp; }
      const div = M[col][col];
      for(let c=col;c<=p;c++) M[col][c]/=div;
      for(let r=0;r<p;r++) if(r!==col){ const f=M[r][col]; if(f!==0){ for(let c=col;c<=p;c++) M[r][c]-=f*M[col][c]; } }
    }
    for(let r=0;r<p;r++) W[r][k]=M[r][p];
  }
  return W; // shape p x o
}

async function main(){
  const outPath = path.resolve(__dirname, '..', 'result', 'dnn-ai.txt');
  const rng = makeRng(parseInt(process.env.ELM_SEED || '20250909',10));
  const weights = initHidden(rng);
  const pars = chunk(weights);

  // 데이터 수집
  const samples = [];
  const runs = parseInt(process.env.ELM_RUNS || '8',10);
  const maxTicks = parseInt(process.env.ELM_TICKS || '1200',10);
  for(let r=0;r<runs;r++){
    const eng = new Engine({ seed: r*1234+5678, tickMs: 50, fast: true });
    // 두 기본 팀 배치(움직임/사격으로 다양한 상태 생성)
    const def = fs.readFileSync(path.resolve(__dirname,'..','simulator','ai','default_team.js'),'utf8');
    const { compileTeamFromCode } = require('../simulator/bot_loader');
    const red = compileTeamFromCode(def, 'red', 'secure');
    const blue = compileTeamFromCode(def, 'blue', 'secure');
    const { createEngineWithTeams } = require('../simulator/engine');
    const engine = createEngineWithTeams([...red,...blue], { fast: true });
    // 진행하며 상태 수집
    for(let t=0;t<maxTicks;t++){
      // 한 틱 전/후 스냅샷 비슷하게 구성
      for(const tank of engine.tanks){
        if(!tank.alive) continue;
        // 적/아군/총알 정보 구성(HTML/engine과 동일)
        const enemies = engine.tanks.filter(tt=>tt.team!==tank.team && tt.alive).map(tt=>({
          x: tt.x, y: tt.y, distance: Math.hypot(tt.x-tank.x, tt.y-tank.y), angle: Math.atan2(tt.y-tank.y, tt.x-tank.x)*180/Math.PI, health: tt.health,
        }));
        const allies = engine.tanks.filter(tt=>tt.team===tank.team && tt.alive && tt.id!==tank.id).map(tt=>({
          x: tt.x, y: tt.y, distance: Math.hypot(tt.x-tank.x, tt.y-tank.y), health: tt.health,
        }));
        const bullets = engine.bullets.filter(b=>b.team!==tank.team).map(b=>({
          x: b.x, y: b.y, vx: b.vx, vy: b.vy, distance: Math.hypot(b.x-tank.x, b.y-tank.y),
        }));
        const X = featuresOf(tank, enemies, allies, bullets);
        // 타겟: 최근접 적 조준 각
        let D = 180; // 없으면 정중앙 정도
        if (enemies.length>0){
          let best=enemies[0]; for(const e of enemies){ if(e.distance<best.distance) best=e; }
          D = Math.atan2(best.y-tank.y, best.x-tank.x)*180/Math.PI; if(D<0) D+=360;
        }
        const yRad = (D - 180) * Math.PI/180; // toDeg(y)=D에 맞는 내부 표상
        const Y = [yRad,yRad,yRad,yRad,yRad];
        samples.push({ X, Y });
      }
      engine.step();
    }
  }
  console.log(`collected samples: ${samples.length}`);

  // H 생성 및 릿지 회귀로 출력층 적합
  const H = samples.map(s=>{ const h2=forwardHidden(s.X, pars); return Array.from(h2).concat([1]); }); // bias 포함
  const Y = samples.map(s=> s.Y.slice());
  const lam = parseFloat(process.env.ELM_LAM || '1e-3');
  const W = ridgeSolve(H, Y, lam); // (h2+1) x outDim
  // 분해: 마지막 행이 b3, 앞은 W3^T
  const W3T = W.slice(0, arch.h2);
  const b3v = W[arch.h2];

  // weights에 출력층 반영
  const par2 = chunk(weights);
  for(let o=0;o<arch.outDim;o++){
    for(let j=0;j<arch.h2;j++) par2.W3[o][j] = W3T[j][o];
    par2.b3[o] = b3v[o];
  }

  // 직렬화: par2 -> flat
  const flat=[];
  for(let i=0;i<arch.h1;i++) for(let j=0;j<arch.inDim;j++) flat.push(par2.W1[i][j]);
  for(let i=0;i<arch.h1;i++) flat.push(par2.b1[i]);
  for(let i=0;i<arch.h2;i++) for(let j=0;j<arch.h1;j++) flat.push(par2.W2[i][j]);
  for(let i=0;i<arch.h2;i++) flat.push(par2.b2[i]);
  for(let o=0;o<arch.outDim;o++) for(let j=0;j<arch.h2;j++) flat.push(par2.W3[o][j]);
  for(let o=0;o<arch.outDim;o++) flat.push(par2.b3[o]);

  const code = buildTeamCode(Float64Array.from(flat), arch);
  fs.writeFileSync(outPath, code, 'utf8');
  fs.writeFileSync(path.resolve(__dirname, '..','result','dnn-ai-weights.json'), JSON.stringify({ arch, weights: flat }), 'utf8');
  console.log(`Saved team code -> ${outPath}`);
}

if (require.main === module) {
  main().catch((e)=>{ console.error(e); process.exit(1); });
}


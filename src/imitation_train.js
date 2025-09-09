#!/usr/bin/env node
/*
  레퍼런스 AI의 행동(이동 각, 사격 시도/각)을 모방학습하여
  DNN(MLP: 32-32)을 지도학습으로 초기화합니다.

  - update()에서는 휴리스틱 없이 DNN 추론만 수행
  - 본 스크립트는 레퍼런스 vs 레퍼런스 경기를 돌리며, 각 틱마다 레드팀의 행동을 수집
  - 수집 표본으로 (mvx,mvy, fire, fvx,fvy)를 학습(BCE + MSE)
*/

const fs = require('fs');
const path = require('path');
const { createEngineWithTeams, runMatch } = require('../simulator/engine');
const { compileTeamFromCode } = require('../simulator/bot_loader');
const { genMLPCode } = require('./generate_dnn_team');

function clamp01(v){ return v<0?0:(v>1?1:v); }
function norm(x,a,b){ return (x-a)/(b-a); }

// buildFeatures: generate_dnn_team.js와 동일한 입력을 생성
function buildFeatures(tank, engine){
  const W=900, H=600;
  const self = [
    norm(tank.x,0,W),
    norm(tank.y,0,H),
    clamp01(tank.health/200),
    clamp01(tank.energy/200),
    tank.tankType===0?1:0,
    tank.tankType===1?1:0,
    tank.tankType===2?1:0,
    clamp01(tank.size/60),
  ];
  const me = tank;
  // enemies/allies/bullets 구성은 simulator/engine.js의 executeTankAI 내부 계산과 동일하게 맞춤
  const enemies = engine.tanks.filter(t=>t.team!==me.team && t.alive).map(t=>({
    x:t.x, y:t.y, distance: Math.hypot(t.x-me.x,t.y-me.y),
    angle: Math.atan2(t.y-me.y, t.x-me.x)*180/Math.PI, health: t.health,
  }));
  const allies = engine.tanks.filter(t=>t.team===me.team && t.alive && t.id!==me.id).map(t=>({
    x:t.x, y:t.y, distance: Math.hypot(t.x-me.x,t.y-me.y), health: t.health,
  }));
  const bulletInfo = engine.bullets.filter(b=>b.team!==me.team).map(b=>({
    x:b.x, y:b.y, vx:b.vx, vy:b.vy, distance: Math.hypot(b.x-me.x,b.y-me.y)
  }));

  function topK(arr, k){ return arr.slice().sort((a,b)=> (a.distance||1e9)-(b.distance||1e9)).slice(0,k); }
  const KE=4, KA=3, KB=5;
  const es = topK(enemies, KE);
  const as = topK(allies, KA);
  const bs = topK(bulletInfo, KB);

  const ef=[]; for(let i=0;i<KE;i++){ const e=es[i]; if(e){ const dx=e.x-me.x, dy=e.y-me.y; const ang=Math.atan2(dy,dx)/Math.PI; ef.push(clamp01(Math.hypot(dx,dy)/1100), clamp01(dx/900+0.5), clamp01(dy/600+0.5), ang, clamp01(e.health/200)); } else ef.push(0,0,0,0,0); }
  const af=[]; for(let i=0;i<KA;i++){ const a=as[i]; if(a){ const dx=a.x-me.x, dy=a.y-me.y; const ang=Math.atan2(dy,dx)/Math.PI; af.push(clamp01(Math.hypot(dx,dy)/1100), clamp01(dx/900+0.5), clamp01(dy/600+0.5), ang, clamp01(a.health/200)); } else af.push(0,0,0,0,0); }
  const bf=[]; for(let i=0;i<KB;i++){ const b=bs[i]; if(b){ const dx=b.x-me.x, dy=b.y-me.y; const ang=Math.atan2(dy,dx)/Math.PI; bf.push(clamp01(Math.hypot(dx,dy)/1100), clamp01(dx/900+0.5), clamp01(dy/600+0.5), ang, clamp01((b.vx+8)/16), clamp01((b.vy+8)/16)); } else bf.push(0,0,0,0,0,0); }

  const stats=[ clamp01(enemies.length/6), clamp01(allies.length/5), clamp01(bulletInfo.length/10) ];
  const x = self.concat(ef,af,bf,stats);
  while(x.length<76) x.push(0);
  if(x.length>76) x.length=76;
  return x;
}

// 간단한 MLP + Adam 구현
function createMLP(input, h1, h2, out){
  function randn(){ let u=0,v=0; while(u===0) u=Math.random(); while(v===0) v=Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
  const W1 = Array.from({length:h1*input},()=>randn()*0.1);
  const B1 = Array.from({length:h1},()=>0);
  const W2 = Array.from({length:h2*h1},()=>randn()*0.1);
  const B2 = Array.from({length:h2},()=>0);
  const W3 = Array.from({length:out*h2},()=>randn()*0.1);
  const B3 = Array.from({length:out},()=>0);

  // Adam 상태
  function zeros(n){ return new Array(n).fill(0); }
  const M = { W1: zeros(W1.length), B1: zeros(B1.length), W2: zeros(W2.length), B2: zeros(B2.length), W3: zeros(W3.length), B3: zeros(B3.length) };
  const V = { W1: zeros(W1.length), B1: zeros(B1.length), W2: zeros(W2.length), B2: zeros(B2.length), W3: zeros(W3.length), B3: zeros(B3.length) };
  let t=0;

  function relu(x){ return x>0?x:0; }
  function d_relu(x){ return x>0?1:0; }
  function tanh(x){ const e1=Math.exp(x), e2=Math.exp(-x); return (e1-e2)/(e1+e2); }
  function d_tanh(y){ return 1 - y*y; } // y = tanh(x)
  function sigmoid(x){ return 1/(1+Math.exp(-x)); }

  function forward(x){
    const h1 = new Array(h1_).fill(0); // preact
    for(let i=0;i<h1_;i++){
      let s=B1[i];
      for(let j=0;j<input_;j++) s += W1[i*input_+j]*x[j];
      h1[i]=s;
    }
    const a1 = h1.map(relu);
    const h2 = new Array(h2_).fill(0);
    for(let i=0;i<h2_;i++){
      let s=B2[i];
      for(let j=0;j<h1_;j++) s += W2[i*h1_+j]*a1[j];
      h2[i]=s;
    }
    const a2 = h2.map(relu);
    const o = new Array(out_).fill(0);
    for(let i=0;i<out_;i++){
      let s=B3[i];
      for(let j=0;j<h2_;j++) s += W3[i*h2_+j]*a2[j];
      o[i]=s;
    }
    // post (9 outputs)
    const mv1x = tanh(o[0]);
    const mv1y = tanh(o[1]);
    const mv2x = tanh(o[2]);
    const mv2y = tanh(o[3]);
    const fx   = tanh(o[4]);
    const fy   = tanh(o[5]);
    const fp   = sigmoid(o[6]);
    const mv3x = tanh(o[7]);
    const mv3y = tanh(o[8]);
    return { h1, a1, h2, a2, o, mv1x, mv1y, mv2x, mv2y, mv3x, mv3y, fx, fy, fp };
  }

  function backward(x, cache, target){
    // target = { mv1x,mv1y, mv2x,mv2y, fire:0/1, fx, fy, mv3x,mv3y }
    const { h1, a1, h2, a2, o, mv1x, mv1y, mv2x, mv2y, mv3x, mv3y, fx, fy, fp } = cache;
    const { mv1x:tm1x, mv1y:tm1y, mv2x:tm2x, mv2y:tm2y, mv3x:tm3x, mv3y:tm3y, fire:tf, fx:tfx, fy:tfy } = target;
    // losses
    const dmv1x = 2*(mv1x - tm1x) * d_tanh(mv1x);
    const dmv1y = 2*(mv1y - tm1y) * d_tanh(mv1y);
    const dmv2x = 2*(mv2x - tm2x) * d_tanh(mv2x);
    const dmv2y = 2*(mv2y - tm2y) * d_tanh(mv2y);
    const df_x  = tf>0.5 ? 2*(fx - tfx) * d_tanh(fx) : 0;
    const df_y  = tf>0.5 ? 2*(fy - tfy) * d_tanh(fy) : 0;
    const df_p  = (fp - tf);
    const dmv3x = 2*(mv3x - tm3x) * d_tanh(mv3x);
    const dmv3y = 2*(mv3y - tm3y) * d_tanh(mv3y);
    const dO = [dmv1x, dmv1y, dmv2x, dmv2y, df_x, df_y, df_p, dmv3x, dmv3y];

    // dW3, dB3
    const gW3 = new Array(W3.length).fill(0);
    const gB3 = dO.slice();
    for(let i=0;i<out_;i++){
      for(let j=0;j<h2_;j++) gW3[i*h2_+j] += dO[i]*a2[j];
    }
    // back to a2
    const da2 = new Array(h2_).fill(0);
    for(let j=0;j<h2_;j++){
      let s=0; for(let i=0;i<out_;i++) s += W3[i*h2_+j]*dO[i];
      da2[j]=s * d_relu(h2[j]);
    }
    // dW2, dB2
    const gW2 = new Array(W2.length).fill(0);
    const gB2 = new Array(B2.length).fill(0);
    for(let i=0;i<h2_;i++){
      gB2[i] += da2[i];
      for(let j=0;j<h1_;j++) gW2[i*h1_+j] += da2[i]*a1[j];
    }
    // back to a1
    const da1 = new Array(h1_).fill(0);
    for(let j=0;j<h1_;j++){
      let s=0; for(let i=0;i<h2_;i++) s += W2[i*h1_+j]*da2[i];
      da1[j]=s * d_relu(h1[j]);
    }
    // dW1, dB1
    const gW1 = new Array(W1.length).fill(0);
    const gB1 = new Array(B1.length).fill(0);
    for(let i=0;i<h1_;i++){
      gB1[i] += da1[i];
      for(let j=0;j<input_;j++) gW1[i*input_+j] += da1[i]*x[j];
    }
    return { gW1, gB1, gW2, gB2, gW3, gB3 };
  }

  function adamUpdate(params, grads, lr=0.001, beta1=0.9, beta2=0.999, eps=1e-8){
    t++;
    for(const k of Object.keys(params)){
      const p = params[k], g = grads['g'+k];
      const m = M[k], v = V[k];
      for(let i=0;i<p.length;i++){
        m[i] = beta1*m[i] + (1-beta1)*g[i];
        v[i] = beta2*v[i] + (1-beta2)*g[i]*g[i];
        const mhat = m[i]/(1-Math.pow(beta1,t));
        const vhat = v[i]/(1-Math.pow(beta2,t));
        p[i] -= lr * mhat / (Math.sqrt(vhat)+eps);
      }
    }
  }

  const input_ = input, h1_ = h1, h2_ = h2, out_ = out;
  const params = { W1, B1, W2, B2, W3, B3 };
  return { params, forward, backward, adamUpdate };
}

function toAngles(a){ // deg→unit vector
  const rad = (a*Math.PI)/180; return [Math.cos(rad), Math.sin(rad)];
}

async function main(){
  // 수집 설정
  const maxMatches = 8;
  const maxTicks = 1500;
  const fast = true;
  const startSeed = 4242;
  const ref = fs.readFileSync(path.resolve('result/reference-ai.txt'), 'utf8');
  const red = compileTeamFromCode(ref, 'red', 'secure');
  const blue = compileTeamFromCode(ref, 'blue', 'secure');
  const players = [...red, ...blue];

  const samples = [];
  for(let m=0;m<maxMatches;m++){
    const engine = createEngineWithTeams(players, { seed: startSeed + m, fast });
    let actions = {};
    engine.actionHook = (tank, kind, angle, ok, nowMs) => {
      if (tank.team !== 'red') return; // 레드팀만 수집
      const e = actions[tank.id] || (actions[tank.id] = { moveAttempt: null, moveOk: null, fire: null });
      if (kind==='move'){
        if (e.moveAttempt===null) e.moveAttempt = angle; // 첫 시도 각
        if (ok && e.moveOk===null) e.moveOk = angle;     // 첫 성공 각
      }
      if (kind==='fire' && e.fire===null) e.fire = angle; // 첫 사격 시도 각
      };
    for(let t=0;t<maxTicks;t++){
      actions = {}; // 틱 단위 초기화
      engine.step();
      // 각 레드 탱크에 대해 피처/타겟 수집
      for(const tank of engine.tanks){
        if(tank.team!=='red' || !tank.alive) continue;
        const a = actions[tank.id];
        if(!a) continue; // 행동이 없으면 스킵
        const x = buildFeatures(tank, engine);
        const chosenMove = (a.moveOk!=null ? a.moveOk : a.moveAttempt);
        const [mv1x, mv1y] = a.moveAttempt!=null ? toAngles(a.moveAttempt) : [0,0];
        const [mv2x, mv2y] = chosenMove!=null ? toAngles(chosenMove) : [0,0];
        const [mv3x, mv3y] = [0,0];
        const fired = a.fire!=null ? 1 : 0;
        const [fx, fy] = a.fire!=null ? toAngles(a.fire) : [0,0];
        samples.push({ x, mv1x, mv1y, mv2x, mv2y, mv3x, mv3y, fired, fx, fy });
      }
      const { redAlive, blueAlive } = engine.getTeamStats();
      if ((redAlive===0 && blueAlive>0) || (blueAlive===0 && redAlive>0)) break;
    }
  }
  console.log(`[collect] samples: ${samples.length}`);

  // 학습 설정
  const inputSize = 76, h1=64, h2=64, out=5;
  const net = createMLP(inputSize, h1, h2, out);
  const { params, forward, backward, adamUpdate } = net;

  function randInt(n){ return Math.floor(Math.random()*n); }
  const epochs = 3;
  const batchSize = 128;
  const lr = 0.003;

  for(let ep=0; ep<epochs; ep++){
    let totalLoss=0, count=0;
    for(let it=0; it<Math.ceil(samples.length/batchSize); it++){
      const grads = { gW1: new Array(params.W1.length).fill(0), gB1: new Array(params.B1.length).fill(0), gW2: new Array(params.W2.length).fill(0), gB2: new Array(params.B2.length).fill(0), gW3: new Array(params.W3.length).fill(0), gB3: new Array(params.B3.length).fill(0) };
      let loss=0;
      for(let k=0;k<batchSize;k++){
        const s = samples[randInt(samples.length)]; if(!s) continue;
        const c = forward(s.x);
        const tm1x=s.mv1x, tm1y=s.mv1y, tm2x=s.mv2x, tm2y=s.mv2y, tm3x=s.mv3x, tm3y=s.mv3y, tf=s.fired, tfx=s.fx, tfy=s.fy;
        // 손실 계산
        const mvLoss = (c.mv1x-tm1x)*(c.mv1x-tm1x) + (c.mv1y-tm1y)*(c.mv1y-tm1y)
                     + (c.mv2x-tm2x)*(c.mv2x-tm2x) + (c.mv2y-tm2y)*(c.mv2y-tm2y)
                     + (c.mv3x-tm3x)*(c.mv3x-tm3x) + (c.mv3y-tm3y)*(c.mv3y-tm3y);
        const fdirLoss = tf>0.5 ? (c.fx-tfx)*(c.fx-tfx) + (c.fy-tfy)*(c.fy-tfy) : 0;
        const p = c.fp, y=tf; const fprobLoss = -(y*Math.log(p+1e-9)+(1-y)*Math.log(1-p+1e-9));
        loss += mvLoss + fdirLoss + fprobLoss;
        const g = backward(s.x, c, { mv1x:tm1x, mv1y:tm1y, mv2x:tm2x, mv2y:tm2y, mv3x:tm3x, mv3y:tm3y, fire:tf, fx:tfx, fy:tfy });
        // 누적
        for(let i=0;i<grads.gW1.length;i++) grads.gW1[i]+=g.gW1[i];
        for(let i=0;i<grads.gB1.length;i++) grads.gB1[i]+=g.gB1[i];
        for(let i=0;i<grads.gW2.length;i++) grads.gW2[i]+=g.gW2[i];
        for(let i=0;i<grads.gB2.length;i++) grads.gB2[i]+=g.gB2[i];
        for(let i=0;i<grads.gW3.length;i++) grads.gW3[i]+=g.gW3[i];
        for(let i=0;i<grads.gB3.length;i++) grads.gB3[i]+=g.gB3[i];
      }
      // 평균화 후 업데이트
      for(const kk of Object.keys(grads)){
        const arr = grads[kk]; for(let i=0;i<arr.length;i++) arr[i] /= Math.max(1,batchSize);
      }
      adamUpdate(params, grads, lr);
      totalLoss += loss/Math.max(1,batchSize); count++;
    }
    console.log(`[train] epoch ${ep+1}/${epochs} loss=${(totalLoss/Math.max(1,count)).toFixed(4)}`);
  }

  // 코드/가중치 저장
  const weights = [];
  weights.push(...params.W1, ...params.B1, ...params.W2, ...params.B2, ...params.W3, ...params.B3);
  const code = genMLPCode({ inputSize, hiddenSizes:[h1,h2], outputSize:9, weights: Float64Array.from(weights) });
  const outPath = path.resolve('result/ai_dnn_team.txt');
  fs.writeFileSync(outPath, code, 'utf8');
  fs.writeFileSync(path.resolve('result/ai_dnn_weights.json'), JSON.stringify({ inputSize, hiddenSizes:[h1,h2], outputSize:9, weights: Array.from(weights) }), 'utf8');
  console.log(`[save] ${outPath} 갱신 (imitation)`);
}

if(require.main===module){
  main().catch(e=>{ console.error(e); process.exit(1); });
}

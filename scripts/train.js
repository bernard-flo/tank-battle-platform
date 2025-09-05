#!/usr/bin/env node
/*
Genetic/evolutionary search to train 6 neural network tank policies.
Outputs an importable bundle to result/ai.txt compatible with tank_battle_platform.html

Design:
- One shared architecture (D->H->O). Three role templates: TANKER, DEALER, NORMAL
- 6 bots composition: [TANKER, TANKER, DEALER, DEALER, DEALER, NORMAL]
- Fitness: wins vs baseline over multiple random seeds
- Evolution: (mu+lambda) with Gaussian mutation around elites
*/
const fs = require('fs');
const path = require('path');
const { simulateMatch, Type } = require('./sim/engine');

function nowISO(){ return new Date().toISOString().replace(/[:]/g,'-'); }

// Architecture
const D = 16;     // input features
const H = 6;      // hidden units
const O = 5;      // outputs: [wEvade, wAttack, wOrbit, wWall, aimLead]

function randN(rng){ // Box-Muller
  let u=0,v=0; while(u===0) u=rng(); while(v===0) v=rng();
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
}

function seedRandom(seed){
  let s = (seed>>>0)||1;
  return () => (s = (s*1664525 + 1013904223)>>>0) / 0x100000000;
}

function zeros(rows, cols){ return Array.from({length: rows}, ()=>Array(cols).fill(0)); }
function randMat(rows, cols, rng, scale=0.5){
  return Array.from({length: rows}, ()=>Array.from({length: cols}, ()=>randN(rng)*scale));
}
function randVec(n, rng, scale=0.5){ return Array.from({length:n}, ()=>randN(rng)*scale); }

function flattenParams(model){
  const {W1,b1,W2,b2} = model;
  return [...W1.flat(), ...b1, ...W2.flat(), ...b2];
}
function unflattenParams(vec){
  let i=0;
  const W1 = Array.from({length:H}, ()=>Array.from({length:D}, ()=>vec[i++]));
  const b1 = Array.from({length:H}, ()=>vec[i++]);
  const W2 = Array.from({length:O}, ()=>Array.from({length:H}, ()=>vec[i++]));
  const b2 = Array.from({length:O}, ()=>vec[i++]);
  return { W1, b1, W2, b2 };
}

function initModel(rng){
  return { W1: randMat(H,D,rng,0.4), b1: randVec(H,rng,0.1), W2: randMat(O,H,rng,0.4), b2: randVec(O,rng,0.1) };
}

function mutate(vec, rng, sigma){
  const out = vec.slice();
  for (let i=0;i<out.length;i++) out[i] += randN(rng)*sigma;
  return out;
}

function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

function codeForModel(name, type, model){
  const { W1,b1,W2,b2 } = model;
  const js = `function name(){return '${name}';}\nfunction type(){return ${type};}\nfunction update(tank,enemies,allies,bulletInfo){\n  function ang(a){return (a+360)%360;} function deg(x,y){return Math.atan2(y,x)*180/Math.PI;}\n  function mlp(x,W1,b1,W2,b2){const h=b1.map((bi,j)=>Math.tanh(bi+x.reduce((s,xi,i)=>s+xi*W1[j][i],0)));return b2.map((bo,k)=>bo+h.reduce((s,hj,j)=>s+hj*W2[k][j],0));}\n  const W=900,H=600;\n  // Features: pos, health, type, nearest enemy, enemy centroid, ally centroid, bullet threat, wall pressure\n  let nx=null, nd=1e9, ex=0,ey=0; for(const e of enemies){ if(e.distance<nd){nd=e.distance; nx=e;} ex+=e.x; ey+=e.y; }\n  const ecx=(ex/Math.max(1,enemies.length)||tank.x)-tank.x, ecy=(ey/Math.max(1,enemies.length)||tank.y)-tank.y; const ecd=Math.hypot(ecx,ecy)+1e-6;\n  let ax=0,ay=0; for(const a of allies){ax+=a.x; ay+=a.y;} ax/=Math.max(1,allies.length); ay/=Math.max(1,allies.length); const acx=(ax||tank.x)-tank.x, acy=(ay||tank.y)-tank.y; const acd=Math.hypot(acx,acy)+1e-6;\n  let evx=0,evy=0,th=0; for(const b of bulletInfo){ const rx=b.x-tank.x, ry=b.y-tank.y; const d=Math.hypot(rx,ry)+1e-6; const bv=Math.hypot(b.vx,b.vy)+1e-6; const ux=b.vx/bv, uy=b.vy/bv; const closing=-(rx*ux+ry*uy)/d; if(closing>0){ const px=-uy, py=ux; const w=closing/(1+0.07*d); evx+=px*w; evy+=py*w; th+=w; }} const en=Math.hypot(evx,evy)+1e-6; evx/=en; evy/=en;\n  let wx=0,wy=0; const m=60; if(tank.x<m) wx+=1- tank.x/m; if(W-tank.x<m) wx-=1- (W-tank.x)/m; if(tank.y<m) wy+=1- tank.y/m; if(H-tank.y<m) wy-=1- (H-tank.y)/m; const wn=Math.hypot(wx,wy)+1e-6; wx/=wn; wy/=wn;\n  const t0 = tank.type===0?1:0, t1=tank.type===1?1:0, t2=tank.type===2?1:0;\n  const inVec=[ tank.x/W*2-1, tank.y/H*2-1, Math.tanh(tank.health/150), t0,t1,t2, Math.tanh(nd/400), (nx?((nx.x-tank.x)/Math.max(1,nd)):0), (nx?((nx.y-tank.y)/Math.max(1,nd)):0), ecx/ecd, ecy/ecd, acx/acd, acy/acd, Math.tanh(th), wx, wy ];\n  const W1=${JSON.stringify(W1)}; const b1=${JSON.stringify(b1)}; const W2=${JSON.stringify(W2)}; const b2=${JSON.stringify(b2)};\n  const o=mlp(inVec,W1,b1,W2,b2); let wEv=Math.max(0,o[0]), wAt=Math.max(0,o[1]), wOb=Math.max(0,o[2]), wWall=Math.max(0,o[3]); const s=wEv+wAt+wOb+wWall+1e-6; wEv/=s; wAt/=s; wOb/=s; wWall/=s; const aimLead=o[4];\n  const atx = (nx?((nx.x-tank.x)/Math.max(1e-6,nd)): (ecx/ecd)), aty=(nx?((nx.y-tank.y)/Math.max(1e-6,nd)):(ecy/ecd)); const obx=-aty, oby=atx;\n  const mvx=evx*wEv + atx*wAt + obx*wOb + wx*wWall, mvy=evy*wEv + aty*wAt + oby*wOb + wy*wWall; const mvAng=deg(mvx,mvy);\n  if(nx){ const aim=deg(nx.x-tank.x, nx.y-tank.y); const lead=clamp(aimLead, -12, 16); tank.fire(ang(aim+lead)); }\n  if(!tank.move(ang(mvAng))){ if(!tank.move(ang(mvAng+70))){ if(!tank.move(ang(mvAng-70))){ tank.move(Math.random()*360); }}}\n}`;
  return js;
}

function bundleFromModels(models){
  // Composition: 2 TANKER, 3 DEALER, 1 NORMAL
  const names = ['Atlas','Bulwark','Viper','Falcon','Raptor','Sage'];
  const roles = [Type.TANKER, Type.TANKER, Type.DEALER, Type.DEALER, Type.DEALER, Type.NORMAL];
  const blocks = [];
  for (let i=0;i<6;i++){
    const model = models[ roles[i] ];
    const code = codeForModel(`${names[i]}`, `Type.${roles[i]===Type.TANKER?'TANKER':roles[i]===Type.DEALER?'DEALER':'NORMAL'}`, model);
    blocks.push(code);
  }
  return blocks.join("\n\n// ===== 다음 로봇 =====\n\n");
}

function evaluate(models, seeds){
  const bundle = bundleFromModels(models);
  let wins = 0, draws = 0; let ticks=0;
  for(const seed of seeds){
    const r = simulateMatch(bundle, '', { seed, maxTicks: 1200 });
    if (r.winner==='red') wins++; else if (r.winner==='draw') draws++;
    ticks += r.tick;
  }
  return { score: wins + draws*0.3, wins, draws, avgTick: ticks/seeds.length, bundle };
}

function train(){
  const rng = seedRandom(12345);
  const seedsList = Array.from({length: 10}, (_,i)=> 2000+i);
  const POP = 12; const ELITE = 4; const GENS = parseInt(process.env.GENS||'6',10); const SIGMA0=0.25;

  // Initialize role models
  const base = {
    [Type.TANKER]: initModel(rng),
    [Type.DEALER]: initModel(rng),
    [Type.NORMAL]: initModel(rng),
  };

  let elite = [base];
  let best = evaluate(base, seedsList);

  const logDir = path.resolve(__dirname, '../..', '.agent/log');
  fs.mkdirSync(logDir, { recursive: true });

  for (let gen=0; gen<GENS; gen++){
    const cand = [];
    // produce population by mutating around current elite[0]
    const sigma = SIGMA0 * Math.max(0.2, 1 - gen/GENS);
    while (cand.length < POP){
      const parent = elite[Math.min(elite.length-1, Math.floor(rng()*elite.length))];
      const child = {};
      for (const role of [Type.TANKER, Type.DEALER, Type.NORMAL]){
        const v = flattenParams(parent[role]);
        child[role] = unflattenParams(mutate(v, rng, sigma));
      }
      cand.push(child);
    }
    // evaluate
    const scored = cand.map(m => ({ m, ev: evaluate(m, seedsList) }))
                      .sort((a,b)=> b.ev.score - a.ev.score);
    elite = scored.slice(0, ELITE).map(s=>s.m);
    if (scored[0].ev.score > best.score){ best = scored[0].ev; }
    const summary = {
      gen, sigma: Number(sigma.toFixed(4)), bestScore: best.score, topGenScore: scored[0].ev.score,
      top: { wins: scored[0].ev.wins, draws: scored[0].ev.draws, avgTick: Number(scored[0].ev.avgTick.toFixed(1)) }
    };
    console.log('[train]', summary);
    fs.writeFileSync(path.join(logDir, `${nowISO()}-train-gen-${gen}.json`), JSON.stringify(summary, null, 2));
  }

  // Persist best bundle
  fs.mkdirSync(path.resolve(__dirname, '../..', 'result'), { recursive: true });
  fs.writeFileSync(path.resolve(__dirname, '../..', 'result/ai.txt'), best.bundle);
  fs.writeFileSync(path.join(logDir, `${nowISO()}-final-summary.json`), JSON.stringify({ score: best.score, wins: best.wins, draws: best.draws, avgTick: Number(best.avgTick.toFixed(1)) }, null, 2));
}

if (require.main === module){
  train();
}


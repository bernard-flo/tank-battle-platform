#!/usr/bin/env node
/*
  Evolutionary training with role assignment search.
  - Optimizes three role models (NORMAL/TANKER/DEALER) and a 6-slot role array.
  - Outputs importable bundle to result/ai.txt compatible with tank_battle_platform.html
*/
const fs = require('fs');
const path = require('path');
const { simulateMatch, Type } = require('./sim/engine');

function nowISO(){ return new Date().toISOString().replace(/[:]/g,'-'); }
function seedRandom(seed){ let s=(seed>>>0)||1; return ()=> (s=(s*1664525+1013904223)>>>0)/0x100000000; }
function randN(r){ let u=0,v=0; while(u===0) u=r(); while(v===0) v=r(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }

const D=16,H=6,O=5; // inputs, hidden, outputs
function randMat(r,c,rng,s=0.4){ return Array.from({length:r},()=>Array.from({length:c},()=>randN(rng)*s)); }
function randVec(n,rng,s=0.1){ return Array.from({length:n},()=>randN(rng)*s); }
function flatten(m){ const {W1,b1,W2,b2}=m; return [...W1.flat(),...b1,...W2.flat(),...b2]; }
function unflatten(v){ let i=0; const W1=Array.from({length:H},()=>Array.from({length:D},()=>v[i++])); const b1=Array.from({length:H},()=>v[i++]); const W2=Array.from({length:O},()=>Array.from({length:H},()=>v[i++])); const b2=Array.from({length:O},()=>v[i++]); return {W1,b1,W2,b2}; }
function initModel(rng){ return { W1:randMat(H,D,rng), b1:randVec(H,rng), W2:randMat(O,H,rng), b2:randVec(O,rng) }; }
function mutateVec(v,rng,sigma){ return v.map(x=>x+randN(rng)*sigma); }

function codeForModel(name, typeExpr, m){
  const {W1,b1,W2,b2}=m;
  return `function name(){return '${name}';}\nfunction type(){return ${typeExpr};}\nfunction update(tank,enemies,allies,bulletInfo){\n  function ang(a){return (a+360)%360;} function deg(x,y){return Math.atan2(y,x)*180/Math.PI;} function clamp(v,a,b){return Math.max(a,Math.min(b,v));}\n  function mlp(x,W1,b1,W2,b2){const h=b1.map((bi,j)=>Math.tanh(bi+x.reduce((s,xi,i)=>s+xi*W1[j][i],0)));return b2.map((bo,k)=>bo+h.reduce((s,hj,j)=>s+hj*W2[k][j],0));}\n  const W=900,H=600;\n  let nx=null, nd=1e9, ex=0,ey=0; for(const e of enemies){ if(e.distance<nd){nd=e.distance; nx=e;} ex+=e.x; ey+=e.y; }\n  const ecx=(ex/Math.max(1,enemies.length)||tank.x)-tank.x, ecy=(ey/Math.max(1,enemies.length)||tank.y)-tank.y; const ecd=Math.hypot(ecx,ecy)+1e-6;\n  let ax=0,ay=0; for(const a of allies){ax+=a.x; ay+=a.y;} ax/=Math.max(1,allies.length); ay/=Math.max(1,allies.length); const acx=(ax||tank.x)-tank.x, acy=(ay||tank.y)-tank.y; const acd=Math.hypot(acx,acy)+1e-6;\n  let evx=0,evy=0,th=0; for(const b of bulletInfo){ const rx=b.x-tank.x, ry=b.y-tank.y; const d=Math.hypot(rx,ry)+1e-6; const bv=Math.hypot(b.vx,b.vy)+1e-6; const ux=b.vx/bv, uy=b.vy/bv; const closing=-(rx*ux+ry*uy)/d; if(closing>0){ const px=-uy, py=ux; const w=closing/(1+0.07*d); evx+=px*w; evy+=py*w; th+=w; }} const en=Math.hypot(evx,evy)+1e-6; evx/=en; evy/=en;\n  let wx=0,wy=0; const m=60; if(tank.x<m) wx+=1- tank.x/m; if(W-tank.x<m) wx-=1- (W-tank.x)/m; if(tank.y<m) wy+=1- tank.y/m; if(H-tank.y<m) wy-=1- (H-tank.y)/m; const wn=Math.hypot(wx,wy)+1e-6; wx/=wn; wy/=wn;\n  const t0 = tank.type===0?1:0, t1=tank.type===1?1:0, t2=tank.type===2?1:0;\n  const inVec=[ tank.x/W*2-1, tank.y/H*2-1, Math.tanh(tank.health/150), t0,t1,t2, Math.tanh(nd/400), (nx?((nx.x-tank.x)/Math.max(1,nd)):0), (nx?((nx.y-tank.y)/Math.max(1,nd)):0), ecx/ecd, ecy/ecd, acx/acd, acy/acd, Math.tanh(th), wx, wy ];\n  const W1=${JSON.stringify(W1)}; const b1=${JSON.stringify(b1)}; const W2=${JSON.stringify(W2)}; const b2=${JSON.stringify(b2)};\n  const o=mlp(inVec,W1,b1,W2,b2); let wEv=Math.max(0,o[0]), wAt=Math.max(0,o[1]), wOb=Math.max(0,o[2]), wWall=Math.max(0,o[3]); const s=wEv+wAt+wOb+wWall+1e-6; wEv/=s; wAt/=s; wOb/=s; wWall/=s; const aimLead=o[4];\n  const atx = (nx?((nx.x-tank.x)/Math.max(1e-6,nd)): (ecx/ecd)), aty=(nx?((nx.y-tank.y)/Math.max(1e-6,nd)):(ecy/ecd)); const obx=-aty, oby=atx;\n  const mvx=evx*wEv + atx*wAt + obx*wOb + wx*wWall, mvy=evy*wEv + aty*wAt + oby*wOb + wy*wWall; const mvAng=deg(mvx,mvy);\n  if(nx){ const aim=deg(nx.x-tank.x, nx.y-tank.y); const lead=Math.max(-12,Math.min(16,aimLead)); tank.fire(ang(aim+lead)); }\n  if(!tank.move(ang(mvAng))){ if(!tank.move(ang(mvAng+70))){ if(!tank.move(ang(mvAng-70))){ tank.move(Math.random()*360); }}}\n}`;
}

const ROLE_NAMES=['Atlas','Bulwark','Viper','Falcon','Raptor','Sage'];

function bundleFromGenome(genome){
  const { models, roles } = genome; // roles: array of 6 Type values
  const blocks = [];
  for(let i=0;i<6;i++){
    const type = roles[i];
    const typeExpr = type===Type.TANKER?'Type.TANKER': type===Type.DEALER?'Type.DEALER':'Type.NORMAL';
    blocks.push(codeForModel(ROLE_NAMES[i], typeExpr, models[type]));
  }
  return blocks.join("\n\n// ===== 다음 로봇 =====\n\n");
}

function randomRoles(rng){
  // Start with 2 tankers, 3 dealers, 1 normal by default, then shuffle
  const base=[Type.TANKER,Type.TANKER,Type.DEALER,Type.DEALER,Type.DEALER,Type.NORMAL];
  for(let i=base.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); const t=base[i]; base[i]=base[j]; base[j]=t; }
  return base;
}

function initGenome(rng){
  return {
    models: { [Type.TANKER]:initModel(rng), [Type.DEALER]:initModel(rng), [Type.NORMAL]:initModel(rng) },
    roles: randomRoles(rng)
  };
}

function cloneGenome(g){
  return {
    models: {
      [Type.TANKER]: JSON.parse(JSON.stringify(g.models[Type.TANKER])),
      [Type.DEALER]: JSON.parse(JSON.stringify(g.models[Type.DEALER])),
      [Type.NORMAL]: JSON.parse(JSON.stringify(g.models[Type.NORMAL]))
    },
    roles: g.roles.slice()
  };
}

function mutateGenome(g, rng, sigmaW=0.2, roleSwapProb=0.2){
  const out = cloneGenome(g);
  // mutate weights
  for(const role of [Type.TANKER,Type.DEALER,Type.NORMAL]){
    const flat = flatten(out.models[role]);
    const mut = mutateVec(flat, rng, sigmaW);
    out.models[role] = unflatten(mut);
  }
  // mutate roles by swapping slots
  if(rng() < roleSwapProb){
    const i = Math.floor(rng()*6), j = Math.floor(rng()*6);
    const t = out.roles[i]; out.roles[i]=out.roles[j]; out.roles[j]=t;
  }
  // random flip of one slot to neighboring type with small prob
  if(rng()<0.1){
    const i=Math.floor(rng()*6);
    const cur=out.roles[i];
    const choices=[Type.NORMAL,Type.TANKER,Type.DEALER].filter(t=>t!==cur);
    out.roles[i]=choices[Math.floor(rng()*choices.length)];
  }
  return out;
}

function evaluate(genome, seeds){
  const bundle=bundleFromGenome(genome);
  let wins=0, draws=0, ticks=0;
  for(const seed of seeds){ const r=simulateMatch(bundle,'',{seed,maxTicks:1200}); if(r.winner==='red') wins++; else if(r.winner==='draw') draws++; ticks+=r.tick; }
  return { score: wins + draws*0.3, wins, draws, avgTick: ticks/seeds.length, bundle };
}

function train(){
  const rng=seedRandom(123);
  const seeds=Array.from({length:12},(_,i)=>2000+i);
  const POP=20, ELITE=5, GENS=parseInt(process.env.GENS||'16',10);
  const SIGMA0=0.25;
  let base=initGenome(rng);
  let best={ ev:evaluate(base,seeds), g:base };
  let elites=[base];
  const logDir=path.resolve(__dirname,'../..','.agent/log'); fs.mkdirSync(logDir,{recursive:true});
  for(let gen=0; gen<GENS; gen++){
    const sigma=Math.max(0.08, SIGMA0*(1 - gen/GENS));
    const pop=[];
    while(pop.length<POP){
      const parent=elites[Math.min(elites.length-1, Math.floor(rng()*elites.length))];
      pop.push(mutateGenome(parent, rng, sigma, 0.25));
    }
    const scored=pop.map(g=>({ g, ev:evaluate(g, seeds) })).sort((a,b)=>b.ev.score-a.ev.score || a.ev.avgTick-b.ev.avgTick);
    elites=scored.slice(0,ELITE).map(s=>s.g);
    if(scored[0].ev.score > best.ev.score || (scored[0].ev.score===best.ev.score && scored[0].ev.avgTick<best.ev.avgTick)) best=scored[0];
    const ev=scored[0].ev;
    const summary={ gen, sigma:Number(sigma.toFixed(3)), bestScore:best.ev.score, topGen:{score:ev.score,wins:ev.wins,draws:ev.draws,avgTick:Number(ev.avgTick.toFixed(1))}, roles: scored[0].g.roles };
    console.log('[train_roles]', summary);
    fs.writeFileSync(path.join(logDir, `${nowISO()}-train_roles-gen-${gen}.json`), JSON.stringify(summary,null,2));
  }
  const outPath=path.resolve(process.cwd(),'result/ai.txt');
  fs.writeFileSync(outPath, best.ev.bundle);
  const final = {score:best.ev.score,wins:best.ev.wins,draws:best.ev.draws,avgTick:Number(best.ev.avgTick.toFixed(1)), roles: best.g.roles };
  fs.writeFileSync(path.join(logDir, `${nowISO()}-train_roles-final.json`), JSON.stringify(final,null,2));
  console.log('[train_roles] write-done', { outPath, ...final });
}

if(require.main===module){ train(); }


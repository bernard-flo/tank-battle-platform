#!/usr/bin/env node
// sim.js 엔진 기준 하이퍼파라미터 탐색 -> result/<ts>.txt 저장
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function sh(cmd){ return cp.execSync(cmd,{stdio:['ignore','pipe','pipe']}).toString().trim(); }
function runSim(red, blue, rounds=3){
  const out = sh(`node tools/sim.js run ${red} ${blue} ${rounds}`);
  return JSON.parse(out);
}
function listOpponents(maxN=12){
  const dir = path.join(process.cwd(), 'result');
  const files = fs.existsSync(dir)? fs.readdirSync(dir).filter(f=>f.endsWith('.txt')): [];
  files.sort((a,b)=> fs.statSync(path.join(dir,b)).mtimeMs - fs.statSync(path.join(dir,a)).mtimeMs);
  const out=[]; for(const f of files){ if(out.length>=maxN) break; out.push(path.join(dir,f)); }
  return out;
}
function ts(){ try{return sh('date +%F-%H-%M');}catch(e){ const d=new Date(); const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}-${p(d.getHours())}-${p(d.getMinutes())}`; } }
function joinBlocks(blocks){ return blocks.map((b,i)=> i? `\n\n// ===== 다음 로봇 =====\n\n${b}` : b).join('\n'); }

function makeBotCode(p){
  const { botName, typeConst, engageDist, kiteDist, dodgeAgg, strafeBias, focus } = p;
  return `function name(){return "${botName}";}
function type(){return ${typeConst};}
(function(){
  let tick=0; let last={x:0,y:0,tx:0,ty:0}; let lastAim=0;
  function norm(a){a%=360; if(a<0)a+=360; return a;}
  function ang(x,y){return Math.atan2(y,x)*180/Math.PI;}
  function pickTarget(es){ if(!es.length) return null; if('${focus}'==='low'){ let r=es[0]; for(const e of es){ if(e.health<r.health) r=e; } return r; } let r=es[0]; for(const e of es){ if(e.distance<r.distance) r=e; } return r; }
  function lead(tx,ty, ex,ey){ // tick 기반 속도 추정
    const vx = (ex - last.x); const vy = (ey - last.y);
    // 반복 근사 2회
    let t=1.0; for(let i=0;i<2;i++){ const px = ex + vx*t, py = ey + vy*t; const dist = Math.hypot(px-tx, py-ty); t = dist/8; }
    return ang(ex + vx*t - tx, ey + vy*t - ty);
  }
  function threat(b, t){ const dx=b.x-t.x, dy=b.y-t.y; const sp=Math.hypot(b.vx,b.vy)||1; const nx=b.vx/sp, ny=b.vy/sp; const proj=dx*nx+dy*ny; if(proj<=0) return false; const px=b.x-proj*nx, py=b.y-proj*ny; const d=Math.hypot(px-t.x,py-t.y); return d<${dodgeAgg}; }
  function avoidAllies(t,a){ let ax=0,ay=0,c=0; for(const al of a){ if(al.distance<65){ ax += t.x-al.x; ay += t.y-al.y; c++; } } if(c){ const av=ang(ax,ay); if(t.move(norm(av))) return true; if(t.move(norm(av+25))) return true; if(t.move(norm(av-25))) return true; } return false; }
  function update(tank,enemies,allies,bulletInfo){
    tick++;
    const tgt = pickTarget(enemies);
    if (tgt){ const aim = lead(tank.x,tank.y,tgt.x,tgt.y); lastAim=aim; tank.fire(aim); last={x:tgt.x,y:tgt.y,tx:tank.x,ty:tank.y}; } else { tank.fire(lastAim); }
    // 회피
    let hot=null, md=1e9; for(const b of bulletInfo){ const d=Math.hypot(b.x-tank.x,b.y-tank.y); if(d<md && threat(b,tank)){ md=d; hot=b; } }
    if(hot){ const a=ang(hot.vx,hot.vy); if(tank.move(norm(a+90+(${strafeBias})))) return; if(tank.move(norm(a-90-(${strafeBias})))) return; }
    if(avoidAllies(tank,allies)) return;
    if(tgt){ const d=tgt.distance; const to=ang(tgt.x-tank.x, tgt.y-tank.y); if(d<${kiteDist}){ const away=to+180+(${strafeBias}); if(tank.move(norm(away))) return; if(tank.move(norm(away+20))) return; if(tank.move(norm(away-20))) return; } else if(d>${engageDist}){ if(tank.move(norm(to))) return; if(tank.move(norm(to+20))) return; if(tank.move(norm(to-20))) return; } else { const side=to+(${strafeBias}); if(tank.move(norm(side))) return; if(tank.move(norm(side+20))) return; if(tank.move(norm(side-20))) return; } }
    const pref=[0,90,180,270]; for(const p of pref){ if(tank.move(norm(p+(${strafeBias})))) return; }
  }
  this.update = update;
})();
function update(tank,enemies,allies,bulletInfo){ return this.update(tank,enemies,allies,bulletInfo); }
`;
}
function makeTeam(params){ return params.map(makeBotCode); }
function rand(a,b){ return a + Math.random()*(b-a); }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

function genCandidate(i){
  const bots=[];
  // 2 TANKER
  for(let k=0;k<2;k++){
    const engage = Math.round(clamp(rand(240,300),200,360));
    const kite = Math.round(clamp(rand(150,190),120,engage-60));
    const dodge = Math.round(clamp(rand(60,75),50,90));
    const strafe = Math.round(rand(-15,15));
    bots.push({ botName:`SIMT-T${k+1}`, typeConst:'Type.TANKER', engageDist:engage, kiteDist:kite, dodgeAgg:dodge, strafeBias:k===0? -Math.abs(strafe): Math.abs(strafe), focus:'closest' });
  }
  // 3 DEALER
  for(let k=0;k<3;k++){
    const engage = Math.round(clamp(rand(320,380),260,420));
    const kite = Math.round(clamp(rand(210,260),180,320));
    const dodge = Math.round(clamp(rand(70,85),60,95));
    const strafe = k%2? Math.round(rand(18,30)) : Math.round(rand(-30,-18));
    bots.push({ botName:`SIMD-${k+1}`, typeConst:'Type.DEALER', engageDist:engage, kiteDist:kite, dodgeAgg:dodge, strafeBias:strafe, focus: k===2? 'closest':'low' });
  }
  // 1 NORMAL
  const engage = Math.round(clamp(rand(280,330),220,360));
  const kite = Math.round(clamp(rand(190,230),150,300));
  const dodge = Math.round(clamp(rand(65,78),55,90));
  const strafe = Math.round(rand(-10,10));
  bots.push({ botName:`SIMN-1`, typeConst:'Type.NORMAL', engageDist:engage, kiteDist:kite, dodgeAgg:dodge, strafeBias:strafe, focus:'closest' });
  return { key:`cand${String(i+1).padStart(2,'0')}`, blocks: makeTeam(bots) };
}

function main(){
  const tsStr = ts();
  const wd = path.join(process.cwd(), tsStr);
  if (!fs.existsSync(wd)) fs.mkdirSync(wd);
  const opps = listOpponents(14);
  const C = Number(process.env.SIMJS_CANDS||'24');
  const R = Number(process.env.SIMJS_ROUNDS||'3');
  // 지역 파일로 평가
  const candFiles=[]; const scores=[];
  for(let i=0;i<C;i++){
    const c = genCandidate(i);
    const fp = path.join(wd, `${c.key}.txt`);
    fs.writeFileSync(fp, joinBlocks(c.blocks));
    candFiles.push({key:c.key, fp, blocks:c.blocks});
  }
  for(const c of candFiles){
    let score=0; let games=0;
    if (opps.length===0){ // self mirror
      const r = runSim(c.fp, c.fp, R); score += 0; games += R; 
    } else {
      for(const opp of opps){
        const r1 = runSim(c.fp, opp, R); score += (r1.redWins - r1.blueWins); games += R;
        const r2 = runSim(opp, c.fp, R); score += (r2.blueWins - r2.redWins); games += R;
      }
    }
    scores.push({ key:c.key, score, games });
  }
  scores.sort((a,b)=> b.score - a.score);
  const best = scores[0];
  const bestFile = candFiles.find(x=>x.key===best.key).fp;
  const outPath = path.join(process.cwd(), 'result', `${tsStr}.txt`);
  if (!fs.existsSync(path.dirname(outPath))) fs.mkdirSync(path.dirname(outPath));
  fs.copyFileSync(bestFile, outPath);
  fs.writeFileSync(path.join(wd,'simjs_scores.json'), JSON.stringify(scores.slice(0,10), null, 2));
  console.log(`[SIMJS] best=${best.key} score=${best.score} games=${best.games} -> ${outPath}`);
}

if (require.main===module){ try{ main(); }catch(e){ console.error(e); process.exit(1);} }

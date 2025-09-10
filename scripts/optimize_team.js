#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

function sh(cmd, args, opts={}){
  const res = spawnSync(cmd, args, { encoding:'utf8', ...opts });
  if(res.status!==0){
    throw new Error(`Command failed: ${cmd} ${args.join(' ')}\n${res.stderr}`);
  }
  return res.stdout.trim();
}

function nowTs(){ return sh('date',['+%F-%H-%M']); }

function listOpponentFiles(resultDir, excludeDir){
  const res = [];
  function walk(dir){
    const ents = fs.readdirSync(dir,{ withFileTypes:true });
    for(const e of ents){
      const p = path.join(dir, e.name);
      if(e.isDirectory()){
        if(path.resolve(p)===path.resolve(excludeDir)) continue;
        walk(p);
      } else if(e.isFile()){
        if(e.name.endsWith('.txt')) res.push(p);
      }
    }
  }
  walk(resultDir);
  return res.sort();
}

function buildTeamCode(params){
  function block(label, type, P){
    // One robot block. Using per-block persistent state via __state object
    return `\nfunction name(){return "${label}";}\nfunction type(){return ${type};}\n// VM-persistent state per robot\nlet __state = { last:null, tick:0, lastVel:null };\nfunction update(tank,enemies,allies,bulletInfo){\n  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;\n  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};\n  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;\n  const hypot=Math.hypot;\n  const rnd=((tank.x*97+tank.y*131)|0)%2?1:-1; // deterministic per spawn\n  const P=${JSON.stringify(P)};\n\n  __state.tick = (__state.tick||0) + 1;\n\n  // 1) Target selection: lowest health priority, then nearest\n  let tgt=null; let best=1e9;\n  for(const e of enemies){\n    const key = e.health*${P.targetHealthWeight ?? 1.3} + e.distance*${P.targetDistWeight ?? 0.1};\n    if(key<best){best=key; tgt=e;}\n  }\n\n  // 2) Predictive aim with simple linear lead (based on last observed velocity)\n  if(tgt){\n    let aimX=tgt.x, aimY=tgt.y;\n    if(__state.last && __state.last.x!==undefined){\n      const vx=(tgt.x-__state.last.x);\n      const vy=(tgt.y-__state.last.y);\n      // smooth velocity a bit\n      let lvx=__state.lastVel?__state.lastVel.vx:0;\n      let lvy=__state.lastVel?__state.lastVel.vy:0;\n      const svx = lvx*0.5 + vx*0.5;\n      const svy = lvy*0.5 + vy*0.5;\n      __state.lastVel = { vx: svx, vy: svy };\n      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);\n      const tLead=clamp(d/8, 0, P.leadCap);\n      aimX = tgt.x + svx*P.leadWeight*tLead;\n      aimY = tgt.y + svy*P.leadWeight*tLead;\n    }\n    const jitter = (((tank.x*31+tank.y*17)%23)-11)*0.08 * P.aimJitter;\n    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;\n    tank.fire(fireAngle);\n    __state.last = { x:tgt.x, y:tgt.y };\n  }\n\n  // Helpers\n  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};\n\n  // 3) Bullet avoidance (nearest approach within radius)\n  let hot=null; let minD=1e9;\n  for(const b of bulletInfo){\n    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;\n    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;\n    if(proj>0){\n      const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y);\n      if(d<minD && d<P.threatRadius){ minD=d; hot=b; }\n    }\n  }\n  if(hot){\n    const a=toDeg(hot.vx,hot.vy);\n    const side = (rnd>0?1:-1)*P.threatFleeBias + P.bias*0.6;\n    const cands=[a+90+side, a-90-side, a+120, a-120, a+70, a-70];\n    for(const c of cands){ if(tryMove(c)) return; }\n  }\n\n  // 4) Edge avoidance\n  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }\n  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }\n  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }\n  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }\n\n  // 5) Ally separation\n  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }\n  if(near && ad < P.allySep){\n    const away = toDeg(tank.x-near.x, tank.y-near.y);\n    if(tryMove(away)) return; if(tryMove(away+28)) return; if(tryMove(away-28)) return;\n  }\n\n  // 6) Engagement spacing + strafing (adaptive aggression)\n  if(tgt){\n    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);\n    const d = tgt.distance;\n    let minR=P.minRange, maxR=P.maxRange;\n    const remain = enemies.length;\n    if((tgt.health<=P.finishHp) || remain<=P.finishRemain){ minR-=P.finishMinDelta; maxR-=P.finishMaxDelta; }\n    if(d < minR){\n      const away = to+180 + P.bias*0.4;\n      if(tryMove(away)) return; if(tryMove(away+24)) return; if(tryMove(away-24)) return;\n    } else if(d > maxR){\n      if(tryMove(to)) return; if(tryMove(to+18)) return; if(tryMove(to-18)) return;\n    } else {\n      const side = to + ((((tank.x*13+tank.y*7)|0)%2)?P.strafeAngle:-P.strafeAngle) + P.bias*0.5;\n      if(tryMove(side)) return; if(tryMove(side+18)) return; if(tryMove(side-18)) return;\n    }\n  }\n\n  // 7) Fallback sweeping\n  const sweep=[0,60,120,180,240,300];\n  for(const s of sweep){ if(tryMove(s+P.bias)) return; }\n}\n`;
  }

  const T= 'Type.TANKER';
  const D= 'Type.DEALER';
  const N= 'Type.NORMAL';
  const code = [
    block(params.names[0], T, params.roles.tanker[0]),
    block(params.names[1], T, params.roles.tanker[1]),
    block(params.names[2], D, params.roles.dealer[0]),
    block(params.names[3], D, params.roles.dealer[1]),
    block(params.names[4], N, params.roles.normal[0]),
    block(params.names[5], N, params.roles.normal[1]),
  ].join('\n\n// ===== 다음 로봇 =====\n\n\n');
  return code.trim()+"\n";
}

function makeParams(tag, base){
  // base contains knobs; derive per-role P objects
  const common = (over)=>({
    leadCap: base.leadCap + (over.leadCap||0),
    leadWeight: +(base.leadWeight + (over.leadWeight||0)).toFixed(2),
    aimJitter: +(base.aimJitter + (over.aimJitter||0)).toFixed(2),
    minRange: Math.round(base.minRange + (over.minRange||0)),
    maxRange: Math.round(base.maxRange + (over.maxRange||0)),
    strafeAngle: Math.round(base.strafeAngle + (over.strafeAngle||0)),
    threatRadius: Math.round(base.threatRadius + (over.threatRadius||0)),
    threatFleeBias: Math.round(base.threatFleeBias + (over.threatFleeBias||0)),
    allySep: Math.round(base.allySep + (over.allySep||0)),
    edgeMargin: Math.round(base.edgeMargin + (over.edgeMargin||0)),
    bias: Math.round(base.bias + (over.bias||0)),
    targetHealthWeight: +(base.targetHealthWeight + (over.targetHealthWeight||0)).toFixed(2),
    targetDistWeight: +(base.targetDistWeight + (over.targetDistWeight||0)).toFixed(2),
    finishHp: Math.round(base.finishHp + (over.finishHp||0)),
    finishRemain: Math.round(base.finishRemain + (over.finishRemain||0)),
    finishMinDelta: Math.round(base.finishMinDelta + (over.finishMinDelta||0)),
    finishMaxDelta: Math.round(base.finishMaxDelta + (over.finishMaxDelta||0)),
  });

  const roles = {
    tanker: [
      common({ minRange: -base.aggr*8 + -10, maxRange: -base.aggr*6 + -10, strafeAngle: base.lateral*2, bias: -12 + base.biasAdj, threatRadius: 78+base.defense*2 }),
      common({ minRange: -base.aggr*8 + 0,   maxRange: -base.aggr*6 + 0,   strafeAngle: -base.lateral*2, bias: 12 + base.biasAdj, threatRadius: 78+base.defense*2 }),
    ],
    dealer: [
      common({ minRange: 60 - base.aggr*12, maxRange: 100 - base.aggr*12, strafeAngle: 6+base.lateral*3, bias: -4 + base.biasAdj, threatRadius: 74+base.defense }),
      common({ minRange: 60 - base.aggr*12, maxRange: 100 - base.aggr*12, strafeAngle: -6-base.lateral*3, bias: 4 + base.biasAdj, threatRadius: 74+base.defense }),
    ],
    normal: [
      common({ minRange: 20 - base.aggr*10, maxRange: 40 - base.aggr*10, strafeAngle: 2+base.lateral*2, bias: -6 + base.biasAdj, threatRadius: 76+base.defense }),
      common({ minRange: 20 - base.aggr*10, maxRange: 40 - base.aggr*10, strafeAngle: -2-base.lateral*2, bias: 6 + base.biasAdj, threatRadius: 76+base.defense }),
    ],
  };

  const names = [
    `${tag}-Q1`, `${tag}-Q2`, `${tag}-Q3`, `${tag}-Q4`, `${tag}-Q5`, `${tag}-Q6`
  ];

  return { names, roles };
}

function generateCandidate(tag, knobs){
  const base = {
    // Baseline tuned near Nova/Helix with small improvements
    leadCap: 14,
    leadWeight: knobs.leadWeight,
    aimJitter: knobs.aimJitter,
    minRange: 160, // base to be role-adjusted
    maxRange: 260,
    strafeAngle: 28,
    threatRadius: 76,
    threatFleeBias: 14,
    allySep: 62,
    edgeMargin: 46,
    bias: 0,
    targetHealthWeight: 1.25,
    targetDistWeight: 0.10,
    finishHp: 22,
    finishRemain: 3,
    finishMinDelta: 35,
    finishMaxDelta: 25,
    aggr: knobs.aggr,
    lateral: knobs.lateral,
    defense: knobs.defense,
    biasAdj: knobs.biasAdj,
  };
  const params = makeParams(tag, base);
  const code = buildTeamCode({ names: params.names, roles: params.roles });
  return code;
}

function writeFile(p, content){ fs.writeFileSync(p, content); }

function runBatch(redFile, blueFile, repeat, seed, concurrency){
  const out = path.join(path.dirname(redFile), `result_${path.basename(blueFile).replace(/\W+/g,'_')}_${repeat}.json`);
  const args = ['simulator/cli.js','--red', redFile, '--blue', blueFile, '--repeat', String(repeat), '--seed', String(seed), '--json', out, '--fast', '--runner', 'secure', '--concurrency', String(concurrency)];
  sh('node', args);
  const j = JSON.parse(fs.readFileSync(out,'utf8'));
  return j.aggregate || j.summary;
}

function evaluate(ourFile, oppFile, repeatPerDir=36, seedBase=100000, concurrency=8){
  const a = runBatch(ourFile, oppFile, repeatPerDir, seedBase, concurrency);
  const b = runBatch(oppFile, ourFile, repeatPerDir, seedBase+4242, concurrency);
  // Normalize: when we are blue in (b), our wins are blueWins
  const total = a.matches + b.matches;
  const wins = a.redWins + b.blueWins;
  const losses = a.blueWins + b.redWins;
  const draws = a.draws + b.draws;
  const score = wins + draws*0.5; // half point for draw
  return { total, wins, losses, draws, score, a, b };
}

function main(){
  const TS = process.env.TS || nowTs();
  const WD = path.resolve('work', TS);
  const RD = path.resolve('result', TS);
  fs.mkdirSync(WD, { recursive: true });
  fs.mkdirSync(path.join(WD,'candidates'), { recursive: true });
  fs.mkdirSync(RD, { recursive: true });

  const opps = listOpponentFiles(path.resolve('result'), RD);
  if(opps.length===0){
    console.error('No opponents found in result/. Exiting.');
    process.exit(1);
  }
  // Prefer newest 4 unique sets
  const pick = opps.slice(-8).filter((p)=>!p.includes(TS));

  const knobsList = [];
  const AGGR=[-1,0,1];
  const LAT=[-1,0,1];
  const LW=[0.98,1.04];
  const AIM=[0.20,0.24];
  const DEF=[0,2];
  let idx=0;
  for(const aggr of AGGR){
    for(const lateral of LAT){
      for(const leadWeight of LW){
        const aimJitter = AIM[(idx++)%AIM.length];
        const defense = DEF[idx%DEF.length];
        const biasAdj = (lateral*2 + aggr*1);
        knobsList.push({ aggr, lateral, leadWeight, aimJitter, defense, biasAdj });
      }
    }
  }
  // Trim to reasonable size
  const candidates = knobsList.slice(0,14);

  const results = [];
  let best = null;
  const seedBase = 246810;
  const repeat = 36; // per direction

  for(let i=0;i<candidates.length;i++){
    const k = candidates[i];
    const tag = `Orion-${i+1}`;
    const code = generateCandidate(tag, k);
    const cf = path.join(WD,'candidates',`${tag}.js`);
    writeFile(cf, code);

    // Score vs opponents
    let total=0,wins=0,losses=0,draws=0,score=0; const details=[];
    for(const opp of pick){
      const r = evaluate(cf, opp, repeat, seedBase, 8);
      total += r.total; wins += r.wins; losses += r.losses; draws += r.draws; score += r.score;
      details.push({ opponent: opp, ...r });
    }
    const winRate = +(wins/total).toFixed(3);
    const entry = { tag, file: cf, knobs:k, total, wins, losses, draws, score, winRate, details };
    results.push(entry);
    if(!best || entry.score>best.score){ best=entry; }
    console.log(`[${i+1}/${candidates.length}] ${tag} winRate=${winRate} score=${score.toFixed(1)}`);
  }

  // Write final artifacts
  const finalCode = fs.readFileSync(best.file,'utf8');
  const outFile = path.join(RD, `${TS}.txt`);
  fs.writeFileSync(outFile, finalCode);

  // RESULT.md
  const md=[];
  md.push(`# Tank Battle Optimization Result - ${TS}`);
  md.push('');
  md.push(`Opponents (${pick.length}):`);
  for(const p of pick) md.push(`- ${path.relative(process.cwd(), p)}`);
  md.push('');
  md.push(`Best Candidate: ${best.tag}`);
  md.push('');
  md.push('- Win Rate: '+best.winRate);
  md.push('- Score: '+best.score.toFixed(2));
  md.push('- Knobs: '+JSON.stringify(best.knobs));
  md.push('');
  md.push('## Per-opponent Summary (wins/total)');
  for(const d of best.details){
    const wr = ((d.wins)/(d.total)).toFixed(3);
    md.push(`- ${path.basename(d.opponent)}: ${d.wins}/${d.total} (wr=${wr}, draws=${d.draws})`);
  }
  md.push('');
  md.push('## Top 5 Candidates');
  const top = results.sort((a,b)=>b.score-a.score).slice(0,5);
  for(const e of top){ md.push(`- ${e.tag}: wr=${e.winRate}, score=${e.score.toFixed(1)} knobs=${JSON.stringify(e.knobs)}`); }

  fs.writeFileSync(path.join(WD,'RESULT.md'), md.join('\n'));

  console.log(`\nFinal written to: ${outFile}`);
  console.log(`Summary: ${path.join(WD,'RESULT.md')}`);
}

if(require.main===module){
  main();
}

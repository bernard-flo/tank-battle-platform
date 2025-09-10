#!/usr/bin/env node
/* eslint-disable no-console */
// Anti-meta optimizer: focus on weakest matchups from the latest gauntlet
// Ref: .agent/SIMULATOR.md
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function sh(cmd, args){
  const res = spawnSync(cmd, args, { encoding:'utf8' });
  if(res.status!==0){ throw new Error(`Command failed: ${cmd} ${args.join(' ')}\n${res.stderr}`); }
  return res.stdout.trim();
}

const ROOT = path.resolve(__dirname, '..', '..');
const SIM = path.join(ROOT, 'simulator', 'cli.js');
const RESULT_DIR = path.join(ROOT, 'result');
const WORK_DIR = __dirname;
const OUT_BASENAME = path.basename(WORK_DIR);
const OUR_FILE = path.join(RESULT_DIR, OUT_BASENAME, `${OUT_BASENAME}.txt`);

function listGauntletJson(){
  const ents = fs.readdirSync(WORK_DIR).filter(f=>/^gauntlet_.*_\d+\.json$/.test(f));
  return ents.map(f=>path.join(WORK_DIR,f));
}

function findWorstOpponents(limit=4){
  const files = listGauntletJson();
  const worst=[];
  for(const f of files){
    const j = JSON.parse(fs.readFileSync(f,'utf8'));
    // Our wins when red vs opp, not the combined. We'll combine after pairing.
    const oppBase = f.match(/^gauntlet_(.*)_\d+\.json$/)[1];
    // Estimate combined wr from this single direction (will be noisy, but good enough to pick worst)
    const wr = j.matches>0 ? j.redWins/j.matches : 0;
    worst.push({ file: f, wr, key: oppBase });
  }
  worst.sort((a,b)=>a.wr-b.wr);
  // Map back to opp path
  const opps=[];
  for(const w of worst.slice(0,limit)){
    const parts = w.key.split('_');
    const name = parts.slice(0,-2).join('_').replace(/_/g,'-');
    // This reconstruction is fragile. Instead, parse the key from jsonOut earlier; we stored basename in key.
  }
  // More robust: infer opponent from json filename we wrote (we used replace(/\W+/g,'_'))
  // We'll search result dir for a .txt whose basename matches the tokens inside json name.
  const allTxt=[]; (function walk(d){ for(const e of fs.readdirSync(d,{withFileTypes:true})){ const p=path.join(d,e.name); if(e.isDirectory()) walk(p); else if(e.isFile()&&e.name.endsWith('.txt')) allTxt.push(p); } })(RESULT_DIR);
  function guessOppFromJson(f){
    const base = path.basename(f).replace(/^gauntlet_/,'').replace(/_\d+\.json$/,'');
    const tokens = base.split('_');
    // Try match by compacting tokens into date-like then search
    for(const txt of allTxt){
      const b = path.basename(txt).replace(/\W+/g,'_');
      if(base===b.replace(/\.txt$/,'')) return txt;
    }
    // Fallback: match by last tokens
    const tail = tokens.slice(-3).join('_');
    for(const txt of allTxt){
      const b = path.basename(txt).replace(/\W+/g,'_');
      if(b.includes(tail)) return txt;
    }
    return null;
  }
  const picked=[];
  for(const f of worst){ const opp=guessOppFromJson(f); if(opp && !picked.includes(opp)) picked.push(opp); if(picked.length>=limit) break; }
  return picked;
}

function buildTeamCode(params){
  function block(label, type, P){
    return `\nfunction name(){return "${label}";}\nfunction type(){return ${type};}\nlet __state = { last:null, tick:0, lastVel:null };\nfunction update(tank,enemies,allies,bulletInfo){\n  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;\n  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};\n  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;\n  const hypot=Math.hypot;\n  const rnd=((tank.x*97+tank.y*131)|0)%2?1:-1;\n  const P=${JSON.stringify(params.common)};\n  __state.tick=(__state.tick||0)+1;\n  let tgt=null; let best=1e9;\n  for(const e of enemies){const key=e.health*${params.common.targetHealthWeight ?? 1.25}+e.distance*${params.common.targetDistWeight ?? 0.10}; if(key<best){best=key;tgt=e;}}\n  if(tgt){ let aimX=tgt.x,aimY=tgt.y; if(__state.last){ const vx=(tgt.x-__state.last.x),vy=(tgt.y-__state.last.y); let lvx=__state.lastVel?__state.lastVel.vx:0,lvy=__state.lastVel?__state.lastVel.vy:0; const svx=lvx*0.6+vx*0.4, svy=lvy*0.6+vy*0.4; __state.lastVel={vx:svx,vy:svy}; const dx=tgt.x-tank.x,dy=tgt.y-tank.y; const d=hypot(dx,dy); const tLead=clamp(d/8,0,P.leadCap); aimX=tgt.x+svx*P.leadWeight*tLead; aimY=tgt.y+svy*P.leadWeight*tLead;} const jitter=(((tank.x*31+tank.y*17)%23)-11)*P.aimJitter; const fire=toDeg(aimX-tank.x,aimY-tank.y)+jitter; tank.fire(fire); __state.last={x:tgt.x,y:tgt.y}; }\n  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};\n  let hot=null; let minD=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x,dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1; const nx=b.vx/v,ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx,py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y); if(d<minD && d<P.threatRadius){minD=d; hot=b;} } }\n  if(hot){ const a=toDeg(hot.vx,hot.vy); const side=(rnd>0?1:-1)*P.threatFleeBias + P.bias*0.6; const cands=[a+90+side,a-90-side,a+120,a-120,a+70,a-70]; for(const c of cands){ if(tryMove(c)) return; } }\n  if(tank.x<P.edgeMargin){ if(tryMove(0))return; } if(tank.x>900-P.edgeMargin){ if(tryMove(180))return; } if(tank.y<P.edgeMargin){ if(tryMove(90))return; } if(tank.y>600-P.edgeMargin){ if(tryMove(270))return; }\n  let near=null,ad=1e9; for(const a of allies){ if(a.distance<ad){ad=a.distance; near=a;} } if(near && ad<P.allySep){ const away=toDeg(tank.x-near.x,tank.y-near.y); if(tryMove(away))return; if(tryMove(away+24))return; if(tryMove(away-24))return; }\n  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y); const d=tgt.distance; let minR=P.minRange,maxR=P.maxRange; const remain=enemies.length; if((tgt.health<=P.finishHp)||remain<=P.finishRemain){ minR-=P.finishMinDelta; maxR-=P.finishMaxDelta; } if(d<minR){ const away=to+180+P.bias*0.4; if(tryMove(away))return; if(tryMove(away+22))return; if(tryMove(away-22))return; } else if(d>maxR){ if(tryMove(to))return; if(tryMove(to+16))return; if(tryMove(to-16))return; } else { const side=to+((((tank.x*13+tank.y*7)|0)%2)?P.strafeAngle:-P.strafeAngle) + P.bias*0.5; if(tryMove(side))return; if(tryMove(side+16))return; if(tryMove(side-16))return; } }\n  const sweep=[0,60,120,180,240,300]; for(const s of sweep){ if(tryMove(s+P.bias))return; }\n}\n`;
  }
  const T='Type.TANKER',D='Type.DEALER',N='Type.NORMAL';
  const code=[
    block(`${params.tag}-Q1`,T,params.roles.tanker[0]),
    block(`${params.tag}-Q2`,T,params.roles.tanker[1]),
    block(`${params.tag}-Q3`,D,params.roles.dealer[0]),
    block(`${params.tag}-Q4`,D,params.roles.dealer[1]),
    block(`${params.tag}-Q5`,N,params.roles.normal[0]),
    block(`${params.tag}-Q6`,N,params.roles.normal[1]),
  ].join('\n\n// ===== 다음 로봇 =====\n\n\n');
  return code.trim()+"\n";
}

function makeRoles(base, over){
  const mix=(o)=>({
    leadCap: base.leadCap + (o.leadCap||0),
    leadWeight: +(base.leadWeight + (o.leadWeight||0)).toFixed(2),
    aimJitter: +(base.aimJitter + (o.aimJitter||0)).toFixed(2),
    minRange: Math.round(base.minRange + (o.minRange||0)),
    maxRange: Math.round(base.maxRange + (o.maxRange||0)),
    strafeAngle: Math.round(base.strafeAngle + (o.strafeAngle||0)),
    threatRadius: Math.round(base.threatRadius + (o.threatRadius||0)),
    threatFleeBias: Math.round(base.threatFleeBias + (o.threatFleeBias||0)),
    allySep: Math.round(base.allySep + (o.allySep||0)),
    edgeMargin: Math.round(base.edgeMargin + (o.edgeMargin||0)),
    bias: Math.round(base.bias + (o.bias||0)),
    targetHealthWeight: +(base.targetHealthWeight + (o.targetHealthWeight||0)).toFixed(2),
    targetDistWeight: +(base.targetDistWeight + (o.targetDistWeight||0)).toFixed(2),
    finishHp: Math.round(base.finishHp + (o.finishHp||0)),
    finishRemain: Math.round(base.finishRemain + (o.finishRemain||0)),
    finishMinDelta: Math.round(base.finishMinDelta + (o.finishMinDelta||0)),
    finishMaxDelta: Math.round(base.finishMaxDelta + (o.finishMaxDelta||0)),
  });
  const roles={
    tanker:[ mix({ minRange:-10, maxRange:-10, strafeAngle: 2, bias:-10, threatRadius: base.threatRadius+10 }), mix({ minRange:0, maxRange:0, strafeAngle:-2, bias:10, threatRadius: base.threatRadius+10 }) ],
    dealer:[ mix({ minRange:-20, maxRange:-20, strafeAngle: 4, bias:-4, threatRadius: base.threatRadius+6 }), mix({ minRange:-20, maxRange:-20, strafeAngle:-4, bias:4, threatRadius: base.threatRadius+6 }) ],
    normal:[ mix({ minRange:-10, maxRange:-10, strafeAngle: 2, bias:-6, threatRadius: base.threatRadius+6 }), mix({ minRange:-10, maxRange:-10, strafeAngle:-2, bias:6, threatRadius: base.threatRadius+6 }) ],
  };
  return roles;
}

function runBatch(redFile, blueFile, repeat, seed, concurrency){
  const out = path.join(WORK_DIR, `anti_${path.basename(blueFile).replace(/\W+/g,'_')}_${repeat}.json`);
  sh('node', [SIM,'--red', redFile, '--blue', blueFile, '--repeat', String(repeat), '--seed', String(seed), '--json', out, '--fast', '--runner', 'secure', '--concurrency', String(concurrency)]);
  return JSON.parse(fs.readFileSync(out,'utf8')).aggregate;
}

function evaluate(ourFile, oppFile, repeatPerDir=20, seedBase=909090, concurrency=8){
  const a = runBatch(ourFile, oppFile, repeatPerDir, seedBase, concurrency);
  const b = runBatch(oppFile, ourFile, repeatPerDir, seedBase+1111, concurrency);
  const total = a.matches + b.matches;
  const wins = a.redWins + b.blueWins;
  const losses = a.blueWins + b.redWins;
  const draws = a.draws + b.draws;
  const score = wins + draws*0.5;
  return { total, wins, losses, draws, score, a, b };
}

(function main(){
  const worstOpps = findWorstOpponents(4);
  if(worstOpps.length===0){ console.log('No worst opponents found from gauntlet.'); process.exit(0); }
  console.log('Targeting opponents:', worstOpps.map(p=>path.basename(p)).join(', '));

  const baseSet=[
    { tag:'AntiA', leadWeight:1.08, aimJitter:0.18, minRange:200, maxRange:300, strafeAngle:34, threatRadius:100, threatFleeBias:18, allySep:66, edgeMargin:56 },
    { tag:'AntiB', leadWeight:0.98, aimJitter:0.22, minRange:180, maxRange:280, strafeAngle:28, threatRadius:96, threatFleeBias:16, allySep:62, edgeMargin:52 },
    { tag:'AntiC', leadWeight:1.02, aimJitter:0.20, minRange:220, maxRange:320, strafeAngle:36, threatRadius:104, threatFleeBias:20, allySep:70, edgeMargin:60 },
  ];
  const knobs=[
    { aggr:-1, lateral:-1, defense:4, biasAdj:-2 },
    { aggr:0, lateral:1, defense:8, biasAdj:2 },
    { aggr:1, lateral:0, defense:4, biasAdj:1 },
  ];

  let best=null;
  for(const base of baseSet){
    for(const k of knobs){
      const common = {
        leadCap: 14, leadWeight: base.leadWeight, aimJitter: base.aimJitter,
        minRange: base.minRange, maxRange: base.maxRange, strafeAngle: base.strafeAngle,
        threatRadius: base.threatRadius, threatFleeBias: base.threatFleeBias,
        allySep: base.allySep, edgeMargin: base.edgeMargin, bias: 0,
        targetHealthWeight: 1.25, targetDistWeight: 0.10, finishHp: 22, finishRemain: 3, finishMinDelta: 35, finishMaxDelta: 25,
      };
      const roles = makeRoles({ ...common, threatRadius: common.threatRadius }, {});
      const params = { tag: `${base.tag}-${k.aggr}${k.lateral}${k.defense}`, common, roles };
      const code = buildTeamCode(params);
      const candPath = path.join(WORK_DIR, `anti_${params.tag}.js`);
      fs.writeFileSync(candPath, code);

      let score=0, total=0; const repeat=16; const seed=8080;
      for(const opp of worstOpps){ const r=evaluate(candPath, opp, repeat, seed, 8); score+=r.score; total+=r.total; }
      console.log(`Candidate ${params.tag} score=${score} over ${total} games`);
      if(!best || score>best.score){ best={ ...params, path:candPath, score }; }
    }
  }

  // Save best as final output
  const outFile = path.join(RESULT_DIR, OUT_BASENAME, `${OUT_BASENAME}.txt`);
  fs.writeFileSync(outFile, fs.readFileSync(best.path,'utf8'));
  fs.appendFileSync(path.join(WORK_DIR,'RESULT.md'), `\n## Anti-meta pass\nBest: ${best.tag} score=${best.score}\n`);
})();

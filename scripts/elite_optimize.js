#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

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
  function block(label, type, P, idx){
    // Advanced intercept-aiming robot with robust movement
    return `\nfunction name(){return "${label}";}\nfunction type(){return ${type};}\nlet __state_${idx} = { last:null, tick:0, lastVel:null, side: ((${idx}*17)%2?1:-1) };\nfunction update(tank,enemies,allies,bulletInfo){\n  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI;\n  const N=(a)=>{a%=360; if(a<0)a+=360; return a;};\n  const CL=(v,l,h)=>v<l?l:v>h?h:v;\n  const P=${JSON.stringify(P)};\n  const S=__state_${idx};\n  S.tick=(S.tick||0)+1;\n\n  // 1) Target selection (low health priority; distance tie-breaker)\n  let tgt=null, best=1e18;\n  for(const e of enemies){\n    const k = e.health*${P.healthW ?? 1.25} + e.distance*${P.distW ?? 0.10};\n    if(k<best){best=k; tgt=e;}\n  }\n\n  // 2) Predictive aim using quadratic intercept solve (fallback to linear lead)\n  if(tgt){\n    let ax=tgt.x, ay=tgt.y;\n    let vx=0, vy=0;\n    if(S.last){\n      const lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0;\n      const ivx=(tgt.x-S.last.x), ivy=(tgt.y-S.last.y);\n      vx = lvx*0.5 + ivx*0.5; vy = lvy*0.5 + ivy*0.5; // low-pass\n      S.lastVel={vx,vy};\n      // Solve |r + v t|^2 = (s t)^2 with s=8 px/tick\n      const rx = tgt.x - tank.x, ry = tgt.y - tank.y;\n      const s2 = 64; // 8^2\n      const aa = vx*vx + vy*vy - s2;\n      const bb = 2*(rx*vx + ry*vy);\n      const cc = rx*rx + ry*ry;\n      let tHit = 0;\n      if (Math.abs(aa) < 1e-6) {\n        tHit = bb !== 0 ? CL(-cc / bb, 0, P.leadCap) : 0;\n      } else {\n        const disc = bb*bb - 4*aa*cc;\n        if (disc >= 0) {\n          const sd = Math.sqrt(disc);\n          const t1 = (-bb - sd) / (2*aa);\n          const t2 = (-bb + sd) / (2*aa);\n          const tc = t1>0 && t2>0 ? Math.min(t1,t2) : (t1>0?t1:(t2>0?t2:0));\n          tHit = CL(tc, 0, P.leadCap);\n        } else {\n          // fallback to distance-based lead\n          const d = H(rx,ry); tHit = CL(d/8, 0, P.leadCap);\n        }\n      }\n      ax = tgt.x + vx * P.leadW * tHit;\n      ay = tgt.y + vy * P.leadW * tHit;\n    }\n    const jitter = (((S.tick*13 + tank.x*7 + tank.y*3 + ${idx}*11)%23)-11) * (P.aimJitter||0.12) * 0.07 + (P.aimBias||0);\n    tank.fire(D(ax-tank.x,ay-tank.y) + jitter);\n    S.last={x:tgt.x,y:tgt.y};\n  }\n\n  // Helper to attempt moves (HTML allows up to 10 fails; we cap tries locally)\n  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };\n\n  // 3) Bullet avoidance (distance-to-line + time to closest approach weighting)\n  let hot=null,score=1e18;\n  for(const b of bulletInfo){\n    const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1;\n    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;\n    if(proj>0){\n      const px=b.x-proj*nx, py=b.y-proj*ny;\n      const dist=H(px-tank.x,py-tank.y);\n      const tt=proj/v;\n      const s = dist + tt*(P.threatH||4);\n      if(dist<P.threatR && s<score){ score=s; hot=b; }\n    }\n  }\n  if(hot){\n    const a=D(hot.vx,hot.vy);\n    const side=(S.side||1)*P.fleeBias + (P.bias||0)*0.5;\n    const options=[a+90+side, a-90-side, a+120, a-120, a+70, a-70, a+150, a-150];\n    for(const c of options){ if(go(c)) return; }\n  }\n\n  // 4) Edge avoidance\n  if(tank.x < P.edge){ if(go(0)) return; }\n  if(tank.x > 900-P.edge){ if(go(180)) return; }\n  if(tank.y < P.edge){ if(go(90)) return; }\n  if(tank.y > 600-P.edge){ if(go(270)) return; }\n\n  // 5) Ally separation\n  let near=null, ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }\n  if(near && ad < P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }\n\n  // 6) Range control + strafing (adaptive when finishing or outnumbering)\n  if(tgt){\n    const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance;\n    let r0=P.rMin, r1=P.rMax;\n    if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(120,r0-(P.aggrIn||30)); r1=Math.max(160,r1-(P.aggrOut||20)); }\n    if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; }\n    else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; }\n    else { const s=to + ((S.side||1) * P.strafe) + (P.bias||0)*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; }\n  }\n\n  // 7) Fallback sweep\n  for(const s of [0,60,120,180,240,300]){ if(go(s+(P.bias||0))) return; }\n}\n`;
  }

  const T='Type.TANKER';
  const D='Type.DEALER';
  const N='Type.NORMAL';
  const code = [
    block(params.names[0], T, params.roles.tanker[0], 0),
    block(params.names[1], T, params.roles.tanker[1], 1),
    block(params.names[2], D, params.roles.dealer[0], 2),
    block(params.names[3], D, params.roles.dealer[1], 3),
    block(params.names[4], N, params.roles.normal[0], 4),
    block(params.names[5], N, params.roles.normal[1], 5),
  ].join('\n\n// ===== 다음 로봇 =====\n\n\n');
  return code.trim()+"\n";
}

function clamp(n, lo, hi){ return Math.max(lo, Math.min(hi, n)); }

function makeParams(tag, knobs){
  // Baselines per role
  const baseT = { rMin:180, rMax:285, strafe:22, threatR:200, threatH:5, fleeBias:16, sep:70, edge:52, leadCap:20, leadW:1.04, aimJitter:0.14, healthW:1.25, distW:0.09, finisherHP:26, aggrRemain:3, aggrIn:28, aggrOut:18, bias:-10 };
  const baseD = { rMin:260, rMax:410, strafe:28, threatR:170, threatH:6, fleeBias:14, sep:64, edge:56, leadCap:22, leadW:1.10, aimJitter:0.12, healthW:1.20, distW:0.08, finisherHP:22, aggrRemain:2, aggrIn:30, aggrOut:22, aimBias:-0.6, bias:-6 };
  const baseN = { rMin:210, rMax:330, strafe:24, threatR:185, threatH:5, fleeBias:15, sep:66, edge:54, leadCap:20, leadW:1.06, aimJitter:0.14, healthW:1.22, distW:0.09, finisherHP:24, aggrRemain:3, aggrIn:28, aggrOut:20, bias:2 };

  function adj(b, k){
    const A=k.aggr||0, L=k.lateral||0, DEF=k.defense||0;
    const out = { ...b };
    out.rMin = Math.round(b.rMin + A*8 - DEF*1);
    out.rMax = Math.round(b.rMax + A*12 - DEF*2);
    out.strafe = clamp(b.strafe + L*3, 16, 36);
    out.threatR = clamp(b.threatR + DEF*6, 140, 260);
    out.sep = clamp(b.sep + DEF*2, 56, 86);
    out.edge = clamp(b.edge + DEF*2, 46, 70);
    out.leadW = +(b.leadW * (k.leadMul||1)).toFixed(2);
    out.aimJitter = +(b.aimJitter * (k.aimMul||1)).toFixed(2);
    out.bias = clamp((b.bias||0) + (k.biasAdj||0), -16, 16);
    return out;
  }

  const roles = {
    tanker: [ adj(baseT, knobs), adj({ ...baseT, strafe: baseT.strafe+2, rMin: baseT.rMin+6, rMax: baseT.rMax+8 }, knobs) ],
    dealer: [ adj(baseD, knobs), adj({ ...baseD, rMin: baseD.rMin+14, rMax: baseD.rMax+16 }, knobs) ],
    normal: [ adj(baseN, knobs), adj({ ...baseN, bias: (baseN.bias||0)+2 }, knobs) ],
  };
  return {
    names: [ `${tag}-T1`, `${tag}-T2`, `${tag}-D1`, `${tag}-D2`, `${tag}-N1`, `${tag}-N2` ],
    roles,
  };
}

function generateCandidate(tag, knobs){
  const params = makeParams(tag, knobs);
  return buildTeamCode(params);
}

function writeFile(p, content){ fs.writeFileSync(p, content); }

function runBatch(redFile, blueFile, repeat, seed, concurrency){
  const out = path.join(path.dirname(redFile), `result_${path.basename(blueFile).replace(/\W+/g,'_')}_${repeat}.json`);
  const args = ['simulator/cli.js','--red', redFile, '--blue', blueFile, '--repeat', String(repeat), '--seed', String(seed), '--json', out, '--fast', '--runner', 'secure', '--concurrency', String(concurrency)];
  sh('node', args);
  const j = JSON.parse(fs.readFileSync(out,'utf8'));
  return j.aggregate || j.summary;
}

function evaluate(ourFile, oppFile, repeatPerDir=24, seedBase=300000, concurrency=8){
  const a = runBatch(ourFile, oppFile, repeatPerDir, seedBase, concurrency);
  const b = runBatch(oppFile, ourFile, repeatPerDir, seedBase+4242, concurrency);
  const total = a.matches + b.matches;
  const wins = a.redWins + b.blueWins;
  const losses = a.blueWins + b.redWins;
  const draws = a.draws + b.draws;
  const score = wins + draws*0.5;
  return { total, wins, losses, draws, score, a, b };
}

function main(){
  const TS = process.env.TS || nowTs();
  const WD = path.resolve('work', TS);
  const RD = path.resolve('result', TS);
  fs.mkdirSync(WD, { recursive: true });
  fs.mkdirSync(path.join(WD,'candidates'), { recursive: true });
  fs.mkdirSync(RD, { recursive: true });

  const oppsAll = listOpponentFiles(path.resolve('result'), RD).filter((p)=>!p.includes(TS));
  if(oppsAll.length===0){
    console.error('No opponents found in result/. Exiting.');
    process.exit(1);
  }
  // Focus on the toughest recent opponents (last 12)
  const pick = oppsAll.slice(-12);

  // Knob space
  const knobsList = [];
  const AGGR=[-1,0,1];
  const LAT=[-1,0,1];
  const LM=[0.96,1.02,1.08]; // lead multiplier
  const AM=[0.9,1.0,1.2];    // aim jitter multiplier
  const DEF=[0,2,4];
  let cnt=0;
  for(const aggr of AGGR){
    for(const lateral of LAT){
      const leadMul = LM[cnt%LM.length];
      const aimMul = AM[(cnt++)%AM.length];
      const defense = DEF[cnt%DEF.length];
      const biasAdj = lateral*2 + aggr*1;
      knobsList.push({ aggr, lateral, leadMul, aimMul, defense, biasAdj });
    }
  }
  const candidates = knobsList.slice(0,12);

  const results = [];
  let best = null;
  const seedBase = 97531;
  const repeat = 24;

  for(let i=0;i<candidates.length;i++){
    const k = candidates[i];
    const tag = `Stellar-${i+1}`;
    const code = generateCandidate(tag, k);
    const cf = path.join(WD,'candidates',`${tag}.js`);
    writeFile(cf, code);

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

  // RESULT.md append with ELITE run section
  const md=[];
  md.push(`# Tank Battle Elite Optimization - ${TS}`);
  md.push('');
  md.push(`Opponents (${pick.length}):`);
  for(const p of pick) md.push(`- ${path.relative(process.cwd(), p)}`);
  md.push('');
  md.push(`Best Candidate: ${best.tag}`);
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
  const top = results.sort((a,b)=>b.score-a.score).slice(0,3);
  md.push('## Top Candidates');
  for(const e of top){ md.push(`- ${e.tag}: wr=${e.winRate}, score=${e.score.toFixed(1)} knobs=${JSON.stringify(e.knobs)}`); }

  const resultMdPath = path.join(WD,'RESULT.md');
  let prev = '';
  try{ prev = fs.readFileSync(resultMdPath,'utf8') + '\n\n'; }catch(_e){}
  fs.writeFileSync(resultMdPath, prev + md.join('\n'));

  console.log(`\nFinal written to: ${outFile}`);
  console.log(`Updated summary: ${resultMdPath}`);
}

if(require.main===module){
  main();
}


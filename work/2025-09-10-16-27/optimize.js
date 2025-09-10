#!/usr/bin/env node
/*
  Optimizer for Tank Battle AI teams.
  - Generates parameterized team code with 6 bots.
  - Evaluates against recent opponents in result/*/*.txt using simulator/cli.js.
  - Selects best candidate and saves to result/<timestamp>/<timestamp>.txt.
  - Writes a summary to RESULT.md in the working directory.
*/
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const TS = fs.readFileSync(path.join(__dirname, 'TIMESTAMP'), 'utf8').trim();
const WORK_DIR = __dirname;
const RESULT_DIR = path.join(ROOT, 'result', TS);
const SIM_CLI = path.join(ROOT, 'simulator', 'cli.js');

function sh(cmd, opts = {}) {
  return cp.execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts });
}

function listOpponents(max = 12) {
  const resultRoot = path.join(ROOT, 'result');
  const dirs = fs.readdirSync(resultRoot)
    .filter((d) => d && !d.endsWith('.json'))
    .map((d) => path.join(resultRoot, d))
    .filter((p) => fs.existsSync(p) && fs.statSync(p).isDirectory())
    .filter((p) => path.basename(p) !== TS);
  // Find .txt team files inside each dir
  const entries = [];
  for (const d of dirs) {
    const files = fs.readdirSync(d).filter((f) => f.endsWith('.txt'));
    if (files.length > 0) {
      const f = files[0];
      const full = path.join(d, f);
      const st = fs.statSync(full);
      entries.push({ dir: d, file: full, mtime: st.mtimeMs });
    }
  }
  // Sort by recency
  entries.sort((a, b) => b.mtime - a.mtime);
  return entries.slice(0, max);
}

function teamCode(params, tag) {
  // Creates a 6-bot team with slight param jitters per bot to increase robustness.
  function bot(i, role, base) {
    const P = { ...base };
    // Slight deterministic jitter per bot
    const j = (k, f, lo = -1, hi = 1) => {
      // Simple deterministic LCG based on index and tag length
      let s = (i * 131 + k * 73 + tag.length * 17) >>> 0;
      // LCG step
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      const rv = (s >>> 0) / 4294967296; // [0,1)
      const delta = (lo + (hi - lo) * rv) * f;
      return delta;
    };
    P.rMin = Math.max(150, Math.round(P.rMin + j(1, 6)));
    P.rMax = Math.min(340, Math.round(P.rMax + j(2, 8)));
    if (P.rMax - P.rMin < 60) P.rMax = P.rMin + 60;
    P.strafe = Math.max(12, Math.round(P.strafe + j(3, 4)));
    P.threatR = Math.max(180, Math.round(P.threatR + j(4, 10)));
    P.threatH = +(P.threatH + j(5, 0.9)).toFixed(2);
    P.fleeBias = Math.max(10, Math.round(P.fleeBias + j(6, 4)));
    P.aimJitter = +(Math.max(0.04, P.aimJitter + j(7, 0.03))).toFixed(3);
    P.leadCap = Math.max(12, Math.round(P.leadCap + j(8, 3)));
    P.leadW = +(P.leadW + j(9, 0.06)).toFixed(2);
    P.finisherHP = Math.max(16, Math.round(P.finisherHP + j(10, 4)));
    P.sep = Math.max(70, Math.round(P.sep + j(11, 6)));
    P.bias = Math.round((P.bias || 0) + j(12, 9));
    P.healthW = +(P.healthW + j(13, 0.04)).toFixed(2);
    P.distW = +(P.distW + j(14, 0.02)).toFixed(3);
    P.aggrRemain = Math.max(1, Math.min(3, Math.round(P.aggrRemain + j(15, 1))));
    P.aggrIn = Math.max(12, Math.round(P.aggrIn + j(16, 4)));
    P.aggrOut = Math.max(10, Math.round(P.aggrOut + j(17, 4)));

    const label = `${tag}-${role}${i+1}`;
    const stateVar = `__S_${tag.replace(/[^A-Za-z0-9]/g,'')}_${i}`;
    return `function name(){return "${label}";}
function type(){return ${role === 'T' ? 'Type.TANKER' : role === 'D' ? 'Type.DEALER' : 'Type.NORMAL'};}
var ${stateVar}={tick:0,last:null,lastVel:null,side:${i % 2 === 0 ? 1 : -1}};
function update(tank,enemies,allies,bulletInfo){
  var S=${stateVar}; S.tick=(S.tick||0)+1; if(S.tick%140===0) S.side=-S.side;
  var H=Math.hypot, D=function(x,y){return Math.atan2(y,x)*180/Math.PI;}, N=function(a){a%=360; if(a<0)a+=360; return a;}, CL=function(v,l,h){return v<l?l:v>h?h:v;};
  var P=${JSON.stringify(P)};
  if(!enemies||enemies.length===0) return;
  // Target: low health first, then distance (slight bias)
  var tgt=null,best=1e18; for(var i=0;i<enemies.length;i++){ var e=enemies[i]; var key=e.health*P.healthW + e.distance*P.distW + (i*1e-4) + (P.bias||0); if(key<best){best=key; tgt=e;} }
  // Predictive aim
  if(tgt){ var ax=tgt.x, ay=tgt.y, vx=0, vy=0; if(S.last){ var lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0; var ivx=tgt.x-S.last.x, ivy=tgt.y-S.last.y; vx=lvx*0.52+ivx*0.48; vy=lvy*0.52+ivy*0.48; S.lastVel={vx:vx,vy:vy}; var rx=tgt.x-tank.x, ry=tgt.y-tank.y, s2=64; var aa=vx*vx+vy*vy - s2; var bb=2*(rx*vx+ry*vy); var cc=rx*rx+ry*ry; var tHit=0; if(Math.abs(aa)<1e-6){ tHit = bb!==0 ? CL(-cc/bb,0,P.leadCap) : 0; } else { var disc=bb*bb-4*aa*cc; if(disc>=0){ var sd=Math.sqrt(disc); var t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); var tc=(t1>0&&t2>0)?(t1<t2?t1:t2):(t1>0?t1:(t2>0?t2:0)); tHit=CL(tc,0,P.leadCap);} else { tHit=CL(H(rx,ry)/8,0,P.leadCap);} } ax=tgt.x+vx*P.leadW*tHit; ay=tgt.y+vy*P.leadW*tHit; }
    var jitterSeed=(S.tick*29 + ((tank.x*37+tank.y*41)|0))%23 - 11; var jitter=jitterSeed*P.aimJitter*0.08; tank.fire(D(ax-tank.x,ay-tank.y)+jitter); S.last={x:tgt.x,y:tgt.y}; }
  var moved=0; function go(a){ if(moved>20) return true; moved++; return tank.move(N(a)); }
  function risk(a){ var rad=a*Math.PI/180; var nx=tank.x+Math.cos(rad)*tank.speed, ny=tank.y+Math.sin(rad)*tank.speed; var r=0; for(var k=0;k<bulletInfo.length;k++){ var b=bulletInfo[k]; var dx=b.x-nx, dy=b.y-ny; var v=H(b.vx,b.vy)||1; var ux=b.vx/v, uy=b.vy/v; var proj=dx*ux+dy*uy; if(proj<=0) continue; var px=b.x-proj*ux,py=b.y-proj*uy; var dist=H(px-nx,py-ny); var tt=proj/v; if(dist>P.threatR) continue; r += (1/(1+dist)) + tt*(P.threatH*0.012); } if(nx<60||nx>840||ny<60||ny>540) r+=0.6; return r; }
  // Bullet evade
  var hot=null,score=1e18; for(var i2=0;i2<bulletInfo.length;i2++){ var b=bulletInfo[i2]; var dx=b.x-tank.x, dy=b.y-tank.y; var v=H(b.vx,b.vy)||1; var ux=b.vx/v, uy=b.vy/v; var proj=dx*ux+dy*uy; if(proj<=0) continue; var px=b.x-proj*ux,py=b.y-proj*uy; var dist=H(px-tank.x,py-tank.y); var tt=proj/v; if(dist>P.threatR) continue; var s=dist + tt*(P.threatH); if(s<score){ score=s; hot=b; } }
  if(hot){ var ba=D(hot.vx,hot.vy); var c=[ba+100+P.fleeBias, ba-100-P.fleeBias, ba+130, ba-130, ba+80, ba-80]; c.sort(function(a,b){return risk(a)-risk(b);}); for(var j=0;j<c.length;j++){ if(go(c[j])) return; } }
  // Wall push-in
  if(tank.x < 60){ if(go(0)) return; } if(tank.x > 840){ if(go(180)) return; } if(tank.y < 60){ if(go(90)) return; } if(tank.y > 540){ if(go(270)) return; }
  // Ally separation
  var near=null, ad=1e18; for(var ai=0;ai<allies.length;ai++){ var a=allies[ai]; if(a.distance<ad){ad=a.distance; near=a;} } if(near && ad<P.sep){ var aw=D(tank.x-near.x, tank.y-near.y); if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; }
  // Orbit target
  if(tgt){ var dx=tgt.x-tank.x, dy=tgt.y-tank.y, to=D(dx,dy), dist=H(dx,dy); var r0=P.rMin, r1=P.rMax; if(tgt.health<=P.finisherHP || enemies.length<=P.aggrRemain){ r0=Math.max(150,r0-P.aggrIn); r1=Math.max(190,r1-P.aggrOut);} if(dist<r0){ var aw=to+180; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; } else if(dist>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; } else { var side=to+(S.side>0?P.strafe:-P.strafe); if(go(side)) return; if(go(side+12)) return; if(go(side-12)) return; } }
  // Sweep fallback
  var sw=[0,60,120,180,240,300]; for(var i3=0;i3<sw.length;i3++){ if(go(sw[i3])) return; }
}`;
  }

  // Base params per role
  const baseT = { rMin: 190, rMax: 290, strafe: 22, threatR: 240, threatH: 6.6, fleeBias: 18, sep: 82, edge: 60, leadCap: 20, leadW: 1.06, aimJitter: 0.10, healthW: 1.25, distW: 0.09, finisherHP: 28, aggrRemain: 2, aggrIn: 24, aggrOut: 18, bias: -4 };
  const baseN = { rMin: 185, rMax: 285, strafe: 22, threatR: 235, threatH: 6.6, fleeBias: 18, sep: 80, edge: 60, leadCap: 20, leadW: 1.06, aimJitter: 0.11, healthW: 1.25, distW: 0.09, finisherHP: 26, aggrRemain: 2, aggrIn: 24, aggrOut: 18, bias: -6 };
  const baseD = { rMin: 205, rMax: 320, strafe: 24, threatR: 250, threatH: 7.0, fleeBias: 20, sep: 84, edge: 60, leadCap: 22, leadW: 1.08, aimJitter: 0.10, healthW: 1.22, distW: 0.10, finisherHP: 24, aggrRemain: 3, aggrIn: 22, aggrOut: 16, bias: -10 };

  const roles = ['T','T','N','N','N','D'];
  const bases = roles.map((r)=> r==='T'? baseT : (r==='D'? baseD : baseN));
  const pieces = roles.map((r, idx) => bot(idx, r, bases[idx]));
  return pieces.join('\n\n// ===== 다음 로봇 =====\n\n');
}

function saveCandidate(code, idx) {
  const fp = path.join(WORK_DIR, `candidate_${idx}.txt`);
  fs.writeFileSync(fp, code);
  return fp;
}

function runBatch(redFile, blueFile, repeat = 40, concurrency = 8, seed = 777777) {
  const jsonPath = path.join(WORK_DIR, `tmp_${path.basename(redFile)}_vs_${path.basename(blueFile)}.json`);
  const cmd = `node ${SIM_CLI} --red ${redFile} --blue ${blueFile} --repeat ${repeat} --seed ${seed} --fast --runner secure --concurrency ${concurrency} --json ${jsonPath}`;
  try {
    sh(cmd, { cwd: ROOT });
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    return data.aggregate || data.summary;
  } finally {
    try { fs.unlinkSync(jsonPath); } catch (_) {}
  }
}

function main() {
  const opponents = listOpponents(10);
  if (opponents.length === 0) {
    console.error('No opponents found in result/*');
    process.exit(1);
  }
  console.log('Opponents:', opponents.map(o => path.basename(o.dir)).join(', '));

  const variants = 10; // number of variants to try
  const candidates = [];
  for (let i = 0; i < variants; i++) {
    const tag = `Aegis${i+1}`;
    const code = teamCode({}, tag);
    const fp = saveCandidate(code, i+1);
    candidates.push({ tag, fp });
  }

  // Evaluate
  const scores = [];
  for (const cand of candidates) {
    let wins = 0, losses = 0, draws = 0;
    for (const opp of opponents) {
      const agg = runBatch(cand.fp, opp.file, 36, 8, 13579);
      wins += agg.redWins || 0;
      losses += agg.blueWins || 0;
      draws += agg.draws || 0;
      process.stdout.write(`Variant ${cand.tag} vs ${path.basename(opp.dir)} => W:${agg.redWins} L:${agg.blueWins} D:${agg.draws}\n`);
    }
    const total = wins + losses + draws;
    const wr = total>0 ? wins / (wins + losses) : 0;
    scores.push({ tag: cand.tag, fp: cand.fp, wins, losses, draws, wr });
  }
  scores.sort((a,b)=> b.wr - a.wr || (b.wins-b.losses) - (a.wins-a.losses));
  const best = scores[0];
  console.log('Best variant:', best);

  // Save final team
  const finalPath = path.join(RESULT_DIR, `${TS}.txt`);
  fs.copyFileSync(best.fp, finalPath);

  // Produce RESULT.md
  const lines = [];
  lines.push(`# Result for ${TS}`);
  lines.push('');
  lines.push('Referenced .agent/SIMULATOR.md for engine and CLI details.');
  lines.push('');
  lines.push('Opponents evaluated:');
  for (const o of opponents) lines.push(`- ${path.basename(o.dir)} (${path.basename(o.file)})`);
  lines.push('');
  lines.push('Candidate scores:');
  for (const s of scores) lines.push(`- ${s.tag}: WR=${(s.wr*100).toFixed(1)}% (W:${s.wins} L:${s.losses} D:${s.draws})`);
  fs.writeFileSync(path.join(WORK_DIR, 'RESULT.md'), lines.join('\n'));

  console.log(`Saved final team -> ${finalPath}`);
}

if (require.main === module) {
  main();
}

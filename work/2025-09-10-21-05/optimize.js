#!/usr/bin/env node
/*
  Optimizer for tank_battle_platform bots.
  - Generates a family of 6-bot teams with tunable parameters.
  - Simulates versus recent opponents found in result/<any-subdir>/*.txt.
  - Picks the best variant and writes final team code to result/<TS>/team.js and <TS>.txt.
  - Saves a summary to work/<TS>/RESULT.md.

  Usage: node optimize.js
*/
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RESULT_DIR = path.join(REPO_ROOT, 'result');
const SIM_CLI = path.join(REPO_ROOT, 'simulator', 'cli.js');

function nowTs() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(d.getMinutes())}`;
}

function detectTsFromCwd() {
  // Work dir is work/<TS>
  const dir = path.basename(path.resolve('.'));
  // crude validation
  if (/^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}$/.test(dir)) return dir;
  return nowTs();
}

const TS = detectTsFromCwd();
const THIS_WORK_DIR = path.join(REPO_ROOT, 'work', TS);
const THIS_RESULT_DIR = path.join(REPO_ROOT, 'result', TS);

function sh(cmd, opts = {}) {
  const res = cp.spawnSync(cmd[0], cmd.slice(1), { encoding: 'utf8', ...opts });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    const out = (res.stdout || '') + '\n' + (res.stderr || '');
    throw new Error(`Command failed (${cmd.join(' ')}):\n${out}`);
  }
  return res.stdout;
}

function collectOpponents(limit = 12) {
  // Find recent .txt files under result/* directories (excluding our own TS)
  const entries = [];
  if (!fs.existsSync(RESULT_DIR)) return entries;
  const list = fs.readdirSync(RESULT_DIR);
  for (const dir of list) {
    const p = path.join(RESULT_DIR, dir);
    try {
      const st = fs.statSync(p);
      if (st.isDirectory() && dir !== TS) {
        const files = fs.readdirSync(p);
        for (const f of files) {
          if (f.endsWith('.txt') || f.endsWith('.js')) {
            const fp = path.join(p, f);
            const fst = fs.statSync(fp);
            // sanity: ensure it looks like team code (contains function name())
            try {
              const head = fs.readFileSync(fp, 'utf8').slice(0, 2000);
              if (/function\s+name\s*\(\s*\)/.test(head)) {
                entries.push({ file: fp, mtime: fst.mtimeMs });
              }
            } catch (_) {}
          }
        }
      }
    } catch (_) { /* ignore */ }
  }
  // also include top-level results like result/*.txt
  for (const f of fs.readdirSync(RESULT_DIR)) {
    const p = path.join(RESULT_DIR, f);
    try {
      const st = fs.statSync(p);
      if (st.isFile() && (f.endsWith('.txt') || f.endsWith('.js'))) {
        const head = fs.readFileSync(p, 'utf8').slice(0, 2000);
        if (/function\s+name\s*\(\s*\)/.test(head)) {
          entries.push({ file: p, mtime: st.mtimeMs });
        }
      }
    } catch (_) {}
  }
  entries.sort((a, b) => b.mtime - a.mtime);
  const dedup = [];
  const seen = new Set();
  for (const e of entries) {
    if (!seen.has(e.file)) { dedup.push(e); seen.add(e.file); }
  }
  return dedup.slice(0, limit).map(e => e.file);
}

function teamCode(params) {
  // Generate 6 robots with per-robot state and advanced predictive aim.
  // params: { tanker, dealer, normal, namesPrefix }
  const mkUnit = (nm, tankType, P, idx) => {
    const esc = (x) => JSON.stringify(x);
    // Keep code tight for performance; avoid closures over huge state.
    return `function name(){return ${esc(nm)};}\nfunction type(){return ${tankType};}\nlet __S_${idx}={last:null,tick:0,lastVel:null,side: ((${idx}*17)%2?1:-1)};\nfunction update(tank,enemies,allies,bulletInfo){\n  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI; const N=(a)=>{a%=360; return a<0?a+360:a;}; const C=(v,l,h)=>v<l?l:v>h?h:v;\n  const P=${JSON.stringify(P)}; const S=__S_${idx}; S.tick=(S.tick||0)+1;\n  // 1) Target selection (health priority, distance tie)\n  let T=null, sc=1e18; for(const e of enemies){ const s=e.health*P.hW + e.distance*P.dW; if(s<sc){sc=s; T=e;} }\n  // 2) Predictive aim using quadratic intercept (fallback to linear lead)\n  if(T){ let ax=T.x, ay=T.y; let vx=0, vy=0; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0; const ivx=(T.x-S.last.x), ivy=(T.y-S.last.y); vx=lvx*0.5+ivx*0.5; vy=lvy*0.5+ivy*0.5; S.lastVel={vx,vy}; const rx=T.x-tank.x, ry=T.y-tank.y; const s2=64; const aa=vx*vx+vy*vy-s2; const bb=2*(rx*vx+ry*vy); const cc=rx*rx+ry*ry; let tHit=0; if(Math.abs(aa)<1e-6){ tHit = bb!==0 ? C(-cc/bb,0,P.leadCap) : 0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc); const t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); const tc=(t1>0&&t2>0)?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); tHit=C(tc,0,P.leadCap); } else { const d=H(rx,ry); tHit=C(d/8,0,P.leadCap); } } ax=T.x+vx*P.leadW*tHit; ay=T.y+vy*P.leadW*tHit; } const jit=(((S.tick*13 + tank.x*7 + tank.y*3 + ${idx}*11)%23)-11)*(P.jF||0.1) + (P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y)+jit); S.last={x:T.x,y:T.y}; }\n  // 3) Bullet avoidance with time weighting\n  let Ht=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v; const pj=dx*nx+dy*ny; if(pj>0){ const px=b.x-pj*nx, py=b.y-pj*ny; const dist=H(px-tank.x,py-tank.y); const tt=pj/v; const s=dist + tt*(P.threatH||4); if(dist<P.threat && s<score){ score=s; Ht=b; } } }\n  let moved=0; const GO=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };\n  if(Ht){ const a=D(Ht.vx,Ht.vy); const side=(S.side||1)*(P.fleeBias||16) + (P.bias||0)*0.4; for(const c of [a+90+side, a-90-side, a+120, a-120, a+70, a-70]){ if(GO(c)) return; } }\n  // 4) Edges\n  if(tank.x<P.edge){ if(GO(0)) return; } if(tank.x>900-P.edge){ if(GO(180)) return; } if(tank.y<P.edge){ if(GO(90)) return; } if(tank.y>600-P.edge){ if(GO(270)) return; }\n  // 5) Ally separation\n  let A=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; A=a; } } if(A && ad<P.sep){ const aw=D(tank.x-A.x,tank.y-A.y); if(GO(aw)) return; if(GO(aw+18)) return; if(GO(aw-18)) return; }\n  // 6) Range + strafing\n  if(T){ const to=D(T.x-tank.x,T.y-tank.y), d=T.distance; let r0=P.minR, r1=P.maxR; if((T.health<=(P.finHP||24))||enemies.length<=P.lastN2){ r0=Math.max(P.minCap||140, r0-(P.aggrIn||30)); r1=Math.max((P.minCap||140)+40, r1-(P.aggrOut||20)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(GO(aw)) return; if(GO(aw+16)) return; if(GO(aw-16)) return; } else if(d>r1){ if(GO(to)) return; if(GO(to+14)) return; if(GO(to-14)) return; } else { const s=to + ((S.side||1)*(P.strafe||30)) + (P.bias||0)*0.5; if(GO(s)) return; if(GO(s+16)) return; if(GO(s-16)) return; } }\n  for(const s of [0,60,120,180,240,300]){ if(GO(s+(P.bias||0))) return; }\n}`;
  };

  const pre = params.namesPrefix || 'Nova';

  const blocks = [
    mkUnit(`${pre}-T1`, 'Type.TANKER', params.tanker, 0),
    mkUnit(`${pre}-T2`, 'Type.TANKER', params.tanker2 || params.tanker, 1),
    mkUnit(`${pre}-D1`, 'Type.DEALER', params.dealer, 2),
    mkUnit(`${pre}-D2`, 'Type.DEALER', params.dealer2 || params.dealer, 3),
    mkUnit(`${pre}-N1`, 'Type.NORMAL', params.normal, 4),
    mkUnit(`${pre}-N2`, 'Type.NORMAL', params.normal2 || params.normal, 5),
  ];
  return blocks.join('\n\n// ===== 다음 로봇 =====\n\n');
}

function writeFile(p, s) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s);
}

function runBatch(redFile, blueFile, repeat = 40) {
  const tmp = path.join(THIS_WORK_DIR, `tmp_${path.basename(blueFile).replace(/\W+/g,'_')}.json`);
  const args = [
    'node', SIM_CLI,
    '--red', redFile,
    '--blue', blueFile,
    '--repeat', String(repeat),
    '--seed', '1000',
    '--concurrency', String(Math.min(8, require('os').cpus().length || 4)),
    '--fast',
    '--json', tmp,
  ];
  try {
    sh(args, { cwd: REPO_ROOT });
    const data = JSON.parse(fs.readFileSync(tmp, 'utf8'));
    const agg = data.aggregate || { redWins: 0, blueWins: 0, draws: 0 };
    return { redWins: agg.redWins, blueWins: agg.blueWins, draws: agg.draws, file: blueFile };
  } catch (e) {
    return { redWins: 0, blueWins: 0, draws: 0, file: blueFile, error: e.message };
  } finally {
    try { fs.unlinkSync(tmp); } catch (_) {}
  }
}

function main() {
  fs.mkdirSync(THIS_WORK_DIR, { recursive: true });
  fs.mkdirSync(THIS_RESULT_DIR, { recursive: true });

  const opponents = collectOpponents(12);
  if (opponents.length === 0) {
    console.error('No opponent .txt/.js files found under result/.');
  }

  // Define a few parameter variants to try
  const variants = [
    {
      key: 'balanced', namesPrefix: 'Nova',
      tanker: { minR:180, maxR:290, strafe:30, threat:78, sep:64, edge:42, bias:-8, jA:31, jB:17, jM:23, jH:11, jF:0.15, leadCap:12, leadW:0.95, hW:1.45, dW:0.10, finN:30, finX:20, lastN:40, lastX:40, minCap:150 },
      dealer: { minR:240, maxR:360, strafe:34, threat:80, sep:60, edge:42, bias:-12, jA:17, jB:13, jM:23, jH:11, jF:0.12, leadCap:13, leadW:1.00, hW:1.55, dW:0.08, finN:30, finX:20, lastN:40, lastX:40, minCap:170 },
      normal: { minR:200, maxR:320, strafe:32, threat:78, sep:62, edge:42, bias:-10, jA:19, jB:29, jM:27, jH:13, jF:0.14, leadCap:12, leadW:0.98, hW:1.50, dW:0.09, finN:30, finX:20, lastN:38, lastX:38, minCap:160 },
    },
    {
      key: 'aggressive', namesPrefix: 'NovaX',
      tanker: { minR:160, maxR:270, strafe:28, threat:76, sep:60, edge:40, bias:-6, jA:29, jB:23, jM:21, jH:10, jF:0.16, leadCap:12, leadW:0.95, hW:1.40, dW:0.09, finN:35, finX:22, lastN:50, lastX:45, minCap:140 },
      dealer: { minR:220, maxR:340, strafe:36, threat:80, sep:58, edge:42, bias:-10, jA:23, jB:17, jM:21, jH:10, jF:0.13, leadCap:13, leadW:1.05, hW:1.50, dW:0.08, finN:35, finX:22, lastN:45, lastX:45, minCap:160 },
      normal: { minR:190, maxR:300, strafe:34, threat:78, sep:60, edge:42, bias:-8, jA:19, jB:29, jM:27, jH:13, jF:0.14, leadCap:12, leadW:1.00, hW:1.45, dW:0.09, finN:32, finX:20, lastN:42, lastX:42, minCap:150 },
    },
    {
      key: 'evasive', namesPrefix: 'NovaE',
      tanker: { minR:190, maxR:310, strafe:36, threat:85, sep:66, edge:46, bias:-12, jA:31, jB:17, jM:29, jH:14, jF:0.14, leadCap:11, leadW:0.92, hW:1.55, dW:0.11, finN:28, finX:18, lastN:34, lastX:34, minCap:160 },
      dealer: { minR:260, maxR:380, strafe:40, threat:88, sep:62, edge:46, bias:-14, jA:17, jB:13, jM:25, jH:12, jF:0.11, leadCap:12, leadW:1.00, hW:1.60, dW:0.09, finN:26, finX:18, lastN:32, lastX:32, minCap:180 },
      normal: { minR:220, maxR:340, strafe:38, threat:86, sep:64, edge:46, bias:-12, jA:19, jB:29, jM:27, jH:13, jF:0.12, leadCap:11, leadW:0.96, hW:1.55, dW:0.10, finN:28, finX:18, lastN:34, lastX:34, minCap:170 },
    },
  ];

  const candidateFile = path.join(THIS_WORK_DIR, 'candidate.js');
  const results = [];

  for (const v of variants) {
    const code = teamCode(v);
    writeFile(candidateFile, code);
    // Evaluate vs each opponent
    let sumWins = 0, sumLoss = 0, sumDraw = 0;
    const perOpp = [];
    for (const opp of opponents) {
      const r = runBatch(candidateFile, opp, 40);
      perOpp.push({ opponent: opp, redWins: r.redWins, blueWins: r.blueWins, draws: r.draws });
      sumWins += r.redWins; sumLoss += r.blueWins; sumDraw += r.draws;
    }
    results.push({ key: v.key, prefix: v.namesPrefix, sumWins, sumLoss, sumDraw, perOpp, variant: v });
  }

  results.sort((a, b) => (b.sumWins - b.sumLoss) - (a.sumWins - a.sumLoss));
  const best = results[0];

  // Write final outputs
  const finalCode = teamCode(best.variant);
  const teamJs = path.join(THIS_RESULT_DIR, 'team.js');
  const teamTxt = path.join(THIS_RESULT_DIR, `${TS}.txt`);
  writeFile(teamJs, finalCode);
  writeFile(teamTxt, finalCode);

  // Write RESULT.md
  const md = [];
  md.push(`# Optimization Result (${TS})`);
  md.push('');
  md.push(`- Chosen variant: ${best.key} (${best.prefix})`);
  md.push(`- Aggregate: Wins=${best.sumWins}, Losses=${best.sumLoss}, Draws=${best.sumDraw}`);
  md.push('');
  md.push('## Per-opponent (40 matches each)');
  for (const r of best.perOpp) {
    md.push(`- ${path.relative(RESULT_DIR, r.opponent)}: W ${r.redWins} / L ${r.blueWins} / D ${r.draws}`);
  }
  writeFile(path.join(THIS_WORK_DIR, 'RESULT.md'), md.join('\n'));

  console.log('Best variant:', best.key, 'Wins-Losses:', best.sumWins, best.sumLoss);
  console.log('Final code written to:', teamJs, 'and', teamTxt);
}

if (require.main === module) {
  main();
}

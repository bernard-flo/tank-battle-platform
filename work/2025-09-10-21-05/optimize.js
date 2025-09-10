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
  // Generate 6 robots with shared update logic but type-specific parameters.
  // params: { tanker, dealer, normal, namesPrefix }
  const mkUnit = (nm, tankType, P) => {
    const esc = (x) => JSON.stringify(x);
    // Keep code tight for performance; avoid closures over huge state.
    return `function name(){return ${esc(nm)};}\nfunction type(){return ${tankType};}\nfunction update(tank,enemies,allies,bulletInfo){\n  const D=(x,y)=>Math.atan2(y,x)*180/Math.PI; const N=(a)=>{a%=360;return a<0?a+360:a;}; const C=(v,l,h)=>v<l?l:v>h?h:v;\n  const P=${JSON.stringify(P)};\n  // Shared target memory per-bot id\n  if(!update.__S) update.__S={}; const S=(update.__S[tank.x+'_'+tank.y+'_'+(tank.size||0)] ||= {ex:0,ey:0});\n  let T=null, sc=1e9; for(const e of enemies){ let tw=0; // type preference: DEALER(-26), NORMAL(0), TANKER(+18)\n    if(e.health!==undefined){ tw += (e.health<18? -12:0); }\n    if(e.angle!==undefined){ tw += 0; }\n    // approximate class weight via size heuristic if available on input elsewhere; keep zero here.\n    const s = e.health*P.hW + e.distance*P.dW + tw; if(s<sc){sc=s; T=e;} }\n  if(T){ let ax=T.x, ay=T.y; if(S.ex||S.ey){ const vx=T.x-S.ex, vy=T.y-S.ey; const d=Math.hypot(T.x-tank.x,T.y-tank.y); const t=C(d/8,0,P.leadCap); ax=T.x+vx*P.leadW*t; ay=T.y+vy*P.leadW*t; } const j=((tank.x*P.jA+tank.y*P.jB)%(P.jM)-P.jH)*P.jF; tank.fire(D(ax-tank.x,ay-tank.y)+j); S.ex=T.x; S.ey=T.y; }\n  let MIN=P.minR, MAX=P.maxR; if(T){ if(T.health<20){ MIN-=P.finN; MAX-=P.finX; } if(enemies.length<=2){ MIN-=P.lastN; MAX-=P.lastX; } MIN=Math.max(MIN,P.minCap); }\n  let tries=0; const GO=(a)=>{tries++; return tank.move(N(a));};\n  // Threat bullets (incoming within cone and radius)\n  let H=null, md=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=Math.hypot(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=Math.hypot(px-tank.x,py-tank.y); if(d<md && d<P.threat){ md=d; H=b; } } }\n  if(H){ const a=D(H.vx,H.vy); for(const c of [a+92+P.bias, a-92-P.bias, a+118, a-118]){ if(GO(c)) return; } }\n  // Keep inside arena\n  if(tank.x<P.edge){ if(GO(0)) return; } if(tank.x>900-P.edge){ if(GO(180)) return; } if(tank.y<P.edge){ if(GO(90)) return; } if(tank.y>600-P.edge){ if(GO(270)) return; }\n  // Ally separation\n  let A=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; A=a; } } if(A && ad<P.sep){ const aw=D(tank.x-A.x,tank.y-A.y); if(GO(aw)) return; if(GO(aw+28)) return; if(GO(aw-28)) return; }\n  // Range-keeping and strafing\n  if(T){ const to=D(T.x-tank.x,T.y-tank.y), d=T.distance; if(d<MIN){ const aw=to+180+P.bias*0.5; if(GO(aw)) return; if(GO(aw+24)) return; if(GO(aw-24)) return; } else if(d>MAX){ if(GO(to)) return; if(GO(to+16)) return; if(GO(to-16)) return; } else { const side=to+(((tank.x*13+tank.y*7)%2)?P.strafe:-P.strafe)+P.bias*0.3; if(GO(side)) return; if(GO(side+16)) return; if(GO(side-16)) return; } }\n  for(const s of [0,60,120,180,240,300]){ if(GO(s+P.bias)) return; }\n}`;
  };

  const pre = params.namesPrefix || 'Nova';

  const blocks = [
    mkUnit(`${pre}-T1`, 'Type.TANKER', params.tanker),
    mkUnit(`${pre}-D1`, 'Type.DEALER', params.dealer),
    mkUnit(`${pre}-N1`, 'Type.NORMAL', params.normal),
    mkUnit(`${pre}-N2`, 'Type.NORMAL', params.normal2 || params.normal),
    mkUnit(`${pre}-D2`, 'Type.DEALER', params.dealer2 || params.dealer),
    mkUnit(`${pre}-T2`, 'Type.TANKER', params.tanker2 || params.tanker),
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

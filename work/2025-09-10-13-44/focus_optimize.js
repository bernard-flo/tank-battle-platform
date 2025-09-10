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

function runBatch(redFile, blueFile, repeat, seed, concurrency){
  const out = path.join(path.dirname(redFile), `result_${path.basename(blueFile).replace(/\W+/g,'_')}_${repeat}.json`);
  const args = ['simulator/cli.js','--red', redFile, '--blue', blueFile, '--repeat', String(repeat), '--seed', String(seed), '--json', out, '--fast', '--runner', 'secure', '--concurrency', String(concurrency)];
  sh('node', args);
  const j = JSON.parse(fs.readFileSync(out,'utf8'));
  return j.aggregate || j.summary;
}

function evaluate(ourFile, oppFile, repeatPerDir=40, seedBase=33333, concurrency=8){
  const a = runBatch(ourFile, oppFile, repeatPerDir, seedBase, concurrency);
  const b = runBatch(oppFile, ourFile, repeatPerDir, seedBase+777, concurrency);
  const total = a.matches + b.matches;
  const wins = a.redWins + b.blueWins;
  const losses = a.blueWins + b.redWins;
  const draws = a.draws + b.draws;
  const wr = wins/total;
  return { total, wins, losses, draws, wr };
}

function buildTeam(tag, knobs){
  function block(label, type, P, idx){
    return `\nfunction name(){return "${label}";}\nfunction type(){return ${type};}\nlet __state_${idx} = { last:null, tick:0, lastVel:null, side: ((${idx}*17)%2?1:-1) };\nfunction update(tank,enemies,allies,bulletInfo){\n  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI;\n  const N=(a)=>{a%=360; if(a<0)a+=360; return a;};\n  const CL=(v,l,h)=>v<l?l:v>h?h:v;\n  const P=${JSON.stringify(P)};\n  const S=__state_${idx};\n  S.tick=(S.tick||0)+1;\n  let tgt=null, best=1e18;\n  for(const e of enemies){ const k = e.health*${P.healthW ?? 1.25} + e.distance*${P.distW ?? 0.10}; if(k<best){best=k; tgt=e;} }\n  if(tgt){ let ax=tgt.x, ay=tgt.y; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0; const ivx=(tgt.x-S.last.x), ivy=(tgt.y-S.last.y); const svx = lvx*0.5 + ivx*0.5, svy = lvy*0.5 + ivy*0.5; S.lastVel={vx:svx,vy:svy}; const rx=tgt.x-tank.x, ry=tgt.y-tank.y; const s2=64; const aa=svx*svx+svy*svy - s2; const bb=2*(rx*svx+ry*svy); const cc=rx*rx+ry*ry; let t=0; if(Math.abs(aa)<1e-6){ t = bb!==0 ? CL(-cc/bb,0,P.leadCap) : 0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc); const t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); const tc = t1>0&&t2>0?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); t=CL(tc,0,P.leadCap); } else { const d=H(rx,ry); t=CL(d/8,0,P.leadCap); } } ax=tgt.x+svx*P.leadW*t; ay=tgt.y+svy*P.leadW*t; } const jitter = (((S.tick*13 + tank.x*7 + tank.y*3 + ${idx}*11)%23)-11) * (P.aimJitter||0.12) * 0.07 + (P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y) + jitter); S.last={x:tgt.x,y:tgt.y}; }\n  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };\n  let hot=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const dist=H(px-tank.x,py-tank.y); const tt=proj/v; const s = dist + tt*(P.threatH||4); if(dist<P.threatR && s<score){ score=s; hot=b; } } }\n  if(hot){ const a=D(hot.vx,hot.vy); const side=(S.side||1)*P.fleeBias + (P.bias||0)*0.5; const options=[a+90+side, a-90-side, a+120, a-120, a+70, a-70, a+150, a-150]; for(const c of options){ if(go(c)) return; } }\n  if(tank.x < P.edge){ if(go(0)) return; } if(tank.x > 900-P.edge){ if(go(180)) return; } if(tank.y < P.edge){ if(go(90)) return; } if(tank.y > 600-P.edge){ if(go(270)) return; }\n  let near=null, ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }\n  if(near && ad < P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }\n  if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=P.rMin, r1=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(110,r0-(P.aggrIn||36)); r1=Math.max(160,r1-(P.aggrOut||28)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; } else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; } else { const side=to + ((((tank.x*13+tank.y*7)|0)%2)?P.strafe:-P.strafe) + (P.bias||0)*0.5; if(go(side)) return; if(go(side+14)) return; if(go(side-14)) return; } }\n  const sweep=[0,50,100,150,200,250,300,350]; for(const s of sweep){ if(go(s+(P.bias||0))) return; }\n}\n`;
  }
  const T='Type.TANKER', D='Type.DEALER', N='Type.NORMAL';
  const params = knobs;
  const blocks = [
    block(tag+'-T1', T, params.tanker[0], 1),
    block(tag+'-T2', T, params.tanker[1], 2),
    block(tag+'-D1', D, params.dealer[0], 3),
    block(tag+'-D2', D, params.dealer[1], 4),
    block(tag+'-N1', N, params.normal[0], 5),
    block(tag+'-N2', N, params.normal[1], 6),
  ];
  return blocks.join('\n\n// ===== 다음 로봇 =====\n\n\n');
}

function makeKnobs(){
  const base = {
    common: { leadCap: 12, leadW: 1.06, aimJitter: 0.18, edge: 52, sep: 64, threatR: 210, fleeBias: 14, finisherHP: 22, aggrRemain: 3, aggrIn: 34, aggrOut: 26, healthW:1.28, distW:0.10 },
    tanker: [ { rMin: 160, rMax: 245, strafe: 26, bias:-8 }, { rMin: 165, rMax: 250, strafe: 24, bias: +8 } ],
    dealer: [ { rMin: 210, rMax: 325, strafe: 36, bias:-6 }, { rMin: 215, rMax: 330, strafe: 34, bias:+6 } ],
    normal: [ { rMin: 185, rMax: 295, strafe: 30, bias:-3 }, { rMin: 190, rMax: 300, strafe: 28, bias:+3 } ],
  };
  const variants = [];
  const tweaks = [
    { tag:'A', mul: { leadW:1.00, aimJitter:1.00 }, delta:{ fleeBias:+2 } },
    { tag:'B', mul: { leadW:1.02, aimJitter:0.95 }, delta:{}, dealer: { rMin:-10, rMax:-10 } },
    { tag:'C', mul: { leadW:1.08, aimJitter:0.90 }, delta:{ edge:+4 }, tanker:{ rMin:-10 }, normal:{ rMin:-10 } },
    { tag:'D', mul: { leadW:1.04, aimJitter:0.85 }, delta:{ sep:+2, fleeBias:+4 }, dealer:{ rMin:-20, rMax:-20 } },
  ];
  for(const tw of tweaks){
    const c = JSON.parse(JSON.stringify(base));
    const m=tw.mul||{}, d=tw.delta||{};
    c.common.leadW = +(c.common.leadW * (m.leadW||1)).toFixed(2);
    c.common.aimJitter = +(c.common.aimJitter * (m.aimJitter||1)).toFixed(2);
    for(const k of Object.keys(d)) c.common[k] = (c.common[k]||0) + d[k];
    const adj=(arr, df)=>arr.map((p)=>Object.assign({}, p, Object.keys(df||{}).reduce((o,key)=>{ o[key]=(p[key]||0)+(df[key]||0); return o; },{})));
    c.tanker = adj(c.tanker, tw.tanker||{});
    c.dealer = adj(c.dealer, tw.dealer||{});
    c.normal = adj(c.normal, tw.normal||{});
    const k = {
      tanker: c.tanker.map(p=>({ ...c.common, ...p })),
      dealer: c.dealer.map(p=>({ ...c.common, ...p })),
      normal: c.normal.map(p=>({ ...c.common, ...p })),
    };
    variants.push({ tag: tw.tag, knobs: k });
  }
  return variants;
}

function main(){
  const ROOT = path.resolve(__dirname, '..', '..');
  const TS = path.basename(path.dirname(__filename));
  const WD = path.resolve(ROOT, 'work', TS);
  const RD = path.resolve(ROOT, 'result', TS);
  const toughest = path.resolve(ROOT, 'result', '2025-09-10-12-49', '2025-09-10-12-49.txt');
  if(!fs.existsSync(toughest)){
    console.error('Toughest opponent not found:', toughest);
    process.exit(1);
  }

  const variants = makeKnobs();
  let best=null;
  for(const v of variants){
    const code = buildTeam('Ares-'+v.tag, v.knobs);
    const file = path.join(WD, `focus_${v.tag}.js`);
    fs.writeFileSync(file, code);
    const res = evaluate(file, toughest, 40, 33333, 8);
    const wr = +(res.wr).toFixed(3);
    console.log(`[focus] ${path.basename(file)} vs ${path.basename(toughest)} -> wr=${wr}`);
    if(!best || res.wr>best.wr){ best={ wr:res.wr, file, tag:v.tag, res } }
  }

  // If best beats 0.5 vs toughest, promote as final
  const outFile = path.join(RD, TS+'.txt');
  const finalCode = fs.readFileSync(best.file,'utf8');
  fs.writeFileSync(outFile, finalCode);

  const md = [];
  md.push('');
  md.push('---');
  md.push('');
  md.push('Focus optimization vs toughest opponent:');
  md.push(`- Opponent: ${path.relative(ROOT, toughest)}`);
  md.push(`- Best Variant: ${best.tag}`);
  md.push(`- WR: ${best.wr.toFixed(3)} (wins=${best.res.wins}, losses=${best.res.losses}, draws=${best.res.draws})`);
  fs.appendFileSync(path.join(WD,'RESULT.md'), '\n'+md.join('\n'));
}

if(require.main===module){
  main();
}

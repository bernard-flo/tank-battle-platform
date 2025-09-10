#!/usr/bin/env node
// Refine parameters against strongest recent opponents
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const WORKDIR = __dirname;
const REPO = path.resolve(WORKDIR, '..', '..');
const SIM_CLI = path.join(REPO, 'simulator', 'cli.js');

function nproc(){ try { return os.cpus().length; } catch { return 2; } }
function getTimestamp(){ try { return fs.readFileSync(path.join(WORKDIR,'.timestamp'),'utf8').trim(); } catch { return path.basename(WORKDIR); } }
const TS = getTimestamp();
const FINAL_FILE = path.join(REPO,'result',TS,`${TS}.txt`);

function parseBestParams(){
  const md = fs.readFileSync(path.join(WORKDIR,'RESULT.md'),'utf8');
  const m = md.match(/```json\n([\s\S]*?)\n```/);
  if(!m) throw new Error('Best params JSON not found in RESULT.md');
  return JSON.parse(m[1]);
}

function generateTeamCode(presetName, params){
  function block(name,type,P,idx){
    const Pjson = JSON.stringify(P);
    return `function name(){return "${name}";}\nfunction type(){return ${type};}\nlet __s_${idx}={last:null,tick:0,lastVel:null,side:((${idx}*17)%2?1:-1)};\nfunction update(tank,enemies,allies,bulletInfo){\nconst H=Math.hypot,D=(x,y)=>Math.atan2(y,x)*180/Math.PI,N=(a)=>{a%=360;if(a<0)a+=360;return a;},CL=(v,l,h)=>v<l?l:v>h?h:v;\nconst P=${Pjson}; const S=__s_${idx}; S.tick=(S.tick||0)+1;\nlet tgt=null,best=1e18; for(const e of enemies){ const tw=(e.health<=P.finisherHP?-80:0)+(P.prefDealer?(e.type===2?-10:0):0)+(P.prefNormal?(e.type===0?-6:0):0); const k=e.health*P.healthW+e.distance*P.distW+(e.x+e.y)*(P.tieBias||0)+tw; if(k<best){best=k;tgt=e;} }\nif(tgt){ let ax=tgt.x,ay=tgt.y,vx=0,vy=0; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0,lvy=S.lastVel?S.lastVel.vy:0; const ivx=(tgt.x-S.last.x),ivy=(tgt.y-S.last.y); vx=lvx*0.5+ivx*0.5; vy=lvy*0.5+ivy*0.5; S.lastVel={vx,vy}; const rx=tgt.x-tank.x,ry=tgt.y-tank.y,s2=64; const aa=vx*vx+vy*vy-s2,bb=2*(rx*vx+ry*vy),cc=rx*rx+ry*ry; let tHit=0; if(Math.abs(aa)<1e-6){ tHit=bb!==0?CL(-cc/bb,0,P.leadCap):0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc),t1=(-bb-sd)/(2*aa),t2=(-bb+sd)/(2*aa); const tc=t1>0&&t2>0?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); tHit=CL(tc,0,P.leadCap);} } ax=tgt.x+vx*P.leadW*tHit; ay=tgt.y+vy*P.leadW*tHit; } const jitter=(((S.tick*13+tank.x*7+tank.y*3+${idx}*11)%23)-11)*0.07*(P.aimJitter||0)+(P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y)+jitter); S.last={x:tgt.x,y:tgt.y}; }\nlet moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };\nlet hot=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x,dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v,ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx,py=b.y-proj*ny; const dist=H(px-tank.x,py-tank.y); const tt=proj/v; const s=dist+tt*(P.threatH||4); if(dist<P.threatR && s<score){ score=s; hot=b; } } }\nif(hot){ const a=D(hot.vx,hot.vy); const side=(S.side||1)*P.fleeBias+(P.bias||0)*0.5; for(const c of [a+90+side,a-90-side,a+120,a-120,a+70,a-70,a+150,a-150]){ if(go(c)) return; } }\nif(tank.x<P.edge){ if(go(0)) return;} if(tank.x>900-P.edge){ if(go(180)) return;} if(tank.y<P.edge){ if(go(90)) return;} if(tank.y>600-P.edge){ if(go(270)) return;}\nlet near=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } } if(near && ad<P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }\nif(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=P.rMin,r1=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(120,r0-(P.aggrIn||30)); r1=Math.max(160,r1-(P.aggrOut||20)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; } else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; } else { const s=to+((S.side||1)*P.strafe)+(P.bias||0)*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; } }\nfor(const s of [0,60,120,180,240,300]){ if(go(s+(P.bias||0))) return; } }`;
  }
  const roles=[
    ['T1','Type.TANKER',params.tanker,0],
    ['D2','Type.DEALER',params.dealer,1],
    ['N3','Type.NORMAL',params.normal,2],
    ['N4','Type.NORMAL',params.normal2||params.normal,3],
    ['D5','Type.DEALER',params.dealer2||params.dealer,4],
    ['N6','Type.NORMAL',params.normal3||params.normal,5],
  ];
  return roles.map(([suffix,typ,P,idx])=>block('HeliosX-'+suffix,typ,P,idx)).join('\n\n// ===== 다음 로봇 =====\n\n');
}

function write(file, content){ fs.writeFileSync(file, content); }
function listRecentOpponents() {
  const base = path.join(REPO,'result');
  const arr = [];
  for (const entry of fs.readdirSync(base)){
    const p = path.join(base, entry);
    const st = fs.statSync(p);
    if (st.isFile() && p.endsWith('.txt')) arr.push(p);
    else if (st.isDirectory()) for (const f of fs.readdirSync(p)) if (f.endsWith('.txt')) arr.push(path.join(p,f));
  }
  // Sort by mtime desc and take top N as "strongest"
  arr.sort((a,b)=>fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return arr.slice(0, 3).filter(p=>path.resolve(p)!==path.resolve(FINAL_FILE));
}

function runBatch(red, blue, repeat=24, seed=4242, conc=Math.min(8,nproc())){
  const tmp = path.join(WORKDIR, `ref_${path.basename(blue).replace(/\W+/g,'_')}_${repeat}.json`);
  execFileSync('node', [SIM_CLI,'--red',red,'--blue',blue,'--repeat',String(repeat),'--seed',String(seed),'--json',tmp,'--runner','secure','--fast','--concurrency',String(conc)], {stdio:['ignore','pipe','pipe']});
  const d = JSON.parse(fs.readFileSync(tmp,'utf8')); try { fs.unlinkSync(tmp); } catch {}
  const a = d.aggregate; return { w:a.redWins, l:a.blueWins, d:a.draws, m:a.matches };
}

function mutate(p, scale){
  const q = JSON.parse(JSON.stringify(p));
  for (const role of ['tanker','dealer','normal']){
    const R = q[role];
    for (const k of Object.keys(R)){
      const v = R[k]; if (typeof v!== 'number') continue;
      const step = (/rMin|rMax|threatR|sep|edge/.test(k) ? 5 : /strafe|aggrIn|aggrOut|finisherHP/.test(k) ? 2.5 : 0.05);
      R[k] = +(v + (Math.random()*2-1)*step*scale).toFixed(3);
    }
  }
  q.normal2 = Object.assign({}, q.normal, { bias: (q.normal.bias||0)+12 });
  q.dealer2 = Object.assign({}, q.dealer, { bias: (q.dealer.bias||0)-12 });
  q.normal3 = Object.assign({}, q.normal, { bias: (q.normal.bias||0)+6 });
  return q;
}

function main(){
  const base = parseBestParams();
  const opponents = listRecentOpponents();
  if (opponents.length === 0) return;
  const tmp = path.join(WORKDIR,'ref_candidate.js');
  const population = [base];
  for (let i=0;i<18;i++) population.push(mutate(base, 1 + 0.08*i));
  let best = { score: -1, code: null, params: null };
  for (let i=0;i<population.length;i++){
    const p = population[i];
    const code = generateTeamCode('HeliosX', p); write(tmp, code);
    let W=0,M=0; for (const opp of opponents){ const r = runBatch(tmp, opp, 24, 24680); W+=r.w; M+=r.m; }
    const wr = W/(M||1);
    if (wr>best.score){ best={ score:wr, code, params:p }; }
    console.log(`[refine] cand ${i+1}/${population.length} vs ${opponents.length} opp -> ${(wr*100).toFixed(1)}%`);
  }
  // If improved against strong opponents, overwrite final
  const currentCode = fs.readFileSync(FINAL_FILE,'utf8');
  if (best.score>0.55){ // accept only noticeable improvements
    fs.writeFileSync(FINAL_FILE, best.code);
    fs.appendFileSync(path.join(WORKDIR,'RESULT.md'), `\n\n## Refinement\n- Targeted strongest opponents: ${opponents.map(p=>path.basename(p)).join(', ')}\n- Achieved WinRate vs targets: ${(best.score*100).toFixed(1)}%\n`);
  } else {
    console.log('[refine] No clear improvement, keeping previous final code.');
  }
}

if (require.main===module){ main(); }


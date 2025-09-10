/* Simple tuner: tries a few candidates against a fixed opponent pool using simulator runner=fast */
const fs=require('fs');
const { execSync } = require('child_process');
const path=require('path');

const ts='2025-09-10-11-35';
const resultDir=path.resolve('result', ts);
const teamOut=path.join(resultDir, ts+'.txt');

const opponents=[
  'result/2025-09-10-11-23/2025-09-10-11-23.txt',
  'result/2025-09-10-11-16/2025-09-10-11-16.txt',
  'result/2025-09-10-11-10/2025-09-10-11-10.txt',
  'result/2025-09-10-11-02/2025-09-10-11-02.txt',
  'result/2025-09-10-10-26/2025-09-10-10-26.txt',
  'result/2025-09-10-09-15/2025-09-10-09-15.txt',
  'result/2025-09-10-08-54/2025-09-10-08-54.txt',
];

function codeForParams(Ps){
  // Returns 6-robot code string using given param objects P1..P6 and role types
  function robot(idx, name, type, P){
    const seed=idx; // deterministic bias seeds per slot
    return `function name(){return \"${name}\";}\nfunction type(){return ${type};}\nlet __state={last:null,lastVel:null,tick:0};\nfunction update(tank,enemies,allies,bulletInfo){\n  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI, H=Math.hypot;\n  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;}, clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;\n  const rnd=((tank.x*97+tank.y*131+${seed})|0)%2?1:-1; const P=${JSON.stringify(P)};\n  __state.tick=(__state.tick||0)+1;\n  let tgt=null,b=1e9; for(const e of enemies){ const k=e.health*P.healthW + e.distance*P.distW; if(k<b){b=k;tgt=e;} }\n  if(tgt){ let ax=tgt.x, ay=tgt.y; if(__state.last){ const vx=tgt.x-__state.last.x, vy=tgt.y-__state.last.y; const lvx=__state.lastVel?__state.lastVel.vx:0, lvy=__state.lastVel?__state.lastVel.vy:0; const svx=lvx*0.55+vx*0.45, svy=lvy*0.55+vy*0.45; __state.lastVel={vx:svx,vy:svy}; const d=H(tgt.x-tank.x,tgt.y-tank.y); const t=clamp(d/8,0,P.leadCap); ax=tgt.x+svx*P.leadW*t; ay=tgt.y+svy*P.leadW*t; } const jitter=((((tank.x*31+tank.y*17+${seed})%23)-11)*0.07)*P.aimJitter; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); __state.last={x:tgt.x,y:tgt.y}; }\n  let tries=0; const go=(a)=>{tries++; return tank.move(norm(a));};\n  // multi-bullet avoidance: consider the most imminent threat by time-to-closest-approach heuristic\n  let hot=null,score=1e9; for(const bu of bulletInfo){ const dx=bu.x-tank.x, dy=bu.y-tank.y; const v=H(bu.vx,bu.vy)||1; const nx=bu.vx/v, ny=bu.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=bu.x-proj*nx, py=bu.y-proj*ny; const d=H(px-tank.x,py-tank.y); const tt=proj/v; const sc=d + tt*4; if(d<P.threatR && sc<score){ score=sc; hot=bu; } } }\n  if(hot){ const a=toDeg(hot.vx,hot.vy); const side=(rnd>0?1:-1)*P.fleeBias + P.bias*0.6; const cand=[a+90+side, a-90-side, a+120, a-120, a+70, a-70, a+150, a-150]; for(const c of cand){ if(go(c)) return; } }\n  if(tank.x<P.edge){ if(go(0))return; } if(tank.x>900-P.edge){ if(go(180))return; } if(tank.y<P.edge){ if(go(90))return; } if(tank.y>600-P.edge){ if(go(270))return; }\n  let near=null,ad=1e9; for(const a of allies){ if(a.distance<ad){ad=a.distance;near=a;} } if(near && ad<P.sep){ const away=toDeg(tank.x-near.x,tank.y-near.y); if(go(away))return; if(go(away+22))return; if(go(away-22))return; }\n  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let minR=P.rMin, maxR=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ minR-=P.aggrIn; maxR-=P.aggrOut; } if(d<minR){ const away=to+180+P.bias*0.4; if(go(away))return; if(go(away+18))return; if(go(away-18))return; } else if(d>maxR){ if(go(to))return; if(go(to+14))return; if(go(to-14))return; } else { const side=to + ((((tank.x*13+tank.y*7+${seed})|0)%2)?P.strafe:-P.strafe) + P.bias*0.5; if(go(side))return; if(go(side+16))return; if(go(side-16))return; } }\n  const sweep=[0,45,90,135,180,225,270,315]; for(const s of sweep){ if(go(s+P.bias)) return; }\n}`;
  }
  const t1=robot(1,'AquilaX-1','Type.TANKER', Ps[0]);
  const t2=robot(2,'AquilaX-2','Type.TANKER', Ps[1]);
  const t3=robot(3,'AquilaX-3','Type.NORMAL', Ps[2]);
  const t4=robot(4,'AquilaX-4','Type.NORMAL', Ps[3]);
  const t5=robot(5,'AquilaX-5','Type.DEALER', Ps[4]);
  const t6=robot(6,'AquilaX-6','Type.DEALER', Ps[5]);
  return [t1,t2,t3,t4,t5,t6].join('\n\n// ===== 다음 로봇 =====\n\n');
}

// Candidate parameter sets (hand-tuned variants)
const base={ rMin:170, rMax:270, strafe:28, threatR:170, fleeBias:16, sep:62, edge:50, leadCap:14, leadW:0.95, aimJitter:0.16, healthW:1.23, distW:0.14, finisherHP:28, aggrRemain:3, aggrIn:24, aggrOut:16, bias:0 };
function clone(o){ return JSON.parse(JSON.stringify(o)); }

const candidates=[
  { name:'v3a-balanced', P:[ (()=>{let p=clone(base); p.rMin=168;p.rMax=268;p.bias=-8;p.threatR=185; return p;})(), (()=>{let p=clone(base); p.rMin=176;p.rMax=276;p.bias=12;p.threatR=190; return p;})(), (()=>{let p=clone(base); p.rMin=190;p.rMax=300;p.strafe=26;p.bias=-6; return p;})(), (()=>{let p=clone(base); p.rMin=196;p.rMax=306;p.strafe=26;p.bias=8; return p;})(), (()=>{let p=clone(base); p.rMin=240;p.rMax=360;p.strafe=32;p.threatR=140;p.aimJitter=0.12;p.bias=-12; return p;})(), (()=>{let p=clone(base); p.rMin=246;p.rMax=368;p.strafe=32;p.threatR=145;p.aimJitter=0.12;p.bias=10; return p;})() ] },
  { name:'v3b-aggressive', P:[ (()=>{let p=clone(base); p.rMin=150;p.rMax=250;p.strafe=30;p.bias=-12;p.aggrIn=32;p.aggrOut=22;p.finisherHP=34; return p;})(), (()=>{let p=clone(base); p.rMin=158;p.rMax=260;p.strafe=30;p.bias=14;p.aggrIn=32;p.aggrOut=22;p.finisherHP=34; return p;})(), (()=>{let p=clone(base); p.rMin=180;p.rMax=290;p.strafe=28;p.bias=-8; return p;})(), (()=>{let p=clone(base); p.rMin=186;p.rMax=296;p.strafe=28;p.bias=6; return p;})(), (()=>{let p=clone(base); p.rMin=228;p.rMax=350;p.strafe=34;p.threatR=130;p.bias=-14; return p;})(), (()=>{let p=clone(base); p.rMin=236;p.rMax=356;p.strafe=34;p.threatR=130;p.bias=12; return p;})() ] },
  { name:'v3c-kite', P:[ (()=>{let p=clone(base); p.rMin=180;p.rMax=290;p.strafe=24;p.fleeBias=18;p.bias=-6; return p;})(), (()=>{let p=clone(base); p.rMin=188;p.rMax=298;p.strafe=24;p.fleeBias=18;p.bias=10; return p;})(), (()=>{let p=clone(base); p.rMin=210;p.rMax=320;p.strafe=22;p.fleeBias=18;p.bias=-8; return p;})(), (()=>{let p=clone(base); p.rMin=216;p.rMax=328;p.strafe=22;p.fleeBias=18;p.bias=8; return p;})(), (()=>{let p=clone(base); p.rMin=252;p.rMax=370;p.strafe=30;p.threatR=135;p.bias=-10; return p;})(), (()=>{let p=clone(base); p.rMin=258;p.rMax=376;p.strafe=30;p.threatR=135;p.bias=10; return p;})() ] },
  { name:'v3d-pressure', P:[ (()=>{let p=clone(base); p.rMin=145;p.rMax=240;p.strafe=30;p.fleeBias=14;p.aggrIn=34;p.aggrOut=24;p.finisherHP=36;p.bias=-10; return p;})(), (()=>{let p=clone(base); p.rMin=150;p.rMax=246;p.strafe=30;p.fleeBias=14;p.aggrIn=34;p.aggrOut=24;p.finisherHP=36;p.bias=12; return p;})(), (()=>{let p=clone(base); p.rMin=172;p.rMax=282;p.strafe=28;p.bias=-6; return p;})(), (()=>{let p=clone(base); p.rMin=178;p.rMax=288;p.strafe=28;p.bias=8; return p;})(), (()=>{let p=clone(base); p.rMin=220;p.rMax=340;p.strafe=34;p.threatR=130;p.bias=-12; return p;})(), (()=>{let p=clone(base); p.rMin=228;p.rMax=348;p.strafe=34;p.threatR=130;p.bias=10; return p;})() ] },
];

const simsDir=path.resolve('work', ts, 'auto_sims');
fs.mkdirSync(simsDir, { recursive: true });

let best=null;
for(const cand of candidates){
  const code=codeForParams(cand.P);
  fs.writeFileSync(teamOut, code);
  // commit change per requirement (only if changed)
  execSync(`git add ${JSON.stringify(teamOut)}`);
  try {
    execSync(`git diff --cached --quiet || git commit -m ${JSON.stringify(`tune: candidate ${cand.name} -> ${path.relative('.',teamOut)}`)}`);
  } catch {}

  let wins=0,total=0;
  for(const opp of opponents){
    const bn=path.basename(path.dirname(opp));
    const redOut=path.join(simsDir, `red_vs_${cand.name}_${bn}.json`);
    const blueOut=path.join(simsDir, `blue_vs_${cand.name}_${bn}.json`);
    execSync(`node simulator/cli.js --red ${JSON.stringify(teamOut)} --blue ${JSON.stringify(opp)} --repeat 40 --seed 7000 --runner fast --fast --concurrency 8 --json ${JSON.stringify(redOut)} > /dev/null`);
    execSync(`node simulator/cli.js --red ${JSON.stringify(opp)} --blue ${JSON.stringify(teamOut)} --repeat 40 --seed 8000 --runner fast --fast --concurrency 8 --json ${JSON.stringify(blueOut)} > /dev/null`);
    const a=JSON.parse(fs.readFileSync(redOut,'utf8')).aggregate;
    const b=JSON.parse(fs.readFileSync(blueOut,'utf8')).aggregate;
    wins += a.redWins + b.blueWins;
    total += a.matches + b.matches;
  }
  cand.score = wins/total;
  console.log(cand.name, 'score', cand.score.toFixed(3));
  if(!best || cand.score>best.score){ best={ name:cand.name, score:cand.score, code } }
}

// finalize with best
if(best){
  fs.writeFileSync(teamOut, best.code);
  execSync(`git add ${JSON.stringify(teamOut)}`);
  execSync(`git commit -m ${JSON.stringify(`feat: finalize best ${best.name} (winRate ${(best.score*100).toFixed(1)}%)`)}`);
  fs.writeFileSync(path.resolve('work', ts, 'BEST.txt'), `Best: ${best.name}\nWinRate: ${(best.score*100).toFixed(2)}%\n`);
  execSync(`git add ${JSON.stringify(path.resolve('work', ts, 'BEST.txt'))}`);
  execSync(`git commit -m ${JSON.stringify('chore: write BEST summary')} `);
}

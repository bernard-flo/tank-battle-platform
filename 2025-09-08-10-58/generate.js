/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { runBattle } = require('../tools/simulate');

function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

// Build a single robot code string based on weights and role type
function buildRobotCode(name, typeId, W) {
  // W is object with weights for movement vectors
  const code = `function name(){return ${JSON.stringify(name)};}
function type(){return ${typeId};}
function update(tank,enemies,allies,bulletInfo){
  function ang(a){return (a+360)%360;}
  function deg(x,y){return Math.atan2(y,x)*180/Math.PI;}
  function nrm(x,y){const m=Math.hypot(x,y)+1e-6; return [x/m,y/m];}
  const Wd=900,Hd=600;

  // 타겟 선정: 거리+체력 페널티
  let target=null,best=1e9; for(const e of enemies){ const k=e.distance + ${W.targetHpBias.toFixed(6)}*e.health; if(k<best){best=k; target=e;} }

  // 총알 회피 (닫히는 탄만 수직 회피)
  let evx=0,evy=0; for(const b of bulletInfo){ const rx=b.x-tank.x, ry=b.y-tank.y; const d=Math.hypot(rx,ry)+1e-6; const bv=Math.hypot(b.vx,b.vy)+1e-6; const ux=b.vx/bv, uy=b.vy/bv; const closing=-(rx*ux+ry*uy)/d; if(closing>0){ const px=-uy, py=ux; const w=closing/(1+${W.bulletDistFalloff.toFixed(6)}*d); evx+=px*w; evy+=py*w; } } ;[evx,evy]=nrm(evx,evy);

  // 벽 회피
  let wx=0,wy=0; const m=${Math.round(W.wallMargin)}; if(tank.x<m) wx+=1-tank.x/m; if(Wd-tank.x<m) wx-=1-(Wd-tank.x)/m; if(tank.y<m) wy+=1-tank.y/m; if(Hd-tank.y<m) wy-=1-(Hd-tank.y)/m; ;[wx,wy]=nrm(wx,wy);

  // 아군 응집/분리
  let ax=0,ay=0; for(const a of allies){ax+=a.x; ay+=a.y;} const ac=allies.length?1/allies.length:0; ax*=ac; ay*=ac; let cx=ax?ax-tank.x:0, cy=ay?ay-tank.y:0; ;[cx,cy]=nrm(cx,cy);
  let sx=0,sy=0; for(const a of allies){ const dx=tank.x-a.x, dy=tank.y-a.y; const d=Math.hypot(dx,dy)+1e-6; if(d<${Math.round(W.separationRadius)}){ sx+=dx/(d*d); sy+=dy/(d*d);} } ;[sx,sy]=nrm(sx,sy);

  // 공격/견제
  let atx=0,aty=0, obx=0,oby=0; if(target){ atx=(target.x-tank.x); aty=(target.y-tank.y); const n=Math.hypot(atx,aty)+1e-6; atx/=n; aty/=n; obx=-aty; oby=atx; }

  // 가중합 이동 벡터
  const mvx = evx*${W.wEvade.toFixed(6)} + wx*${W.wWall.toFixed(6)} + atx*${W.wAttack.toFixed(6)} + obx*${W.wOrbit.toFixed(6)} + cx*${W.wCohesion.toFixed(6)} + sx*${W.wSeparation.toFixed(6)};
  const mvy = evy*${W.wEvade.toFixed(6)} + wy*${W.wWall.toFixed(6)} + aty*${W.wAttack.toFixed(6)} + oby*${W.wOrbit.toFixed(6)} + cy*${W.wCohesion.toFixed(6)} + sy*${W.wSeparation.toFixed(6)};
  const mvAng = deg(mvx,mvy);

  // 사격: 근사 리드 + 지터
  if(target){ const base=target.angle; const jitter=${W.aimJitter.toFixed(6)}*(Math.random()-0.5); const aim=ang(base+jitter); tank.fire(aim); }

  // 이동: 실패시 회피 각도 재시도
  if(!tank.move(ang(mvAng))){ if(!tank.move(ang(mvAng+${Math.round(W.fallbackAngle)}))){ if(!tank.move(ang(mvAng-${Math.round(W.fallbackAngle)}))){ tank.move(Math.random()*360); } } }
}`;
  return code;
}

function buildTeamCode(W, names, types) {
  const blocks = [];
  for (let i = 0; i < 6; i++) {
    blocks.push(buildRobotCode(names[i] || `Bot${i+1}`, types[i] ?? 0, W));
  }
  return blocks.join('\n\n// ===== 다음 로봇 =====\n\n');
}

function defaultWeights() {
  return {
    wEvade: 1.25,
    wWall: 0.9,
    wAttack: 0.8,
    wOrbit: 0.55,
    wCohesion: 0.12,
    wSeparation: 0.35,
    separationRadius: 90,
    wallMargin: 70,
    aimJitter: 7.0,
    fallbackAngle: 65,
    bulletDistFalloff: 0.06,
    targetHpBias: -0.02,
  };
}

function neighborWeights(W) {
  // Small random perturbations
  const rand = (s, r) => s + (Math.random()*2-1)*r;
  const clip = (x, a, b) => Math.max(a, Math.min(b, x));
  return {
    ...W,
    wEvade: clip(rand(W.wEvade, 0.2), 0.5, 2.0),
    wWall: clip(rand(W.wWall, 0.2), 0.2, 1.5),
    wAttack: clip(rand(W.wAttack, 0.2), 0.3, 1.5),
    wOrbit: clip(rand(W.wOrbit, 0.2), 0.1, 1.2),
    wCohesion: clip(rand(W.wCohesion, 0.08), 0.0, 0.6),
    wSeparation: clip(rand(W.wSeparation, 0.1), 0.1, 0.8),
    separationRadius: clip(rand(W.separationRadius, 12), 50, 140),
    wallMargin: clip(rand(W.wallMargin, 10), 40, 120),
    aimJitter: clip(rand(W.aimJitter, 2.0), 0.0, 12.0),
    fallbackAngle: clip(rand(W.fallbackAngle, 10), 30, 100),
    bulletDistFalloff: clip(rand(W.bulletDistFalloff, 0.02), 0.02, 0.12),
    targetHpBias: clip(rand(W.targetHpBias, 0.01), -0.05, 0.05),
  };
}

function pickOpponents(resultDir, maxOpp=3) {
  const files = fs.readdirSync(resultDir)
    .filter(f => f.endsWith('.txt'))
    .map(f => ({ f, m: fs.statSync(path.join(resultDir, f)).mtimeMs }))
    .sort((a,b) => b.m - a.m)
    .map(x => path.join(resultDir, x.f));
  // Skip the very latest to avoid self-match from current run if any
  return files.slice(0, maxOpp);
}

async function evaluateWeights(W, opponents) {
  const names = ['Ares','Bison','Cerberus','Drake','Eagle','Falcon'];
  const types = [1,2,0,1,2,0]; // mix: Tanker, Dealer, Normal
  const ourTeam = buildTeamCode(W, names, types);
  let wins = 0;
  for (const opp of opponents) {
    const blueCodesText = fs.readFileSync(opp, 'utf-8');
    // Split here to avoid parsing in page
    const redCodes = require('../tools/simulate').splitRobotCodes(ourTeam);
    const blueCodes = require('../tools/simulate').splitRobotCodes(blueCodesText);
    const { winner } = await runBattle({ redCodes, blueCodes, headless: 'new', timeoutMs: 20000 });
    wins += (winner === 'red') ? 1 : 0;
  }
  return { wins, teamCode: ourTeam };
}

async function main() {
  const resultDir = path.resolve('result');
  if (!fs.existsSync(resultDir)) fs.mkdirSync(resultDir, { recursive: true });
  const tsName = path.basename(path.resolve('.'));
  const outPath = path.resolve('..', 'result', `${tsName}.txt`);

  const opponents = pickOpponents(resultDir, 3);
  if (opponents.length === 0) {
    console.log('No opponents found; generating default team.');
    const W = defaultWeights();
    const names = ['Ares','Bison','Cerberus','Drake','Eagle','Falcon'];
    const types = [1,2,0,1,2,0];
    const teamCode = buildTeamCode(W, names, types);
    fs.writeFileSync(outPath, teamCode);
    console.log('Wrote', outPath);
    return;
  }

  // Candidates: base + two neighbors
  const base = defaultWeights();
  const candidates = [base, neighborWeights(base), neighborWeights(base)];

  let best = { wins: -1, teamCode: '', W: null };
  for (const W of candidates) {
    const res = await evaluateWeights(W, opponents);
    console.log('Candidate', W, 'wins', res.wins, '/', opponents.length);
    if (res.wins > best.wins) best = { ...res, W };
  }

  fs.writeFileSync(outPath, best.teamCode);
  console.log('Wrote', outPath, 'with wins', best.wins);
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}


#!/usr/bin/env node
// 후보 팀 생성 -> 간이 시뮬레이션 -> 최적 팀 선택 -> 결과물 생성

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { runMatch, parseTeamFile, Type } = require('./simulator');

function sh(cmd) {
  return cp.execSync(cmd, { stdio: ['ignore','pipe','pipe'] }).toString().trim();
}

function timestamp() {
  try { return sh("date +%F-%H-%M"); } catch(e) {
    // fallback
    const d = new Date();
    const pad = n => String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(d.getMinutes())}`;
  }
}

// 공통 업데이트 코드 템플릿 (파라미터화)
function makeBotCode({ botName, typeConst, engageDist, kiteDist, dodgeAgg, strafeBias }) {
  // engageDist: 접근하고자 하는 거리, kiteDist: 이 거리보다 가까우면 회피
  // dodgeAgg: 총알 회피 민감도 (거리 임계)
  // strafeBias: 사격 방향 기준 좌우 움직임 바이어스
  return `function name(){return "${botName}";}
function type(){return ${typeConst};}
function update(tank,enemies,allies,bulletInfo){
  function ang(a){a%=360; if(a<0)a+=360; return a;}
  function deg(x,y){return Math.atan2(y,x)*180/Math.PI;}
  function nrm(x,y){const m=Math.hypot(x,y)||1; return [x/m,y/m];}
  function closest(arr){let r=null,md=1e9; for(const e of arr){if(e.distance<md){md=e.distance;r=e;}} return r;}
  function threat(b){ // 우리쪽으로 접근 중이고, 경로가 근접할 총알만 위협으로 간주
    const dx=b.x-tank.x, dy=b.y-tank.y; const dv=Math.hypot(b.vx,b.vy)||1; const nx=b.vx/dv, ny=b.vy/dv;
    const proj = dx*nx+dy*ny; if(proj>0){ // 앞으로 진행 중
      const px=b.x-proj*nx, py=b.y-proj*ny; // 최근접점
      const d=Math.hypot(px-tank.x,py-tank.y); return d<(${dodgeAgg});
    } return false;
  }
  const tgt = enemies.length?closest(enemies):null;
  if(tgt){
    // 사격: 목표 각도에 소폭 흔들림
    const base = deg(tgt.x-tank.x,tgt.y-tank.y);
    const jitter = ((tank.x*31+tank.y*17)%23-11)*0.3; // 결정적 난수
    tank.fire(base + jitter);
  }
  // 이동 우선순위: 총알 회피 > 팀과 간격 유지 > 교전/카이팅
  let tried=0; function tryMove(a){tried++; return tank.move(ang(a));}
  // 총알 회피: 가장 위협적인 탄 회피 각
  let dodge=null, minD=1e9, hot=null;
  for(const b of bulletInfo){const d=Math.hypot(b.x-tank.x,b.y-tank.y); if(d<minD && threat(b)){minD=d; hot=b;}}
  if(hot){
    // 총알 진행 벡터에 수직으로 회피, 살짝 전진/후퇴 바이어스
    const a = deg(hot.vx,hot.vy);
    const cand=[a+90+(${strafeBias}), a-90-(${strafeBias}), a+110, a-110];
    for(const c of cand){ if(tryMove(c)) return; }
  }
  // 아군과 충돌/군집 회피: 가장 가까운 아군에서 멀어지기
  if(allies.length){
    const ally = closest(allies);
    if(ally && ally.distance < 60){
      const av = deg(tank.x-ally.x, tank.y-ally.y);
      if(tryMove(av)) return; if(tryMove(av+30)) return; if(tryMove(av-30)) return;
    }
  }
  // 교전/카이팅
  if(tgt){
    const d = tgt.distance; const to = deg(tgt.x-tank.x,tgt.y-tank.y);
    if(d < ${kiteDist}){
      // 카이팅: 거리 벌리기 + 원운동
      const away = to+180 + (${strafeBias});
      if(tryMove(away)) return; if(tryMove(away+25)) return; if(tryMove(away-25)) return;
    } else if(d > ${engageDist}) {
      // 접근
      if(tryMove(to)) return; if(tryMove(to+20)) return; if(tryMove(to-20)) return;
    } else {
      // 측면 이동으로 사선 유지
      const side = to + (${strafeBias});
      if(tryMove(side)) return; if(tryMove(side+20)) return; if(tryMove(side-20)) return;
    }
  }
  // 마지막 수단: 가장 여유 공간 쪽 임의 이동
  const pref=[0,90,180,270];
  for(const p of pref){ if(tryMove(p+(${strafeBias}))) return; }
}
`;
}

function makeCandidatePhalanx() {
  const bots = [];
  bots.push(makeBotCode({ botName: 'Phalanx-T1', typeConst: 'Type.TANKER', engageDist: 260, kiteDist: 160, dodgeAgg: 65, strafeBias: -10 }));
  bots.push(makeBotCode({ botName: 'Phalanx-T2', typeConst: 'Type.TANKER', engageDist: 260, kiteDist: 160, dodgeAgg: 65, strafeBias: 10 }));
  bots.push(makeBotCode({ botName: 'Phalanx-D1', typeConst: 'Type.DEALER', engageDist: 330, kiteDist: 220, dodgeAgg: 70, strafeBias: 25 }));
  bots.push(makeBotCode({ botName: 'Phalanx-D2', typeConst: 'Type.DEALER', engageDist: 330, kiteDist: 220, dodgeAgg: 70, strafeBias: -25 }));
  bots.push(makeBotCode({ botName: 'Phalanx-D3', typeConst: 'Type.DEALER', engageDist: 330, kiteDist: 220, dodgeAgg: 70, strafeBias: 0 }));
  bots.push(makeBotCode({ botName: 'Phalanx-N1', typeConst: 'Type.NORMAL', engageDist: 300, kiteDist: 200, dodgeAgg: 68, strafeBias: 0 }));
  return bots;
}

function makeCandidateSkirmish() {
  const bots = [];
  bots.push(makeBotCode({ botName: 'Skirmish-T', typeConst: 'Type.TANKER', engageDist: 280, kiteDist: 170, dodgeAgg: 65, strafeBias: 0 }));
  for (let i=1;i<=5;i++) {
    bots.push(makeBotCode({ botName: `Skirmish-D${i}`, typeConst: 'Type.DEALER', engageDist: 360, kiteDist: 240, dodgeAgg: 72, strafeBias: (i%2?30:-30) }));
  }
  return bots;
}

function makeCandidateBulwark() {
  const bots = [];
  bots.push(makeBotCode({ botName: 'Bulwark-T1', typeConst: 'Type.TANKER', engageDist: 250, kiteDist: 150, dodgeAgg: 60, strafeBias: -5 }));
  bots.push(makeBotCode({ botName: 'Bulwark-T2', typeConst: 'Type.TANKER', engageDist: 250, kiteDist: 150, dodgeAgg: 60, strafeBias: 5 }));
  bots.push(makeBotCode({ botName: 'Bulwark-T3', typeConst: 'Type.TANKER', engageDist: 260, kiteDist: 160, dodgeAgg: 62, strafeBias: 0 }));
  bots.push(makeBotCode({ botName: 'Bulwark-D1', typeConst: 'Type.DEALER', engageDist: 320, kiteDist: 210, dodgeAgg: 68, strafeBias: 20 }));
  bots.push(makeBotCode({ botName: 'Bulwark-D2', typeConst: 'Type.DEALER', engageDist: 320, kiteDist: 210, dodgeAgg: 68, strafeBias: -20 }));
  bots.push(makeBotCode({ botName: 'Bulwark-D3', typeConst: 'Type.DEALER', engageDist: 320, kiteDist: 210, dodgeAgg: 68, strafeBias: 0 }));
  return bots;
}

function joinBlocks(blocks) {
  return blocks.map((b,i)=>`${b}\n// ===== 다음 로봇 =====\n`).join('\n');
}

function main() {
  const ts = timestamp();
  const workDir = path.join(process.cwd(), ts);
  if (!fs.existsSync(workDir)) fs.mkdirSync(workDir);

  // 후보 생성 및 저장
  // 기본 후보 + 확장 탐색 후보(무작위 하이퍼파라미터)
  const candidates = [
    { key:'phalanx', blocks: makeCandidatePhalanx() },
    { key:'skirmish', blocks: makeCandidateSkirmish() },
    { key:'bulwark', blocks: makeCandidateBulwark() },
  ];

  // 무작위 탐색 후보 생성 (환경변수로 개수 조절 가능)
  const RND_TEAMS = Math.max(0, Math.min(24, Number(process.env.BNC_RND_TEAMS || '8')));
  function rand(a,b){ return a + Math.random()*(b-a); }
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function makeRandomTeam(i){
    const key = `rnd${String(i+1).padStart(2,'0')}`;
    const bots = [];
    // 2 탱커: 근접 교전용
    for (let k=0;k<2;k++) {
      const engage = clamp(rand(240, 300), 200, 360);
      const kite = clamp(rand(140, 190), 120, engage-60);
      const dodge = clamp(rand(55, 75), 40, 90);
      const strafe = rand(-20, 20);
      bots.push(makeBotCode({ botName: `E-T${k+1}`, typeConst: 'Type.TANKER', engageDist: Math.round(engage), kiteDist: Math.round(kite), dodgeAgg: Math.round(dodge), strafeBias: Math.round(strafe) }));
    }
    // 3 딜러: 원거리 교전 + 강한 회피
    for (let k=0;k<3;k++) {
      const engage = clamp(rand(320, 380), 260, 420);
      const kite = clamp(rand(210, 260), 180, 320);
      const dodge = clamp(rand(68, 85), 60, 95);
      const strafe = (k%2? rand(15,35): rand(-35,-15));
      bots.push(makeBotCode({ botName: `E-D${k+1}`, typeConst: 'Type.DEALER', engageDist: Math.round(engage), kiteDist: Math.round(kite), dodgeAgg: Math.round(dodge), strafeBias: Math.round(strafe) }));
    }
    // 1 노멀: 유연한 링 전투
    const engage = clamp(rand(280, 330), 220, 360);
    const kite = clamp(rand(190, 230), 150, 300);
    const dodge = clamp(rand(62, 78), 50, 90);
    const strafe = rand(-10, 10);
    bots.push(makeBotCode({ botName: `E-N1`, typeConst: 'Type.NORMAL', engageDist: Math.round(engage), kiteDist: Math.round(kite), dodgeAgg: Math.round(dodge), strafeBias: Math.round(strafe) }));
    return { key, blocks: bots };
  }
  for (let i=0;i<RND_TEAMS;i++) candidates.push(makeRandomTeam(i));
  for (const c of candidates) {
    fs.writeFileSync(path.join(workDir, `${c.key}.txt`), joinBlocks(c.blocks));
  }
  // 커밋: 후보 txt 파일들
  try {
    sh('git add -A');
    sh(`git commit -m "chore: candidate teams generated for ${ts}"`);
  } catch (e) {}

  // 상대팀 로딩 (result/*.txt)
  const resultDir = path.join(process.cwd(), 'result');
  const opponentFiles = (fs.existsSync(resultDir) ? fs.readdirSync(resultDir) : [])
    .filter(f => f.endsWith('.txt'))
    .map(f => path.join(resultDir, f));

  let opponents = opponentFiles.map(fp => ({ fp, blocks: parseTeamFile(fs.readFileSync(fp,'utf8')) }));
  // 상대 과샘플링 방지: 파일명 기준 균등 샘플링
  const maxOpp = Number(process.env.BNC_MAX_OPP || 12);
  if (opponents.length > maxOpp) {
    opponents.sort((a,b)=>path.basename(a.fp).localeCompare(path.basename(b.fp)));
    const step = opponents.length / maxOpp; const sampled=[];
    for (let i=0;i<maxOpp;i++) sampled.push(opponents[Math.floor(i*step)]);
    opponents = sampled;
  }
  if (opponents.length === 0) {
    console.warn('상대 결과물이 없어 자체 비교만 진행합니다.');
  }

  // 평가: 각 후보 vs 각 상대, 양 진영 교차, 여러 시드
  const seeds = (process.env.BNC_SEEDS ? String(process.env.BNC_SEEDS).split(',').map(s=>+s).filter(Boolean) : [1,2]);
  const scores = new Map();
  for (const c of candidates) scores.set(c.key, { wins:0, games:0, detail:[] });

  for (const c of candidates) {
    // 자기자신 미러전도 조금 섞어서 안정성 확인
    const pool = opponents.length ? opponents : [{ fp: 'self', blocks: c.blocks }];
    for (const opp of pool) {
      for (const seed of seeds) {
        const r1 = runMatch(c.blocks, opp.blocks, { seed });
        const r2 = runMatch(opp.blocks, c.blocks, { seed });
        const s = scores.get(c.key);
        s.games += 2;
        if (r1.winner === 'red') s.wins++;
        if (r2.winner === 'blue') s.wins++;
        s.detail.push({ vs: path.basename(opp.fp), seed, r1, r2 });
      }
    }
  }

  // 최고 후보 선정
  const ranked = [...scores.entries()].sort((a,b)=>b[1].wins - a[1].wins);
  const [bestKey, bestScore] = ranked[0];
  const best = candidates.find(c => c.key===bestKey);

  // 결과물 생성
  const outPath = path.join(process.cwd(), 'result', `${ts}.txt`);
  if (!fs.existsSync(path.dirname(outPath))) fs.mkdirSync(path.dirname(outPath));
  fs.writeFileSync(outPath, joinBlocks(best.blocks));

  const summary = { ts, bestKey, wins: bestScore.wins, games: bestScore.games, leaderboard: ranked };
  fs.writeFileSync(path.join(workDir, 'summary.json'), JSON.stringify(summary, null, 2));

  console.log(`[완료] 선택 팀: ${bestKey}  (${bestScore.wins}/${bestScore.games}) -> ${outPath}`);
  // 커밋: 선택 결과 및 요약
  try {
    sh('git add -A');
    sh(`git commit -m "feat(result): selected candidate ${bestKey} for ${ts}"`);
  } catch (e) {}
}

if (require.main === module) {
  main();
}

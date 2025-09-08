// 시뮬레이션을 통해 강한 팀을 선발하고 result/<ts>.txt 로 저장
const fs = require('fs');
const path = require('path');
const { parseCodeBlocks, simulateMatch } = require('./engine');
const { makeTeam, concatTeamCode } = require('./bot_factory');

function pickOpponents(resultDir, maxN = 6) {
  const files = fs.readdirSync(resultDir).filter((f) => f.endsWith('.txt'));
  // 최근 파일 우선으로 샘플링
  files.sort((a, b) => fs.statSync(path.join(resultDir, b)).mtimeMs - fs.statSync(path.join(resultDir, a)).mtimeMs);
  const picked = [];
  for (const f of files) {
    picked.push(path.join(resultDir, f));
    if (picked.length >= maxN) break;
  }
  return picked;
}

function loadOpponent(file) {
  const code = fs.readFileSync(file, 'utf8');
  const blocks = parseCodeBlocks(code).slice(0, 6);
  if (blocks.length < 6) {
    const filler = `function name(){return 'Filler';}\nfunction type(){return 0;}\nfunction update(tank,enemies){ if(enemies.length){ let n=enemies[0]; for(const e of enemies){ if(e.distance<n.distance) n=e; } const a=Math.atan2(n.y-tank.y,n.x-tank.x)*180/Math.PI; tank.fire(a); if(!tank.move(a+180)) tank.move(Math.random()*360);} }`;
    while (blocks.length < 6) blocks.push(filler);
  }
  return blocks;
}

async function main() {
  const tsDir = path.basename(__dirname);
  const resultDir = path.resolve(__dirname, '..', 'result');
  if (!fs.existsSync(resultDir)) fs.mkdirSync(resultDir, { recursive: true });

  const outFile = path.join(resultDir, `${tsDir}.txt`);

  const oppFiles = pickOpponents(resultDir, 6).filter((f) => path.basename(f) !== `${tsDir}.txt`);
  const opponents = oppFiles.map(loadOpponent);
  if (opponents.length) {
    console.log(`[INFO] 비교 대상: ${oppFiles.map((f) => path.basename(f)).join(', ')}`);
  } else {
    console.log('[WARN] 비교 대상 결과물이 없어 자체 검증만 수행합니다.');
  }

  // 후보 탐색: 시드 다양화 + 더 긴 경기 시간으로 안정 평가
  const seeds = Array.from({ length: 40 }, (_, i) => 37 + i * 97);
  let best = { score: -Infinity, seed: null, team: null };

  for (const seed of seeds) {
    const myTeam = makeTeam(seed);
    let total = 0, cnt = 0;
    if (opponents.length === 0) {
      const r1 = simulateMatch(myTeam, myTeam, { durationMs: 14000, seed });
      total += (r1.scoreRed - r1.scoreBlue); cnt += 1;
    } else {
      for (let i = 0; i < opponents.length; i++) {
        const opp = opponents[i];
        const r1 = simulateMatch(myTeam, opp, { durationMs: 14000, seed: seed + i*2 + 1 });
        const r2 = simulateMatch(opp, myTeam, { durationMs: 14000, seed: seed + i*2 + 2 });
        total += (r1.scoreRed - r1.scoreBlue);
        total += (r2.scoreBlue - r2.scoreRed);
        cnt += 2;
      }
    }
    const avg = total / Math.max(1,cnt);
    if (avg > best.score) best = { score: avg, seed, team: myTeam };
    console.log(`[SEED ${seed}] 평균 득점: ${avg.toFixed(2)}`);
  }

  // 최종 코드 저장
  const finalCode = concatTeamCode(best.team);
  fs.writeFileSync(outFile, finalCode);
  console.log(`[DONE] 결과 저장: ${outFile}`);
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}


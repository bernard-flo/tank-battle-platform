// 시뮬레이션 실행 및 최적 후보 선택 후 결과물 생성
const fs = require('fs');
const path = require('path');
const { parseCodeBlocks, simulateMatch } = require('./engine');
const { makeTeam, concatTeamCode } = require('./bot_factory');

async function main() {
  const tsDir = path.basename(__dirname);
  const resultDir = path.resolve(__dirname, '..', 'result');
  if (!fs.existsSync(resultDir)) fs.mkdirSync(resultDir);

  const outFile = path.join(resultDir, `${tsDir}.txt`);

  // 기존 결과물 로드 (자기 결과 제외)
  const files = fs
    .readdirSync(resultDir)
    .filter((f) => f.endsWith('.txt') && f !== `${tsDir}.txt`)
    .map((f) => path.join(resultDir, f));

  const opponents = files.map((file) => {
    const code = fs.readFileSync(file, 'utf8');
    const blocks = parseCodeBlocks(code).slice(0, 6);
    if (blocks.length < 6) {
      // 빈 자리 기본 봇으로 채움 (플랫폼 예제 수준)
      const filler = `function name(){return 'Filler';}\nfunction type(){return 0;}\nfunction update(tank,enemies){ if(enemies.length){ let n=enemies[0]; for(const e of enemies){ if(e.distance<n.distance) n=e; } const a=Math.atan2(n.y-tank.y,n.x-tank.x)*180/Math.PI; tank.fire(a); if(!tank.move(a+180)) tank.move(Math.random()*360);} }`;
      while (blocks.length < 6) blocks.push(filler);
    }
    return { file, blocks };
  });

  if (opponents.length === 0) {
    console.log('[WARN] 비교 대상 결과물이 없어 자체 검증만 수행합니다.');
  } else {
    console.log(`[INFO] 비교 대상: ${opponents.map((o) => path.basename(o.file)).join(', ')}`);
  }

  // 여러 시드로 팀 생성 후 평가
  // 더 촘촘한 시드 탐색으로 강한 팀 선택
  const seeds = Array.from({ length: 24 }, (_, i) => i * 97 + 13);
  let best = { score: -Infinity, seed: null, team: null };

  for (const seed of seeds) {
    const myTeam = makeTeam(seed);
    let totalScore = 0;
    let count = 0;
    if (opponents.length === 0) {
      // 자기자신 미러전 (균형성 체크)
      const r1 = simulateMatch(myTeam, myTeam, { durationMs: 10000, seed });
      totalScore += (r1.scoreRed - r1.scoreBlue);
      count += 1;
    } else {
      for (const opp of opponents) {
        // 양 진영 스왑하여 2판
        const r1 = simulateMatch(myTeam, opp.blocks, { durationMs: 12000, seed: seed + 1 });
        const r2 = simulateMatch(opp.blocks, myTeam, { durationMs: 12000, seed: seed + 2 });
        totalScore += (r1.scoreRed - r1.scoreBlue);
        totalScore += (r2.scoreBlue - r2.scoreRed);
        count += 2;
      }
    }
    const avg = totalScore / Math.max(1, count);
    if (avg > best.score) best = { score: avg, seed, team: myTeam };
    console.log(`[SEED ${seed}] 평균 득점: ${avg.toFixed(2)}`);
  }

  // 최종 코드 저장
  const finalCode = concatTeamCode(best.team);
  fs.writeFileSync(outFile, finalCode);
  console.log(`[DONE] 결과 저장: ${outFile}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

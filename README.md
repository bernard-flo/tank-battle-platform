# glowing-octo-fishstick
250916 테크본부 타운홀 코딩 게임

## Tank Battle AI 사용법

- 전장 실행: `tank_battle_platform.html` 파일을 브라우저로 열기
- 좌측/우측 팀 각 6개 텍스트박스의 Import 버튼으로 코드 일괄 입력 가능
- 우리팀 AI 일괄 코드: `ai/EXPORT_ALL.txt` 파일 전체 복사 → Import에 붙여넣기 → 가져오기
- (튜닝된) OMEGA 팀 코드: `ai/EXPORT_OMEGA.txt` 파일 전체 복사 → Import에 붙여넣기 → 가져오기
  - OMEGA는 강화학습(GA)로 최적화된 6인 스쿼드입니다.
  - 현재 세션 기준 강적 스위트(adversaries) 상대로 400전 샘플 승률 약 56.8% (seed=999)
- 시작: Start 버튼으로 전투 시작, Pause/Reset 사용 가능

## 자동 테스트 (로컬)

- Node 18+ 권장
- 샘플 상대로 평가: `node simulator/test.js [N=50] [seedBase]`
- 강적 상대로 평가: `node simulator/test_vs_adversaries.js [N=100] [seedBase]`
- 임의 라인업 실험: `node simulator/try_team.js <파일1,..,파일6> [N=100] [seedBase] [sample|adversary]`
- 출력: `.result/` 폴더에 성능 요약 저장

### 파라미터 자동 튜닝(GA)

- 빠른 시도(소세대/소게임): `node simulator/train_ga.js 6 10 16 1111` 또는 `npm run train-ga:fast`
- 표준 시도(기본): `node simulator/train_ga.js 12 14 30 4242` 또는 `npm run train-ga:std`
- 산출물: `ai/omega_*.js` 6종 및 `ai/EXPORT_OMEGA*.txt`(세대 스냅샷 포함), `.result/ga_*.json` 요약 저장

> 참고: train_ga는 강적(adversaries) + Hall of Fame self-play 혼합 평가를 사용해 과적합을 줄입니다.

### 현재 OMEGA 성능(샘플)

- 평가 명령: `node simulator/try_team.js omega_bulldozer.js,omega_anchor.js,omega_striker.js,omega_sniper.js,omega_interceptor.js,omega_sweeper.js 400 999 adversary`
- 결과 예시: `{ total: 400, ourWins: 227, oppWins: 173, draws: 0, winRate: 0.5675 }`

## 디렉토리

- `ai/`       6개 탱크 AI 코드 및 Import용 합본
- `simulator/` 간이 시뮬레이터와 테스트 스크립트(강적/라인업 실험 포함)
- `.result/`  세션별 결과 기록(요약/통계)
- `.agent/`   작업 계획/메모 스크래치패드

## 내보내기 파일 갱신

- 합본 생성: `node ai/build_export.js`
- 결과: `ai/EXPORT_ALL.txt` 갱신됨

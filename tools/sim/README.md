# SUPER6 시뮬레이터(초안)

가정 파라미터(엔진):
- WIDTH=800, HEIGHT=600, TANK_R=16, BULLET_R=6
- BULLET_SPEED=400(px/s), FIRE_COOLDOWN=0.5(s)
- TANK_SPEED: NORMAL=120, TANKER=105, DEALER=130 (px/s)
- 고정 시간 스텝 dt=0.016(60Hz)

사용법(예시):
- 단일 매치: `npm run sim`
- 라운드로빈: `npm run rr`
- 파라미터 탐색: `npm run search`

출력 정책:
- 콘솔은 요약 10줄 내, 상세는 results/*.csv 및 summary.json 저장.
- 라운드로빈 CSV 필드: `pair,winA,winB,avgAliveDiff,avgTime` (JSON도 병행 저장)
- 결정성 체크 로그: `[rr-check] seed=<n> deterministic=<true|false> ...` 한 줄

파라미터 주입(PARAMS):
- 경로: `tools/sim/params/<파일키>.json` (예: `02_dealer_sniper.json`)
- 엔진이 각 프레임 `const PARAMS = Object.freeze({...})`로 스니펫에 주입
- 스니펫은 `const P = (typeof PARAMS==='object'&&PARAMS)||{}`로 안전 참조 후 `P.xxx ?? 기본값` 사용

탐색(search) 설정:
- 탐색 공간(기본):
  - `ideal_range`: 180~380
  - `orbit_deg`: 60~120
  - `lead_max_deg`: 4~14
  - `evade_weight`: 0.5~2.0
  - `strafe_deg`: 20~110
- 스코어: `wins + avgTime*0.05`
- 출력: `results/search_<bot>.csv` 전체 기록, 최상해는 `params/<bot>.json`
- Trial 적용: 각 샘플 시작 전에 `params/<bot>.json`을 해당 값으로 덮어쓴 뒤 평가

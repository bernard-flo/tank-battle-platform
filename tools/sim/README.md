# SUPER6 Simulator (tools/sim)

- 상정 파라미터(가정치): WIDTH=800, HEIGHT=600, TANK_R=16, BULLET_R=6, BULLET_SPEED=400, FIRE_COOLDOWN=0.5, dt=0.016.
- 타입 속도: NORMAL=120, TANKER=105, DEALER=130.
- 로더: Function 샌드박스(`Type`, `PARAMS`)만 전달. 외부 접근 금지.
- 결과 저장: tools/sim/results/ 하위로 일원화.

명령
- `npm run sim` — 단일 매치 실행 → `results/last_match.csv`
- `npm run rr` — 6개 전 조합 라운드로빈 → `results/summary.csv/json`
- `npm run search -- --bot 02_dealer_sniper --budget 100` — 파라미터 무작위+빔 탐색, best를 `params/<bot>.json` 저장.

PARAMS 주입
- 파일명 기반으로 `params/<key>.json`을 로드해 `PARAMS`로 주입.
- 스니펫은 `PARAMS.xxx ?? 기본값`으로 점진 치환.

출력 정책
- 콘솔 요약 10줄 내. 상세는 CSV/JSON으로 저장.

라운드로빈 출력
- JSON: 각 페어별 집계(`winA/winB/avgAliveDiff/avgTime`).
- CSV(summary.csv): `pair,winA,winB,avgAliveDiff,avgTime`.

탐색 출력
- `search_<bot>.csv`: 상위 후보(rank, trial, score)
- `search_detail_<bot>.csv`: trial별 상대 점수 상세
- `ga_<bot>.csv`: 세대별 상위 점수 요약
- 최종 최적 파라미터: `params/<bot>.json`, 스냅샷: `params/history/<bot>/<timestamp>.json`


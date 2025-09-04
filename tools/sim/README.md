# SUPER6 Simulator (tools/sim)

- Params: WIDTH=800, HEIGHT=600, TANK_R=16, BULLET_R=6, BULLET_SPEED=400, FIRE_COOLDOWN=0.5, TANK_SPEED(NORMAL=120, TANKER=105, DEALER=130), dt=0.016.
- Loader: Function 샌드박스(Type/PARAMS 주입, console 무효화). params/<botKey>.json 존재 시 Object.freeze(PARAMS)로 전달(없으면 {}).
- Results: tools/sim/results/ 하위로 일원화.

## Scripts
- `npm run sim` → 단일 매치 실행, `results/last_match.csv`
- `npm run rr`  → 6개 전 조합 라운드로빈, `results/summary.csv`, `summary.json`
- `npm run search -- --bot 02_dealer_sniper --budget 100` → 빔 탐색, `results/search_*.csv`, `search_detail_*.csv`
- `node search.js --bot 03_dealer_flanker --mode ga --gens 15 --pop 24 --elite 4 --mut 0.25 --seed 11 --opponents 01_tanker_guardian,06_tanker_bruiser --timeW 0.05 --check true`

## Round-robin CSV
- `pair,winA,winB,avgAliveDiff,avgTime`

## Param space (search)
- `ideal_range: 160..360`
- `orbit_deg: 40..120`
- `lead_max_deg: 0..8`
- `evade_weight: 0.5..3.0`
- `strafe_deg: 10..35`

## Scoring
- 단일 상대: `score = wins + timeW * avgTime`
- 다상대: 상대별 score 평균

## Deterministic check
- `--check` 옵션 시 동일 시드 반복 실행 결과 동일성 로그 1줄 출력

## Notes
- 시뮬은 간이 물리/충돌/데미지 모델(탄 20 데미지). 플랫폼과 1:1 동일성은 보장하지 않으나, 파라미터 탐색 및 휴리스틱 검증 용도로 충분.
- 콘솔 출력은 10줄 내로 최소화, 상세는 CSV/JSON 확인.


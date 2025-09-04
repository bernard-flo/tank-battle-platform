# SUPER6 Simulator (tools/sim)

- 상정 파라미터(가정치): WIDTH=800, HEIGHT=600, TANK_R=16, BULLET_R=7, BULLET_SPEED=400, FIRE_COOLDOWN=0.5, dt=0.016.
- 타입 속도: NORMAL=120, TANKER=105, DEALER=130.
- 로더: Function 샌드박스(`Type`, `PARAMS`)만 전달. 외부 접근 금지.
- 각도 단위: 봇 API의 `tank.move(angDeg)`, `tank.fire(angDeg)`는 degree(도) 입력이며, 엔진 내부에서 radian으로 변환해 처리합니다.
- 결과 저장: tools/sim/results/ 하위로 일원화.
- bulletSpeed 주입 단위: per-tick (엔진 DT를 곱해 스니펫에 전달)

명령
- `npm run sim` — 단일 매치 실행 → `results/last_match.csv`
- `npm run rr` — 6개 전 조합 라운드로빈 → `results/summary.csv/json`
- `npm run search -- --bot 02_dealer_sniper --budget 100` — 파라미터 무작위+빔 탐색, best를 `params/<bot>.json` 저장.

PARAMS 주입
- 파일명 기반으로 `params/<key>.json`을 로드해 `PARAMS`로 주입.
- 스니펫은 `PARAMS.xxx ?? 기본값`으로 점진 치환.

출력 정책
- 콘솔 요약 10줄 내. 상세는 CSV/JSON으로 저장.

라운드로빈 출력/결정성
- JSON: 각 페어별 집계(`winA/winB/avgAliveDiff/avgTime`).
- CSV(summary.csv): `pair,winA,winB,avgAliveDiff,avgTime`.
- `--check` 옵션: 첫 페어 2회 재실행하여 결정성 로그 출력(OK/FAIL)

탐색 출력
- `search_<bot>.csv`: 상위 후보(rank, trial, score)
- `search_detail_<bot>.csv`: trial별 상대 점수 상세
- `ga_<bot>.csv`: 세대별 상위 점수 요약
- 최종 최적 파라미터: `params/<bot>.json`, 스냅샷: `params/history/<bot>/<timestamp>.json`

GA 모드(엔진 점수화)
- 실행: `npm run search -- --bot 03_dealer_flanker --mode ga --gens 12 --pop 24 --elite 4 --mut 0.25 --seed 11 --opponents 01_tanker_guardian,06_tanker_bruiser --timeW 0.05 --check true`
- 평가: 각 세대에서 개체군을 실제 엔진으로 다상대 평가해 점수화. 점수 = (승수 차) + (1/avgTime)*timeW 의 상대별 합/평균.
- 진화: 상위 ELITE 보존, 변이 확률 MUT로 파라미터별 가우시안 노이즈 후 범위 클램프, 개체군 크기 POP 유지.

파라미터 범위(검색 기본값, camelCase)
- ideal_range: 160..520
- orbit_deg: 10..120
- leadMaxDeg: 8..26
- evade_weight: 0.2..2.0
- strafe_deg: 8..36
- orbit_radius: 140..320
- radius_pulse: 40..140
- orbitFlipRate: 0.001..0.02
- fire_every_frames: 3..9
- aimJitterDeg: 0.5..2.5
- safeMargin: 16..40
- evadeReactDist: 160..260

스코어 정의(탐색)
- 점수 = 승수 + (1/avgTime) * timeW (기본 0.05)
- `--opponents a,b,c` 다상대 평균합, `--beam` 상위 N 유지

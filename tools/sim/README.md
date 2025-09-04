# SUPER6 Simulator (tools/sim)

- 엔진: 이동/탄/충돌/HP/쿨다운/승패, seedrandom으로 시드 고정
- 각도 단위: 봇 API `move(angleDeg)`, `fire(angleDeg)`는 degree(도) 입력. 엔진 내부에서 rad로 변환하여 처리.
- 파라미터 주입: `tools/sim/params/<botKey>.json`을 로드해 각 스니펫의 `PARAMS`로 주입합니다. 없으면 `{}`로 폴백.
- 결과 경로: `tools/sim/results/` 하위에 단일/라운드로빈/탐색 CSV/JSON 저장

기본 파라미터(가정치/밸런스)
- WIDTH=800, HEIGHT=600, TANK_R=16, BULLET_R=12
- BULLET_SPEED=700px/s, FIRE_COOLDOWN=0.5s, BULLET_LIFE=4s
- TANK_SPEED: NORMAL=120, TANKER=105, DEALER=130
- dt=0.016(60Hz), TIME_LIMIT=90s
- DAMAGE=45 (밸런스)

명령 예시
- 설치: `cd tools/sim && npm i`
- 단일 매치: `npm run sim`
- 라운드로빈: `npm run rr -- --seed 42 --rounds 5 --repeat 3 --check true`
- 탐색(beam): `npm run search -- --bot 02_dealer_sniper --budget 60 --beam 5 --opponents 01_tanker_guardian,06_tanker_bruiser --seed 7 --check true`
- 탐색(GA): `node search.js --bot 03_dealer_flanker --mode ga --gens 12 --pop 24 --elite 4 --mut 0.25 --seed 11 --opponents 01_tanker_guardian,06_tanker_bruiser --timeW 0.05 --check true`

출력 파일
- `results/last_match.csv` — round,winA,winB,aliveDiff,time
- `results/summary.csv/json` — pair,winA,winB,avgAliveDiff,avgTime
- `results/search_*.csv`, `results/search_detail_*.csv`, `results/ga_*.csv`
 
결정성 체크
- 동일 인자 2회 실행 시 `rr: deterministic check OK` 출력, `summary.csv/json` 바이트 동일성 확인

메모
- 현재 휴리스틱 기본 파라미터와 움직임에서는 무승부가 빈번합니다. 탐색/튜닝 단계에서 킬 발생 빈도를 확보하기 위해 BULLET_R/BULLET_SPEED/DAMAGE를 일시 상향했습니다. 전략/파라미터 개선 후 재조정 예정.

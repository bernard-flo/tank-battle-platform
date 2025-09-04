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


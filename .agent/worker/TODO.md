# Worker TODO (SUPER6 v1 이후)

- 시뮬레이터 초안 작성(`tools/sim/`)
  - 전투 규칙: 이동/충돌/탄속/피해 모델(플랫폼 추정 규칙 복제)
  - 맵 경계, 벽-슬라이딩, 충돌 판정(원/사각형) 토글
  - 랜덤 시드 고정, 로그 레벨 조절 옵션
  - 기본 파라미터(가정): WIDTH=800, HEIGHT=600, TANK_R=16, BULLET_R=6, BULLET_SPEED=400, FIRE_COOLDOWN=0.5, TANK_SPEED[NORMAL=120,TANKER=105,DEALER=130]
  - 고정 시간 스텝 dt=0.016(60Hz)
  - 파일: package.json, README.md, engine.js, loader.js, cli.js

- 라운드로빈 스코어러
  - 팀 내 6기 상호전, 외부 샘플 봇과 교차전
  - ELO 유사 점수/승률/생존 시간 집계
  - 결과 저장: tools/sim/results/*.csv, summary.json

- 파라미터 노출/조정
  - 반경/오비트 각/보정 횟수/난수 범위 등 JSON 로드/저장
  - 각 탱크별 프리셋(v1, aggro, safe)
  - params/<bot>.json → loader 주입 경로 구현

- 탐색/최적화 방법
  - 무작위 탐색 + 톱-N 빔 서치
  - 회피 가중치(접근속도×역거리) 보정
  - 리드샷 예측 시간 상한 튜닝(0.8~1.5s)
  - 파일: tools/sim/search.js, CLI 옵션(budget, seed, topk)

- 안정성/안전
  - 콘솔 스팸 금지 유지, 디버그 로그 토글
  - 외부 전역 접근 없는지 정적 검사 스크립트
  - 변경마다 커밋: `git add -A && git commit -m "feat(sim): ..."`

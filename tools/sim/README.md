# 경량 시뮬레이터(초안 계획)

- 목표: tank_battle_platform.html 규칙을 Node 환경에서 재현해 대량 자기대전/탐색을 가능하게 한다.
- 우선 범위: 맵(900x600), 탱크 타입별 파라미터, 이동/충돌, 탄/피해, 쿨다운.
- 입력: `teams/SUPER6.export.txt` 또는 `tanks/*.js` 묶음.
- 출력: 라운드-로빈 스코어(JSON), 베스트 파라미터 스냅샷.

구성(초안)
- `engine.js`: 물리/룰 엔진(HTML과 동치 목표)
- `loader.js`: 스니펫 로더(함수명 검증)
- `runner.js`: 경기 실행/스코어 집계
- `cli.js`: 명령행 진입점

다음 단계
- 최소 동작 버전 구현 후, 탐색 루프(`tools/search/`) 연동.


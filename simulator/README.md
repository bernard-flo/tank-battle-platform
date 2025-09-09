시뮬레이터(Headless) 사용법

개요
- tank_battle_platform.html의 게임 규칙을 Node.js 환경에서 그대로 재현한 헤드리스 시뮬레이터입니다.
- 렌더링 없이 빠르게 턴(틱)을 진행하여 AI 성능 검증과 대량 시뮬레이션에 적합합니다.

규칙 대응
- 맵 크기: 900x600, 총알 속도: 8 px/tick, 틱 간격 가정: 50ms.
- 탱크 타입(Type.NORMAL/TANKER/DEALER)의 에너지/크기/속도/공격력 값을 HTML과 동일하게 적용.
- 이동: 탱크당 틱 내 1회 성공만 허용(hasMoved), 실패 시 false 반환. 시도 횟수 10회 초과 시 true 반환하여 추가 호출 차단.
- 충돌: 경계 및 다른 탱크와의 충돌 검사(안전 여백 +5).
- 발사: 500ms(=10틱) 쿨다운, 아군 관통, 적 적중 시 탄 제거 및 피해 반영.
- AI 입력: update(tank, enemies, allies, bulletInfo) 서명 및 제공 필드 동일.
- 승리: 한쪽 팀 생존 0, 상대 생존 > 0인 시점 종료.

실행 방법
- 기본 실행(양 팀 기본 전략):
  node simulator/cli.js

- 팀 코드 파일 지정:
  node simulator/cli.js --red path/to/red_team.js --blue path/to/blue_team.js

  파일 포맷: 각 로봇을 function name()/function type()/function update(...)로 정의하고,
  로봇 간 구분은 "function name()" 패턴으로 자동 분리됩니다. 최대 6개 사용.

- 최대 틱/시드/JSON 출력:
  node simulator/cli.js --red red.js --blue blue.js --maxTicks 4000 --seed 123 --json out.json
  (시드 적용: 초기 포신 각도만 시드 기반 RNG 사용. 봇 코드 내 Math.random은 브라우저와 동일하게 비결정적.)
  
 - 리플레이 덤프(JSON 프레임 기록):
   node simulator/cli.js --red red.js --blue blue.js --seed 7 --replay replay.json [--recordEvery 2]
   - 단일 경기(repeat=1)에서만 지원. 프레임마다 탱크/총알 상태와 메타(맵 크기, tickMs, 시드, 플레이어 목록)를 저장.
   - recordEvery로 프레임 간격을 조절(기본 1 = 매 틱 저장). 파일 크기 절감을 위해 2~5 권장.

- 배치 시뮬레이션(반복 실행)과 통계 집계:
  node simulator/cli.js --red red.js --blue blue.js --repeat 100 --seed 42 --json result.json
  - 동일한 baseSeed(예: 42)를 기준으로 42,43,44... 순으로 시드를 바꿔 100회 경기
  - 콘솔에 승/패/무, 평균 틱/생존/에너지 출력, JSON에는 summaries/aggregate 기록

출력 예시
- 콘솔 요약: 승자, 틱 수, 각 팀 생존/에너지.
- JSON 파일(옵션): summary 오브젝트를 기록.
 - 리플레이 파일(옵션): { meta, frames } 구조로 저장. frames[t]에는 각 틱의 탱크/총알 상태가 포함.

파일 구성
- engine.js: 물리/룰 엔진과 runMatch 함수 제공.
- bot_loader.js: 코드 분할/이름·타입 추출/샌드박스 실행기 생성.
- cli.js: 커맨드 라인 인터페이스.
- ai/default_team.js: 샘플 팀 코드(텍스트 입력용).

주의
- tank_battle_platform.html 파일은 수정하지 않습니다.
- 브라우저 렌더링 효과(폭발/피탄/체력바)는 생략되지만, 피해/관통/범위 판정은 동일합니다.

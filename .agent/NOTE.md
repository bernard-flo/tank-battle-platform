메모 (다음 실행 참고)

- tank_battle_platform.html의 규칙을 그대로 모사하는 헤드리스 시뮬레이터를 추가할 예정입니다.
- 시뮬레이터는 Node.js 기반으로 동작하며, 브라우저의 sandbox(new Function) 방식과 동일한 API(tank/enemies/allies/bulletInfo, Type 상수)를 제공합니다.
- TODO: 대량 반복 시뮬레이션(batch)과 시드 고정 랜덤 지원 추가.

진행 상황
- simulator/engine.js, simulator/bot_loader.js, simulator/cli.js, simulator/ai/default_team.js, simulator/README.md 생성 완료.
- 기본 규칙(이동/충돌/사격 쿨다운/아군 관통/배치/승리 조건) 반영 및 동작 확인.

다음에 고려할 것
- --repeat N 옵션으로 배치 시뮬레이션 및 통계(승률, 평균 생존 에너지) 출력.
- 특정 틱 스냅샷(JSON) 덤프 옵션(디버깅용) 추가.
- 브라우저 UI와 결과 동기화를 위한 상태변환 리플레이 로그 포맷 정의.

메모 (다음 실행 참고)

- tank_battle_platform.html 규칙을 모사한 헤드리스 시뮬레이터 구현 완료.
- Node.js 기반, 브라우저와 동일한 API 전달(tank/enemies/allies/bulletInfo, Type 상수). 쿨다운은 500ms=10틱으로 계산.
- 배치 실행(--repeat)과 집계 통계 추가 완료. seed 미지정 시 랜덤 baseSeed를 생성하여 i증분 시드 사용.
- 시드 적용 범위: 초기 포신 각도는 시드 기반 RNG로 결정됨(브라우저는 Math.random 사용). 봇 로직 내 Math.random은 브라우저와 동일하게 비결정적임.

진행 상황
- simulator/engine.js, simulator/bot_loader.js, simulator/cli.js(반복지원), simulator/ai/default_team.js, simulator/README.md 업데이트 완료.
- 기본 규칙(이동/충돌/사격 쿨다운/아군 관통/배치/승리 조건) 반영 및 동작 확인.

다음에 고려할 것
- 특정 틱 스냅샷(JSON) 덤프 옵션(디버깅/리플레이용) 추가.
- 브라우저 UI와 결과 동기화를 위한 리플레이 로그 포맷 정의.
- (옵션) 봇에 시드 전달 혹은 Math.random 섀도잉으로 재현성 향상(HTML과의 호환성 저하 주의).

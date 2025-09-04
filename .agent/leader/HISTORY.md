루프 #2-11 (엔진 실제화 + RR/Search 통합)
- sim 엔진 이동/탄/충돌/HP/쿨다운/승패 구현 상태 확인, seedrandom 결정성 유지.
- RR/CLI/Search 모두 runMatch 기반으로 일원화, CSV/JSON 산출 및 --check 결정성 패스.
- params/*.json 주입 경로와 탐색(beam/GA) 동작 확인, 상위 파라미터 자동 반영 구조 OK.
- 다음 액션: 결과 경로 중복(tools/sim/tools/sim/results) 정리, 성능 로그(1/10회) 요약 강화.


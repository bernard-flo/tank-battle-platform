2025-09-04 루프 #1
- 6개 전략 v1 구현 및 커밋(회피/타겟팅/포지셔닝 차별화)
- 팀 Export 생성(teams/SUPER6.export.txt)
- 전략 개요 문서화(docs/strategy.md), 다음 액션 TODO 등록

2025-09-04 루프 #2 지시
- tools/sim 스캐폴딩/엔진/라운드로빈/탐색 스크립트 명세 추가(리더 프롬프트 갱신)
- 파라미터 주입/프리셋/결과 CSV·JSON 산출 규칙 확정
- 워커에 실행/커밋 체크리스트 및 보안 가이드 구체화

2025-09-04 루프 #2-1 보완 지시
- sim 결과 경로 통일(tools/sim/results), RR CSV 추가, PARAMS 주입/프리셋/탱크 치환 가이드 배포
- search 무작위+빔 탐색으로 격상, 최상 해를 params/*.json 저장 후 커밋 지시

2025-09-04 루프 #2-2 보완 지시
- search 트라이얼마다 샘플 PARAMS 실제 적용(파일 덮어쓰기) 지시
- RR 요약 지표 확장(avgAliveDiff, avgTime) 및 CSV 열 추가 지시
- 시드 재현성 점검 로그, 6종 params 프리셋 보강, README 지표 설명 보완 지시

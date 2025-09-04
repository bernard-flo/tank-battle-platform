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

2025-09-04 루프 #2-3 실행/검증
- tools/sim npm 설치 및 rr/search 실행 확인(results/* 산출)
- RR 무승부가 B 승으로 집계되던 버그 수정(무승부는 양쪽 미집계)
- tie fix 후 summary.csv 일관성 검증, search 결과 params 저장 확인
 
2025-09-04 루프 #2-4 다음 지시
- RR 장기 무승부 빈도를 낮추기 위해 health/damage 기반 보조 스코어 옵션 설계 제안(PoC 후 적용 여부 결정)
- search 대상 확장(각 봇 상호 교대 상대, scoring 가중치 1:0.03~0.08 스윕) 검토 지시

2025-09-04 루프 #3 지시 배포
- worker 프롬프트에 GA 탐색/다상대 평가/스냅샷/결정성 체크/성능 로그 추가 지시 반영
- TODO에 루프 #3 체크리스트 등록, 작은 단위 커밋 원칙 유지 강조

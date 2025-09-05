# Neuro-Tank Pack v1 — 배포 요약

- 산출물: result/ai.txt (Import 호환, 6개 로봇)
  - Aegis (TANKER): 전면 압박, 벽압 유지, 탄 수직회피
  - Valkyrie (DEALER): 카이팅, 거리 유지, 리드샷 오프셋 확대
  - Orion (NORMAL): 측면 기동, 공전 가중
  - Bishop (DEALER): 백라인 유지, 저체력 우선 타겟팅
  - Phalanx (TANKER): 경계 제어, 동료 쉴드 역할 강화
  - Nova (NORMAL): 고립 타겟 추적, 기회주의적 진입
- 정책: 16→6→5 MLP 출력(회피/돌진/공전/벽 회피 혼합 + 사격 오프셋)
- 주의: 플랫폼 특성상 프레임 간 상태 저장 불가. 반응형 정책으로 설계.
- 다음: 시뮬레이터/자가대전으로 가중치 오프라인 튜닝 후 v2 릴리스 계획.

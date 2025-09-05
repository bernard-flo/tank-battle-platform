학습 러닝 요약 (train_roles)

- 시각: 2025-09-05T05-50-50Z
- 스크립트: scripts/train_roles.js
- 세대 수: GENS=16
- 평가(baseline 50전): 49승 1패 0무, avgEndTick≈212.5
- 최종 역할 배열: [DEALER, NORMAL, NORMAL, DEALER, TANKER, DEALER] (ids: [2,0,0,2,1,2])
- 결과 번들: result/ai.txt (6 로봇)

전략 메모
- 단층 MLP(H=6): [회피/공격/공전/벽압] 가중 혼합 + 리드샷 오프셋
- 탄 위협 수직 회피, 벽 압력 벡터, 타겟/군집 상대벡터 등 16차원 특징 사용

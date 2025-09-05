학습 러닝 요약 (train_roles)

- 시각: 2025-09-05T05-41-37Z
- 스크립트: scripts/train_roles.js
- 세대 수: GENS=8
- 최고 성능: wins=12, draws=0, score=12.0, avgTick≈206.8
- 최종 역할 배열: [DEALER, NORMAL, TANKER, DEALER, DEALER, DEALER]
- 결과 번들: result/ai.txt (6 로봇)

적용 전략
- 진화적 변이(가중치, 역할 스왑/변경) + self-play(Baseline 비교) 평가
- 단층 MLP(H=6)로 경량 추론, 탄 회피/공격/공전/벽압 혼합 행동 가중치 산출


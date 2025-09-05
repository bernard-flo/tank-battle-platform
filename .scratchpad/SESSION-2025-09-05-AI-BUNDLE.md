# 세션 메모 – 6 Tank AI 번들
- 파일: result/ai.txt (Import 호환)
- 역할: Dealer×2 (Atlas, Viper), Tanker×2 (Bulwark, Aegis), Normal×2 (Orion, Nova)
- 정책: 16→6→5 MLP, 이동 혼합(회피/공격/공전/벽회피), 리드샷 산출
- 주의: 런타임 격리로 온라인 학습 불가. 오프라인 최적화 후 가중치 갱신 방식 유지.
- 다음: 간이 Node 규칙시뮬레이터 작성 → 진화전략(CMA-ES)로 가중치 튜닝 자동화

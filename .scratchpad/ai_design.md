Neuro-Tank Pack v1 — 설계 개요 / 향후 학습 계획

1) 공통 입력(16)
- pos: x_norm, y_norm
- self: tanh(health_norm), type one-hot(3)
- nearest/target: dist_norm(1), dir_x, dir_y
- centers: enemy_center_dir(2), ally_center_dir(2)
- bullets: threat_scalar(1) + wall_push_vec(2)

2) MLP 16→6→5
- hidden: tanh
- outputs[0..3]: 이동 기저(회피/돌진/공전/벽) softmix
- outputs[4]: 사격 각도 오프셋(리드샷 근사)

3) 역할별 편향
- Tanker: 돌진/벽압 강화, 오프셋 작게
- Dealer: 거리유지(-at) 항 가중, 오프셋 크게
- Normal: 균형 + 공전 강화(측면)

4) 플랫폼 제약
- 프레임별 new Function → 상태 비영속 → 반응형 정책 필요
- update 내 난수 사용은 장애물 탈출 fallback 정도로 최소화

5) 학습 로드맵
- 시뮬레이터 제작(Node/Python) → rules mirror
- 진화전략(CMA-ES/ES) 또는 정책그래디언트로 가중치 튜닝
- 역할/가중치 동시 최적화(멀티헤드/공유 trunk)
- 리그전/자가대전으로 일반화 성능 평가 → ai.txt 자동 갱신

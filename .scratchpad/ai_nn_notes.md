개발 스크래치 노트 (NN 기반 탱크)

입력 스키마(48)
- self: x/900, y/600, health_norm, size_norm (4)
- type one-hot: NORMAL, TANKER, DEALER (3)
- enemies (정렬): 3명 × [dx,dy,dist_norm,sin,cos,health_norm] (18)
- allies (정렬): 2명 × [dx,dy,dist_norm,health_norm] (8)
- bullets (정렬): 3개 × [dx,dy,dist_norm,vx_norm,vy_norm] (15)

출력 스키마(5)
- [move_cos, move_sin, fire_cos, fire_sin, fire_prob]
- 활성화: move/fire 벡터 tanh, prob sigmoid

메모
- move 실패 보정 각도 후보: ±22/25/30/55/60/70/75/180
- 발사 임계치 범위 탐색: 0.26~0.35
- 역할별 차이: 탱커는 접근/버티기, 딜러는 카이팅/스트레이프, 노멀은 혼합+보조

다음 반복 아이디어
- 적/총알의 속도를 상태에 넣고 리드샷 오차 최소화 가중치 탐색
- 유전 알고리즘: 가중치 벡터 변이/교배 후 에너지 잔존 합계로 적합도
- RL: self-play, 보상(적 체력 감소, 생존 시간, 팀 승리 보너스)

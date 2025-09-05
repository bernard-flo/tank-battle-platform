# TODO (rolling)

- [x] 포맷 확인: tank_battle_platform.html Import 규격(name/type/update, function name() 경계)
- [x] 경량 시뮬레이터 사용 검증(scripts/sim/engine.js)
- [x] 진화 학습 실행(train_roles, GENS=16)
- [x] 산출물 반영(result/ai.txt) 및 50전 자기평가
- [ ] 미러전/상대 풀 다양화로 일반화 점검
- [ ] 세대 수 확대(GENS>=32) 및 히든 차원 H 증가 실험
- [ ] 리드샷/가중치 클램프 범위 세분화 실험
- [ ] 반복 실행 자동화 스크립트(scripts/pipeline.sh) 추가

메모: 브라우저 샌드박스 특성상 프레임 간 state 미보존 → 정책은 순수 반응형으로 유지 필요.

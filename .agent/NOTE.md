# 개발 참고 노트

- tank_battle_platform.html 수정 금지. Import/Export 포맷 준수.
- Import 포맷: `function name()`을 경계로 6개의 로봇 코드 블록.
- update()는 신경망(단층 퍼셉트론 + tanh/sigmoid)으로 구현. 후처리는 이동 실패시 보정 정도만 허용.
- 입력 특징 48차원:
  - Self: x/900, y/600, health/150, size/50, type one-hot(3)
  - Enemies: 최근접 3개 × [dx, dy, dist, sin(angle), cos(angle), health/150]
  - Allies: 최근접 2개 × [dx, dy, dist, health/150]
  - Bullets: 최근접 3개 × [dx, dy, dist, vx/8, vy/8]
- 출력 5차원: [move_cos, move_sin, fire_cos, fire_sin, fire_prob].
- 타입 조합: TANKER×2, DEALER×2, NORMAL×2. 행동 특화는 가중치(목표 추격/회피/횡이동)로 조절.
- 상태 저장은 sandbox 상 매 프레임 재생성되어 불가 -> 순수 반사 신경망으로 설계.

## 다음 단계(향후 실행 계획)
- 시뮬레이션 자동화 스크립트 마련: 브라우저 없이 리플레이/평가가 어려우므로, HTML 엔진을 모사한 경량 물리/룰 시뮬레이터 작성 후 유전 알고리즘으로 가중치 진화.
- 가중치 구조 공통화: 48→5(단층) 유지, 개별 탱크는 가중치만 다르게.
- result/ai.txt 갱신 파이프라인: 학습 결과를 자동으로 병합/출력.


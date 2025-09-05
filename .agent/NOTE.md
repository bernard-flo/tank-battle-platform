개발 메모 (지속 참고)

- AI 코드 인터페이스
  - 반드시 `function name()`, `function type()`, `function update(tank, enemies, allies, bulletInfo)`를 포함.
  - `type()`은 `Type.NORMAL | Type.TANKER | Type.DEALER` 중 반환.
  - Import는 `function name()`으로 블록을 분할하므로 각 로봇은 해당 함수로 시작.

- 입력/출력 포맷(현재 NN 설계)
  - 입력(48차원): self(4) + 원핫 타입(3) + 적 3명 x 6특징 + 아군 2명 x 4특징 + 총알 3개 x 5특징
  - 출력(5차원): [move_cos, move_sin, fire_cos, fire_sin, fire_prob]
  - 활성화: 0..3 tanh, 4 sigmoid
  - 이동/사격 각도는 `atan2(sin, cos)` 후 degree 변환
  - 이동 실패시 보정 각도로 재시도(장애물/경계 대응)

- 안전 샌드박스 제약
  - 사용할 수 있는 API: `tank.move(angle)`, `tank.fire(angle)`, `tank.{x,y,health,energy,type,size}`
  - `enemies/allies`는 `{x,y,distance,health}`(enemy는 angle 포함)만 사용 가능
  - `bulletInfo`는 `{x,y,vx,vy,distance}`

- 탱크 타입 구성 가이드
  - 2x TANKER(진입/보호), 2x NORMAL(밸런스/링크), 2x DEALER(원거리 DPS)
  - 내부 가중치로 역할별 의사결정을 차별화

- 향후 개선 아이디어
  - 시뮬레이터를 Node 환경에서 재현해 자가전 학습(RL) 루프 구현
  - 진화전략/베이지안 최적화로 가중치 자동 탐색
  - LSTM 계층을 추가해 예측 이동 강화(총알/적 이동 예측)
  - import/export 포맷 그대로 유지하여 역호환성 유지

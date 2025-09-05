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

- 탱크 타입 구성 가이드 (AI Pack v6)
  - 2x TANKER: Vanguard-Tanker, Bulwark-Tanker
  - 2x NORMAL: Sentinel-Normal, Overseer-Normal
  - 2x DEALER: Phantom-Dealer, Falcon-Dealer
  - 각 봇은 동일한 입력 스키마를 사용하되 역할별 가중치/발사 임계치가 상이
  - 내부 가중치로 역할별 의사결정을 차별화

- 향후 개선 아이디어
  - 시뮬레이터를 Node 환경에서 재현해 자가전 학습(RL) 루프 구현
  - 진화전략/베이지안 최적화로 가중치 자동 탐색
  - LSTM 계층을 추가해 예측 이동 강화(총알/적 이동 예측)
  - import/export 포맷 그대로 유지하여 역호환성 유지

AI Pack 사용법 (요약)
- 경로: `result/ai.txt`
- 플랫폼에서 "Import" 버튼 클릭 → `ai.txt` 전체 내용을 붙여넣기
- 블록 구분 주석 `// ===== 다음 로봇 =====`는 가독성용이며, Import는 `function name()` 기준으로 자동 분할됨

버전 표기
- 현재 배포: AI Pack v6 (6 tanks, NN-based)

[현재 배포 탱크 목록]
- Vanguard-Tanker (TANKER)
- Bulwark-Tanker (TANKER)
- Sentinel-Normal (NORMAL)
- Overseer-Normal (NORMAL)
- Phantom-Dealer (DEALER)
- Falcon-Dealer (DEALER)

[Import 가이드 재확인]
- Import는 `function name()` 기준으로 코드 블록을 자동 분할함
- `// ===== 다음 로봇 =====` 구분 주석은 가독성용 (있어도/없어도 동작 동일)
- 각 블록은 최소 `name()`, `type()`, `update(...)` 세 함수를 포함해야 함

[다음 실행을 위한 TODO]
- .scratchpad/rl_todo.md 진행 (시뮬레이터 분리, 파라미터 검색 루프)
- 유전/랜덤 탐색으로 가중치 튠 스크립트 초안 작성
- tank_battle_platform.html은 수정 금지. Import는 function name() 경계로 분할됨.
v7: 6개 NN 에이전트, 역할 조합: 2 TANKER, 2 NORMAL, 2 DEALER

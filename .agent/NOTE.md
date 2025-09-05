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
## Tank AI 개발 노트 (2025-09-05T03:40Z)

- 공통 입력 피처(48차원)
  - self: x/900, y/600, health/150, size/50, type one-hot(3)
  - enemies top3: 각 [dx,dy,dist_norm,sin(angle),cos(angle),health_norm]
  - allies top2: 각 [dx,dy,dist_norm,health_norm]
  - bullets top3: 각 [dx,dy,dist_norm,vx/8,vy/8]
- 간단 MLP(선형→tanh out4 + sigmoid fire)
- 역할별 가중치 프리셋(탱커: 접근/경미 회피, 딜러: 카이팅/강 회피, 노말: 균형/약한 우선순위)
- 이동: atan2(y1,y0) 각도, 실패시 ±25~35deg 재시도→최대 3회
- 사격: atan2(y3,y2) 각도, y4>threshold에서 발사 (역할별 임계값 차등)

### 현재 제공 AI(6종)
- Alpha-Tanker: 최근접 추격, 완만 회피, 적극 사격
- Bravo-Tanker: 체력 낮은 적 우선, 강한 회피, 킬 보장
- Charlie-Dealer: 카이팅(목표 반대방향 이동)+총알 수직 횡이동, 근거리에서 높은 사격 빈도
- Delta-Dealer: 목표를 기준으로 원운동(좌/우 횡이동), 매우 강한 회피
- Echo-Normal: 균형잡힌 교전, 체력 낮을 때 동료 쪽으로 이동 경향
- Foxtrot-Normal: 무난한 교전, 약간 낮은 발사 임계값으로 기회 포착

### 학습/강화학습 계획
- 자체 플레이 셰도우 시뮬레이터를 Node 환경으로 분리 구현(동일 로직)
- PPO/ES류로 파라미터 최적화, 목적함수: 라운드 승률 + 누적 데미지 - 피격 벌점
- 타입 조합 탐색: 2T/2D/2N, 2T/3D/1N 등 브루트포스 후 상위 조합 유지
- 체크포인트를 `result/ai.txt`로 내보내는 스크립트 작성 예정

### 검증
- 100전 시뮬 결과 승률/잔존 에너지 평균 기록
- 총알 회피율, 팀킬 0 보장(로직상 우군 관통)

### 주의/제약
- `tank_battle_platform.html` 미변경 고정
- 업데이트 샌드박스에서 `Type` 상수만 허용됨 → 코드 내에 의존 최소화
- 성능 튜닝은 가중치 스칼라 조정으로 우선 수행

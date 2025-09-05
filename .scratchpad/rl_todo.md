자가전/RL 파이프라인 TODO

목표
- result/ai.txt 내 6개 NN 에이전트를 자동 튜닝하여 다양한 상대에 대해 높은 승률 확보

구성요소
- 시뮬레이터: scripts/sim/engine.js (HTML 엔진 하위호환, 50ms tick, 탄/충돌 처리)
- 배치 실행기: scripts/sim/run.js (result/ai.txt vs baseline, 통계 로그)
- 파라미터 → 코드 생성기: scripts/train/gen_ai_pack.js (미정: 가중치로 JS 코드 생성)
- 탐색기: scripts/train/evolve.js (미정: 진화전략/랜덤 탐색)

단기 계획
1) gen_ai_pack.js 스켈레톤 작성: 공통 입력 48차원, 출력 5차원 선형층 + 활성화, 역할별(타입별) 가중치 템플릿 지원
2) evolve.js 스켈레톤 작성: 초기 개체군 생성 → 토너먼트 평가(시드 다양화) → 상위 개체 교배/돌연변이 → 반복
3) baseline, 미러, 랜덤 혼합 상대풀 구성. 평가 지표: 승률 + 평균 종료 틱(빠른 승리 보상)
4) best 개체를 result/ai.txt 로 export

주의
- tank_battle_platform.html 변경 금지
- Import 포맷: function name()/type()/update() 각 6블록
- 엔진과 브라우저 엔진 차이 최소화 유지(쿨다운: tick 단위 10틱=500ms)

아이디어
- b[4] 바이어스와 e1/e2 가중치 자동학습 → 사격 빈도 최적화
- 총알 회피 가중치(b1/b2) 상대별 동적 조정
- NORMAL 한 쌍은 코디네이션(ally 거리) 향상 가중치


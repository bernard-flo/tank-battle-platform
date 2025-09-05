- tank_battle_platform.html 내 실행 샌드박스는 매 프레임 새 Function으로 코드 실행. 상태 저장 불가(Object.freeze). 정책은 관측 기반으로 설계 필요.
- Import 포맷: function name(), function type(), function update(...) 세트 6개 연속. 분할은 function name() 경계로 수행. 구분 주석은 선택 사항.
- 입력 특징: 자기 위치/체력/에너지, 최근접 적/아군, 최근접 탄환 및 속도, 적 집결 중심 등으로 12차원 구성. MLP(12->8->3)로 moveDir/fireDir/fireGate 산출.
- 타입 조합: TANKER 2, DEALER 2, NORMAL 2.
- 다음 회차에서 성능 개선: 가중치 튜닝, 피처 집합 확장(벽/가장자리, 동적 회피), 역할간 각도 분산.
[AI 코드 생성 파이프라인]
- 스크립트: scripts/train2.js (Node, 무의존)
- 모델: 입력 16, 은닉 6, 출력 5 MLP. 업데이트 함수는 환경 파라미터로부터 특징을 구성하고 mlp 결과로 회피/공격/장애물/벽 가중 및 발사 리드각을 산출.
- 학습: 진화전략(엘리트 보존)으로 3개 역할(Type별) 파라미터 동시 최적화. 평가상대는 엔진 내 Baseline AI.
- 산출물: result/ai.txt (HTML Import 호환. 각 로봇은 function name()으로 구분)

[사용법]
- tank_battle_platform.html → 팀 Import 클릭 → result/ai.txt 내용 전체 붙여넣기 → 확인.
- 내보내기/가져오기는 HTML에 내장된 분리 로직(splitRobotCodes)을 사용.

[향후 개선 아이디어]
- 상대 풀 다양화: 과거 엘리트 및 랜덤 상대로 리그전(Co-evolution) 평가.
- 커리큘럼: 맵 랜덤 시드/스폰 교란, 탄속/쿨다운 약간 변조하여 과적합 방지.
- 모델 확장: 은닉 크기↑, skip 연결, 출력에 rollouts 기반 발사/이동 이득 보강.
- 앙상블: 역할별 2~3개 후보를 셔플 배치 후 셀프플레이 선택압 강화.
- 로그: .agent/log 하위에 세대별 요약 + 최종 평가를 JSON/MD로 추가.

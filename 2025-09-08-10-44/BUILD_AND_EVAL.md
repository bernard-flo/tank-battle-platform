목표
- 본 디렉토리의 스크립트로 6개 봇(2 Tanker, 3 Dealer, 1 Normal) 팀 코드를 생성하고, result 디렉토리 내 기존 결과물들과 휴리스틱 시뮬레이션(의사 평가)을 수행합니다.

파일 구성
- build_team.js: 가중치 랜덤 탐색을 통해 팀 코드를 생성하고 `result/<타임스탬프>.txt`에 저장
- evaluate_teams.js: result 디렉토리의 팀들과 새 팀을 동일한 랜덤 시나리오로 휴리스틱 평가하여 상대적 점수 비교

사용 방법
1) 팀 코드 생성
   - `node build_team.js`
   - 출력: `result/<타임스탬프>.txt`
2) 평가 수행
   - `node evaluate_teams.js result/<타임스탬프>.txt`
   - 결과 요약을 콘솔로 출력

비고
- tank_battle_platform.html의 실행 환경을 엄밀히 복제하지 않고, 이동/사격 의사결정 품질을 근사적으로 평가합니다.

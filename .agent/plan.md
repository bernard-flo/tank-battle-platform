세션 목표
- 플랫폼(tank_battle_platform.html)용 6개 AI 코드 확보 및 우수 성능 보장
- 샘플 코드 상대로는 충분한 우위(>95% 승률) 확보
- 강적 스위트(adversaries) 상대로도 높은 승률 유지 및 개선 루프 기반 마련

현재 상태
- 6개 봇: Alpha(TANKER), Bravo(DEALER), Charlie(DEALER), Delta(NORMAL), Echo(NORMAL), Golf(TANKER)
- 샘플 상대로 100% 승률
- 강적 스위트 상대로 약 75% 승률(200전 평균, seedBase=123)

시도/결과
- 브레인리스 파라미터 상향 조정(체력 가중/회피 각/선행 등) → 강적 상대로 승률 하락 확인 → 즉시 되돌림

다음 단계(자동 개선 루프)
- 튜닝 스크립트 설계: 문자열 치환 기반 파라미터 스윕(건드리는 상수만 제한적으로)
- 베이스라인 유지하며, 단일 파라미터씩 아블레이션 후 성능 상승 조합만 채택
- 필요 시 새로운 역할 아키타입(플랭커/루어)을 추가하여 라인업 교체 비교

테스트 방법
- simulator/test.js: 샘플 vs 우리팀 대량 반복
- simulator/test_vs_adversaries.js: 강적 스위트 vs 우리팀 대량 반복
- simulator/try_team.js: 임의 라인업 비교 유틸(샘플/강적 모드)

메모
- 엔진은 tick마다 코드 전체를 new Function으로 실행 → 상태 변수는 틱 간 유지 불가
- 예측 사격은 적 속도 정보가 없어 거리 기반 휴리스틱만 적용 가능

2025-09-05 03:38:40Z
- result/ai.txt 생성: 6개 NN 기반 탱크 코드(탱커 2, 딜러 2, 노멀 2) 추가.
- 디렉토리 준비: .agent/log, .scratchpad, result 생성.
2025-09-05T03:40Z
- result/ai.txt 6개 탱크 코드 강화 및 일관 구조로 정리
- 신경망 기반 입력 피처 표준화(자기/적/아군/총알 특징 48차원)
- 역할별(탱커2/딜러2/노말2) 가중치/바이어스 튜닝
- .agent/NOTE.md에 학습 방안/검증 계획 메모 추가 예정

2025-09-05T03:47Z
- 누락된 6번째 탱크 추가: Charlie-Dealer (카이팅/강회피)
- result/ai.txt 총 6개 블록 확인: Alpha-Tanker, Bravo-Tanker, Delta-Dealer, Echo-Normal, Foxtrot-Normal, Charlie-Dealer
- Import 포맷 검증: function name() 기준 분할 가능
2025-09-05T03:51:23Z
- result/ai.txt AI Pack v3로 정리: 6개 고유 탱크(탱커2/딜러2/노멀2), 중복/순서 오류 제거
- 임계치/회피/재시도 각도 미세 조정
2025-09-05T03:57:46Z
- AI Pack v4 배포: 6개 NN 탱크(2T/2D/2N) 가중치 재튜닝 및 전술 개선
- 탱커: Vanguard/Bulwark, 딜러: Strider/Viper, 노멀: Ranger/Sentinel
- 이동 보정 시퀀스 강화(±25/60/180), 사격 임계값 역할별 차등

# AI Pack Summary (2025-09-05T09:04:50Z)

- 생성물: `result/ai.txt` (6봇 번들, import 호환)
- 학습 방식: 진화 탐색(train_roles.js), 세대 24, seeds 12
- 대전 성능: baseline 상대로 50전 50승, 평균 종료 tick ≈ 250.1
- 역할 조합: 탱커/딜러/노말 혼합 – 슬롯 스왑 탐색 포함

사용법 (플랫폼에서 Import)
1) `tank_battle_platform.html` 실행
2) 레드 또는 블루 패널의 "코드 가져오기" 버튼 클릭
3) `result/ai.txt` 파일 내용을 통째로 복사/붙여넣기
4) 6개 로봇 코드가 자동 분할되어 입력됨
5) Start Battle

비고
- `scripts/sim/run.js`로 배치 자가전 검증 가능
- 더 강한 일반화를 위해 GENS/매치 수 확대 권장


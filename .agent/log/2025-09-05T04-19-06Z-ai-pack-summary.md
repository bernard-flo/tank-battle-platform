AI Pack v6 배포 요약

- 경로: result/ai.txt
- 구성(6):
  1) Vanguard-Tanker (TANKER)
  2) Bulwark-Tanker (TANKER)
  3) Sentinel-Normal (NORMAL)
  4) Overseer-Normal (NORMAL)
  5) Phantom-Dealer (DEALER)
  6) Falcon-Dealer (DEALER)

Import 방법
- tank_battle_platform.html 실행 → 각 팀 Import 버튼
- result/ai.txt 전체 내용을 붙여넣기
- 블록은 function name() 기준 자동 분할됨

메모
- 모든 탱크는 48차원 입력 → 5차원 출력 단층 NN 사용
- 이동 실패 시 각도 보정 루틴 포함, 총알 회피/카이팅/아군 보호 등 역할별 가중치 차별화
- 다음 목표: .scratchpad/rl_todo.md에 따라 자가전 기반 튠/강화학습 파이프라인 구현

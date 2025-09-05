# AI Pack v7 요약
- 파일: result/ai.txt
- 탱크 구성(6):
  1) Shield-Tanker: 전진 탱커, 탄 강회피, 근접 발사 임계 0.31
  2) Anchor-Tanker: 아군 보호, 취약 적 집중, 임계 0.30
  3) Coordinator-Normal: 취약 적 우선, 팀 중심 유지, 임계 0.29
  4) Skirmisher-Normal: 카이팅+스트레이프, 임계 0.28
  5) Reaper-Dealer: 공격적 카이팅, 임계 0.27
  6) Hawk-Dealer: 플랭킹 곡선 이동, 임계 0.29
- 공통: 48D 입력 -> 5D 출력, tanh/sigmoid, 이동 실패 보정 다단계, 탄 회피/중앙복귀 스프링 모델 적용.
- 사용법: tank_battle_platform.html의 Import에서 전체 붙여넣기.

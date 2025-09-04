# PLAN

목표: GA 기반으로 강력한 6인 팀 코드를 생성하고, 플랫폼 기본 코드(OMEGA_TEAM_CODES)를 최신 우승팀으로 갱신한다.

단계:
진행상태:
- [완료] 시뮬레이터 GA 빠른 러닝으로 우승팀 스냅샷 생성 (최고 승률≈87.5%)
- [완료] ai/omega_*.js 및 EXPORT_OMEGA*.txt 산출 확인/커밋
- [완료] tank_battle_platform.html의 OMEGA_TEAM_CODES 자동 갱신 스크립트 추가 및 실행
- [완료] README 사용법 보강/커밋

다음 작업(우선순위):
1) GA 추가 학습 실행(중간 규모: gens=10, pop=16, games=24, seedBase=7777)로 새 챔피언 산출
2) 산출된 6개 코드(ai/omega_*.js)로 플랫폼 기본값 갱신 및 EXPORT_ALL/Tuned 내보내기 갱신
3) 강적 스위트 상대로 재평가 후 결과를 .result와 .agent/history에 기록
4) 필요시 파라미터 범위 미세조정 및 재학습 반복
5) 세션 히스토리 기록 및 정리

# PLAN

목표: GA 기반으로 강력한 6인 팀 코드를 생성하고, 플랫폼 기본 코드(OMEGA_TEAM_CODES)를 최신 우승팀으로 갱신한다.

단계:
진행상태:
- [완료] 시뮬레이터 GA 빠른 러닝으로 우승팀 스냅샷 생성 (최고 승률≈87.5%)
- [완료] ai/omega_*.js 및 EXPORT_OMEGA*.txt 산출 확인/커밋
- [완료] tank_battle_platform.html의 OMEGA_TEAM_CODES 자동 갱신 스크립트 추가 및 실행
- [완료] README 사용법 보강/커밋

진행 업데이트:
- [완료] GA 추가 학습(6gens/12pop/16games, seedBase=8888) 수행 – best WR=0.9375
- [완료] ai/omega_*.js 및 EXPORT_OMEGA*.txt 반영
- [완료] tank_battle_platform.html 기본값(OMEGA_TEAM_CODES) 갱신
- [완료] adversaries 100전 평가 기록(WR=0.69)

다음 작업(우선순위):
1) 표준 GA 재학습(12/14/30) 1회 수행 및 반영
2) 승률 검증(강적 400전), 결과 기록 반영
3) 플랫폼 기본값 업데이트 및 EXPORT 파일 갱신
4) 필요시 파라미터 범위/유틸 미세조정 후 재학습

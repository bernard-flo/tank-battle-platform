작업 이력

## 2025-09-05T04-31-56Z
- 초기 6종 탱크 AI 구현(MPL 기반 의사결정) 및 result/ai.txt 생성.
- 최종 구성: 탱커 2 (Ares, Bulwark), 딜러 3 (Viper, Falcon, Raptor), 노말 1 (Sage).
- .agent/NOTE.md에 플랫폼 제약/설계 방침/향후 계획 문서화.
- 다음 과제: 오프라인 시뮬레이터 및 가중치 탐색 파이프라인 설계.
\n## 2025-09-05T04-36-15Z
- AlphaRL-v1: 6개 뉴럴 정책으로  갱신
- 공통: 탄 회피(수직 기동), 벽 회피(가중), 목표 선택(근접/체력 낮음), 리드샷
- 역할: Tanker(Atlas, Bulwark), Dealer(Viper, Falcon, Raptor), Normal(Sage)
- 개선점: 가장자리 탈출 강화, 공전/유지거리 가중 신경망으로 결정

## 2025-09-05T04-36-23Z
- AlphaRL-v1: 6개 뉴럴 정책으로  갱신
- 공통: 탄 회피(수직 기동), 벽 회피(가중), 목표 선택(근접/체력 낮음), 리드샷
- 역할: Tanker(Atlas, Bulwark), Dealer(Viper, Falcon, Raptor), Normal(Sage)
- 개선점: 가장자리 탈출 강화, 공전/유지거리 가중 신경망으로 결정

## 2025-09-05T04-36-31Z
- AlphaRL-v1: 6개 뉴럴 정책으로 result/ai.txt 갱신
- 공통: 탄 회피(수직 기동), 벽 회피(가중), 목표 선택(근접/체력 낮음), 리드샷
- 역할: Tanker(Atlas, Bulwark), Dealer(Viper, Falcon, Raptor), Normal(Sage)
- 개선점: 가장자리 탈출 강화, 공전/유지거리 가중 신경망으로 결정

## ${NOW}
- 구현: evolutionary trainer(`scripts/train2.js`)로 6개 뉴럴 정책 공동 최적화
- 산출물: `result/ai.txt` 갱신 (6개 모두 MLP 기반, Type 조합: 2 TANKER, 3 DEALER, 1 NORMAL)
- 검증: `node scripts/sim/run.js` -> vs baseline 50전 50승, avgEndTick ≈ 245
- 주의: 절대경로 `/result/ai.txt`와 프로젝트 경로 `result/ai.txt` 혼동 이슈 발견 → 프로젝트 경로 사용 고정 필요

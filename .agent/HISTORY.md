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

## 2025-09-05 13:47:27 KST
- 6개 탱크 AI(Atlas, Helios, Nova, Aegis, Viper, Orion, Seraph) MLP 기반 전략으로  갱신.
- 역할 배치: TANKER 2(Atlas, Aegis), DEALER 2(Helios, Viper), NORMAL 2(Nova, Orion/Seraph 중 전장 균형형).
- 공통 로직: 탄 회피(수직 기동), 벽 회피 벡터, 근접/중심/아군 응집 벡터 융합 → 신경망이 가중.
- 발사: 신경망이 산출한 /로 리드샷 보정.
- 다음 단계: 시뮬레이터/자가대전 스크립트 추가 및 유전탐색으로 가중치 고도화.

## 히스토리 정정 메모
- 이전 항목 내 백틱(`)이 쉘에서 명령 치환되어 일부 텍스트 유실됨. 아래는 정정:
  - 산출물 경로: `result/ai.txt`
  - 발사 보정 산출: `aimLead`, `aimBias`

## ${NOW}
- train2(8세대) 수행: baseline 상대로 10전 10승, avgTick≈234.2
- 자가대전 검증(50전): 50승 0패 0무, avgEndTick≈239.2
- 산출물: result/ai.txt (6개 탱크, MLP 기반), import 구분자 포함
- 로그: .agent/log/*train2* 및 *selfplay-summary.json 추가
- 다음 실행 과제: 상대 풀 다양화, GENS 확대, 리그전 평가 추가

## 2025-09-05T05:05:34Z
- 유전탐색 학습(train2) 12세대 추가 수행. 상수 시드(1000~1009) 기준 평가에서 10전 10승, avgTick≈227.9로 최적 번들 갱신.
- 산출물 업데이트: result/ai.txt (6개 탱크 코드, MLP 정책) 덮어씀.
- 검증: scripts/sim/run.js 기준선 50전 -> 49승 1무, avgEndTick≈252.6 (학습 세트와는 평가세트가 다름).
- 로그 추가: .agent/log/*train2-gen-*.json, *train2-final.json
- 다음: 세대 수 확대 및 상대 풀 다양화(미러전/랜덤 상대로 혼합) 예정.

## 2025-09-05T05-09-24Z
- train2 유전탐색 16세대 실행, 최고 점수 10(10승 0무), avgTick≈240.7.
- result/ai.txt 갱신 및 baseline 상대로 50전 전승, avgEndTick≈.
- 메모/로그 추가: NOTE.md 파이프라인 업데이트, .agent/log/2025-09-05T05-09-24Z-train2-run-summary.md 요약 생성.

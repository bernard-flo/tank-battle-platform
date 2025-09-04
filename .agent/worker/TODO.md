# Worker TODO (SUPER6 v1 이후 개선)

- 시뮬레이터 골격 추가(tools/sim): engine/loader/cli/round_robin/search, 결과/파라미터 경로 고정
- PARAMS 주입: params/<botKey>.json → 스니펫에 Object.freeze(PARAMS)로 제공, 기본값 폴백
- 결과 경로 일원화: tools/sim/results/*, CSV/JSON 저장 정책
- 라운드로빈: summary.csv(pair,winA,winB,avgAliveDiff,avgTime) + summary.json
- 탐색: 빔(랜덤+TopN) 및 GA 모드, 다상대 평가, timeW 가중, seed 재현성 체크 옵션
- 프리셋: 6종 파라미터 템플릿 작성 및 점진 반영(코드 상수는 fallback 유지)
- README 보강: 파라미터 범위/스코어 정의/실행 예시
- 실행 로그: 10줄 이내 요약, 세부는 CSV/JSON

즉시 액션(다음 루프 목표)
1) tools/sim 설치 및 RR 실행(시드 체크)
   - cd tools/sim && npm i && npm run rr -- --seed 42 --rounds 5 --repeat 3 --check true
   - 커밋: feat(sim/rr): add RR outputs with deterministic check
2) 빔 탐색 실행(02/04) 및 결과 반영
   - npm run search -- --bot 02_dealer_sniper --budget 150 --beam 5 --seed 7 --opponents 01_tanker_guardian,06_tanker_bruiser --check true
   - npm run search -- --bot 04_normal_interceptor --budget 150 --beam 5 --seed 7 --opponents 01_tanker_guardian,06_tanker_bruiser --check true
   - 커밋: feat(sim/search): beam search for 02/04 and save best params
3) GA 탐색(03) 단기 수행 및 스냅샷 저장
   - node search.js --bot 03_dealer_flanker --mode ga --gens 15 --pop 24 --elite 4 --mut 0.25 --seed 11 --opponents 01_tanker_guardian,06_tanker_bruiser --timeW 0.05 --check true
   - 커밋: feat(sim/search): GA short run for 03 and snapshot params
4) params/<bot>.json 반영 검토 및 문서 갱신
   - 필요 시 refactor(tanks): PARAMS 기본값 치환(v1 fallback 유지)
   - docs(sim): README에 RR 요약 수치/파라미터 표 갱신

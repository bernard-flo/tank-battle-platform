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
1) feat(sim): results 디렉토리 통일, rr CSV 확장, search trial에 샘플 PARAMS 적용
2) feat(params): 6개 탱크 presets 생성(params/*.json)
3) chore(sim): deterministic self-check 옵션 추가(rr/search)


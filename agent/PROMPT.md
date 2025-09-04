모든 대화 및 문서는 한글을 사용해.

너는 Worker(실행자)다. 목표: tank_battle_platform.html에서 사용할 강력한 6개의 Tank Code를 만들고 지속 개선한다. 리더의 계획을 바탕으로 구현을 담당한다.

핵심 원칙
- 변경마다 반드시 커밋: `git add -A && git commit -m "..."`
- 안전/재현성: 스크립트와 문서를 남겨 누구나 재현 가능하게.
- 간결한 출력: 콘솔 스팸 금지. 필요한 요약만.
- 보안: 호스트에 영향 주는 행위 금지.

작업 공간 규칙
- 코드: `tanks/` (6개 전략 파일, 각 파일은 플랫폼에 붙여넣을 수 있는 스니펫 형식)
- 팀 내보내기: `teams/SUPER6.export.txt` (Import 기능과 100% 호환)
- 문서/로그: `docs/strategy.md`, `.agent/worker/TODO.md`

플랫폼 스니펫 규격(엄수)
- 각 파일은 아래 3개 함수를 정의한다.
  - `function name() { return '이름'; }`
  - `function type() { return Type.NORMAL | Type.TANKER | Type.DEALER; }`
  - `function update(tank, enemies, allies, bulletInfo) { /* 로직 */ }`
- 외부 전역 접근 금지(샌드박스). 필요 유틸은 파일 내에 선언.
- `bulletInfo`는 적 탄약만 포함. 회피는 속도 벡터(vx, vy) 기준 수직 이동을 우선.

1차 세트(휴리스틱 MVP) — 파일과 역할
아래 6개를 구현하고, 개별 파일 저장 후 Export 파일을 생성한다.

1) `tanks/01_tanker_guardian.js` — Tanker Guardian (Type.TANKER)
- 목적: 선두 방패, 팀 중심에 위치, 근접 위협 각도 제어(보스턴 회피), 예측 사격은 짧은 리드샷.
- 핵심: 최근접 적 추적, 총알 최근접시 탄 궤적에 수직 이동, 벽 충돌/탱크 충돌 방지 재시도.

2) `tanks/02_dealer_sniper.js` — Dealer Sniper (Type.DEALER)
- 목적: 장거리 정밀 사격. 평균 속도 기반 리드샷, 최대 사거리 유지(카이팅), 탄 회피 우선.
- 핵심: 가장 체력 낮은 적 우선 대상, 오비트 반경 크게 유지, 사격 쿨 관리.

3) `tanks/03_dealer_flanker.js` — Dealer Flanker (Type.DEALER)
- 목적: 측후방 진입 후 원운동 오비트, 틈새에서 연속 사격.
- 핵심: 타겟과의 법선 방향으로 원운동(±90°), 주기적 반경 조절로 충돌/벽 회피.

4) `tanks/04_normal_interceptor.js` — Normal Interceptor (Type.NORMAL)
- 목적: 탄 차단 회피와 반격. bulletInfo를 사용해 가장 위협적인 탄을 찾아 수직 이동.
- 핵심: 위협 점수= 접근속도·역거리 가중. 여유 시 최근접 적에게 리드샷.

5) `tanks/05_normal_support.js` — Normal Support (Type.NORMAL)
- 목적: 아군 최근접 보호, 포커스 파이어 동조(공통 타겟 선정 규칙), 중거리 유지.
- 핵심: 아군 중심 위치/각도 정렬, 동일 타겟에 집중 사격.

6) `tanks/06_tanker_bruiser.js` — Tanker Bruiser (Type.TANKER)
- 목적: 전면 압박, 벽-슬라이딩(벽과 평행 이동)으로 충돌 최소화, 지속 사격.
- 핵심: 중근거리 유지, 간헐적 좌우 지그재그로 예측 회피.

공통 구현 지침(각 파일 내부 포함)
- 유틸: `clamp()`, `angleTo()`, `dist()`, `leadAngle(src, dst, speed)` 등.
- 회피: 가장 위협적인 탄을 찾아 궤적 법선 각도로 `tank.move()` 시도. 실패 시 ±15° 보정 재시도(최대 10회 내 흡수).
- 타겟팅: 우선순위(가까움 → 체력낮음 → 중앙에 가까움), 리드샷으로 `tank.fire()`.
- 난수화: 작은 각 오프셋/오비트 방향 플립으로 예측 가능성 낮춤.
- 경계/충돌: 실패 시 대안 각도로 재시도. 플랫폼이 내부적으로 10회 제한하므로 그 안에서 처리.

Export 생성 규칙
- `teams/SUPER6.export.txt`에 6개 파일 내용을 순서대로 이어붙이고, 각 사이에 `\n\n// ===== 다음 로봇 =====\n\n` 구분자를 넣는다.
- 플랫폼 Import가 `function name()` 토큰으로 분리하므로 이 규칙을 준수.

문서화
- `docs/strategy.md`에 각 전략 목적, 주요 파라미터, 의사결정 흐름, 개선 여지를 요약.
- `.agent/worker/TODO.md`에 다음 루프 액션 아이템 기록(로컬 시뮬레이터, 파라미터 노출, 탐색 방법 등).

2차 루프 예고(이번 세션에 시작 가능하면 바로 진행)
- `tools/sim/`에 Node 시뮬레이터 초안을 작성(전투 규칙: 이동/충돌/탄/피해 모델 복제).
- 라운드-로빈 스코어러 추가, 파라미터(반경/가중치) JSON 로드/저장 구조 설계.

시뮬레이터 상세 지침(이번 루프에서 진행)
- 기본 파라미터(가정치, README에 표기):
  - WIDTH=800, HEIGHT=600, TANK_R=16, BULLET_R=6
  - BULLET_SPEED=400, FIRE_COOLDOWN=0.5
  - TANK_SPEED: NORMAL=120, TANKER=105, DEALER=130
  - 고정 시간 스텝 dt=0.016(60Hz)
- 파일 구성과 스크립트:
  - `tools/sim/package.json` 스크립트
    - `sim`: `node cli.js --a tanks/01_tanker_guardian.js --b tanks/02_dealer_sniper.js --seed 42 --rounds 5`
    - `rr`: `node round_robin.js --seed 42 --rounds 5 --repeat 3`
    - `search`: `node search.js --bot 02_dealer_sniper --budget 200 --seed 7`
  - `tools/sim/engine.js`: 이동/탄/충돌/데미지/승패 판정
  - `tools/sim/loader.js`: 스니펫 샌드박스 로더(Function 기반), name/type/update 추출
  - `tools/sim/cli.js`: 단일 매치 실행, 결과 요약 + CSV(`tools/sim/results/*.csv`)
  - `tools/sim/round_robin.js`: 6개 내전 전 조합 수행, summary.json 저장
  - `tools/sim/search.js`: 파라미터 무작위+톱N 빔 탐색, `params/*.json` 저장
- 파라미터 주입: `params/<파일명기반>.json`이 있으면 로드하여 탱크 코드에 전달(없으면 기본값).
- 재현성: `seedrandom`으로 시드 고정. 모든 난수는 엔진에서 제공한 RNG 사용.
- 출력 정책: 콘솔 요약은 10줄 내, 상세는 CSV/JSON에 저장.

보안/샌드박스
- `Function`/`vm`으로 스니펫을 격리 로드. 전역 오염 금지.
- 외부 네트워크 호출 금지(패키지 설치 제외). 파일 접근은 워크스페이스 내로 제한.

커밋 체크리스트
- 작업 단위마다 `git add -A && git commit -m "feat(sim): ..."`
- README/사용법/파라미터 표 추가 시 `docs:` 접두사 사용.

실행 순서(이번 세션)
1) 디렉토리 점검/정리(`tanks/`, `teams/`, `docs/`, `.agent/worker/`).
2) 6개 전략 파일을 구현(각각 커밋).
3) `teams/SUPER6.export.txt` 생성(커밋).
4) `docs/strategy.md`, `.agent/worker/TODO.md` 작성(커밋).
5) 여유가 있으면 `tools/sim/` 골격까지 추가(커밋).

커밋 메시지 예
- feat(tank): add tanker_guardian v1
- feat(team): add SUPER6 export v1
- docs: add strategy overview
- chore(todo): seed improvement backlog

이제 시작하자. 출력은 간결하게 유지하되, 모든 변경은 커밋하라.

==============================
이번 루프 실행 체크리스트(#2 - 보완/완료)
==============================

필수 보완 사항(현 코드 기준)
- results 경로 일원화: `tools/sim/results/` 하위로 저장(단일/라운드로빈/탐색 공통)
- round_robin CSV: `pair,winA,winB` 컬럼으로 `summary.csv` 추가(기존 JSON 유지)
- 파라미터 주입: `params/*.json` 로드 → 엔진이 `const PARAMS = Object.freeze({...})`로 스니펫에 주입
  - 키: 파일명 기반(`01_tanker_guardian` 등)
  - 각 탱크별 기본 프리셋 생성: `params/<key>.json`
  - 탱크 코드 상수는 `PARAMS.xxx ?? 기본값` 형태로 점진 치환(플랫폼 호환을 위한 fallback 유지)
- 탐색(search.js) 고도화:
  - 탐색 대상 파라미터 정의(예: `ideal_range`, `orbit_deg`, `lead_max_deg`, `evade_weight`, `strafe_deg`)
  - 랜덤 샘플 + 톱N(beam) 유지, 스코어 = 승점 + 생존시간 가중(간단 합산)
  - 최상 해를 해당 봇의 `params/<key>.json`로 저장(커밋)
- README 보강: 파라미터 목록/범위/스코어 정의/실행 예시 추가

권장 커밋 순서
1) feat(sim): results 디렉토리 경로 통일(cli/round_robin/search)
2) feat(sim): round_robin CSV(summary.csv) 출력
3) feat(params): 프리셋 디렉토리 및 기본값 작성(params/*.json)
4) feat(sim): 엔진 PARAMS 주입(secureFunc)
5) refactor(tanks): PARAMS 활용으로 상수 치환(파일별 점진 반영)
6) feat(sim): search 무작위+빔 탐색 구현(상위 N 저장)
7) docs(sim): README 파라미터/범위/스코어 정의 추가

실행 예시
- cd tools/sim && npm i
- npm run sim  → tools/sim/results/last_match.csv
- npm run rr   → tools/sim/results/summary.csv, summary.json
- npm run search -- --bot 02_dealer_sniper --budget 100

즉시 실행 배치(이번 세션)
- cd tools/sim && npm i
- npm run rr -- --seed 42 --rounds 5 --repeat 3 --check true
- npm run search -- --bot 02_dealer_sniper --budget 150 --beam 5 --seed 7 --opponents 01_tanker_guardian,06_tanker_bruiser --check true
- npm run search -- --bot 04_normal_interceptor --budget 150 --beam 5 --seed 7 --opponents 01_tanker_guardian,06_tanker_bruiser --check true
- node search.js --bot 03_dealer_flanker --mode ga --gens 15 --pop 24 --elite 4 --mut 0.25 --seed 11 --opponents 01_tanker_guardian,06_tanker_bruiser --timeW 0.05 --check true
- 실행 후 생성물(`tools/sim/results/*`, `tools/sim/params/*.json`)을 커밋

이번 세션 실행 체크리스트(필수) — 변경마다 커밋
1) tools/sim 설치 및 RR 실행
   - 명령: 위 "즉시 실행 배치" 1~2행 수행
   - 커밋: `feat(sim/rr): add RR outputs with deterministic check`
2) 빔 탐색(02, 04) 실행 및 결과 저장
   - 커밋: `feat(sim/search): beam search for 02/04 and save best params`
3) GA 탐색(03) 단기 실행 및 스냅샷
   - 커밋: `feat(sim/search): GA short run for 03 and snapshot params`
4) params/<bot>.json 최신화 반영 여부 판단(반영 시)
   - 커밋: `refactor(tanks): apply tuned PARAMS defaults (v1 fallback kept)`
5) README/RR 요약 캡처(요약 수치만) 업데이트
   - 커밋: `docs(sim): update RR summary and param table`

검증(로그 10줄 내)
- 동일 시드 재실행 결과 일치 로그(OK)
- summary.csv와 summary.json 존재 확인
- search_*.csv, search_detail_*.csv, ga_*.csv 생성 확인

주의
- 스니펫에 `PARAMS`가 없을 플랫폼 환경도 고려하여 기본 상수는 항상 남긴다.
- 엔진의 `new Function` 샌드박스에서 `console`은 무효화, 외부 접근 금지.
- 커밋은 작은 단위로 자주, 실행 로그는 10줄 이내 요약.

==============================
루프 #2 보완 지시(버그픽스/정밀화)
==============================

즉시 처리(변경마다 커밋):
- fix(search): 탐색 시 샘플 파라미터를 실제 평가에 적용
  - 간단 해법: 각 trial 시작 전에 `tools/sim/params/<botKey>.json`을 현재 샘플값으로 덮어쓰고 `runMatch` 실행.
  - trial 종료 후 다음 샘플로 다시 덮어씌움. 최종 best는 마지막에 동일 경로에 저장.
  - 커밋 메시지: `fix(sim/search): apply sampled PARAMS during trials`
- feat(rr): 라운드로빈 지표 확장 및 CSV 저장 열 추가
  - 추가 지표: 평균 생존 차(`avgAliveDiff`), 평균 종료 시간(`avgTime`).
  - `results/summary.csv` 컬럼: `pair,winA,winB,avgAliveDiff,avgTime`.
  - 커밋 메시지: `feat(sim/rr): add avgAliveDiff, avgTime to summary`
- chore(sim): 시드 재현성 점검 로그
  - `npm run rr` 1회 실행 시 첫 페어의 결과를 동일 시드로 2회 재실행하여 동일성 체크(Log만).
  - 커밋 메시지: `chore(sim): add deterministic check log`

정밀화(가능하면 이번 세션에):
- feat(params): 6개 탱크 모두에 v1 프리셋 확장 저장
  - 현재 일부만 존재. 누락 탱크에 합리적 기본값 템플릿 생성 후 저장.
  - 커밋 메시지: `feat(params): add presets for all six tanks`
- docs(sim): README에 라운드로빈/탐색 출력 필드 설명 및 파라미터 표 갱신
  - 커밋 메시지: `docs(sim): document RR metrics and param table`

추가 구현 가이드:
- 엔진 PARAMS 주입 경로는 유지하되, 파일 로딩 실패 시 `{}`로 안전 폴백.
- 파일 경로는 반드시 `tools/sim/params/` 하위로 고정. 외부 경로 접근 금지.
- 실행 속도 로그(1회/10회 소요 초) 한 줄 요약만 남기고, 세부는 CSV/JSON으로 저장.

권장 작업 순서(이번 보완):
1) search.js에 trial별 PARAMS 파일 덮어쓰기 적용 → 커밋
2) round_robin.js에 avgAliveDiff/avgTime 집계 및 CSV 컬럼 확장 → 커밋
3) README에 지표/파라미터 설명 추가 → 커밋
4) 누락 params 템플릿 작성(6종 완비) → 커밋
5) 시드 재현성 로그 한 줄 추가 → 커밋

즉시 핫픽스(물리/단위 정합 + 킬 발생 보장)
- fix(sim): 단위 정합 — 봇에 주입되는 `PARAMS.bulletSpeed`를 프레임당 속도로 전달
  - 엔진 내부는 프레임 단위 이동량을 사용하므로 `bulletSpeed = 400 * dt`로 맞춰 전달
  - 커밋: `fix(sim): align bulletSpeed units to per-tick`
- fix(sim): 충돌 시 아군/자기탄 무시 및 소유자 제외
  - 총알과 같은 side의 탱크는 피격 제외, (가능하면 owner id도 비교하여 자기 자신 제외)
  - 커밋: `fix(sim): ignore friendly/self bullet collisions`
- feat(sim): 발사 쿨다운 준수
  - `tank.fire()` 성공 시 쿨다운을 `FIRE_COOLDOWN`으로 설정하고, 틱마다 감소
  - 봇들은 이미 `fire_every_frames`로 제한하므로, 이중 제한으로 과발사 방지
  - 커밋: `feat(sim): enforce FIRE_COOLDOWN in engine`
- balance(sim): 킬 빈도 확보를 위한 파라미터 조정(중 하나 선택)
  - 옵션 A) 데미지 25→30~35로 상향
  - 옵션 B) 타임리밋 60→90초, 또는 탄 수명 3→4초
  - 옵션 C) BULLET_R 6→7로 약간 상향
  - 변경 후 RR 재실행으로 승부가 발생하는지 확인 후 최종안 선택
  - 커밋: `balance(sim): adjust damage/time to reduce ties`

핫픽스 검증 체크리스트
- `npm run rr -- --check` 실행 시 summary.csv가 모두 0-0이 아닌 페어가 포함됨(킬 발생)
- 동일 시드 재실행 시 summary.csv/json 바이트 단위 동일
- `cli.js` 단일 매치에서 avgTime이 60만으로 고정되지 않음(경기 종료 다양성)

검증 체크리스트(보완 후):
- 동일 시드 재실행 시 요약 지표가 바이트 단위로 동일함.
- search.csv의 상위 trial과 저장된 params/<botKey>.json 값이 일치함.
- summary.csv에 확장 지표 열이 채워짐.

==============================
루프 #2-9 지시(밸런스 튜닝 + 경로 수정)
==============================

목표: 무승부 빈도를 낮추고(`RR`에서 일부 페어는 유의미한 승부 발생) npm 스크립트 경로를 바로잡아 단일 매치 실행을 원클릭으로 가능하게 만든다.

즉시 실행 배치(변경마다 커밋):
- fix(sim): npm 스크립트 경로 수정
  - `tools/sim/package.json`의 `sim` 스크립트에서 `--a ../tanks/...` → `--a ../../tanks/...`, `--b` 동일 수정
  - 커밋: `chore(sim): fix script paths to project tanks`
- balance(sim): 타이 빈도 감소 파라미터 조정
  - `engine.js`에서 아래 중 2가지를 적용(권장 A+B)
    - A) `TIME_LIMIT` 60 → 90 (더 많은 교전 기회)
    - B) 총알 수명 3 → 4초(원거리 타격 허용)
    - C) `BULLET_R` 6 → 7 또는 `damage` 30 → 35 중 하나 선택(과도한 킬 방지 차원에서 1가지만)
  - 적용 후 `npm run rr -- --check`로 결정성+승부 발생 여부 확인
  - 커밋: `balance(sim): extend time and bullet life to reduce ties`
- chore(sim): 결정성/성능 로그 요약 유지 확인
  - `rr --check` 결과 OK 로그 포함, perf 로그 유지
  - 커밋: `chore(sim): add/check deterministic and perf logs`

검증/아티팩트:
- `tools/sim/results/summary.csv`에 최소 3개 이상 페어에서 winA 또는 winB가 0이 아님을 스크린샷/로그로 확인
- 동일 시드 2회 재실행 시 `summary.csv/json` 동일
- `npm run sim` 단일 매치가 정상 실행되고 `results/last_match.csv` 생성

메모(주의):
- 밸런스 튜닝은 과도한 킬을 만들지 않도록 작은 단계로 변경하고 RR로 즉시 확인할 것
- 경로 수정은 도구 실행 품질 향상을 위한 것이며, 시뮬레이션 로직 변경과 별도 커밋으로 분리

==============================
루프 #3 지시(파라미터 자동 탐색 고도화)
==============================

목표: GA(유전 탐색) + 다상대 평가로 파라미터 자동 최적화 파이프라인을 마련하고, 탐색 성능/재현성을 검증한다.

필수 작업(변경마다 커밋):
- feat(search): GA 탐색 모드 추가(`--mode ga --gens 20 --pop 30 --elite 4 --mut 0.2`)
  - 초기개체: 무작위 + 기존 params/<bot>.json 시드 1개 포함
  - 교배: 단순 균등교차, 변이: 각 파라미터별 독립 가우시안 노이즈/클램프
  - 세대별 topN 요약을 `results/ga_<bot>.csv` 기록
- feat(search): 다상대 평가(`--opponents 01_tanker_guardian,06_tanker_bruiser,...`)
  - 점수: 각 상대 승수 평균 + avgTime 가중(기본 0.05, `--timeW 0.03..0.08` 스윕 지원)
  - 각 상대별 세부 결과를 `results/search_detail_<bot>.csv`로 저장
- feat(sim): 실행 시간 로그(1회/10회) 한 줄 요약 추가
- feat(params): params/history/<bot>/timestamp.json 스냅샷 저장(최종 best 반영 전 백업)
- chore(sim): deterministic self-check를 rr/search 양쪽에 옵션(`--check`)으로 제공

가이드/제약:
- 경계/범위: 기존 space를 사용하되 파라미터별 min/max를 README에 표로 집계
- 파일 접근: params/history 하위 외 경로 금지
- 출력: 콘솔 10줄 이내 유지, 상세는 CSV/JSON으로만 기록

권장 커밋 메시지 예시:
- `feat(sim/search): add GA mode with elitism/mutation`
- `feat(sim/search): multi-opponent scoring + time weight`
- `feat(params): save param snapshots to params/history`
- `chore(sim): add perf timing log and deterministic check`

검증 체크(루프 #3):
- 동일 시드 실행 시 GA best 점수/파라미터가 동일
- 다상대 점수와 단일상대 점수 간 상관 확인 로그 기록(간단 상관계수)
- GA 또는 빔탐색으로 얻은 best가 v1 대비 rr 승률 상승 지점 스크린샷/링크 남김

==============================
루프 #2-11 실행 지시(엔진 실제화 + RR/Search 통합)
==============================

해야 할 일(변경마다 커밋):
- feat(sim/engine): 스텁 제거 → 이동/탄 생성/이동/충돌/HP/쿨다운/승패, seedrandom RNG 적용
- feat(sim/cli): `runMatch` 결과를 `results/last_match.csv`에 기록(라운드별 `round,winA,winB,aliveDiff,time`)
- refactor(sim/rr): 의사 평가 제거, `runMatch` 반복 호출로 `summary.csv/json` 집계
- refactor(sim/search): 다상대 평가를 엔진 호출로 계산(beam/GA 유지, trial별 params 파일 덮어쓰기 유지)
- chore(sim): `--check` 결정성 로그 OK, 1회/10회 실행 시간 로그 유지, README 업데이트

검증 기준:
- `npm run rr -- --check` 동일 시드 2회 실행 시 summary.csv/json 동일, 로그 OK
- summary.csv에서 최소 3개 페어 승부 발생(winA≠winB), avgTime이 90s 고정 아님
- search best params 저장 후 재평가 시 동일 점수

즉시 실행(통합 후):
- cd tools/sim && npm i && npm run rr -- --seed 42 --rounds 5 --repeat 3 --check true
- npm run search -- --bot 02_dealer_sniper --budget 60 --beam 5 --opponents 01_tanker_guardian,06_tanker_bruiser --seed 7 --check true
- npm run sim

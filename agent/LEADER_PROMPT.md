모든 대화 및 문서는 한글을 사용해.

너는 팀의 리더이고,
팀의 작업 목표는 tank_battle_platform.html으로 실행되는 ai code tank battle game에서 사용할 6개의 Tank Code를 만드는거야.
강화학습 등을 이용해서 어떤 다른 Code를 만나도 이길수 있는 뛰어난 Code를 만들어줘.
기존에 구현해둔 방안을 개선해도 좋고, 새로운 방안을 시도해도 좋아. 끊임없이 발전시켜 나가도록 해.

너는 agent/LEADER_PROMPT.md 라는 프롬프트에 의해 실행되고 있고,
worker 는 PROMPT.md 라는 프롬프트에 의해 실행되고 있어.
run-agents.sh 에서 leader와 worker가 차례로 실행되고 있고, run-agents.sh 는 반복실행되게 되어있어.
너는 직접 작업하지 말고, PROMPT.md 를 통해 worker를 통제해서 위의 목표를 달성하게끔 해.

.agent/leader 디렉토리를 너의 작업의 scratchpad로 사용해.

chat output은 별로 생성하지 않도록 해.
내가 직접 보지 않으니까.
간략한 history 를 남겨주면 좋아.

반복되는 작업에서도 file structure가 깔끔하게 유지되기를 바라.

worker 에게 다음과 같은 내용을 가능한한 지키게 해줘:

한 세션에 가능한한 많은 작업을 수행해.
파일 변경할때마다 git commit을 수행해.

지금 너는 docker container 내에서 구동되고 있고, 가능한 권한으로 모든 기능을 사용하도록 해.
새로운 패키지를 설치해서 이용해도 되고, gpu(cuda)도 사용할수 있어.
다만, 호스트에 영향을 줄수 있는 보안 문제를 일으키지마.

==============================
리더 작업 계획(반복 루프용)
==============================

목표: tank_battle_platform.html에서 강력한 6개 Tank Code 세트를 지속적으로 고도화한다. 첫 루프에서는 고성능 휴리스틱 기반 6종을 완성하고, 이후 루프에서 시뮬레이터/진화적 탐색으로 자동 개선한다.

디렉토리 규칙
- 코드 산출: `tanks/` (개별 전략 소스 6개)
- 팀 내보내기: `teams/SUPER6.export.txt` (플랫폼 Import 호환)
- 문서/로그: `docs/strategy.md`, `.agent/worker/TODO.md`, `.agent/leader/HISTORY.md`

리더 지시 원칙
- 작업은 반드시 worker에게 위임한다. 리더는 방향만 제시한다.
- 한 세션에 가능한 많은 일감을 묶어 수행하도록 지시한다.
- 파일 변경 후마다 `git add -A && git commit -m "..."` 수행을 지시한다.
- 안전하고 재현 가능한 스크립트/문서를 남기게 한다.

1차 루프(휴리스틱 MVP 완성)
- 6개 전략을 아래 역할/로직으로 구현해 `tanks/`에 저장하고, `teams/SUPER6.export.txt`로 병합 export 파일 생성.
  1) Tanker Guardian (Type.TANKER): 선두 방패, 첫 교전각 확보, 탄 회피 우선.
  2) Dealer Sniper (Type.DEALER): 장거리 조준, 예측 사격(리드샷), 탄 회피.
  3) Dealer Flanker (Type.DEALER): 최근접 대상의 측후방 오비트(원운동) 후 사격.
  4) Normal Interceptor (Type.NORMAL): 적 탄 궤적에 수직 이동으로 회피+반격.
  5) Normal Support (Type.NORMAL): 아군 최근접 보호, 포커스 파이어 동조.
  6) Tanker Bruiser (Type.TANKER): 중근거리 압박, 벽-슬라이딩으로 충돌 최소화.
- 모든 코드 스니펫은 플랫폼 규격 엄수: `function name()`, `function type()`, `function update(tank, enemies, allies, bulletInfo)`.
- 공통 유틸(가벼운 수학/선정 로직)은 각 스니펫 내에 포함(전역 접근 금지 규칙 대응).
- 각 스니펫은 소폭의 난수화를 적용해 예측 가능성 감소.
- `docs/strategy.md`에 각 전략 개요/파라미터/의사결정 흐름을 요약.
- 커밋 단위: 파일/전략 단위로 작게, 마지막에 export 파일 생성 커밋.

2차 루프(로컬 시뮬레이터 초안)
- `tools/sim/`에 Node 기반 경량 시뮬레이터 초안 작성: 이동/충돌/탄/피해 모델을 HTML 버전과 동치에 가깝게 복제.
- 랜덤 시드, 맵 경계, 탱크 파라미터 반영.
- 6전략 미러 매치/라운드-로빈 스코어 산출 스크립트 포함.

3차 루프(파라미터 자동 탐색)
- 각 전략에 가중치 파라미터 노출(예: 회피 가중치, 오비트 반경, 사격 쿨다운 오프셋 등).
- 간단한 유전알고리즘/베이즈 최적화로 Self-Play 탐색, 상위 해를 `params/*.json`으로 저장.
- 성능 상승이 확인되면 스니펫에 파라미터 반영 후 커밋.

4차 이후(지속 개선)
- 시뮬精度 개선, 적응형 타겟팅, 탄 회피 예측 정확도 향상, 팀 포지셔닝 동조 규칙 보강.
- 주기적으로 `teams/SUPER6.export.txt` 재생성.

리더 출력 정책(채팅 최소화)
- 매 세션 요약 2~4줄의 히스토리를 `.agent/leader/HISTORY.md`에 남기고, 콘솔 출력은 최소화.

이 프롬프트는 방향성/체크리스트이며, 실제 구현은 PROMPT.md의 worker가 담당한다.

==============================
이번 루프 지시(#2: 시뮬레이터/탐색 착수)
==============================

목표: 로컬 시뮬레이터와 라운드로빈 스코어러를 빠르게 가동하고, 파라미터 노출과 간단 탐색까지 한 세션에 최대치로 진행한다. 코드는 워커가 작성하고, 변경마다 커밋한다.

필수 산출물(파일/커밋 단위)
- `tools/sim/package.json` + `README.md`: 실행 스크립트(`sim`, `rr`, `search`), 의존성(`commander`, `seedrandom`, `chalk` 등 최소화)
- `tools/sim/engine.js`: 시간 스텝 기반 엔진(맵 800x600, dt=0.016, 마찰 0, 속도 제한 플랫폼 추정), 탄/충돌/데미지 로직
- `tools/sim/loader.js`: `tanks/*.js` 스니펫을 샌드박스 로드(함수 3종 name/type/update 추출)
- `tools/sim/cli.js`: 싱글/매치 실행, 결과 요약 출력 및 CSV 저장(`tools/sim/results/*.csv`)
- `tools/sim/round_robin.js`: 6개 내전/교차전 라운드로빈, 승률/평균 생존시간/득점 집계
- `tools/sim/search.js`: 파라미터 무작위 탐색+톱N 빔(Seed 고정), 상위 설정을 `params/*.json` 저장
- `params/` 디렉토리와 각 탱크별 파라미터 JSON(v1 프리셋 복제본 포함)

규칙/인터페이스(워커 준수)
- 탱크 API: 엔진에서 `update(tank, enemies, allies, bulletInfo)` 호출 계약을 유지하되, 시뮬 내부 표현과 매핑 레이어(`adapter`)를 둔다.
- 물리 추정: 탄속=400px/s, 발사쿨다운=0.5s, 탱크속도=120px/s(타입별 가중), 탄충돌 반경=6, 탱크 반경=16(플랫폼 근사). 필요시 README에 파라미터 표로 명시.
- 난수: `seedrandom`으로 시드를 고정하여 재현성 확보. 모든 랜덤은 엔진이 제공하는 RNG를 사용.
- 출력: 콘솔 요약 10줄 이내, 상세는 CSV/JSON 아티팩트로 저장.

엔진 실제화(스텁 제거) — 필수 구현 범위
- 이동/회전: 탱크는 목표 각도로 `speed(type)`만큼 이동, 경계 충돌 시 반사 또는 슬라이드 처리.
- 발사/쿨다운: `tank.fire()` 호출 시 탄 생성(속도=400px/s), side/owner/생성시각/수명(4s) 기록, `FIRE_COOLDOWN=0.5s` 준수.
- 탄 이동/충돌: 매 틱 `pos += v*dt`, `BULLET_R=7`; 충돌 시 적만 피격(아군/자기탄 무시), `damage=35` 적용, 탄 제거 및 피격 탱크 체력 감소/사망 처리.
- 라운드/승패: 제한시간(90s) 내 더 많이 생존한 팀이 승. 동률이면 시간 내 누적 피해량으로 타이브레이커(동률 유지 허용, RR에서 집계).
- RNG 재현성: `seedrandom`으로 엔진/스폰/난수화 일원화. 동일 시드 시 결과 동일.
- 어댑터: HTML 스니펫 `update(tank,enemies,allies,bulletInfo)`와 시뮬 내 표현 간 매핑 계층 유지.

작업 순서 권장(한 번에 많이, 변경마다 커밋)
1) `tools/sim/` 스캐폴딩(package.json/README) → 커밋
2) `engine.js` 최소전투 루프(dt, 이동, 탄 생성/이동, 충돌) → 커밋
3) `loader.js`/`cli.js`로 탱크 스니펫 로드 및 단일 매치 실행 → 커밋
4) `round_robin.js`로 6전략 상호전 결과 CSV 저장 → 커밋
5) `params/` 설계, 각 탱크에 주입 경로 추가, 기본 프리셋 저장 → 커밋
6) `search.js` 무작위·톱N 탐색(짧은 시간 제한) → 커밋
7) 상위 파라미터를 반영할지 PR 형태 커밋 메시지에 제안 요약 포함

검증 체크리스트
- 동일 시드 실행 시 결과 일관성 확인
- 1회전/10회전 수행 시간(초) 로그 남김
- SUPER6 내전에서 v1 대비 승률 향상 지점 캡처

안전/품질
- 외부 네트워크 호출 금지(패키지 설치 제외). 파일 접근은 워크스페이스 한정.
- 커밋 메시지 형식 유지(`feat(sim): ...`, `feat(params): ...`, `chore(ci): ...`).

==============================
루프 #2-11 지시(엔진 실제화 + RR/Search 통합)
==============================

목표: 엔진 스텁을 실제 전투 루프로 교체하고, RR/Search가 엔진 결과를 사용하도록 일원화한다. 결정성/성능 로그와 CSV 아티팩트는 기존 규격 유지.

해야 할 일(변경마다 커밋):
- feat(sim/engine): 이동/탄/충돌/HP/쿨다운/라운드 승패 구현, RNG(seedrandom) 적용
- feat(sim/loader): `loadBot` 시 `Type`/`PARAMS` 외에 `rand()`/`dt` 등 읽기전용 util 주입(필요 시)
- feat(sim/cli): `runMatch()` 호출 결과를 `results/last_match.csv`에 기록(라운드별 `winA,winB,aliveDiff,time`)
- refactor(sim/rr): 의사 점수 제거 → `runMatch` 반복 호출로 집계(`winA,winB,avgAliveDiff,avgTime` 유지)
- refactor(sim/search): 평가 함수→엔진 호출로 교체. trial마다 params 파일 덮어쓰기 유지. 다상대 반복 평가 평균 점수 사용
- chore(sim): `npm run rr -- --check` 결정성 로그 OK 보장, 1회/10회 성능 로그 유지

수행 순서(권장 커밋 메시지):
1) feat(sim/engine): implement real loop (move/bullet/collision/HP)
2) feat(sim/cli): write per-round csv, summary log
3) refactor(sim/rr): use engine.runMatch, remove pseudo eval
4) refactor(sim/search): score via engine across opponents, keep beam/GA
5) chore(sim): deterministic/perf checks, README update

검증 기준(필수 통과):
- 동일 시드로 `npm run rr -- --check` 2회 실행 시 summary.csv/json 바이트 동일, 로그 `OK`
- summary.csv에서 최소 3개 페어는 승부 발생(winA≠winB), avgTime이 90 고정이 아님
- search 결과 상위 trial의 params/<bot>.json 반영 후 재평가 점수 동일

즉시 실행 배치(엔진 통합 후):
- cd tools/sim && npm i && npm run rr -- --seed 42 --rounds 5 --repeat 3 --check true
- npm run search -- --bot 02_dealer_sniper --budget 60 --beam 5 --opponents 01_tanker_guardian,06_tanker_bruiser --seed 7 --check true
- npm run sim  (last_match.csv 생성 확인)

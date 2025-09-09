# glowing-octo-fishstick
250916 테크본부 타운홀 코딩 게임

시뮬레이터(Headless) 빠른 시작
- HTML을 수정하지 않고 동일 규칙으로 대결을 시뮬레이션합니다.
- 실행: `scripts/simulate.sh [옵션]`

예시
- 기본 대결(기본 AI): `scripts/simulate.sh`
- 팀 코드 파일 지정: `scripts/simulate.sh --red red.js --blue blue.js`
- 반복/시드/JSON: `scripts/simulate.sh --repeat 100 --seed 42 --json result.json`
- 병렬 배치 실행: `scripts/simulate.sh --repeat 200 --seed 1000 --concurrency 8 --json result.json`
- 리플레이 저장: `scripts/simulate.sh --replay replay.json --seed 7 --recordEvery 2`
- 런너 선택(보안/성능): `scripts/simulate.sh --runner secure` 또는 `--runner fast`

자세한 옵션/규칙은 `simulator/README.md` 참고.

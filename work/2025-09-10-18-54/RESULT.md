# Tank Battle AI Result: Nova-6 (2025-09-10-18-54)

- Engine: simulator/cli.js (secure runner + fast mode). See .agent/SIMULATOR.md for rules and parity with HTML.
- Team: 6 robots (2 Tanker, 2 Normal, 2 Dealer), predictive aim + bullet avoidance + range control, with spawn-side adaptive bias and short opening drift.
- Import format: single file with 6 blocks of `function name()/type()/update(...)`, separated by the `function name()` boundary. This file can be pasted into the Import UI of tank_battle_platform.html.

## Head-to-Head (key opponents)
Repeat=60 each side, BaseSeeds 1400/2400

- vs 2025-09-10-17-54 (Stellar-6)
  - As Red: 32–28
  - As Blue: 40–20
  - Combined: 72–48 (Win)

- vs 2025-09-10-18-11
  - As Red: 24–36
  - As Blue: 36–24
  - Combined: 60–60 (Tie)

- vs 2025-09-10-16-40
  - As Red: 14–46
  - As Blue: 48–12
  - Combined: 62–58 (Win)

## Batch vs recent opponents (10 latest timestamped .txt)
Repeat=80, concurrency=8.

- Totals (all pairs both sides):
  - RedWins: 657
  - BlueWins: 943
  - Draws: 0
  - Overall Score (RedWins-BlueWins): -286

Notes:
- Nova-6 clearly outperforms strong entry 2025-09-10-17-54 (Stellar-6) and 2025-09-10-16-40 in head-to-head aggregate.
- Overall tail-10 aggregate is still negative due to several specialized builds (e.g., 2025-09-10-16-08, 15-54). Further tuning could target those matchups.
- Side-bias mitigation (team-adaptive bias + opening) materially improved results vs top entries while maintaining stability.

## Usage
- Final import file: result/2025-09-10-18-54/2025-09-10-18-54.txt
- Open tank_battle_platform.html, click RED/BLUE "코드 가져오기", paste the file content; or use Export/Import with the same format.


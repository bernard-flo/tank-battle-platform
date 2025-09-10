Tank Battle AI Optimization - 2025-09-10-11-23

This workspace generates a high-performance team for tank_battle_platform.html.

How it works:
- Uses the headless simulator (see simulator/README.md and .agent/SIMULATOR.md) to evaluate candidates.
- Pulls recent opponent team files from result/.
- Generates multiple candidate teams with diversified parameters.
- Runs batch matches in parallel and selects the best candidate.
- Writes final team file to result/2025-09-10-11-23/2025-09-10-11-23.txt and a summary to RESULT.md.

Run:
- node work/2025-09-10-11-23/optimize.js


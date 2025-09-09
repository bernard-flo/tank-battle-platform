#!/usr/bin/env bash
set -euo pipefail

# 간단 자동 학습 루프: 모방학습 → ES 튜닝 반복
# 사용 예: scripts/auto_train.sh 3  (3 라운드 반복)

ROUNDS=${1:-2}

echo "[auto] 시작: ROUNDS=${ROUNDS}"

for r in $(seq 1 ${ROUNDS}); do
  echo "[auto] 라운드 ${r}/${ROUNDS}: 모방학습"
  node src/imitation_train.js --matches 80 --ticks 2600 --epochs 12 --fast

  echo "[auto] 라운드 ${r}/${ROUNDS}: ES 튜닝(빠른 설정)"
  node src/train_es.js --iters 8 --pop 80 --sigma 0.20 --alpha 0.06 --seeds 6 --ticks 3200 --concurrency 8 --fast || true

  echo "[auto] 라운드 ${r}/${ROUNDS}: 중간 평가(양쪽 바꿔가며)"
  node simulator/cli.js --red result/ai_dnn_team.txt --blue result/reference-ai.txt --repeat 50 --fast --maxTicks 4000 --concurrency 8 | tee result/auto_eval_r${r}_as_red.txt
  node simulator/cli.js --red result/reference-ai.txt --blue result/ai_dnn_team.txt --repeat 50 --fast --maxTicks 4000 --concurrency 8 | tee result/auto_eval_r${r}_as_blue.txt
done

echo "[auto] 완료"


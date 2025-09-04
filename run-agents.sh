#!/usr/bin/env bash

cat agent/LEADER_PROMPT.md | codex exec -
cat agent/PROMPT.md | codex exec -

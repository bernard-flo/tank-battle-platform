docker-compose-up-d:
	docker compose -f ./docker/docker-compose.yml up -d

docker-compose-down:
	docker compose -f ./docker/docker-compose.yml down

docker-compose-up-build:
	docker compose -f ./docker/docker-compose.yml up --build

.PHONY: sim
sim:
	node scripts/sim/run.js

.PHONY: train2
train2:
	GENS?=6
	GENS=$(GENS) node scripts/train2.js

.PHONY: train_roles
train_roles:
	GENS?=8
	GENS=$(GENS) node scripts/train_roles.js

.PHONY: gen-ai
gen-ai:
	node scripts/generate_ai_pack.js .scratchpad/ai_config.json
	@echo "AI pack generated at result/ai.txt"

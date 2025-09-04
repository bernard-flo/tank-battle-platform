docker-compose-up-d:
	docker compose -f ./docker/docker-compose.yml up -d

docker-compose-down:
	docker compose -f ./docker/docker-compose.yml down

docker-compose-up-build:
	docker compose -f ./docker/docker-compose.yml up --build

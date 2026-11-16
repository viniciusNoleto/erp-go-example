-include .env

MAKEFLAGS += --no-print-directory

APP_ENV ?= local
COMPOSE := docker compose -f docker-compose.${APP_ENV}.yml
WEB_CONTAINER := razonete-web
API_CONTAINER := razonete-api

f :=
art:
	@cat configs/scripts/arts/${f}.txt
	@echo

echo-system:
	@make art f=system

env:
	@test -f .env || (cp .env.example .env && echo ".env criado a partir do .env.example")

build:
	@$(COMPOSE) build --no-cache

build-cache:
	@$(COMPOSE) build

# Só no local (bind mount): em produção as dependências já vêm instaladas na imagem (Dockerfile.deploy).
install-deps:
ifeq ($(APP_ENV),local)
	@$(COMPOSE) run --rm --no-deps $(WEB_CONTAINER) npm install
else
	@echo "APP_ENV=$(APP_ENV): dependências já instaladas na imagem, nada a fazer."
endif

logs:
	@docker logs -f $(WEB_CONTAINER)

logs-api:
	@docker logs -f $(API_CONTAINER)

watch:
	@$(COMPOSE) up

clear-up:
	@$(COMPOSE) up -d

up:
	@make clear-up
	@make echo-system

down:
	@$(COMPOSE) down

restart:
	@make down
	@make up

phoenix:
	@make down
	@make build-cache
	@make up

# Apaga os volumes (Postgres e TigerBeetle): na próxima subida a API recarrega a demonstração.
reset-data:
	@$(COMPOSE) down -v
	@make up

# Rebuild e troca só o container do front, sem derrubar o resto.
update-build:
	@$(COMPOSE) build $(WEB_CONTAINER)
	@$(COMPOSE) up -d --no-deps $(WEB_CONTAINER)

# O backend Go é compilado na imagem: depois de mexer em ./backend, rode isto.
update-api:
	@$(COMPOSE) build $(API_CONTAINER)
	@$(COMPOSE) up -d --no-deps $(API_CONTAINER)

c :=
exec:
	@$(COMPOSE) exec $(WEB_CONTAINER) $(c)

shell:
	@$(COMPOSE) exec -it $(WEB_CONTAINER) /bin/sh

b ?=
npm-install:
	@make exec c="npm install $(b)"

typecheck:
	@make exec c="npx tsc --noEmit"

# go vet + testes sem precisar de Go instalado no host.
go-test:
	@docker run --rm -v "$(CURDIR)/backend":/src -w /src golang:1.27-bookworm sh -c "go vet ./... && go test ./..."

# Vídeo de apresentação (Playwright no host): stack própria, build estático, grava em frontend/videos/.
demo-video:
	@cd frontend && npm run demo:video

s :=
t :=
m :=
step:
	@echo
	@echo "█▓▒░ \033[38;2;255;196;12m[$(s)/$(t)]\033[0m $(m)"
	@echo

install:
	@make env
	@make echo-system
	@make step s=1 t=3 m="Building the Docker images..."
	@make build
	@make step s=2 t=3 m="Installing dependencies (npm install)..."
	@make install-deps
	@make step s=3 t=3 m="Starting the containers..."
	@make clear-up
	@echo
	@echo "░▒▓█ \033[38;2;22;198;12mGoMoney\033[0m installed! http://localhost:$${APP_PORT:-5180}"
	@echo

.PHONY: art echo-system env build build-cache install-deps logs logs-api watch clear-up up down restart phoenix reset-data update-build update-api exec shell npm-install typecheck go-test demo-video step install

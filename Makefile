# Aufgabenlaeufer dieses Repos fuer Unix-Schalen; auf Windows tut make.ps1 dasselbe.
# Beide rufen nur die Skripte aus package.json auf und bauen nichts nach; kommt ein
# Weg dazu, kommt er in package.json und hier wie dort als ein Ziel.
#
# Dieses Repo ist der Consumer: es schreibt seine Vertraege nach ./pacts und ist damit
# fertig - es startet keinen Provider und verifiziert keinen.

# Pact meldet sonst Version und Betriebssystem nach aussen.
export PACT_DO_NOT_TRACK = true

.DEFAULT_GOAL := help
# Die Reihenfolge in 'ci' ist die Aussage; make -j duerfte sie sonst mischen.
.NOTPARALLEL:
.PHONY: help install format format-check lint complexity typecheck test ci all

help: ## Ziele auflisten (Standard, wenn keines angegeben ist)
	@echo "Ziele:"
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | sed 's/:.*## /|/' | awk -F'|' '{printf "%-14s %s\n", $$1, $$2}'

install: ## Abhaengigkeiten aus package-lock.json installieren
	npm install --no-audit --no-fund

format: ## Quelltext formatieren (Prettier, schreibend)
	npm run format

format-check: ## Formatierung pruefen, ohne zu aendern
	npm run format-check

lint: ## Lint (ESLint)
	npm run lint

# Eigener Lauf mit eigener Konfiguration: Lint sagt "das ist falsch", Komplexitaet sagt
# "das ist zu viel auf einmal". Wer das eine abstellt, um das andere loszuwerden, haette
# sonst leichtes Spiel.
complexity: ## Komplexitaet messen (ESLint, eigene Konfiguration)
	npm run complexity

typecheck: ## Typen pruefen, ohne zu uebersetzen
	npm run typecheck

# Pact ergaenzt eine bestehende Datei, statt sie zu ersetzen. Ohne Leeren bliebe eine
# geloeschte Interaktion im Vertrag stehen und der Diff loege.
test: ## Tests fahren; schreibt ./pacts/*.json
	rm -f pacts/*.json
	npm test

ci: lint format-check typecheck complexity test ## lint + format-check + typecheck + complexity + test, in dieser Reihenfolge

all: ci ## Alias fuer ci

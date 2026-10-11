.PHONY: test lint verify

test:
	pytest

lint:
	ruff check src tests

verify: lint test

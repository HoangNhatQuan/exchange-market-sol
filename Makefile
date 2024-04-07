
build:
	anchor build
.PHONY: build

test:
	make build && anchor test --skip-local-validator
.PHONY: test

test-devnet:
	make build && anchor test --provider.cluster devnet
.PHONY: test

deploy:
	make build && anchor deploy --provider.cluster devnet
.PHONY: deploy-dev
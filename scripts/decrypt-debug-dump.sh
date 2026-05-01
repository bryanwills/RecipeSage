#!/bin/bash

docker compose exec backend pnpm exec ts-node --swc --project ./packages/backend/tsconfig.json ./packages/backend/src/decryptDebugStore.app.ts "$@"


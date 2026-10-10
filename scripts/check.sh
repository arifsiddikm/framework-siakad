#!/usr/bin/env bash
# Everything must be green before "selesai": ruff, mypy, pytest, eslint, tsc, vitest.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== backend =="
cd backend
.venv/bin/ruff check .
.venv/bin/ruff format --check .
.venv/bin/mypy .
.venv/bin/pytest
cd ../frontend

echo "== frontend =="
npx eslint .
npx tsc --noEmit
npx vitest run
echo "OK: semua pemeriksaan lulus"

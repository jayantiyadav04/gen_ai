#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=================================================="
echo "  CampusVision AI — Full-Stack Dev Mode"
echo "  Backend:  http://localhost:8000 (FastAPI)"
echo "  Frontend: http://localhost:5173 (Vite + HMR)"
echo "=================================================="

# Function to cleanup background processes on exit
cleanup() {
    echo "Stopping dev servers..."
    kill $(jobs -p) 2>/dev/null || true
}
trap cleanup EXIT

# 1. Start FastAPI backend
./venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload &

# 2. Start Vite frontend
(cd frontend && npm run dev) &

wait


#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=================================================="
echo "  CampusVision AI — Architectural Renderer"
echo "=================================================="

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    ./venv/bin/pip install --upgrade pip
    ./venv/bin/pip install -r requirements.txt
fi

# Build frontend if dist doesn't exist
if [ ! -d "frontend/dist" ]; then
    echo "Building React frontend..."
    (cd frontend && npm install && npm run build)
fi

echo "Starting CampusVision AI Unified Server on http://localhost:8000 ..."
echo "API Docs available at http://localhost:8000/docs"
echo "Press Ctrl+C to stop."

./venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000


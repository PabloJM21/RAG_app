#!/bin/bash
export PATH="$PATH:/mnt/c/Users/Verwenden/.local/bin"

echo "Running locally with uv"
uv run fastapi dev app/main.py --host 0.0.0.0 --port 8000 --reload &
uv run python watcher.py

wait
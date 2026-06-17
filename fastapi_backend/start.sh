#!/bin/bash

if [ -f /.dockerenv ]; then
    echo "Running in Docker"
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000
else
    echo "Running locally with uv"
    uv run fastapi dev app/main.py --host 0.0.0.0 --port 8000 --reload &
    uv run python watcher.py
    wait
fi
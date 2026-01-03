#!/bin/bash
export PATH="$PATH:/c/Users/Verwenden/.local/bin"

pnpm run dev &

node watcher.js

wait
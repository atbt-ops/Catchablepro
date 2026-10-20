#!/usr/bin/env bash
set -e

# Ensure Homebrew and standard paths are in PATH
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

PID_FILE="$PROJECT_DIR/.app.pid"
LOG_FILE="$PROJECT_DIR/app.log"
PORT=3000
URL="http://localhost:$PORT"

echo "=== Catchablepro Application Status ==="

IS_RUNNING=0

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE" 2>/dev/null || true)
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    IS_RUNNING=1
    echo "🟢 Status: RUNNING (PID: $PID)"
    echo "📍 URL:    $URL"
  fi
fi

if [ $IS_RUNNING -eq 0 ]; then
  PORT_PID=$(lsof -ti :$PORT -sTCP:LISTEN 2>/dev/null || true)
  if [ -n "$PORT_PID" ]; then
    echo "🟡 Status: Process listening on port $PORT (PID: $PORT_PID)"
    echo "📍 URL:    $URL"
    IS_RUNNING=1
  else
    echo "🔴 Status: STOPPED"
  fi
fi

if [ -f "$LOG_FILE" ]; then
  echo ""
  echo "--- Recent Logs ($LOG_FILE) ---"
  tail -n 10 "$LOG_FILE"
fi

#!/usr/bin/env bash
set -e

# Ensure Homebrew and standard paths are in PATH
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

PID_FILE="$PROJECT_DIR/.app.pid"
PORT=3000

STOPPED=0

# Try stopping via PID file
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE" 2>/dev/null || true)
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    echo "🛑 Stopping Catchablepro application (PID: $PID)..."
    kill "$PID" 2>/dev/null || true

    # Wait up to 5 seconds for graceful shutdown
    for i in {1..5}; do
      if ! kill -0 "$PID" 2>/dev/null; then
        STOPPED=1
        break
      fi
      sleep 1
    done

    # Force kill if still running
    if kill -0 "$PID" 2>/dev/null; then
      echo "⚠️  Process didn't terminate gracefully, forcing kill..."
      kill -9 "$PID" 2>/dev/null || true
      STOPPED=1
    fi
  fi
  rm -f "$PID_FILE"
fi

# Also check for any residual process listening on port 3000 (e.g. child vite processes)
PORT_PIDS=$(lsof -ti :$PORT 2>/dev/null || true)
if [ -n "$PORT_PIDS" ]; then
  echo "🛑 Terminating remaining process(es) on port $PORT: $PORT_PIDS..."
  for p in $PORT_PIDS; do
    kill "$p" 2>/dev/null || true
    sleep 1
    if kill -0 "$p" 2>/dev/null; then
      kill -9 "$p" 2>/dev/null || true
    fi
  done
  STOPPED=1
fi

if [ $STOPPED -eq 1 ]; then
  echo "✅ Application stopped successfully."
else
  echo "ℹ️  Application is not currently running."
fi

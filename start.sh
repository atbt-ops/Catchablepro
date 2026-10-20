#!/usr/bin/env bash
set -e

# Ensure Homebrew and standard paths are in PATH
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

PID_FILE="$PROJECT_DIR/.app.pid"
LOG_FILE="$PROJECT_DIR/app.log"
PORT=3000
URL="http://localhost:$PORT"

# Check if already running via PID file
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE" 2>/dev/null || true)
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    echo "⚠️  Application is already running (PID: $PID) at $URL"
    echo "🌐 Opening $URL in browser..."
    if command -v open >/dev/null 2>&1; then
      open "$URL"
    elif command -v xdg-open >/dev/null 2>&1; then
      xdg-open "$URL"
    fi
    exit 0
  else
    rm -f "$PID_FILE"
  fi
fi

# Check if port 3000 is occupied by another process
OCCUPIED_PID=$(lsof -ti :$PORT 2>/dev/null || true)
if [ -n "$OCCUPIED_PID" ]; then
  echo "⚠️  Port $PORT is already in use by process PID $OCCUPIED_PID."
  echo "   Use './stop.sh' to stop it first or kill process $OCCUPIED_PID."
  exit 1
fi

# Ensure node_modules exist
if [ ! -d "node_modules" ]; then
  echo "📦 Installing npm dependencies..."
  npm install
fi

echo "🚀 Starting Catchablepro application in background..."
> "$LOG_FILE"
nohup npm run dev >> "$LOG_FILE" 2>&1 &
APP_PID=$!
disown "$APP_PID" 2>/dev/null || true
echo "$APP_PID" > "$PID_FILE"

echo "⏳ Waiting for server to become available at $URL..."
MAX_RETRIES=30
COUNT=0
SERVER_READY=0

while [ $COUNT -lt $MAX_RETRIES ]; do
  if ! kill -0 "$APP_PID" 2>/dev/null; then
    echo "❌ Application process exited unexpectedly. Recent logs ($LOG_FILE):"
    tail -n 20 "$LOG_FILE"
    rm -f "$PID_FILE"
    exit 1
  fi

  # Check if Vite announced ready in the log file
  if grep -q "ready in" "$LOG_FILE" 2>/dev/null; then
    SERVER_READY=1
    break
  fi

  # Check via HTTP curl if accessible
  CODE=$(curl --noproxy "*" -s -o /dev/null -w "%{http_code}" "$URL/healthz" 2>/dev/null || true)
  if [[ "$CODE" =~ ^(200|304)$ ]]; then
    SERVER_READY=1
    break
  fi

  sleep 1
  COUNT=$((COUNT + 1))
done

if [ $SERVER_READY -eq 1 ]; then
  echo "✅ Application is live and running!"
  echo "📍 URL:  $URL"
  echo "📄 Logs: $LOG_FILE"
  echo "🆔 PID:  $APP_PID"
  echo ""
  echo "🌐 Opening $URL in your default browser..."
  if command -v open >/dev/null 2>&1; then
    open "$URL" 2>/dev/null || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL" 2>/dev/null || true
  else
    echo "💡 Please open $URL manually in your browser."
  fi
else
  echo "⚠️  Server took longer than expected to respond, but process is running (PID: $APP_PID)."
  echo "   Check logs with 'tail -f $LOG_FILE' or open $URL in your browser."
fi

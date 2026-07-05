#!/bin/bash
cd "$(dirname "$0")"
mkdir -p videos

# Install Python dependencies if needed
python3 -c "import flask" 2>/dev/null || pip3 install flask flask-cors yt-dlp --break-system-packages 2>/dev/null || pip3 install flask flask-cors yt-dlp --user 2>/dev/null

echo "Starting DanceMirror..."
python3 server/server.py &
sleep 2
if command -v open &>/dev/null; then
    open http://127.0.0.1:5000
elif command -v xdg-open &>/dev/null; then
    xdg-open http://127.0.0.1:5000
else
    echo "Open http://127.0.0.1:5000 in your browser"
fi
wait

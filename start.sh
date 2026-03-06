#!/bin/bash
set -e

# ── Siftly Launcher ───────────────────────────────────────────────────────────
# Run this once to set up and start Siftly.
# After first run, just run it again to start the app.
# ─────────────────────────────────────────────────────────────────────────────

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${BLUE}  Siftly${NC}"
echo "  AI-powered bookmark manager"
echo ""

# ── 1. Install dependencies if needed ─────────────────────────────────────────
if [ ! -d "node_modules" ]; then
  echo "  Installing dependencies..."
  npm install
  echo ""
fi

# ── 2. Set up database if needed ──────────────────────────────────────────────
if [ ! -f "prisma/dev.db" ]; then
  echo "  Setting up database..."
  npx prisma generate
  npx prisma migrate deploy 2>/dev/null || npx prisma db push
  echo ""
fi

# ── 3. Check auth ─────────────────────────────────────────────────────────────
if command -v claude &>/dev/null; then
  echo -e "  ${GREEN}✓${NC} Claude CLI detected — AI features will use your subscription automatically"
else
  echo -e "  ${YELLOW}i${NC} Claude CLI not found. Add your API key in Settings after opening the app."
fi
echo ""

# ── 4. Open browser and start ─────────────────────────────────────────────────
echo "  Starting on http://localhost:3000"
echo "  Press Ctrl+C to stop"
echo ""

# Open browser after a short delay
(sleep 2 && open http://localhost:3000 2>/dev/null) &

npx next dev

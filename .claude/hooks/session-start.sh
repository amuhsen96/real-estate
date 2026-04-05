#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Fix @tailwindcss/oxide native binding issue (npm optional deps bug)
# Remove node_modules and package-lock.json to force clean install
if [ -d "$CLAUDE_PROJECT_DIR/node_modules" ]; then
  rm -rf "$CLAUDE_PROJECT_DIR/node_modules"
fi

if [ -f "$CLAUDE_PROJECT_DIR/package-lock.json" ]; then
  rm -f "$CLAUDE_PROJECT_DIR/package-lock.json"
fi

cd "$CLAUDE_PROJECT_DIR"
npm install

# تشغيل MariaDB تلقائياً إن لم يكن مشغّلاً
if ! pgrep -x mariadbd > /dev/null 2>&1 && ! pgrep -x mysqld > /dev/null 2>&1; then
  echo "Starting MariaDB..."
  mysqld_safe --no-defaults --skip-networking=0 --user=mysql > /dev/null 2>&1 &
  sleep 4
fi

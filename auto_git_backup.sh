#!/bin/zsh
cd "$(dirname "$0")"
git add .
git commit -m "Auto backup $(date '+%Y-%m-%d %H:%M:%S')" || exit 0
git push origin main

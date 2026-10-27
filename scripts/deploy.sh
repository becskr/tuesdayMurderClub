#!/usr/bin/env bash
# Update the live site on Krystal after pushing to GitHub.
# Run over SSH / cPanel Terminal AFTER entering the app's Node environment
# (the "source /home/.../nodevenv/.../activate" command shown at the top of
# cPanel → Setup Node.js App → your app).
set -euo pipefail
cd "$(dirname "$0")/.."

git pull --ff-only
npm install --no-audit --no-fund
npm run build

# Tells Passenger to restart the app on the next request.
mkdir -p tmp && touch tmp/restart.txt
echo "Deployed $(git log --oneline -1)"

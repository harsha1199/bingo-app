#!/usr/bin/env bash
# Exit on error
set -o errexit

# Increase memory limit for ALL node processes (install and build)
# Render free tier has ~512MB. We leave a little room for the OS.
export NODE_OPTIONS="--max-old-space-size=460"

echo "--- Installing Server Dependencies ---"
cd server
npm install --no-audit --no-fund --omit=dev
cd ..

echo "--- Installing Client Dependencies ---"
cd client
# We need to install everything (including what was devDeps) because we moved vite to dependencies
npm install --no-audit --no-fund
# But just in case, ensure we don't try to install heavyweight dev tools if we don't need them
# (We already cleaned up package.json)

echo "--- Building Client ---"
npm run build
cd ..

echo "--- Build Complete ---"

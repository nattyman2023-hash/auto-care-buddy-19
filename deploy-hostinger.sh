#!/bin/bash
# =====================================================================
# Wub Hair — Full Deployment Script for Hostinger
# =====================================================================
#
# ARCHITECTURE:
#   Frontend → Static files served from Hostinger's public_html
#   Backend  → Express API on Render (Hostinger shared can't run Node persistently)
#   Database → MySQL on Hostinger (API connects to it remotely via Remote MySQL)
#
# WHAT THIS SCRIPT DOES:
#   1. Backs up the dev .env, copies .env.production → .env for the build
#   2. Installs frontend deps + builds the Vite React app → dist/
#   3. Copies SEO files (robots.txt, sitemap.xml, .htaccess, PWA assets) into dist/
#   4. Creates a health-check.php for verifying the Hostinger deploy worked
#   5. Restores the original .env so local dev keeps working
#
# UPLOAD TO HOSTINGER:
#   Upload ALL contents of dist/ to public_html/ via FTP or hPanel File Manager
#
# BEFORE RUNNING:
#   - Edit .env.production and set: VITE_API_URL=https://your-api.onrender.com
#   - Import database-schema-mysql.sql into Hostinger MySQL via phpMyAdmin
#   - Deploy server/ to Render as a Node.js web service
# =====================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================"
echo " Wub Hair — Hostinger Deployment Builder"
echo "============================================"
echo ""

# ---- 0. Swap env to production for the build ----
echo "[0/5] Swapping to production environment..."
if [ -f .env ]; then
  cp .env .env.dev-backup
  echo "  Backed up .env → .env.dev-backup"
fi
# Vite reads .env.production during `vite build` and merges it, but explicit
# .env also overrides, so we push the prod values into .env for safety
if [ -f .env.production ]; then
  cp .env.production .env
  echo "  Copied .env.production → .env for build"
fi

# ---- 1. Install & Build Frontend ----
echo ""
echo "[1/5] Installing frontend dependencies..."
npm install

echo ""
echo "[2/5] Building the React frontend (Vite)..."
npm run build

# ---- 2. Copy SEO + Config files into dist/ ----
echo ""
echo "[3/5] Copying SEO files and server config into dist/..."

# Apache config (SPA routing, HTTPS redirect, caching, compression, security headers)
cp .htaccess dist/

# SEO crawler files
cp public/robots.txt dist/
cp public/sitemap.xml dist/

# PWA assets (ensure they're in dist — Vite usually picks them from public/)
for asset in favicon.ico manifest.webmanifest pwa-192x192.png pwa-512x512.png placeholder.svg; do
  if [ -f "public/$asset" ]; then
    cp "public/$asset" "dist/"
  fi
done

# ---- 3. Create health-check.php ----
echo "[4/5] Creating health-check.php..."

cat > dist/health-check.php << 'PHPEOF'
<?php
header('Content-Type: application/json');
echo json_encode([
    'status' => 'ok',
    'frontend' => 'Wub Hair',
    'deployed_at' => date('c'),
    'api_url' => 'https://wubhair-api.onrender.com',
    'php_version' => phpversion(),
], JSON_PRETTY_PRINT);
PHPEOF

# ---- 4. Restore dev .env ----
echo "[5/5] Restoring local dev environment..."
if [ -f .env.dev-backup ]; then
  mv .env.dev-backup .env
  echo "  Restored original .env"
fi

# ---- 5. Summary ----
echo ""
echo "============================================"
echo " BUILD COMPLETE — dist/ IS READY TO UPLOAD"
echo "============================================"
echo ""
echo "FRONTEND (Hostinger):"
echo "  Upload everything in dist/ → public_html/ (via FTP or hPanel File Manager)"
echo "  Make sure .htaccess + robots.txt + sitemap.xml are in the root"
echo ""
echo "BACKEND (Render):"
echo "  Push server/ to Render as a Node.js web service"
echo "  Start command:  node src/index.js"
echo "  Set these environment variables on Render:"
echo ""
echo "    PORT=3001"
echo "    DB_HOST=<your-hostinger-db-host>"
echo "    DB_PORT=3306"
echo "    DB_NAME=<your-database-name>"
echo "    DB_USER=<your-database-user>"
echo "    DB_PASSWORD=<your-database-password>"
echo "    DB_SSL=true"
echo "    JWT_SECRET=<gen: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\">"
echo "    FRONTEND_URL=https://wubhair.com"
echo "    RESEND_API_KEY=  (optional — leave blank to log emails)"
echo "    EMAIL_FROM=\"Wub Hair <notifications@wubhair.com>\""
echo "    ANTHROPIC_API_KEY=  (optional)"
echo ""
echo "DATABASE (Hostinger MySQL):"
echo "  1. hPanel → Databases → phpMyAdmin"
echo "  2. Import database-schema-mysql.sql"
echo "  3. hPanel → Databases → Remote MySQL → Enable"
echo "  4. Allow-list Render's outbound IP so the API can reach the DB"
echo ""
echo "AFTER DEPLOY — VERIFY:"
echo "  - https://wubhair.com/              → salon homepage loads"
echo "  - https://wubhair.com/health-check.php → JSON {status:ok}"
echo "  - https://wubhair.com/book           → SPA routing (no 404)"
echo "  - https://wubhair.com/sitemap.xml    → sitemap loads"
echo "  - Try a test booking                 → API + DB connected"
echo ""
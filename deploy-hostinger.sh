#!/bin/bash

# Wub Hair - Deployment build script
#
# Architecture: the frontend (this script's output) is static files uploaded
# to Hostinger. The API server (server/) is a separate Node.js app deployed
# to Render (Hostinger's shared hosting plan cannot run a persistent Node
# process) - see server/README.md (or the migration notes) for the Render
# setup steps. The MySQL database itself lives on Hostinger; Render's API
# connects to it over the network (requires "Remote MySQL" enabled in
# hPanel > Databases > Remote MySQL, allow-listing Render's outbound IP).
#
# This script only builds and packages the frontend.

set -e

echo "Building the Wub Hair frontend for Hostinger..."
echo ""

echo "Installing frontend dependencies..."
npm install

echo "Building the frontend..."
npm run build

echo ""
echo "Build complete - the 'dist/' folder is ready to upload."
echo ""
echo "Next steps:"
echo "1. Upload the contents of 'dist/' to your Hostinger hosting's public_html (or equivalent)."
echo "2. Make sure .env's VITE_API_URL points at your deployed Render API URL before building"
echo "   (e.g. VITE_API_URL=https://wubhair-api.onrender.com), then re-run this script."
echo "3. Deploy the API separately: push the 'server/' folder to Render as a Node.js web service"
echo "   (Render reads server/package.json's \"start\" script)."
echo "4. In Render's environment settings, configure: DB_HOST, DB_PORT, DB_NAME, DB_USER,"
echo "   DB_PASSWORD, DB_SSL, JWT_SECRET, FRONTEND_URL, RESEND_API_KEY, EMAIL_FROM,"
echo "   ANTHROPIC_API_KEY (see server/.env for the full list)."
echo "5. In Hostinger hPanel, enable Remote MySQL access for your database and allow-list"
echo "   Render's outbound IP so the API can connect to the Hostinger MySQL database."
echo "6. Import database-schema-mysql.sql into your Hostinger MySQL database via phpMyAdmin."

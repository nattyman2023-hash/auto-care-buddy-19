#!/bin/bash

# Auto Care Buddy - Deployment script for Hostinger
# This script builds the frontend and prepares everything for upload to Hostinger

echo "🚀 Starting Auto Care Buddy deployment to Hostinger..."
echo ""

# Step 1: Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install --legacy-peer-deps

# Step 2: Build the frontend
echo "🏗️  Building the frontend..."
npm run build

# Step 3: Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install

# Step 4: Copy server files to build directory
echo "📁 Preparing server files..."
mkdir -p ../dist/server
cp -r * ../dist/server/
cd ..

# Step 5: Create deployment instructions
echo ""
echo "✅ Build complete!"
echo ""
echo "📋 Next steps for Hostinger deployment:"
echo "1. Upload the 'dist' folder to your Hostinger hosting"
echo "2. Upload the 'server' folder to your Hostinger hosting"
echo "3. Set up your PostgreSQL database on Hostinger"
echo "4. Import the database schema:"
echo "   - Go to phpPgAdmin or use psql to connect to your Hostinger database"
echo "   - Run the database-schema.sql file to create all tables"
echo "5. Configure environment variables:"
echo "   - Copy server/.env.example to server/.env"
echo "   - Update with your Hostinger database credentials"
echo "6. Start the API server on Hostinger (Node.js hosting required)"
echo "7. Update frontend VITE_API_URL in .env to point to your API server"
echo "8. Rebuild frontend with: npm run build"
echo "9. Upload updated dist folder"
echo ""
echo "📄 Important files for deployment:"
echo "   - dist/           - Frontend build (static files)"
echo "   - server/         - Backend API server"
echo "   - database-schema.sql - Database schema to import"
echo ""
echo "🎉 Good luck with the deployment!"
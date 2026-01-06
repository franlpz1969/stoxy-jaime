#!/bin/bash

# Configuration
PROJECT_ID="anonimizador-458014"
ZONE="us-central1-a"
VM_NAME="stoxy-vm"

# Check API Key
API_KEY=""
if [ -f ".env.local" ]; then
    API_KEY=$(grep "GEMINI_API_KEY" .env.local | cut -d '=' -f2)
elif [ -f ".env" ]; then
    API_KEY=$(grep "GEMINI_API_KEY" .env | cut -d '=' -f2)
fi

echo "--- DEPLOYING PRE-BUILT APP (Fast Mode) ---"

# 1. Ensure local build exists
if [ ! -d "dist" ]; then
    echo "Error: 'dist' folder missing. Please run 'npm run build' first."
    exit 1
fi

echo "1. Packaging pre-built application..."
# Create a tarball with already built frontend and backend code
# EXCLUDE node_modules (we install prod deps on VM)
tar -czf site_ready.tgz dist server package.json package-lock.json

echo "2. Uploading to VM..."
gcloud compute scp site_ready.tgz $VM_NAME:~/site_ready.tgz --project=$PROJECT_ID --zone=$ZONE
rm site_ready.tgz

echo "3. Restarting App on VM..."

# Remote commands: Unzip, Install PROD deps only, Start
REMOTE_COMMANDS="
# Kill any existing heavy processes if stuck
pkill -f 'vite' || true
pkill -f 'npm run build' || true

# Setup directory
mkdir -p ~/stoxy-app
mv ~/site_ready.tgz ~/stoxy-app/
cd ~/stoxy-app
tar -xzf site_ready.tgz
rm site_ready.tgz

# Install ONLY production dependencies (fast & light)
echo 'Installing production dependencies...'
npm ci --omit=dev

# Start Server
echo 'Starting server...'
pm2 delete stoxy-app || true
GEMINI_API_KEY='$API_KEY' PORT=3000 pm2 start server/index.js --name stoxy-app

echo '--- DEPLOY SUCCESS ---'
"

gcloud compute ssh $VM_NAME --project=$PROJECT_ID --zone=$ZONE --command "$REMOTE_COMMANDS"

echo "Verify at: http://$(gcloud compute instances describe $VM_NAME --project=$PROJECT_ID --zone=$ZONE --format='get(networkInterfaces[0].accessConfigs[0].natIP)'):3000"

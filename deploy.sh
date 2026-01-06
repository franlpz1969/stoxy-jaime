#!/bin/bash

# Configuration
PROJECT_ID="anonimizador-458014"
ZONE="us-central1-a"
VM_NAME="stoxy-vm"
REPO_NAME="stocktracker-repo"
IMAGE_NAME="stocktracker-pro"
REGION="us-central1"
BUCKET_NAME="${PROJECT_ID}-stocktracker-data"

# Attempt to find API Key
API_KEY=""
if [ -f ".env.local" ]; then
    API_KEY=$(grep "GEMINI_API_KEY" .env.local | cut -d '=' -f2)
elif [ -f ".env" ]; then
    API_KEY=$(grep "GEMINI_API_KEY" .env | cut -d '=' -f2)
fi

echo "--- 1. BUILDING & PUSHING NEW IMAGE (Cloud Build) ---"
# This uploads your LOCAL code to Google Cloud and builds the Docker image
gcloud builds submit . \
  --config cloudbuild.yaml \
  --substitutions "_PROJECT_ID=$PROJECT_ID,_REGION=$REGION,_REPO_NAME=$REPO_NAME,_IMAGE_NAME=$IMAGE_NAME,_GEMINI_API_KEY=$API_KEY"

echo "--- 2. DEPLOYING TO VM: $VM_NAME ($ZONE) ---"

FULL_IMAGE_URL="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$IMAGE_NAME:latest"

# Commands to execute on the remote VM
REMOTE_COMMANDS="
# A. Authenticate Docker
gcloud auth configure-docker $REGION-docker.pkg.dev --quiet

# B. Stop/Remove old container
docker stop stoxy-app || true
docker rm stoxy-app || true

# C. Force Pull (Remove old image first to be sure)
docker rmi $FULL_IMAGE_URL || true
echo 'Pulling fresh image...'
docker pull $FULL_IMAGE_URL

# D. Create data dir
mkdir -p /home/\$USER/stoxy_data
chmod 777 /home/\$USER/stoxy_data

# E. Run new container
echo 'Starting new container...'
docker run -d \
  --name stoxy-app \
  --restart unless-stopped \
  -p 80:3000 \
  -e PORT=3000 \
  -e GEMINI_API_KEY='$API_KEY' \
  -e DATA_DIR='/app/data' \
  -v /home/\$USER/stoxy_data:/app/data \
  $FULL_IMAGE_URL
"

# Execute via SSH
gcloud compute ssh $VM_NAME --project=$PROJECT_ID --zone=$ZONE --command "$REMOTE_COMMANDS"

echo "--- Deployment FINISHED ---"
echo "Verify at: http://$(gcloud compute instances describe $VM_NAME --project=$PROJECT_ID --zone=$ZONE --format='get(networkInterfaces[0].accessConfigs[0].natIP)')"

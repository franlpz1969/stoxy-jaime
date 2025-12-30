#!/bin/bash

# Configuration
PROJECT_ID="anonimizador-458014"
REGION="us-central1"
REPO_NAME="stocktracker-repo"
IMAGE_NAME="stocktracker-pro"
BUCKET_NAME="${PROJECT_ID}-stocktracker-data"

# Attempt to find API Key
API_KEY=""
if [ -f ".env.local" ]; then
    API_KEY=$(grep "GEMINI_API_KEY" .env.local | cut -d '=' -f2)
elif [ -f ".env" ]; then
    API_KEY=$(grep "GEMINI_API_KEY" .env | cut -d '=' -f2)
fi

echo "--- Configuring Project: $PROJECT_ID ---"
gcloud config set project $PROJECT_ID
gcloud config set run/region $REGION

echo "--- Enabling Services ---"
gcloud services enable artifactregistry.googleapis.com run.googleapis.com

echo "--- Creating Artifact Repository (if not exists) ---"
gcloud artifacts repositories create $REPO_NAME --repository-format=docker --location=$REGION || true

echo "--- Building & Pushing Image via Cloud Build ---"
gcloud builds submit . \
  --config cloudbuild.yaml \
  --substitutions "_PROJECT_ID=$PROJECT_ID,_REGION=$REGION,_REPO_NAME=$REPO_NAME,_IMAGE_NAME=$IMAGE_NAME,_GEMINI_API_KEY=$API_KEY"

echo "--- Creating Data Bucket (if not exists) ---"
gcloud storage buckets create gs://$BUCKET_NAME --location=$REGION || true

echo "--- Deploying to Cloud Run ---"
gcloud run deploy $IMAGE_NAME \
  --image "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$IMAGE_NAME:latest" \
  --execution-environment gen2 \
  --allow-unauthenticated \
  --add-volume "name=db-volume,type=cloud-storage,bucket=$BUCKET_NAME" \
  --add-volume-mount "volume=db-volume,mount-path=/app/data" \
  --timeout 300

echo "--- Deployment Process Finished ---"

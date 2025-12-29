# Deploy StockTracker Pro to Cloud Run
# Usage: ./deploy.ps1 [PROJECT_ID]

param (
    [string]$ProjectId
)

if (-not $ProjectId) {
    Write-Host "Error: Please provide your Google Cloud Project ID." -ForegroundColor Red
    Write-Host "Usage: ./deploy.ps1 [PROJECT_ID]"
    exit 1
}

# Try to find gcloud in PATH, otherwise use the found local path
$GCLOUD = "gcloud"
if (-not (Get-Command $GCLOUD -ErrorAction SilentlyContinue)) {
    $GCLOUD = "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
    if (-not (Test-Path $GCLOUD)) {
        Write-Host "Error: Could not find 'gcloud' command. Please restart your terminal." -ForegroundColor Red
        exit 1
    }
    Write-Host "Using gcloud from: $GCLOUD" -ForegroundColor Gray
}

$REGION = "us-central1"
$REPO_NAME = "stocktracker-repo"
$IMAGE_NAME = "stocktracker-pro"
$BUCKET_NAME = "$ProjectId-stocktracker-data"

# Read API key from .env.local
$API_KEY = ""
if (Test-Path ".env.local") {
    $envContent = Get-Content ".env.local" -Raw
    if ($envContent -match 'GEMINI_API_KEY=(.+)') {
        $API_KEY = $matches[1].Trim()
        Write-Host "Found API key in .env.local" -ForegroundColor Gray
    }
}

Write-Host "--- Configuring Project: $ProjectId ---" -ForegroundColor Cyan
& $GCLOUD config set project $ProjectId
& $GCLOUD config set run/region $REGION

Write-Host "--- Enabling Services ---" -ForegroundColor Cyan
& $GCLOUD services enable artifactregistry.googleapis.com run.googleapis.com

Write-Host "--- Creating Artifact Repository (if not exists) ---" -ForegroundColor Cyan
# Suppress error if already exists
& $GCLOUD artifacts repositories create $REPO_NAME --repository-format=docker --location=$REGION 2>$null

Write-Host "--- Building & Pushing Image via Cloud Build ---" -ForegroundColor Cyan
& $GCLOUD builds submit . `
  --config cloudbuild.yaml `
  --substitutions "_PROJECT_ID=$ProjectId,_REGION=$REGION,_REPO_NAME=$REPO_NAME,_IMAGE_NAME=$IMAGE_NAME,_GEMINI_API_KEY=$API_KEY"

Write-Host "--- Creating Data Bucket (if not exists) ---" -ForegroundColor Cyan
& $GCLOUD storage buckets create gs://$BUCKET_NAME --location=$REGION 2>$null

Write-Host "--- Deploying to Cloud Run ---" -ForegroundColor Cyan
& $GCLOUD run deploy $IMAGE_NAME `
  --image "$REGION-docker.pkg.dev/$ProjectId/$REPO_NAME/$IMAGE_NAME`:`latest" `
  --execution-environment gen2 `
  --allow-unauthenticated `
  --add-volume "name=db-volume,type=cloud-storage,bucket=$BUCKET_NAME" `
  --add-volume-mount "volume=db-volume,mount-path=/app/data" `
  --timeout 300

Write-Host "--- Deployment Complete! ---" -ForegroundColor Green
Write-Host "Check the URL above to access your app."

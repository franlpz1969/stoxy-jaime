# Deploying StockTracker Pro to Google Cloud Run

This guide explains how to build and deploy the Dockerized application to Google Cloud Run, ensuring data persistence for the SQLite database.

## Prerequisites
- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) installed and authenticated.
- A Google Cloud Project created.

## 1. Setup Environment
Set your project ID and region:
```bash
gcloud config set project [YOUR_PROJECT_ID]
gcloud config set run/region us-central1
```

Enable necessary APIs:
```bash
gcloud services enable artifactregistry.googleapis.com run.googleapis.com
```

## 2. Create Artifact Repository
Create a repository to store your Docker images:
```bash
gcloud artifacts repositories create stocktracker-repo --repository-format=docker --location=us-central1
```

## 3. Build & Push Image
Build the image using Cloud Build and push it to the registry:
```bash
gcloud builds submit --tag us-central1-docker.pkg.dev/[YOUR_PROJECT_ID]/stocktracker-repo/stocktracker-pro:latest .
```

## 4. Deploy with Persistence (Cloud Storage Volume)
Cloud Run containers are ephemeral (files are lost on restart). To persist `database.sqlite`, we will mount a Cloud Storage bucket.

### 4.1 Create a Bucket
```bash
gcloud storage buckets create gs://[YOUR_PROJECT_ID]-stocktracker-data --location=us-central1
```

### 4.2 Deploy
Deploy the service, mounting the bucket to `/app/data`:
```bash
gcloud run deploy stocktracker-pro \
  --image us-central1-docker.pkg.dev/[YOUR_PROJECT_ID]/stocktracker-repo/stocktracker-pro:latest \
  --execution-environment gen2 \
  --allow-unauthenticated \
  --add-volume name=db-volume,type=cloud-storage,bucket=[YOUR_PROJECT_ID]-stocktracker-data \
  --add-volume-mount volume=db-volume,mount-path=/app/data
```

## 5. Verify
The command will output a Service URL (e.g., `https://stocktracker-pro-xyz.a.run.app`).
1.  Open the URL.
2.  Your data will now persist even if the Cloud Run instance restarts or scales down to zero.

#!/bin/bash

# Configuration
PROJECT_ID="anonimizador-458014"
ZONE="us-central1-a"
VM_NAME="stoxy-vm"

echo "--- Installing Docker on VM: $VM_NAME (Clean & Robust) ---"

# Commands to install Docker properly
SETUP_COMMANDS="
# 1. CLEANUP: Remove broken repositories from previous attempts
sudo rm -f /etc/apt/sources.list.d/docker.list
sudo rm -f /etc/apt/keyrings/docker.gpg

# 2. Add retry logic for lock waiting
echo 'Waiting for apt lock...'
while sudo fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do echo '.'; sleep 5; done

# 3. Update and Install prerequisites
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# 4. Install Docker using official script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 5. Configure User
sudo usermod -aG docker \$USER

# 6. Configure Google Cloud Auth
gcloud auth configure-docker us-central1-docker.pkg.dev --quiet
"

# Execute setup via SSH
gcloud compute ssh $VM_NAME --project=$PROJECT_ID --zone=$ZONE --command "$SETUP_COMMANDS"

echo "--- VM Setup Finished ---"

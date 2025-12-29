$GCLOUD = "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
Write-Host "Launching Google Cloud Login..." -ForegroundColor Cyan
& $GCLOUD auth login
Write-Host "Login process finished." -ForegroundColor Green

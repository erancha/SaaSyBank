param(
    [int]$SleepBeforeRestart = 60  # Default value is 60 minutes
)

./dev-build-deploy-delete.ps1 -skipBuildDeploy $true -deployFrontend $false -deleteStack $true

if ($SleepBeforeRestart -ge 0) {
    Write-Host "`n$(Get-Date -Format 'HH:mm:ss') : Sleeping for $SleepBeforeRestart minutes before restarting..." -ForegroundColor Yellow
    Start-Sleep -Seconds ($SleepBeforeRestart * 60)
}

./dev-build-deploy-delete.ps1 -skipBuildDeploy $false -deployFrontend $false -deleteStack $false

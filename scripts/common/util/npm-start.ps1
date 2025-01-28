$frontendFolder = Join-Path -Path $PSScriptRoot -ChildPath "../../../frontend"
Set-Location $frontendFolder

# Verify the current location
$currentLocation = Get-Location
Write-Host "Current location is: $currentLocation"

# Now that we are sure we are in the correct folder, check for node_modules
if (-Not (Test-Path -Path "node_modules")) {
    Write-Host "node_modules folder not found. Running npm install..."
    npm install
}

npm start

Set-Location $PSScriptRoot
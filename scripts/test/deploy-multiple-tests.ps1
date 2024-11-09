cls
Write-Host " $(Split-Path -Leaf $PSCommandPath) ..." -ForegroundColor White -BackgroundColor DarkBlue

$commonConstants = ../common-constants.ps1

./deploy-test-template.ps1 -region $commonConstants.region -templateSuffix '-public-subnet'
# ./deploy-test-template.ps1 -region $commonConstants.region -templateSuffix '-private-subnet'
# ./deploy-test-template.ps1 -region $commonConstants.region -templateSuffix '-private-subnet-nat-gateway'

$currentFolder = Get-Location
Set-Location ..
./dev-build-deploy-delete.ps1
Set-Location $currentFolder
cls
Write-Host " $(Split-Path -Leaf $PSCommandPath) ..." -ForegroundColor White -BackgroundColor DarkBlue

# ./deploy-test-template.ps1 -templateSuffix '-public-subnet'
./deploy-test-template.ps1 -templateSuffix '-private-thru-public-subnets'
# ./deploy-test-template.ps1 -templateSuffix '-private-subnet-vpc-endpoints' # connectivity problem - fails to pull images

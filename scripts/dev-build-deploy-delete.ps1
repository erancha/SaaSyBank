. .\Get-ElapsedTimeFormatted.ps1
$startTime = Get-Date

./dev-build-deploy.ps1

$commonConstants = ./common-constants.ps1

$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Output "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Listing ECS clusters, services, tasks and containers ..."
./List-ECS.ps1 -region $commonConstants.region

$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Output "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Listing all subnets ..."
./List-Subnets.ps1 -region $commonConstants.region

Write-Output "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Testing all HTTP requests deployed by the stack ..."
./test-web-api.ps1

$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Output "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Deleting stack '$($commonConstants.stackName)' ..."
aws cloudformation delete-stack --stack-name $commonConstants.stackName
aws cloudformation wait stack-delete-complete --stack-name $commonConstants.stackName

$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Output "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Listing ECS clusters, services, tasks and containers ..."
./List-ECS.ps1 -region $commonConstants.region

$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Output "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Listing all subnets ..."
./List-Subnets.ps1 -region $commonConstants.region

$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Output "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Completed."

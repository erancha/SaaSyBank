param (
   [bool]$skipBuild = $false,
   [bool]$deleteTask = $false
)

. ./get-ElapsedTimeFormatted.ps1
$startTime = Get-Date

if (-not $skipBuild) {
   ./dev-build-deploy.ps1
}

$commonConstants = ./common-constants.ps1

# $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
# Write-Output "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Listing ECS clusters, services, tasks and containers ..."
# ./list-ECS.ps1 -region $commonConstants.region

# $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
# Write-Output "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Listing all subnets ..."
# ./list-Subnets.ps1 -region $commonConstants.region

Write-Output "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Testing all HTTP requests deployed by the stack ..."
./test-web-api.ps1

if (-not $deleteTask) {
   $validInput = $false
   while (-not $validInput) {
       $message = "Stack deployed. Continue to [d]elete the Stack or E[x]it ?"
       Write-Host $message  -ForegroundColor White -BackgroundColor DarkGray
       $userInput = Read-Host ">"

       if ($userInput -eq 'x' -or $userInput -eq 'X') {
           Write-Host "Exiting the script."
           exit
       } elseif ($userInput -eq 'd' -or $userInput -eq 'D') {
           Write-Host "Continuing to delete the stack..."
           $deleteTask = $true
           $validInput = $true
       } else {
           Write-Host "Invalid input. Please enter 'd' or 'x'."
       }
   }
}

if ($deleteTask) {
   $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
   Write-Output "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Deleting stack '$($commonConstants.stackName)' ..."
   aws cloudformation delete-stack --stack-name $commonConstants.stackName
   aws cloudformation wait stack-delete-complete --stack-name $commonConstants.stackName

   $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
   Write-Output "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Listing ECS clusters, services, tasks and containers ..."
   ./list-ECS.ps1 -region $commonConstants.region

   $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
   Write-Output "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Listing all subnets ..."
   ./list-Subnets.ps1 -region $commonConstants.region
}

$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Output "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Listing all non-default resources ..."
./list-all-non-default-resources.ps1

$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Output "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Completed."


param (
    [bool]$skipBuildDeploy,
    [bool]$syncLambdas, # if true - only sync lambda functions
    [bool]$deleteStack,
    [bool]$deployFrontend
)

$scriptName = Split-Path -Leaf $PSCommandPath

. ./util/get-ElapsedTimeFormatted.ps1
$startTime = Get-Date
$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : $scriptName ..." -ForegroundColor White -BackgroundColor DarkBlue

if (-not $skipBuildDeploy) {
    if ($syncLambdas) {
        $commonConstants = ./constants.ps1
        Set-Variable -Name 'TEMPLATE_FILE' -Value "../template.yaml" -Option Constant 

        Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Syncing Lambda functions .."
        sam sync --region $commonConstants.region --template-file $TEMPLATE_FILE --stack-name $commonConstants.stackName
        $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Lambda functions synced successfully." -ForegroundColor Green
        }
        else {
            Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Lambda sync failed with exit code ${LASTEXITCODE}."
        }
    } 
    else {
        ../dev-build-deploy.ps1 -prepareForFrontend $deployFrontend
    }
}

if ($deleteStack) {
    $validInput = $false
    while (-not $validInput) {
        $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
        $message = "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Stack deployed. Continue to [d]elete the Stack or E[x]it ?"
        Write-Host $message  -ForegroundColor White -BackgroundColor DarkGray
        $userInput = Read-Host ">"
        $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime

        if ($userInput -eq 'x' -or $userInput -eq 'X' -or $userInput -eq 'q' -or $userInput -eq 'Q') {
            Write-Host "$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Exiting the script."
            $validInput = $true
        }
        elseif ($userInput -eq 'd' -or $userInput -eq 'D') {
            Write-Host "$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Continuing to delete the stack..."
            $deleteStack = $true
            $validInput = $true
        }
        else {
            Write-Host "Invalid input. Please enter 'd' or 'x'."
        }
    }
}

$commonConstants = ./constants.ps1

if ($deleteStack) {
    $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
    Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Deleting stack '$($commonConstants.stackName)' ..."
    aws cloudformation delete-stack --stack-name $commonConstants.stackName --region $commonConstants.region
    aws cloudformation wait stack-delete-complete --stack-name $commonConstants.stackName --region $commonConstants.region
}

if ($deployFrontend) {
    ./deploy-frontend-distribution.ps1
}

# ./list-all-non-default-resources.ps1 -region $commonConstants.region | Select-String "$($commonConstants.stackName)"

$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Completed $scriptName." -ForegroundColor Blue
param (
    [bool]$skipBuildDeploy,
    [bool]$syncLambdas, # if true - only sync lambda functions
    [bool]$deleteStack,
    [bool]$deployFrontend
)

$scriptName = Split-Path -Leaf $PSCommandPath

$commonConstants = ./constants.ps1

. ./util/get-ElapsedTimeFormatted.ps1
$startTime = Get-Date
$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : $scriptName ..." -ForegroundColor White -BackgroundColor DarkBlue

if (-not $skipBuildDeploy) {
    if ($syncLambdas) {
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
    $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
    Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Deleting stack '$($commonConstants.stackName)' ..."

    aws cloudformation delete-stack --stack-name $commonConstants.stackName --region $commonConstants.region
    aws cloudformation wait stack-delete-complete --stack-name $commonConstants.stackName --region $commonConstants.region
}

# ./util/list-all-non-default-resources.ps1 -region $commonConstants.region | Select-String -Pattern "$($commonConstants.stackName)-|$($commonConstants.stackNameMain)-"

if ($deployFrontend) {
    ./deploy-frontend-distribution.ps1
}

$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Completed $scriptName." -ForegroundColor Blue
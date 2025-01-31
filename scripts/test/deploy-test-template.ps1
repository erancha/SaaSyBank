param (
    [string]$templateSuffix,
    [bool]$deleteStack
)

. ../common/util/get-ElapsedTimeFormatted.ps1

$startTime = Get-Date
$currentLocation = Get-Location

$commonConstants = ../common/constants.ps1

$templateFile = Join-Path -Path $currentLocation.Path -ChildPath "template$templateSuffix.yaml"

$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Validating '$templateFile' ..." -ForegroundColor White -BackgroundColor Blue
sam validate --region $commonConstants.region --template-file $templateFile --lint # | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() }

$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Preparing 'ecrImageUri' ..."
$stackName = "MyECS${templateSuffix}"
$accountId = aws sts get-caller-identity --query "Account" --output text
$ecrImageUri = "${accountId}.dkr.ecr.eu-central-1.amazonaws.com/banking-repository:20250130-1538"

$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Deploying '$templateFile' ..."

# Start the CloudFormation deploy command in a background job
$deployJob = Start-Job -ScriptBlock {
    param($stackName, $region, $ecrImageUri, $templateFile)
    aws cloudformation deploy `
        --stack-name $stackName `
        --template-file "$templateFile" `
        --parameter-overrides "EcrImageUri=$ecrImageUri" `
        --region $region `
        --capabilities CAPABILITY_IAM
} -ArgumentList $stackName, $commonConstants.region, $ecrImageUri, $templateFile

# Wait for up to $timeout seconds for the job to complete
$timeout = 360
$jobCompleted = $deployJob | Wait-Job -Timeout $timeout

# Check if the job completed within the timeout
if ($jobCompleted) {
    # Get the job output
    $jobOutput = Receive-Job -Job $deployJob
    $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
    Write-Output "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Deploy completed."
    # Write-Output $jobOutput
} else {
    # If the job did not complete in time, terminate the job
    Stop-Job -Job $deployJob
    $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
    Write-Output "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Deploy timed out!"
}

# Clean up the job
Remove-Job -Job $deployJob

../common/util/list-all-non-default-resources.ps1 -region $commonConstants.region -startTime $startTime | Select-String $stackName

# =====================================================
# Completion:
# =====================================================
if ($deleteStack) {
    $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
    Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Deleting stack '$stackName' ..."
    aws cloudformation delete-stack --stack-name $stackName --region $commonConstants.region
    aws cloudformation wait stack-delete-complete --stack-name $stackName --region $commonConstants.region
    ../common/util/list-all-non-default-resources.ps1 -region $commonConstants.region -startTime $startTime | Select-String $stackName
}

$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Completed."

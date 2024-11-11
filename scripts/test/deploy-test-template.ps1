param (
    [string]$region,
    [string]$templateSuffix
)

. ../get-ElapsedTimeFormatted.ps1

$startTime = Get-Date
$currentLocation = Get-Location

$stackName = "MyTestECSFargate${templateSuffix}"
$ecrImageUri = "575491442067.dkr.ecr.eu-central-1.amazonaws.com/banking-repository:latest"

# Start the CloudFormation deploy command in a background job
$templateFile = Join-Path -Path $currentLocation.Path -ChildPath "template$templateSuffix.yaml"
Write-Output "`n$(Get-Date -Format 'HH:mm:ss') Deploying '$templateFile' ..."
$deployJob = Start-Job -ScriptBlock {
    param($stackName, $region, $ecrImageUri, $templateFile)
    aws cloudformation deploy `
        --stack-name $stackName `
        --template-file "$templateFile" `
        --parameter-overrides "EcrImageUri=$ecrImageUri" `
        --region $region `
        --capabilities CAPABILITY_IAM
} -ArgumentList $stackName, $region, $ecrImageUri, $templateFile

# Wait for up to $timeout seconds for the job to complete
$timeout = 300
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

# Call the ECS listing script
$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Output "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Listing ECS clusters, services, tasks and containers ..."
../list-ECS.ps1 -region $region

# Call the Subnet listing script
$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Output "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Listing all subnets ..."
../list-Subnets.ps1 -region $region

# =====================================================
# Completion:
# =====================================================
$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Output "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Deleting stack '$stackName' ..."
aws cloudformation delete-stack --stack-name $stackName --region $region
aws cloudformation wait stack-delete-complete --stack-name $stackName --region $region

$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Output "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Completed."

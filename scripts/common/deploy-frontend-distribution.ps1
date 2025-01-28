$scriptName = Split-Path -Leaf $PSCommandPath

. ./util/get-ElapsedTimeFormatted.ps1
$startTime = Get-Date
$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : $scriptName ..." -ForegroundColor White -BackgroundColor DarkBlue

$commonConstants = ./constants.ps1

$stack_outputs = .\get-stack-outputs.ps1

# Update the appConfig.json file
$cloudfront_url    = ($stack_outputs | Where-Object { $_.OutputKey -eq "CloudFrontUrl" }).OutputValue
$redirect_sign_in  = $cloudfront_url  # /callback
$redirect_sign_out = $cloudfront_url # /logout
.\generate-app-config.ps1   -frontend_build_time `
                            -redirect_sign_in $redirect_sign_in `
                            -redirect_sign_out $redirect_sign_out

$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Building the React App ..."
Set-Location ../../frontend/
npm run build

$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Copying the distribution files to the S3 bucket ..."
$S3_BUCKET = ($stack_outputs | Where-Object { $_.OutputKey -eq "S3BucketName" }).OutputValue
if (-not $S3_BUCKET) {
    $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
    Write-Error "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Failed to find S3 bucket name in CloudFormation outputs"
    exit 1
}

$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Uploading to 's3://$S3_BUCKET'"
aws s3 sync build "s3://$S3_BUCKET"
if ($LASTEXITCODE -ne 0) {
    $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
    Write-Error "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Failed to upload files to S3 bucket. Please check your AWS credentials and bucket permissions."
    exit 1
}

Copy-Item -Path $commonConstants.lastDevConfigFilePath -Destination $commonConstants.configFilePath -Force

$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Creating CloudFront invalidation ..."
$cloudfront_distribution_id = ($stack_outputs | Where-Object { $_.OutputKey -eq "CloudFrontDistributionId" }).OutputValue
if ($cloudfront_distribution_id) {
    aws cloudfront create-invalidation --distribution-id $cloudfront_distribution_id --paths "/*"
    $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
    if ($LASTEXITCODE -ne 0) {
        Write-Error "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Failed to create CloudFront invalidation. Please check your AWS credentials and permissions."
    } else {
        Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : CloudFront invalidation created successfully. Your website is available at the following URL: ${cloudfront_url}."
    }
} else {
    Write-Error "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Failed to find CloudFront distribution ID in CloudFormation outputs."
}

Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Completed $scriptName." -ForegroundColor Blue

Set-Location $PSScriptRoot
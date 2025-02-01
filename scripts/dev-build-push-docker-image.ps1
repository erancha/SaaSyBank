param (
   [bool]$skipDockerBuildAndPush = $false,

   [Parameter(Mandatory = $true)]
   [string]$accountId,

   [Parameter(Mandatory = $true)]
   [string]$ecrRepositoryName,

   [Parameter(Mandatory = $true)]
   [string]$serviceName
)

$originalLocation = Get-Location
try {
    Set-Location $PSScriptRoot
    $scriptName = Split-Path -Leaf $PSCommandPath

    . ./common/util/get-ElapsedTimeFormatted.ps1
   $startTime = Get-Date
   $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
   Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : $scriptName ..." -ForegroundColor White -BackgroundColor DarkBlue

   # Configuration
   $commonConstants = ./common/constants.ps1
   $imageTag = Get-Date -Format "yyyyMMdd-HHmm" # "latest" # 
   $ecrUri = "${accountId}.dkr.ecr.$($commonConstants.region).amazonaws.com"
   $ecrImageUri = "${ecrUri}/${ecrRepositoryName}:${imageTag}"
   $latestImageUri = "${ecrUri}/${ecrRepositoryName}:latest"

   if ($skipDockerBuildAndPush) {
      Write-Host "Skipping docker build and push !" -ForegroundColor Yellow -BackgroundColor DarkGreen
      $returnValues = @{ ecrImageUri = $latestImageUri }
   }
   else {
      $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
      Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Building and pushing Docker image(s) for service: $serviceName..."

      # Build Docker image
      $scriptsFolder = (Get-Location).Path
      Set-Location "${scriptsFolder}/../backend/${serviceName}"
      $lowerServiceName = $serviceName.ToLower()
      docker build -t "${lowerServiceName}:${imageTag}" .
      Set-Location ${scriptsFolder}

      # Authenticate with ECR
      $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
      Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Authenticating with ECR..."
      aws ecr get-login-password --region $commonConstants.region | docker login --username AWS --password-stdin $ecrUri

      # Create ECR repository if it doesn't exist
      $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
      Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Ensuring ECR repository exists..."
      $repositoryExists = aws ecr describe-repositories --repository-names $ecrRepositoryName --region $commonConstants.region 2>$null
      if ($LASTEXITCODE -ne 0) {
         Write-Host "Creating ECR repository..."
         aws ecr create-repository --repository-name $ecrRepositoryName --region $commonConstants.region
      }

      # Tag and push image with time-based tag
      $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
      Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Tagging and pushing image $ecrImageUri ..."
      docker tag "${lowerServiceName}:${imageTag}" "$ecrImageUri"
      docker push "$ecrImageUri"

      # Tag and push image as "latest"
      $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
      Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Tagging and pushing image $latestImageUri ..."
      docker tag "${lowerServiceName}:${imageTag}" "$latestImageUri"
      docker push "$latestImageUri"

      $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
      Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Completed. Images pushed successfully to ECR."

      $returnValues = @{ ecrImageUri = $ecrImageUri }
   }

   return $returnValues
}
finally {
    Set-Location $originalLocation
}

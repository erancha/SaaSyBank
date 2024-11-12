param (
   [Parameter(Mandatory = $true)]
   [string]$stackName,

   [Parameter(Mandatory = $true)]
   [string]$accountId,

   [Parameter(Mandatory = $true)]
   [string]$ecrRepositoryName,

   [Parameter(Mandatory = $true)]
   [string]$serviceName
)

# Configuration
$awsRegion = aws configure get region
$imageTag = "latest"
$ecrUri = "${accountId}.dkr.ecr.${awsRegion}.amazonaws.com"
$ecrImageUri = "${ecrUri}/${ecrRepositoryName}:${imageTag}"

# Create hashtable for returning values
$returnValues = @{
   ecrImageUri = $ecrImageUri
}

Write-Host "Building and pushing Docker images for service: $serviceName..."

# Build Docker image
Write-Host "Building Docker image..." -ForegroundColor White -BackgroundColor Magenta
$scriptsFolder = (Get-Location).Path
Set-Location "${scriptsFolder}/../backend/${serviceName}"
$lowerServiceName = $serviceName.ToLower()
docker build -t "${lowerServiceName}:${imageTag}" .
Set-Location ${scriptsFolder}

# Authenticate with ECR
Write-Host "Authenticating with ECR..."
aws ecr get-login-password --region $awsRegion | docker login --username AWS --password-stdin $ecrUri

# Create ECR repository if it doesn't exist
Write-Host "Ensuring ECR repository exists..."
$repositoryExists = aws ecr describe-repositories --repository-names $ecrRepositoryName --region $awsRegion 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating ECR repository..."
    aws ecr create-repository --repository-name $ecrRepositoryName --region $awsRegion
}

# Tag and push image
Write-Host "Tagging and pushing image..."
docker tag "${lowerServiceName}:${imageTag}" "$ecrImageUri"
docker push "${ecrUri}/${ecrRepositoryName}:${imageTag}"

Write-Host "Image pushed successfully to ECR"

return $returnValues
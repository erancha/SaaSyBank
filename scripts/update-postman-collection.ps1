$commonConstants = ./common-constants.ps1

# Retrieve the stack outputs from CloudFormation
$stack_outputs = aws cloudformation describe-stacks --region $commonConstants.region --stack-name $commonConstants.stackName --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
$loadBalancerURL = ($stack_outputs | Where-Object { $_.OutputKey -eq "LoadBalancerURL" }).OutputValue
if (-not $loadBalancerURL) {
    Write-Error "LoadBalancerURL not found in stack outputs."
    exit
}

$environmentFilePath = "../postman_environment.json"
$jsonContent = Get-Content -Path $environmentFilePath -Raw | ConvertFrom-Json
$variableToUpdate = $jsonContent.values | Where-Object { $_.key -eq "baseUrl" }

# Initialize a flag to check if the value of LoadBalancerURL has changed in the last value saved for baseUrl:
$hasChanged = $false

# Update the variable value if it exists
if ($variableToUpdate) {
    if ($variableToUpdate.value -ne $loadBalancerURL) {
        $variableToUpdate.value = $loadBalancerURL
        $hasChanged = $true
    }
} else {
    # If the variable doesn't exist, create a new one
    $jsonContent.values += [PSCustomObject]@{ key = "baseUrl"; value = $loadBalancerURL }
    $hasChanged = $true
}

# Convert the updated content back to JSON and save it only if changes were made
if ($hasChanged) {
    $jsonContent | ConvertTo-Json -Depth 10 | Set-Content -Path $environmentFilePath
    Write-Host "${environmentFilePath} has been updated successfully. Please import into Postman."
} else {
    Write-Host "No changes were made to the baseUrl in ${environmentFilePath}."
}

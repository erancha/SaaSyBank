$commonConstants = ./common/constants.ps1
$stackOutputs = ./common/get-stack-outputs.ps1
$myECSServicesSG = ($stackOutputs | Where-Object { $_.OutputKey -eq "MyECSServicesSG" }).OutputValue
if (-not $myECSServicesSG) {
    Write-Error "MyECSServicesSG not found in stack outputs."
    exit
}
aws ec2 authorize-security-group-ingress --group-id sg-0c5868829116d3628 --protocol tcp --port 6379 --source-group $myECSServicesSG --region $commonConstants.region

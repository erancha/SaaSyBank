$commonConstants = ./constants.ps1
$elasticacheSG = 'sg-0c5868829116d3628'
$stackOutputs = ./get-stack-outputs.ps1
$myECSServicesSG = ($stackOutputs | Where-Object { $_.OutputKey -eq "MyECSServicesSG" }).OutputValue
aws ec2 revoke-security-group-ingress --group-id $elasticacheSG --protocol tcp --port 6379 --source-group $myECSServicesSG --region $commonConstants.region

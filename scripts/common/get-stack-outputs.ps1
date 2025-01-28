$commonConstants = ./constants.ps1

$stack_outputs = aws cloudformation describe-stacks --stack-name $commonConstants.stackName --region $commonConstants.region --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
# Write-Host "Stack outputs:"
# $stack_outputs | ForEach-Object { Write-Host "  $($_.OutputKey): $($_.OutputValue)" }
return $stack_outputs
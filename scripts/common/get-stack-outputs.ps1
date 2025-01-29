$originalLocation = Get-Location
try {
   Set-Location $PSScriptRoot
   
   $commonConstants = ./constants.ps1

   $stackOutputs = aws cloudformation describe-stacks --stack-name $commonConstants.stackName --region $commonConstants.region --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
   # Write-Host "Stack outputs:"
   # $stackOutputs | ForEach-Object { Write-Host "  $($_.OutputKey): $($_.OutputValue)" }
   return $stackOutputs
}
finally {
   Set-Location $originalLocation
}
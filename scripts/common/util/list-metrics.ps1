. ./get-ElapsedTimeFormatted.ps1
$startTime = Get-Date

$commonConstants = ../constants.ps1
$scriptName = Split-Path -Leaf $PSCommandPath
$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : $scriptName --region $($commonConstants.region) ..." -ForegroundColor White -BackgroundColor DarkBlue

# Get all metrics in the specified region using AWS CLI
$metricsJson = aws cloudwatch list-metrics --region $commonConstants.region | Out-String

# Convert JSON output to PowerShell object
$metrics = $metricsJson | ConvertFrom-Json

# Display the metric information
$index = 0
foreach ($metric in $metrics.Metrics) {
    Write-Output "#$index : Namespace: $($metric.Namespace), MetricName: $($metric.MetricName)" # , Dimensions: $($metric.Dimensions | ConvertTo-Json -Depth 10)
    $index++
}

$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Completed."

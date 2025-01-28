param (
    [bool]$deleteLogGroups = $false,
    [string]$deleteLogStreams = ""
)

. ./get-ElapsedTimeFormatted.ps1
$startTime = Get-Date

$commonConstants = . ../constants.ps1  # Make sure to dot-source the file correctly
$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : $scriptName --region $($commonConstants.region) ..." -ForegroundColor White -BackgroundColor DarkBlue

# Get the list of all existing log groups, ensuring output is trimmed and split correctly
$logGroups = aws logs --region $commonConstants.region describe-log-groups --query 'logGroups[*].logGroupName' --output text | Out-String | ForEach-Object { $_.Trim() }
$logGroupsArray = $logGroups -split '\s+' | Where-Object { $_ -ne '' }

if ($deleteLogGroups) {
    foreach ($logGroup in $logGroupsArray) {
        Write-Host "Deleting log group: $logGroup"
        aws logs --region $commonConstants.region delete-log-group --log-group-name $logGroup | Out-Null
    }
}
elseif ($deleteLogStreams -ne "") {
    # Filter log groups that start with the specified prefix
    $filteredLogGroups = $logGroupsArray | Where-Object { $_.StartsWith($deleteLogStreams) }
    
    foreach ($logGroup in $filteredLogGroups) {
        try {
            $streamCounter = 1
            $nextToken = $null
            
            do {
                # Get batch of log streams (maximum 250 at a time)
                $describeCommand = "aws logs --region $($commonConstants.region) describe-log-streams --log-group-name `"$logGroup`" --max-items 250 --query 'logStreams[*].logStreamName' --output json"
                if ($nextToken) {
                    $describeCommand += " --starting-token $nextToken"
                }
                
                $logStreamsJson = Invoke-Expression $describeCommand
                
                if ($logStreamsJson) {
                    $logStreamsObj = $logStreamsJson | ConvertFrom-Json
                    if ($logStreamsObj) {
                        foreach ($logStream in $logStreamsObj) {
                            try {
                                Write-Host "Deleting stream #${streamCounter}: $logStream from $logGroup"
                                aws logs --region $commonConstants.region delete-log-stream --log-group-name $logGroup --log-stream-name $logStream | Out-Null
                                $streamCounter++
                            }
                            catch {
                                Write-Warning "Failed to delete stream $logStream : $_"
                            }
                        }
                    }
                }
                
                # Get next token
                $nextTokenCommand = "aws logs --region $($commonConstants.region) describe-log-streams --log-group-name `"$logGroup`" --max-items 250 --query 'nextToken' --output text"
                $nextTokenResult = Invoke-Expression $nextTokenCommand
                $nextToken = if ($nextTokenResult -eq "None") { $null } else { $nextTokenResult }
            } while ($nextToken)

            $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
            Write-Host "$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Completed $logGroup.`n"
        }
        catch {
            Write-Warning "Error processing log group $logGroup : $_"
            continue
        }
    }
}
else {
    # Set retention policy:
    foreach ($logGroup in $logGroupsArray) {
        # Check if log group name length is valid
        if ($logGroup.Length -le 512) {
            Write-Host "Setting retention policy for log group: $logGroup"
            aws logs --region $commonConstants.region put-retention-policy --log-group-name $logGroup --retention-in-days 1 | Out-Null
        }
        else {
            Write-Host "Skipped log group due to invalid name length: $logGroup"
        }
    }
}

$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Completed."

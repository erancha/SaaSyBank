param (
    [datetime]$startTime
)

function Format-TimeElapsed {
    param (
        [timespan]$elapsedTime
    )

    return "{0:D2}:{1:D2}:{2:D2}" -f $elapsedTime.Hours, $elapsedTime.Minutes, $elapsedTime.Seconds
}

function Get-ElapsedTimeFormatted {
   param (
       [datetime]$startTime
   )
   
   $endTime = Get-Date
   $elapsedTime = $endTime - $startTime
   return Format-TimeElapsed -elapsedTime $elapsedTime
}

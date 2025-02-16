param (
    [int]$parallelCount = 1,
    [int]$iterationsCount = 1
)

$scriptName = Split-Path -Leaf $PSCommandPath

. ./common/util/get-ElapsedTimeFormatted.ps1

$startTime = Get-Date

# ==========================================================================
# Execute all HTTP requests deployed by the last stack with test dummy data.
# ==========================================================================

$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : $scriptName , Parameters:" ($PSBoundParameters.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) "..." -ForegroundColor White -BackgroundColor DarkBlue
Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Retrieving LoadBalancerURL from the last stack output ..."

# Extract LoadBalancerURL from the last cloudformation stack:
$stackOutputs = ./common/get-stack-outputs.ps1
$loadBalancerURL = ($stackOutputs | Where-Object { $_.OutputKey -eq "LoadBalancerURL" }).OutputValue
if (-not $loadBalancerURL) {
    Write-Error "LoadBalancerURL not found in stack outputs."
    exit
}

function Execute-Requests {
    param (
        [string]$loadBalancerURL,
        [array]$requests,
        [int]$iterationsCount = 1,
        [bool]$showOutput = $true
    )

    # Function to format and display output
    function Display-Output {
        param (
            [string]$title,
            [string]$requestJson,
            [string]$responseJson,
            [string]$expectedResponse = ''
        )
        
        if ($showOutput) {
            Write-Host "===== $title =====" -ForegroundColor Cyan
            Write-Host "Request: $requestJson" 
            Write-Host "Response: $responseJson"
        }

        if ($expectedResponse) {
            [void](Verify-Response -title $title -responseJson $responseJson -expectedPattern $expectedResponse)
        }
    }

    function Verify-Response {
        param (
            [string]$title,
            [string]$responseJson,
            [string]$expectedPattern
        )

        if (-not $expectedPattern) {
            return $true
        }

        try {
            # Special handling for pure regex patterns (not JSON)
            if ($expectedPattern.StartsWith('regex:')) {
                $pattern = $expectedPattern.Substring(6)
                $result = $responseJson -match "^`"?($pattern)`"?$"
                if (-not $result) {
                    Write-Warning "Value '$responseJson' does not match pattern '$pattern'"
                    return $false
                }
                return $true
            }

            $response = $responseJson | ConvertFrom-Json
            $expected = $expectedPattern | ConvertFrom-Json

            # Helper function to recursively verify objects
            function Test-ObjectMatch {
                param($actual, $expected)
                
                if ($null -eq $expected) {
                    return $true
                }

                if ($expected -is [string] -and $expected.StartsWith('regex:')) {
                    $pattern = $expected.Substring(6)
                    if ($actual -notmatch $pattern) {
                        Write-Warning "Value '$actual' does not match pattern '$pattern'"
                        return $false
                    }
                    return $true
                }

                if ($expected -is [PSCustomObject]) {
                    $expectedProps = $expected | Get-Member -MemberType NoteProperty | Select-Object -ExpandProperty Name
                    foreach ($prop in $expectedProps) {
                        if ($null -eq $actual.$prop) {
                            Write-Warning "Missing expected property: $prop"
                            return $false
                        }
                        if (-not (Test-ObjectMatch $actual.$prop $expected.$prop)) {
                            return $false
                        }
                    }
                    return $true
                }

                if ($expected -is [array]) {
                    if ($actual.Count -lt $expected.Count) {
                        Write-Warning "Array has fewer items than expected"
                        return $false
                    }
                    for ($i = 0; $i -lt $expected.Count; $i++) {
                        if (-not (Test-ObjectMatch $actual[$i] $expected[$i])) {
                            return $false
                        }
                    }
                    return $true
                }

                if ($actual -ne $expected) {
                    Write-Warning "Value mismatch. Expected: $expected, Got: $actual"
                    return $false
                }
                return $true
            }

            $result = Test-ObjectMatch $response $expected
            if (-not $result) {
                Write-Warning "Response validation failed for: $title"
                Write-Warning "Full response: $responseJson"
            }
            return $result
        }
        catch {
            Write-Warning "Error validating response for $title : $_"
            return $false
        }
    }

    for ($i = 0; $i -lt $iterationsCount; $i++) {
        if (-not $requests -or ($requests.Count -eq 0)) {
            # Generate input values for this test:
            $accountId = [guid]::NewGuid().ToString()
            $toAccountId = [guid]::NewGuid().ToString()
            $userId = "43e4c8a2-4081-70d9-613a-244f8f726307" # bettyuser100@gmail.com
            $userName = "Betty User"
            $userEmail = "bettyuser100@gmail.com"

            # Define the requests with expected responses
            $requests = @(
                @{
                    Name             = "Time"
                    Method           = "GET"
                    Url              = "/api/time"
                    ExpectedResponse = 'regex:"?\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"?'
                },
                @{
                    Name             = "Create User"
                    Method           = "POST"
                    Url              = "/api/banking/user"
                    Body             = @{ "userId" = $userId; "userName" = $userName; "email" = $userEmail } | ConvertTo-Json
                    ExpectedResponse = "{`"message`":`"User updated successfully`",`"payload`":{`"user_id`":`"$userId`",`"user_name`":`"$userName`",`"email_address`":`"$userEmail`"}}"
                },
                @{
                    Name             = "Get All Users"
                    Method           = "GET"
                    Url              = "/api/banking/users"
                    ExpectedResponse = "{`"status`":`"OK`",`"users`":[{`"user_id`":`"$userId`",`"user_name`":`"$userName`",`"email_address`":`"$userEmail`"}]}"
                },
                @{
                    Name             = "Create Account #1"
                    Method           = "POST"
                    Url              = "/api/banking/account"
                    Body             = @{ "accountId" = $accountId; "initialBalance" = 0; "userId" = $userId } | ConvertTo-Json
                    ExpectedResponse = "{`"message`":`"Account created successfully`",`"payload`":{`"account_id`":`"$accountId`",`"is_disabled`":false,`"balance`":`"0.00`"}}"
                },
                @{
                    Name             = "Create Account #2"
                    Method           = "POST"
                    Url              = "/api/banking/account"
                    Body             = @{ "accountId" = $toAccountId; "initialBalance" = 0; "userId" = $userId } | ConvertTo-Json
                    ExpectedResponse = "{`"message`":`"Account created successfully`",`"payload`":{`"account_id`":`"$toAccountId`",`"is_disabled`":false,`"balance`":`"0.00`"}}"
                },
                @{
                    Name             = "Get all Accounts"
                    Method           = "GET"
                    Url              = "/api/banking/accounts"
                    ExpectedResponse = "{`"message`":`"Accounts retrieved successfully`",`"payload`":[{`"account_id`":`"regex:.+`",`"balance`":`"regex:\\d+\\.\\d{2}`",`"is_disabled`":false},{`"account_id`":`"regex:.+`",`"balance`":`"regex:\\d+\\.\\d{2}`",`"is_disabled`":false}]}"
                },
                @{
                    Name             = "Get Accounts By User ID"
                    Method           = "GET"
                    Url              = "/api/banking/accounts/user?userId=$userId"
                    ExpectedResponse = "{`"message`":`"Accounts retrieved successfully`",`"payload`":[{`"account_id`":`"$toAccountId`",`"balance`":`"0.00`",`"is_disabled`":false},{`"account_id`":`"$accountId`",`"balance`":`"0.00`",`"is_disabled`":false}]}"
                },
                @{
                    Name             = "Get All Accounts Grouped By User"
                    Method           = "GET"
                    Url              = "/api/banking/accounts/grouped"
                    ExpectedResponse = "{`"message`":`"Accounts grouped by user retrieved successfully`",`"payload`":[{`"user_id`":`"$userId`",`"user_name`":`"$userName`",`"accounts`":[{`"account_id`":`"$toAccountId`"},{`"account_id`":`"$accountId`"}]}]}"
                },
                @{
                    Name             = "Deposit"
                    Method           = "POST"
                    Url              = "/api/banking/deposit"
                    Body             = @{ "amount" = 1000; "accountId" = $accountId } | ConvertTo-Json
                    ExpectedResponse = "{`"message`":`"Deposit successful`",`"payload`":{`"bankingFunction`":`"deposit`",`"amount`":1000,`"account`":{`"account_id`":`"$accountId`",`"balance`":`"1000.00`"}}}"
                },
                @{
                    Name             = "Withdraw"
                    Method           = "POST"
                    Url              = "/api/banking/withdraw"
                    Body             = @{ "amount" = 500; "accountId" = $accountId } | ConvertTo-Json
                    ExpectedResponse = "{`"message`":`"Withdraw successful`",`"payload`":{`"bankingFunction`":`"withdraw`",`"amount`":500,`"account`":{`"account_id`":`"$accountId`",`"balance`":`"500.00`"}}}"
                },
                @{
                    Name             = "Transfer"
                    Method           = "POST"
                    Url              = "/api/banking/transfer"
                    Body             = @{ "amount" = 200; "fromAccountId" = $accountId; "toAccountId" = $toAccountId } | ConvertTo-Json
                    ExpectedResponse = "{`"message`":`"Transfer successful`",`"payload`":{`"bankingFunction`":`"transfer`",`"amount`":200}}"
                },
                @{
                    Name             = "Get Balance for From Account"
                    Method           = "GET"
                    Url              = "/api/banking/balance/$accountId"
                    ExpectedResponse = "{`"message`":`"Balance retrieved successfully`",`"payload`":{`"accountId`":`"$accountId`",`"balance`":`"300.00`"}}"
                },
                @{
                    Name             = "Get Balance for To Account"
                    Method           = "GET"
                    Url              = "/api/banking/balance/$toAccountId"
                    ExpectedResponse = "{`"message`":`"Balance retrieved successfully`",`"payload`":{`"accountId`":`"$toAccountId`",`"balance`":`"200.00`"}}"
                },
                @{
                    Name             = "Get Transactions for Account"
                    Method           = "GET"
                    Url              = "/api/banking/transactions/$accountId"
                    ExpectedResponse = '{
                                            "message": "Transactions retrieved successfully",
                                            "payload": [
                                                {
                                                    "id": "regex:[0-9a-f-]+",
                                                    "executed_at": "regex:\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z",
                                                    "bankingFunction": "regex:deposit|withdraw|transfer",
                                                    "amount": "regex:\\d+",
                                                    "account_id": "regex:[0-9a-f-]+",
                                                    "to_account_id": "regex:[0-9a-f-]+"
                                                }
                                            ]
                                        }'
                }
            )
        }

        foreach ($request in $requests) {
            $method = $request.Method
            $url = "${loadBalancerURL}$($request.Url)"
            $body = $request.Body
        
            if (-not [string]::IsNullOrEmpty($body)) {
                $bodyObject = $body | ConvertFrom-Json
                $requestJson = $bodyObject | ConvertTo-Json -Compress
            }
            else {
                $requestJson = $request.Url
            }
        
            # Send the request and capture the response
            $responseJson = ''
            try {
                if ($method -eq "GET") {
                    $response = Invoke-RestMethod -Method $method -Uri $url
                }
                else {
                    $response = Invoke-RestMethod -Method $method -Uri $url -Body $body -ContentType "application/json"
                }
        
                $responseJson = $response | ConvertTo-Json -Compress -Depth 10
                Display-Output -title $request.Name -requestJson $requestJson -responseJson $responseJson -expectedResponse $request.ExpectedResponse
            } catch {
                Display-Output -title $request.Name -requestJson $requestJson 
                Write-Error "Error Message: $($_.Exception.Message)"
                # Write-Error "Error Category: $($_.Exception.GetType().FullName)"
                # Write-Error "Error Stack Trace: $($_.ScriptStackTrace)"
            }
        }
        
        $requests = @()
    }

    if ($showOutput) {
        Write-Host "Completed successfully." -ForegroundColor Green
    }
}

$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Output "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Starting to execute requests ..."

$initRequests = @(
    @{
        Name   = "Tables"
        Method = "GET"
        Url    = "/api/tables"
    },
    @{
        Name   = "Health Check"
        Method = "GET"
        Url    = "/api/banking/health?redis=true"
    }
)

# Execute requests
Execute-Requests -loadBalancerURL $loadBalancerURL -requests $initRequests

# Check if parallelCount is 1 to execute requests directly
if ($parallelCount -eq 1) {
    Execute-Requests -loadBalancerURL $loadBalancerURL -requests $requests -iterationsCount $iterationsCount
} else {
    # Execute requests with jobs if parallelCount is greater than 1
    $showOutput = $iterationsCount -le 2
    $jobs = @()
    for ($j = 0; $j -lt $parallelCount; $j++) {
        $job = Start-Job -ScriptBlock ${function:Execute-Requests} -ArgumentList $loadBalancerURL, $requests, $iterationsCount, $showOutput
        $jobs += $job
    }

    # Wait for all jobs to complete
    $jobs | Wait-Job

    # Check conditions to display output
    foreach ($job in $jobs) {
        Write-Host "Output from Job $($job.Id):"
        Receive-Job -Job $job
    }

    # Optionally clean up jobs
    Get-Job | Remove-Job
}

# Execute the initial requests again at the end, to get the number of created tables and accounts ("Database checked/created, table created, record added, and deleted successfully. Current records counts: 2 accounts, 4 transactions.")
Execute-Requests -loadBalancerURL $loadBalancerURL -requests $initRequests

$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Completed $scriptName." -ForegroundColor Blue

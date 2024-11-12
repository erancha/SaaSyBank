param (
    [int]$parallelCount = 1,
    [int]$iterationsCount = 1
)

. ./get-ElapsedTimeFormatted.ps1

$startTime = Get-Date

# ==========================================================================
# Execute all HTTP requests deployed by the last stack with test dummy data.
# ==========================================================================
Write-Host " $(Split-Path -Leaf $PSCommandPath) ..." -ForegroundColor White -BackgroundColor DarkBlue

$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Output "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Retriving LoadBalancerURL from the last stack output ..."

# Extract LoadBalancerURL from the last cloudformation stack:
$commonConstants = ./common-constants.ps1
$stack_outputs = aws cloudformation describe-stacks --region $commonConstants.region --stack-name $commonConstants.stackName --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
$loadBalancerURL = ($stack_outputs | Where-Object { $_.OutputKey -eq "LoadBalancerURL" }).OutputValue
if (-not $loadBalancerURL) {
    Write-Error "LoadBalancerURL not found in stack outputs."
    exit
}

# Function to execute requests
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
            # Write-Host "-----------------------------------------"
            Write-Host "===== $title =====" -ForegroundColor Cyan
            Write-Host "Request: $requestJson" 
            Write-Host "Response: $responseJson"
        }

        if ($expectedResponse -and $responseJson -ne $expectedResponse) {
            Write-Warning "Unexpected Response! (expecting: $expectedResponse)"
        }
    }

    for ($i = 0; $i -lt $iterationsCount; $i++) {
        if (-not $requests -or ($requests.Count -eq 0)) {
            # Generate input values for this test:
            $accountId = [guid]::NewGuid().ToString()
            $toAccountId = [guid]::NewGuid().ToString()
            $tenantId = "tenant1"

            # Define the requests with expected responses
            $requests = @(
                @{
                    Name = "Time"
                    Method = "GET"
                    Url = "/api/time"
                },
                @{
                    Name = "Create Account"
                    Method = "POST"
                    Url = "/api/banking/account"
                    Body = @{ "accountId" = $accountId; "initialBalance" = 0; "tenantId" = $tenantId } | ConvertTo-Json
                },
                @{
                    Name = "Create To Account"
                    Method = "POST"
                    Url = "/api/banking/account"
                    Body = @{ "accountId" = $toAccountId; "initialBalance" = 0; "tenantId" = $tenantId } | ConvertTo-Json
                },
                @{
                    Name = "Deposit"
                    Method = "POST"
                    Url = "/api/banking/deposit"
                    Body = @{ "amount" = 1000; "accountId" = $accountId; "tenantId" = $tenantId } | ConvertTo-Json
                },
                @{
                    Name = "Withdraw"
                    Method = "POST"
                    Url = "/api/banking/withdraw"
                    Body = @{ "amount" = 500; "accountId" = $accountId; "tenantId" = $tenantId } | ConvertTo-Json
                },
                @{
                    Name = "Transfer"
                    Method = "POST"
                    Url = "/api/banking/transfer"
                    Body = @{ "amount" = 200; "fromAccountId" = $accountId; "toAccountId" = $toAccountId; "tenantId" = $tenantId } | ConvertTo-Json
                },
                @{
                    Name = "Get Balance"
                    Method = "GET"
                    Url = "/api/banking/balance/$tenantId/$accountId"
                    ExpectedResponse = '{"message":"Balance retrieved successfully","accountId":"' + $accountId + '","balance":"300.00"}'
                },
                @{
                    Name = "Get Balance for To Account"
                    Method = "GET"
                    Url = "/api/banking/balance/$tenantId/$toAccountId"
                    ExpectedResponse = '{"message":"Balance retrieved successfully","accountId":"' + $toAccountId + '","balance":"200.00"}'
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
            } else {
                $requestJson = $request.Url
            }

            # Send the request and capture the response
            $response = ''
            if ($method -eq "GET") {
                $response = Invoke-RestMethod -Method $method -Uri $url
            } else {
                $response = Invoke-RestMethod -Method $method -Uri $url -Body $body -ContentType "application/json"
            }

            $responseJson = $response | ConvertTo-Json -Compress
            Display-Output -title $request.Name -requestJson $requestJson -responseJson $responseJson -expectedResponse $request.ExpectedResponse
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
        Name = "Tables"
        Method = "GET"
        Url = "/api/tables"
    },
    @{
        Name = "Health Check"
        Method = "GET"
        Url = "/api/banking/health"
    }
)
Execute-Requests -loadBalancerURL $loadBalancerURL -requests $initRequests

# Execute requests
$showOutput = $parallelCount -eq 1 -and $iterationsCount -le 2
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

Execute-Requests -loadBalancerURL $loadBalancerURL -requests $initRequests

$formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
Write-Output "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Completed."

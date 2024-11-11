# ==========================================================================
# Execute all HTTP requests deployed by the last stack with test dummy data.
# ==========================================================================
Write-Host " $(Split-Path -Leaf $PSCommandPath) ..." -ForegroundColor White -BackgroundColor DarkBlue

# Extract LoadBalancerURL from the last cloudformation stack:
$commonConstants = ./common-constants.ps1
$stack_outputs = aws cloudformation describe-stacks --region $commonConstants.region --stack-name $commonConstants.stackName --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
$loadBalancerURL = ($stack_outputs | Where-Object { $_.OutputKey -eq "LoadBalancerURL" }).OutputValue
if (-not $loadBalancerURL) {
    Write-Error "LoadBalancerURL not found in stack outputs."
    exit
}

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
        Name = "Tables"
        Method = "GET"
        Url = "/api/tables"
    },
    @{
        Name = "Health Check"
        Method = "GET"
        Url = "/api/banking/health"
    },
    @{
        Name = "Create Account"
        Method = "POST"
        Url = "/api/banking/account"
        Body = @{ "accountId" = $accountId; "initialBalance" = 0 ; "tenantId" = $tenantId} | ConvertTo-Json
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
    },
    @{
        Name = "Get Balance"
        Method = "GET"
        Url = "/api/banking/balance/$tenantId/$toAccountId"
    }
)

# Execute the requests and display responses
foreach ($request in $requests) {
    $method = $request.Method
    $url = "${loadBalancerURL}$($request.Url)"
    $body = $request.Body

    Write-Host "$($request.Name):"
    if (-not [string]::IsNullOrEmpty($body)) {
        $bodyObject = $body | ConvertFrom-Json
        $requestJson = $bodyObject | ConvertTo-Json -Compress
        Write-Host "Request: $requestJson"
    } else {
        Write-Host "Request: $($request.Url)"
    }
    
    # Send the request and capture the response
    $response = ''
    if ($method -eq "GET") {
        $response = Invoke-RestMethod -Method $method -Uri $url
    } else {
        $response = Invoke-RestMethod -Method $method -Uri $url -Body $body -ContentType "application/json"
    }

    # Display the response
    $responseJson = $response | ConvertTo-Json -Compress
    Write-Host "Response: $responseJson"
    Write-Host "-----------------------------------------"
}

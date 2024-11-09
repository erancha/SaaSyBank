# ==========================================================================
# Execute all HTTP requests deployed by the last stack with test dummy data.
# ==========================================================================

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
$tenantId = "TenantId#1"

# Define the requests with expected responses
$requests = @(
    @{
        Name = "Time"
        Method = "GET"
        Url = "$loadBalancerURL/api/time"
        ExpectedResponse = @{dataType='time'}
    },
    @{
        Name = "Health Check"
        Method = "GET"
        Url = "$loadBalancerURL/api/banking/health"
        ExpectedResponse = @{status="healthy"}
    },
    @{
        Name = "Deposit"
        Method = "POST"
        Url = "$loadBalancerURL/api/banking/deposit"
        Body = @{ "amount" = 1000; "accountId" = $accountId; "tenantId" = $tenantId } | ConvertTo-Json
        ExpectedResponse = @{message="Deposit successful"; amount=1000; accountId=$accountId; tenantId=$tenantId}
    },
    @{
        Name = "Withdraw"
        Method = "POST"
        Url = "$loadBalancerURL/api/banking/withdraw"
        Body = @{ "amount" = 500; "accountId" = $accountId; "tenantId" = $tenantId } | ConvertTo-Json
        ExpectedResponse = @{message="Withdraw successful"; amount=500; accountId=$accountId; tenantId=$tenantId}
    },
    @{
        Name = "Transfer"
        Method = "POST"
        Url = "$loadBalancerURL/api/banking/transfer"
        Body = @{ "amount" = 200; "fromAccountId" = $accountId; "toAccountId" = $toAccountId; "tenantId" = $tenantId } | ConvertTo-Json
        ExpectedResponse = @{message="Transfer successful"; amount=200; fromAccountId=$accountId; toAccountId=$toAccountId; tenantId=$tenantId}
    }
)

# Execute the requests and display responses
foreach ($request in $requests) {
    $method = $request.Method
    $url = $request.Url
    $body = $request.Body

    # Send the request and capture the response
    if ($method -eq "GET") {
        $response = Invoke-RestMethod -Method $method -Uri $url
    } else {
        $response = Invoke-RestMethod -Method $method -Uri $url -Body $body -ContentType "application/json"
    }

    # Display the response
    Write-Host "Response for $($request.Name):"
    Write-Host $response

    # Validate the response
    if ($response.dataType -eq 'time') {
        # Validate if response is a valid ISO 8601 timestamp
        if ($response.timestamp -notmatch '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$') {
            Write-Warning "Warning: Response for Time request is not a valid ISO 8601 timestamp."
        }
    }
    elseif ($request.ExpectedResponse -is [hashtable]) {
        if (-not ($response.PSObject.Properties.Match($request.ExpectedResponse.Keys) -and
                   $request.ExpectedResponse.Keys | ForEach-Object { $response.$_ -eq $request.ExpectedResponse.$_ })) {
            Write-Warning "Warning: Response for $($request.Name) does not match expected value."
        }
    } elseif ($request.ExpectedResponse -is [string]) {
        if ($response -ne $request.ExpectedResponse) {
            Write-Warning "Warning: Response for $($request.Name) does not match expected value."
        }
    }
    
    Write-Host "-----------------------------------------"
}

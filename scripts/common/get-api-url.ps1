param (
   [array]$stackOutputs,
   [string]$gatewayType # Rest or WebSocket
)

Set-Variable -Name 'API_URL_KEY_NAME' -Value "${gatewayType}ApiUrl" -Option Constant
$apiUrl = ($stackOutputs | Where-Object { $_.OutputKey -eq $API_URL_KEY_NAME }).OutputValue
if (-not $apiUrl) {
   Write-Warning "Failed to find ${API_URL_KEY_NAME} in CloudFormation outputs"
   exit 1
}

return $apiUrl
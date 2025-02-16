param (
   [array]$stackOutputs,
   [string]$gatewayType # Rest or WebSocket
)

# Attempt to retrieve the API URL using ${gatewayType}ApiUrl:
Set-Variable -Name 'API_URL_KEY_NAME' -Value "${gatewayType}ApiUrl" -Option Constant
$apiUrl = ($stackOutputs | Where-Object { $_.OutputKey -eq $API_URL_KEY_NAME }).OutputValue
if (-not $apiUrl) {
   # Attempt to retrieve the API URL using LoadBalancerURL:
   $loadBalancerUrl = ($stackOutputs | Where-Object { $_.OutputKey -eq 'LoadBalancerURL' }).OutputValue
   if (-not $loadBalancerUrl) {
      Write-Warning "Failed to find both ${API_URL_KEY_NAME} and LoadBalancerURL in CloudFormation outputs"
      exit 1
   }
   else {
      $apiUrl = "$loadBalancerUrl/api/banking" # TODO
   }
}

return $apiUrl

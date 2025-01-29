param (
  [switch]$backend_build_time = $false,
  [switch]$frontend_build_time = $false,
  [string]$redirect_sign_in,
  [string]$redirect_sign_out
)

$stackOutputs = ./get-stack-outputs.ps1
$rest_api_url = .\get-api-url.ps1 -stackOutputs $stackOutputs -gatewayType 'Rest'
$websocket_api_url = .\get-api-url.ps1 -stackOutputs $stackOutputs -gatewayType 'WebSocket'

$build_time = ""
if ($backend_build_time) {
  $build_time = $commonConstants.stackName + " " + (Get-Date -Format "yyyy MM/dd_HH:mm") + " "
}

$commonConstants = ./constants.ps1
if ($frontend_build_time) {
  if (-Not (Test-Path $commonConstants.configFilePath)) {
    Write-Output "Existing config file not found at $($commonConstants.configFilePath)"
    exit 1
  }
  $existing_config = Get-Content $commonConstants.configFilePath | ConvertFrom-Json
  $build_time = $existing_config.BUILD + " | " + (Get-Date -Format "MM/dd_HH:mm")
}
$build_time = $build_time.Trim()

$cognito_user_pool_id = ($stackOutputs | Where-Object { $_.OutputKey -eq "UserPoolId" }).OutputValue
$cognito_user_pool_client_id = ($stackOutputs | Where-Object { $_.OutputKey -eq "UserPoolClientId" }).OutputValue
$cognito_domain = ($stackOutputs | Where-Object { $_.OutputKey -eq "CognitoDomain" }).OutputValue

# Check if the config file doesn't exist
if (-Not (Test-Path $commonConstants.configFilePath)) {
  # If the file doesn't exist, create a new one with all the provided information
  $config_content = @"
    {
        "REST_API_URL": "$rest_api_url",
        "WEBSOCKET_API_URL": "$websocket_api_url",
        "BUILD": "$build_time",
        "COGNITO": {
            "userPoolId": "$cognito_user_pool_id",
            "userPoolWebClientId": "$cognito_user_pool_client_id",
            "domain": "$cognito_domain",
            "region": "$($commonConstants.region)",
            "redirectSignIn": "$redirect_sign_in",
            "redirectSignOut": "$redirect_sign_out"
        }
    }
"@

  Set-Content -Path $commonConstants.configFilePath -Value $config_content
  Write-Output "New config file created successfully at $($commonConstants.configFilePath)"
}
else {
  # If the file exists, read its content
  $existing_config = Get-Content $commonConstants.configFilePath | ConvertFrom-Json

  # Update the specified values
  $existing_config.BUILD = $build_time
  $existing_config.REST_API_URL = $rest_api_url
  $existing_config.WEBSOCKET_API_URL = $websocket_api_url
  $existing_config.COGNITO.redirectSignIn = $redirect_sign_in
  $existing_config.COGNITO.redirectSignOut = $redirect_sign_out
  $existing_config.COGNITO.userPoolWebClientId = $cognito_user_pool_client_id

  # Convert the updated config back to JSON and save it
  $updated_config = $existing_config | ConvertTo-Json -Depth 10
  Set-Content -Path $commonConstants.configFilePath -Value $updated_config

  Write-Output "Existing config file updated successfully at ${CONFIG_FILE_PATH} : ${updated_config}"
}

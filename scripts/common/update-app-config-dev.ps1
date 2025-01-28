$originalLocation = Get-Location
try {
    Set-Location $PSScriptRoot

   # Update the appConfig.json file
   # ------------------------------
   $redirect_sign_in = "http://localhost:3000" # /callback
   $redirect_sign_out = "http://localhost:3000" # /logout
               
   .\generate-app-config.ps1  -backend_build_time `
                              -redirect_sign_in $redirect_sign_in `
                              -redirect_sign_out $redirect_sign_out

   $commonConstants = ./constants.ps1
   Copy-Item -Path $commonConstants.configFilePath -Destination $commonConstants.lastDevConfigFilePath
}
finally {
    Set-Location $originalLocation
}
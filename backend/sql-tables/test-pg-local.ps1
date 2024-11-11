Write-Host " $(Split-Path -Leaf $PSCommandPath) ..." -ForegroundColor White -BackgroundColor DarkBlue

Set-Location scripts
$commonConstants = ./common-constants.ps1

$env:RDS_ENDPOINT = "$($commonConstants.stackName)-rds.ctqgw46o4gm3.eu-central-1.rds.amazonaws.com"
$env:DB_USERNAME = "postgresuser" # TODO: For testing purpose !
$env:DB_PASSWORD = "postgresPassWord1969!" # TODO: For testing purpose !

Set-Location ..\backend\sql-tables
$env:NODE_PATH = "..\layers\pg\nodejs\node_modules"

node test-pg-local.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "Script executed successfully."
} else {
    Write-Host "Script execution failed with exit code: $LASTEXITCODE"
}

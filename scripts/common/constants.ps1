$originalLocation = Get-Location
try {
    Set-Location $PSScriptRoot

    $currentBranch = git rev-parse --abbrev-ref HEAD
    $isMainBranch = -not $currentBranch -or $currentBranch -eq 'main'

    $appName = ../get-app-name.ps1
    if ($isMainBranch) {
        $stackName = $appName
    }
    else {
        $stackName = "${appName}f1"
    }

    $appFolder = "$PSScriptRoot/../.."
    return @{
        isMainBranch          = $isMainBranch
        stackName             = $stackName
        configFilePath        = "${appFolder}/frontend/src/appConfig.json"
        lastDevConfigFilePath = "${appFolder}/frontend/appConfigDev.json"
        region                = "eu-central-1" # aws configure get region
    }
}
finally {
    Set-Location $originalLocation
}
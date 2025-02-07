$sourceFile = ".\SasSyBank-private\README.MD"
$targetFolder = ".\SasSyBank" # SasSyBank-public
$targetFile = "$targetFolder\README.MD"
$repositoryUrl = "https://github.com/erancha/SasSyBank.git"
$commitMessage = "Add README.md via hardlink"

Set-Location ..\..\..\..

# Create a new subfolder 'SasSyBank'
# New-Item -ItemType Directory -Path $targetFolder -Force

# Create a hardlink from the target folder to the source README.md
Write-Host "cmd /c mklink /H $targetFile $sourceFile"
if (Test-Path $targetFile) {
   Remove-Item $targetFile -Force
}
cmd /c mklink /H $targetFile $sourceFile

# Navigate to the 'SasSyBank' directory
Set-Location -Path $targetFolder

# git init
git add README.MD
git commit -m $commitMessage
# git branch -M main
# git remote add origin $repositoryUrl
git push -u origin main

Set-Location ..\SasSyBank-private\scripts\common\util\
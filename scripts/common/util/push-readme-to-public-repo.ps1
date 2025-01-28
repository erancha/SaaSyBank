$sourceFile = ".\Betty-private\README.MD"
$targetFolder = ".\Betty" # Betty-public
$targetFile = "$targetFolder\README.MD"
$repositoryUrl = "https://github.com/erancha/Betty.git"
$commitMessage = "Add README.md via hardlink"

Set-Location ..\..\..\..

# Create a new subfolder 'Betty'
# New-Item -ItemType Directory -Path $targetFolder -Force

# Create a hardlink from the target folder to the source README.md
Write-Host "cmd /c mklink /H $targetFile $sourceFile"
if (Test-Path $targetFile) {
   Remove-Item $targetFile -Force
}
cmd /c mklink /H $targetFile $sourceFile

# Navigate to the 'Betty' directory
Set-Location -Path $targetFolder

# git init
git add README.MD
git commit -m $commitMessage
# git branch -M main
# git remote add origin $repositoryUrl
git push -u origin main

Set-Location ..\Betty-private\scripts\common\util\
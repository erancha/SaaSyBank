$scanFolderScript = "${PSScriptRoot}\scan-folder.ps1"
$frontendSrcFolder = Resolve-Path "${PSScriptRoot}\..\..\..\frontend\src"

& $scanFolderScript -FolderPath "${frontendSrcFolder}\redux" -OutputFile redux.out
& $scanFolderScript -FolderPath "${frontendSrcFolder}\components" -OutputFile components.out

# & $scanFolderScript -FolderPath "F:\Projects\AWS\react-jscript-auth-app" -OutputFile F:\Projects\AWS\react-jscript-auth-app\appFolder.out
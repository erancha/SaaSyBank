$currentBranch = git rev-parse --abbrev-ref HEAD
$isMainBranch = $currentBranch -eq 'main'

if ($isMainBranch) {
    $stackName = 'sb'
}
else {
    $stackName = 'sb-f3'
}

return @{
    isMainBranch = $isMainBranch
    stackName = $stackName
    region = aws configure get region # "eu-central-1"
 }
 

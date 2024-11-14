$currentBranch = git rev-parse --abbrev-ref HEAD
$isMainBranch = $currentBranch -eq 'main'

if ($isMainBranch) {
    $stackName = 'sb'
}
else {
    $stackName = 'sb-f6'
}

return @{
    isMainBranch = $isMainBranch
    stackName = $stackName
    region = "eu-west-1" # aws configure get region
 }
 

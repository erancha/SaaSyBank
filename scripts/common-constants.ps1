$currentBranch = git rev-parse --abbrev-ref HEAD
$isMainBranch = $currentBranch -eq 'main'

if ($isMainBranch) {
    Set-Variable -Name 'STACK_NAME' -Value 'sb' -Scope Global
}
else {
    Set-Variable -Name 'STACK_NAME' -Value 'sb-f1' -Scope Global
}

return $isMainBranch

$isMainBranch = .\common-constants.ps1
Set-Variable -Name 'TEMPLATE_FILE' -Value '.\template.yaml' -Option Constant 

$startTime = Get-Date

Write-Output "`n$(Get-Date -Format 'HH:mm:ss') Validating the SAM template .."
sam validate --template-file $TEMPLATE_FILE # --lint | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() }
if ($LASTEXITCODE -eq 0) {
    Write-Output "`n$(Get-Date -Format 'HH:mm:ss') Starting a build, stack ${STACK_NAME} .."

    sam build --template-file $TEMPLATE_FILE
    if ($LASTEXITCODE -eq 0) {
        $endTime = Get-Date
        $elapsedTime = [math]::Round(($endTime - $startTime).TotalSeconds)
        Write-Output "`n$(Get-Date -Format 'HH:mm:ss') Build completed, time elapsed: $elapsedTime seconds.  Deploying .."

        # Build the parameter overrides string dynamically
        $parameterOverrides = @(
            # "ExistingUsersTableName='sb-users'",
            # "ExistingAccountsTableName='sb-accounts'",
            "ExistingNotesEncryptionKeyId='d0efc261-b71d-4f5c-9686-9876cc664243'",
            "ExistingUserPoolId='eu-central-1_OHq1aZYju'",
            "ExistingIdentityPoolId='eu-central-1:e9f848f2-a3ed-43f9-8ddb-833ca34233ba'",
            "ExistingElasticacheRedisClusterAddress='en-elasticache-redis-cluster.hz2zez.0001.euc1.cache.amazonaws.com:6379'",
            "ExistingVpcId='vpc-08016eb77e7ac9962'",
            "ExistingRouteTableId='rtb-0db060097cafeff04'"
        )

        if ($isMainBranch) {
            $parameterOverrides += "StageName='prod'"
        }
        else {
            # In feature branch, reuse the follwing resources in the main branch:
        }

        # Join the parameter overrides into a single string
        $parameterOverridesString = $parameterOverrides -join " "

        # CAPABILITY_IAM: This capability allows AWS CloudFormation to create IAM resources (such as roles and policies) on your behalf
        sam deploy  --template-file $TEMPLATE_FILE --stack-name $STACK_NAME `
            --capabilities CAPABILITY_IAM `
            --fail-on-empty-changeset false `
            --parameter-overrides $parameterOverridesString
        if (($LASTEXITCODE -ne 0) -and ($LASTEXITCODE -ne 1)) {
            Write-Output "`nDeployment failed with exit code ${LASTEXITCODE}."
        }
        else {
            if ($LASTEXITCODE -eq 1) {
                Write-Output "`nDeployment completed with no changes to deploy. Stack $STACK_NAME is up to date."
            }
            else {
                Write-Output "`nDeployment completed successfully."
            }
        }
    }
    else {
        Write-Output "`nSAM build failed."
    }
}

# Calculate and display the elapsed time
$endTime = Get-Date
$elapsedTime = [math]::Round(($endTime - $startTime).TotalSeconds)
Write-Output "`n$(Get-Date -Format 'HH:mm:ss') Total elapsed time: $elapsedTime seconds."
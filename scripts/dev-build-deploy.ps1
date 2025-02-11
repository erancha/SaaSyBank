param (
    [bool]$prepareForFrontend
)

$originalLocation = Get-Location
try {
    Set-Location $PSScriptRoot
    $scriptName = Split-Path -Leaf $PSCommandPath

    . ./common/util/get-ElapsedTimeFormatted.ps1
    $startTime = Get-Date
    $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
    Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : $scriptName ..." -ForegroundColor White -BackgroundColor DarkBlue

    $commonConstants = ./common/constants.ps1
    Set-Variable -Name 'TEMPLATE_FILE' -Value "$PSScriptRoot/template.yaml" -Option Constant 

    $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
    Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Validating the cloudformation template .."
    sam validate --region $commonConstants.region --template-file $TEMPLATE_FILE --lint # | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() }
    if ($LASTEXITCODE -eq 0) {
        $skipFixedLambdaLayers = $true
        $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
        if ($skipFixedLambdaLayers) {
            Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Skipping postgresql layers !" -ForegroundColor Yellow -BackgroundColor DarkGreen
        }
        else {
            Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Preparing lambda layers .."
            $appFolder = (Split-Path $PSScriptRoot -Parent)
            $folderBeforeLayers = Get-Location

            Set-Location "${appFolder}/backend/layers/pg/nodejs/"
            npm install
            Set-Location ..
            Compress-Archive -Update -Path * -DestinationPath ../pg-layer.zip

            Set-Location $folderBeforeLayers
        }

        $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
        Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : sam build --template-file $TEMPLATE_FILE ..`n"
        sam build --region $commonConstants.region --template-file $TEMPLATE_FILE # > $null
        if ($LASTEXITCODE -eq 0) {
            $accountId = aws sts get-caller-identity --query "Account" --output text
            $ecrBankingRepositoryName = "banking-repository"

            $bankingServiceName = "banking-service"
            $bankingDockerResults = ./dev-build-push-docker-image.ps1 `
                -skipDockerBuildAndPush $false `
                -accountId $accountId `
                -ecrRepositoryName $ecrBankingRepositoryName `
                -serviceName $bankingServiceName

            $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
            Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Build completed. Deploying .."

            # Build the parameter overrides string dynamically
            $parameterOverrides = @(
                "ExistingVpcId='vpc-08016eb77e7ac9962'", # en-VPC
                "ExistingIgwId='igw-0fd7e050083dec0b9'", # sb-IGW
                "ExistingUserPoolId='eu-central-1_OHq1aZYju'",
                "ExistingCognitoDomain='ena-575491442067.auth.eu-central-1.amazoncognito.com'",
                # "ExistingNotesEncryptionKeyId='d0efc261-b71d-4f5c-9686-9876cc664243'",
                "ExistingElasticacheRedisClusterAddress='en-elasticache-redis-cluster.hz2zez.0001.euc1.cache.amazonaws.com:6379'",
                "BankingServiceName='$bankingServiceName'",
                "BankingTaskEcrImageUri='$($bankingDockerResults.ecrImageUri)'",
                "AllowS3PublicAccess=true"
            )

            if ($commonConstants.isMainBranch) {
                $parameterOverrides += "DeployForProduction='true'"
            }
            else {
                # In feature branch, reuse the following resources from the main branch's stack:
            }

            # Join the parameter overrides into a single string
            $parameterOverridesString = $parameterOverrides -join " "

            $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
            Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Starting a deployment, stack '$($commonConstants.stackName)' .."
            # CAPABILITY_IAM: This capability allows AWS CloudFormation to create IAM resources (such as roles and policies) on your behalf
            sam deploy --region $commonConstants.region --template-file $TEMPLATE_FILE --stack-name $commonConstants.stackName `
                --capabilities CAPABILITY_IAM `
                --fail-on-empty-changeset false `
                --resolve-s3 `
                --parameter-overrides $parameterOverridesString
            $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
            if (($LASTEXITCODE -ne 0) -and ($LASTEXITCODE -ne 1)) {
                Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Deployment failed with exit code ${LASTEXITCODE}."
            }
            else {
                if ($LASTEXITCODE -eq 1) {
                    Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Deployment completed with no changes to deploy. Stack '$($commonConstants.stackName)' is up to date."
                }
                else {
                    Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Deployment completed successfully." -ForegroundColor Green
                    ./update-postman-collection.ps1

                    $scriptPath = "./attach-sg-to-elasticache.ps1"
                    if (Test-Path $scriptPath) {
                        $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
                        Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Attaching SG to elasticache's SG ..."
                        & $scriptPath
                    }
                }

                if ($prepareForFrontend) {
                    ./common/update-app-config-dev.ps1
                }

                $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
                ./test-web-api.ps1 # -parallelCount 5 -iterationsCount 10        
            }
        }
        else {
            $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
            Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : SAM build failed."
        }
    }

    $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
    Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Completed $scriptName." -ForegroundColor Blue
}
finally {
    Set-Location $originalLocation
}
param (
    [string]$region,
    [datetime]$startTime = (Get-Date)
)

if (-not $region) {
    $commonConstants = ../constants.ps1
    $region = $commonConstants.region
}

$originalLocation = Get-Location
try {
    Set-Location $PSScriptRoot
    $scriptName = Split-Path -Leaf $PSCommandPath

    $savedStartTime = $startTime
    . ./get-ElapsedTimeFormatted.ps1
    $startTime = $savedStartTime
    $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
    Write-Host "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : $scriptName --region $region ..." -ForegroundColor White -BackgroundColor DarkBlue
    # to search, use: | Select-String string-to-search | Measure-Object

    #======= Define an array to hold the resource listing ========================================
    $nonDefaultResources = @()

    #======== List VPCs and filter out default VPCs =============================================
    $vpcs = aws ec2 describe-vpcs --region $region --query "Vpcs[?Tags[?Key=='Name']].{ID:VpcId, Name:Tags[?Key=='Name'].Value | [0], CidrBlock:CidrBlock}" --output json | ConvertFrom-Json
    foreach ($vpc in $vpcs) {
        if ($vpc.Name -and $vpc.Name -notlike "*!!! Default VPC !!!*") {
            $nonDefaultResources += "VPC:         $($vpc.Name.PadRight(20)) : $($vpc.ID.PadRight(25)) , CIDR: $($vpc.CidrBlock)"
        }
    }

    #======== List Subnets and filter out default subnets =======================================
    $subnets = aws ec2 describe-subnets --region $region --query "Subnets[?Tags[?Key=='Name']].{ID:SubnetId, Name:Tags[?Key=='Name'].Value | [0], VpcId:VpcId, CidrBlock:CidrBlock}" --output json | ConvertFrom-Json
    foreach ($subnet in $subnets) {
        if ($subnet.Name -and $subnet.Name -notlike "*Default*") {
            $nonDefaultResources += "Subnet:      $($subnet.Name.PadRight(20)) : $($subnet.ID.PadRight(25)) , VPC ID: $($subnet.VpcId) , CIDR: $($subnet.CidrBlock)"
        }
    }

    #======== List Route Tables and filter out default route tables ============================
    $routeTables = aws ec2 describe-route-tables --region $region --query "RouteTables[?Tags[?Key=='Name']].{ID:RouteTableId, Name:Tags[?Key=='Name'].Value | [0], VpcId:VpcId}" --output json | ConvertFrom-Json
    foreach ($rt in $routeTables) {
        if ($rt.Name -and $rt.Name -notlike "*!!! Default RTB !!!*") {
            $nonDefaultResources += "Route Table: $($rt.Name.PadRight(20)) : $($rt.ID.PadRight(25)) , VPC ID: $($rt.VpcId)"
        }
    }

    #======== List Elastic IPs ===================================================================
    $elasticIps = aws ec2 describe-addresses --region $region --query "Addresses[].{IP:PublicIp, AllocationId:AllocationId}" --output json | ConvertFrom-Json
    foreach ($eip in $elasticIps) {
        $nonDefaultResources += "Elastic IP: $($eip.IP) - Allocation ID: $($eip.AllocationId)"
    }

    #======== List VPC Endpoints ================================================================
    $interfaceEndpoints = aws ec2 describe-vpc-endpoints --region $region --query "VpcEndpoints[?VpcEndpointType=='Interface'].{ID:VpcEndpointId, ServiceName:ServiceName}" --output json | ConvertFrom-Json
    foreach ($interfaceEndpoint in $interfaceEndpoints) {
        $nonDefaultResources += "VPC Endpoint (Interface) : $($interfaceEndpoint.ID) , Service Name: $($interfaceEndpoint.ServiceName)"
    }

    $gatewayEndpoints = aws ec2 describe-vpc-endpoints --region $region --query "VpcEndpoints[?VpcEndpointType=='Gateway'].{ID:VpcEndpointId, ServiceName:ServiceName}" --output json | ConvertFrom-Json
    foreach ($gatewayEndpoint in $gatewayEndpoints) {
        $nonDefaultResources += "VPC Endpoint (Gateway)   : $($gatewayEndpoint.ID) , Service Name: $($gatewayEndpoint.ServiceName)"
    }

    #======== List Internet Gateways and filter out default IGWs ===========================
    $internetGateways = aws ec2 describe-internet-gateways --region $region --query "InternetGateways[?Tags[?Key=='Name']].{ID:InternetGatewayId, VpcId:Attachments[0].VpcId, Name:Tags[?Key=='Name'].Value | [0]}" --output json | ConvertFrom-Json
    foreach ($igw in $internetGateways) {
        if ($igw.Name -and $igw.Name -notlike "*!!! Default IGW !!!*") {
            $nonDefaultResources += "Internet Gateway: $($igw.Name.PadRight(10)) ($($igw.ID)) , VPC ID: $($igw.VpcId)"
        }
    }

    #======== List Security Groups ==============================================================
    $securityGroups = aws ec2 describe-security-groups --region $region --query "SecurityGroups[?GroupName!='default'].{ID:GroupId,Name:GroupName}" --output json | ConvertFrom-Json
    foreach ($sg in $securityGroups) {
        $nonDefaultResources += "Security Group: $($sg.Name.PadRight(40)) : $($sg.ID)"
    }

    #======== List Network ACLs =================================================================
    $nacls = aws ec2 describe-network-acls --region $region --query "NetworkAcls[?IsDefault=='false'].{ID:NetworkAclId}" --output json | ConvertFrom-Json
    foreach ($acl in $nacls) {
        $nonDefaultResources += "Network ACL: $($acl.ID)"
    }

    #======== List IAM Policies ==================================================================
    $policies = aws iam list-policies --region $region --query "Policies[?DefaultVersionId==null].{ID:PolicyId,Name:PolicyName}" --output json | ConvertFrom-Json
    foreach ($policy in $policies) {
        $nonDefaultResources += "IAM Policy: $($policy.Name.PadRight(20)) : $($policy.ID)"
    }

    #======== List IAM Roles =====================================================================
    $roles = aws iam list-roles --region $region --query "Roles[?RoleName!='default'].{Name:RoleName,ID:RoleId}" --output json | ConvertFrom-Json
    foreach ($role in $roles) {
        if (-not $role.Name.StartsWith("AWS") -and -not $role.Name.StartsWith("ec2-")) {
            $nonDefaultResources += "IAM Role: $($role.Name.PadRight(65)) : $($role.ID)"
        }
    }

    #======== List Load Balancers ================================================================
    $loadBalancers = aws elbv2 describe-load-balancers --region $region --query "LoadBalancers[?Scheme=='internal'].{ID:LoadBalancerArn,Name:LoadBalancerName}" --output json | ConvertFrom-Json
    foreach ($lb in $loadBalancers) {
        $nonDefaultResources += "Load Balancer: $($lb.Name.PadRight(20)) : $($lb.ID)"
    }

    #======== List all my ECS clusters, services, tasks and containers ===========================
    $clusters = aws ecs list-clusters --region $region | ConvertFrom-Json
    $clusterArns = $clusters.clusterArns
    foreach ($cluster in $clusterArns) {
        # List all services in the cluster
        $services = aws ecs list-services --cluster $cluster --region $region | ConvertFrom-Json
        foreach ($service in $services.serviceArns) {
            # Get the service details to find the running tasks
            $serviceDetails = aws ecs describe-services --cluster $cluster --services $service --region $region | ConvertFrom-Json
            $taskDefinition = $serviceDetails.services[0].taskDefinition

            # List tasks for the service
            $tasks = aws ecs list-tasks --cluster $cluster --service-name $service --region $region | ConvertFrom-Json
            if ($tasks.taskArns.Count -gt 0) {
                $taskDetails = aws ecs describe-tasks --cluster $cluster --tasks $tasks.taskArns --region $region | ConvertFrom-Json
                foreach ($task in $taskDetails.tasks) {
                    foreach ($container in $task.containers) {
                        # Create an object to hold the container status
                        $containerStatus = [PSCustomObject]@{
                            ClusterName      = $cluster.Split(':')[-1] # Get last part of ARN for readability
                            ServiceName      = $service.Split(':')[-1] # Get last part of ARN for readability
                            TaskArn          = $task.taskArn.Split('/')[-1] # Get last part of ARN for readability
                            ContainerName    = $container.name
                            ContainerStatus  = $container.lastStatus
                        }
                        $nonDefaultResources += "ECS Container: Cluster=$($containerStatus.ClusterName), Service=$($containerStatus.ServiceName), Task=$($containerStatus.TaskArn), Name=$($containerStatus.ContainerName), Status=$($containerStatus.ContainerStatus)"
                    }
                }
            }
        }
    }

    #======== List EC2 Instances ==================================================================
    $ec2Instances = aws ec2 describe-instances --region $region --query "Reservations[*].Instances[?Tags[?Key=='Name']].{ID:InstanceId,Name:Tags[?Key=='Name'][0].Value}" --output json | ConvertFrom-Json
    foreach ($instance in $ec2Instances) {
        if ($instance.Name -ne "Default") {
            $nonDefaultResources += "EC2 Instance: $($instance.Name.PadRight(25)) : $($instance.ID)"
        }
    }

    #======== List RDS Instances ==================================================================
    $rdsInstances = aws rds describe-db-instances --region $region --query "DBInstances[?DBInstanceIdentifier!='default'].{ID:DBInstanceIdentifier}" --output json | ConvertFrom-Json
    foreach ($rds in $rdsInstances) {
        $nonDefaultResources += "RDS Instance: $($rds.ID)"
    }

    #======== List DynamoDB Tables ================================================================
    $dynamoDBTables = aws dynamodb list-tables --region $region --query "TableNames[?contains(@,'default')=='false']" --output json | ConvertFrom-Json
    foreach ($table in $dynamoDBTables) {
        $nonDefaultResources += "DynamoDB Table: $($table)"
    }

    #======== List Secrets Manager Secrets ==========================================================
    $secrets = aws secretsmanager list-secrets --region $region --query "SecretList[?Name!='default'].{ID: ARN, Name: Name}" --output json | ConvertFrom-Json
    foreach ($secret in $secrets) {
        $nonDefaultResources += "Secret: $($secret.Name.PadRight(25)) : $($secret.ID)"
    }

    #======== List KMS keys =========================================================================
    $kmsKeys = aws kms list-keys --region $region --output json | ConvertFrom-Json
    $aliases = aws kms list-aliases --region $region --output json | ConvertFrom-Json

    # Create a hashtable for quick access to key aliases
    $keyAliases = @{}
    foreach ($alias in $aliases.Aliases) {
        if ($alias.TargetKeyId) {
            $keyAliases[$alias.TargetKeyId] = $alias.AliasName
        }
    }

    # Loop through each key and get its details
    foreach ($key in $kmsKeys.Keys) {
        # Describe the key to get its metadata
        $keyDetails = aws kms describe-key --key-id $key.KeyId --region $region --output json | ConvertFrom-Json
    
        # Check if the key is customer managed and enabled
        if ($keyDetails.KeyMetadata.KeyState -eq 'Enabled' -and $keyDetails.KeyMetadata.KeyManager -eq 'CUSTOMER') {
            # Retrieve the alias name if it exists
            $aliasName = if ($keyAliases.ContainsKey($key.KeyId)) { $keyAliases[$key.KeyId] } else { 'No Alias' }
            $nonDefaultResources += "KMS Key: $aliasName : $($key.KeyId) $($keyDetails.KeyMetadata.CreationDate)"
        }
    }

    #======== List SQS Queues =======================================================================
    $sqsQueues = aws sqs list-queues --region $region --query "QueueUrls[?!contains(@, 'default')].{URL: @}" --output json | ConvertFrom-Json
    foreach ($queueUrl in $sqsQueues) {
        $nonDefaultResources += "SQS Queue: $($queueUrl.URL)"
    }

    #======== List ElastiCache Clusters =============================================================
    $elasticacheClusters = aws elasticache describe-cache-clusters --region $region --query "CacheClusters[?CacheClusterStatus=='available'].{ID:CacheClusterId}" --output json | ConvertFrom-Json
    foreach ($cluster in $elasticacheClusters) {
        $nonDefaultResources += "ElastiCache Cluster: $($cluster.ID)"
    }

    #======== List API Gateways =====================================================================
    $apiGateways = aws apigateway get-rest-apis --region $region --query "items[?name!='default'].{ID:id,Name:name}" --output json | ConvertFrom-Json
    foreach ($api in $apiGateways) {
        $nonDefaultResources += "REST API Gateway     : $($api.Name.PadRight(20)) : $($api.ID)"
    }
    $webSocketApis = aws apigatewayv2 get-apis --region $region --query "Items[?Name!='default'].{ID:ApiId,Name:Name}" --output json | ConvertFrom-Json
    foreach ($api in $webSocketApis) {
        $nonDefaultResources += "WebSocket API Gateway: $($api.Name.PadRight(20)) : $($api.ID)"
    }

    #======== List Cognito User and Identity Pools ==================================================
    $cognitoPools = aws cognito-idp list-user-pools --max-results 60 --region $region --query "UserPools[?Name!='default'].{ID:Id,Name:Name}" --output json | ConvertFrom-Json
    foreach ($pool in $cognitoPools) {
        # Get the domain for each user pool
        $domainName = aws cognito-idp describe-user-pool --user-pool-id $pool.ID --region $region --query "UserPool.Domain" --output json | ConvertFrom-Json
        $nonDefaultResources += "Cognito User Pool    : $($pool.Name.PadRight(20)) : $($pool.ID) , domain: https://$domainName.auth.eu-central-1.amazoncognito.com"
    }

    $identityPools = aws cognito-identity list-identity-pools --max-results 60 --region $region --query "IdentityPools[?IdentityPoolName!='default'].{ID:IdentityPoolId,Name:IdentityPoolName}" --output json | ConvertFrom-Json
    foreach ($pool in $identityPools) {
        $nonDefaultResources += "Cognito Identity Pool: $($pool.Name.PadRight(20)) : $($pool.ID)"
    }

    # #======== List S3 Buckets =======================================================================
    $s3Buckets = aws s3api list-buckets --region $region --query "Buckets[].{Name:Name}" --output json | ConvertFrom-Json
    foreach ($bucket in $s3Buckets) {
        if ($bucket.Name -ne 'default' -and -not ($bucket.Name -like 'aws-sam-cli-managed-default*')) {
            $nonDefaultResources += "S3 Bucket: $($bucket.Name)"
        }
    }

    #======== List CloudFront Distributions =========================================================
    $cloudFrontDistributions = aws cloudfront list-distributions --region $region --query "DistributionList.Items[?Id!='default'].{ID:Id, Origins:Origins.Items[].{DomainName:DomainName}}" --output json | ConvertFrom-Json
    foreach ($distribution in $cloudFrontDistributions) {
        $distributionId = $distribution.ID
        $origins = $distribution.Origins

        if ($null -eq $origins -or $origins.Count -eq 0) {
            $nonDefaultResources += "CloudFront Distribution , no origins found , $distributionId"
        }
        else {
            foreach ($origin in $origins) {
                $nonDefaultResources += "CloudFront Distribution, origins: $($origin.DomainName.PadRight(60)) , $distributionId"
            }
        }
    }

    #======== List Lambda Functions and layers ======================================================
    $lambdaFunctions = aws lambda list-functions --region $region --query "Functions[?FunctionName!='default'].{Name:FunctionName,ARN:FunctionArn}" --output json | ConvertFrom-Json
    foreach ($function in $lambdaFunctions) {
        $nonDefaultResources += "Lambda Function: $($function.Name)"
    }

    $lambdaLayers = aws lambda list-layers --region $region --query "Layers[?LayerName!='default'].{ARN:LayerArn,Name:LayerName}" --output json | ConvertFrom-Json
    foreach ($layer in $lambdaLayers) {
        $nonDefaultResources += "Lambda Layer: $($layer.Name)"
    }

    #======== List CloudFormation Stacks ============================================================
    $cloudFormationStacks = aws cloudformation list-stacks --region $region --query "StackSummaries[?StackStatus!='DELETE_COMPLETE'].{ID:StackId,Name:StackName}" --output json | ConvertFrom-Json
    foreach ($stack in $cloudFormationStacks) {
        $nonDefaultResources += "CloudFormation Stack '$($stack.Name)'"
    }

    #======== List CloudWatch Dashboards ============================================================
    $cloudWatchDashboards = aws cloudwatch list-dashboards --region $region --query "DashboardEntries[?DashboardName!='default'].{Name:DashboardName}" --output json | ConvertFrom-Json
    foreach ($dashboard in $cloudWatchDashboards) {
        $nonDefaultResources += "CloudWatch Dashboard: $($dashboard.Name)"
    }

    #===========================================================================================================
    # Output the non-default resources in sorted order
    $nonDefaultResources | Sort-Object | ForEach-Object -Begin { $index = 1 } -Process {
        $paddedIndex = "{0,3}" -f $index 
        Write-Output ("#{0} : {1}" -f $paddedIndex, $_)
        $index++
    }

    $formattedElapsedTime = Get-ElapsedTimeFormatted -startTime $startTime
    Write-Output "`n$(Get-Date -Format 'HH:mm:ss'), elapsed $formattedElapsedTime : Completed $scriptName." -ForegroundColor Blue
}
finally {
    Set-Location $originalLocation
}
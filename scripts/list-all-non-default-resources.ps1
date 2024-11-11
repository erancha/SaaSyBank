Write-Host " $(Split-Path -Leaf $PSCommandPath) ..." -ForegroundColor White -BackgroundColor DarkBlue

# Define an array to hold the resource listing
$nonDefaultResources = @()

# Check EC2 Instances
$ec2Instances = aws ec2 describe-instances --query "Reservations[*].Instances[?Tags[?Key=='Name']].{ID:InstanceId,Name:Tags[?Key=='Name'][0].Value}" --output json | ConvertFrom-Json
foreach ($instance in $ec2Instances) {
    if ($instance.Name -ne "Default") {
        $nonDefaultResources += "EC2 Instance: $($instance.ID) - Name: $($instance.Name)"
    }
}

# Check VPCs and filter out default VPCs
$vpcs = aws ec2 describe-vpcs --query "Vpcs[?Tags[?Key=='Name']].{ID:VpcId, Name:Tags[?Key=='Name'].Value | [0], CidrBlock:CidrBlock}" --output json | ConvertFrom-Json
foreach ($vpc in $vpcs) {
    if ($vpc.Name -and $vpc.Name -notlike "*!!! Default VPC !!!*") {
        $nonDefaultResources += "VPC: $($vpc.ID) - Name: $($vpc.Name) - CIDR: $($vpc.CidrBlock)"
    }
}

# Check Subnets and filter out default subnets
$subnets = aws ec2 describe-subnets --query "Subnets[?Tags[?Key=='Name']].{ID:SubnetId, Name:Tags[?Key=='Name'].Value | [0], VpcId:VpcId, CidrBlock:CidrBlock}" --output json | ConvertFrom-Json
foreach ($subnet in $subnets) {
    if ($subnet.Name -and $subnet.Name -notlike "*Default*") {
        $nonDefaultResources += "Subnet: $($subnet.ID) - Name: $($subnet.Name) - VPC ID: $($subnet.VpcId) - CIDR: $($subnet.CidrBlock)"
    }
}

# Check Route Tables and filter out default route tables
$routeTables = aws ec2 describe-route-tables --query "RouteTables[?Tags[?Key=='Name']].{ID:RouteTableId, Name:Tags[?Key=='Name'].Value | [0], VpcId:VpcId}" --output json | ConvertFrom-Json
foreach ($rt in $routeTables) {
    if ($rt.Name -and $rt.Name -notlike "*!!! Default RTB !!!*") {
        $nonDefaultResources += "Route Table: $($rt.ID) - Name: $($rt.Name) - VPC ID: $($rt.VpcId)"
    }
}

# Check Elastic IPs
$elasticIps = aws ec2 describe-addresses --query "Addresses[].{IP:PublicIp, AllocationId:AllocationId}" --output json | ConvertFrom-Json
foreach ($eip in $elasticIps) {
    $nonDefaultResources += "Elastic IP: $($eip.IP) - Allocation ID: $($eip.AllocationId)"
}

# Check Interface VPC Endpoints
$interfaceEndpoints = aws ec2 describe-vpc-endpoints --query "VpcEndpoints[?VpcEndpointType=='Interface'].{ID:VpcEndpointId, ServiceName:ServiceName}" --output json | ConvertFrom-Json
foreach ($interfaceEndpoint in $interfaceEndpoints) {
    $nonDefaultResources += "Interface VPC Endpoint: $($interfaceEndpoint.ID) - Service Name: $($interfaceEndpoint.ServiceName)"
}

# Check Gateway VPC Endpoints
$gatewayEndpoints = aws ec2 describe-vpc-endpoints --query "VpcEndpoints[?VpcEndpointType=='Gateway'].{ID:VpcEndpointId, ServiceName:ServiceName}" --output json | ConvertFrom-Json
foreach ($gatewayEndpoint in $gatewayEndpoints) {
    $nonDefaultResources += "Gateway VPC Endpoint: $($gatewayEndpoint.ID) - Service Name: $($gatewayEndpoint.ServiceName)"
}

# Check Internet Gateways and filter out default IGWs
$internetGateways = aws ec2 describe-internet-gateways --query "InternetGateways[?Tags[?Key=='Name']].{ID:InternetGatewayId, VpcId:Attachments[0].VpcId, Name:Tags[?Key=='Name'].Value | [0]}" --output json | ConvertFrom-Json
foreach ($igw in $internetGateways) {
    if ($igw.Name -and $igw.Name -notlike "*!!! Default IGW !!!*") {
        $nonDefaultResources += "Internet Gateway: $($igw.ID) - VPC ID: $($igw.VpcId) - Name: $($igw.Name)"
    }
}

# Check Security Groups
$securityGroups = aws ec2 describe-security-groups --query "SecurityGroups[?GroupName!='default'].{ID:GroupId,Name:GroupName}" --output json | ConvertFrom-Json
foreach ($sg in $securityGroups) {
    $nonDefaultResources += "Security Group: $($sg.ID) - Name: $($sg.Name)"
}

# Check Network ACLs
$nacls = aws ec2 describe-network-acls --query "NetworkAcls[?IsDefault=='false'].{ID:NetworkAclId}" --output json | ConvertFrom-Json
foreach ($acl in $nacls) {
    $nonDefaultResources += "Network ACL: $($acl.ID)"
}

# Check IAM Policies
$policies = aws iam list-policies --query "Policies[?DefaultVersionId==null].{ID:PolicyId,Name:PolicyName}" --output json | ConvertFrom-Json
foreach ($policy in $policies) {
    $nonDefaultResources += "IAM Policy: $($policy.ID) - Name: $($policy.Name)"
}

# Check IAM Roles
$roles = aws iam list-roles --query "Roles[?RoleName!='default'].{Name:RoleName,ID:RoleId}" --output json | ConvertFrom-Json
foreach ($role in $roles) {
    if (-not $role.Name.StartsWith("AWS") -and -not $role.Name.StartsWith("ec2-")) {
        $nonDefaultResources += "IAM Role: $($role.ID) - Name: $($role.Name)"
    }
}

# Check Load Balancers
$loadBalancers = aws elbv2 describe-load-balancers --query "LoadBalancers[?Scheme=='internal'].{ID:LoadBalancerArn,Name:LoadBalancerName}" --output json | ConvertFrom-Json
foreach ($lb in $loadBalancers) {
    $nonDefaultResources += "Load Balancer: $($lb.ID) - Name: $($lb.Name)"
}

# Check RDS Instances
$rdsInstances = aws rds describe-db-instances --query "DBInstances[?DBInstanceIdentifier!='default'].{ID:DBInstanceIdentifier}" --output json | ConvertFrom-Json
foreach ($rds in $rdsInstances) {
    $nonDefaultResources += "RDS Instance: $($rds.ID)"
}

# Check DynamoDB Tables
$dynamoDBTables = aws dynamodb list-tables --query "TableNames[?contains(@,'default')=='false']" --output json | ConvertFrom-Json
foreach ($table in $dynamoDBTables) {
    $nonDefaultResources += "DynamoDB Table: $($table)"
}

# Check Secrets Manager Secrets
$secrets = aws secretsmanager list-secrets --query "SecretList[?Name!='default'].{ID: ARN, Name: Name}" --output json | ConvertFrom-Json
foreach ($secret in $secrets) {
    $nonDefaultResources += "Secret: $($secret.ID) - Name: $($secret.Name)"
}

$kmsKeys = aws kms list-keys --output json | ConvertFrom-Json
$aliases = aws kms list-aliases --output json | ConvertFrom-Json

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
    $keyDetails = aws kms describe-key --key-id $key.KeyId --output json | ConvertFrom-Json
    
    # Check if the key is customer managed and enabled
    if ($keyDetails.KeyMetadata.KeyState -eq 'Enabled' -and $keyDetails.KeyMetadata.KeyManager -eq 'CUSTOMER') {
        # Retrieve the alias name if it exists
        $aliasName = if ($keyAliases.ContainsKey($key.KeyId)) { $keyAliases[$key.KeyId] } else { 'No Alias' }
        $nonDefaultResources += "KMS Key: $($key.KeyId) - $aliasName : $($keyDetails.KeyMetadata.CreationDate)"
    }
}

# Check SQS Queues
$sqsQueues = aws sqs list-queues --query "QueueUrls[?!contains(@, 'default')].{URL: @}" --output json | ConvertFrom-Json
foreach ($queueUrl in $sqsQueues) {
    $nonDefaultResources += "SQS Queue: $($queueUrl.URL)"
}

# Check ElastiCache Clusters
$elasticacheClusters = aws elasticache describe-cache-clusters --query "CacheClusters[?CacheClusterStatus=='available'].{ID:CacheClusterId}" --output json | ConvertFrom-Json
foreach ($cluster in $elasticacheClusters) {
    $nonDefaultResources += "ElastiCache Cluster: $($cluster.ID)"
}

# Check API Gateways
$apiGateways = aws apigateway get-rest-apis --query "items[?name!='default'].{ID:id,Name:name}" --output json | ConvertFrom-Json
foreach ($api in $apiGateways) {
    $nonDefaultResources += "API Gateway: $($api.ID) - Name: $($api.Name)"
}
$webSocketApis = aws apigatewayv2 get-apis --query "Items[?Name!='default'].{ID:ApiId,Name:Name}" --output json | ConvertFrom-Json
foreach ($api in $webSocketApis) {
    $nonDefaultResources += "WebSocket API: $($api.ID) - Name: $($api.Name)"
}
# Check Cognito User and Identity Pools
$cognitoPools = aws cognito-idp list-user-pools --max-results 60 --query "UserPools[?Name!='default'].{ID:Id,Name:Name}" --output json | ConvertFrom-Json
foreach ($pool in $cognitoPools) {
    $nonDefaultResources += "Cognito User Pool: $($pool.ID) - Name: $($pool.Name)"
}
$identityPools = aws cognito-identity list-identity-pools --max-results 60 --query "IdentityPools[?IdentityPoolName!='default'].{ID:IdentityPoolId,Name:IdentityPoolName}" --output json | ConvertFrom-Json
foreach ($pool in $identityPools) {
    $nonDefaultResources += "Identity Pool: $($pool.ID) - Name: $($pool.Name)"
}

# Check S3 Buckets
$s3Buckets = aws s3api list-buckets --query "Buckets[?Name!='default'].{Name:Name}" --output json | ConvertFrom-Json
foreach ($bucket in $s3Buckets) {
    $nonDefaultResources += "S3 Bucket: $($bucket.Name)"
}

# Check CloudFront Distributions
$cloudFrontDistributions = aws cloudfront list-distributions --query "DistributionList.Items[?Id!='default'].{ID:Id}" --output json | ConvertFrom-Json
foreach ($distribution in $cloudFrontDistributions) {
    $nonDefaultResources += "CloudFront Distribution: $($distribution.ID)"
}

# Check Lambda Functions
$lambdaFunctions = aws lambda list-functions --query "Functions[?FunctionName!='default'].{Name:FunctionName,ARN:FunctionArn}" --output json | ConvertFrom-Json
foreach ($function in $lambdaFunctions) {
    $nonDefaultResources += "Lambda Function: $($function.ARN) - Name: $($function.Name)"
}

# Output the non-default resources
$nonDefaultResources | ForEach-Object -Begin { $index = 1 } -Process {
    $paddedIndex = "{0,2}" -f $index  # Right-align with 2 spaces
    Write-Host ("#{0} : {1}" -f $paddedIndex, $_)
    $index++
}

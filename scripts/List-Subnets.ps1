param (
    [string]$region
)

# ===================================================================
# List all subnets, and for each subnet its VPC name and subnet name:
# ===================================================================
# Create a hashtable to map VPC IDs to VPC names
$vpcs = aws ec2 describe-vpcs --region $region | ConvertFrom-Json
$vpcMap = @{}
foreach ($vpc in $vpcs.Vpcs) {
    $vpcMap[$vpc.VpcId] = $vpc.Tags | Where-Object { $_.Key -eq "Name" } | Select-Object -ExpandProperty Value
}

# Fetch all subnets in the region and initialize an array to hold subnet information
$subnets = aws ec2 describe-subnets --region $region | ConvertFrom-Json
$subnetInfo = @()

# Output the subnet details along with the corresponding VPC name
foreach ($subnet in $subnets.Subnets) {
    $vpcName = if ($vpcMap[$subnet.VpcId]) { $vpcMap[$subnet.VpcId] } else { "No Name Tag" }

    # Extracting the Subnet Name from Tags
    $subnetName = $subnet.Tags | Where-Object { $_.Key -eq "Name" } | Select-Object -ExpandProperty Value -ErrorAction SilentlyContinue
    if (-not $subnetName) { $subnetName = "No Name Tag" }

    # Create an object to hold the subnet information
    $subnetInfo += [PSCustomObject]@{
        SubnetId   = $subnet.SubnetId
        SubnetName = $subnetName
        SubnetCidr = $subnet.CidrBlock
        VpcId      = $subnet.VpcId
        VpcName    = $vpcName
    }
}

$sortedSubnetInfo = $subnetInfo | Sort-Object SubnetName
$sortedSubnetInfo | Format-Table -AutoSize

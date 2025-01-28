param (
    [string]$region
)

# =======================================================
# List all my ECS clusters, services, tasks and containers:
# =======================================================
$clusters = aws ecs list-clusters --region $region | ConvertFrom-Json
$clusterArns = $clusters.clusterArns
$containerStatuses = @()
foreach ($cluster in $clusterArns) {
    # List all services in the cluster
    $services = aws ecs list-services --cluster $cluster --region $region | ConvertFrom-Json

    # Iterate over each service
    foreach ($service in $services.serviceArns) {
        # Get the service details to find the running tasks
        $serviceDetails = aws ecs describe-services --cluster $cluster --services $service --region $region | ConvertFrom-Json

        # Get the task definition for the service
        $taskDefinition = $serviceDetails.services[0].taskDefinition

        # List tasks for the service
        $tasks = aws ecs list-tasks --cluster $cluster --service-name $service --region $region | ConvertFrom-Json

        # If there are tasks running, describe them
        if ($tasks.taskArns.Count -gt 0) {
            $taskDetails = aws ecs describe-tasks --cluster $cluster --tasks $tasks.taskArns --region $region | ConvertFrom-Json

            # Iterate over each task to get container details
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
                    $containerStatuses += $containerStatus
                }
            }
        }
    }
}

# Output the container statuses in a more readable format
$containerStatuses | Format-Table -Property ClusterName, ServiceName, TaskArn, ContainerName, ContainerStatus -AutoSize

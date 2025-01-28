# High-Level Design (HLD) Document for SaaSyBank

## Overview

**Functionality**: Account creation, balance inquiries, deposits, withdrawals, and money transfers.  
**Deployment**: Single-tenant or multi-tenant SaaS.  
**Initial Users Count**: ~1,000 (rapid growth expected), with ~50 concurrent users.  
**SLA**:

- **Uptime Guarantee**:
  At least 99.9% uptime (this translates to about 8.76 hours of downtime per year).
- **Response Time**:
  Responsiveness of less than 5 seconds for API calls.

**Frontend**: N/A (a Postman collection is provided for REST API).

<small>**Note**: This is a deployable AWS architecture exercise.</small>

---

## Architecture Diagram

![Architecture Diagram](https://lucid.app/publicSegments/view/69c70e24-cb99-4f28-8cf9-59329f1bc55b/image.jpeg)

---

## Components

### 1. **Frontend**

- **Status**: Not available in Phase 1
- **Deliverable**: Postman collection

### 2. **Backend Architecture on AWS**

#### 2.1 **Application Load Balancer (ALB)**

- **Purpose**: Distribute API requests
- **SLA**: Auto-scales for high availability

#### 2.2 **ECS with Fargate**

- **Objective**: Run containerized applications for banking functionalities
- **Network**: Deployed in private subnets

#### 2.3 **RDS with PostgreSQL**

- **Purpose**: Store accounts data
- **Network**: Managed RDS instance in private subnets
- **Backup**: Automated backups enabled

#### 2.4 **SQS**

- **Purpose**: To separate the processes of transaction encryption and saving from the core online banking functionalities managed by ECS. The ECS Fargate task is designed to handle only the immediate updating of transaction details in RDS, such as tenant ID, account ID, amount, and target account ID (for transfers). This allows for a quicker response time, as the ECS task can return the result of the transaction immediately without being burdened by the additional overhead of encryption and saving, which will be processed asynchronously through SQS.

### 3. **Deployment Flexibility**

- **Modes**: Single-tenant (isolated environments) and multi-tenant (shared environments with data segregation)
- **CloudFormation Parameter**: To specify deployment type

### 4. **Future Enhancements**

#### 4.1 **Cognito**

- **Purpose**: User authentication and management

#### 4.2 **CloudFront**

- **Purpose**: CDN for improved performance

#### 4.3 **ElastiCache (Redis)**

- **Purpose**: In-memory caching to enhance response times
- **Usage**: Cache frequently accessed data

---

## Security Considerations

- **Network**: Use private subnets for ECS and RDS
- **Data**: Enable encryption at rest and in transit
- **Authentication**: Cognito for user management
- **Access Control**: Role-based policies for AWS resources

---

## Performance Metrics

- **Response Time**: API calls < 5 seconds
- **Scalability**: Architecture auto-scales for growing user base

---

## Monitoring and Logging

- **CloudWatch**: Monitor performance and log activities
- **Health Checks**: Configure ALB health checks

---

## Summary

SaaSyBank's architecture utilizes AWS services for a scalable, secure, and highly available backend. It supports both single-tenant and multi-tenant deployments, focusing on a robust backend in the initial phase, with plans for future enhancements to improve responsiveness and performance.

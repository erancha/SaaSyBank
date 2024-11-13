# High-Level Design (HLD) Document for SaaSyBank

## Overview

**Application Name**: SaasyBank.  
**Functionality**: Account creation, balance inquiries, deposits, withdrawals, and money transfers.  
**Deployment**: Single-tenant or multi-tenant SaaS.  
**Initial Users Count**: 1,000 (rapid growth expected), with ~50 concurrent users.  
**SLA**:
- **Uptime Guarantee**:
  At least 99.9% uptime (this translates to about 8.76 hours of downtime per year).
- **Response Time**:
  Responsiveness of less than 5 seconds for API calls.
**Frontend**: N/A (a Postman collection is provided for the REST API).

<small>**Note**: This is a deployable AWS architecture exercise.</small>

---

## Architecture Diagram

![SaasyBank Architecture Diagram](https://lucid.app/publicSegments/view/bb6c7c85-d136-4819-8398-8f4626df6163/image.jpeg)

---

## Components

### 1. **Frontend**

- **Status**: Not available in Phase 1
- **Delivery**: Postman collection

### 2. **Backend Architecture on AWS**

#### 2.1 **Application Load Balancer (ALB)**

- **Purpose**: Distribute API requests
- **SLA**: Auto-scales for high availability

#### 2.2 **Amazon Cognito**

- **Purpose**: User authentication and management
- **Schedule**: Phase 2

#### 2.3 **ECS with Fargate**

- **Objective**: Run containerized applications for banking functionalities
- **Deployment**: Managed via Amazon ECS
- **Network**: Deployed in private subnets

#### 2.4 **Amazon RDS with PostgreSQL**

- **Purpose**: Store accounts data
- **Deployment**: Managed RDS instance in private subnets
- **Backup**: Automated backups enabled

### 3. **Deployment Flexibility**

- **Modes**: Single-tenant (isolated environments) and multi-tenant (shared environments with data segregation)
- **CloudFormation Parameter**: To specify deployment type

### 4. **Future Enhancements**

#### 4.1 **Amazon CloudFront**

- **Purpose**: CDN for improved performance
- **Schedule**: Phase 2

#### 4.2 **Amazon ElastiCache (Redis)**

- **Purpose**: In-memory caching to enhance response times
- **Usage**: Cache frequently accessed data (e.g., user sessions)
- **Schedule**: Phase 2

---

## Security Considerations

- **Network**: Use private subnets for ECS and RDS
- **Data**: Enable encryption at rest and in transit
- **Authentication**: Amazon Cognito for user management
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

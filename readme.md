# High-Level Design (HLD) Document for SaasyBank

## Overview

**Application Name**: SaasyBank  
**Functionality**: Account creation, balance inquiries, deposits, withdrawals, and money transfers  
**Deployment**: Single-tenant and multi-tenant SaaS  
**Initial Users Count**: 1,000 (rapid growth expected), with ~50 concurrent users
**SLA**: Highest possible (TBD)  
**Responsiveness**: < 5 seconds response time  
**Frontend**: None in Phase 1 (Postman JSON file for API testing)

---

## Architecture Diagram

![SaasyBank Architecture Diagram](https://lucid.app/publicSegments/view/d1c61e72-64e2-41f4-ae11-c6661a6bf5e9/image.jpeg)

---

## Components

### 1. **Frontend**

- **Status**: Not available in Phase 1
- **Delivery**: Postman JSON file

### 2. **Backend Architecture on AWS**

#### 2.1 **Application Load Balancer (ALB)**

- **Purpose**: Distribute API requests
- **SLA**: Auto-scales for high availability

#### 2.2 **Amazon Cognito**

- **Purpose**: User authentication and management

#### 2.3 **ECS with Fargate**

- **Objective**: Run containerized applications for banking functionalities
- **Deployment**: Managed via Amazon ECS
- **Network**: Deployed in a private subnet

#### 2.4 **Amazon RDS with PostgreSQL**

- **Purpose**: Store user and transaction data
- **Deployment**: Managed RDS instance in a private subnet
- **Backup**: Automated backups enabled

### 3. **Deployment Flexibility**

- **Modes**: Single-tenant (isolated environments) and multi-tenant (shared environments with data segregation)
- **CloudFormation Parameter**: To specify deployment type

### 4. **Future Enhancements**

#### 4.1 **Amazon CloudFront**

- **Purpose**: CDN for improved performance

#### 4.2 **Amazon ElastiCache (Redis)**

- **Purpose**: In-memory caching to enhance response times
- **Usage**: Cache frequently accessed data (e.g., user sessions)

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

SaasyBank's architecture utilizes AWS services for a scalable, secure, and highly available backend. It supports both single-tenant and multi-tenant deployments, focusing on a robust backend in the initial phase, with plans for future enhancements to improve responsiveness and performance.

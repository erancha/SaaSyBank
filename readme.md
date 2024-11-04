# High-Level Design (HLD) Document for SaasyBank

## Overview

**Application Name**: SaasyBank.  
**Functionality**: Deposit, withdraw, and transfer money between accounts.  
**Deployable** as both a **single-tenant** and a **multi-tenant** SaaS application.  
**Initial Users Count**: 1,000 (expected to grow rapidly).  
**Service Level Agreement (SLA)**: Highest possible (TBD).  
**Responsiveness**: High (end users should receive a response within 5 seconds or less).  
**Frontend**: None in Phase 1 (Expected delivery: Postman JSON file).

---

## Architecture Diagram

![SaasyBank Architecture Diagram](link_to_your_diagram.png) <!-- This is a placeholder. Replace with actual image link. -->

---

## Components

### 1. **Frontend**

- **Status**: None in Phase 1.
- **Delivery**: Postman JSON file for API testing.

### 2. **Backend Architecture**

The backend will be hosted on AWS with the following components:

#### 2.1 **Application Load Balancer (ALB)**

- **Purpose**: Distribute incoming API requests to the backend services.
- **SLA**: Automatically scales to handle incoming traffic, ensuring high availability.

#### 2.2 **Amazon Cognito**

- **Purpose**: User authentication and management.
- **Functionality**: Secure user sign-up, sign-in, and access control.

#### 2.3 **Kubernetes with Fargate Launch Type**

- **Purpose**: Run containerized applications for deposit, withdraw, and transfer functionalities.
- **Deployment**: Managed using Amazon EKS (Elastic Kubernetes Service).
- **Network**: Deployed in a private subnet for enhanced security.

#### 2.4 **Amazon RDS with PostgreSQL**

- **Purpose**: Store user account information and transaction details.
- **Deployment**: Managed RDS instance in a private subnet.
- **Backup and Recovery**: Automated backups enabled for data durability.

### 3. **Deployment Flexibility**

- The application will be deployable as both a **single-tenant** and a **multi-tenant** SaaS application.
- **CloudFormation Template Parameter**: A parameter will be included in the CloudFormation template to specify the deployment type (single-tenant or multi-tenant).
  - **Single-Tenant Mode**: Each customer has their own isolated environment.
  - **Multi-Tenant Mode**: Multiple customers share the same environment with data segregation.

### 4. **Future Enhancements**

In a later phase, the following services will be integrated for improved performance and scalability:

#### 4.1 **Amazon CloudFront**

- **Purpose**: Content delivery network (CDN) for better performance and lower latency for API requests.

#### 4.2 **Amazon ElastiCache (Redis)**

- **Purpose**: In-memory caching to reduce database load and speed up response times.
- **Expected Usage**: Caching frequently accessed data (e.g., user session data, recent transactions).

---

## Security Considerations

- **Network Security**: Utilize private subnets for sensitive components (Kubernetes and RDS).
- **Data Security**: Enable encryption at rest and in transit for RDS and other sensitive data.
- **Authentication**: Use Amazon Cognito for secure user management.
- **Access Control**: Role-based access policies for AWS resources.

---

## Performance Metrics

- **Response Time**: All API calls should respond within 5 seconds or less.
- **Scalability**: The architecture should be capable of automatically scaling to support an increasing number of users.

---

## Monitoring and Logging

- **CloudWatch**: Use Amazon CloudWatch for monitoring application performance and logging.
- **Health Checks**: Configure ALB health checks for backend service availability.

---

## Summary

The architecture for SaasyBank leverages AWS services to provide a scalable, secure, and highly available backend for financial transactions. The design accommodates the need for both single-tenant and multi-tenant deployment strategies, ensuring flexibility for growth and customer requirements. Initial phase focuses on building a robust backend with future enhancements planned for improved responsiveness and performance.

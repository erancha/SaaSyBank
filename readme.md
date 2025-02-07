# Preface

**SaaSyBank** serves as a demonstration for a banking application that enables users to create accounts and engage in various banking transactions.

The application includes two distinct user roles: Bankers, who can activate or deactivate accounts, and Users, who have the ability to deposit, withdraw, and transfer money between accounts.

Built with scalability in mind, the app leverages serverless computing and storage, complemented by global content distribution through CloudFront.

It features a user-friendly design with a mobile-first approach and robust monitoring capabilities via AWS CloudWatch. The app is developed using AWS services, React, and WebSockets to facilitate real-time updates.

User authentication is securely managed through Google.

# Table Of Content

<!-- toc -->

- [High-Level Design (HLD) Document for SaaSyBank](#high-level-design-hld-document-for-saasybank)
  - [Overview](#overview)
  - [Architecture](#architecture)
    - [1. **Backend**](#1-backend)
      - [1.1 **Application Load Balancer (ALB)**](#11-application-load-balancer-alb)
      - [1.2 **ECS with Fargate**](#12-ecs-with-fargate)
      - [1.3 **RDS with PostgreSQL**](#13-rds-with-postgresql)
      - [1.4 **SQS**](#14-sqs)
    - [2. **Frontend**](#2-frontend)
    - [3. Security Considerations](#3-security-considerations)
    - [4. Scalability, Performance and Resiliency](#4-scalability-performance-and-resiliency)
    - [5. Flexible **Deployment**](#5-flexible-deployment)
    - [6. Monitoring & Logging](#6-monitoring--logging)
  - [Summary](#summary)

<!-- tocstop -->

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

## Architecture

![Architecture Diagram](https://lucid.app/publicSegments/view/69c70e24-cb99-4f28-8cf9-59329f1bc55b/image.jpeg)

### 1. **Backend**

#### **Application Load Balancer (ALB)**

- **Purpose**: Distribute API requests
- **SLA**: Auto-scales for high availability

#### **ECS with Fargate**

- **Objective**: Run containerized applications for banking functionalities
- **Network**: Deployed in private subnets

#### **RDS with PostgreSQL**

- **Purpose**: Store accounts data
- **Network**: Managed RDS instance in private subnets
- **Backup**: Automated backups enabled

#### **SQS**

- **Purpose**: To separate the processes of transaction encryption and saving from the core online banking functionalities managed by ECS. The ECS Fargate task is designed to handle only the immediate updating of transaction details in RDS. This allows for a quicker response time, as the ECS task can return the result of the transaction immediately without being burdened by the additional overhead of encryption and saving, which will be processed asynchronously through SQS by a dedicated **Lambda** function.

### 2. **Frontend**

- Single Page Application (SPA) developed with React
- Hosted on AWS S3
- Delivered globally via **AWS CloudFront**
- Technology stack: **React**, **Redux** (HOC), **TypeScript**

### 3. Security Considerations

- Data in transit is encrypted with **HTTPS**
- User authentication via AWS Cognito with **Google** integration
- ECS Fargate and Elasticache Redis are in a **private subnet**
- IAM roles follow the least privilege principle

### 4. Scalability, Performance and Resiliency

- Serverless architecture enables automatic scaling
- Elasticache Redis enhances the scalability of read operations
- CloudFront provides low-latency content delivery

### 5. Flexible **Deployment**

- **Modes**: Single-tenant (isolated environments) and multi-tenant (shared environments with data segregation)
- CloudFormation Parameter: To specify deployment type

### 6. Monitoring & Logging

- **Response Time**: API calls < 5 seconds
- **Monitoring** and **logging** via AWS CloudWatch
- **Health Checks**: Configure ALB health checks

## Summary

SaaSyBank's architecture utilizes AWS services for a scalable, secure, and highly available backend. It supports both single-tenant and multi-tenant deployments, focusing on a robust backend.

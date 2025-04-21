# GitHub Actions Implementation Plan for Swift Terraform

This document outlines the implementation plan for integrating Terraform with GitHub Actions to automate the infrastructure deployment process for the Swift application.

## Current State Analysis

- Terraform is used to provision AWS infrastructure (EC2, VPC, security groups) and Cloudflare DNS
- Docker containers for API and Web are manually built and pushed to ECR
- Terraform apply is successful, but Docker images are failing to deploy on the EC2 instance
- Fixed scripts validate Docker images availability and provide fallback mechanisms

## GitHub Actions Implementation Plan

### 1. Workflow Responsibilities

#### Build and Push Images Workflow

- Trigger: On push to main branch or manual trigger (workflow_dispatch)
- Tasks:
  - Build API and Web Docker images
  - Tag images with commit SHA and latest tag
  - Authenticate to AWS ECR
  - Push images to ECR repositories
  - Output image URIs for use in Terraform

#### Terraform Infrastructure Workflow

- Trigger: On successful completion of image workflow or manual trigger
- Tasks:
  - Set up Terraform
  - Initialize Terraform with backend configuration
  - Validate Terraform configuration
  - Plan Terraform changes
  - Apply Terraform changes (with approval for production)
  - Verify deployment (health checks)

### 2. Required Services

- **GitHub Actions**: For workflow execution
- **AWS ECR**: For Docker image storage
- **AWS IAM**: For GitHub Actions authentication to AWS
- **GitHub Secrets**: For storing sensitive credentials
- **Terraform Cloud (optional)**: For remote state management and workspaces

### 3. Proposed Workflows

#### `build-and-push.yml`

```yaml
name: Build and Push Docker Images

on:
  push:
    branches: [main]
    paths:
      - "api/**"
      - "web/**"
      - ".github/workflows/build-and-push.yml"
  workflow_dispatch:

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      id-token: write # Required for OIDC auth with AWS
      contents: read

    outputs:
      api_image_uri: ${{ steps.api-image.outputs.image_uri }}
      web_image_uri: ${{ steps.web-image.outputs.image_uri }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ap-south-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build and push API image
        id: api-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: swift-api
          IMAGE_TAG: ${{ github.sha }}
        run: |
          cd api
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG -t $ECR_REGISTRY/$ECR_REPOSITORY:latest .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
          echo "image_uri=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Build and push Web image
        id: web-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: swift-web
          IMAGE_TAG: ${{ github.sha }}
        run: |
          cd web
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG -t $ECR_REGISTRY/$ECR_REPOSITORY:latest .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
          echo "image_uri=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT
```

#### `terraform-deploy.yml`

```yaml
name: Terraform Infrastructure Deployment

on:
  workflow_run:
    workflows: ["Build and Push Docker Images"]
    types:
      - completed
  workflow_dispatch:
    inputs:
      api_image_tag:
        description: "API Docker image tag (default: latest)"
        required: false
        default: "latest"
      web_image_tag:
        description: "Web Docker image tag (default: latest)"
        required: false
        default: "latest"

jobs:
  terraform:
    runs-on: ubuntu-latest
    permissions:
      id-token: write # Required for OIDC auth with AWS
      contents: read
      pull-requests: write # For PR comments

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ap-south-1

      - name: Get latest images (if not specified)
        if: github.event_name == 'workflow_run' || (github.event.inputs.api_image_tag == 'latest' && github.event.inputs.web_image_tag == 'latest')
        id: get-latest-images
        run: |
          AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
          echo "api_image_uri=${AWS_ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com/swift-api:latest" >> $GITHUB_OUTPUT
          echo "web_image_uri=${AWS_ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com/swift-web:latest" >> $GITHUB_OUTPUT

      - name: Set input images (if specified)
        if: github.event_name == 'workflow_dispatch' && (github.event.inputs.api_image_tag != 'latest' || github.event.inputs.web_image_tag != 'latest')
        id: set-input-images
        run: |
          AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
          echo "api_image_uri=${AWS_ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com/swift-api:${{ github.event.inputs.api_image_tag }}" >> $GITHUB_OUTPUT
          echo "web_image_uri=${AWS_ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com/swift-web:${{ github.event.inputs.web_image_tag }}" >> $GITHUB_OUTPUT

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: 1.5.0

      - name: Terraform Init
        working-directory: terraform
        run: terraform init

      - name: Terraform Validate
        working-directory: terraform
        run: terraform validate

      - name: Terraform Plan
        working-directory: terraform
        id: plan
        run: |
          API_IMAGE="${{ steps.get-latest-images.outputs.api_image_uri || steps.set-input-images.outputs.api_image_uri }}"
          WEB_IMAGE="${{ steps.get-latest-images.outputs.web_image_uri || steps.set-input-images.outputs.web_image_uri }}"

          terraform plan \
            -var="container_image_api=${API_IMAGE}" \
            -var="container_image_web=${WEB_IMAGE}" \
            -var="cloudflare_zone_id=${{ secrets.CLOUDFLARE_ZONE_ID }}" \
            -out=tfplan

      - name: Terraform Apply
        working-directory: terraform
        if: github.ref == 'refs/heads/main'
        run: terraform apply -auto-approve tfplan

      - name: Verify Deployment
        if: github.ref == 'refs/heads/main'
        run: |
          # Wait for deployment to complete (adjust timing as needed)
          echo "Waiting for deployment to complete..."
          sleep 300

          # Get instance IP from Terraform output
          cd terraform
          INSTANCE_IP=$(terraform output -raw instance_public_ip)

          # Check health endpoints
          echo "Checking Web service health..."
          curl -s -f -m 10 "http://${INSTANCE_IP}:3050/" || echo "Web service health check failed"

          echo "Checking API service health..."
          curl -s -f -m 10 "http://${INSTANCE_IP}:4000/healthcheck" || echo "API service health check failed"
```

### 4. Required Secrets and Variables

- **AWS_ROLE_ARN**: ARN of the AWS IAM role with ECR and necessary service permissions
- **CLOUDFLARE_ZONE_ID**: Cloudflare zone ID for DNS configuration
- **TF_API_TOKEN** (if using Terraform Cloud): API token for Terraform Cloud

### 5. IAM Role Configuration

Create an IAM role with the following permissions:

- AmazonECR-FullAccess
- AmazonEC2FullAccess
- IAMFullAccess (or scoped down permissions for EC2 instance profiles)
- Permissions to manage VPC, Security Groups, and other AWS resources used in Terraform

Configure the role's trust relationship to allow GitHub Actions to assume it:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR-ORG/swift:*"
        }
      }
    }
  ]
}
```

### 6. Next Steps

1. Create the GitHub Actions workflow files in the repository
2. Set up the required GitHub secrets
3. Configure the AWS IAM role and trust relationships
4. Set up Terraform Cloud (optional) for better state management
5. Test the workflows with manual triggers
6. Implement PR checks for Terraform plan validation

This implementation plan provides a complete CI/CD solution for Swift's Terraform infrastructure, automating both the Docker image building and infrastructure deployment processes.

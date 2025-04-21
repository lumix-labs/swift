# Swift App AWS Deployment

Simple deployment of Swift app Docker container on a single EC2 instance.

## Local Setup

1. **Create SSH Key Pair** (if you don't have one)
   ```
   aws ec2 create-key-pair --key-name swift-key --query 'KeyMaterial' --output text > swift-key.pem
   chmod 400 swift-key.pem
   ```

2. **Configure Terraform**
   ```
   cp terraform.tfvars.example terraform.tfvars
   ```
   Edit `terraform.tfvars` and set your key_name

3. **Deploy**
   ```
   terraform init
   terraform apply
   ```

4. **Push Docker Image to ECR**
   ```
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $(terraform output -raw ecr_repository_url)
   docker tag your-local-image:latest $(terraform output -raw ecr_repository_url):latest
   docker push $(terraform output -raw ecr_repository_url):latest
   ```

5. **Access App**
   ```
   echo "App available at: http://$(terraform output -raw instance_public_ip)"
   ```

## What Gets Deployed

- ECR repository
- EC2 instance with Docker
- Security group for web traffic
- IAM role for ECR access
- Elastic IP for static address

## Connecting to EC2

```
ssh -i swift-key.pem ec2-user@$(terraform output -raw instance_public_ip)
```

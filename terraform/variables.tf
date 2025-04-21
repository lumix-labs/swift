variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "swift"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "prod" # Updated to prod as there's only prod environment
}

variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
  default     = "ap-south-1"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for the public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for the private subnets (not used after optimization)"
  type        = list(string)
  default     = []
}

variable "availability_zones" {
  description = "Availability zones for the subnets"
  type        = list(string)
  default     = ["ap-south-1a", "ap-south-1b"]
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small" # Downgraded from t3.medium for cost savings
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID"
  type        = string
  # No default - will be fetched from Terraform Cloud
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
  # No default - will be fetched from Terraform Cloud
}

variable "key_pair_name" {
  description = "Name of the SSH key pair to use with the EC2 instance"
  type        = string
  default     = ""
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "swift-app.com"
}

variable "container_image_api" {
  description = "ECR image URI for the API container"
  type        = string
  default     = "618206799106.dkr.ecr.ap-south-1.amazonaws.com/swift-api:latest"
}

variable "container_image_web" {
  description = "ECR image URI for the Web container"
  type        = string
  default     = "618206799106.dkr.ecr.ap-south-1.amazonaws.com/swift-web:latest"
}

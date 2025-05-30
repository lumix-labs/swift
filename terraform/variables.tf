variable "project_name" {
  description = "Swift"
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
  default     = "t3.micro" # Further downgraded from t3.small for additional cost savings
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID"
  type        = string
  # No default - will be fetched from Terraform Cloud
}

variable "key_pair_name" {
  description = "Name of the SSH key pair to use with the EC2 instance"
  type        = string
  default     = "swift-key"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "nxtra.co"
}

variable "container_image_api" {
  description = "ECR image URI for the API container"
  type        = string
  default     = "618206799106.dkr.ecr.ap-south-1.amazonaws.com/lumixlabs/swift-api:latest"
}

variable "container_image_web" {
  description = "ECR image URI for the Web container"
  type        = string
  default     = "618206799106.dkr.ecr.ap-south-1.amazonaws.com/lumixlabs/swift-web:latest"
}

variable "ssh_private_key_path" {
  description = "Path to the SSH private key file for remote provisioning"
  type        = string
  default     = ""
  sensitive   = true
}

variable "ssh_private_key_content" {
  description = "Content of the SSH private key for remote provisioning"
  type        = string
  default     = ""
  sensitive   = true
}

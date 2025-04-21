variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "public_subnet_ids" {
  description = "IDs of the public subnets"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "IDs of the private subnets (not used after optimization)"
  type        = list(string)
  default     = []
}

variable "security_group_id" {
  description = "Security group ID for the EC2 instance"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
}

variable "key_name" {
  description = "Name of the SSH key pair"
  type        = string
  default     = null
}

variable "instance_profile_name" {
  description = "Name of the instance profile"
  type        = string
  default     = null
}

variable "container_image_api" {
  description = "Container image URI for the API service (e.g., 'account_id.dkr.ecr.region.amazonaws.com/swift-api:latest')"
  type        = string
  default     = ""

  validation {
    condition     = var.container_image_api == "" || can(regex("^[0-9]+\\.dkr\\.ecr\\.[a-z0-9-]+\\.amazonaws\\.com\\/[a-zA-Z0-9-_/]+:[a-zA-Z0-9-_.]+$", var.container_image_api))
    error_message = "The container_image_api must be a valid ECR image URI in the format: 'account_id.dkr.ecr.region.amazonaws.com/repository:tag'"
  }
}

variable "container_image_web" {
  description = "Container image URI for the Web service (e.g., 'account_id.dkr.ecr.region.amazonaws.com/swift-web:latest')"
  type        = string
  default     = ""

  validation {
    condition     = var.container_image_web == "" || can(regex("^[0-9]+\\.dkr\\.ecr\\.[a-z0-9-]+\\.amazonaws\\.com\\/[a-zA-Z0-9-_/]+:[a-zA-Z0-9-_.]+$", var.container_image_web))
    error_message = "The container_image_web must be a valid ECR image URI in the format: 'account_id.dkr.ecr.region.amazonaws.com/repository:tag'"
  }
}

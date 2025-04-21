variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for the public subnets"
  type        = list(string)
}

variable "availability_zones" {
  description = "Availability zones for the subnets"
  type        = list(string)
}

# This variable is kept for backward compatibility
# but is no longer used since private subnets were removed
variable "private_subnet_cidrs" {
  description = "CIDR blocks for the private subnets (not used)"
  type        = list(string)
  default     = []
}

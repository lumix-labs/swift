variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID"
  type        = string
}

variable "instance_ip" {
  description = "Public IP of the EC2 instance"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "nxtra.co" # Default domain, should be overridden
}

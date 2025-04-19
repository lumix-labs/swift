variable "aws_region" {
  description = "AWS region"
  default     = "ap-south-1"
  type        = string
}

variable "cloudflare_api_token" {
  description = "Cloudflare API Token"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the web service"
  default     = "nxtra.co"
  type        = string
}

variable "subdomain" {
  description = "Subdomain for the web service"
  default     = "swift"
  type        = string
}

variable "container_image" {
  description = "Container image URI"
  type        = string
}

variable "lightsail_service_name" {
  description = "Name of the Lightsail container service"
  default     = "swift-web"
  type        = string
}

variable "lightsail_power" {
  description = "Power of the Lightsail container service"
  default     = "nano" # Cheapest option
  type        = string
}

variable "lightsail_scale" {
  description = "Scale of the Lightsail container service"
  default     = 1
  type        = number
}
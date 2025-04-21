variable "instance_id" {
  description = "ID of the EC2 instance where Nginx will be installed"
  type        = string
}

variable "instance_ip" {
  description = "Public IP address of the EC2 instance"
  type        = string
}

variable "domain_name" {
  description = "Base domain name for the application"
  type        = string
}

variable "web_service_port" {
  description = "Port number for the web frontend service"
  type        = number
  default     = 3050
}

variable "api_service_port" {
  description = "Port number for the API service"
  type        = number
  default     = 4000
}

variable "ssh_private_key" {
  description = "Path to private SSH key for remote-exec connection"
  type        = string
  default     = ""
  sensitive   = true
}

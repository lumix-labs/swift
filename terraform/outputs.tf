output "vpc_id" {
  description = "ID of the VPC"
  value       = module.networking.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.networking.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.networking.private_subnet_ids
}

output "instance_public_ip" {
  description = "Public IP of the EC2 instance"
  value       = module.compute.instance_public_ip
}

output "instance_id" {
  description = "ID of the EC2 instance"
  value       = module.compute.instance_id
}

output "api_endpoint" {
  description = "API endpoint URL"
  value       = "http://${module.compute.instance_public_ip}:4000"
}

output "web_endpoint" {
  description = "Web endpoint URL"
  value       = "http://${module.compute.instance_public_ip}:3050"
}

output "mcp_server_endpoint" {
  description = "MCP Server endpoint URL"
  value       = "http://${module.compute.instance_public_ip}:5000"
}

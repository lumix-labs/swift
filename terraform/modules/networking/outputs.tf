output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.swift_vpc.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public_subnets[*].id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.swift_vpc.cidr_block
}

# Empty list for backward compatibility
output "private_subnet_ids" {
  description = "IDs of the private subnets (empty after refactoring)"
  value       = []
}

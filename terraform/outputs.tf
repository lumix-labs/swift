output "ecr_repository_url" {
  value       = aws_ecr_repository.swift_web.repository_url
  description = "ECR repository URL"
}

output "lightsail_service_url" {
  value       = aws_lightsail_container_service.swift_web.url
  description = "Lightsail container service URL"
}

output "website_url" {
  value       = "https://${var.subdomain}.${var.domain_name}"
  description = "Website URL"
}
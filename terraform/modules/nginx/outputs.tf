output "nginx_status" {
  description = "Status of the Nginx configuration"
  value       = "Nginx configured for ${var.domain_name} and api.${var.domain_name}"
}

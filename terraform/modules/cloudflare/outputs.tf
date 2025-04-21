output "web_dns_record" {
  description = "Cloudflare DNS record ID for web service"
  value       = cloudflare_record.web.id
}

output "api_dns_record" {
  description = "Cloudflare DNS record ID for API service"
  value       = cloudflare_record.api.id
}

output "root_dns_record" {
  description = "Cloudflare DNS record ID for root domain"
  value       = cloudflare_record.root.id
}

output "web_dns_name" {
  description = "Full DNS name for web service"
  value       = "web.${var.domain_name}"
}

output "api_dns_name" {
  description = "Full DNS name for API service"
  value       = "api.${var.domain_name}"
}

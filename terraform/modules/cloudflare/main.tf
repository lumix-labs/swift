# Explicit provider configuration for this module
terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 3.35"
    }
  }
}

# Cloudflare DNS records and settings

# DNS Records for Web and API services
resource "cloudflare_record" "web" {
  zone_id = var.cloudflare_zone_id
  name    = "www"
  value   = var.instance_ip
  type    = "A"
  proxied = true
  ttl     = 1 # Auto
}

resource "cloudflare_record" "root" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  value   = var.instance_ip
  type    = "A"
  proxied = true
  ttl     = 1 # Auto
}

resource "cloudflare_record" "api" {
  zone_id = var.cloudflare_zone_id
  name    = "api"
  value   = var.instance_ip
  type    = "A"
  proxied = true
  ttl     = 1 # Auto
}

# Enforce HTTPS - Single page rule (removed conflicting cache_level setting)
resource "cloudflare_page_rule" "https_always" {
  zone_id  = var.cloudflare_zone_id
  target   = "*.${var.domain_name}/*"
  priority = 1

  actions {
    always_use_https = true
  }
}

# SSL settings - Set to "flexible" since termination happens at Cloudflare
resource "cloudflare_zone_settings_override" "ssl_settings" {
  zone_id = var.cloudflare_zone_id

  settings {
    ssl                      = "flexible" # SSL terminated at Cloudflare
    tls_1_3                  = "on"
    min_tls_version          = "1.2"
    automatic_https_rewrites = "on"
    always_use_https         = "on"
  }
}

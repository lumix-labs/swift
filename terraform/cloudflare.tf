resource "cloudflare_record" "swift_web" {
  zone_id = var.cloudflare_zone_id
  name    = var.subdomain
  value   = aws_lightsail_container_service.swift_web.url
  type    = "CNAME"
  ttl     = 1
  proxied = true
}

# Force HTTPS for the subdomain
resource "cloudflare_zone_settings_override" "swift_web_settings" {
  zone_id = var.cloudflare_zone_id
  
  settings {
    always_use_https = "on"
    ssl              = "full"
  }
}

# Add page rule for cache settings
resource "cloudflare_page_rule" "swift_web_cache" {
  zone_id  = var.cloudflare_zone_id
  target   = "${var.subdomain}.${var.domain_name}/*"
  priority = 1

  actions {
    cache_level = "cache_everything"
    browser_cache_ttl = 3600
    edge_cache_ttl = 7200
  }
}
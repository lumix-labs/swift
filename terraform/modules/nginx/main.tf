resource "null_resource" "setup_nginx" {
  # Trigger recreation when any of these change
  triggers = {
    instance_id      = var.instance_id
    web_service_port = var.web_service_port
    api_service_port = var.api_service_port
    domain_name      = var.domain_name
  }

  # Remote provision the Nginx configuration
  provisioner "remote-exec" {
    connection {
      type        = "ssh"
      user        = "ec2-user"
      host        = var.instance_ip
      private_key = var.ssh_private_key_content != "" ? var.ssh_private_key_content : (var.ssh_private_key != "" ? file(var.ssh_private_key) : null)
      agent       = false
    }

    inline = [
      # Install Nginx if not already installed
      "sudo amazon-linux-extras install -y nginx1",
      
      # Enable and start Nginx
      "sudo systemctl enable nginx",
      "sudo systemctl start nginx",
      
      # Create Nginx configuration
      "echo '${local.nginx_config}' | sudo tee /etc/nginx/conf.d/swift.conf",
      
      # Remove default Nginx configuration
      "sudo rm -f /etc/nginx/conf.d/default.conf",
      
      # Test and reload Nginx
      "sudo nginx -t && sudo systemctl reload nginx"
    ]
  }
}

# Cloudflare IP range configuration file
resource "null_resource" "setup_cloudflare_ips" {
  triggers = {
    instance_id = var.instance_id
  }

  # Remote provision the Cloudflare IP configuration
  provisioner "remote-exec" {
    connection {
      type        = "ssh"
      user        = "ec2-user"
      host        = var.instance_ip
      private_key = var.ssh_private_key_content != "" ? var.ssh_private_key_content : (var.ssh_private_key != "" ? file(var.ssh_private_key) : null)
      agent       = false
    }

    inline = [
      # Create script to fetch and update Cloudflare IPs
      "echo '${local.cloudflare_ip_script}' | sudo tee /usr/local/bin/update-cloudflare-ips.sh",
      "sudo chmod +x /usr/local/bin/update-cloudflare-ips.sh",
      
      # Run the script to create initial IP lists
      "sudo /usr/local/bin/update-cloudflare-ips.sh",
      
      # Create cron job to update IPs weekly
      "echo '0 0 * * 0 root /usr/local/bin/update-cloudflare-ips.sh > /dev/null 2>&1' | sudo tee /etc/cron.d/update-cloudflare-ips"
    ]
  }
}

locals {
  nginx_config = <<-EOT
    # Nginx configuration for Swift application
    # Main configuration file: /etc/nginx/conf.d/swift.conf
    
    # Include Cloudflare IP addresses for real IP restoration
    include /etc/nginx/cloudflare_ips.conf;
    
    # Web frontend configuration
    server {
        listen 80;
        server_name ${var.domain_name} www.${var.domain_name};
        
        access_log /var/log/nginx/web_access.log;
        error_log /var/log/nginx/web_error.log;
        
        location / {
            proxy_pass http://localhost:${var.web_service_port};
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket support if needed
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
    }
    
    # API configuration
    server {
        listen 80;
        server_name api.${var.domain_name};
        
        access_log /var/log/nginx/api_access.log;
        error_log /var/log/nginx/api_error.log;
        
        location / {
            proxy_pass http://localhost:${var.api_service_port};
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # API timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
    }
  EOT
  
  cloudflare_ip_script = <<-EOT
    #!/bin/bash
    
    # Script to fetch and update Cloudflare IP ranges
    # This allows us to restrict access to only Cloudflare IPs
    
    # Fetch current Cloudflare IPs
    echo "Fetching Cloudflare IP ranges..."
    
    # IPv4 ranges
    IPV4_RANGES=$(curl -s https://www.cloudflare.com/ips-v4)
    
    # IPv6 ranges
    IPV6_RANGES=$(curl -s https://www.cloudflare.com/ips-v6)
    
    # Create Nginx configuration for Cloudflare real IP restoration
    echo "# Cloudflare IP addresses" > /etc/nginx/cloudflare_ips.conf
    echo "# Last updated: $(date)" >> /etc/nginx/cloudflare_ips.conf
    echo "" >> /etc/nginx/cloudflare_ips.conf
    
    # Add Cloudflare IPs to real_ip_header configuration
    echo "real_ip_header CF-Connecting-IP;" >> /etc/nginx/cloudflare_ips.conf
    
    # Add IPv4 ranges
    for range in $IPV4_RANGES; do
        echo "set_real_ip_from $range;" >> /etc/nginx/cloudflare_ips.conf
    done
    
    # Add IPv6 ranges
    for range in $IPV6_RANGES; do
        echo "set_real_ip_from $range;" >> /etc/nginx/cloudflare_ips.conf
    done
    
    # Create iptables rules to only allow traffic from Cloudflare IPs on port 80/443
    
    # Backup current iptables rules
    iptables-save > /etc/iptables.backup.$(date +%Y%m%d%H%M%S)
    
    # Create new ruleset file
    cat > /etc/iptables.cloudflare.rules << 'EORULES'
    # Generated Cloudflare IP whitelist for iptables
    # Allow established connections
    -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
    
    # Allow local traffic
    -A INPUT -i lo -j ACCEPT
    
    # Allow SSH (for management)
    -A INPUT -p tcp --dport 22 -j ACCEPT
    
    # Default drop rule for INPUT chain
    -A INPUT -p tcp --dport 80 -j DROP
    -A INPUT -p tcp --dport 443 -j DROP
    EORULES
    
    # Add Cloudflare IP ranges to whitelist
    for range in $IPV4_RANGES; do
        echo "-A INPUT -p tcp -s $range --dport 80 -j ACCEPT" >> /etc/iptables.cloudflare.rules
        echo "-A INPUT -p tcp -s $range --dport 443 -j ACCEPT" >> /etc/iptables.cloudflare.rules
    done
    
    # Create systemd service for iptables
    cat > /etc/systemd/system/cloudflare-iptables.service << 'EOSERVICE'
    [Unit]
    Description=Apply Cloudflare IP whitelisting rules
    After=network.target
    
    [Service]
    Type=oneshot
    ExecStart=/sbin/iptables-restore -n /etc/iptables.cloudflare.rules
    RemainAfterExit=yes
    
    [Install]
    WantedBy=multi-user.target
    EOSERVICE
    
    # Enable and start the service
    systemctl daemon-reload
    systemctl enable cloudflare-iptables
    systemctl restart cloudflare-iptables
    
    # Reload Nginx to apply changes
    if systemctl is-active --quiet nginx; then
        systemctl reload nginx
    fi
    
    echo "Cloudflare IP ranges updated successfully!"
  EOT
}
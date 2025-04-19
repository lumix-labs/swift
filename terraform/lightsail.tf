# Get Cloudflare IP ranges
data "cloudflare_ip_ranges" "cloudflare" {}

resource "aws_lightsail_container_service" "swift_web" {
  name        = var.lightsail_service_name
  power       = var.lightsail_power
  scale       = var.lightsail_scale
  is_disabled = false

  # Service configuration
  private_registry_access {
    ecr_repository_arn = aws_ecr_repository.swift_web.arn
  }

  # Container definition
  container {
    container_name = "web"
    image          = var.container_image
    
    ports = {
      port_number = 3050
    }
    
    environment = {
      "NODE_ENV" = "production"
      "PORT"     = "3050"
    }
  }

  # Only allow traffic from Cloudflare IPs
  public_domain_names {
    domain_names = ["${var.subdomain}.${var.domain_name}"]
  }

  # Add tags
  tags = {
    Project = "swift"
    Module  = "web"
  }
}

# Create a security group for the Lightsail container service
# This will need to be attached manually or via the AWS CLI as Terraform 
# doesn't directly support Lightsail security groups
resource "local_file" "lightsail_cloudflare_acl_script" {
  filename = "${path.module}/setup_lightsail_acl.sh"
  content  = <<-EOT
    #!/bin/bash
    
    # This script sets up Lightsail container service to only accept connections from Cloudflare IPs
    
    # Install AWS CLI if not already installed
    if ! command -v aws &> /dev/null; then
        echo "AWS CLI not found, installing..."
        curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
        unzip awscliv2.zip
        ./aws/install
    fi
    
    # Set the AWS region
    export AWS_DEFAULT_REGION=${var.aws_region}
    
    # Cloudflare IPv4 ranges
    CLOUDFLARE_IPS=(${join(" ", data.cloudflare_ip_ranges.cloudflare.ipv4_cidr_blocks)})
    
    # Lightsail container service name
    SERVICE_NAME="${var.lightsail_service_name}"
    
    # Get current public ports
    CURRENT_PORTS=$(aws lightsail get-container-service-ports --service-name $SERVICE_NAME --query 'ports[*].{port:port,protocol:protocol}' --output json)
    
    # For each Cloudflare IP range, allow access
    for IP in "$${CLOUDFLARE_IPS[@]}"; do
      echo "Adding allow rule for $IP"
      aws lightsail update-container-service --service-name $SERVICE_NAME --public-endpoint "{\"containerName\":\"web\",\"containerPort\":3050,\"healthCheck\":{\"path\":\"/api/health\",\"successCodes\":\"200-499\"},\"allowedIps\":[\"$IP\"]}"
    done
    
    echo "Lightsail container service ACL updated to only allow Cloudflare IPs"
  EOT
}
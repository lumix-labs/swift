# Get the latest Amazon Linux 2 AMI
data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Create EC2 instance for Swift services
resource "aws_instance" "swift_instance" {
  ami           = data.aws_ami.amazon_linux_2.id
  instance_type = var.instance_type
  key_name      = var.key_name

  subnet_id              = var.public_subnet_ids[0]
  vpc_security_group_ids = [var.security_group_id]
  iam_instance_profile   = var.instance_profile_name

  associate_public_ip_address = true

  # Set volume size to 20GB with gp3 for better performance/cost ratio
  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  user_data = templatefile("${path.module}/user_data.sh.tpl", {
    aws_region = var.aws_region,
    path = {
      module = path.module
    }
  })

  # Updated lifecycle policy to prevent recreation due to AMI changes
  lifecycle {
    create_before_destroy = true
    ignore_changes = [
      ami,              # Ignore changes to the AMI
      user_data,        # Ignore changes to user data
      ebs_optimized     # Ignore changes to ebs_optimized
    ]
  }

  tags = {
    Name        = "${var.project_name}-instance"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Elastic IP for the instance
resource "aws_eip" "swift_eip" {
  instance = aws_instance.swift_instance.id

  tags = {
    Name        = "${var.project_name}-eip"
    Environment = var.environment
    Project     = var.project_name
  }
}

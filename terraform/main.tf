module "networking" {
  source = "./modules/networking"

  project_name         = var.project_name
  environment          = var.environment
  vpc_cidr             = var.vpc_cidr
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  availability_zones   = var.availability_zones
}

module "security" {
  source = "./modules/security"

  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.networking.vpc_id
}

module "compute" {
  source = "./modules/compute"

  project_name          = var.project_name
  environment           = var.environment
  aws_region            = var.aws_region
  vpc_id                = module.networking.vpc_id
  public_subnet_ids     = module.networking.public_subnet_ids
  private_subnet_ids    = module.networking.private_subnet_ids
  security_group_id     = module.security.instance_security_group_id
  instance_type         = var.instance_type
  key_name              = var.key_pair_name != "" ? var.key_pair_name : null
  instance_profile_name = module.security.ec2_instance_profile
}

module "cloudflare" {
  source = "./modules/cloudflare"

  project_name       = var.project_name
  environment        = var.environment
  cloudflare_zone_id = var.cloudflare_zone_id
  instance_ip        = module.compute.instance_public_ip
  domain_name        = var.domain_name
}

module "nginx" {
  source = "./modules/nginx"

  instance_id      = module.compute.instance_id
  instance_ip      = module.compute.instance_public_ip
  domain_name      = var.domain_name
  web_service_port = 3050
  api_service_port = 4000
  ssh_private_key  = var.ssh_private_key_path
  
  # Add dependency on Cloudflare module to ensure DNS is configured first
  depends_on = [module.cloudflare]
}
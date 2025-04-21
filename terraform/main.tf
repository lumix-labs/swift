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
  container_image_api   = var.container_image_api
  container_image_web   = var.container_image_web
}

module "cloudflare" {
  source = "./modules/cloudflare"

  project_name       = var.project_name
  environment        = var.environment
  cloudflare_zone_id = var.cloudflare_zone_id
  instance_ip        = module.compute.instance_public_ip
  domain_name        = var.domain_name
}
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.16"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 3.35"
    }
  }

  backend "remote" {
    organization = "lumixlabs"

    workspaces {
      name = "swift"
    }
  }

  required_version = ">= 1.2.0"
}

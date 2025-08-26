# HPA Platform - Main Terraform Configuration
# This is the root module that orchestrates all infrastructure components

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
  
  # S3 backend for state management
  backend "s3" {
    bucket         = "hpa-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "hpa-terraform-locks"
  }
}

# Provider configurations
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Environment = var.environment
      Project     = "HPA-Platform"
      ManagedBy   = "Terraform"
      Owner       = var.owner_email
      CostCenter  = var.cost_center
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# Local variables
locals {
  account_id = data.aws_caller_identity.current.account_id
  
  # Naming convention
  name_prefix = "${var.project_name}-${var.environment}"
  
  # Network configuration
  azs = slice(data.aws_availability_zones.available.names, 0, 3)
  
  # Common tags
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    Region      = var.aws_region
    Terraform   = "true"
  }
  
  # Security settings
  enable_encryption = var.environment == "production" ? true : false
  enable_deletion_protection = var.environment == "production" ? true : false
}

# VPC Module
module "vpc" {
  source = "./modules/networking"
  
  name_prefix = local.name_prefix
  cidr_block  = var.vpc_cidr
  azs         = local.azs
  
  public_subnet_cidrs   = var.public_subnet_cidrs
  private_subnet_cidrs  = var.private_subnet_cidrs
  database_subnet_cidrs = var.database_subnet_cidrs
  
  enable_nat_gateway = true
  single_nat_gateway = var.environment != "production"
  enable_dns_support = true
  enable_dns_hostnames = true
  
  enable_vpc_endpoints = true
  vpc_endpoints = [
    "s3",
    "ecr.api",
    "ecr.dkr",
    "logs",
    "sts",
    "kms",
    "secretsmanager"
  ]
  
  tags = local.common_tags
}

# Security Module
module "security" {
  source = "./modules/security"
  
  name_prefix = local.name_prefix
  vpc_id      = module.vpc.vpc_id
  
  # KMS Keys
  create_kms_keys = true
  kms_key_aliases = {
    rds      = "alias/${local.name_prefix}-rds"
    s3       = "alias/${local.name_prefix}-s3"
    secrets  = "alias/${local.name_prefix}-secrets"
    eks      = "alias/${local.name_prefix}-eks"
  }
  
  # Security Groups
  create_security_groups = true
  
  tags = local.common_tags
}

# EKS Cluster Module
module "eks" {
  source = "./modules/eks"
  
  cluster_name    = "${local.name_prefix}-cluster"
  cluster_version = var.eks_cluster_version
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
  
  # Node groups configuration
  node_groups = {
    general = {
      desired_capacity = var.environment == "production" ? 3 : 2
      min_capacity     = var.environment == "production" ? 3 : 1
      max_capacity     = var.environment == "production" ? 10 : 5
      instance_types   = var.environment == "production" ? ["t3.large"] : ["t3.medium"]
      
      k8s_labels = {
        Environment = var.environment
        NodeType    = "general"
      }
    }
    
    spot = {
      desired_capacity = var.environment == "production" ? 2 : 1
      min_capacity     = 1
      max_capacity     = var.environment == "production" ? 5 : 3
      instance_types   = ["t3.medium", "t3a.medium"]
      capacity_type    = "SPOT"
      
      k8s_labels = {
        Environment = var.environment
        NodeType    = "spot"
        Workload    = "batch"
      }
      
      taints = [{
        key    = "spot"
        value  = "true"
        effect = "NoSchedule"
      }]
    }
  }
  
  # IRSA roles
  enable_irsa = true
  
  # Add-ons
  cluster_addons = {
    coredns = {
      addon_version = "v1.10.1-eksbuild.2"
    }
    kube-proxy = {
      addon_version = "v1.28.1-eksbuild.1"
    }
    vpc-cni = {
      addon_version = "v1.14.1-eksbuild.1"
    }
    aws-ebs-csi-driver = {
      addon_version = "v1.24.0-eksbuild.1"
    }
  }
  
  # Security
  cluster_endpoint_private_access = true
  cluster_endpoint_public_access  = var.environment != "production"
  cluster_endpoint_public_access_cidrs = var.environment != "production" ? ["0.0.0.0/0"] : []
  
  # Encryption
  cluster_encryption_config = {
    provider_key_arn = module.security.kms_key_arns["eks"]
    resources        = ["secrets"]
  }
  
  tags = local.common_tags
}

# RDS PostgreSQL Module
module "rds" {
  source = "./modules/rds"
  
  identifier = "${local.name_prefix}-postgres"
  
  # Database configuration
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = var.rds_instance_class
  allocated_storage    = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage
  
  # Credentials
  database_name = "hpa_db"
  username      = "hpa_admin"
  
  # Network
  vpc_id                 = module.vpc.vpc_id
  subnet_ids             = module.vpc.database_subnet_ids
  vpc_security_group_ids = [module.security.rds_security_group_id]
  
  # High Availability
  multi_az               = var.environment == "production"
  backup_retention_period = var.environment == "production" ? 30 : 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  # Performance
  performance_insights_enabled = var.environment == "production"
  performance_insights_retention_period = 7
  monitoring_interval = var.environment == "production" ? 60 : 0
  monitoring_role_arn = var.environment == "production" ? module.security.rds_monitoring_role_arn : null
  
  # Security
  storage_encrypted = true
  kms_key_id       = module.security.kms_key_arns["rds"]
  deletion_protection = local.enable_deletion_protection
  
  # Parameters
  parameters = [
    {
      name  = "shared_preload_libraries"
      value = "pg_stat_statements"
    },
    {
      name  = "log_statement"
      value = "all"
    },
    {
      name  = "log_duration"
      value = "on"
    }
  ]
  
  tags = local.common_tags
}

# ElastiCache Redis Module
module "elasticache" {
  source = "./modules/elasticache"
  
  cluster_id = "${local.name_prefix}-redis"
  
  # Redis configuration
  engine_version       = "7.0"
  node_type           = var.redis_node_type
  num_cache_nodes     = var.environment == "production" ? 3 : 1
  parameter_group_family = "redis7"
  
  # Network
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
  security_group_ids = [module.security.redis_security_group_id]
  
  # High Availability
  automatic_failover_enabled = var.environment == "production"
  multi_az_enabled          = var.environment == "production"
  
  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token_enabled        = true
  
  # Backup
  snapshot_retention_limit = var.environment == "production" ? 5 : 1
  snapshot_window         = "03:00-05:00"
  
  tags = local.common_tags
}

# S3 Buckets Module
module "s3" {
  source = "./modules/s3"
  
  name_prefix = local.name_prefix
  
  # Bucket configurations
  buckets = {
    assets = {
      versioning = true
      lifecycle_rules = [
        {
          id      = "delete-old-versions"
          status  = "Enabled"
          expiration_days = 90
        }
      ]
    }
    backups = {
      versioning = false
      lifecycle_rules = [
        {
          id      = "transition-to-glacier"
          status  = "Enabled"
          transition_days = 30
          storage_class = "GLACIER"
        }
      ]
    }
    logs = {
      versioning = false
      lifecycle_rules = [
        {
          id      = "delete-old-logs"
          status  = "Enabled"
          expiration_days = 30
        }
      ]
    }
  }
  
  # Security
  block_public_access = true
  enable_encryption   = true
  kms_key_arn        = module.security.kms_key_arns["s3"]
  
  tags = local.common_tags
}

# ALB Module
module "alb" {
  source = "./modules/alb"
  
  name = "${local.name_prefix}-alb"
  
  vpc_id          = module.vpc.vpc_id
  subnets         = module.vpc.public_subnet_ids
  security_groups = [module.security.alb_security_group_id]
  
  # HTTPS listener
  certificate_arn = var.acm_certificate_arn
  
  # Target groups
  target_groups = {
    backend = {
      port     = 8080
      protocol = "HTTP"
      health_check = {
        enabled             = true
        path                = "/health"
        healthy_threshold   = 2
        unhealthy_threshold = 3
        timeout             = 5
        interval            = 30
      }
    }
    frontend = {
      port     = 3000
      protocol = "HTTP"
      health_check = {
        enabled             = true
        path                = "/"
        healthy_threshold   = 2
        unhealthy_threshold = 3
        timeout             = 5
        interval            = 30
      }
    }
  }
  
  # WAF
  enable_waf = var.environment == "production"
  
  # Logging
  enable_access_logs = true
  log_bucket        = module.s3.bucket_ids["logs"]
  
  tags = local.common_tags
}

# CloudFront Distribution
module "cloudfront" {
  source = "./modules/cloudfront"
  
  # Origins
  origin_domain_name = module.alb.dns_name
  origin_id          = "ALB-${module.alb.id}"
  
  # S3 origin for static assets
  s3_origin_domain_name = module.s3.bucket_regional_domain_names["assets"]
  s3_origin_id          = "S3-assets"
  
  # Distribution settings
  enabled             = true
  is_ipv6_enabled    = true
  default_root_object = "index.html"
  
  # SSL/TLS
  viewer_certificate = {
    acm_certificate_arn      = var.cloudfront_certificate_arn
    minimum_protocol_version = "TLSv1.2_2021"
    ssl_support_method       = "sni-only"
  }
  
  # Caching
  default_cache_behavior = {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALB-${module.alb.id}"
    compress        = true
    
    forwarded_values = {
      query_string = false
      headers      = ["Host", "Origin"]
      cookies = {
        forward = "none"
      }
    }
  }
  
  # Geo restriction
  geo_restriction = {
    restriction_type = "none"
  }
  
  # WAF
  web_acl_id = var.environment == "production" ? module.security.waf_web_acl_arn : null
  
  # Logging
  logging_config = {
    bucket          = module.s3.bucket_domain_names["logs"]
    include_cookies = false
    prefix          = "cloudfront/"
  }
  
  tags = local.common_tags
}

# Route53
module "route53" {
  source = "./modules/route53"
  
  domain_name = var.domain_name
  
  # Records
  records = {
    # Main application
    "www" = {
      type  = "A"
      alias = {
        name    = module.cloudfront.domain_name
        zone_id = module.cloudfront.hosted_zone_id
      }
    }
    
    # API endpoint
    "api" = {
      type  = "A"
      alias = {
        name    = module.alb.dns_name
        zone_id = module.alb.zone_id
      }
    }
    
    # Admin panel
    "admin" = {
      type  = "CNAME"
      ttl   = 300
      records = [module.alb.dns_name]
    }
  }
  
  tags = local.common_tags
}

# Monitoring Module
module "monitoring" {
  source = "./modules/monitoring"
  
  name_prefix = local.name_prefix
  
  # CloudWatch Log Groups
  log_groups = {
    "/aws/eks/${local.name_prefix}-cluster" = {
      retention_days = 30
    }
    "/aws/rds/${local.name_prefix}-postgres" = {
      retention_days = 7
    }
    "/aws/elasticache/${local.name_prefix}-redis" = {
      retention_days = 7
    }
    "/aws/lambda/${local.name_prefix}-functions" = {
      retention_days = 14
    }
  }
  
  # CloudWatch Alarms
  alarms = {
    high_cpu = {
      metric_name = "CPUUtilization"
      namespace   = "AWS/EC2"
      statistic   = "Average"
      period      = 300
      threshold   = 80
      comparison  = "GreaterThanThreshold"
    }
    
    rds_connections = {
      metric_name = "DatabaseConnections"
      namespace   = "AWS/RDS"
      statistic   = "Average"
      period      = 300
      threshold   = 80
      comparison  = "GreaterThanThreshold"
    }
    
    alb_target_response_time = {
      metric_name = "TargetResponseTime"
      namespace   = "AWS/ELB"
      statistic   = "Average"
      period      = 60
      threshold   = 1
      comparison  = "GreaterThanThreshold"
    }
  }
  
  # SNS Topics
  sns_topics = {
    critical_alerts = {
      display_name = "Critical Alerts"
      subscriptions = var.alert_email_addresses
    }
    warning_alerts = {
      display_name = "Warning Alerts"
      subscriptions = var.alert_email_addresses
    }
  }
  
  tags = local.common_tags
}

# Outputs
output "vpc_id" {
  value       = module.vpc.vpc_id
  description = "VPC ID"
}

output "eks_cluster_endpoint" {
  value       = module.eks.cluster_endpoint
  description = "EKS cluster endpoint"
  sensitive   = true
}

output "rds_endpoint" {
  value       = module.rds.endpoint
  description = "RDS instance endpoint"
  sensitive   = true
}

output "redis_endpoint" {
  value       = module.elasticache.endpoint
  description = "Redis cluster endpoint"
  sensitive   = true
}

output "alb_dns_name" {
  value       = module.alb.dns_name
  description = "ALB DNS name"
}

output "cloudfront_domain_name" {
  value       = module.cloudfront.domain_name
  description = "CloudFront distribution domain name"
}

output "ecr_repositories" {
  value = {
    backend = module.eks.ecr_repository_urls["backend"]
    frontend = module.eks.ecr_repository_urls["frontend"]
    agent = module.eks.ecr_repository_urls["agent"]
  }
  description = "ECR repository URLs"
}

output "s3_buckets" {
  value = {
    assets  = module.s3.bucket_ids["assets"]
    backups = module.s3.bucket_ids["backups"]
    logs    = module.s3.bucket_ids["logs"]
  }
  description = "S3 bucket names"
}
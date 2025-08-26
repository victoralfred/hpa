# Terraform Variables for HPA Platform

# General Configuration
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "hpa"
}

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "owner_email" {
  description = "Email of the infrastructure owner"
  type        = string
}

variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = "engineering"
}

# Networking Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.20.0/24", "10.0.21.0/24", "10.0.22.0/24"]
}

# EKS Configuration
variable "eks_cluster_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "eks_node_instance_types" {
  description = "EC2 instance types for EKS nodes"
  type        = map(list(string))
  default = {
    development = ["t3.medium"]
    staging     = ["t3.large"]
    production  = ["t3.xlarge", "t3.large"]
  }
}

variable "eks_node_group_min_size" {
  description = "Minimum size of EKS node group"
  type        = map(number)
  default = {
    development = 1
    staging     = 2
    production  = 3
  }
}

variable "eks_node_group_max_size" {
  description = "Maximum size of EKS node group"
  type        = map(number)
  default = {
    development = 3
    staging     = 5
    production  = 10
  }
}

variable "eks_node_group_desired_size" {
  description = "Desired size of EKS node group"
  type        = map(number)
  default = {
    development = 2
    staging     = 3
    production  = 3
  }
}

# RDS Configuration
variable "rds_instance_class" {
  description = "Instance class for RDS PostgreSQL"
  type        = string
  default     = "db.t3.medium"
}

variable "rds_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 100
}

variable "rds_max_allocated_storage" {
  description = "Maximum allocated storage for RDS autoscaling in GB"
  type        = number
  default     = 500
}

variable "rds_backup_retention_period" {
  description = "Backup retention period in days"
  type        = map(number)
  default = {
    development = 7
    staging     = 14
    production  = 30
  }
}

variable "rds_multi_az" {
  description = "Enable Multi-AZ for RDS"
  type        = map(bool)
  default = {
    development = false
    staging     = false
    production  = true
  }
}

# ElastiCache Configuration
variable "redis_node_type" {
  description = "Node type for Redis cluster"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes"
  type        = map(number)
  default = {
    development = 1
    staging     = 2
    production  = 3
  }
}

variable "redis_automatic_failover" {
  description = "Enable automatic failover for Redis"
  type        = map(bool)
  default = {
    development = false
    staging     = true
    production  = true
  }
}

# Load Balancer Configuration
variable "acm_certificate_arn" {
  description = "ACM certificate ARN for ALB HTTPS listener"
  type        = string
}

variable "cloudfront_certificate_arn" {
  description = "ACM certificate ARN for CloudFront (must be in us-east-1)"
  type        = string
}

# Domain Configuration
variable "domain_name" {
  description = "Primary domain name for the application"
  type        = string
}

variable "subdomain_prefixes" {
  description = "Subdomain prefixes for different services"
  type        = map(string)
  default = {
    api    = "api"
    app    = "app"
    admin  = "admin"
    assets = "assets"
  }
}

# Monitoring Configuration
variable "alert_email_addresses" {
  description = "Email addresses for CloudWatch alerts"
  type        = list(string)
  default     = []
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention in days"
  type        = map(number)
  default = {
    development = 7
    staging     = 14
    production  = 30
  }
}

variable "enable_detailed_monitoring" {
  description = "Enable detailed monitoring for resources"
  type        = map(bool)
  default = {
    development = false
    staging     = true
    production  = true
  }
}

# Security Configuration
variable "enable_waf" {
  description = "Enable AWS WAF"
  type        = map(bool)
  default = {
    development = false
    staging     = true
    production  = true
  }
}

variable "enable_guardduty" {
  description = "Enable AWS GuardDuty"
  type        = map(bool)
  default = {
    development = false
    staging     = true
    production  = true
  }
}

variable "enable_security_hub" {
  description = "Enable AWS Security Hub"
  type        = map(bool)
  default = {
    development = false
    staging     = false
    production  = true
  }
}

# Backup Configuration
variable "enable_aws_backup" {
  description = "Enable AWS Backup"
  type        = map(bool)
  default = {
    development = false
    staging     = true
    production  = true
  }
}

variable "backup_schedule" {
  description = "Backup schedule in cron format"
  type        = string
  default     = "cron(0 5 * * ? *)" # Daily at 5 AM UTC
}

# Cost Optimization
variable "enable_cost_optimization" {
  description = "Enable cost optimization features"
  type        = bool
  default     = true
}

variable "use_spot_instances" {
  description = "Use spot instances for non-critical workloads"
  type        = map(bool)
  default = {
    development = true
    staging     = true
    production  = false
  }
}

variable "reserved_instance_type" {
  description = "Type of reserved instances to use"
  type        = string
  default     = "standard"
  validation {
    condition     = contains(["standard", "convertible"], var.reserved_instance_type)
    error_message = "Reserved instance type must be standard or convertible."
  }
}

# Tags
variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# Feature Flags
variable "enable_blue_green_deployment" {
  description = "Enable blue-green deployment strategy"
  type        = bool
  default     = false
}

variable "enable_canary_deployment" {
  description = "Enable canary deployment strategy"
  type        = bool
  default     = true
}

variable "enable_auto_scaling" {
  description = "Enable auto-scaling for all applicable resources"
  type        = bool
  default     = true
}

# Application Configuration
variable "backend_port" {
  description = "Port for backend application"
  type        = number
  default     = 8080
}

variable "frontend_port" {
  description = "Port for frontend application"
  type        = number
  default     = 3000
}

variable "agent_grpc_port" {
  description = "Port for agent gRPC communication"
  type        = number
  default     = 50051
}

# Database Configuration
variable "database_name" {
  description = "Name of the primary database"
  type        = string
  default     = "hpa_db"
}

variable "database_username" {
  description = "Master username for database"
  type        = string
  default     = "hpa_admin"
  sensitive   = true
}

# Scaling Configuration
variable "autoscaling_target_cpu" {
  description = "Target CPU utilization for autoscaling"
  type        = number
  default     = 70
}

variable "autoscaling_target_memory" {
  description = "Target memory utilization for autoscaling"
  type        = number
  default     = 80
}

# Compliance
variable "enable_compliance_mode" {
  description = "Enable compliance mode with additional security controls"
  type        = bool
  default     = false
}

variable "compliance_standards" {
  description = "List of compliance standards to enforce"
  type        = list(string)
  default     = ["SOC2", "GDPR", "HIPAA"]
}

# Disaster Recovery
variable "enable_disaster_recovery" {
  description = "Enable disaster recovery configuration"
  type        = bool
  default     = false
}

variable "dr_region" {
  description = "Disaster recovery region"
  type        = string
  default     = "us-west-2"
}

variable "dr_rpo_minutes" {
  description = "Recovery Point Objective in minutes"
  type        = number
  default     = 60
}

variable "dr_rto_minutes" {
  description = "Recovery Time Objective in minutes"
  type        = number
  default     = 240
}
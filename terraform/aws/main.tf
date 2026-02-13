# ============================================
# Terraform Configuration - AWS
# Workflow Automation Platform Infrastructure
# ============================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.10"
    }
  }

  backend "s3" {
    bucket         = "workflow-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

# ============================================
# Provider Configuration
# ============================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "workflow-automation"
      ManagedBy   = "terraform"
    }
  }
}

# ============================================
# Data Sources
# ============================================

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# ============================================
# VPC and Networking
# ============================================

module "vpc" {
  source = "../modules/networking"

  environment         = var.environment
  vpc_cidr            = var.vpc_cidr
  availability_zones  = data.aws_availability_zones.available.names
  private_subnets     = var.private_subnets
  public_subnets      = var.public_subnets
  enable_nat_gateway  = true
  enable_vpn_gateway  = false
  enable_dns_hostnames = true
  enable_dns_support  = true

  tags = {
    Name = "workflow-vpc-${var.environment}"
  }
}

# ============================================
# EKS Cluster
# ============================================

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "workflow-${var.environment}"
  cluster_version = var.kubernetes_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids

  # Cluster endpoint configuration
  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  # Cluster encryption
  cluster_encryption_config = {
    provider_key_arn = aws_kms_key.eks.arn
    resources        = ["secrets"]
  }

  # EKS Managed Node Groups
  eks_managed_node_groups = {
    general = {
      name           = "general-${var.environment}"
      instance_types = var.node_instance_types
      capacity_type  = "ON_DEMAND"

      min_size     = var.node_min_size
      max_size     = var.node_max_size
      desired_size = var.node_desired_size

      labels = {
        role        = "general"
        environment = var.environment
      }

      tags = {
        Name = "eks-node-general-${var.environment}"
      }
    }

    spot = {
      name           = "spot-${var.environment}"
      instance_types = var.spot_instance_types
      capacity_type  = "SPOT"

      min_size     = 0
      max_size     = 10
      desired_size = 2

      labels = {
        role        = "spot"
        environment = var.environment
      }

      taints = [{
        key    = "spot"
        value  = "true"
        effect = "NoSchedule"
      }]

      tags = {
        Name = "eks-node-spot-${var.environment}"
      }
    }
  }

  # Cluster security group rules
  cluster_security_group_additional_rules = {
    ingress_nodes_ephemeral_ports_tcp = {
      description                = "Nodes on ephemeral ports"
      protocol                   = "tcp"
      from_port                  = 1025
      to_port                    = 65535
      type                       = "ingress"
      source_node_security_group = true
    }
  }

  # Node security group rules
  node_security_group_additional_rules = {
    ingress_self_all = {
      description = "Node to node all ports/protocols"
      protocol    = "-1"
      from_port   = 0
      to_port     = 0
      type        = "ingress"
      self        = true
    }
  }

  tags = {
    Name        = "workflow-eks-${var.environment}"
    Environment = var.environment
  }
}

# ============================================
# KMS Key for EKS Encryption
# ============================================

resource "aws_kms_key" "eks" {
  description             = "EKS Secret Encryption Key"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name = "eks-encryption-key-${var.environment}"
  }
}

resource "aws_kms_alias" "eks" {
  name          = "alias/eks-${var.environment}"
  target_key_id = aws_kms_key.eks.key_id
}

# ============================================
# RDS PostgreSQL Database
# ============================================

module "rds" {
  source = "../modules/database"

  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  database_name      = var.database_name
  master_username    = var.database_username
  master_password    = var.database_password
  instance_class     = var.database_instance_class
  allocated_storage  = var.database_allocated_storage
  engine_version     = var.database_engine_version
  multi_az           = var.database_multi_az
  backup_retention   = var.database_backup_retention

  tags = {
    Name = "workflow-rds-${var.environment}"
  }
}

# ============================================
# ElastiCache Redis
# ============================================

resource "aws_elasticache_subnet_group" "redis" {
  name       = "workflow-redis-subnet-${var.environment}"
  subnet_ids = module.vpc.private_subnet_ids

  tags = {
    Name = "workflow-redis-subnet-${var.environment}"
  }
}

resource "aws_security_group" "redis" {
  name        = "workflow-redis-sg-${var.environment}"
  description = "Security group for Redis cluster"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "workflow-redis-sg-${var.environment}"
  }
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "workflow-redis-${var.environment}"
  replication_group_description = "Redis cluster for workflow platform"

  node_type            = var.redis_node_type
  number_cache_clusters = var.redis_num_cache_nodes
  port                 = 6379
  parameter_group_name = "default.redis7"

  subnet_group_name    = aws_elasticache_subnet_group.redis.name
  security_group_ids   = [aws_security_group.redis.id]

  automatic_failover_enabled = true
  multi_az_enabled          = true

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token_enabled        = true

  snapshot_retention_limit = 5
  snapshot_window         = "03:00-05:00"
  maintenance_window      = "mon:05:00-mon:07:00"

  tags = {
    Name = "workflow-redis-${var.environment}"
  }
}

# ============================================
# S3 Bucket for File Storage
# ============================================

resource "aws_s3_bucket" "uploads" {
  bucket = "workflow-uploads-${var.environment}-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "workflow-uploads-${var.environment}"
  }
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ============================================
# CloudFront CDN
# ============================================

resource "aws_cloudfront_origin_access_identity" "s3" {
  comment = "OAI for workflow uploads"
}

resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CDN for workflow platform static assets"
  default_root_object = "index.html"
  price_class         = "PriceClass_100"

  origin {
    domain_name = aws_s3_bucket.uploads.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.uploads.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.s3.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.uploads.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "workflow-cdn-${var.environment}"
  }
}

# ============================================
# Application Load Balancer
# ============================================

resource "aws_lb" "main" {
  name               = "workflow-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnet_ids

  enable_deletion_protection = var.environment == "production"
  enable_http2              = true
  enable_cross_zone_load_balancing = true

  tags = {
    Name = "workflow-alb-${var.environment}"
  }
}

resource "aws_security_group" "alb" {
  name        = "workflow-alb-sg-${var.environment}"
  description = "Security group for ALB"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "workflow-alb-sg-${var.environment}"
  }
}

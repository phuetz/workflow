# ============================================
# Database Module - RDS PostgreSQL
# ============================================

resource "aws_db_subnet_group" "main" {
  name       = "rds-subnet-${var.environment}"
  subnet_ids = var.subnet_ids

  tags = merge(
    var.tags,
    {
      Name = "rds-subnet-${var.environment}"
    }
  )
}

resource "aws_security_group" "rds" {
  name        = "rds-sg-${var.environment}"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
    description = "PostgreSQL from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "rds-sg-${var.environment}"
    }
  )
}

resource "aws_db_instance" "main" {
  identifier = "workflow-db-${var.environment}"

  # Engine
  engine         = "postgres"
  engine_version = var.engine_version

  # Instance
  instance_class    = var.instance_class
  allocated_storage = var.allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true

  # Database
  db_name  = var.database_name
  username = var.master_username
  password = var.master_password

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # High Availability
  multi_az = var.multi_az

  # Backup
  backup_retention_period = var.backup_retention
  backup_window          = "03:00-04:00"
  maintenance_window     = "mon:04:00-mon:05:00"
  skip_final_snapshot    = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "workflow-db-final-${var.environment}" : null

  # Monitoring
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  performance_insights_enabled    = true
  performance_insights_retention_period = 7

  # Parameter Group
  parameter_group_name = aws_db_parameter_group.main.name

  tags = merge(
    var.tags,
    {
      Name = "workflow-db-${var.environment}"
    }
  )
}

resource "aws_db_parameter_group" "main" {
  name   = "workflow-pg-${var.environment}"
  family = "postgres15"

  parameter {
    name  = "shared_buffers"
    value = "256MB"
  }

  parameter {
    name  = "max_connections"
    value = "200"
  }

  parameter {
    name  = "work_mem"
    value = "4MB"
  }

  tags = merge(
    var.tags,
    {
      Name = "workflow-pg-${var.environment}"
    }
  )
}

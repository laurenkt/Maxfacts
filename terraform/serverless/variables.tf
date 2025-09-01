variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "maxfacts"
}

variable "environment" {
  description = "Environment name (e.g., staging, production)"
  type        = string
  validation {
    condition     = contains(["staging", "production", "dev"], var.environment)
    error_message = "Environment must be one of: dev, staging, production"
  }
}

variable "lambda_package_path" {
  description = "Path to the Lambda deployment package (zip file)"
  type        = string
}

variable "lambda_memory_size" {
  description = "Lambda function memory size in MB"
  type        = number
  default     = 512  # Adjust based on Bleve search index needs
  validation {
    condition     = var.lambda_memory_size >= 128 && var.lambda_memory_size <= 10240
    error_message = "Lambda memory must be between 128 MB and 10240 MB"
  }
}

variable "domain_names" {
  description = "List of domain names for CloudFront distribution"
  type        = list(string)
  default     = []
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for custom domains (must be in us-east-1)"
  type        = string
  default     = null
}

variable "cloudfront_price_class" {
  description = "CloudFront price class for distribution"
  type        = string
  default     = "PriceClass_100" # US, Canada, Europe
  validation {
    condition = contains([
      "PriceClass_All",
      "PriceClass_200",
      "PriceClass_100"
    ], var.cloudfront_price_class)
    error_message = "Invalid CloudFront price class"
  }
}

variable "create_route53_records" {
  description = "Whether to create Route53 records for the domain names"
  type        = bool
  default     = false
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for creating DNS records"
  type        = string
  default     = ""
}
output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_url" {
  description = "CloudFront distribution URL"
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "api_gateway_endpoint" {
  description = "API Gateway endpoint URL"
  value       = aws_apigatewayv2_api.main.api_endpoint
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.app.function_name
}

output "lambda_function_arn" {
  description = "Lambda function ARN"
  value       = aws_lambda_function.app.arn
}

output "static_assets_bucket" {
  description = "S3 bucket name for static assets"
  value       = aws_s3_bucket.static_assets.id
}

output "static_assets_bucket_arn" {
  description = "S3 bucket ARN for static assets"
  value       = aws_s3_bucket.static_assets.arn
}

output "cloudwatch_logs_lambda" {
  description = "CloudWatch Logs group for Lambda function"
  value       = aws_cloudwatch_log_group.app.name
}

output "cloudwatch_logs_api_gateway" {
  description = "CloudWatch Logs group for API Gateway"
  value       = aws_cloudwatch_log_group.api_gw.name
}
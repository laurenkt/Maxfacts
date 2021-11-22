// Private cloud -- logically isolated network
resource "aws_vpc" "maxfacts-vpc" {
  cidr_block = "172.31.0.0/16"

  tags = {
    "application" = "maxfacts"
  }
}

resource "aws_network_acl" "maxfacts-network-acl" {
  vpc_id = aws_vpc.maxfacts-vpc.id

  tags = {
    "application" = "maxfacts"
  }
}

resource "aws_route_table" "maxfacts-route-table" {
  vpc_id = aws_vpc.maxfacts-vpc.id

  tags = {
    "application" = "maxfacts"
  }
}

resource "aws_security_group" "maxfacts-security-group" {
  description = "default VPC security group"
  egress {
    cidr_blocks = ["0.0.0.0/0"]
    from_port   = 0
    protocol    = "-1"
    to_port     = 0
  }
  ingress {
    cidr_blocks = []
    from_port   = 0
    protocol    = "-1"
    self        = true
    to_port     = 0
  }
  // NFS
  ingress {
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
    from_port        = 2049
    protocol         = "tcp"
    to_port          = 2049
  }
  // SSH
  ingress {
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
    from_port        = 22
    protocol         = "tcp"
    to_port          = 22
  }
  // Maxfacts container
  ingress {
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
    from_port        = 3000
    protocol         = "tcp"
    to_port          = 3000
  }
  // HTTPS
  ingress {
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
    from_port        = 443
    protocol         = "tcp"
    to_port          = 443
  }
  // HTTP
  ingress {
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
    from_port        = 80
    protocol         = "tcp"
    to_port          = 80
  }
  // Mongo
  ingress {
    description      = "Mongo"
    ipv6_cidr_blocks = ["::/0"]
    cidr_blocks      = ["0.0.0.0/0"]
    from_port        = 27017
    protocol         = "tcp"
    to_port          = 27017
  }

  timeouts {}
  tags                   = {
    "application" = "maxfacts"
  }
}

resource "aws_vpc_dhcp_options" "maxfacts-dhcp-options" {
  domain_name         = "eu-west-1.compute.internal"
  domain_name_servers = ["AmazonProvidedDNS"]
  tags                = {
    "application" = "maxfacts"
  }
}

resource "aws_s3_bucket" "lt696-testbed" {
  acl = "public-read"
  website {
    error_document = "error.html"
    index_document = "index.html"
  }
}

resource "aws_route53_zone" "maxfacts-route53-zone" {
  name = "maxfacts.uk"

  tags = {
    "application" = "maxfacts"
    classification = "route35"
    subclassification = "hosted_zone"
  }
}

resource "aws_acm_certificate" "maxfacts-certificate" {
  domain_name = "maxfacts.uk"
  subject_alternative_names = ["www.maxfacts.uk", "production.maxfacts.uk", "staging.maxfacts.uk"]
}

resource "aws_alb" "maxfacts-lb" {
  enable_deletion_protection = true
  tags = {
    application = "maxfacts"
    classification = "elb"
    subclassification = "application-load-balancer"
  }
}

resource "aws_alb_listener" "maxfacts-lb-listener-http" {
  load_balancer_arn = aws_alb.maxfacts-lb.arn
  port = 80
  default_action {
    type = "redirect"
    redirect {
      host = "#{host}"
      path = "/#{path}"
      protocol = "HTTPS"
      port = 443
      query = "#{query}"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_alb_target_group" "maxfacts-lb-target-group-https" {
  port = 80
  protocol = "HTTP"
  vpc_id = aws_vpc.maxfacts-vpc.id
  target_type = "ip"
  name = "maxfacts"

  health_check {
    enabled = true
    healthy_threshold = 5
    interval = 30
    matcher = "200"
    path = "/"
    port = "traffic-port"
    protocol = "HTTP"
    timeout = 5
    unhealthy_threshold = 2
  }
}

resource "aws_alb_listener" "maxfacts-lb-listener-https" {
  certificate_arn = aws_acm_certificate.maxfacts-certificate.arn
  load_balancer_arn = aws_alb.maxfacts-lb.arn
  port = 443
  default_action {
    type = "forward"
    target_group_arn = aws_alb_target_group.maxfacts-lb-target-group-https.arn
  }
}

resource "aws_cloudfront_cache_policy" "cache_policy" {
  comment = "Default policy when CF compression is enabled"
  min_ttl = 1
  name    = "Managed-CachingOptimized"
  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

resource "aws_cloudfront_distribution" "s3_distribution" {
  depends_on = [aws_s3_bucket.lt696-testbed]

  origin {
    domain_name = aws_s3_bucket.lt696-testbed.bucket_regional_domain_name
    origin_id   = aws_s3_bucket.lt696-testbed.bucket_regional_domain_name
  }

  enabled         = true
  is_ipv6_enabled = true
  price_class     = "PriceClass_100"

  default_cache_behavior {
    cache_policy_id  = aws_cloudfront_cache_policy.cache_policy.id
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = aws_s3_bucket.lt696-testbed.bucket_regional_domain_name
    compress         = true

    viewer_protocol_policy = "allow-all"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
      locations        = []
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Maxfacts Serverless Deployment Script ===${NC}"

# Find the project root (directory containing main.go)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ ! -f "$PROJECT_ROOT/main.go" ]; then
    echo -e "${RED}Error: Cannot find main.go in expected location: $PROJECT_ROOT${NC}"
    exit 1
fi

echo -e "${YELLOW}Project root: ${PROJECT_ROOT}${NC}"

# Environment
ENVIRONMENT=${1:-staging}
echo -e "${YELLOW}Deploying to environment: ${ENVIRONMENT}${NC}"

# Step 1: Build the Go binary
echo -e "\n${GREEN}Step 1: Building Go binary for Lambda...${NC}"
cd "$PROJECT_ROOT"
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o bootstrap .
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to build Go binary${NC}"
    exit 1
fi

# Step 2: Create Lambda deployment package
echo -e "\n${GREEN}Step 2: Creating Lambda deployment package...${NC}"
rm -f lambda-package.zip
zip -r lambda-package.zip bootstrap data/markdown/ templates/
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to create Lambda package${NC}"
    exit 1
fi
echo -e "${GREEN}Lambda package created: lambda-package.zip ($(du -h lambda-package.zip | cut -f1))${NC}"

# Step 3: Go to terraform directory
cd "$SCRIPT_DIR"

# Step 4: Initialize Terraform if needed
if [ ! -d ".terraform" ]; then
    echo -e "\n${GREEN}Step 3: Initializing Terraform...${NC}"
    terraform init
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to initialize Terraform${NC}"
        exit 1
    fi
else
    echo -e "\n${YELLOW}Terraform already initialized${NC}"
fi

# Step 5: Plan the deployment
echo -e "\n${GREEN}Step 4: Planning Terraform deployment...${NC}"
terraform plan \
    -var="environment=${ENVIRONMENT}" \
    -var="lambda_package_path=${PROJECT_ROOT}/lambda-package.zip" \
    -out=tfplan

if [ $? -ne 0 ]; then
    echo -e "${RED}Terraform plan failed${NC}"
    exit 1
fi

# Step 6: Apply the deployment
echo -e "\n${GREEN}Step 5: Applying Terraform deployment...${NC}"
echo -e "${YELLOW}Applying changes automatically...${NC}"

terraform apply -auto-approve tfplan
if [ $? -ne 0 ]; then
    echo -e "${RED}Terraform apply failed${NC}"
    exit 1
fi

# Step 7: Get outputs
echo -e "\n${GREEN}=== Deployment Complete ===${NC}"
echo -e "${GREEN}CloudFront URL:${NC} $(terraform output -raw cloudfront_url)"
echo -e "${GREEN}Static bucket:${NC} $(terraform output -raw static_assets_bucket)"

# Step 8: Deploy static assets automatically
echo -e "\n${GREEN}Step 6: Deploying static assets...${NC}"
aws s3 sync "${PROJECT_ROOT}/build/static/" s3://$(terraform output -raw static_assets_bucket)/ --delete --cache-control 'public, max-age=31536000'
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to deploy static assets${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Optional next steps:${NC}"
echo "1. Invalidate CloudFront cache (if needed):"
echo "   aws cloudfront create-invalidation --distribution-id $(terraform output -raw cloudfront_distribution_id) --paths '/*'"
echo ""
echo "2. Monitor Lambda logs:"
echo "   aws logs tail $(terraform output -raw cloudwatch_logs_lambda) --follow --region eu-west-2"

# Clean up
rm -f tfplan
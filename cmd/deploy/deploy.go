package deploy

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

func Run(args []string) {
	environment := "staging"
	planOnly := false
	
	// Parse arguments
	for _, arg := range args {
		if strings.HasPrefix(arg, "--env=") {
			environment = strings.TrimPrefix(arg, "--env=")
		} else if arg == "--plan-only" {
			planOnly = true
		}
	}
	
	log.Printf("Deploying to environment: %s", environment)
	if planOnly {
		log.Printf("Plan-only mode: will not apply changes")
	}
	
	// Get project root (directory containing main.go)
	projectRoot, err := os.Getwd()
	if err != nil {
		log.Fatal("Failed to get current directory:", err)
	}
	
	// Verify we're in the right directory
	if _, err := os.Stat(filepath.Join(projectRoot, "main.go")); os.IsNotExist(err) {
		log.Fatal("Error: Cannot find main.go in current directory. Please run from project root.")
	}
	
	// Step 1: Build the Go binary
	log.Printf("Step 1: Building Go binary for Lambda...")
	buildCmd := exec.Command("go", "build", "-o", "bootstrap", ".")
	buildCmd.Env = append(os.Environ(), "GOOS=linux", "GOARCH=amd64", "CGO_ENABLED=0")
	buildCmd.Dir = projectRoot
	buildCmd.Stdout = os.Stdout
	buildCmd.Stderr = os.Stderr
	
	if err := buildCmd.Run(); err != nil {
		log.Fatal("Failed to build Go binary:", err)
	}
	
	// Step 2: Create Lambda deployment package
	log.Printf("Step 2: Creating Lambda deployment package...")
	packageCmd := exec.Command("zip", "-r", "lambda-package.zip", "bootstrap", "data/markdown/", "templates/")
	packageCmd.Dir = projectRoot
	packageCmd.Stdout = os.Stdout
	packageCmd.Stderr = os.Stderr
	
	if err := packageCmd.Run(); err != nil {
		log.Fatal("Failed to create Lambda package:", err)
	}
	
	// Get package size
	if stat, err := os.Stat(filepath.Join(projectRoot, "lambda-package.zip")); err == nil {
		log.Printf("Lambda package created: lambda-package.zip (%s)", formatBytes(stat.Size()))
	}
	
	// Step 3: Change to terraform directory
	terraformDir := filepath.Join(projectRoot, "terraform", "serverless")
	if _, err := os.Stat(terraformDir); os.IsNotExist(err) {
		log.Fatal("Error: terraform/serverless directory not found")
	}
	
	// Step 4: Initialize Terraform if needed
	if _, err := os.Stat(filepath.Join(terraformDir, ".terraform")); os.IsNotExist(err) {
		log.Printf("Step 3: Initializing Terraform...")
		initCmd := exec.Command("terraform", "init")
		initCmd.Dir = terraformDir
		initCmd.Stdout = os.Stdout
		initCmd.Stderr = os.Stderr
		
		if err := initCmd.Run(); err != nil {
			log.Fatal("Failed to initialize Terraform:", err)
		}
	}
	
	// Step 5: Plan the deployment
	log.Printf("Step 4: Planning Terraform deployment...")
	lambdaPackagePath := filepath.Join(projectRoot, "lambda-package.zip")
	
	planCmd := exec.Command("terraform", "plan",
		fmt.Sprintf("-var=environment=%s", environment),
		fmt.Sprintf("-var=lambda_package_path=%s", lambdaPackagePath),
		"-out=tfplan")
	planCmd.Dir = terraformDir
	planCmd.Stdout = os.Stdout
	planCmd.Stderr = os.Stderr
	
	if err := planCmd.Run(); err != nil {
		log.Fatal("Terraform plan failed:", err)
	}
	
	if planOnly {
		log.Printf("Plan completed. Use 'deploy --env %s' to apply changes.", environment)
		return
	}
	
	// Step 6: Apply the deployment
	log.Printf("Step 5: Applying Terraform deployment...")
	applyCmd := exec.Command("terraform", "apply", "-auto-approve", "tfplan")
	applyCmd.Dir = terraformDir
	applyCmd.Stdout = os.Stdout
	applyCmd.Stderr = os.Stderr
	
	if err := applyCmd.Run(); err != nil {
		log.Fatal("Terraform apply failed:", err)
	}
	
	// Step 7: Get outputs
	log.Printf("=== Deployment Complete ===")
	
	// Get CloudFront URL
	cloudfrontCmd := exec.Command("terraform", "output", "-raw", "cloudfront_url")
	cloudfrontCmd.Dir = terraformDir
	if output, err := cloudfrontCmd.Output(); err == nil {
		log.Printf("CloudFront URL: %s", strings.TrimSpace(string(output)))
	}
	
	// Get static bucket
	bucketCmd := exec.Command("terraform", "output", "-raw", "static_assets_bucket")
	bucketCmd.Dir = terraformDir
	if output, err := bucketCmd.Output(); err == nil {
		staticBucket := strings.TrimSpace(string(output))
		log.Printf("Static bucket: %s", staticBucket)
		
		// Step 8: Deploy static assets
		log.Printf("Step 6: Deploying static assets...")
		staticPath := filepath.Join(projectRoot, "build", "static")
		if _, err := os.Stat(staticPath); err == nil {
			syncCmd := exec.Command("aws", "s3", "sync", staticPath, fmt.Sprintf("s3://%s/", staticBucket),
				"--delete", "--cache-control", "public, max-age=31536000")
			syncCmd.Dir = projectRoot
			syncCmd.Stdout = os.Stdout
			syncCmd.Stderr = os.Stderr
			
			if err := syncCmd.Run(); err != nil {
				log.Printf("Warning: Failed to deploy static assets: %v", err)
			}
		} else {
			log.Printf("Warning: Static assets directory not found: %s", staticPath)
		}
	}
	
	// Clean up
	os.Remove(filepath.Join(terraformDir, "tfplan"))
	
	log.Printf("\nOptional next steps:")
	
	// Get distribution ID for cache invalidation
	distCmd := exec.Command("terraform", "output", "-raw", "cloudfront_distribution_id")
	distCmd.Dir = terraformDir
	if output, err := distCmd.Output(); err == nil {
		distID := strings.TrimSpace(string(output))
		log.Printf("1. Invalidate CloudFront cache (if needed):")
		log.Printf("   aws cloudfront create-invalidation --distribution-id %s --paths '/*'", distID)
	}
	
	// Get CloudWatch logs
	logsCmd := exec.Command("terraform", "output", "-raw", "cloudwatch_logs_lambda")
	logsCmd.Dir = terraformDir
	if output, err := logsCmd.Output(); err == nil {
		logsGroup := strings.TrimSpace(string(output))
		log.Printf("2. Monitor Lambda logs:")
		log.Printf("   aws logs tail %s --follow --region eu-west-2", logsGroup)
	}
}

func formatBytes(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}
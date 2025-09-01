# Go Migration Plan for Maxfacts Content Management System

## Project Structure
```
.
├── main.go                 # CLI entry point with commands
├── go.mod                  # Go module file
├── handlers/               # HTTP request handlers
│   ├── content.go         # Main content handler (index, pages)
│   ├── search.go          # Search functionality  
│   ├── sitemap.go         # XML sitemap generation
│   ├── recipes.go         # Recipe browser & display
│   ├── videos.go          # Video page handler
│   └── feedback.go        # Feedback form handler
├── templates/              # Go templates (converted from Handlebars)
│   ├── layouts/           # Base layouts
│   ├── partials/          # Reusable template fragments
│   └── *.gohtml           # Individual page templates
├── data/                   # File-based content storage
│   └── markdown/          # Markdown content files
│       ├── content/       # Individual page files ({id}.md)
│       ├── recipes/       # Recipe files ({id}.md)
│       └── videos/        # Video metadata files ({id}.md)
├── static/                 # Static assets (CSS, JS, images)
└── pkg/                    # Shared utilities & package-level repositories
    ├── content/           # Package-level content operations
    ├── recipe/            # Package-level recipe operations
    ├── video/             # Package-level video operations
    ├── repository/        # Domain models & repository interfaces
    ├── mongodb/           # MongoDB repository implementations (optional)
    ├── markdown/          # Markdown parsing & file-based repositories
    └── template/          # Template helpers & functions
```

## Migration Overview

This document tracks the ongoing migration of the Maxfacts medical content management system from a Node.js/MongoDB application to a standalone Go binary. The migration maintains identical functionality while enabling simpler deployment and better performance.

### Original System (Node.js)
- **Express.js** web framework with Handlebars templating
- **MongoDB** with Mongoose ODM for content storage
- **Admin dashboard** for content editing and management
- **Complex deployment** requiring Node.js, MongoDB, and various services
- **Asset pipeline** using Gulp, Webpack, and SCSS compilation

### Target System (Go)
- **Standalone binary** with embedded templates and static assets
- **File-based storage** using Markdown with YAML frontmatter
- **Optional MongoDB** connectivity for legacy compatibility
- **Simple deployment** requiring only the binary and data files
- **Built-in asset serving** without external build tools

## Current Implementation Status

### ✅ **Completed Components**
- **Content display system** - All public pages working identically to Node.js version
- **Search functionality** - Bleve-based full-text search with rate limiting
- **Recipe browser** - Complete recipe display and browsing functionality
- **Video playback** - Multipart video pages with metadata
- **Sitemap generation** - XML sitemap with proper priorities and dates
- **Template system** - Go templates producing identical HTML output
- **Static file serving** - CSS, JS, images served from filesystem
- **Package-level APIs** - Clean interfaces for all data operations
- **Comprehensive testing** - Comparison tests against Node.js reference
- **In-memory indexing** - Fast URI-to-ID lookups built from markdown files
- **Admin dashboard** - Complete content management interface with Slate.js editor

### 🚧 **Remaining Components**
- **Dashboard authentication** - Google OAuth integration (currently disabled via -dashboard flag)
- **Dashboard image management** - Upload and management interface
- **Dashboard video management** - Upload and management interface
- **Dashboard user management** - User permissions and account management
- **Production deployment** - Docker configuration, CI/CD, environment management
- **Static asset pipeline** - SCSS compilation, JavaScript bundling, image optimization

## CLI Commands

The Go application is structured as a CLI with subcommands:

### Available Commands

```bash
# Start the HTTP server (default: file-based mode)
go run . serve

# Start the HTTP server with MongoDB support
go run . serve --use-mongo

# Start the HTTP server with admin dashboard enabled
go run . serve -dashboard

# Export all pages from MongoDB to markdown files
go run . dump-mongo

# Show help
go run .
```

### Command Details

**`serve [--use-mongo] [-dashboard]`** - Starts the HTTP server
- **Default mode**: File-based operation using markdown files
  - Reads from `data/markdown/` directory
  - Uses Bleve for search indexing
  - No database connection required
- **`--use-mongo` flag**: Enables MongoDB connectivity
  - Uses `MONGO_URI` environment variable
  - Falls back to file-based mode if connection fails
- **`-dashboard` flag**: Enables admin dashboard at `/dashboard`
  - Content editing with Slate.js rich text editor
  - Directory management with broken link detection
  - Content creation, editing, and deletion
  - Authentication disabled for development
- Uses `PORT` environment variable (defaults to 3000)

**`dump-mongo`** - Exports MongoDB data to markdown files
- Uses `MONGO_URI` environment variable (defaults to localhost:27017/maxfacts)
- Creates `data/markdown/content/`, `data/markdown/recipes/`, `data/markdown/videos/` directories
- Exports each item as `{id}.md` with YAML frontmatter including URI metadata
- Handles complex data structures and preserves all metadata

## Data Storage Architecture

The application uses a file-based storage system with optional MongoDB connectivity.

### File-based Storage (Default)
- **Markdown files** with YAML frontmatter store all content metadata including URIs
- **In-memory indexes** built by scanning markdown files for fast URI-to-ID lookups
- **Directory structure**: `data/markdown/content/`, `data/markdown/recipes/`, `data/markdown/videos/`
- **Auto-initialization** by scanning markdown directories on startup
- **Bleve search** provides in-memory full-text search capabilities

### Content Organization
- **Content pages**: Individual `.md` files with semantic IDs
- **Recipes**: Structured markdown with ingredients and instructions  
- **Videos**: Metadata files referencing video assets
- **Static assets**: Served from `static/` directory

### Benefits
- **Version control friendly** - all content can be tracked in Git
- **No external dependencies** - runs without database
- **Fast startup** - no database connection overhead
- **Simple deployment** - single binary + file directory
- **Easy backup/restore** - standard file operations

## Migration Principles
- **Identical public functionality** - all user-facing features work exactly as before
- **URL compatibility** - maintains exact same routes and parameters as original
- **Template fidelity** - Go templates produce identical output to original Handlebars
- **Backward compatibility** - optional MongoDB support maintained during transition
- **Incremental migration** - components can be migrated independently
- **Testing-driven** - comparison tests ensure functional equivalence
- **Performance improvement** - faster startup, lower resource usage
- **Deployment simplification** - reduce infrastructure complexity

## Testing Strategy

### Automated Comparison Testing
The Go version includes comprehensive comparison tests that validate output against the running Node.js version:

**Test Setup (`comparison_test.go`)**:
- Runs the Go server locally using test handler
- Compares responses against a reference Node.js server (default: `http://localhost:8080`)
- Uses environment variables for configuration:
  - `MONGO_URI`: MongoDB connection string
    - Default: `localhost:27017/maxfacts`
    - For Docker: `MONGO_URI=mongo:27017/maxfacts` (uses Docker service name)
    - For remote: `MONGO_URI=mongodb://username:password@host:port/database`
  - `REFERENCE_URL`: Node.js server URL for comparison (default: `http://localhost:8080`)

**Test Modes**:
The test suite supports three different modes via command-line flags:

1. **Default Mode** (no flags) - Tests only configured endpoints (fast):
   ```bash
   MONGO_URI=localhost:27017/maxfacts go test .
   ```

2. **All URLs Mode** (`-all`) - Tests all URLs from sitemap (comprehensive):
   ```bash
   MONGO_URI=localhost:27017/maxfacts go test . -all
   ```

3. **Single URL Mode** (`-only`) - Tests a specific URL (debugging):
   ```bash
   MONGO_URI=localhost:27017/maxfacts go test . -only /help
   MONGO_URI=localhost:27017/maxfacts go test . -only /help/oral-food/recipes/butternut-squash-mousse
   ```

**Test Coverage**:
1. **Configured Endpoints** (default mode):
   - Homepage (`/`)
   - Key content pages (`/diagnosis/tests`, `/diagnosis/a-z/cancer/mouth-cancer`)
   - Recipe index (`/help/oral-food/recipes`)
   - Video page (`/help/physiotherapy/videos/tmj`)
   - Sitemap (`/map.xml`)
   - Feedback pages
   - 404 error page
   - Specific recipes for edge case testing

2. **All URLs** (with `-all` flag):
   - Every content page in the database
   - All recipes (100+ URLs)
   - All video pages
   - Complete sitemap validation

3. **Binary Endpoints** - Compares binary responses:
   - Static files (`/favicon.ico`)
   - Images (`/images/circle-scaled.png`)

**Running Tests**:
```bash
# Quick test of key endpoints
MONGO_URI=localhost:27017/maxfacts go test -v .

# Test all URLs (takes ~1 minute)
MONGO_URI=localhost:27017/maxfacts go test -v . -all

# Debug a specific failing URL
MONGO_URI=localhost:27017/maxfacts go test -v . -only /help/oral-food/recipes/bean-salad-with-yogurt-dressing

# With custom reference URL
REFERENCE_URL=http://production.site.com MONGO_URI=localhost:27017/maxfacts go test .
```

**Test Implementation**:
- Uses `gohtmldiff` for intelligent HTML comparison (ignores whitespace differences)
- Normalizes HTML output before comparison
- Validates both content and HTTP status codes
- Binary files compared byte-for-byte
- Includes health checks for all endpoints

## Package-Level API

The application uses simple package-level functions for all data operations:

### Content Operations
```go
content.FindOne(ctx, uri)      // Find single content by URI
content.FindAll(ctx)           // Get all content items
content.GetBreadcrumbs(ctx, content)  // Generate navigation breadcrumbs
content.Search(ctx, query)     // Full-text search with Bleve
```

### Recipe Operations  
```go
recipe.FindOne(ctx, uri)       // Find single recipe
recipe.FindAll(ctx)            // Get all recipes
recipe.WriteOne(ctx, recipe)   // Export recipe to markdown
```

### Video Operations
```go
video.FindOne(ctx, uri)        // Find single video
video.FindAll(ctx)             // Get all videos
video.WriteOne(ctx, video)     // Export video metadata
```

### Configuration
- **Auto-initialization**: Packages auto-configure by scanning markdown directories on startup
- **Zero configuration**: Works out-of-the-box with file-based storage
- **Optional MongoDB**: Can be enabled via configuration functions when needed

## Remaining Migration Tasks

### 1. Admin Dashboard Migration
The Node.js application includes a comprehensive admin interface that needs to be migrated:

**Current Node.js Dashboard Features:**
- Content editing with rich text editor (Slate.js)
- User management and authentication (Google OAuth restricted to @york.ac.uk)
- Image upload and management
- Video upload and management
- Content validation and broken link detection
- User permissions and content authorship tracking

**Migration Approach:**
- **Option A**: Migrate dashboard to Go with embedded web interface
- **Option B**: Keep Node.js dashboard as separate admin service
- **Option C**: Develop new admin interface (web or CLI-based)

### 2. Production Deployment Infrastructure
Current Node.js deployment needs to be replicated/replaced:

**Existing Infrastructure:**
- **Docker Compose** setup with Node.js app, MongoDB, Nginx
- **AWS deployment** (EC2, S3, CloudFront, Route53)
- **Terraform** infrastructure as code
- **Environment management** for staging vs production

**Go Deployment Requirements:**
- **Binary distribution** strategy (single executable vs. container)
- **Data synchronization** between admin system and Go binary
- **Static asset management** and CDN integration
- **Health monitoring** and logging setup
- **SSL/TLS termination** and domain configuration

**✅ Implemented: AWS Serverless Deployment**

A complete serverless infrastructure has been implemented using:
- **CloudFront** for global content delivery
- **S3** for static assets (CSS, JS, images)
- **API Gateway HTTP API** + **Lambda** for dynamic content
- **AWS Lambda Web Adapter** to run the standard Go HTTP server
- **Terraform** for infrastructure as code

See "AWS Serverless Deployment" section below for deployment instructions.

### 3. Static Asset Pipeline
The Node.js application uses a complex build system that needs replacement:

**Current Node.js Asset Pipeline:**
- **Gulp** for task automation
- **Webpack** for JavaScript bundling (React components)
- **SCSS/Sass** compilation with Bourbon framework
- **Image optimization** and processing
- **Client-side React components**: Magic Triangle, Recipe Browser, Rich Text Editor

**Go Asset Strategy:**
- **Option A**: Pre-build assets and embed in Go binary
- **Option B**: Build assets during CI/CD and serve separately
- **Option C**: Migrate JavaScript components to server-side rendering

## Implementation Notes

### Architecture Benefits
- **Simplified design**: Package-level functions eliminate complex dependency injection
- **Clean handlers**: No constructor parameters or repository fields needed
- **Flexible configuration**: Can mix file-based and database backends as needed
- **Easy testing**: Global configuration simplifies test setup
- **Fast startup**: File-based mode starts instantly without database connections

### Template System
- **Go templates** converted from original Handlebars templates
- **Template functions** replicate original helper behavior exactly:
  - `shift_headers` - adjusts heading levels
  - `toJSON` - JSON serialization  
  - `date` - date formatting
  - `lookup` - map lookups
- **Identical output** - preserves all HTML structure and CSS classes

### Search Implementation
- **Bleve full-text search** with weighted scoring (Title: 3x, Description: 2x, Body: 1x)
- **In-memory indexing** builds in ~1 second on first search
- **Lazy initialization** prevents slow server startup
- **Rate limiting** - 20 requests per 30 minutes
- **Graceful degradation** when search unavailable

### In-Memory Index Architecture
- **Direct file scanning** - Indexes built by reading markdown frontmatter on startup
- **No CSV dependencies** - Eliminated all intermediate index files 
- **Fast initialization** - URI-to-ID mappings built in memory instantly
- **Consistent with search** - Same pattern as Bleve search indexing
- **Zero configuration** - Auto-detects content directories and builds indexes
- **Efficient lookups** - Hash-based O(1) URI resolution performance

## AWS Serverless Deployment

The Go binary is deployed as a serverless application using CloudFront + S3 (static assets) and API Gateway + Lambda (dynamic content).

### Prerequisites

1. AWS CLI configured with appropriate credentials
2. Terraform installed
3. Go 1.21+ for building the binary
4. Compiled static assets in `build/static/` directory

### Deployment

```bash
cd terraform/serverless
terraform init  # first time only
./deploy.sh staging
```

The deployment script:
1. Builds the Go binary for Lambda
2. Creates deployment package with templates and markdown data
3. Deploys infrastructure via Terraform
4. Uploads static assets to S3
5. Outputs the CloudFront URL

### Important Implementation Details

The Go binary auto-detects Lambda environment and starts automatically:
```go
if _, exists := os.LookupEnv("AWS_LAMBDA_RUNTIME_API"); exists {
    serveCommand([]string{})
}
```

CloudFront must NOT forward the Host header to API Gateway to avoid 403 errors.

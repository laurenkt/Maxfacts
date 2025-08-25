# Go Migration Plan for Maxfacts Content Display

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
│   └── videos.go          # Video page handler
├── models/                 # Legacy MongoDB models (Node.js compatibility)
│   ├── content.go         # Content model with methods
│   ├── recipe.go          # Recipe model
│   └── video.go           # Video model
├── templates/              # Go templates (converted from Handlebars)
│   ├── layouts/           # Base layouts
│   ├── partials/          # Reusable template fragments
│   └── *.gohtml           # Individual page templates
├── data/                   # File-based content storage
│   └── markdown/          # Markdown content files
│       ├── content/       # Individual page files ({id}.md)
│       └── index_uri.csv  # URI-to-ID mapping index
└── pkg/                    # Shared utilities & package-level repositories
    ├── content/           # Package-level content operations (UseMarkdown/UseMongo)
    ├── recipe/            # Package-level recipe operations (UseMongo)
    ├── video/             # Package-level video operations (UseMongo)
    ├── repository/        # Domain models & repository interfaces
    ├── mongodb/           # MongoDB repository implementations
    ├── markdown/          # Markdown parsing & file-based repositories
    ├── htmlutil/          # HTML processing (sanitization, link extraction)
    └── template/          # Template helpers & functions

```

## Implementation Steps

### Phase 1: Core Setup & Models
1. **Initialize Go module and dependencies**
   - `go mod init github.com/maxfacts/maxfacts`
   - Add MongoDB driver: `go.mongodb.org/mongo-driver`
   - Add HTML parser: `golang.org/x/net/html`
   - Uses Go standard library `net/http.ServeMux` (no third-party router needed)

2. **Create MongoDB connection layer**
   - Connection to existing MongoDB using connection string
   - Context management for queries
   - Read from existing collections without modification

3. **Implement repository pattern** ✓ **COMPLETE**
   - Repository interfaces for Content, Recipe, Video data access
   - MongoDB repository implementations with all business logic
   - Markdown repository implementations for file-based content
   - Domain models shared across repository implementations
   - Package-level functions replacing dependency injection:
     - `content.FindOne()`, `content.FindAll()`, `content.GetBreadcrumbs()`, `content.GetChildren()`
     - `recipe.FindOne()`, `recipe.FindAll()`, `video.FindOne()`, `video.FindAll()`
     - Configuration via `content.UseMarkdown()`, `recipe.UseMongo()`, etc.

### Phase 2: Template Migration
1. **Convert Handlebars to Go templates**
   - Create template functions to replace Handlebars helpers:
     - `shift_headers` - adjust heading levels
     - `toJSON` - JSON serialization
     - `date` - date formatting
     - `lookup` - map lookups
   - Convert partials to Go template includes
   - Maintain exact HTML output structure

2. **Template structure**
   - Base layouts (main.gohtml, home.gohtml)
   - Content templates (page, directory, level1/2/3, alphabetical)
   - Search & sitemap templates
   - Recipe templates

### Phase 3: HTTP Handlers
1. **Content handler** (`/` and `/:uri(*)`): ✓ **COMPLETE - FILE-BASED**
   - ✓ Home page with 3 pillars (diagnosis, treatment, help)
   - ✓ URI-based content lookup from markdown files
   - ✓ Directory browsing with menu generation
   - ✓ Breadcrumb & navigation generation
   - ✓ Placeholder content for empty pages
   - ✓ Next page navigation (level1 → level2 → level3)
   - **Uses embedded CSV index and markdown files, no MongoDB**

2. **Search handler** (`/search`) ✓ **COMPLETE - PACKAGE-BASED**
   - Uses `content.Search()` for MongoDB text search with weights
   - Extract matching paragraphs with `content.GetMatchedParagraph()`
   - Generate breadcrumbs with `content.GetBreadcrumbs()`
   - Preserve rate limiting logic

3. **Sitemap handler** (`/map.xml`) ✓ **COMPLETE - PACKAGE-BASED**
   - Uses `content.FindAll()`, `recipe.FindAll()`, `video.FindAll()` 
   - Content from markdown files (sorted by URI), recipes/videos from MongoDB
   - Calculate priorities based on depth with proper URI sorting
   - Generate XML with proper lastmod dates from repository timestamps

4. **Recipe handlers** ✓ **COMPLETE - PACKAGE-BASED**
   - Index page with `recipe.FindAll()` from MongoDB
   - Browser with all recipes sorted by title
   - Individual recipe display with `recipe.FindOne()`

5. **Video handler** ✓ **COMPLETE - PACKAGE-BASED**
   - Multipart video display using `video.FindOne()`
   - Breadcrumb generation via `content.FindOne()` integration

### Phase 4: Utility Functions
1. **HTML processing**
   - Link extraction from HTML
   - Heading ID generation
   - URI normalization (lowercase, dashes, etc.)

2. **Static file serving**
   - CSS, JS, images from `static/`
   - Preserve exact paths for compatibility

## CLI Commands

The Go application is structured as a CLI with subcommands:

### Available Commands

```bash
# Start the HTTP server
go run . serve

# Export all pages to markdown files
go run . dump-mongo

# Show help
go run .
```

### Command Structure
- **`serve`** - Starts the HTTP server on the configured port
  - Uses `PORT` environment variable (defaults to 3000)
  - Uses `MONGO_URI` environment variable (defaults to localhost:27017/maxfacts)
  - Identical functionality to the original server

- **`dump-mongo`** - Exports all content pages to markdown files and creates CSV index
  - Uses `MONGO_URI` environment variable (defaults to localhost:27017/maxfacts)
  - Creates `data/markdown/content/` directory
  - Exports each page as `{page_id}.md` with YAML frontmatter
  - Includes all content metadata (title, URI, type, description, etc.)
  - Creates `data/markdown/index_uri.csv` with ordered URI-to-ID mapping

### Future Commands
The CLI structure allows for easy addition of new commands such as:
- Database migration commands
- Content validation tools
- Static site generation
- Development utilities

## MongoDB to Markdown Migration Strategy

The long-term goal is to eliminate the MongoDB dependency by transitioning to a file-based content system using Markdown files with YAML frontmatter and CSV indexes.

### Phase 1: Export System (✓ Complete)
- **`dump-mongo` command** exports all content from MongoDB to local files
- **Markdown files** with YAML frontmatter preserve all metadata (`data/markdown/content/{id}.md`)
- **CSV index** provides fast URI-to-ID lookup (`data/markdown/index_uri.csv`)
- **Sorted by URI** for deterministic, consistent ordering

### Phase 2: Hybrid System (✓ Complete)
- **Embedded CSV index** using `//go:embed` to include `index_uri.csv` in binary
- **Content handler** reads from markdown files instead of MongoDB
- **Frontmatter parser** to extract metadata from YAML headers
- **File-based content lookup** with CSV index for URI resolution
- **Complete content functionality**:
  - ✓ Individual page loading from markdown files
  - ✓ Home page with directory listings (diagnosis, treatment, help)
  - ✓ Breadcrumb navigation (excluding current page)
  - ✓ Next page navigation (level1 → level2 → level3)
  - ✓ Placeholder content for empty pages ("coming-soon")
  - ✓ Directory and alphabetical page types
  - ✓ Further reading cross-references
- **Other handlers use MongoDB** - recipes, search, videos via package functions

### Phase 3: Full File-based System (Future)
- **Search functionality** using file-based indexing instead of MongoDB text search
- **Recipe and video data** exported to similar file structures
- **Complete MongoDB removal** from the application
- **Static deployment** capability without database dependency

### Benefits of File-based Approach
- **Version control** - content can be tracked in Git
- **No database dependency** - simpler deployment and development
- **Faster startup** - no database connection required
- **Better caching** - files can be embedded in binary or served statically
- **Easier backup/restore** - standard file system operations

## Key Considerations
- **No changes to MongoDB data** - read-only access during migration
- **Identical HTML output** - preserve all CSS classes, structure
- **Preserve JavaScript** - directory.hbs has positioning JS that must work
- **URL compatibility** - exact same routes and parameters
- **Template functions** - must produce identical output to Handlebars helpers
- **CLI extensibility** - Easy to add new commands for additional functionality
- **Backwards compatibility** - maintain MongoDB support during transition

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

### Manual Testing Checklist
1. **Visual Comparison**:
   - Side-by-side browser windows
   - Check styling and layout consistency
   - Verify JavaScript functionality (directory page positioning)

2. **Navigation Testing**:
   - Breadcrumb links work correctly
   - Next page suggestions match
   - Directory listings in correct order

3. **Search Functionality**:
   - Results match between versions
   - Search highlighting works
   - Rate limiting behaves identically

4. **Content Validation**:
   - Recipe sorting by title (not URI)
   - Last modified dates in sitemap
   - Priority calculations in sitemap

### Implementation Status
1. ✓ **File-based Content System** - Complete migration from MongoDB to markdown files
   - ✓ Content handler reads from markdown files with YAML frontmatter
   - ✓ CSV index embedded in binary via `//go:embed`
   - ✓ All navigation features working (breadcrumbs, next page, directories)
   - ✓ Placeholder content system using "coming-soon" page
   - ✓ Comprehensive test coverage passing

2. ✓ **Recently Fixed Differences**:
   - ✓ Recipe ordering in sitemap - Both now sort by title
   - ✓ Date formatting in sitemap - Fixed month indexing (added +1) in Node.js
   - ✓ Recipe UpdatedAt fallback - Added to Go FindAll method
   - ✓ Timezone format - Changed to use +00:00 for UTC in both versions
   - ✓ Breadcrumb ID format - Uses semantic content IDs instead of MongoDB ObjectIDs

### Current Architecture
- **Content Pages**: 100% file-based via `content.UseMarkdown()` ✓
- **Recipes**: MongoDB-based via `recipe.UseMongo()` ✓
- **Search**: MongoDB-based via `content.Search()` (uses MongoDB backend) ✓ 
- **Videos**: MongoDB-based via `video.UseMongo()` ✓
- **Sitemaps**: Mixed - content from markdown, recipes/videos from MongoDB ✓
- **Package-Level Functions**: Simplified access without dependency injection ✓

### Phase 4: Package-Level Repository Simplification (✓ Complete)
The Go version now implements simplified package-level access instead of complex dependency injection:

1. **Package-Level Functions** (`pkg/content/`, `pkg/recipe/`, `pkg/video/`):
   - `content.FindOne()`, `content.FindAll()`, `content.GetBreadcrumbs()` - content operations
   - `content.Search()` - search operations (MongoDB backend only)
   - `content.WriteOne()`, `content.WriteIndex()` - write operations
   - `recipe.FindOne()`, `recipe.FindAll()` - recipe operations
   - `video.FindOne()`, `video.FindAll()` - video operations
   - Configuration via `content.UseMarkdown()`, `recipe.UseMongo()`, `video.UseMongo()`

2. **Internal Repository Pattern**:
   - Repository interfaces split into `ContentReader` and `ContentWriter` for separation of concerns
   - `ContentRepository` combines both for backwards compatibility
   - MongoDB implementations for all data types (panics on write operations)
   - Markdown implementation for content reading, separate `ContentWriter` for writing
   - Package functions route to appropriate internal repository

3. **Handler Simplification**:
   - No constructor parameters - handlers use `NewContentHandler()` instead of `NewContentHandler(repo1, repo2, db)`
   - No repository fields in handler structs
   - Direct package function calls: `content.FindOne()` instead of `h.contentRepo.FindOne()`

4. **Configuration Model**:
   - **Legacy functions** (for backwards compatibility):
     - `content.UseMarkdown(indexCSV)` - configures both reader and writer for markdown
     - `content.UseMongo(db)` - configures both reader and writer for MongoDB
   - **New separated functions** (for flexible configuration):
     - `content.UseMarkdownReader(indexCSV)` - read from markdown files
     - `content.UseMongoReader(db)` - read from MongoDB
     - `content.UseMarkdownWriter(outputDir)` - write to markdown files
     - `content.UseMongoWriter(db)` - write to MongoDB (panics on any write)
   - `recipe.UseMongo(db)` - recipes always use MongoDB
   - `video.UseMongo(db)` - videos always use MongoDB

5. **Benefits Achieved**:
   - **Simplified architecture** - no complex dependency injection
   - **Cleaner code** - direct function calls instead of method chains
   - **Better defaults** - markdown content by default, explicit MongoDB where needed
   - **Flexible configuration** - can mix readers and writers (e.g., read from MongoDB, write to markdown)
   - **Easier testing** - global configuration makes test setup simpler
   - **Same flexibility** - can still switch backends via configuration functions

6. **dump-mongo Command Refactoring**:
   - Reduced from ~90 lines to ~40 lines of code
   - Uses separated configuration: `content.UseMongoReader(db)` + `content.UseMarkdownWriter(outputDir)`
   - All file I/O and conversion logic moved to `pkg/markdown/content_writer.go`
   - Cleaner separation of concerns between CLI and business logic

This simplification reduces complexity while preserving all functionality and maintaining the hybrid markdown/MongoDB architecture.

# Go Migration Plan for Maxfacts Content Display

## Project Structure
```
.
├── main.go                 # Entry point with HTTP server
├── go.mod                  # Go module file
├── handlers/               # HTTP request handlers
│   ├── content.go         # Main content handler (index, pages)
│   ├── search.go          # Search functionality
│   ├── sitemap.go         # XML sitemap generation
│   ├── recipes.go         # Recipe browser & display
│   └── videos.go          # Video page handler
├── models/                 # MongoDB models & queries
│   ├── content.go         # Content model with methods
│   ├── recipe.go          # Recipe model
│   ├── video.go           # Video model
│   └── image.go           # Image model (for link validation)
├── templates/              # Go templates (converted from Handlebars)
│   ├── layouts/           # Base layouts
│   ├── partials/          # Reusable template fragments
│   └── *.gohtml           # Individual page templates
└── pkg/                    # Shared utilities
    ├── mongodb/           # MongoDB connection & helpers
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

3. **Implement data models**
   - Content model with all fields (uri, title, body, type, etc.)
   - Recipe, Video, Image models
   - Port key methods:
     - `getBreadcrumbs()` - build lineage from URI
     - `getChildren()` - find sub-pages
     - `getNextPage()` - navigation logic
     - `getInvalidLinks()` - link validation
     - `getMatchedParagraph()` - search result excerpts

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
1. **Content handler** (`/` and `/:uri(*)`)
   - Home page with 3 pillars (diagnosis, treatment, help)
   - URI-based content lookup
   - Directory browsing with menu generation
   - Breadcrumb & navigation generation
   - Placeholder content for empty pages

2. **Search handler** (`/search`)
   - MongoDB text search with weights
   - Extract matching paragraphs with context
   - Generate breadcrumbs for results
   - Preserve rate limiting logic

3. **Sitemap handler** (`/map.xml`)
   - Gather all content, videos, recipes
   - Calculate priorities based on depth
   - Generate XML with proper lastmod dates

4. **Recipe handlers**
   - Index page
   - Browser with all recipes
   - Individual recipe display

5. **Video handler**
   - Multipart video display
   - Breadcrumb generation

### Phase 4: Utility Functions
1. **HTML processing**
   - Link extraction from HTML
   - Heading ID generation
   - URI normalization (lowercase, dashes, etc.)

2. **Static file serving**
   - CSS, JS, images from `static/`
   - Preserve exact paths for compatibility

## Key Considerations
- **No changes to MongoDB data** - read-only access
- **Identical HTML output** - preserve all CSS classes, structure
- **Preserve JavaScript** - directory.hbs has positioning JS that must work
- **URL compatibility** - exact same routes and parameters
- **Template functions** - must produce identical output to Handlebars helpers

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

### Recently Fixed Differences
1. ✓ Recipe ordering in sitemap - Both now sort by title
2. ✓ Date formatting in sitemap - Fixed month indexing (added +1) in Node.js
3. ✓ Recipe UpdatedAt fallback - Added to Go FindAll method
4. ✓ Timezone format - Changed to use +00:00 for UTC in both versions

This migration preserves all display functionality while removing CMS, authentication, and admin features as requested.

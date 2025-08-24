# Go Migration for Maxfacts

This directory now contains a Go implementation of the Maxfacts content display functionality, migrated from Node.js/Express.

## What's Included

The Go version implements these features from the original Node.js app:

- **Content serving**: Displays pages, directories, and hierarchical content
- **Search functionality**: MongoDB text search with result highlighting  
- **Sitemap generation**: XML sitemap with all content, videos, and recipes
- **Recipe browser**: Display individual recipes and recipe listing
- **Video display**: Multipart video player support

## What's NOT Included

The Go version intentionally excludes:

- Admin dashboard and CMS features
- User authentication and access control
- Content editing functionality
- Magic Triangle interactive tool (client-side JavaScript)
- Feedback system and email functionality

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
│   ├── image.go           # Image model (for link validation)
│   └── option.go          # System options
├── templates/              # Go templates (converted from Handlebars)
│   ├── layouts/           # Base layouts
│   ├── partials/          # Reusable template fragments
│   └── *.gohtml           # Individual page templates
└── pkg/                    # Shared utilities
    ├── mongodb/           # MongoDB connection & helpers
    └── template/          # Template helpers & functions
```

## Running the Go Version

1. **Install Go 1.22 or later**

2. **Set environment variables**:
   ```bash
   export MONGO_URI="localhost:27017/maxfacts"
   export PORT="3000"
   ```

3. **Install dependencies**:
   ```bash
   go mod tidy
   ```

4. **Build and run**:
   ```bash
   go build -o maxfacts .
   ./maxfacts
   ```

   Or run directly:
   ```bash
   go run .
   ```

## Features Preserved

- **Identical HTML output**: Templates produce the same HTML structure as Handlebars
- **Same URLs**: All routes and parameters work identically
- **MongoDB compatibility**: Reads from existing MongoDB collections without changes
- **CSS/JS compatibility**: All existing styles and client-side JavaScript work
- **Search functionality**: Full-text search with result highlighting
- **Breadcrumb navigation**: Hierarchical navigation preserved
- **Content types**: All content types (page, directory, level1/2/3, alphabetical) supported

## Template Conversion

Handlebars templates were converted to Go templates with equivalent helpers:

- `{{shift_headers}}` → Custom Go function for adjusting heading levels
- `{{date}}` → Date formatting function  
- `{{toJSON}}` → JSON serialization
- `{{lookup}}` → Map lookup function
- Partials → Go template includes

## MongoDB Collections Used

- `contents` - Main content pages
- `recipes` - Recipe data
- `videos` - Video information
- `images` - Image metadata (for link validation)
- `options` - System configuration

## Performance Notes

- MongoDB queries use indexes for text search
- Template compilation is cached
- Rate limiting implemented for search
- Static file serving optimized

The Go version provides better performance and easier deployment compared to the Node.js version while maintaining full compatibility with the existing database and frontend assets.
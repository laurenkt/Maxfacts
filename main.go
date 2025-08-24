package main

import (
	"cmp"
	"context"
	"encoding/csv"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/maxfacts/maxfacts/handlers"
	"github.com/maxfacts/maxfacts/models"
	"github.com/maxfacts/maxfacts/pkg/mongodb"
	"go.mongodb.org/mongo-driver/mongo"
)


// staticFileHandler creates a handler that checks for static files first
func staticFileHandler(nextHandler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Only check for static files on GET requests
		if r.Method == http.MethodGet {
			path := r.URL.Path
			staticDirs := []string{
				"./static",
				"./build/static",
			}
			
			// Add STATIC_FS if set
			if staticFSPath := os.Getenv("STATIC_FS"); staticFSPath != "" {
				staticDirs = append(staticDirs, staticFSPath)
			}
			
			// Try to serve from each directory
			for _, dir := range staticDirs {
				filePath := filepath.Join(dir, path)
				
				// Check if file exists and is not a directory
				if fileInfo, err := os.Stat(filePath); err == nil && !fileInfo.IsDir() {
					log.Printf("[STATIC] Serving %s from %s", path, dir)
					http.ServeFile(w, r, filePath)
					return
				}
			}
		}
		
		// File not found, continue with next handler
		nextHandler(w, r)
	}
}

// SetupRouter creates and configures the application router
func SetupRouter(db *mongo.Database, indexCSV string) http.Handler {
	mux := http.NewServeMux()

	// Initialize handlers - content handler uses markdown, others use MongoDB
	contentHandler := handlers.NewContentHandler(db, "data/markdown/content", indexCSV)
	searchHandler := handlers.NewSearchHandler(db)
	sitemapHandler := handlers.NewSitemapHandler(db)
	recipeHandler := handlers.NewRecipeHandler(db)
	videoHandler := handlers.NewVideoHandler(db)
	feedbackHandler := handlers.NewFeedbackHandler(db)

	// Register specific routes first
	mux.HandleFunc("GET /search", logHandler("Search", searchHandler.Search))
	mux.HandleFunc("GET /map.xml", logHandler("Sitemap", sitemapHandler.Sitemap))
	mux.HandleFunc("GET /feedback", logHandler("Feedback", feedbackHandler.Feedback))
	mux.HandleFunc("POST /feedback", logHandler("Feedback", feedbackHandler.Feedback))
	mux.HandleFunc("GET /help/oral-food/recipes", logHandler("RecipeIndex", recipeHandler.Index))
	mux.HandleFunc("GET /help/oral-food/recipes/browse", logHandler("RecipeBrowse", recipeHandler.Browse))
	
	// Catch-all pattern for everything else (including home page)
	mux.HandleFunc("/", staticFileHandler(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		
		// Handle home page first
		if path == "/" {
			log.Printf("[HANDLER] Index handling: %s %s", r.Method, path)
			contentHandler.Index(w, r)
			return
		}
		
		// Handle feedback routes with URI prefix
		if strings.HasSuffix(path, "/feedback") && len(path) > 9 {
			log.Printf("[HANDLER] URIFeedback handling: %s %s", r.Method, path)
			feedbackHandler.Feedback(w, r)
			return
		}
		
		// Handle recipe routes
		if strings.HasPrefix(path, "/help/oral-food/recipes/") && path != "/help/oral-food/recipes/browse" {
			log.Printf("[HANDLER] Recipe handling: %s %s", r.Method, path)
			recipeHandler.Recipe(w, r)
			return
		}
		
		// Handle video routes (*.mp4 files)
		if strings.HasSuffix(path, ".mp4") {
			log.Printf("[HANDLER] Video handling: %s %s", r.Method, path)
			videoHandler.Video(w, r)
			return
		}
		
		// Default to content page handler
		log.Printf("[HANDLER] ContentPage handling: %s %s", r.Method, path)
		contentHandler.Page(w, r)
	}))

	// Wrap with logging middleware
	return loggingMiddleware(mux)
}

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	command := os.Args[1]
	switch command {
	case "serve":
		serveCommand(os.Args[2:])
	case "dump-mongo":
		dumpMongoCommand(os.Args[2:])
	default:
		fmt.Fprintf(os.Stderr, "Unknown command: %s\n\n", command)
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Fprintf(os.Stderr, "Usage: %s <command> [options]\n", os.Args[0])
	fmt.Fprintf(os.Stderr, "\nAvailable commands:\n")
	fmt.Fprintf(os.Stderr, "  serve       Start the HTTP server\n")
	fmt.Fprintf(os.Stderr, "  dump-mongo  Export all pages to markdown files\n")
}

func serveCommand(args []string) {
	// Load environment variables
	mongoURI := cmp.Or(os.Getenv("MONGO_URI"), "localhost:27017/maxfacts")

	// Connect to MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongodb.Connect(ctx, mongoURI)
	if err != nil {
		log.Fatal("Failed to connect to MongoDB:", err)
	}
	defer client.Disconnect(context.Background())

	db := client.Database("maxfacts")

	// Setup routes
	handler := SetupRouter(db, indexCSV)

	// Start server
	port := cmp.Or(os.Getenv("PORT"), "3000")

	log.Printf("Server starting on port %s (content: markdown files, recipes/search: MongoDB)", port)
	
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}

// loggingMiddleware logs all incoming requests
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("[REQUEST] %s %s", r.Method, r.URL.Path)
		// Wrap response writer to capture status
		wrappedWriter := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
		next.ServeHTTP(wrappedWriter, r)
		log.Printf("[RESPONSE] %s %s - Status: %d", r.Method, r.URL.Path, wrappedWriter.statusCode)
	})
}

// responseWriter wraps http.ResponseWriter to capture status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// logHandler wraps a handler function to log when it's called
func logHandler(name string, handler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Printf("[HANDLER] %s handling: %s %s", name, r.Method, r.URL.Path)
		handler(w, r)
	}
}

// logStaticHandler wraps a static file handler to log when it's called
func logStaticHandler(name string, handler http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("[STATIC] %s handling: %s %s", name, r.Method, r.URL.Path)
		handler.ServeHTTP(w, r)
	})
}

func dumpMongoCommand(args []string) {
	// Load environment variables
	mongoURI := cmp.Or(os.Getenv("MONGO_URI"), "localhost:27017/maxfacts")

	// Connect to MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongodb.Connect(ctx, mongoURI)
	if err != nil {
		log.Fatal("Failed to connect to MongoDB:", err)
	}
	defer client.Disconnect(context.Background())

	db := client.Database("maxfacts")

	// Create output directory
	outputDir := "data/markdown/content"
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		log.Fatal("Failed to create output directory:", err)
	}

	// Get all content from MongoDB
	log.Println("Fetching all content from MongoDB...")
	contentModel := models.NewContentModel(db)
	contents, err := contentModel.FindAll(ctx)
	if err != nil {
		log.Fatal("Failed to fetch content:", err)
	}

	log.Printf("Found %d content items", len(contents))

	var validContents []models.Content
	
	// Process each content item
	for i, content := range contents {
		if content.ContentID == "" {
			log.Printf("Skipping content with empty ID: %s", content.URI)
			continue
		}
		
		filename := fmt.Sprintf("%s.md", content.ContentID)
		filepath := filepath.Join(outputDir, filename)

		// Convert to markdown
		markdown := convertContentToMarkdown(content)

		// Write to file
		if err := os.WriteFile(filepath, []byte(markdown), 0644); err != nil {
			log.Printf("Failed to write file %s: %v", filename, err)
			continue
		}

		validContents = append(validContents, content)

		if (i+1)%10 == 0 {
			log.Printf("Processed %d/%d files...", i+1, len(contents))
		}
	}

	// Sort contents by URI for consistent ordering
	sort.Slice(validContents, func(i, j int) bool {
		return validContents[i].URI < validContents[j].URI
	})

	// Create CSV index file
	csvPath := "data/markdown/index_uri.csv"
	csvFile, err := os.Create(csvPath)
	if err != nil {
		log.Fatal("Failed to create CSV file:", err)
	}
	defer csvFile.Close()

	csvWriter := csv.NewWriter(csvFile)
	defer csvWriter.Flush()

	// Write CSV header
	if err := csvWriter.Write([]string{"uri", "id"}); err != nil {
		log.Fatal("Failed to write CSV header:", err)
	}

	// Write content data
	for _, content := range validContents {
		if err := csvWriter.Write([]string{content.URI, content.ContentID}); err != nil {
			log.Printf("Failed to write CSV row for %s: %v", content.URI, err)
			continue
		}
	}

	log.Printf("Successfully exported %d content items to %s", len(validContents), outputDir)
	log.Printf("Created CSV index with %d entries at %s", len(validContents), csvPath)
}

func convertContentToMarkdown(content models.Content) string {
	var sb strings.Builder
	
	// Add frontmatter
	sb.WriteString("---\n")
	sb.WriteString(fmt.Sprintf("id: %s\n", content.ContentID))
	sb.WriteString(fmt.Sprintf("uri: %s\n", content.URI))
	sb.WriteString(fmt.Sprintf("title: %s\n", content.Title))
	sb.WriteString(fmt.Sprintf("type: %s\n", content.Type))
	
	if content.Description != "" {
		sb.WriteString(fmt.Sprintf("description: %s\n", content.Description))
	}
	
	if content.Surtitle != "" {
		sb.WriteString(fmt.Sprintf("surtitle: %s\n", content.Surtitle))
	}
	
	if content.Authorship != "" {
		sb.WriteString(fmt.Sprintf("authorship: %s\n", content.Authorship))
	}
	
	if content.Order > 0 {
		sb.WriteString(fmt.Sprintf("order: %d\n", content.Order))
	}
	
	if content.Hide {
		sb.WriteString("hide: true\n")
	}
	
	if content.HasSublist {
		sb.WriteString("has_sublist: true\n")
	}
	
	if content.RedirectURI != "" {
		sb.WriteString(fmt.Sprintf("redirect_uri: %s\n", content.RedirectURI))
	}
	
	if content.FurtherReadingURI != "" {
		sb.WriteString(fmt.Sprintf("further_reading_uri: %s\n", content.FurtherReadingURI))
	}
	
	if !content.UpdatedAt.IsZero() {
		sb.WriteString(fmt.Sprintf("updated_at: %s\n", content.UpdatedAt.Format(time.RFC3339)))
	}
	
	if !content.CreatedAt.IsZero() {
		sb.WriteString(fmt.Sprintf("created_at: %s\n", content.CreatedAt.Format(time.RFC3339)))
	}
	
	sb.WriteString("---\n\n")
	
	// Add content body
	if content.Body != "" {
		sb.WriteString(content.Body)
		sb.WriteString("\n")
	}
	
	return sb.String()
}
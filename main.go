package main

import (
	"cmp"
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/maxfacts/maxfacts/handlers"
	"github.com/maxfacts/maxfacts/pkg/content"
	"github.com/maxfacts/maxfacts/pkg/mongodb"
	"github.com/maxfacts/maxfacts/pkg/recipe"
	"github.com/maxfacts/maxfacts/pkg/repository"
	"github.com/maxfacts/maxfacts/pkg/video"
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
func SetupRouter(db *mongo.Database) http.Handler {
	mux := http.NewServeMux()

	// All packages default to markdown if available
	// No additional configuration needed - packages auto-initialize from markdown files
	
	// Initialize handlers (no dependencies)
	contentHandler := handlers.NewContentHandler()
	searchHandler := handlers.NewSearchHandler()
	sitemapHandler := handlers.NewSitemapHandler()
	recipeHandler := handlers.NewRecipeHandler()
	videoHandler := handlers.NewVideoHandler()
	feedbackHandler := handlers.NewFeedbackHandler()

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
	var db *mongo.Database
	
	// Only connect to MongoDB if MONGO_URI is explicitly provided
	if mongoURI := os.Getenv("MONGO_URI"); mongoURI != "" {
		// Connect to MongoDB
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		client, err := mongodb.Connect(ctx, mongoURI)
		if err != nil {
			log.Printf("Warning: Failed to connect to MongoDB: %v", err)
			log.Printf("Continuing with markdown-only mode...")
		} else {
			defer client.Disconnect(context.Background())
			db = client.Database("maxfacts")
			log.Printf("Connected to MongoDB - search functionality available")
		}
	} else {
		log.Printf("No MONGO_URI provided - running in markdown-only mode")
	}

	// Setup routes
	handler := SetupRouter(db)

	// Start server
	port := cmp.Or(os.Getenv("PORT"), "3000")

	log.Printf("Server starting on port %s", port)
	
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

	// Export content
	exportContent(ctx, db)
	
	// Export recipes
	exportRecipes(ctx, db)
	
	// Export videos
	exportVideos(ctx, db)
}

func exportContent(ctx context.Context, db *mongo.Database) {
	// Configure reader and writer
	content.UseMongoReader(db)
	content.UseMarkdownWriter("data/markdown/content")

	// Read all content
	log.Println("Fetching all content from MongoDB...")
	contents, err := content.FindAll(ctx)
	if err != nil {
		log.Fatal("Failed to fetch content:", err)
	}

	log.Printf("Found %d content items", len(contents))

	// Write each content item
	var validContents []repository.Content
	for i, c := range contents {
		if c.ContentID == "" {
			log.Printf("Skipping content with empty ID: %s", c.URI)
			continue
		}

		if err := content.WriteOne(ctx, &c); err != nil {
			log.Printf("Failed to write %s: %v", c.ContentID, err)
			continue
		}

		validContents = append(validContents, c)

		if (i+1)%10 == 0 {
			log.Printf("Processed %d/%d files...", i+1, len(contents))
		}
	}

	// Sort by URI for consistent ordering
	sort.Slice(validContents, func(i, j int) bool {
		return validContents[i].URI < validContents[j].URI
	})

	// Write index
	if err := content.WriteIndex(ctx, validContents); err != nil {
		log.Fatal("Failed to write index:", err)
	}

	log.Printf("Successfully exported %d content items to data/markdown/content", len(validContents))
	log.Printf("Created CSV index with %d entries at data/markdown/index_uri.csv", len(validContents))
}

func exportRecipes(ctx context.Context, db *mongo.Database) {
	// Configure reader and writer
	recipe.UseMongo(db)
	if err := recipe.UseMarkdownWriter("data/markdown/recipes"); err != nil {
		log.Fatal("Failed to configure recipe writer:", err)
	}

	// Read all recipes
	log.Println("Fetching all recipes from MongoDB...")
	recipes, err := recipe.FindAll(ctx)
	if err != nil {
		log.Fatal("Failed to fetch recipes:", err)
	}

	log.Printf("Found %d recipes", len(recipes))

	// Write each recipe
	for i, r := range recipes {
		if r.RecipeID == "" {
			log.Printf("Skipping recipe with empty ID: %s", r.Title)
			continue
		}

		if err := recipe.WriteOne(ctx, &r); err != nil {
			log.Printf("Failed to write recipe %s: %v", r.RecipeID, err)
			continue
		}

		if (i+1)%10 == 0 {
			log.Printf("Processed %d/%d recipes...", i+1, len(recipes))
		}
	}

	// Write index
	if err := recipe.WriteIndex(ctx, recipes); err != nil {
		log.Fatal("Failed to write recipe index:", err)
	}

	log.Printf("Successfully exported %d recipes to data/markdown/recipes", len(recipes))
	log.Printf("Created CSV index at data/markdown/index_recipes.csv")
}

func exportVideos(ctx context.Context, db *mongo.Database) {
	// Configure reader and writer
	video.UseMongo(db)
	if err := video.UseMarkdownWriter("data/markdown/videos"); err != nil {
		log.Fatal("Failed to configure video writer:", err)
	}

	// Read all videos
	log.Println("Fetching all videos from MongoDB...")
	videos, err := video.FindAll(ctx)
	if err != nil {
		log.Fatal("Failed to fetch videos:", err)
	}

	log.Printf("Found %d videos", len(videos))

	// Write each video
	for i, v := range videos {
		if v.ID == "" {
			log.Printf("Skipping video with empty ID: %s", v.Name)
			continue
		}

		if err := video.WriteOne(ctx, &v); err != nil {
			log.Printf("Failed to write video %s: %v", v.ID, err)
			continue
		}

		if (i+1)%10 == 0 {
			log.Printf("Processed %d/%d videos...", i+1, len(videos))
		}
	}

	// Write index
	if err := video.WriteIndex(ctx, videos); err != nil {
		log.Fatal("Failed to write video index:", err)
	}

	log.Printf("Successfully exported %d videos to data/markdown/videos", len(videos))
	log.Printf("Created CSV index at data/markdown/index_videos.csv")
}
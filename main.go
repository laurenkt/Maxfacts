package main

import (
	"cmp"
	"context"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/maxfacts/maxfacts/handlers"
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
func SetupRouter(db *mongo.Database) http.Handler {
	mux := http.NewServeMux()

	// Initialize handlers with database
	contentHandler := handlers.NewContentHandler(db)
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
package main

import (
	"cmp"
	"context"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gorilla/mux"
	"github.com/maxfacts/maxfacts/handlers"
	"github.com/maxfacts/maxfacts/pkg/mongodb"
	"go.mongodb.org/mongo-driver/mongo"
)

// createStaticMiddleware creates middleware that serves static files from multiple directories
// Mimics Node.js express.static() behavior by checking multiple directories in order
func createStaticMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip non-GET requests
			if r.Method != http.MethodGet {
				next.ServeHTTP(w, r)
				return
			}
			
			// List of directories to check in order (like Node.js)
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
				filePath := filepath.Join(dir, r.URL.Path)
				
				// Check if file exists and is not a directory
				if fileInfo, err := os.Stat(filePath); err == nil && !fileInfo.IsDir() {
					log.Printf("[STATIC] Serving %s from %s", r.URL.Path, dir)
					http.ServeFile(w, r, filePath)
					return
				}
			}
			
			// File not found in any static directory, continue to next handler
			next.ServeHTTP(w, r)
		})
	}
}

// SetupRouter creates and configures the application router
func SetupRouter(db *mongo.Database) *mux.Router {
	r := mux.NewRouter()

	// Initialize handlers with database
	contentHandler := handlers.NewContentHandler(db)
	searchHandler := handlers.NewSearchHandler(db)
	sitemapHandler := handlers.NewSitemapHandler(db)
	recipeHandler := handlers.NewRecipeHandler(db)
	videoHandler := handlers.NewVideoHandler(db)
	feedbackHandler := handlers.NewFeedbackHandler(db)

	// Content routes
	r.HandleFunc("/", logHandler("Index", contentHandler.Index)).Methods("GET")
	r.HandleFunc("/search", logHandler("Search", searchHandler.Search)).Methods("GET")
	r.HandleFunc("/map.xml", logHandler("Sitemap", sitemapHandler.Sitemap)).Methods("GET")
	
	// Feedback routes (must be before content catch-all)
	r.HandleFunc("/feedback", logHandler("Feedback", feedbackHandler.Feedback)).Methods("GET", "POST")
	r.HandleFunc("/{uri:.*}/feedback", logHandler("URIFeedback", feedbackHandler.Feedback)).Methods("GET", "POST")
	
	// Recipe routes
	r.HandleFunc("/help/oral-food/recipes", logHandler("RecipeIndex", recipeHandler.Index)).Methods("GET")
	r.HandleFunc("/help/oral-food/recipes/browse", logHandler("RecipeBrowse", recipeHandler.Browse)).Methods("GET")
	r.HandleFunc("/help/oral-food/recipes/{id}", logHandler("Recipe", recipeHandler.Recipe)).Methods("GET")

	// Video routes
	r.HandleFunc("/{uri:.*\\.mp4}", logHandler("Video", videoHandler.Video)).Methods("GET")
	
	// Static files middleware - mimics Node.js express.static behavior
	// Check multiple directories in order: build/static, static/, STATIC_FS
	r.Use(createStaticMiddleware())
	
	// Catch-all for content pages (must be last)
	r.HandleFunc("/{uri:.*}", logHandler("ContentPage", contentHandler.Page)).Methods("GET")

	// Add logging middleware to the router
	r.Use(loggingMiddleware)
	
	// Add final 404 handler that logs
	r.NotFoundHandler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("[404] No handler matched for: %s %s", r.Method, r.URL.Path)
		http.NotFound(w, r)
	})

	return r
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
	r := SetupRouter(db)

	// Start server
	port := cmp.Or(os.Getenv("PORT"), "3000")

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
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
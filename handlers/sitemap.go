package handlers

import (
	"context"
	"log"
	"math"
	"net/http"
	"strings"
	"text/template"
	"time"

	"github.com/maxfacts/maxfacts/pkg/mongodb"
	"github.com/maxfacts/maxfacts/pkg/repository"
	templatehelpers "github.com/maxfacts/maxfacts/pkg/template"
	"go.mongodb.org/mongo-driver/mongo"
)

// SitemapHandler handles sitemap requests
type SitemapHandler struct {
	contentRepo repository.ContentRepository
	recipeRepo  repository.RecipeRepository
	videoRepo   repository.VideoRepository
	templates   *template.Template
}

// SitemapRoute represents a route in the sitemap
type SitemapRoute struct {
	URI        string  `xml:"uri"`
	Title      string  `xml:"title"`
	Lastmod    string  `xml:"lastmod"`
	Priority   float64 `xml:"priority"`
	Changefreq string  `xml:"changefreq"`
}

// NewSitemapHandler creates a new sitemap handler
func NewSitemapHandler(db *mongo.Database) *SitemapHandler {
	// Load templates
	tmpl := template.New("").Funcs(templatehelpers.FuncMap())
	tmpl, err := tmpl.ParseGlob("templates/*.gohtml")
	if err != nil {
		log.Fatal("Failed to parse templates:", err)
	}

	return &SitemapHandler{
		contentRepo: mongodb.NewContentRepository(db),
		recipeRepo:  mongodb.NewRecipeRepository(db),
		videoRepo:   mongodb.NewVideoRepository(db),
		templates:   tmpl,
	}
}

// CollectAllURLs collects all URLs that should be included in the sitemap
func (h *SitemapHandler) CollectAllURLs(ctx context.Context) ([]string, error) {
	var urls []string

	// Get all content
	contents, err := h.contentRepo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	for _, content := range contents {
		if content.Body != "" {
			urls = append(urls, "/"+content.URI)
		}
	}

	// Get all videos
	videos, err := h.videoRepo.FindAll(ctx)
	if err == nil {
		for _, video := range videos {
			urls = append(urls, "/"+video.URI)
		}
	}

	// Get all recipes
	recipes, err := h.recipeRepo.FindAll(ctx)
	if err == nil {
		for _, recipe := range recipes {
			urls = append(urls, "/"+recipe.URI)
		}
	}

	// Add home page
	urls = append(urls, "/")

	return urls, nil
}

// Sitemap generates and serves the XML sitemap
func (h *SitemapHandler) Sitemap(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	var routes []SitemapRoute

	// Get all content
	contents, err := h.contentRepo.FindAll(ctx)
	if err != nil {
		h.renderError(w, err)
		return
	}

	for _, content := range contents {
		if content.Body != "" {
			routes = append(routes, SitemapRoute{
				URI:        content.URI,
				Title:      content.Title,
				Lastmod:    formatLastmod(content.UpdatedAt),
				Priority:   calculatePriority(content.URI),
				Changefreq: "weekly",
			})
		}
	}

	// Get all videos
	videos, err := h.videoRepo.FindAll(ctx)
	if err == nil {
		for _, video := range videos {
			routes = append(routes, SitemapRoute{
				URI:        video.URI,
				Title:      video.Name,
				Lastmod:    formatLastmod(video.UpdatedAt),
				Priority:   calculatePriority(video.URI),
				Changefreq: "weekly",
			})
		}
	}

	// Get all recipes
	recipes, err := h.recipeRepo.FindAll(ctx)
	if err == nil {
		for _, recipe := range recipes {
			routes = append(routes, SitemapRoute{
				URI:        recipe.URI,
				Title:      recipe.Title,
				Lastmod:    formatLastmod(recipe.UpdatedAt),
				Priority:   calculatePriority(recipe.URI),
				Changefreq: "weekly",
			})
		}
	}

	// Normalize priorities
	if len(routes) > 0 {
		maxDepth := 0
		for _, route := range routes {
			depth := strings.Count(route.URI, "/") + 1
			if depth > maxDepth {
				maxDepth = depth
			}
		}

		for i := range routes {
			depth := strings.Count(routes[i].URI, "/") + 1
			// Convert depth to priority (0.1 to 1.0, inverted so lower depth = higher priority)
			routes[i].Priority = math.Round((1.0-(float64(depth)/float64(maxDepth)*0.9+0.1))*100) / 100
		}
	}

	// Add homepage
	routes = append(routes, SitemapRoute{
		URI:        "",
		Title:      "Maxfacts",
		Lastmod:    formatLastmod(time.Now()),
		Priority:   1.0,
		Changefreq: "weekly",
	})

	data := map[string]interface{}{
		"Routes": routes,
	}

	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	
	// Parse sitemap template as text template to avoid HTML escaping
	sitemapTmpl, err := template.ParseFiles("templates/sitemap.gohtml")
	if err != nil {
		h.renderError(w, err)
		return
	}
	
	err = sitemapTmpl.ExecuteTemplate(w, "sitemap", data)
	if err != nil {
		log.Printf("Template execution error: %v", err)
	}
}

// formatLastmod formats a timestamp for lastmod field
func formatLastmod(t time.Time) string {
	if t.IsZero() {
		t = time.Now()
	}
	return t.UTC().Format("2006-01-02T15:04-07:00")
}

// calculatePriority calculates priority based on URI depth
func calculatePriority(uri string) float64 {
	depth := strings.Count(uri, "/") + 1
	return float64(depth) // Will be normalized later
}

// renderError renders an error response
func (h *SitemapHandler) renderError(w http.ResponseWriter, err error) {
	w.WriteHeader(http.StatusInternalServerError)
	w.Header().Set("Content-Type", "text/plain")
	w.Write([]byte("Error generating sitemap: " + err.Error()))
}
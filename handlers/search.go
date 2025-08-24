package handlers

import (
	"context"
	"text/template"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/maxfacts/maxfacts/models"
	templatehelpers "github.com/maxfacts/maxfacts/pkg/template"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/time/rate"
)

// SearchHandler handles search requests
type SearchHandler struct {
	contentModel *models.ContentModel
	templates    *template.Template
	limiter      *rate.Limiter
}

// SearchResult represents a search result with highlighted match
type SearchResult struct {
	*models.Content
	Match *SearchMatch `json:"match,omitempty"`
}

// SearchMatch represents a highlighted search match
type SearchMatch struct {
	Before string `json:"before"`
	Match  string `json:"match"`
	After  string `json:"after"`
}

// NewSearchHandler creates a new search handler
func NewSearchHandler(db *mongo.Database) *SearchHandler {
	// Load templates
	tmpl := template.New("").Funcs(templatehelpers.FuncMap())
	tmpl, err := tmpl.ParseGlob("templates/*.gohtml")
	if err != nil {
		log.Fatal("Failed to parse templates:", err)
	}
	tmpl, err = tmpl.ParseGlob("templates/layouts/*.gohtml")
	if err != nil {
		log.Fatal("Failed to parse layout templates:", err)
	}
	tmpl, err = tmpl.ParseGlob("templates/partials/*.gohtml")
	if err != nil {
		log.Fatal("Failed to parse partial templates:", err)
	}

	// Rate limiter: 20 requests per 30 minutes
	limiter := rate.NewLimiter(rate.Every(90*time.Second), 20)

	return &SearchHandler{
		contentModel: models.NewContentModel(db),
		templates:    tmpl,
		limiter:      limiter,
	}
}

// Search handles search requests
func (h *SearchHandler) Search(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	
	// Rate limiting
	if !h.limiter.Allow() {
		http.Error(w, "Too many search requests sent from this IP, please try again later", http.StatusTooManyRequests)
		return
	}

	query := strings.TrimSpace(r.URL.Query().Get("query"))
	
	data := map[string]interface{}{
		"Title":   "Search results",
		"Query":   query,
		"Results": []SearchResult{},
	}

	if query != "" {
		results, err := h.performSearch(ctx, query)
		if err != nil {
			h.renderError(w, err)
			return
		}
		data["Results"] = results
	}

	h.render(w, "search.gohtml", data)
}

// performSearch performs the actual search
func (h *SearchHandler) performSearch(ctx context.Context, query string) ([]SearchResult, error) {
	// MongoDB text search
	filter := bson.M{
		"$text": bson.M{"$search": query},
		"hide":  false,
	}
	
	projection := bson.M{
		"score": bson.M{"$meta": "textScore"},
	}
	
	opts := options.Find().
		SetProjection(projection).
		SetSort(bson.M{"score": bson.M{"$meta": "textScore"}})
	
	cursor, err := h.contentModel.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	
	var contents []models.Content
	if err = cursor.All(ctx, &contents); err != nil {
		return nil, err
	}
	
	// Build search results with matches
	results := make([]SearchResult, len(contents))
	pattern := regexp.MustCompile(`(?i)(^[\s\S]*)(`+regexp.QuoteMeta(query)+`)([\s\S]*$)`)
	
	for i, content := range contents {
		result := SearchResult{Content: &content}
		
		// Find matching paragraph
		match := h.contentModel.GetMatchedParagraph(&content, pattern)
		if len(match) >= 4 {
			before := match[1]
			if len(before) > 100 {
				// Truncate and add ellipsis
				words := strings.Fields(before)
				if len(words) > 0 {
					truncated := strings.Join(words[len(words)-15:], " ")
					if len(truncated) < len(before) {
						before = "..." + truncated
					}
				}
			}
			
			after := match[3]
			if len(after) > 100 {
				// Truncate and add ellipsis
				words := strings.Fields(after)
				if len(words) > 0 {
					truncated := strings.Join(words[:15], " ")
					if len(truncated) < len(after) {
						after = truncated + "..."
					}
				}
			}
			
			result.Match = &SearchMatch{
				Before: before,
				Match:  match[2],
				After:  after,
			}
		}
		
		// Get breadcrumbs
		breadcrumbs, _ := h.contentModel.GetBreadcrumbs(ctx, &content)
		result.Content.Breadcrumbs = breadcrumbs
		
		results[i] = result
	}
	
	return results, nil
}

// render renders a template
func (h *SearchHandler) render(w http.ResponseWriter, templateName string, data map[string]interface{}) {
	// Clone template to avoid race conditions
	tmpl, err := h.templates.Clone()
	if err != nil {
		h.renderError(w, err)
		return
	}
	
	// Parse the specific content template
	tmpl, err = tmpl.ParseFiles("templates/" + templateName)
	if err != nil {
		h.renderError(w, err)
		return
	}
	
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	err = tmpl.ExecuteTemplate(w, "main.gohtml", data)
	if err != nil {
		log.Printf("Template execution error: %v", err)
	}
}

// renderError renders an error page
func (h *SearchHandler) renderError(w http.ResponseWriter, err error) {
	w.WriteHeader(http.StatusInternalServerError)
	data := map[string]interface{}{
		"Title":   "Error",
		"Message": err.Error(),
		"Error":   err,
	}
	h.render(w, "error.gohtml", data)
}
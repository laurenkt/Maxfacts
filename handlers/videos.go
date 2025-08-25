package handlers

import (
	"context"
	"strings"
	"text/template"
	"log"
	"net/http"

	"github.com/maxfacts/maxfacts/pkg/content"
	"github.com/maxfacts/maxfacts/pkg/repository"
	templatehelpers "github.com/maxfacts/maxfacts/pkg/template"
	"github.com/maxfacts/maxfacts/pkg/video"
)

// VideoHandler handles video requests
type VideoHandler struct {
	templates *template.Template
}

// NewVideoHandler creates a new video handler
func NewVideoHandler() *VideoHandler {
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

	return &VideoHandler{
		templates: tmpl,
	}
}

// Video handles video page requests
func (h *VideoHandler) Video(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	// Extract URI from path (removing leading slash and .mp4 extension)
	uri := strings.TrimPrefix(r.URL.Path, "/")
	uri = strings.TrimSuffix(uri, ".mp4")

	videoDoc, err := video.FindOne(ctx, uri)
	if err != nil {
		h.render404(w)
		return
	}

	// Get breadcrumbs using content repository
	breadcrumbs := []repository.Breadcrumb{}
	lineage := repository.GetLineageFromURI(repository.ParentURIFragment(videoDoc.URI))
	for _, uri := range lineage {
		contentDoc, err := content.FindOne(ctx, uri)
		if err == nil {
			breadcrumbs = append(breadcrumbs, repository.Breadcrumb{
				Title: contentDoc.Title,
				URI:   contentDoc.URI,
				ID:    contentDoc.ID,
			})
		}
	}

	// Convert breadcrumbs to Node.js format for JSON
	breadcrumbsJSON := make([]map[string]interface{}, len(breadcrumbs))
	for i, b := range breadcrumbs {
		breadcrumbsJSON[i] = map[string]interface{}{
			"title": b.Title,
			"uri":   b.URI,
			"_id":   "", // Node.js includes _id but we don't need it for breadcrumbs
		}
	}

	// Create JSON data structure that matches Node.js exactly
	videoJSON := map[string]interface{}{
		"_id":         videoDoc.ID,
		"updatedAt":   videoDoc.UpdatedAt.Format("2006-01-02T15:04:05.000Z"),
		"createdAt":   videoDoc.CreatedAt.Format("2006-01-02T15:04:05.000Z"),
		"thumbnail":   videoDoc.Thumbnail,
		"filename":    videoDoc.Filename,
		"youtube_id":  videoDoc.YoutubeID,
		"titles":      videoDoc.Titles,
		"uri":         videoDoc.URI,
		"name":        videoDoc.Name,
		"__v":         0,                // MongoDB version field, always 0
		"title":       videoDoc.Name,       // Duplicate of name
		"breadcrumbs": breadcrumbsJSON,
		// Additional Node.js fields that were in the original
		"_locals":     map[string]interface{}{
			"path":  "/" + videoDoc.URI,
			"flash": map[string]interface{}{},
		},
		"cache": true,
		"flash": map[string]interface{}{},
		"path":  "/" + videoDoc.URI,
		"settings": map[string]interface{}{
			"x-powered-by": true,
			"etag": "weak",
			"env": "production",
			"query parser": "extended",
			"subdomain offset": 2,
			"trust proxy": false,
			"views": "/home/node/app/templates",
			"jsonp callback name": "callback",
			"view cache": true,
			"view engine": "hbs",
			"port": 3000,
		},
	}

	// Template data with separate JSON field
	data := map[string]interface{}{
		"Title":       videoDoc.Name,      // For page title (template meta)
		"Name":        videoDoc.Name,      // For h2 display
		"Breadcrumbs": breadcrumbs,     // For Go template breadcrumb rendering
		"VideoJSON":   videoJSON,       // JSON data for JavaScript
	}

	log.Printf("VideoJSON keys: %+v", len(videoJSON))
	for k, v := range videoJSON {
		log.Printf("VideoJSON[%s] = %v", k, v)
		if k == "breadcrumbs" {
			log.Printf("Breadcrumbs length: %d", len(breadcrumbsJSON))
		}
		break // Just log first few keys
	}

	h.render(w, "video-multipart.gohtml", data)
}

// render renders a template
func (h *VideoHandler) render(w http.ResponseWriter, templateName string, data map[string]interface{}) {
	// Clone template to avoid race conditions
	tmpl, err := h.templates.Clone()
	if err != nil {
		h.renderError(w, err)
		return
	}
	
	// Parse the specific template
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

// render404 renders a 404 page
func (h *VideoHandler) render404(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNotFound)
	data := map[string]interface{}{
		"Title":   "Not Found",
		"Message": "Video not found",
		"Error":   map[string]interface{}{"Status": "404"},
	}
	h.render(w, "error.gohtml", data)
}

// renderError renders an error page
func (h *VideoHandler) renderError(w http.ResponseWriter, err error) {
	w.WriteHeader(http.StatusInternalServerError)
	data := map[string]interface{}{
		"Title":   "Error",
		"Message": err.Error(),
		"Error":   err,
	}
	h.render(w, "error.gohtml", data)
}
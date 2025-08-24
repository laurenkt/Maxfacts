package handlers

import (
	"context"
	"text/template"
	"log"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/maxfacts/maxfacts/models"
	templatehelpers "github.com/maxfacts/maxfacts/pkg/template"
	"go.mongodb.org/mongo-driver/mongo"
)

// VideoHandler handles video requests
type VideoHandler struct {
	videoModel   *models.VideoModel
	contentModel *models.ContentModel
	templates    *template.Template
}

// NewVideoHandler creates a new video handler
func NewVideoHandler(db *mongo.Database) *VideoHandler {
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
		videoModel:   models.NewVideoModel(db),
		contentModel: models.NewContentModel(db),
		templates:    tmpl,
	}
}

// Video handles video page requests
func (h *VideoHandler) Video(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	vars := mux.Vars(r)
	uri := vars["uri"]

	video, err := h.videoModel.FindOne(ctx, uri)
	if err == mongo.ErrNoDocuments {
		h.render404(w)
		return
	}
	if err != nil {
		h.renderError(w, err)
		return
	}

	// Get breadcrumbs using content model helper
	breadcrumbs := []models.Breadcrumb{}
	lineage := models.GetLineageFromURI(models.ParentURIFragment(video.URI))
	for _, uri := range lineage {
		content, err := h.contentModel.FindOne(ctx, uri)
		if err == nil {
			breadcrumbs = append(breadcrumbs, models.Breadcrumb{
				Title: content.Title,
				URI:   content.URI,
			})
		}
	}

	data := map[string]interface{}{
		"Title":          video.Name,      // For page title
		"Breadcrumbs":    breadcrumbs,
		"Name":           video.Name,
		"URI":            video.URI,
		"Filename":       video.Filename,
		"Thumbnail":      video.Thumbnail,
		"YoutubeID":      video.YoutubeID,
		"Titles":         video.Titles,
		"UpdatedAt":      video.UpdatedAt,
		"CreatedAt":      video.CreatedAt,
		"ID":             video.ID,
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
package dashboard

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"text/template"

	"github.com/maxfacts/maxfacts/pkg/content"
	"github.com/maxfacts/maxfacts/pkg/repository"
	templatehelpers "github.com/maxfacts/maxfacts/pkg/template"
)

// ContentHandler handles dashboard content CRUD operations
type ContentHandler struct{
	templates *template.Template
}

// NewContentHandler creates a new dashboard content handler
func NewContentHandler() *ContentHandler {
	// Load templates - only load content editor template
	tmpl := template.New("").Funcs(templatehelpers.FuncMap())
	
	tmpl, err := tmpl.ParseFiles("templates/dashboard/content.gohtml", "templates/layouts/dashboard.gohtml")
	if err != nil {
		log.Fatal("Failed to parse dashboard content templates:", err)
	}
	
	return &ContentHandler{
		templates: tmpl,
	}
}

// Edit renders the content editor page
func (h *ContentHandler) Edit(w http.ResponseWriter, r *http.Request) {
	// Extract URI from path: /dashboard/directory/{uri}
	path := strings.TrimPrefix(r.URL.Path, "/dashboard/directory/")
	
	// Fetch content by URI
	contentItem, err := content.FindOne(r.Context(), path)
	if err != nil {
		log.Printf("Error fetching content for URI %s: %v", path, err)
		http.Error(w, "Content not found", http.StatusNotFound)
		return
	}

	// Get all URIs for link validation
	allContent, err := content.FindAll(r.Context())
	if err != nil {
		log.Printf("Error fetching all content: %v", err)
	}
	
	allURIs := make([]string, len(allContent))
	for i, c := range allContent {
		allURIs[i] = c.URI
	}

	// Prepare data for editor
	editorData := map[string]interface{}{
		"id":                   contentItem.ContentID,
		"uri":                  contentItem.URI,
		"title":                contentItem.Title,
		"body":                 contentItem.Body,
		"description":          contentItem.Description,
		"surtitle":             contentItem.Surtitle,
		"order":                contentItem.Order,
		"type":                 contentItem.Type,
		"hide":                 contentItem.Hide,
		"redirect_uri":         contentItem.RedirectURI,
		"has_sublist":          contentItem.HasSublist,
		"further_reading_uri":  contentItem.FurtherReadingURI,
		"authorship":           contentItem.Authorship,
		"all_uris":             allURIs,
	}

	editorJSON, err := json.Marshal(editorData)
	if err != nil {
		log.Printf("Error marshaling editor data: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Render template
	data := struct {
		Layout      string
		Title       string
		ContentJSON string
		Content     *repository.Content
		Selected    map[string]string
		Saved       bool
		Breadcrumbs []interface{}
		Error       interface{}
		TemplateName string
	}{
		Layout:      "dashboard",
		Title:       fmt.Sprintf("Edit: %s", contentItem.Title),
		ContentJSON: string(editorJSON),
		Content:     contentItem,
		Selected:    map[string]string{contentItem.Type: "selected"},
		Saved:       r.URL.Query().Get("saved") == "true",
		Breadcrumbs: []interface{}{},
		Error:       nil,
		TemplateName: "editor-content",
	}

	if err := h.templates.ExecuteTemplate(w, "dashboard.gohtml", data); err != nil {
		log.Printf("Error rendering template: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
}

// New renders the new content creation page
func (h *ContentHandler) New(w http.ResponseWriter, r *http.Request) {
	// Get all URIs for link validation
	allContent, err := content.FindAll(r.Context())
	if err != nil {
		log.Printf("Error fetching all content: %v", err)
	}
	
	allURIs := make([]string, len(allContent))
	for i, c := range allContent {
		allURIs[i] = c.URI
	}

	// Prepare empty editor data
	editorData := map[string]interface{}{
		"id":                   r.URL.Query().Get("id"),
		"uri":                  "",
		"title":                "",
		"body":                 "",
		"description":          "",
		"surtitle":             "",
		"order":                0,
		"type":                 "page",
		"hide":                 false,
		"redirect_uri":         "",
		"has_sublist":          false,
		"further_reading_uri":  "",
		"authorship":           "",
		"all_uris":             allURIs,
	}

	editorJSON, err := json.Marshal(editorData)
	if err != nil {
		log.Printf("Error marshaling editor data: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Render template
	data := struct {
		Layout      string
		Title       string
		ContentJSON string
		ID          string
		Breadcrumbs []interface{}
		Saved       bool
		Error       interface{}
		TemplateName string
	}{
		Layout:      "dashboard",
		Title:       "Create New Page",
		ContentJSON: string(editorJSON),
		ID:          r.URL.Query().Get("id"),
		Breadcrumbs: []interface{}{},
		Saved:       false,
		Error:       nil,
		TemplateName: "editor-content",
	}

	if err := h.templates.ExecuteTemplate(w, "dashboard.gohtml", data); err != nil {
		log.Printf("Error rendering template: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
}

// Save handles content creation and updates
func (h *ContentHandler) Save(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse form data
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	// Extract URI from path for updates
	path := strings.TrimPrefix(r.URL.Path, "/dashboard/directory/")
	_ = path == "new" // isNew check not needed yet
	
	// Build content object from form
	contentItem := &repository.Content{
		ContentID:         r.FormValue("id"),
		URI:               r.FormValue("uri"),
		Title:             r.FormValue("title"),
		Body:              r.FormValue("body"),
		Description:       r.FormValue("description"),
		Surtitle:          r.FormValue("surtitle"),
		Type:              r.FormValue("type"),
		RedirectURI:       r.FormValue("redirect_uri"),
		FurtherReadingURI: r.FormValue("further_reading_uri"),
		Authorship:        r.FormValue("authorship"),
		Hide:              r.FormValue("hide") == "on",
		HasSublist:        r.FormValue("has_sublist") == "on",
	}

	// Parse order field
	if orderStr := r.FormValue("order"); orderStr != "" {
		var order int
		fmt.Sscanf(orderStr, "%d", &order)
		contentItem.Order = order
	}

	// Save content
	if err := content.WriteOne(r.Context(), contentItem); err != nil {
		log.Printf("Error saving content: %v", err)
		// TODO: Re-render form with error
		http.Error(w, "Failed to save content", http.StatusInternalServerError)
		return
	}

	// Redirect to edit page with success message
	redirectURL := fmt.Sprintf("/dashboard/directory/%s?saved=true", contentItem.URI)
	http.Redirect(w, r, redirectURL, http.StatusSeeOther)
}
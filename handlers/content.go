package handlers

import (
	"context"
	"text/template"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gorilla/mux"
	"github.com/maxfacts/maxfacts/models"
	templatehelpers "github.com/maxfacts/maxfacts/pkg/template"
	"go.mongodb.org/mongo-driver/mongo"
)

// ContentHandler handles content-related requests
type ContentHandler struct {
	contentModel *models.ContentModel
	videoModel   *models.VideoModel
	templates    *template.Template
	db           *mongo.Database
}

// NewContentHandler creates a new content handler
func NewContentHandler(db *mongo.Database) *ContentHandler {
	// Load templates
	tmpl := template.New("").Funcs(templatehelpers.FuncMap())
	
	// Parse all templates
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
	
	return &ContentHandler{
		contentModel: models.NewContentModel(db),
		videoModel:   models.NewVideoModel(db),
		templates:    tmpl,
		db:           db,
	}
}

// Index handles the home page
func (h *ContentHandler) Index(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	
	// Get the three pillars of the home page
	diagnosis, err := h.contentModel.FindFromParentURI(ctx, "diagnosis")
	if err != nil {
		h.renderError(w, err)
		return
	}
	
	treatment, err := h.contentModel.FindFromParentURI(ctx, "treatment")
	if err != nil {
		h.renderError(w, err)
		return
	}
	
	help, err := h.contentModel.FindFromParentURI(ctx, "help")
	if err != nil {
		h.renderError(w, err)
		return
	}
	
	data := map[string]interface{}{
		"Title":     "Maxfacts – oral and maxillofacial information",
		"Diagnosis": diagnosis,
		"Treatment": treatment,
		"Help":      help,
		"Layout":    "home",
		"Classes":   "",
	}
	
	h.render(w, "index.gohtml", data, "home")
}

// Page handles individual content pages
func (h *ContentHandler) Page(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	vars := mux.Vars(r)
	uri := vars["uri"]
	
	// Find the content
	content, err := h.contentModel.FindOne(ctx, uri)
	if err == mongo.ErrNoDocuments {
		// Try to find a video with this URI (fallback like Node.js app)
		h.tryVideoFallback(w, r, uri)
		return
	}
	if err != nil {
		h.renderError(w, err)
		return
	}
	
	// Handle redirects
	if content.RedirectURI != "" {
		http.Redirect(w, r, "/"+content.RedirectURI, http.StatusMovedPermanently)
		return
	}
	
	// Get placeholder content if body is empty
	if content.Body == "" {
		// Get placeholder URI from options
		optionModel := models.NewOptionModel(h.db)
		placeholderURI, _ := optionModel.Get(ctx, "placeholder_uri")
		if placeholderURI != "" {
			placeholder, err := h.contentModel.FindOne(ctx, placeholderURI)
			if err == nil && placeholder != nil {
				content.Body = placeholder.Body
			}
		}
	}
	
	// Get additional data
	content.InvalidURIs, _ = h.contentModel.GetInvalidLinks(ctx, content)
	content.Breadcrumbs, _ = h.contentModel.GetBreadcrumbs(ctx, content)
	content.NextPage, _ = h.contentModel.GetNextPage(ctx, content)
	
	if content.FurtherReadingURI != "" {
		content.FurtherReading, _ = h.contentModel.FindOne(ctx, content.FurtherReadingURI)
	}
	
	// Handle directory type
	if content.Type == "directory" {
		err = h.buildDirectory(ctx, content)
		if err != nil {
			h.renderError(w, err)
			return
		}
	} else if content.Type == "alphabetical" {
		err = h.buildAlphabetical(ctx, content)
		if err != nil {
			h.renderError(w, err)
			return
		}
	}
	
	// Set edit URI
	content.EditURI = "/dashboard/directory/" + content.URI
	
	// Add title
	data := map[string]interface{}{
		"Title":          content.Title,
		"Content":        content,
		"Breadcrumbs":    content.Breadcrumbs,
		"Body":           content.Body,
		"NextPage":       content.NextPage,
		"FurtherReading": content.FurtherReading,
		"UpdatedAt":      content.UpdatedAt,
		"Authorship":     strings.Split(content.Authorship, ";"),
	}
	
	// Debug: log content type and body length for further pages
	if content.Type == "further" {
		log.Printf("Further page debug - URI: %s, Body length: %d", content.URI, len(content.Body))
	}
	
	// Merge content fields into data
	data["URI"] = content.URI
	data["Type"] = content.Type
	data["Title"] = content.Title
	data["Description"] = content.Description
	data["Surtitle"] = content.Surtitle
	data["Hide"] = content.Hide
	data["HasSublist"] = content.HasSublist
	data["Order"] = content.Order
	data["Directory"] = content.Directory
	data["Selected"] = content.Selected
	data["Depth"] = content.Depth
	data["Alphabetical"] = content.Alphabetical
	
	// Choose template based on content type
	templateName := content.Type + ".gohtml"
	if !h.templateExists(templateName) {
		templateName = "page.gohtml"
	}
	
	h.render(w, templateName, data, "main")
}

// buildDirectory builds the directory structure for directory pages
func (h *ContentHandler) buildDirectory(ctx context.Context, content *models.Content) error {
	lineage := models.GetLineageFromURI(models.ParentURIFragment(content.URI))
	lineage = append(lineage, content.URI)
	
	directory := make([][]models.Content, 0)
	
	// Get links from all parent stages
	for _, uri := range lineage[:len(lineage)-1] {
		items, err := h.contentModel.FindFromAdjacentURI(ctx, uri)
		if err != nil {
			return err
		}
		filtered := filterDirectoryItems(items)
		if len(filtered) > 0 {
			directory = append(directory, filtered)
		}
	}
	
	// Append siblings of current page
	siblings, err := h.contentModel.FindFromAdjacentURI(ctx, content.URI)
	if err != nil {
		return err
	}
	filtered := filterDirectoryItems(siblings)
	if len(filtered) > 0 {
		directory = append(directory, filtered)
	}
	
	// Append children of current page
	children, err := h.contentModel.GetChildren(ctx, content)
	if err != nil {
		return err
	}
	// Filter out children with same title as parent
	var filteredChildren []models.Content
	for _, child := range children {
		if child.Title != content.Title && !child.Hide && child.Type != "further" {
			filteredChildren = append(filteredChildren, child)
		}
	}
	if len(filteredChildren) > 0 {
		directory = append(directory, filteredChildren)
	}
	
	// Load sublists
	for i, column := range directory {
		for j, item := range column {
			if item.HasSublist {
				sublist, err := h.contentModel.FindFromParentURI(ctx, item.URI)
				if err == nil {
					directory[i][j].Sublist = filterDirectoryItems(sublist)
				}
			}
		}
	}
	
	// If this page has a sublist, don't display children
	if content.HasSublist && len(directory) > 0 {
		directory = directory[:len(directory)-1]
	}
	
	content.Directory = directory
	
	// Build selected map
	content.Selected = make(map[string]string)
	for _, uri := range lineage {
		content.Selected[uri] = "-selected"
	}
	
	content.Depth = len(content.Directory)
	
	return nil
}

// buildAlphabetical builds alphabetical listing
func (h *ContentHandler) buildAlphabetical(ctx context.Context, content *models.Content) error {
	children, err := h.contentModel.GetChildren(ctx, content)
	if err != nil {
		return err
	}
	
	alphabet := "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
	content.Alphabetical = make(map[string][]models.Content)
	
	for _, letter := range alphabet {
		letterStr := string(letter)
		content.Alphabetical[letterStr] = make([]models.Content, 0)
		for _, child := range children {
			if len(child.Title) > 0 && strings.ToUpper(child.Title)[0] == byte(letter) {
				content.Alphabetical[letterStr] = append(content.Alphabetical[letterStr], child)
			}
		}
	}
	
	return nil
}

// filterDirectoryItems filters items for directory display
func filterDirectoryItems(items []models.Content) []models.Content {
	filtered := make([]models.Content, 0)
	for _, item := range items {
		if !item.Hide && item.Type != "further" {
			filtered = append(filtered, item)
		}
	}
	return filtered
}

// render renders a template with the given data
func (h *ContentHandler) render(w http.ResponseWriter, templateName string, data map[string]interface{}, layout string) {
	// Use the appropriate layout
	layoutTemplate := "layouts/" + layout + ".gohtml"
	
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
	err = tmpl.ExecuteTemplate(w, filepath.Base(layoutTemplate), data)
	if err != nil {
		log.Printf("Template execution error: %v", err)
	}
}

// templateExists checks if a template file exists
func (h *ContentHandler) templateExists(name string) bool {
	path := filepath.Join("templates", name)
	_, err := os.Stat(path)
	return err == nil
}

// render404 renders a 404 page
func (h *ContentHandler) render404(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNotFound)
	data := map[string]interface{}{
		"Title":   "Not Found",
		"Message": "Not Found",
		"Error":   nil,
	}
	h.render(w, "error.gohtml", data, "main")
}

// renderError renders an error page
func (h *ContentHandler) renderError(w http.ResponseWriter, err error) {
	w.WriteHeader(http.StatusInternalServerError)
	data := map[string]interface{}{
		"Title":   "Error",
		"Message": err.Error(),
		"Error":   err,
	}
	h.render(w, "error.gohtml", data, "main")
}

// tryVideoFallback attempts to find and render a video when content is not found
func (h *ContentHandler) tryVideoFallback(w http.ResponseWriter, r *http.Request, uri string) {
	ctx := context.Background()
	
	// Try to find a video with this URI
	video, err := h.videoModel.FindOne(ctx, uri)
	if err == mongo.ErrNoDocuments {
		h.render404(w)
		return
	}
	if err != nil {
		h.renderError(w, err)
		return
	}
	
	// Get breadcrumbs for the video
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
	
	// Pass the video object and additional data needed by the layout
	video.Breadcrumbs = breadcrumbs
	
	// Create data map for template
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
	
	// Render video template
	h.render(w, "video-multipart.gohtml", data, "main")
}
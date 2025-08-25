package handlers

import (
	"context"
	"text/template"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/maxfacts/maxfacts/pkg/content"
	"github.com/maxfacts/maxfacts/pkg/repository"
	templatehelpers "github.com/maxfacts/maxfacts/pkg/template"
	"github.com/maxfacts/maxfacts/pkg/video"
)

// parseAuthorship splits authorship by semicolon, returning empty slice for empty strings
func parseAuthorship(authorship string) []string {
	if authorship == "" {
		return []string{}
	}
	return strings.Split(authorship, ";")
}

// Note: These conversion functions are no longer needed as we're using repository interfaces

// ContentHandler handles content-related requests
type ContentHandler struct {
	templates *template.Template
}

// NewContentHandler creates a new content handler
func NewContentHandler() *ContentHandler {
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
		templates: tmpl,
	}
}

// Index handles the home page
func (h *ContentHandler) Index(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	
	// Get the three pillars of the home page
	diagnosis, err := content.FindFromParentURI(ctx, "diagnosis")
	if err != nil {
		h.renderError(w, err)
		return
	}
	
	treatment, err := content.FindFromParentURI(ctx, "treatment")
	if err != nil {
		h.renderError(w, err)
		return
	}
	
	help, err := content.FindFromParentURI(ctx, "help")
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
	// Extract URI from path (removing leading slash)
	uri := strings.TrimPrefix(r.URL.Path, "/")
	
	// Find the content using repository
	pageContent, err := content.FindOne(ctx, uri)
	if err != nil {
		// Try to find a video with this URI (fallback like Node.js app)
		h.tryVideoFallback(w, r, uri)
		return
	}
	
	// Handle redirects
	if pageContent.RedirectURI != "" {
		http.Redirect(w, r, "/"+pageContent.RedirectURI, http.StatusMovedPermanently)
		return
	}
	
	// Get placeholder content if body is empty
	if pageContent.Body == "" {
		placeholderContent, err := content.FindOne(ctx, "coming-soon")
		if err == nil && placeholderContent != nil {
			pageContent.Body = placeholderContent.Body
		}
	}
	
	// Get breadcrumbs
	breadcrumbs, err := content.GetBreadcrumbs(ctx, pageContent)
	if err == nil {
		pageContent.Breadcrumbs = breadcrumbs
	} else {
		pageContent.Breadcrumbs = []repository.Breadcrumb{}
	}
	
	// Get next page
	nextPage, err := content.GetNextPage(ctx, pageContent)
	if err == nil && nextPage != nil {
		pageContent.NextPage = nextPage
	} else {
		pageContent.NextPage = nil
	}
	
	// Get invalid links
	invalidURIs, err := content.GetInvalidLinks(ctx, pageContent)
	if err == nil {
		pageContent.InvalidURIs = invalidURIs
	} else {
		pageContent.InvalidURIs = []string{}
	}
	
	if pageContent.FurtherReadingURI != "" {
		furtherReading, err := content.FindOne(ctx, pageContent.FurtherReadingURI)
		if err == nil {
			pageContent.FurtherReading = furtherReading
		}
	}
	
	// Handle directory type
	if pageContent.Type == "directory" {
		err = h.buildDirectory(ctx, pageContent)
		if err != nil {
			h.renderError(w, err)
			return
		}
	} else if pageContent.Type == "alphabetical" {
		err = h.buildAlphabetical(ctx, pageContent)
		if err != nil {
			h.renderError(w, err)
			return
		}
	}
	
	// Set edit URI
	pageContent.EditURI = "/dashboard/directory/" + pageContent.URI
	
	// Add title
	data := map[string]interface{}{
		"Title":          pageContent.Title,
		"Content":        pageContent,
		"Breadcrumbs":    pageContent.Breadcrumbs,
		"Body":           pageContent.Body,
		"NextPage":       pageContent.NextPage,
		"FurtherReading": pageContent.FurtherReading,
		"UpdatedAt":      pageContent.UpdatedAt,
		"Authorship":     parseAuthorship(pageContent.Authorship),
	}
	
	// Debug: log content type and body length for further pages
	if pageContent.Type == "further" {
		log.Printf("Further page debug - URI: %s, Body length: %d", pageContent.URI, len(pageContent.Body))
	}
	
	// Merge content fields into data
	data["URI"] = pageContent.URI
	data["Type"] = pageContent.Type
	data["Title"] = pageContent.Title
	data["Description"] = pageContent.Description
	data["Surtitle"] = pageContent.Surtitle
	data["Hide"] = pageContent.Hide
	data["HasSublist"] = pageContent.HasSublist
	data["Order"] = pageContent.Order
	data["Directory"] = pageContent.Directory
	data["Selected"] = pageContent.Selected
	data["Depth"] = pageContent.Depth
	data["Alphabetical"] = pageContent.Alphabetical
	data["Contents"] = pageContent.Contents
	data["Body"] = pageContent.Body
	
	// Choose template based on content type
	templateName := pageContent.Type + ".gohtml"
	if !h.templateExists(templateName) {
		templateName = "page.gohtml"
	}
	
	h.render(w, templateName, data, "main")
}

// buildDirectory builds the directory structure for directory pages
func (h *ContentHandler) buildDirectory(ctx context.Context, pageContent *repository.Content) error {
	lineage := repository.GetLineageFromURI(repository.ParentURIFragment(pageContent.URI))
	lineage = append(lineage, pageContent.URI)
	
	directory := make([][]repository.Content, 0)
	
	// Get links from all parent stages
	for _, uri := range lineage[:len(lineage)-1] {
		items, err := content.FindFromAdjacentURI(ctx, uri)
		if err != nil {
			return err
		}
		filtered := filterDirectoryItems(items)
		if len(filtered) > 0 {
			directory = append(directory, filtered)
		}
	}
	
	// Append siblings of current page
	siblings, err := content.FindFromAdjacentURI(ctx, pageContent.URI)
	if err != nil {
		return err
	}
	filtered := filterDirectoryItems(siblings)
	if len(filtered) > 0 {
		directory = append(directory, filtered)
	}
	
	// Append children of current page
	children, err := content.GetChildren(ctx, pageContent)
	if err != nil {
		return err
	}
	// Filter out children with same title as parent
	var filteredChildren []repository.Content
	for _, child := range children {
		if child.Title != pageContent.Title && !child.Hide && child.Type != "further" {
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
				sublist, err := content.FindFromParentURI(ctx, item.URI)
				if err == nil {
					directory[i][j].Sublist = filterDirectoryItems(sublist)
				}
			}
		}
	}
	
	// If this page has a sublist, don't display children
	if pageContent.HasSublist && len(directory) > 0 {
		directory = directory[:len(directory)-1]
	}
	
	pageContent.Directory = directory
	
	// Build selected map
	pageContent.Selected = make(map[string]string)
	for _, uri := range lineage {
		pageContent.Selected[uri] = "-selected"
	}
	
	pageContent.Depth = len(pageContent.Directory)
	
	return nil
}

// buildAlphabetical builds alphabetical listing
func (h *ContentHandler) buildAlphabetical(ctx context.Context, pageContent *repository.Content) error {
	children, err := content.GetChildren(ctx, pageContent)
	if err != nil {
		return err
	}
	
	alphabet := "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
	pageContent.Alphabetical = make(map[string][]repository.Content)
	
	for _, letter := range alphabet {
		letterStr := string(letter)
		pageContent.Alphabetical[letterStr] = make([]repository.Content, 0)
		for _, child := range children {
			if len(child.Title) > 0 && strings.ToUpper(child.Title)[0] == byte(letter) {
				pageContent.Alphabetical[letterStr] = append(pageContent.Alphabetical[letterStr], child)
			}
		}
	}
	
	return nil
}

// filterDirectoryItems filters items for directory display
func filterDirectoryItems(items []repository.Content) []repository.Content {
	filtered := make([]repository.Content, 0)
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
		"Title":   "",
		"Message": "Not Found",
		"Error":   map[string]interface{}{},
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
	videoDocs, err := video.FindOne(ctx, uri)
	if err != nil {
		h.render404(w)
		return
	}
	
	// Get breadcrumbs for the video
	breadcrumbs := []repository.Breadcrumb{}
	lineage := repository.GetLineageFromURI(repository.ParentURIFragment(videoDocs.URI))
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
	
	// Pass the video object and additional data needed by the layout
	videoDocs.Breadcrumbs = breadcrumbs

	// Simple data structure for template
	data := map[string]interface{}{
		"Title":       videoDocs.Name,
		"Name":        videoDocs.Name,
		"ID":          videoDocs.ID,
		"UpdatedAt":   videoDocs.UpdatedAt,
		"CreatedAt":   videoDocs.CreatedAt,
		"Thumbnail":   videoDocs.Thumbnail,
		"Filename":    videoDocs.Filename,
		"YoutubeID":   videoDocs.YoutubeID,
		"Titles":      videoDocs.Titles,
		"URI":         videoDocs.URI,
		"V":           0, // MongoDB __v field
		"Breadcrumbs": breadcrumbs,
	}
	
	// Render video template
	h.render(w, "video-multipart.gohtml", data, "main")
}
package dashboard

import (
	"log"
	"net/http"
	"sort"
	"strings"
	"text/template"

	"github.com/maxfacts/maxfacts/pkg/content"
	"github.com/maxfacts/maxfacts/pkg/repository"
	templatehelpers "github.com/maxfacts/maxfacts/pkg/template"
)

// DirectoryHandler handles dashboard directory listing operations
type DirectoryHandler struct{
	templates *template.Template
}

// NewDirectoryHandler creates a new dashboard directory handler
func NewDirectoryHandler() *DirectoryHandler {
	return &DirectoryHandler{}
}

// ContentListItem represents a content item in the directory listing
type ContentListItem struct {
	*repository.Content
	IsEmpty           bool
	InvalidLinksCount int
}

// List renders the directory listing page
func (h *DirectoryHandler) List(w http.ResponseWriter, r *http.Request) {
	// Load template
	tmpl := template.New("").Funcs(templatehelpers.FuncMap())
	tmpl, err := tmpl.ParseFiles("templates/layouts/dashboard.gohtml", "templates/dashboard/directory.gohtml")
	if err != nil {
		log.Printf("Error loading directory templates: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	// Fetch all content
	allContent, err := content.FindAll(r.Context())
	if err != nil {
		log.Printf("Error fetching content: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Sort by URI
	sort.Slice(allContent, func(i, j int) bool {
		return allContent[i].URI < allContent[j].URI
	})

	// Build list items with additional metadata
	items := make([]ContentListItem, len(allContent))
	for i, c := range allContent {
		item := ContentListItem{
			Content: &allContent[i],
		}

		// Check if content is empty
		hasBody := c.Body != ""
		if !hasBody {
			if c.Type == "directory" {
				// Check if directory has children
				children, err := content.FindFromParentURI(r.Context(), c.URI)
				if err != nil {
					log.Printf("Error checking children for %s: %v", c.URI, err)
				}
				item.IsEmpty = len(children) == 0
			} else {
				item.IsEmpty = true
			}
		}

		// Count invalid links
		invalidLinks, err := content.GetInvalidLinks(r.Context(), &c)
		if err != nil {
			log.Printf("Error checking links for %s: %v", c.URI, err)
		}
		item.InvalidLinksCount = len(invalidLinks)

		items[i] = item
	}

	// Render template
	data := struct {
		Layout       string
		Title        string
		Items        []ContentListItem
		Breadcrumbs  []interface{}
		TemplateName string
	}{
		Layout:       "dashboard",
		Title:        "Content Directory",
		Items:        items,
		Breadcrumbs:  []interface{}{},
		TemplateName: "directory-content",
	}

	if err := tmpl.ExecuteTemplate(w, "dashboard.gohtml", data); err != nil {
		log.Printf("Error rendering template: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
}

// Delete handles content deletion
func (h *DirectoryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	// Extract URI from path: /dashboard/directory/delete/{uri}
	path := strings.TrimPrefix(r.URL.Path, "/dashboard/directory/delete/")
	
	// Require confirmation
	if r.URL.Query().Get("confirm") != "true" {
		http.Error(w, "Deletion must contain confirm=true in URL query string", http.StatusBadRequest)
		return
	}

	// Delete the content
	if err := content.DeleteOne(r.Context(), path); err != nil {
		log.Printf("Error deleting content %s: %v", path, err)
		http.Error(w, "Failed to delete content", http.StatusInternalServerError)
		return
	}
	
	// Redirect to directory listing
	http.Redirect(w, r, "/dashboard/directory", http.StatusSeeOther)
}

// BrokenLinks renders the broken links page
func (h *DirectoryHandler) BrokenLinks(w http.ResponseWriter, r *http.Request) {
	// Load template
	tmpl := template.New("").Funcs(templatehelpers.FuncMap())
	tmpl, err := tmpl.ParseFiles("templates/layouts/dashboard.gohtml", "templates/dashboard/broken-links.gohtml")
	if err != nil {
		log.Printf("Error loading broken links templates: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	// Fetch all content
	allContent, err := content.FindAll(r.Context())
	if err != nil {
		log.Printf("Error fetching content: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Sort by URI
	sort.Slice(allContent, func(i, j int) bool {
		return allContent[i].URI < allContent[j].URI
	})

	// Find pages with broken links
	pages := make(map[string][]string)
	for _, c := range allContent {
		invalidLinks, err := content.GetInvalidLinks(r.Context(), &c)
		if err != nil {
			log.Printf("Error checking links for %s: %v", c.URI, err)
			continue
		}
		if len(invalidLinks) > 0 {
			pages[c.URI] = invalidLinks
		}
	}

	// Render template
	data := struct {
		Layout       string
		Title        string
		Pages        map[string][]string
		Breadcrumbs  []interface{}
		TemplateName string
	}{
		Layout:       "dashboard",
		Title:        "Broken Links",
		Pages:        pages,
		Breadcrumbs:  []interface{}{},
		TemplateName: "broken-links-content",
	}

	if err := tmpl.ExecuteTemplate(w, "dashboard.gohtml", data); err != nil {
		log.Printf("Error rendering template: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
}

// Unattributed renders the unattributed content page
func (h *DirectoryHandler) Unattributed(w http.ResponseWriter, r *http.Request) {
	// Load template
	tmpl := template.New("").Funcs(templatehelpers.FuncMap())
	tmpl, err := tmpl.ParseFiles("templates/layouts/dashboard.gohtml", "templates/dashboard/unattributed.gohtml")
	if err != nil {
		log.Printf("Error loading unattributed templates: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	// Fetch all content
	allContent, err := content.FindAll(r.Context())
	if err != nil {
		log.Printf("Error fetching content: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Find unattributed pages
	type UnattributedPage struct {
		URI     string
		Title   string
		Type    string
		Parents []string
	}
	
	var pages []UnattributedPage
	for _, c := range allContent {
		if c.Authorship == "" {
			parts := strings.Split(c.URI, "/")
			parents := []string{}
			if len(parts) > 1 {
				parents = parts[:len(parts)-1]
			}
			
			pages = append(pages, UnattributedPage{
				URI:     c.URI,
				Title:   c.Title,
				Type:    c.Type,
				Parents: parents,
			})
		}
	}

	// Sort by URI
	sort.Slice(pages, func(i, j int) bool {
		return pages[i].URI < pages[j].URI
	})

	// Render template
	data := struct {
		Layout       string
		Title        string
		Pages        []UnattributedPage
		Breadcrumbs  []interface{}
		TemplateName string
	}{
		Layout:       "dashboard",
		Title:        "Unattributed Content",
		Pages:        pages,
		Breadcrumbs:  []interface{}{},
		TemplateName: "unattributed-content",
	}

	if err := tmpl.ExecuteTemplate(w, "dashboard.gohtml", data); err != nil {
		log.Printf("Error rendering template: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
}
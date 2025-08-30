package handlers

import (
	"log"
	"net/http"
	"text/template"

	"github.com/maxfacts/maxfacts/pkg/content"
	templatehelpers "github.com/maxfacts/maxfacts/pkg/template"
)

// DashboardHandler handles the dashboard overview page
type DashboardHandler struct{
	templates *template.Template
}

// NewDashboardHandler creates a new dashboard handler
func NewDashboardHandler() *DashboardHandler {
	// Load templates - only load overview template to avoid naming conflicts
	tmpl := template.New("").Funcs(templatehelpers.FuncMap())
	
	tmpl, err := tmpl.ParseFiles("templates/dashboard/overview.gohtml", "templates/layouts/dashboard.gohtml")
	if err != nil {
		log.Fatal("Failed to parse dashboard overview templates:", err)
	}
	
	return &DashboardHandler{
		templates: tmpl,
	}
}

// Overview renders the dashboard overview page
func (h *DashboardHandler) Overview(w http.ResponseWriter, r *http.Request) {
	// Count content with no authorship
	allContent, err := content.FindAll(r.Context())
	if err != nil {
		log.Printf("Error fetching content: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	unattributed := 0
	brokenLinks := 0
	
	for _, c := range allContent {
		if c.Authorship == "" {
			unattributed++
		}
		
		// Check for broken links
		invalidLinks, err := content.GetInvalidLinks(r.Context(), &c)
		if err != nil {
			log.Printf("Error checking links for %s: %v", c.URI, err)
			continue
		}
		if len(invalidLinks) > 0 {
			brokenLinks++
		}
	}

	data := struct {
		Layout       string
		Title        string
		Unattributed int
		BrokenLinks  int
		Breadcrumbs  []interface{}
		TemplateName string
	}{
		Layout:       "dashboard",
		Title:        "Dashboard Overview", 
		Unattributed: unattributed,
		BrokenLinks:  brokenLinks,
		Breadcrumbs:  []interface{}{}, // Empty for overview page
		TemplateName: "overview-content",
	}

	if err := h.templates.ExecuteTemplate(w, "dashboard.gohtml", data); err != nil {
		log.Printf("Error rendering template: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
}
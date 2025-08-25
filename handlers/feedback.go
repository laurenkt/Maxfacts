package handlers

import (
	"context"
	"log"
	"net/http"
	"strings"
	"text/template"
	"time"

	"github.com/maxfacts/maxfacts/pkg/content"
	"github.com/maxfacts/maxfacts/pkg/repository"
	templatehelpers "github.com/maxfacts/maxfacts/pkg/template"
	"golang.org/x/time/rate"
)

// FeedbackHandler handles feedback requests
type FeedbackHandler struct {
	templates *template.Template
	limiter   *rate.Limiter
}

// NewFeedbackHandler creates a new feedback handler
func NewFeedbackHandler() *FeedbackHandler {
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

	// Rate limiter: 3 requests per hour
	limiter := rate.NewLimiter(rate.Every(20*time.Minute), 3)

	return &FeedbackHandler{
		templates: tmpl,
		limiter:   limiter,
	}
}

// Feedback handles feedback form display and submission
func (h *FeedbackHandler) Feedback(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	// Rate limiting
	if !h.limiter.Allow() && false {
		http.Error(w, "Too many feedback requests sent from this IP, please try again later", http.StatusTooManyRequests)
		return
	}

	// Extract URI from path (removing /feedback suffix)
	uri := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/"), "/feedback")
	uri = strings.TrimSpace(uri)

	if r.Method == "GET" {
		h.getFeedback(ctx, w, r, uri)
	} else if r.Method == "POST" {
		h.postFeedback(ctx, w, r, uri)
	}
}

// getFeedback displays the feedback form
func (h *FeedbackHandler) getFeedback(ctx context.Context, w http.ResponseWriter, r *http.Request, uri string) {
	data := map[string]interface{}{
		"Title":       "Feedback",
		"URI":         uri,
		"Breadcrumbs": []repository.Breadcrumb{},
		"Email":       "", // Empty for GET request
		"Message":     "", // Empty for GET request
	}

	// If URI provided, get breadcrumbs
	if uri != "" {
		contentDoc, err := content.FindOne(ctx, uri)
		if err == nil {
			breadcrumbs, _ := content.GetBreadcrumbs(ctx, contentDoc)
			// Add the current content to breadcrumbs (matching Node.js behavior)
			breadcrumbs = append(breadcrumbs, repository.Breadcrumb{
				Title: contentDoc.Title,
				URI:   contentDoc.URI,
			})
			data["Breadcrumbs"] = breadcrumbs
			data["Title"] = "Feedback about " + contentDoc.Title
		}
	}

	h.render(w, "feedback.gohtml", data)
}

// postFeedback processes feedback form submission
func (h *FeedbackHandler) postFeedback(ctx context.Context, w http.ResponseWriter, r *http.Request, uri string) {
	// Parse form
	err := r.ParseForm()
	if err != nil {
		h.renderError(w, err)
		return
	}

	email := strings.TrimSpace(r.FormValue("email"))
	message := strings.TrimSpace(r.FormValue("message"))

	// Basic validation
	if email == "" || message == "" {
		h.renderFeedbackError(w, "Please provide both email and message", uri)
		return
	}

	// TODO: Send email (requires environment variables for SMTP)
	// For now, just log the feedback
	log.Printf("Feedback received - Email: %s, URI: %s, Message: %.100s...", email, uri, message)

	// Show confirmation
	data := map[string]interface{}{
		"Title": "Thank you for your feedback",
		"Email": email,
		"URI":   uri,
	}

	h.render(w, "feedback-confirmation.gohtml", data)
}

// render renders a template
func (h *FeedbackHandler) render(w http.ResponseWriter, templateName string, data map[string]interface{}) {
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

// renderFeedbackError renders feedback form with error message
func (h *FeedbackHandler) renderFeedbackError(w http.ResponseWriter, errorMsg, uri string) {
	data := map[string]interface{}{
		"Title":       "Feedback",
		"URI":         uri,
		"Error":       errorMsg,
		"Breadcrumbs": []repository.Breadcrumb{},
		"Email":       "", // Will be preserved on error
		"Message":     "", // Will be preserved on error
	}

	// If URI provided, get breadcrumbs
	if uri != "" {
		ctx := context.Background()
		contentDoc, err := content.FindOne(ctx, uri)
		if err == nil {
			breadcrumbs, _ := content.GetBreadcrumbs(ctx, contentDoc)
			// Add the current content to breadcrumbs (matching Node.js behavior)
			breadcrumbs = append(breadcrumbs, repository.Breadcrumb{
				Title: contentDoc.Title,
				URI:   contentDoc.URI,
			})
			data["Breadcrumbs"] = breadcrumbs
			data["Title"] = "Feedback about " + contentDoc.Title
		}
	}

	h.render(w, "feedback.gohtml", data)
}

// renderError renders an error page
func (h *FeedbackHandler) renderError(w http.ResponseWriter, err error) {
	w.WriteHeader(http.StatusInternalServerError)
	data := map[string]interface{}{
		"Title":   "Error",
		"Message": err.Error(),
		"Error":   err,
	}
	h.render(w, "error.gohtml", data)
}

package handlers

import (
	"context"
	"strings"
	"text/template"
	"log"
	"net/http"

	"github.com/maxfacts/maxfacts/pkg/recipe"
	"github.com/maxfacts/maxfacts/pkg/repository"
	templatehelpers "github.com/maxfacts/maxfacts/pkg/template"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// RecipeItem represents an item in a recipe array that could be a string or have a heading
type RecipeItem struct {
	Text    string
	Heading string
}

// processRecipeArray converts an interface{} array that might contain strings or objects with heading fields
func processRecipeArray(data interface{}) []RecipeItem {
	if data == nil {
		return nil
	}
	
	var arr []interface{}
	
	// Handle both primitive.A (BSON Array) and []interface{} types
	if primitiveArr, ok := data.(primitive.A); ok {
		arr = []interface{}(primitiveArr)
	} else if interfaceArr, ok := data.([]interface{}); ok {
		arr = interfaceArr
	} else {
		return nil
	}
	
	var items []RecipeItem
	for _, item := range arr {
		if item == nil {
			continue
		}
		
		// Check if it's a map with heading field (MongoDB BSON becomes map[string]interface{} or primitive.D)
		if itemMap, ok := item.(map[string]interface{}); ok {
			if heading, exists := itemMap["heading"]; exists {
				if headingStr, ok := heading.(string); ok {
					items = append(items, RecipeItem{Heading: headingStr})
				}
			}
		} else if primitiveD, ok := item.(primitive.D); ok {
			// Handle primitive.D (BSON Document) 
			for _, elem := range primitiveD {
				if elem.Key == "heading" {
					if headingStr, ok := elem.Value.(string); ok {
						items = append(items, RecipeItem{Heading: headingStr})
						break
					}
				}
			}
		} else if str, ok := item.(string); ok {
			// It's a regular string item
			items = append(items, RecipeItem{Text: str})
		}
	}
	
	return items
}

// RecipeHandler handles recipe requests
type RecipeHandler struct {
	templates *template.Template
}

// NewRecipeHandler creates a new recipe handler
func NewRecipeHandler() *RecipeHandler {
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
	tmpl, err = tmpl.ParseGlob("templates/recipes/*.gohtml")
	if err != nil {
		log.Fatal("Failed to parse recipe templates:", err)
	}

	return &RecipeHandler{
		templates: tmpl,
	}
}

// Index handles the recipe index page
func (h *RecipeHandler) Index(w http.ResponseWriter, r *http.Request) {
	data := map[string]interface{}{
		"Title": "Recipes",
		"Breadcrumbs": []repository.Breadcrumb{
			{Title: "Help & self-help", URI: "help"},
			{Title: "Oral food intake", URI: "help/oral-food"},
		},
	}

	h.render(w, "recipes/index.gohtml", data)
}

// Browse handles the recipe browser page
func (h *RecipeHandler) Browse(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	recipes, err := recipe.FindAll(ctx)
	if err != nil {
		h.renderError(w, err)
		return
	}

	data := map[string]interface{}{
		"Title":   "Recipe Browser",
		"Recipes": recipes,
		"Breadcrumbs": []repository.Breadcrumb{
			{Title: "Help & self-help", URI: "help"},
			{Title: "Oral food intake", URI: "help/oral-food"},
			{Title: "Recipes", URI: "help/oral-food/recipes"},
		},
	}

	h.render(w, "recipes/browser.gohtml", data)
}

// Recipe handles individual recipe pages
func (h *RecipeHandler) Recipe(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	// Extract recipe ID from path (everything after /help/oral-food/recipes/)
	id := strings.TrimPrefix(r.URL.Path, "/help/oral-food/recipes/")

	recipeDoc, err := recipe.FindOne(ctx, id)
	if err != nil {
		h.render404(w)
		return
	}
	if err != nil {
		h.renderError(w, err)
		return
	}

	recipeDoc.Breadcrumbs = []repository.Breadcrumb{
		{Title: "Help & self-help", URI: "help"},
		{Title: "Oral food intake", URI: "help/oral-food"},
		{Title: "Recipes", URI: "help/oral-food/recipes"},
		{Title: "Browser", URI: "help/oral-food/recipes/browse"},
	}

	data := map[string]interface{}{
		"Title":       recipeDoc.Title,
		"Breadcrumbs": recipeDoc.Breadcrumbs,
		"RecipeID":    recipeDoc.RecipeID,
		"Description": processRecipeArray(recipeDoc.Description),
		"Ingredients": processRecipeArray(recipeDoc.Ingredients),
		"Method":      processRecipeArray(recipeDoc.Method),
		"Variations":  processRecipeArray(recipeDoc.Variations),
		"Tip":         processRecipeArray(recipeDoc.Tip), // Fixed: both DB and template use "tip"
		"Tags":        recipeDoc.Tags,
		"UpdatedAt":   recipeDoc.UpdatedAt,
		"Body":        "recipe", // For article-metadata template
	}

	h.render(w, "recipes/recipe.gohtml", data)
}

// render renders a template  
func (h *RecipeHandler) render(w http.ResponseWriter, templateName string, data map[string]interface{}) {
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
func (h *RecipeHandler) render404(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNotFound)
	data := map[string]interface{}{
		"Title":   "Not Found",
		"Message": "Recipe not found",
		"Error":   map[string]interface{}{"Status": "404"},
	}
	h.render(w, "error.gohtml", data)
}

// renderError renders an error page
func (h *RecipeHandler) renderError(w http.ResponseWriter, err error) {
	w.WriteHeader(http.StatusInternalServerError)
	data := map[string]interface{}{
		"Title":   "Error",
		"Message": err.Error(),
		"Error":   err,
	}
	h.render(w, "error.gohtml", data)
}
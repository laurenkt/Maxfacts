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

// RecipeHandler handles recipe requests
type RecipeHandler struct {
	recipeModel *models.RecipeModel
	templates   *template.Template
}

// NewRecipeHandler creates a new recipe handler
func NewRecipeHandler(db *mongo.Database) *RecipeHandler {
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
		recipeModel: models.NewRecipeModel(db),
		templates:   tmpl,
	}
}

// Index handles the recipe index page
func (h *RecipeHandler) Index(w http.ResponseWriter, r *http.Request) {
	data := map[string]interface{}{
		"Title": "Recipes",
		"Breadcrumbs": []models.Breadcrumb{
			{Title: "Help & self-help", URI: "help"},
			{Title: "Oral food intake", URI: "help/oral-food"},
		},
	}

	h.render(w, "recipes/index.gohtml", data)
}

// Browse handles the recipe browser page
func (h *RecipeHandler) Browse(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	recipes, err := h.recipeModel.FindAll(ctx)
	if err != nil {
		h.renderError(w, err)
		return
	}

	data := map[string]interface{}{
		"Title":   "Recipe Browser",
		"Recipes": recipes,
		"Breadcrumbs": []models.Breadcrumb{
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
	vars := mux.Vars(r)
	id := vars["id"]

	recipe, err := h.recipeModel.FindOne(ctx, id)
	if err == mongo.ErrNoDocuments {
		h.render404(w)
		return
	}
	if err != nil {
		h.renderError(w, err)
		return
	}

	recipe.Breadcrumbs = []models.Breadcrumb{
		{Title: "Help & self-help", URI: "help"},
		{Title: "Oral food intake", URI: "help/oral-food"},
		{Title: "Recipes", URI: "help/oral-food/recipes"},
		{Title: "Browser", URI: "help/oral-food/recipes/browse"},
	}

	data := map[string]interface{}{
		"Title":       recipe.Title,
		"Breadcrumbs": recipe.Breadcrumbs,
		"RecipeID":    recipe.RecipeID,
		"Description": recipe.Description,
		"Ingredients": recipe.Ingredients,
		"Method":      recipe.Method,
		"Variations":  recipe.Variations,
		"Tip":         recipe.Tip,
		"Tags":        recipe.Tags,
		"UpdatedAt":   recipe.UpdatedAt,
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
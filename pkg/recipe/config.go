package recipe

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/maxfacts/maxfacts/pkg/markdown"
	"github.com/maxfacts/maxfacts/pkg/mongodb"
)

// Internal writer instance
var recipeWriter *markdown.RecipeWriter = nil

// UseMongo configures recipe to use MongoDB
func UseMongo(db *mongo.Database) {
	recipeRepo = mongodb.NewRecipeRepository(db)
	log.Printf("Recipe: switched to MongoDB repository")
}

// UseMarkdown configures recipe to use markdown files
func UseMarkdown() error {
	indexPath := "data/markdown/index_recipes.csv"
	csvContent, err := os.ReadFile(indexPath)
	if err != nil {
		return fmt.Errorf("failed to read recipe index: %w", err)
	}
	
	repo, err := markdown.NewRecipeRepository("data/markdown/recipes", string(csvContent))
	if err != nil {
		return fmt.Errorf("failed to create markdown recipe repository: %w", err)
	}
	
	recipeRepo = repo
	log.Printf("Recipe: switched to markdown repository")
	return nil
}

// UseMarkdownReader configures the recipe package to read from markdown files
func UseMarkdownReader(indexCSVPath string) error {
	// Read the CSV index file
	csvContent, err := os.ReadFile(indexCSVPath)
	if err != nil {
		return fmt.Errorf("failed to read index CSV: %w", err)
	}
	
	// Get directory from CSV path
	recipeDir := filepath.Dir(indexCSVPath)
	if filepath.Base(recipeDir) == "markdown" {
		recipeDir = filepath.Join(recipeDir, "recipes")
	}
	
	repo, err := markdown.NewRecipeRepository(recipeDir, string(csvContent))
	if err != nil {
		return fmt.Errorf("failed to create markdown recipe repository: %w", err)
	}
	
	recipeRepo = repo
	return nil
}

// UseMarkdownWriter configures the recipe package to write to markdown files
func UseMarkdownWriter(outputDir string) error {
	writer, err := markdown.NewRecipeWriter(outputDir)
	if err != nil {
		return fmt.Errorf("failed to create recipe writer: %w", err)
	}
	recipeWriter = writer
	return nil
}
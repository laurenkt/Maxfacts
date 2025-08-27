package recipe

import (
	"fmt"
	"log"
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
	repo, err := markdown.NewRecipeRepository("data/markdown/recipes")
	if err != nil {
		return fmt.Errorf("failed to create markdown recipe repository: %w", err)
	}
	
	recipeRepo = repo
	log.Printf("Recipe: switched to markdown repository")
	return nil
}

// UseMarkdownReader configures the recipe package to read from markdown files
func UseMarkdownReader(recipeDir string) error {
	repo, err := markdown.NewRecipeRepository(recipeDir)
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
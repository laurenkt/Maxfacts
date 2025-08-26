package recipe

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/maxfacts/maxfacts/pkg/markdown"
	"github.com/maxfacts/maxfacts/pkg/repository"
)

// Internal repository instance - set by configuration functions
var recipeRepo repository.RecipeRepository = nil

func init() {
	// Try to load markdown repository by default
	indexPath := "data/markdown/index_recipes.csv"
	if _, err := os.Stat(indexPath); err == nil {
		// Index file exists, load markdown repository
		csvContent, err := os.ReadFile(indexPath)
		if err != nil {
			log.Printf("Warning: failed to read recipe index: %v", err)
			return
		}
		
		repo, err := markdown.NewRecipeRepository("data/markdown/recipes", string(csvContent))
		if err != nil {
			log.Printf("Warning: failed to create markdown recipe repository: %v", err)
			return
		}
		
		recipeRepo = repo
		log.Printf("Recipe: using markdown repository from %s", indexPath)
	}
}

// FindAll returns all recipes sorted by title
func FindAll(ctx context.Context) ([]repository.Recipe, error) {
	if recipeRepo == nil {
		return nil, fmt.Errorf("recipe repository not configured - call UseMongo() first")
	}
	return recipeRepo.FindAll(ctx)
}

// FindOne finds a recipe by ID
func FindOne(ctx context.Context, id string) (*repository.Recipe, error) {
	if recipeRepo == nil {
		return nil, fmt.Errorf("recipe repository not configured - call UseMongo() first")
	}
	return recipeRepo.FindOne(ctx, id)
}

// WriteOne writes a single recipe item to markdown
func WriteOne(ctx context.Context, recipe *repository.Recipe) error {
	if recipeWriter == nil {
		return fmt.Errorf("recipe writer not configured - call UseMarkdownWriter() first")
	}
	return recipeWriter.WriteOne(ctx, recipe)
}

// WriteIndex writes the URI-to-ID index for recipes
func WriteIndex(ctx context.Context, recipes []repository.Recipe) error {
	if recipeWriter == nil {
		return fmt.Errorf("recipe writer not configured - call UseMarkdownWriter() first")
	}
	return recipeWriter.WriteIndex(ctx, recipes)
}
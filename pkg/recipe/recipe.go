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
	recipeDir := "data/markdown/recipes"
	if _, err := os.Stat(recipeDir); err == nil {
		// Recipe directory exists, load markdown repository
		repo, err := markdown.NewRecipeRepository(recipeDir)
		if err != nil {
			log.Printf("Warning: failed to create markdown recipe repository: %v", err)
			return
		}
		
		recipeRepo = repo
		log.Printf("Recipe: using markdown repository from %s", recipeDir)
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


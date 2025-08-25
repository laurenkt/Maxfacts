package recipe

import (
	"context"
	"fmt"

	"github.com/maxfacts/maxfacts/pkg/repository"
)

// Internal repository instance - set by configuration functions
var recipeRepo repository.RecipeRepository = nil

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
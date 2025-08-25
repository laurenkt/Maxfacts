package repository

import (
	"context"
)

// RecipeRepository defines the interface for recipe data access
type RecipeRepository interface {
	// FindAll returns all recipes sorted by title
	FindAll(ctx context.Context) ([]Recipe, error)
	
	// FindOne finds a recipe by ID
	FindOne(ctx context.Context, id string) (*Recipe, error)
}
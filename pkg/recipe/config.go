package recipe

import (
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/maxfacts/maxfacts/pkg/mongodb"
)

// UseMongo configures recipe to use MongoDB
// Currently this is the only supported backend for recipes
func UseMongo(db *mongo.Database) {
	recipeRepo = mongodb.NewRecipeRepository(db)
}
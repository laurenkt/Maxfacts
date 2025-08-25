package mongodb

import (
	"context"
	"time"

	"github.com/maxfacts/maxfacts/pkg/repository"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Ensure RecipeRepository implements the interface
var _ repository.RecipeRepository = &RecipeRepository{}

// RecipeRepository provides MongoDB-based recipe operations
type RecipeRepository struct {
	collection *mongo.Collection
}

// NewRecipeRepository creates a new MongoDB recipe repository
func NewRecipeRepository(db *mongo.Database) *RecipeRepository {
	return &RecipeRepository{
		collection: db.Collection("recipes"),
	}
}

// mongoRecipe represents the MongoDB document structure for recipes
type mongoRecipe struct {
	ID          primitive.ObjectID   `bson:"_id,omitempty"`
	RecipeID    string               `bson:"id"`
	Title       string               `bson:"title"`
	Tags        []string             `bson:"tags"`
	Description interface{}          `bson:"description"`
	Ingredients interface{}          `bson:"ingredients"`
	Method      interface{}          `bson:"method"`
	Variations  interface{}          `bson:"variations"`
	Tip         interface{}          `bson:"tip"`
	UpdatedAt   time.Time            `bson:"updatedAt,omitempty"`
	CreatedAt   time.Time            `bson:"createdAt,omitempty"`
}

// toRepositoryRecipe converts MongoDB recipe to repository recipe
func toRepositoryRecipe(mr *mongoRecipe) *repository.Recipe {
	recipe := &repository.Recipe{
		ID:          mr.ID.Hex(),
		RecipeID:    mr.RecipeID,
		Title:       mr.Title,
		Tags:        mr.Tags,
		Description: mr.Description,
		Ingredients: mr.Ingredients,
		Method:      mr.Method,
		Variations:  mr.Variations,
		Tip:         mr.Tip,
		UpdatedAt:   mr.UpdatedAt,
		CreatedAt:   mr.CreatedAt,
		// Virtual fields
		URI:         "help/oral-food/recipes/" + mr.RecipeID,
		Breadcrumbs: []repository.Breadcrumb{},
	}
	
	// If UpdatedAt is not set, use the timestamp from ObjectID
	if recipe.UpdatedAt.IsZero() && !mr.ID.IsZero() {
		recipe.UpdatedAt = mr.ID.Timestamp()
	}
	
	return recipe
}

// FindAll returns all recipes sorted by title
func (r *RecipeRepository) FindAll(ctx context.Context) ([]repository.Recipe, error) {
	cursor, err := r.collection.Find(ctx, bson.M{}, options.Find().SetSort(bson.D{{Key: "title", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	
	var mongoRecipes []mongoRecipe
	if err = cursor.All(ctx, &mongoRecipes); err != nil {
		return nil, err
	}
	
	recipes := make([]repository.Recipe, len(mongoRecipes))
	for i, mr := range mongoRecipes {
		recipes[i] = *toRepositoryRecipe(&mr)
	}
	
	return recipes, nil
}

// FindOne finds a recipe by ID
func (r *RecipeRepository) FindOne(ctx context.Context, id string) (*repository.Recipe, error) {
	var mr mongoRecipe
	err := r.collection.FindOne(ctx, bson.M{"id": id}).Decode(&mr)
	if err != nil {
		return nil, err
	}
	
	return toRepositoryRecipe(&mr), nil
}
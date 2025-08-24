package models

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Recipe represents a recipe in the system
type Recipe struct {
	ID          primitive.ObjectID `bson:"_id,omitempty"`
	RecipeID    string             `bson:"id"`
	Title       string             `bson:"title"`
	Tags        []string           `bson:"tags"`
	Description interface{}        `bson:"description"`
	Ingredients interface{}        `bson:"ingredients"`
	Method      interface{}        `bson:"method"`
	Variations  interface{}        `bson:"variations"`
	Tip         interface{}        `bson:"tip"`
	UpdatedAt   time.Time          `bson:"updatedAt,omitempty"`
	CreatedAt   time.Time          `bson:"createdAt,omitempty"`
	
	// Virtual fields
	URI         string             `bson:"-"`
	Breadcrumbs []Breadcrumb       `bson:"-"`
}

// RecipeModel provides methods for recipe operations
type RecipeModel struct {
	collection *mongo.Collection
}

// NewRecipeModel creates a new recipe model
func NewRecipeModel(db *mongo.Database) *RecipeModel {
	return &RecipeModel{
		collection: db.Collection("recipes"),
	}
}

// FindAll returns all recipes
func (m *RecipeModel) FindAll(ctx context.Context) ([]Recipe, error) {
	cursor, err := m.collection.Find(ctx, bson.M{}, options.Find().SetSort(bson.D{{"title", 1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	
	var recipes []Recipe
	if err = cursor.All(ctx, &recipes); err != nil {
		return nil, err
	}
	
	// Set URI for each recipe and handle UpdatedAt
	for i := range recipes {
		recipes[i].URI = "help/oral-food/recipes/" + recipes[i].RecipeID
		
		// If UpdatedAt is not set, use the timestamp from ObjectID
		if recipes[i].UpdatedAt.IsZero() && !recipes[i].ID.IsZero() {
			recipes[i].UpdatedAt = recipes[i].ID.Timestamp()
		}
	}
	
	return recipes, nil
}

// FindOne finds a recipe by ID
func (m *RecipeModel) FindOne(ctx context.Context, id string) (*Recipe, error) {
	var recipe Recipe
	err := m.collection.FindOne(ctx, bson.M{"id": id}).Decode(&recipe)
	if err != nil {
		return nil, err
	}
	
	recipe.URI = "help/oral-food/recipes/" + recipe.RecipeID
	
	// If UpdatedAt is not set, use the timestamp from ObjectID
	if recipe.UpdatedAt.IsZero() && !recipe.ID.IsZero() {
		recipe.UpdatedAt = recipe.ID.Timestamp()
	}
	
	return &recipe, nil
}
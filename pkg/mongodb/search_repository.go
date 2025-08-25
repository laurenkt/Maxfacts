package mongodb

import (
	"context"

	"github.com/maxfacts/maxfacts/pkg/repository"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Ensure SearchRepository implements the interface
var _ repository.ContentSearchRepository = &SearchRepository{}

// SearchRepository provides MongoDB-based search operations
type SearchRepository struct {
	collection *mongo.Collection
}

// NewSearchRepository creates a new MongoDB search repository
func NewSearchRepository(db *mongo.Database) *SearchRepository {
	return &SearchRepository{
		collection: db.Collection("contents"),
	}
}

// Search performs a text search on content
func (r *SearchRepository) Search(ctx context.Context, query string) ([]repository.Content, error) {
	filter := bson.M{
		"$text": bson.M{"$search": query},
		"hide":  false,
	}
	
	projection := bson.M{
		"score": bson.M{"$meta": "textScore"},
	}
	
	opts := options.Find().
		SetProjection(projection).
		SetSort(bson.M{"score": bson.M{"$meta": "textScore"}})
	
	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	
	var mongoContents []mongoContent
	if err = cursor.All(ctx, &mongoContents); err != nil {
		return nil, err
	}
	
	contents := make([]repository.Content, len(mongoContents))
	for i, mc := range mongoContents {
		contents[i] = *toRepositoryContent(&mc)
	}
	
	return contents, nil
}
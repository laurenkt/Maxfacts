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

// Ensure VideoRepository implements the interface
var _ repository.VideoRepository = &VideoRepository{}

// VideoRepository provides MongoDB-based video operations
type VideoRepository struct {
	collection *mongo.Collection
}

// NewVideoRepository creates a new MongoDB video repository
func NewVideoRepository(db *mongo.Database) *VideoRepository {
	return &VideoRepository{
		collection: db.Collection("videos"),
	}
}

// mongoVideo represents the MongoDB document structure for videos
type mongoVideo struct {
	ID        primitive.ObjectID   `bson:"_id,omitempty"`
	URI       string               `bson:"uri"`
	Name      string               `bson:"name"`
	YoutubeID string               `bson:"youtube_id"`
	Filename  string               `bson:"filename"`
	Thumbnail string               `bson:"thumbnail"`
	Titles    string               `bson:"titles"`
	UpdatedAt time.Time            `bson:"updatedAt"`
	CreatedAt time.Time            `bson:"createdAt"`
}

// toRepositoryVideo converts MongoDB video to repository video
func toRepositoryVideo(mv *mongoVideo) *repository.Video {
	return &repository.Video{
		ID:        mv.ID.Hex(),
		URI:       mv.URI,
		Name:      mv.Name,
		YoutubeID: mv.YoutubeID,
		Filename:  mv.Filename,
		Thumbnail: mv.Thumbnail,
		Titles:    mv.Titles,
		UpdatedAt: mv.UpdatedAt,
		CreatedAt: mv.CreatedAt,
		// Virtual fields
		Breadcrumbs: []repository.Breadcrumb{},
	}
}

// FindOne finds a video by URI
func (r *VideoRepository) FindOne(ctx context.Context, uri string) (*repository.Video, error) {
	var mv mongoVideo
	err := r.collection.FindOne(ctx, bson.M{"uri": uri}).Decode(&mv)
	if err != nil {
		return nil, err
	}
	
	return toRepositoryVideo(&mv), nil
}

// FindAll returns all videos sorted by URI
func (r *VideoRepository) FindAll(ctx context.Context) ([]repository.Video, error) {
	opts := options.Find().SetSort(bson.M{"uri": 1})
	cursor, err := r.collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	
	var mongoVideos []mongoVideo
	if err = cursor.All(ctx, &mongoVideos); err != nil {
		return nil, err
	}
	
	videos := make([]repository.Video, len(mongoVideos))
	for i, mv := range mongoVideos {
		videos[i] = *toRepositoryVideo(&mv)
	}
	
	return videos, nil
}
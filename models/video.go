package models

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Video represents a video in the system
type Video struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"`
	URI       string             `bson:"uri"`
	Name      string             `bson:"name"`
	YoutubeID string             `bson:"youtube_id"`
	Filename  string             `bson:"filename"`
	Thumbnail string             `bson:"thumbnail"`
	Titles    string             `bson:"titles"`
	UpdatedAt time.Time          `bson:"updatedAt"`
	CreatedAt time.Time          `bson:"createdAt"`
	
	// Virtual fields
	Breadcrumbs []Breadcrumb `bson:"-"`
}

// VideoModel provides methods for video operations
type VideoModel struct {
	collection *mongo.Collection
}

// NewVideoModel creates a new video model
func NewVideoModel(db *mongo.Database) *VideoModel {
	return &VideoModel{
		collection: db.Collection("videos"),
	}
}

// FindOne finds a video by URI
func (m *VideoModel) FindOne(ctx context.Context, uri string) (*Video, error) {
	var video Video
	err := m.collection.FindOne(ctx, bson.M{"uri": uri}).Decode(&video)
	if err != nil {
		return nil, err
	}
	return &video, nil
}

// FindAll returns all videos sorted by URI
func (m *VideoModel) FindAll(ctx context.Context) ([]Video, error) {
	opts := options.Find().SetSort(bson.M{"uri": 1})
	cursor, err := m.collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	
	var videos []Video
	if err = cursor.All(ctx, &videos); err != nil {
		return nil, err
	}
	return videos, nil
}
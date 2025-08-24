package models

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// Image represents an image in the system
type Image struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"`
	URI       string             `bson:"uri"`
	Title     string             `bson:"title"`
	UpdatedAt time.Time          `bson:"updatedAt,omitempty"`
	CreatedAt time.Time          `bson:"createdAt,omitempty"`
}

// ImageModel provides methods for image operations
type ImageModel struct {
	collection *mongo.Collection
}

// NewImageModel creates a new image model
func NewImageModel(db *mongo.Database) *ImageModel {
	return &ImageModel{
		collection: db.Collection("images"),
	}
}

// FindByURIs finds images matching the given URIs
func (m *ImageModel) FindByURIs(ctx context.Context, uris []string) ([]Image, error) {
	cursor, err := m.collection.Find(ctx, bson.M{"uri": bson.M{"$in": uris}})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	
	var images []Image
	if err = cursor.All(ctx, &images); err != nil {
		return nil, err
	}
	return images, nil
}
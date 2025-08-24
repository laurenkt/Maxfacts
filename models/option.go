package models

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// Option represents a system option
type Option struct {
	ID    primitive.ObjectID `bson:"_id,omitempty"`
	Key   string             `bson:"key"`
	Value string             `bson:"value"`
}

// OptionModel provides methods for option operations
type OptionModel struct {
	collection *mongo.Collection
}

// NewOptionModel creates a new option model
func NewOptionModel(db *mongo.Database) *OptionModel {
	return &OptionModel{
		collection: db.Collection("options"),
	}
}

// Get retrieves an option value by key
func (m *OptionModel) Get(ctx context.Context, key string) (string, error) {
	var option Option
	err := m.collection.FindOne(ctx, bson.M{"key": key}).Decode(&option)
	if err == mongo.ErrNoDocuments {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return option.Value, nil
}

// GetAll retrieves all options
func (m *OptionModel) GetAll(ctx context.Context) (map[string]string, error) {
	cursor, err := m.collection.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	
	options := make(map[string]string)
	for cursor.Next(ctx) {
		var option Option
		if err := cursor.Decode(&option); err != nil {
			continue
		}
		options[option.Key] = option.Value
	}
	
	return options, nil
}
package video

import (
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/maxfacts/maxfacts/pkg/mongodb"
)

// UseMongo configures video to use MongoDB
// Currently this is the only supported backend for videos
func UseMongo(db *mongo.Database) {
	videoRepo = mongodb.NewVideoRepository(db)
}
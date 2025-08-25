package video

import (
	"context"
	"fmt"

	"github.com/maxfacts/maxfacts/pkg/repository"
)

// Internal repository instance - set by configuration functions
var videoRepo repository.VideoRepository = nil

// FindOne finds a video by URI
func FindOne(ctx context.Context, uri string) (*repository.Video, error) {
	if videoRepo == nil {
		return nil, fmt.Errorf("video repository not configured - call UseMongo() first")
	}
	return videoRepo.FindOne(ctx, uri)
}

// FindAll returns all videos sorted by URI
func FindAll(ctx context.Context) ([]repository.Video, error) {
	if videoRepo == nil {
		return nil, fmt.Errorf("video repository not configured - call UseMongo() first")
	}
	return videoRepo.FindAll(ctx)
}
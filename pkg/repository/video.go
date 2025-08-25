package repository

import (
	"context"
)

// VideoRepository defines the interface for video data access
type VideoRepository interface {
	// FindOne finds a video by URI
	FindOne(ctx context.Context, uri string) (*Video, error)
	
	// FindAll returns all videos sorted by URI
	FindAll(ctx context.Context) ([]Video, error)
}
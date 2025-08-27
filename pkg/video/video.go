package video

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/maxfacts/maxfacts/pkg/markdown"
	"github.com/maxfacts/maxfacts/pkg/repository"
)

// Internal repository instance - set by configuration functions
var videoRepo repository.VideoRepository = nil

func init() {
	// Try to load markdown repository by default
	videoDir := "data/markdown/videos"
	if _, err := os.Stat(videoDir); err == nil {
		// Video directory exists, load markdown repository
		repo, err := markdown.NewVideoRepository(videoDir)
		if err != nil {
			log.Printf("Warning: failed to create markdown video repository: %v", err)
			return
		}
		
		videoRepo = repo
		log.Printf("Video: using markdown repository from %s", videoDir)
	}
}

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

// WriteOne writes a single video item to markdown
func WriteOne(ctx context.Context, video *repository.Video) error {
	if videoWriter == nil {
		return fmt.Errorf("video writer not configured - call UseMarkdownWriter() first")
	}
	return videoWriter.WriteOne(ctx, video)
}


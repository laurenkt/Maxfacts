package video

import (
	"fmt"
	"log"
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/maxfacts/maxfacts/pkg/markdown"
	"github.com/maxfacts/maxfacts/pkg/mongodb"
)

// Internal writer instance
var videoWriter *markdown.VideoWriter = nil

// UseMongo configures video to use MongoDB
func UseMongo(db *mongo.Database) {
	videoRepo = mongodb.NewVideoRepository(db)
	log.Printf("Video: switched to MongoDB repository")
}

// UseMarkdown configures video to use markdown files
func UseMarkdown() error {
	repo, err := markdown.NewVideoRepository("data/markdown/videos")
	if err != nil {
		return fmt.Errorf("failed to create markdown video repository: %w", err)
	}
	
	videoRepo = repo
	log.Printf("Video: switched to markdown repository")
	return nil
}

// UseMarkdownReader configures the video package to read from markdown files
func UseMarkdownReader(videoDir string) error {
	repo, err := markdown.NewVideoRepository(videoDir)
	if err != nil {
		return fmt.Errorf("failed to create markdown video repository: %w", err)
	}
	
	videoRepo = repo
	return nil
}

// UseMarkdownWriter configures the video package to write to markdown files
func UseMarkdownWriter(outputDir string) error {
	writer, err := markdown.NewVideoWriter(outputDir)
	if err != nil {
		return fmt.Errorf("failed to create video writer: %w", err)
	}
	videoWriter = writer
	return nil
}
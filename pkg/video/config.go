package video

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
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
	indexPath := "data/markdown/index_videos.csv"
	csvContent, err := os.ReadFile(indexPath)
	if err != nil {
		return fmt.Errorf("failed to read video index: %w", err)
	}
	
	repo, err := markdown.NewVideoRepository("data/markdown/videos", string(csvContent))
	if err != nil {
		return fmt.Errorf("failed to create markdown video repository: %w", err)
	}
	
	videoRepo = repo
	log.Printf("Video: switched to markdown repository")
	return nil
}

// UseMarkdownReader configures the video package to read from markdown files
func UseMarkdownReader(indexCSVPath string) error {
	// Read the CSV index file
	csvContent, err := os.ReadFile(indexCSVPath)
	if err != nil {
		return fmt.Errorf("failed to read index CSV: %w", err)
	}
	
	// Get directory from CSV path
	videoDir := filepath.Dir(indexCSVPath)
	if filepath.Base(videoDir) == "markdown" {
		videoDir = filepath.Join(videoDir, "videos")
	}
	
	repo, err := markdown.NewVideoRepository(videoDir, string(csvContent))
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
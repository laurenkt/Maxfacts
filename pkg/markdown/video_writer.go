package markdown

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/maxfacts/maxfacts/pkg/repository"
)

// VideoWriter implements repository.VideoWriter for markdown files
type VideoWriter struct {
	outputDir string
}

// NewVideoWriter creates a new markdown video writer
func NewVideoWriter(outputDir string) (*VideoWriter, error) {
	// Create output directory if it doesn't exist
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create output directory: %w", err)
	}
	
	return &VideoWriter{
		outputDir: outputDir,
	}, nil
}

// WriteOne writes a single video item to a markdown file
func (w *VideoWriter) WriteOne(ctx context.Context, video *repository.Video) error {
	if video.ID == "" {
		return fmt.Errorf("video ID is empty")
	}
	
	// Use the MongoDB ObjectID as filename
	filename := fmt.Sprintf("%s.md", video.ID)
	filepath := filepath.Join(w.outputDir, filename)
	
	// Convert to markdown
	markdown := convertVideoToMarkdown(video)
	
	// Write to file
	if err := os.WriteFile(filepath, []byte(markdown), 0644); err != nil {
		return fmt.Errorf("failed to write file %s: %w", filename, err)
	}
	
	return nil
}


// convertVideoToMarkdown converts a video item to markdown with YAML frontmatter
func convertVideoToMarkdown(video *repository.Video) string {
	var sb strings.Builder
	
	// Add frontmatter
	sb.WriteString("---\n")
	sb.WriteString(fmt.Sprintf("id: %s\n", video.ID))
	sb.WriteString(fmt.Sprintf("uri: %s\n", video.URI))
	sb.WriteString(fmt.Sprintf("name: %s\n", video.Name))
	
	if video.YoutubeID != "" {
		sb.WriteString(fmt.Sprintf("youtube_id: %s\n", video.YoutubeID))
	}
	
	if video.Filename != "" {
		sb.WriteString(fmt.Sprintf("filename: %s\n", video.Filename))
	}
	
	if video.Thumbnail != "" {
		sb.WriteString(fmt.Sprintf("thumbnail: %s\n", video.Thumbnail))
	}
	
	if video.Titles != "" {
		// Handle multiline titles
		if strings.Contains(video.Titles, "\n") {
			sb.WriteString("titles: |\n")
			lines := strings.Split(video.Titles, "\n")
			for _, line := range lines {
				sb.WriteString(fmt.Sprintf("  %s\n", line))
			}
		} else {
			sb.WriteString(fmt.Sprintf("titles: %s\n", video.Titles))
		}
	}
	
	if !video.UpdatedAt.IsZero() {
		sb.WriteString(fmt.Sprintf("updated_at: %s\n", video.UpdatedAt.Format(time.RFC3339)))
	}
	
	if !video.CreatedAt.IsZero() {
		sb.WriteString(fmt.Sprintf("created_at: %s\n", video.CreatedAt.Format(time.RFC3339)))
	}
	
	sb.WriteString("---\n\n")
	
	// Videos don't have body content in the current model
	
	return sb.String()
}
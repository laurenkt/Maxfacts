package markdown

import (
	"context"
	"encoding/csv"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/maxfacts/maxfacts/pkg/repository"
)

// ContentWriter implements repository.ContentWriter for markdown files
type ContentWriter struct {
	outputDir string
}

// NewContentWriter creates a new markdown content writer
func NewContentWriter(outputDir string) (*ContentWriter, error) {
	// Create output directory if it doesn't exist
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create output directory: %w", err)
	}
	
	return &ContentWriter{
		outputDir: outputDir,
	}, nil
}

// WriteOne writes a single content item to a markdown file
func (w *ContentWriter) WriteOne(ctx context.Context, content *repository.Content) error {
	if content.ID == "" {
		return fmt.Errorf("content ID is empty")
	}
	
	filename := fmt.Sprintf("%s.md", content.ID)
	filepath := filepath.Join(w.outputDir, filename)
	
	// Convert to markdown
	markdown := convertContentToMarkdown(content)
	
	// Write to file
	if err := os.WriteFile(filepath, []byte(markdown), 0644); err != nil {
		return fmt.Errorf("failed to write file %s: %w", filename, err)
	}
	
	return nil
}

// WriteIndex writes the URI-to-ID index CSV file
func (w *ContentWriter) WriteIndex(ctx context.Context, contents []repository.Content) error {
	// Sort contents by URI for consistent ordering
	sort.Slice(contents, func(i, j int) bool {
		return contents[i].URI < contents[j].URI
	})
	
	// Create CSV file
	csvPath := "data/markdown/index_uri.csv"
	csvFile, err := os.Create(csvPath)
	if err != nil {
		return fmt.Errorf("failed to create CSV file: %w", err)
	}
	defer csvFile.Close()
	
	csvWriter := csv.NewWriter(csvFile)
	defer csvWriter.Flush()
	
	// Write CSV header
	if err := csvWriter.Write([]string{"uri", "id"}); err != nil {
		return fmt.Errorf("failed to write CSV header: %w", err)
	}
	
	// Write content data
	for _, content := range contents {
		if err := csvWriter.Write([]string{content.URI, content.ID}); err != nil {
			return fmt.Errorf("failed to write CSV row for %s: %w", content.URI, err)
		}
	}
	
	return nil
}

// convertContentToMarkdown converts a content item to markdown with YAML frontmatter
func convertContentToMarkdown(content *repository.Content) string {
	var sb strings.Builder
	
	// Add frontmatter
	sb.WriteString("---\n")
	sb.WriteString(fmt.Sprintf("id: %s\n", content.ID))
	sb.WriteString(fmt.Sprintf("uri: %s\n", content.URI))
	sb.WriteString(fmt.Sprintf("title: %s\n", content.Title))
	sb.WriteString(fmt.Sprintf("type: %s\n", content.Type))
	
	if content.Description != "" {
		sb.WriteString(fmt.Sprintf("description: %s\n", content.Description))
	}
	
	if content.Surtitle != "" {
		sb.WriteString(fmt.Sprintf("surtitle: %s\n", content.Surtitle))
	}
	
	if content.Authorship != "" {
		sb.WriteString(fmt.Sprintf("authorship: %s\n", content.Authorship))
	}
	
	// Always export order field to ensure proper sorting
	sb.WriteString(fmt.Sprintf("order: %d\n", content.Order))
	
	if content.Hide {
		sb.WriteString("hide: true\n")
	}
	
	if content.HasSublist {
		sb.WriteString("has_sublist: true\n")
	}
	
	if content.RedirectURI != "" {
		sb.WriteString(fmt.Sprintf("redirect_uri: %s\n", content.RedirectURI))
	}
	
	if content.FurtherReadingURI != "" {
		sb.WriteString(fmt.Sprintf("further_reading_uri: %s\n", content.FurtherReadingURI))
	}
	
	if !content.UpdatedAt.IsZero() {
		sb.WriteString(fmt.Sprintf("updated_at: %s\n", content.UpdatedAt.Format(time.RFC3339)))
	}
	
	if !content.CreatedAt.IsZero() {
		sb.WriteString(fmt.Sprintf("created_at: %s\n", content.CreatedAt.Format(time.RFC3339)))
	}
	
	// Add contents (table of contents) if present
	if len(content.Contents) > 0 {
		sb.WriteString("contents:\n")
		for _, item := range content.Contents {
			// Clean up the text by removing carriage returns and extra whitespace
			cleanText := strings.ReplaceAll(item.Text, "\r\n", " ")
			cleanText = strings.ReplaceAll(cleanText, "\n", " ")
			cleanText = strings.TrimSpace(cleanText)
			// Collapse multiple spaces into single spaces
			cleanText = regexp.MustCompile(`\s+`).ReplaceAllString(cleanText, " ")
			
			// Quote the text to handle YAML special characters and HTML entities
			sb.WriteString(fmt.Sprintf("  - text: \"%s\"\n", strings.ReplaceAll(cleanText, "\"", "\\\"")))
			sb.WriteString(fmt.Sprintf("    id: %s\n", item.ID))
		}
	}
	
	sb.WriteString("---\n\n")
	
	// Add content body
	if content.Body != "" {
		sb.WriteString(content.Body)
		sb.WriteString("\n")
	}
	
	return sb.String()
}
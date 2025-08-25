package content

import (
	"fmt"
	
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/maxfacts/maxfacts/pkg/markdown"
	"github.com/maxfacts/maxfacts/pkg/mongodb"
)

// UseMarkdownReader configures content reader to use markdown files
func UseMarkdownReader(indexCSV string) error {
	repo, err := markdown.NewContentRepository("data/markdown/content", indexCSV)
	if err != nil {
		return err
	}
	contentReader = repo
	return nil
}

// UseMongoReader configures content reader to use MongoDB
func UseMongoReader(db *mongo.Database) {
	contentReader = mongodb.NewContentRepository(db)
	searchRepo = mongodb.NewSearchRepository(db)
}

// UseMarkdownWriter configures content writer to use markdown files
func UseMarkdownWriter(outputDir string) {
	writer, err := markdown.NewContentWriter(outputDir)
	if err != nil {
		// For now, panic since we can't return error from this function
		// This matches the pattern of UseMongo which also doesn't return error
		panic(fmt.Errorf("failed to create markdown writer: %w", err))
	}
	contentWriter = writer
}

// UseMongoWriter configures content writer to use MongoDB
// This will panic on any write operation as MongoDB is read-only
func UseMongoWriter(db *mongo.Database) {
	contentWriter = mongodb.NewContentRepository(db)
}

// Legacy configuration functions for backwards compatibility

// UseMarkdown configures content to use markdown files (default)
// This provides content operations but no search functionality
func UseMarkdown(indexCSV string) error {
	if err := UseMarkdownReader(indexCSV); err != nil {
		return err
	}
	UseMarkdownWriter("data/markdown/content")
	searchRepo = nil // Search not available with markdown
	return nil
}

// UseMongo configures content to use MongoDB
// This provides both content operations and search functionality
func UseMongo(db *mongo.Database) {
	UseMongoReader(db)
	UseMongoWriter(db)
}
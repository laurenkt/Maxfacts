package content

import (
	"fmt"
	"log"
	
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/maxfacts/maxfacts/pkg/markdown"
	"github.com/maxfacts/maxfacts/pkg/mongodb"
)

// UseMarkdownReader configures content reader to use markdown files
func UseMarkdownReader() error {
	repo, err := markdown.NewContentRepository("data/markdown/content")
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
// This provides content operations and Bleve search functionality
func UseMarkdown() error {
	if err := UseMarkdownReader(); err != nil {
		return err
	}
	UseMarkdownWriter("data/markdown/content")
	
	// Don't initialize search here - it will be done lazily on first use
	// This prevents slow startup times
	searchRepo = nil // Reset to ensure lazy initialization works
	
	log.Printf("Content: switched to markdown repository (search will initialize on first use)")
	return nil
}

// UseMongo configures content to use MongoDB
// This provides both content operations and search functionality
func UseMongo(db *mongo.Database) {
	UseMongoReader(db)
	UseMongoWriter(db)
	log.Printf("Content: switched to MongoDB repository")
}
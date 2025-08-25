package content

import (
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/maxfacts/maxfacts/pkg/markdown"
	"github.com/maxfacts/maxfacts/pkg/mongodb"
)

// UseMarkdown configures content to use markdown files (default)
// This provides content operations but no search functionality
func UseMarkdown(indexCSV string) error {
	repo, err := markdown.NewContentRepository("data/markdown/content", indexCSV)
	if err != nil {
		return err
	}
	contentRepo = repo
	searchRepo = nil // Search not available with markdown
	return nil
}

// UseMongo configures content to use MongoDB
// This provides both content operations and search functionality
func UseMongo(db *mongo.Database) {
	contentRepo = mongodb.NewContentRepository(db)
	searchRepo = mongodb.NewSearchRepository(db)
}
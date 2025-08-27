package content

import (
	"context"
	"fmt"
	"log"
	"sync"

	"github.com/maxfacts/maxfacts/pkg/markdown"
	"github.com/maxfacts/maxfacts/pkg/repository"
)

// searchRepo is defined in content.go to allow initialization from init()

// searchInitOnce ensures search is only initialized once
var searchInitOnce sync.Once

// resetSearchInit allows resetting the search initialization (used when switching configurations)
func resetSearchInit() {
	searchInitOnce = sync.Once{}
}

// initializeSearch lazily initializes the search repository
func initializeSearch() {
	searchInitOnce.Do(func() {
		// Only initialize if we're using markdown (not MongoDB)
		if contentReader == nil {
			return
		}
		
		// Check if search repo was already set by UseMongo()
		if searchRepo != nil {
			return
		}
		
		// Try to initialize Bleve search
		searchIndexPath := "data/markdown/search/content.bleve"
		bleveRepo, err := markdown.NewSearchRepository(searchIndexPath)
		if err != nil {
			log.Printf("Warning: failed to initialize search index: %v", err)
			// searchRepo remains nil, search will be unavailable
			return
		}
		
		// Check if index is empty and populate it
		if err := populateSearchIndex(bleveRepo); err != nil {
			log.Printf("Warning: failed to populate search index: %v", err)
		}
		
		searchRepo = bleveRepo
		log.Printf("Content: lazily initialized Bleve search repository")
	})
}

// populateSearchIndex populates the search index with content if it's empty
func populateSearchIndex(searchRepo *markdown.SearchRepository) error {
	// Get all content from the markdown files
	ctx := context.Background()
	contents, err := FindAll(ctx)
	if err != nil {
		return fmt.Errorf("failed to load content for indexing: %w", err)
	}
	
	if len(contents) == 0 {
		log.Printf("No content found to index")
		return nil
	}
	
	// Index all the content
	log.Printf("Populating search index with %d content items...", len(contents))
	if err := searchRepo.IndexAllContent(contents); err != nil {
		return fmt.Errorf("failed to index content: %w", err)
	}
	
	log.Printf("Successfully populated search index with %d items", len(contents))
	return nil
}

// Search performs a text search on content
// Returns matching content ordered by relevance
// Returns error if search is not available with current configuration
func Search(ctx context.Context, query string) ([]repository.Content, error) {
	// Initialize search lazily on first use
	initializeSearch()
	
	if searchRepo == nil {
		return nil, fmt.Errorf("search not available with current configuration - use UseMongo() to enable search")
	}
	return searchRepo.Search(ctx, query)
}
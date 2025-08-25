package content

import (
	"context"
	"fmt"

	"github.com/maxfacts/maxfacts/pkg/repository"
)

// Internal search repository instance - set by configuration functions
var searchRepo repository.ContentSearchRepository = nil

// Search performs a text search on content
// Returns matching content ordered by relevance
// Returns error if search is not available with current configuration
func Search(ctx context.Context, query string) ([]repository.Content, error) {
	if searchRepo == nil {
		return nil, fmt.Errorf("search not available with current configuration - use UseMongo() to enable search")
	}
	return searchRepo.Search(ctx, query)
}
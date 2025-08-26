package repository

import (
	"context"
	"regexp"
)

// ContentReader defines the interface for content read operations
type ContentReader interface {
	// FindOne finds a single content by URI
	FindOne(ctx context.Context, uri string) (*Content, error)
	
	// FindAll returns all content items
	FindAll(ctx context.Context) ([]Content, error)
	
	// FindFromParentURI finds content with a specific parent URI
	FindFromParentURI(ctx context.Context, parent string) ([]Content, error)
	
	// FindFromAdjacentURI finds content adjacent to a given URI (siblings)
	FindFromAdjacentURI(ctx context.Context, uri string) ([]Content, error)
	
	// GetBreadcrumbs returns breadcrumbs for a content item
	GetBreadcrumbs(ctx context.Context, content *Content) ([]Breadcrumb, error)
	
	// GetChildren returns child pages of a content item
	GetChildren(ctx context.Context, content *Content) ([]Content, error)
	
	// GetNextPage finds the next page in navigation
	GetNextPage(ctx context.Context, content *Content) (*Content, error)
	
	// GetMatchedParagraph finds a paragraph matching the given pattern
	// Returns nil if not supported by the implementation
	GetMatchedParagraph(content *Content, pattern *regexp.Regexp) []string
	
	// GetInvalidLinks returns invalid links in the content body
	// Returns empty slice if not supported by the implementation
	GetInvalidLinks(ctx context.Context, content *Content) ([]string, error)
}

// ContentWriter defines the interface for content write operations
type ContentWriter interface {
	// WriteOne writes a single content item
	WriteOne(ctx context.Context, content *Content) error
	
	// WriteIndex writes the URI-to-ID index
	WriteIndex(ctx context.Context, contents []Content) error
}

// ContentRepository combines both read and write operations
// This maintains backwards compatibility
type ContentRepository interface {
	ContentReader
	ContentWriter
}

// ContentSearchRepository defines the interface for content search operations
// This is separate as not all implementations may support search
type ContentSearchRepository interface {
	// Search performs a text search on content
	// Returns matching content ordered by relevance
	Search(ctx context.Context, query string) ([]Content, error)
}
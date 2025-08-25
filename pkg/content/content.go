package content

import (
	"context"
	"fmt"
	"regexp"

	"github.com/maxfacts/maxfacts/pkg/repository"
)

// Internal repository instances - set by configuration functions
var contentReader repository.ContentReader = nil
var contentWriter repository.ContentWriter = nil

// FindOne finds a single content item by URI
func FindOne(ctx context.Context, uri string) (*repository.Content, error) {
	if contentReader == nil {
		return nil, fmt.Errorf("content reader not configured - call UseMarkdownReader() or UseMongoReader() first")
	}
	return contentReader.FindOne(ctx, uri)
}

// FindAll returns all content items
func FindAll(ctx context.Context) ([]repository.Content, error) {
	if contentReader == nil {
		return nil, fmt.Errorf("content reader not configured - call UseMarkdownReader() or UseMongoReader() first")
	}
	return contentReader.FindAll(ctx)
}

// FindFromParentURI finds content with a specific parent URI
func FindFromParentURI(ctx context.Context, parent string) ([]repository.Content, error) {
	if contentReader == nil {
		return nil, fmt.Errorf("content reader not configured - call UseMarkdownReader() or UseMongoReader() first")
	}
	return contentReader.FindFromParentURI(ctx, parent)
}

// FindFromAdjacentURI finds content adjacent to a given URI (siblings)
func FindFromAdjacentURI(ctx context.Context, uri string) ([]repository.Content, error) {
	if contentReader == nil {
		return nil, fmt.Errorf("content reader not configured - call UseMarkdownReader() or UseMongoReader() first")
	}
	return contentReader.FindFromAdjacentURI(ctx, uri)
}

// GetBreadcrumbs returns breadcrumbs for a content item
func GetBreadcrumbs(ctx context.Context, content *repository.Content) ([]repository.Breadcrumb, error) {
	if contentReader == nil {
		return nil, fmt.Errorf("content reader not configured - call UseMarkdownReader() or UseMongoReader() first")
	}
	return contentReader.GetBreadcrumbs(ctx, content)
}

// GetChildren returns child pages of a content item
func GetChildren(ctx context.Context, content *repository.Content) ([]repository.Content, error) {
	if contentReader == nil {
		return nil, fmt.Errorf("content reader not configured - call UseMarkdownReader() or UseMongoReader() first")
	}
	return contentReader.GetChildren(ctx, content)
}

// GetNextPage finds the next page in navigation
func GetNextPage(ctx context.Context, content *repository.Content) (*repository.Content, error) {
	if contentReader == nil {
		return nil, fmt.Errorf("content reader not configured - call UseMarkdownReader() or UseMongoReader() first")
	}
	return contentReader.GetNextPage(ctx, content)
}

// GetMatchedParagraph finds a paragraph matching the given pattern
// Returns nil if not supported by the current implementation
func GetMatchedParagraph(content *repository.Content, pattern *regexp.Regexp) []string {
	if contentReader == nil {
		return nil
	}
	return contentReader.GetMatchedParagraph(content, pattern)
}

// GetInvalidLinks returns invalid links in the content body
// Returns empty slice if not supported by the current implementation
func GetInvalidLinks(ctx context.Context, content *repository.Content) ([]string, error) {
	if contentReader == nil {
		return []string{}, nil
	}
	return contentReader.GetInvalidLinks(ctx, content)
}

// WriteOne writes a single content item
func WriteOne(ctx context.Context, content *repository.Content) error {
	if contentWriter == nil {
		return fmt.Errorf("content writer not configured - call UseMarkdownWriter() or UseMongoWriter() first")
	}
	return contentWriter.WriteOne(ctx, content)
}

// WriteIndex writes the URI-to-ID index
func WriteIndex(ctx context.Context, contents []repository.Content) error {
	if contentWriter == nil {
		return fmt.Errorf("content writer not configured - call UseMarkdownWriter() or UseMongoWriter() first")
	}
	return contentWriter.WriteIndex(ctx, contents)
}
package content

import (
	"context"
	"fmt"
	"regexp"

	"github.com/maxfacts/maxfacts/pkg/repository"
)

// Internal repository instance - set by configuration functions
var contentRepo repository.ContentRepository = nil

// FindOne finds a single content item by URI
func FindOne(ctx context.Context, uri string) (*repository.Content, error) {
	if contentRepo == nil {
		return nil, fmt.Errorf("content repository not configured - call UseMarkdown() or UseMongo() first")
	}
	return contentRepo.FindOne(ctx, uri)
}

// FindAll returns all content items
func FindAll(ctx context.Context) ([]repository.Content, error) {
	if contentRepo == nil {
		return nil, fmt.Errorf("content repository not configured - call UseMarkdown() or UseMongo() first")
	}
	return contentRepo.FindAll(ctx)
}

// FindFromParentURI finds content with a specific parent URI
func FindFromParentURI(ctx context.Context, parent string) ([]repository.Content, error) {
	if contentRepo == nil {
		return nil, fmt.Errorf("content repository not configured - call UseMarkdown() or UseMongo() first")
	}
	return contentRepo.FindFromParentURI(ctx, parent)
}

// FindFromAdjacentURI finds content adjacent to a given URI (siblings)
func FindFromAdjacentURI(ctx context.Context, uri string) ([]repository.Content, error) {
	if contentRepo == nil {
		return nil, fmt.Errorf("content repository not configured - call UseMarkdown() or UseMongo() first")
	}
	return contentRepo.FindFromAdjacentURI(ctx, uri)
}

// GetBreadcrumbs returns breadcrumbs for a content item
func GetBreadcrumbs(ctx context.Context, content *repository.Content) ([]repository.Breadcrumb, error) {
	if contentRepo == nil {
		return nil, fmt.Errorf("content repository not configured - call UseMarkdown() or UseMongo() first")
	}
	return contentRepo.GetBreadcrumbs(ctx, content)
}

// GetChildren returns child pages of a content item
func GetChildren(ctx context.Context, content *repository.Content) ([]repository.Content, error) {
	if contentRepo == nil {
		return nil, fmt.Errorf("content repository not configured - call UseMarkdown() or UseMongo() first")
	}
	return contentRepo.GetChildren(ctx, content)
}

// GetNextPage finds the next page in navigation
func GetNextPage(ctx context.Context, content *repository.Content) (*repository.Content, error) {
	if contentRepo == nil {
		return nil, fmt.Errorf("content repository not configured - call UseMarkdown() or UseMongo() first")
	}
	return contentRepo.GetNextPage(ctx, content)
}

// GetMatchedParagraph finds a paragraph matching the given pattern
// Returns nil if not supported by the current implementation
func GetMatchedParagraph(content *repository.Content, pattern *regexp.Regexp) []string {
	if contentRepo == nil {
		return nil
	}
	return contentRepo.GetMatchedParagraph(content, pattern)
}

// GetInvalidLinks returns invalid links in the content body
// Returns empty slice if not supported by the current implementation
func GetInvalidLinks(ctx context.Context, content *repository.Content) ([]string, error) {
	if contentRepo == nil {
		return []string{}, nil
	}
	return contentRepo.GetInvalidLinks(ctx, content)
}
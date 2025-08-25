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

	"github.com/maxfacts/maxfacts/pkg/repository"
)

// Ensure ContentRepository implements the interface
var _ repository.ContentRepository = &ContentRepository{}

// ContentRepository provides file-based content operations
type ContentRepository struct {
	contentDir string
	uriIndex   map[string]string // URI -> ID mapping
}

// NewContentRepository creates a new file-based content repository
func NewContentRepository(contentDir string, indexCSV string) (*ContentRepository, error) {
	repo := &ContentRepository{
		contentDir: contentDir,
		uriIndex:   make(map[string]string),
	}

	// Parse the CSV index
	if err := repo.loadIndex(indexCSV); err != nil {
		return nil, fmt.Errorf("failed to load index: %w", err)
	}

	return repo, nil
}

// loadIndex loads the URI-to-ID mapping from CSV content
func (r *ContentRepository) loadIndex(csvContent string) error {
	reader := csv.NewReader(strings.NewReader(csvContent))
	records, err := reader.ReadAll()
	if err != nil {
		return fmt.Errorf("error reading CSV: %w", err)
	}

	// Skip header row
	if len(records) == 0 {
		return fmt.Errorf("empty CSV index")
	}

	for i, record := range records {
		if i == 0 {
			// Validate header
			if len(record) != 2 || record[0] != "uri" || record[1] != "id" {
				return fmt.Errorf("invalid CSV header, expected 'uri,id'")
			}
			continue
		}

		if len(record) != 2 {
			return fmt.Errorf("invalid CSV record at line %d: expected 2 fields, got %d", i+1, len(record))
		}

		uri, id := record[0], record[1]
		r.uriIndex[uri] = id
	}

	return nil
}

// FindOne finds a single content item by URI
func (r *ContentRepository) FindOne(ctx context.Context, uri string) (*repository.Content, error) {
	// Clean URI (remove leading slash if present)
	cleanURI := strings.TrimPrefix(uri, "/")
	
	// Look up ID from URI
	id, exists := r.uriIndex[cleanURI]
	if !exists {
		return nil, fmt.Errorf("content not found for URI: %s", uri)
	}

	// Read the markdown file
	filename := filepath.Join(r.contentDir, id+".md")
	fileContent, err := os.ReadFile(filename)
	if err != nil {
		return nil, fmt.Errorf("error reading file %s: %w", filename, err)
	}

	// Parse frontmatter
	content, err := ParseFrontmatter(string(fileContent))
	if err != nil {
		return nil, fmt.Errorf("error parsing frontmatter in %s: %w", filename, err)
	}

	// Convert to repository.Content
	return r.toRepositoryContent(content), nil
}

// FindAll returns all content items sorted by URI (matching MongoDB behavior)
func (r *ContentRepository) FindAll(ctx context.Context) ([]repository.Content, error) {
	var contents []repository.Content
	
	for uri := range r.uriIndex {
		content, err := r.FindOne(ctx, uri)
		if err == nil {
			contents = append(contents, *content)
		}
	}
	
	// Sort by URI to match MongoDB FindAll behavior
	sort.Slice(contents, func(i, j int) bool {
		return contents[i].URI < contents[j].URI
	})
	
	return contents, nil
}

// FindFromParentURI finds all content items that are children of the given parent URI
func (r *ContentRepository) FindFromParentURI(ctx context.Context, parentURI string) ([]repository.Content, error) {
	var results []repository.Content
	
	// Clean parent URI
	cleanParent := strings.TrimPrefix(parentURI, "/")
	
	// Find all URIs that start with the parent URI followed by a slash
	for uri := range r.uriIndex {
		// Check if this URI is a direct child of the parent
		if strings.HasPrefix(uri, cleanParent+"/") {
			// Make sure it's a direct child, not a grandchild
			remainder := strings.TrimPrefix(uri, cleanParent+"/")
			if !strings.Contains(remainder, "/") {
				content, err := r.FindOne(ctx, uri)
				if err == nil {
					results = append(results, *content)
				}
			}
		}
	}
	
	// Sort results by Order field, then by Title, then by Description, then by Surtitle
	sort.Slice(results, func(i, j int) bool {
		if results[i].Order != results[j].Order {
			return results[i].Order < results[j].Order
		}
		if results[i].Title != results[j].Title {
			return results[i].Title < results[j].Title
		}
		if results[i].Description != results[j].Description {
			return results[i].Description < results[j].Description
		}
		return results[i].Surtitle < results[j].Surtitle
	})
	
	return results, nil
}

// FindFromAdjacentURI finds sibling content (items with the same parent)
func (r *ContentRepository) FindFromAdjacentURI(ctx context.Context, uri string) ([]repository.Content, error) {
	cleanURI := strings.TrimPrefix(uri, "/")
	
	// Find the parent URI by removing the last segment
	lastSlash := strings.LastIndex(cleanURI, "/")
	if lastSlash == -1 {
		// This is a top-level item, return all top-level items
		return r.findTopLevelItems(ctx)
	}
	
	parentURI := cleanURI[:lastSlash]
	return r.FindFromParentURI(ctx, parentURI)
}

// findTopLevelItems finds all items that don't have a parent (no slash in URI)
func (r *ContentRepository) findTopLevelItems(ctx context.Context) ([]repository.Content, error) {
	var results []repository.Content
	
	for uri := range r.uriIndex {
		if !strings.Contains(uri, "/") {
			content, err := r.FindOne(ctx, uri)
			if err == nil {
				results = append(results, *content)
			}
		}
	}
	
	// Sort results by Order field, then by Title, then by Description, then by Surtitle
	sort.Slice(results, func(i, j int) bool {
		if results[i].Order != results[j].Order {
			return results[i].Order < results[j].Order
		}
		if results[i].Title != results[j].Title {
			return results[i].Title < results[j].Title
		}
		if results[i].Description != results[j].Description {
			return results[i].Description < results[j].Description
		}
		return results[i].Surtitle < results[j].Surtitle
	})
	
	return results, nil
}

// GetChildren finds direct children of the given content
func (r *ContentRepository) GetChildren(ctx context.Context, content *repository.Content) ([]repository.Content, error) {
	return r.FindFromParentURI(ctx, content.URI)
}

// GetBreadcrumbs builds breadcrumb navigation for the given content (excluding the current page)
func (r *ContentRepository) GetBreadcrumbs(ctx context.Context, content *repository.Content) ([]repository.Breadcrumb, error) {
	var breadcrumbs []repository.Breadcrumb
	
	// Split URI into segments
	cleanURI := strings.TrimPrefix(content.URI, "/")
	segments := strings.Split(cleanURI, "/")
	
	// Build breadcrumbs by walking up the hierarchy, but exclude the last segment (current page)
	currentURI := ""
	for i, segment := range segments {
		if currentURI == "" {
			currentURI = segment
		} else {
			currentURI = currentURI + "/" + segment
		}
		
		// Skip the last segment (current page)
		if i == len(segments)-1 {
			break
		}
		
		// Look up content for this URI segment
		parentContent, err := r.FindOne(ctx, currentURI)
		if err == nil {
			breadcrumbs = append(breadcrumbs, repository.Breadcrumb{
				Title: parentContent.Title,
				URI:   parentContent.URI,
				ID:    parentContent.ID,
			})
		}
	}
	
	return breadcrumbs, nil
}

// GetNextPage finds the next page in navigation hierarchy
func (r *ContentRepository) GetNextPage(ctx context.Context, content *repository.Content) (*repository.Content, error) {
	// No next page for level 3
	if content.Type == "level3" {
		return nil, nil
	}
	
	// Determine allowed types based on current type
	var allowedTypes []string
	switch content.Type {
	case "level1":
		allowedTypes = []string{"level2", "level3"}
	case "level2":
		allowedTypes = []string{"level3"}
	default:
		allowedTypes = []string{"level1", "level2", "level3"}
	}
	
	// Search through all URIs to find matching next page
	parentURI := repository.ParentURIFragment(content.URI)
	
	var candidates []repository.Content
	for uri := range r.uriIndex {
		// Check if this URI could be a next page
		if strings.HasPrefix(uri, content.URI+"/") || strings.HasPrefix(uri, parentURI+"/") {
			candidate, err := r.FindOne(ctx, uri)
			if err != nil {
				continue
			}
			
			// Check if it matches our criteria
			if candidate.Title == content.Title {
				// Check if type is allowed
				for _, allowedType := range allowedTypes {
					if candidate.Type == allowedType {
						candidates = append(candidates, *candidate)
						break
					}
				}
			}
		}
	}
	
	if len(candidates) == 0 {
		return nil, nil
	}
	
	// Sort by type preference (level2 before level3)
	sort.Slice(candidates, func(i, j int) bool {
		typeOrder := map[string]int{"level1": 1, "level2": 2, "level3": 3}
		return typeOrder[candidates[i].Type] < typeOrder[candidates[j].Type]
	})
	
	return &candidates[0], nil
}

// GetMatchedParagraph is not supported for markdown content
func (r *ContentRepository) GetMatchedParagraph(content *repository.Content, pattern *regexp.Regexp) []string {
	// This method is only used for search highlighting which requires MongoDB
	return nil
}

// GetInvalidLinks is not implemented for markdown content
func (r *ContentRepository) GetInvalidLinks(ctx context.Context, content *repository.Content) ([]string, error) {
	// Return empty slice as this feature is not critical for markdown
	return []string{}, nil
}

// toRepositoryContent converts markdown Content to repository.Content
func (r *ContentRepository) toRepositoryContent(c *Content) *repository.Content {
	// Convert Contents
	contents := make([]repository.ContentItem, len(c.Contents))
	for i, item := range c.Contents {
		contents[i] = repository.ContentItem{
			Text: item.Text,
			ID:   item.ID,
		}
	}
	
	return &repository.Content{
		ID:                c.ID,
		ContentID:         c.ID,
		URI:               c.URI,
		Title:             c.Title,
		Type:              c.Type,
		Body:              c.MarkdownBody,
		Description:       c.Description,
		Surtitle:          c.Surtitle,
		RedirectURI:       c.RedirectURI,
		Hide:              c.Hide,
		FurtherReadingURI: c.FurtherReadingURI,
		HasSublist:        c.HasSublist,
		Authorship:        c.Authorship,
		Order:             c.Order,
		Contents:          contents,
		UpdatedAt:         c.UpdatedAt,
		CreatedAt:         c.CreatedAt,
		// Virtual fields initialized to defaults
		Breadcrumbs:  []repository.Breadcrumb{},
		InvalidURIs:  []string{},
		Selected:     make(map[string]string),
		Alphabetical: make(map[string][]repository.Content),
		Sublist:      []repository.Content{},
	}
}
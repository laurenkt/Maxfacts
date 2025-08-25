package markdown

import (
	"context"
	"encoding/csv"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// ContentModel provides file-based content operations
type ContentModel struct {
	contentDir string
	uriIndex   map[string]string // URI -> ID mapping
}

// NewContentModel creates a new file-based content model
func NewContentModel(contentDir string, indexCSV string) (*ContentModel, error) {
	model := &ContentModel{
		contentDir: contentDir,
		uriIndex:   make(map[string]string),
	}

	// Parse the CSV index
	if err := model.loadIndex(indexCSV); err != nil {
		return nil, fmt.Errorf("failed to load index: %w", err)
	}

	return model, nil
}

// loadIndex loads the URI-to-ID mapping from CSV content
func (m *ContentModel) loadIndex(csvContent string) error {
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
		m.uriIndex[uri] = id
	}

	return nil
}

// FindOne finds a single content item by URI
func (m *ContentModel) FindOne(ctx context.Context, uri string) (*Content, error) {
	// Clean URI (remove leading slash if present)
	cleanURI := strings.TrimPrefix(uri, "/")
	
	// Look up ID from URI
	id, exists := m.uriIndex[cleanURI]
	if !exists {
		return nil, fmt.Errorf("content not found for URI: %s", uri)
	}

	// Read the markdown file
	filename := filepath.Join(m.contentDir, id+".md")
	fileContent, err := os.ReadFile(filename)
	if err != nil {
		return nil, fmt.Errorf("error reading file %s: %w", filename, err)
	}

	// Parse frontmatter
	content, err := ParseFrontmatter(string(fileContent))
	if err != nil {
		return nil, fmt.Errorf("error parsing frontmatter in %s: %w", filename, err)
	}

	return content, nil
}

// GetAllURIs returns all URIs in the index
func (m *ContentModel) GetAllURIs() []string {
	uris := make([]string, 0, len(m.uriIndex))
	for uri := range m.uriIndex {
		uris = append(uris, uri)
	}
	return uris
}

// GetIDForURI returns the ID for a given URI
func (m *ContentModel) GetIDForURI(uri string) (string, bool) {
	cleanURI := strings.TrimPrefix(uri, "/")
	id, exists := m.uriIndex[cleanURI]
	return id, exists
}

// FindFromParentURI finds all content items that are children of the given parent URI
func (m *ContentModel) FindFromParentURI(ctx context.Context, parentURI string) ([]Content, error) {
	var results []Content
	
	// Clean parent URI
	cleanParent := strings.TrimPrefix(parentURI, "/")
	
	// Find all URIs that start with the parent URI followed by a slash
	for uri := range m.uriIndex {
		// Check if this URI is a direct child of the parent
		if strings.HasPrefix(uri, cleanParent+"/") {
			// Make sure it's a direct child, not a grandchild
			remainder := strings.TrimPrefix(uri, cleanParent+"/")
			if !strings.Contains(remainder, "/") {
				content, err := m.FindOne(ctx, uri)
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
func (m *ContentModel) FindFromAdjacentURI(ctx context.Context, uri string) ([]Content, error) {
	cleanURI := strings.TrimPrefix(uri, "/")
	
	// Find the parent URI by removing the last segment
	lastSlash := strings.LastIndex(cleanURI, "/")
	if lastSlash == -1 {
		// This is a top-level item, return all top-level items
		return m.findTopLevelItems(ctx)
	}
	
	parentURI := cleanURI[:lastSlash]
	return m.FindFromParentURI(ctx, parentURI)
}

// findTopLevelItems finds all items that don't have a parent (no slash in URI)
func (m *ContentModel) findTopLevelItems(ctx context.Context) ([]Content, error) {
	var results []Content
	
	for uri := range m.uriIndex {
		if !strings.Contains(uri, "/") {
			content, err := m.FindOne(ctx, uri)
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
func (m *ContentModel) GetChildren(ctx context.Context, parentURI string) ([]Content, error) {
	return m.FindFromParentURI(ctx, parentURI)
}

// GetBreadcrumbs builds breadcrumb navigation for the given URI (excluding the current page)
func (m *ContentModel) GetBreadcrumbs(ctx context.Context, uri string) ([]Breadcrumb, error) {
	var breadcrumbs []Breadcrumb
	
	// Split URI into segments
	cleanURI := strings.TrimPrefix(uri, "/")
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
		content, err := m.FindOne(ctx, currentURI)
		if err == nil {
			breadcrumbs = append(breadcrumbs, Breadcrumb{
				Title: content.Title,
				URI:   content.URI,
				ID:    content.ID,
			})
		}
	}
	
	return breadcrumbs, nil
}

// GetNextPage finds the next page in navigation hierarchy
func (m *ContentModel) GetNextPage(ctx context.Context, content *Content) (*Content, error) {
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
	parentURI := getParentURIFromURI(content.URI)
	
	var candidates []Content
	for uri := range m.uriIndex {
		// Check if this URI could be a next page
		if strings.HasPrefix(uri, content.URI+"/") || strings.HasPrefix(uri, parentURI+"/") {
			candidate, err := m.FindOne(ctx, uri)
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

// getParentURIFromURI extracts parent URI from a given URI
func getParentURIFromURI(uri string) string {
	cleanURI := strings.TrimPrefix(uri, "/")
	lastSlash := strings.LastIndex(cleanURI, "/")
	if lastSlash == -1 {
		return ""
	}
	return cleanURI[:lastSlash]
}

// Breadcrumb represents a navigation breadcrumb
type Breadcrumb struct {
	Title string `json:"title"`
	URI   string `json:"uri"`
	ID    string `json:"id"`
}

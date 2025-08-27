package markdown

import (
	"context"
	"fmt"
	"log"
	"regexp"
	"strings"

	"github.com/blevesearch/bleve/v2"
	"github.com/blevesearch/bleve/v2/mapping"
	"golang.org/x/net/html"

	"github.com/maxfacts/maxfacts/pkg/repository"
)

// Ensure SearchRepository implements the interface
var _ repository.ContentSearchRepository = &SearchRepository{}

// SearchRepository provides Bleve-based search operations
type SearchRepository struct {
	indexPath string
	index     bleve.Index
}

// NewSearchRepository creates a new Bleve search repository using in-memory index
func NewSearchRepository(indexPath string) (*SearchRepository, error) {
	repo := &SearchRepository{
		indexPath: indexPath, // Keep for compatibility, but we'll use in-memory
	}
	
	// Create in-memory index (fast, no disk I/O issues)
	indexMapping := createContentIndexMapping()
	index, err := bleve.NewMemOnly(indexMapping)
	if err != nil {
		return nil, fmt.Errorf("failed to create in-memory search index: %w", err)
	}
	
	log.Printf("Created new in-memory search index (no disk persistence)")
	
	repo.index = index
	return repo, nil
}

// createContentIndexMapping creates the Bleve index mapping for content
func createContentIndexMapping() mapping.IndexMapping {
	// Create a mapping
	indexMapping := bleve.NewIndexMapping()
	
	// Create a document mapping for content
	contentMapping := bleve.NewDocumentMapping()
	
	// Title field - searchable text with high boost
	titleFieldMapping := bleve.NewTextFieldMapping()
	titleFieldMapping.Analyzer = "en"
	titleFieldMapping.Store = true
	titleFieldMapping.Index = true
	contentMapping.AddFieldMappingsAt("title", titleFieldMapping)
	
	// Description field - searchable text with medium boost
	descriptionFieldMapping := bleve.NewTextFieldMapping()
	descriptionFieldMapping.Analyzer = "en"
	descriptionFieldMapping.Store = true
	descriptionFieldMapping.Index = true
	contentMapping.AddFieldMappingsAt("description", descriptionFieldMapping)
	
	// Body field - searchable text with normal boost
	bodyFieldMapping := bleve.NewTextFieldMapping()
	bodyFieldMapping.Analyzer = "en"
	bodyFieldMapping.Store = true
	bodyFieldMapping.Index = true
	contentMapping.AddFieldMappingsAt("body", bodyFieldMapping)
	
	// URI field - stored but not analyzed
	uriFieldMapping := bleve.NewTextFieldMapping()
	uriFieldMapping.Store = true
	uriFieldMapping.Index = false
	contentMapping.AddFieldMappingsAt("uri", uriFieldMapping)
	
	// Type field - stored but not analyzed
	typeFieldMapping := bleve.NewTextFieldMapping()
	typeFieldMapping.Store = true
	typeFieldMapping.Index = false
	contentMapping.AddFieldMappingsAt("type", typeFieldMapping)
	
	// Hide field - stored but not analyzed
	hideFieldMapping := bleve.NewBooleanFieldMapping()
	hideFieldMapping.Store = true
	hideFieldMapping.Index = true
	contentMapping.AddFieldMappingsAt("hide", hideFieldMapping)
	
	// Add the content mapping to the index
	indexMapping.AddDocumentMapping("_default", contentMapping)
	
	return indexMapping
}

// Search performs a text search on content
func (r *SearchRepository) Search(ctx context.Context, query string) ([]repository.Content, error) {
	if r.index == nil {
		return nil, fmt.Errorf("search index not available")
	}
	
	// Create a weighted query to match MongoDB's text search behavior
	// MongoDB text search gives title higher priority than description and body
	titleQuery := bleve.NewMatchQuery(query)
	titleQuery.SetField("title")
	titleQuery.SetBoost(3.0) // Title gets 3x weight
	
	descriptionQuery := bleve.NewMatchQuery(query)
	descriptionQuery.SetField("description")
	descriptionQuery.SetBoost(2.0) // Description gets 2x weight
	
	bodyQuery := bleve.NewMatchQuery(query)
	bodyQuery.SetField("body")
	bodyQuery.SetBoost(1.0) // Body gets normal weight
	
	// Combine queries with OR (any field can match)
	combinedQuery := bleve.NewDisjunctionQuery(titleQuery, descriptionQuery, bodyQuery)
	
	// Filter out hidden content
	hideFilter := bleve.NewBoolFieldQuery(false)
	hideFilter.SetField("hide")
	
	// Combine search query with hide filter
	finalQuery := bleve.NewConjunctionQuery(combinedQuery, hideFilter)
	
	// Create search request
	searchRequest := bleve.NewSearchRequest(finalQuery)
	searchRequest.Size = 100 // Limit results
	searchRequest.Fields = []string{"title", "description", "body", "uri", "type"}
	
	// Execute search
	searchResults, err := r.index.Search(searchRequest)
	if err != nil {
		return nil, fmt.Errorf("search failed: %w", err)
	}
	
	// Convert Bleve results to repository.Content
	contents := make([]repository.Content, len(searchResults.Hits))
	for i, hit := range searchResults.Hits {
		content := repository.Content{
			ID:        hit.ID,
			ContentID: hit.ID,
		}
		
		if title, ok := hit.Fields["title"].(string); ok {
			content.Title = title
		}
		if description, ok := hit.Fields["description"].(string); ok {
			content.Description = description
		}
		if body, ok := hit.Fields["body"].(string); ok {
			content.Body = body
		}
		if uri, ok := hit.Fields["uri"].(string); ok {
			content.URI = uri
		}
		if contentType, ok := hit.Fields["type"].(string); ok {
			content.Type = contentType
		}
		
		contents[i] = content
	}
	
	return contents, nil
}

// IndexContent indexes a single content item
func (r *SearchRepository) IndexContent(content *repository.Content) error {
	if r.index == nil {
		return fmt.Errorf("search index not available")
	}
	
	// Create document for indexing
	doc := map[string]interface{}{
		"title":       content.Title,
		"description": content.Description,
		"body":        content.Body,
		"uri":         content.URI,
		"type":        content.Type,
		"hide":        content.Hide,
	}
	
	// Index the document using ContentID as the document ID
	return r.index.Index(content.ContentID, doc)
}

// IndexAllContent indexes multiple content items in smaller batches
func (r *SearchRepository) IndexAllContent(contents []repository.Content) error {
	if r.index == nil {
		return fmt.Errorf("search index not available")
	}
	
	log.Printf("Indexing %d content items for search", len(contents))
	
	// Index in batches of 50 to avoid memory issues
	batchSize := 50
	indexed := 0
	
	for i := 0; i < len(contents); i += batchSize {
		end := i + batchSize
		if end > len(contents) {
			end = len(contents)
		}
		
		batch := r.index.NewBatch()
		batchContents := contents[i:end]
		
		for _, content := range batchContents {
			// Skip hidden content
			if content.Hide {
				continue
			}
			
			doc := map[string]interface{}{
				"title":       content.Title,
				"description": content.Description,
				"body":        content.Body,
				"uri":         content.URI,
				"type":        content.Type,
				"hide":        content.Hide,
			}
			
			batch.Index(content.ContentID, doc)
			indexed++
		}
		
		err := r.index.Batch(batch)
		if err != nil {
			return fmt.Errorf("failed to batch index content (batch %d-%d): %w", i, end-1, err)
		}
		
		log.Printf("Indexed batch %d-%d (%d items so far)", i, end-1, indexed)
	}
	
	log.Printf("Successfully indexed %d content items", indexed)
	return nil
}

// GetMatchedParagraph finds a paragraph matching the given pattern in the content body
// This mimics the MongoDB implementation for search result highlighting
func (r *SearchRepository) GetMatchedParagraph(content *repository.Content, pattern *regexp.Regexp) []string {
	if content.Body == "" {
		return nil
	}
	
	// Parse HTML content
	doc, err := html.Parse(strings.NewReader(content.Body))
	if err != nil {
		return nil
	}
	
	// Search through HTML nodes for matching text
	var search func(*html.Node) []string
	search = func(n *html.Node) []string {
		if n.Type == html.ElementNode {
			switch n.Data {
			case "p", "li", "td", "h1", "h2", "h3", "h4", "h5":
				// Extract text content from this element
				text := extractTextContent(n)
				if matches := pattern.FindStringSubmatch(text); matches != nil {
					return matches
				}
			}
		}
		
		// Search child nodes
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			if result := search(c); result != nil {
				return result
			}
		}
		
		return nil
	}
	
	return search(doc)
}

// extractTextContent extracts plain text from an HTML node
func extractTextContent(n *html.Node) string {
	var buf strings.Builder
	
	var extract func(*html.Node)
	extract = func(node *html.Node) {
		if node.Type == html.TextNode {
			buf.WriteString(node.Data)
		}
		for c := node.FirstChild; c != nil; c = c.NextSibling {
			extract(c)
		}
	}
	
	extract(n)
	return buf.String()
}

// Close closes the search index
func (r *SearchRepository) Close() error {
	if r.index != nil {
		return r.index.Close()
	}
	return nil
}
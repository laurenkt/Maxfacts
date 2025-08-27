package mongodb

import (
	"context"
	"regexp"
	"strings"

	"golang.org/x/net/html"

	"github.com/maxfacts/maxfacts/pkg/repository"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Ensure SearchRepository implements the interface
var _ repository.ContentSearchRepository = &SearchRepository{}

// SearchRepository provides MongoDB-based search operations
type SearchRepository struct {
	collection *mongo.Collection
}

// NewSearchRepository creates a new MongoDB search repository
func NewSearchRepository(db *mongo.Database) *SearchRepository {
	return &SearchRepository{
		collection: db.Collection("contents"),
	}
}

// Search performs a text search on content
func (r *SearchRepository) Search(ctx context.Context, query string) ([]repository.Content, error) {
	filter := bson.M{
		"$text": bson.M{"$search": query},
		"hide":  false,
	}
	
	projection := bson.M{
		"score": bson.M{"$meta": "textScore"},
	}
	
	opts := options.Find().
		SetProjection(projection).
		SetSort(bson.M{"score": bson.M{"$meta": "textScore"}})
	
	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	
	var mongoContents []mongoContent
	if err = cursor.All(ctx, &mongoContents); err != nil {
		return nil, err
	}
	
	contents := make([]repository.Content, len(mongoContents))
	for i, mc := range mongoContents {
		contents[i] = *toRepositoryContent(&mc)
	}
	
	return contents, nil
}

// GetMatchedParagraph finds a paragraph matching the given pattern in the content body
func (r *SearchRepository) GetMatchedParagraph(content *repository.Content, pattern *regexp.Regexp) []string {
	if content.Body == "" {
		return nil
	}
	
	doc, err := html.Parse(strings.NewReader(content.Body))
	if err != nil {
		return nil
	}
	
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
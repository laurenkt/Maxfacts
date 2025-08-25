package mongodb

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/maxfacts/maxfacts/pkg/repository"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/net/html"
)

// Ensure ContentRepository implements the interface
var _ repository.ContentRepository = &ContentRepository{}

// ContentRepository provides MongoDB-based content operations
type ContentRepository struct {
	collection *mongo.Collection
	db         *mongo.Database
}

// NewContentRepository creates a new MongoDB content repository
func NewContentRepository(db *mongo.Database) *ContentRepository {
	return &ContentRepository{
		collection: db.Collection("contents"),
		db:         db,
	}
}

// mongoContent represents the MongoDB document structure
type mongoContent struct {
	ID                primitive.ObjectID           `bson:"_id,omitempty"`
	ContentID         string                       `bson:"id"`
	URI               string                       `bson:"uri"`
	Title             string                       `bson:"title"`
	Type              string                       `bson:"type"`
	Body              string                       `bson:"body,omitempty"`
	Description       string                       `bson:"description,omitempty"`
	Surtitle          string                       `bson:"surtitle,omitempty"`
	RedirectURI       string                       `bson:"redirect_uri,omitempty"`
	Hide              bool                         `bson:"hide"`
	FurtherReadingURI string                       `bson:"further_reading_uri,omitempty"`
	HasSublist        bool                         `bson:"has_sublist"`
	Authorship        string                       `bson:"authorship,omitempty"`
	Order             int                          `bson:"order"`
	Contents          []repository.ContentItem      `bson:"contents,omitempty"`
	UpdatedAt         time.Time                    `bson:"updatedAt,omitempty"`
	CreatedAt         time.Time                    `bson:"createdAt,omitempty"`
}

// toRepositoryContent converts MongoDB content to repository content
func toRepositoryContent(mc *mongoContent) *repository.Content {
	return &repository.Content{
		ID:                mc.ID.Hex(),
		ContentID:         mc.ContentID,
		URI:               mc.URI,
		Title:             mc.Title,
		Type:              mc.Type,
		Body:              mc.Body,
		Description:       mc.Description,
		Surtitle:          mc.Surtitle,
		RedirectURI:       mc.RedirectURI,
		Hide:              mc.Hide,
		FurtherReadingURI: mc.FurtherReadingURI,
		HasSublist:        mc.HasSublist,
		Authorship:        mc.Authorship,
		Order:             mc.Order,
		Contents:          mc.Contents,
		UpdatedAt:         mc.UpdatedAt,
		CreatedAt:         mc.CreatedAt,
		// Virtual fields initialized to defaults
		Breadcrumbs:  []repository.Breadcrumb{},
		InvalidURIs:  []string{},
		Selected:     make(map[string]string),
		Alphabetical: make(map[string][]repository.Content),
		Sublist:      []repository.Content{},
	}
}

// FindOne finds a single content by URI
func (r *ContentRepository) FindOne(ctx context.Context, uri string) (*repository.Content, error) {
	var mc mongoContent
	err := r.collection.FindOne(ctx, bson.M{"uri": uri}).Decode(&mc)
	if err != nil {
		return nil, err
	}
	return toRepositoryContent(&mc), nil
}

// FindAll returns all content items sorted by URI
func (r *ContentRepository) FindAll(ctx context.Context) ([]repository.Content, error) {
	cursor, err := r.collection.Find(ctx, bson.M{}, options.Find().SetSort(bson.D{{Key: "uri", Value: 1}}))
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

// FindFromParentURI finds content with a specific parent URI
func (r *ContentRepository) FindFromParentURI(ctx context.Context, parent string) ([]repository.Content, error) {
	var pattern string
	if parent != "" {
		pattern = fmt.Sprintf("^%s/[^/]+$", regexp.QuoteMeta(parent))
	} else {
		pattern = "^[^/]+$"
	}
	
	filter := bson.M{"uri": bson.M{"$regex": pattern}}
	cursor, err := r.collection.Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "order", Value: 1}, {Key: "title", Value: 1}, {Key: "description", Value: 1}, {Key: "surtitle", Value: 1}}))
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

// FindFromAdjacentURI finds content adjacent to a given URI
func (r *ContentRepository) FindFromAdjacentURI(ctx context.Context, uri string) ([]repository.Content, error) {
	parent := repository.ParentURIFragment(uri)
	return r.FindFromParentURI(ctx, parent)
}

// GetBreadcrumbs returns breadcrumbs for a content item
func (r *ContentRepository) GetBreadcrumbs(ctx context.Context, content *repository.Content) ([]repository.Breadcrumb, error) {
	lineage := repository.GetLineageFromURI(repository.ParentURIFragment(content.URI))
	
	// Find all parent pages
	filter := bson.M{"uri": bson.M{"$in": lineage}}
	cursor, err := r.collection.Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "uri", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	
	var parents []mongoContent
	if err = cursor.All(ctx, &parents); err != nil {
		return nil, err
	}
	
	// Convert to breadcrumbs
	breadcrumbs := make([]repository.Breadcrumb, len(parents))
	for i, p := range parents {
		breadcrumbs[i] = repository.Breadcrumb{
			Title: p.Title,
			URI:   p.URI,
			ID:    p.ID.Hex(),
		}
	}
	
	return breadcrumbs, nil
}

// GetChildren returns child pages of a content item
func (r *ContentRepository) GetChildren(ctx context.Context, content *repository.Content) ([]repository.Content, error) {
	return r.FindFromParentURI(ctx, content.URI)
}

// GetNextPage finds the next page in navigation
func (r *ContentRepository) GetNextPage(ctx context.Context, content *repository.Content) (*repository.Content, error) {
	// No next page for level 3
	if content.Type == "level3" {
		return nil, nil
	}
	
	// Build regex pattern for finding next page
	parent := repository.ParentURIFragment(content.URI)
	pattern := fmt.Sprintf("^(%s|%s)/[^/]+$", regexp.QuoteMeta(content.URI), regexp.QuoteMeta(parent))
	
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
	
	filter := bson.M{
		"uri":   bson.M{"$regex": pattern},
		"title": content.Title,
		"type":  bson.M{"$in": allowedTypes},
	}
	
	var mc mongoContent
	err := r.collection.FindOne(ctx, filter, options.FindOne().SetSort(bson.D{{Key: "type", Value: 1}})).Decode(&mc)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	
	return toRepositoryContent(&mc), nil
}

// GetInvalidLinks returns invalid links in the content body
func (r *ContentRepository) GetInvalidLinks(ctx context.Context, content *repository.Content) ([]string, error) {
	links := repository.ExtractLinksFromHTML(content.Body)
	
	// Filter out external URLs and feedback links
	var internalLinks []string
	for _, link := range links {
		if !strings.Contains(link, "://") && !strings.HasSuffix(link, "/feedback") {
			internalLinks = append(internalLinks, strings.TrimPrefix(link, "/"))
		}
	}
	
	if len(internalLinks) == 0 {
		return []string{}, nil
	}
	
	// Check which links are valid
	validLinks := make(map[string]bool)
	
	// Check content collection
	contentFilter := bson.M{"uri": bson.M{"$in": internalLinks}}
	cursor, err := r.collection.Find(ctx, contentFilter, options.Find().SetProjection(bson.M{"uri": 1}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	
	for cursor.Next(ctx) {
		var result struct{ URI string `bson:"uri"` }
		if err := cursor.Decode(&result); err == nil {
			validLinks["/"+result.URI] = true
		}
	}
	
	// Check videos collection
	videoColl := r.db.Collection("videos")
	videoCursor, err := videoColl.Find(ctx, contentFilter, options.Find().SetProjection(bson.M{"uri": 1}))
	if err == nil {
		defer videoCursor.Close(ctx)
		for videoCursor.Next(ctx) {
			var result struct{ URI string `bson:"uri"` }
			if err := videoCursor.Decode(&result); err == nil {
				validLinks["/"+result.URI] = true
			}
		}
	}
	
	// Check images collection
	imageColl := r.db.Collection("images")
	imageCursor, err := imageColl.Find(ctx, contentFilter, options.Find().SetProjection(bson.M{"uri": 1}))
	if err == nil {
		defer imageCursor.Close(ctx)
		for imageCursor.Next(ctx) {
			var result struct{ URI string `bson:"uri"` }
			if err := imageCursor.Decode(&result); err == nil {
				validLinks["/"+result.URI] = true
			}
		}
	}
	
	// Find invalid links
	var invalidLinks []string
	for _, link := range internalLinks {
		if !validLinks["/"+link] && !validLinks[link] {
			if !strings.HasPrefix(link, "/") {
				link = "/" + link
			}
			invalidLinks = append(invalidLinks, link)
		}
	}
	
	return invalidLinks, nil
}

// GetMatchedParagraph finds a paragraph matching the given pattern
func (r *ContentRepository) GetMatchedParagraph(content *repository.Content, pattern *regexp.Regexp) []string {
	doc, err := html.Parse(strings.NewReader(content.Body))
	if err != nil {
		return nil
	}
	
	var search func(*html.Node) []string
	search = func(n *html.Node) []string {
		if n.Type == html.ElementNode {
			switch n.Data {
			case "p", "li", "td", "h1", "h2", "h3", "h4", "h5":
				text := repository.ExtractText(n)
				if matches := pattern.FindStringSubmatch(text); matches != nil {
					return matches
				}
			}
		}
		
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			if result := search(c); result != nil {
				return result
			}
		}
		return nil
	}
	
	return search(doc)
}
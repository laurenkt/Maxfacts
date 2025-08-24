package models

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/net/html"
)

// Content represents a content page in the system
type Content struct {
	ID                primitive.ObjectID `bson:"_id,omitempty"`
	URI               string             `bson:"uri"`
	Title             string             `bson:"title"`
	Type              string             `bson:"type"`
	Body              string             `bson:"body,omitempty"`
	Description       string             `bson:"description,omitempty"`
	Surtitle          string             `bson:"surtitle,omitempty"`
	RedirectURI       string             `bson:"redirect_uri,omitempty"`
	Hide              bool               `bson:"hide"`
	FurtherReadingURI string             `bson:"further_reading_uri,omitempty"`
	HasSublist        bool               `bson:"has_sublist"`
	Authorship        string             `bson:"authorship,omitempty"`
	Order             int                `bson:"order"`
	Contents          []ContentItem      `bson:"contents,omitempty"`
	UpdatedAt         time.Time          `bson:"updatedAt,omitempty"`
	CreatedAt         time.Time          `bson:"createdAt,omitempty"`
	
	// Virtual fields (not stored in DB)
	Breadcrumbs    []Breadcrumb       `bson:"-"`
	Directory      [][]Content        `bson:"-"`
	Selected       map[string]string  `bson:"-"`
	Depth          int                `bson:"-"`
	NextPage       *Content           `bson:"-"`
	FurtherReading *Content           `bson:"-"`
	InvalidURIs    []string           `bson:"-"`
	EditURI        string             `bson:"-"`
	Alphabetical   map[string][]Content `bson:"-"`
	Sublist        []Content          `bson:"-"`
}

// ContentItem represents a table of contents item
type ContentItem struct {
	Text string `bson:"text"`
	ID   string `bson:"id"`
}

// Breadcrumb represents a navigation breadcrumb
type Breadcrumb struct {
	Title string `bson:"title"`
	URI   string `bson:"uri"`
}

// ContentModel provides methods for content operations
type ContentModel struct {
	collection *mongo.Collection
	db         *mongo.Database
}

// NewContentModel creates a new content model
func NewContentModel(db *mongo.Database) *ContentModel {
	return &ContentModel{
		collection: db.Collection("contents"),
		db:         db,
	}
}

// FindOne finds a single content by URI
func (m *ContentModel) FindOne(ctx context.Context, uri string) (*Content, error) {
	var content Content
	err := m.collection.FindOne(ctx, bson.M{"uri": uri}).Decode(&content)
	if err != nil {
		return nil, err
	}
	return &content, nil
}

// Find finds content matching the filter
func (m *ContentModel) Find(ctx context.Context, filter bson.M, opts *options.FindOptions) (*mongo.Cursor, error) {
	return m.collection.Find(ctx, filter, opts)
}

// FindFromParentURI finds content with a specific parent URI
func (m *ContentModel) FindFromParentURI(ctx context.Context, parent string) ([]Content, error) {
	var pattern string
	if parent != "" {
		pattern = fmt.Sprintf("^%s/[^/]+$", regexp.QuoteMeta(parent))
	} else {
		pattern = "^[^/]+$"
	}
	
	filter := bson.M{"uri": bson.M{"$regex": pattern}}
	cursor, err := m.collection.Find(ctx, filter, options.Find().SetSort(bson.D{{"order", 1}, {"title", 1}, {"description", 1}, {"surtitle", 1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	
	var contents []Content
	if err = cursor.All(ctx, &contents); err != nil {
		return nil, err
	}
	return contents, nil
}

// FindFromAdjacentURI finds content adjacent to a given URI
func (m *ContentModel) FindFromAdjacentURI(ctx context.Context, uri string) ([]Content, error) {
	parent := ParentURIFragment(uri)
	return m.FindFromParentURI(ctx, parent)
}

// GetBreadcrumbs returns breadcrumbs for a content item
func (m *ContentModel) GetBreadcrumbs(ctx context.Context, content *Content) ([]Breadcrumb, error) {
	lineage := GetLineageFromURI(ParentURIFragment(content.URI))
	
	// Find all parent pages
	filter := bson.M{"uri": bson.M{"$in": lineage}}
	cursor, err := m.collection.Find(ctx, filter, options.Find().SetSort(bson.D{{"uri", 1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	
	var parents []Content
	if err = cursor.All(ctx, &parents); err != nil {
		return nil, err
	}
	
	// Convert to breadcrumbs
	breadcrumbs := make([]Breadcrumb, len(parents))
	for i, p := range parents {
		breadcrumbs[i] = Breadcrumb{
			Title: p.Title,
			URI:   p.URI,
		}
	}
	
	return breadcrumbs, nil
}

// GetChildren returns child pages of a content item
func (m *ContentModel) GetChildren(ctx context.Context, content *Content) ([]Content, error) {
	return m.FindFromParentURI(ctx, content.URI)
}

// GetNextPage finds the next page in navigation
func (m *ContentModel) GetNextPage(ctx context.Context, content *Content) (*Content, error) {
	// No next page for level 3
	if content.Type == "level3" {
		return nil, nil
	}
	
	// Build regex pattern for finding next page
	parent := ParentURIFragment(content.URI)
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
	
	var next Content
	err := m.collection.FindOne(ctx, filter, options.FindOne().SetSort(bson.D{{"type", 1}})).Decode(&next)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	
	return &next, nil
}

// GetInvalidLinks returns invalid links in the content body
func (m *ContentModel) GetInvalidLinks(ctx context.Context, content *Content) ([]string, error) {
	links := ExtractLinksFromHTML(content.Body)
	
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
	cursor, err := m.collection.Find(ctx, contentFilter, options.Find().SetProjection(bson.M{"uri": 1}))
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
	videoColl := m.db.Collection("videos")
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
	imageColl := m.db.Collection("images")
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
func (m *ContentModel) GetMatchedParagraph(content *Content, pattern *regexp.Regexp) []string {
	doc, err := html.Parse(strings.NewReader(content.Body))
	if err != nil {
		return nil
	}
	
	var search func(*html.Node) []string
	search = func(n *html.Node) []string {
		if n.Type == html.ElementNode {
			switch n.Data {
			case "p", "li", "td", "h1", "h2", "h3", "h4", "h5":
				text := extractText(n)
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

// Helper functions

// ParentURIFragment returns the parent URI of a given URI
func ParentURIFragment(uri string) string {
	parts := strings.Split(uri, "/")
	if len(parts) <= 1 {
		return ""
	}
	return strings.Join(parts[:len(parts)-1], "/")
}

// GetLineageFromURI returns all parent URIs up to root
func GetLineageFromURI(uri string) []string {
	var fragments []string
	parent := uri
	for parent != "" {
		fragments = append(fragments, parent)
		parent = ParentURIFragment(parent)
	}
	
	// Reverse the array
	for i, j := 0, len(fragments)-1; i < j; i, j = i+1, j-1 {
		fragments[i], fragments[j] = fragments[j], fragments[i]
	}
	
	return fragments
}

// NormalizeURI normalizes a URI to acceptable format
func NormalizeURI(uri string) string {
	// All lowercase
	uri = strings.ToLower(uri)
	// Convert spaces and underscores to dashes
	uri = regexp.MustCompile(`[_ -]+`).ReplaceAllString(uri, "-")
	// Remove duplicate slashes
	uri = regexp.MustCompile(`/+`).ReplaceAllString(uri, "/")
	// Remove leading/trailing slashes or dashes
	uri = regexp.MustCompile(`^[/-]+|[/-]+$`).ReplaceAllString(uri, "")
	// Remove invalid characters
	uri = regexp.MustCompile(`[^a-z0-9-/]+`).ReplaceAllString(uri, "")
	
	return uri
}

// ExtractLinksFromHTML extracts all links from HTML content
func ExtractLinksFromHTML(htmlContent string) []string {
	doc, err := html.Parse(strings.NewReader(htmlContent))
	if err != nil {
		return []string{}
	}
	
	var links []string
	var extract func(*html.Node)
	extract = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "a" {
			for _, attr := range n.Attr {
				if attr.Key == "href" {
					links = append(links, attr.Val)
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			extract(c)
		}
	}
	
	extract(doc)
	return links
}

// extractText recursively extracts text from an HTML node
func extractText(n *html.Node) string {
	if n.Type == html.TextNode {
		return n.Data
	}
	
	var text string
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		text += extractText(c)
	}
	return text
}
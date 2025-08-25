package repository

import (
	"time"
)

// Content represents a content page in the system
type Content struct {
	ID                string
	ContentID         string
	URI               string
	Title             string
	Type              string
	Body              string
	Description       string
	Surtitle          string
	RedirectURI       string
	Hide              bool
	FurtherReadingURI string
	HasSublist        bool
	Authorship        string
	Order             int
	Contents          []ContentItem
	UpdatedAt         time.Time
	CreatedAt         time.Time
	
	// Virtual fields (not stored in DB)
	Breadcrumbs    []Breadcrumb
	Directory      [][]Content
	Selected       map[string]string
	Depth          int
	NextPage       *Content
	FurtherReading *Content
	InvalidURIs    []string
	EditURI        string
	Alphabetical   map[string][]Content
	Sublist        []Content
}

// ContentItem represents a table of contents item
type ContentItem struct {
	Text string
	ID   string
}

// Breadcrumb represents a navigation breadcrumb
type Breadcrumb struct {
	Title string
	URI   string
	ID    string
}

// Recipe represents a recipe in the system
type Recipe struct {
	ID          string
	RecipeID    string
	Title       string
	Tags        []string
	Description interface{}
	Ingredients interface{}
	Method      interface{}
	Variations  interface{}
	Tip         interface{}
	UpdatedAt   time.Time
	CreatedAt   time.Time
	
	// Virtual fields
	URI         string
	Breadcrumbs []Breadcrumb
}

// Video represents a video in the system
type Video struct {
	ID        string
	URI       string
	Name      string
	YoutubeID string
	Filename  string
	Thumbnail string
	Titles    string
	UpdatedAt time.Time
	CreatedAt time.Time
	
	// Virtual fields
	Breadcrumbs []Breadcrumb
}
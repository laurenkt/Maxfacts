package markdown

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/maxfacts/maxfacts/pkg/repository"
)

// Ensure VideoRepository implements the interface
var _ repository.VideoRepository = &VideoRepository{}

// VideoRepository provides file-based video operations
type VideoRepository struct {
	videoDir string
	uriIndex map[string]string // URI -> ID mapping
	videos   map[string]*repository.Video // ID -> Video (cache)
}

// NewVideoRepository creates a new file-based video repository
func NewVideoRepository(videoDir string) (*VideoRepository, error) {
	repo := &VideoRepository{
		videoDir: videoDir,
		uriIndex: make(map[string]string),
		videos:   make(map[string]*repository.Video),
	}

	// Load all videos and build index from files directly
	if err := repo.loadAllVideos(); err != nil {
		return nil, fmt.Errorf("failed to load videos: %w", err)
	}

	return repo, nil
}

// loadAllVideos loads all videos from markdown files and builds the URI index
func (r *VideoRepository) loadAllVideos() error {
	entries, err := os.ReadDir(r.videoDir)
	if err != nil {
		return fmt.Errorf("failed to read video directory: %w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".md") {
			continue
		}

		videoID := strings.TrimSuffix(entry.Name(), ".md")
		filePath := filepath.Join(r.videoDir, entry.Name())
		
		video, err := r.loadVideoFromFile(filePath, videoID)
		if err != nil {
			// Log error but continue loading other videos
			fmt.Printf("Warning: failed to load video %s: %v\n", videoID, err)
			continue
		}

		r.videos[videoID] = video
		
		// Build URI index entry from the loaded video
		if video.URI != "" {
			r.uriIndex[video.URI] = videoID
		}
	}

	return nil
}

// loadVideoFromFile loads a single video from a markdown file
func (r *VideoRepository) loadVideoFromFile(filePath string, videoID string) (*repository.Video, error) {
	// Read file
	content, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	// Parse frontmatter
	fm, _, err := parseGenericFrontmatter(string(content))
	if err != nil {
		return nil, fmt.Errorf("failed to parse frontmatter: %w", err)
	}

	// Create video from frontmatter
	video := &repository.Video{
		ID:        videoID,
		URI:       getString(fm, "uri"),
		Name:      getString(fm, "name"),
		YoutubeID: getString(fm, "youtube_id"),
		Filename:  getString(fm, "filename"),
		Thumbnail: getString(fm, "thumbnail"),
		Titles:    getString(fm, "titles"),
		UpdatedAt: getTime(fm, "updated_at"),
		CreatedAt: getTime(fm, "created_at"),
	}
	
	// Normalize line endings in titles to match MongoDB format
	if video.Titles != "" {
		// Convert Unix line endings to Windows line endings and trim trailing newline
		video.Titles = strings.TrimSuffix(video.Titles, "\n")
		video.Titles = strings.ReplaceAll(video.Titles, "\n", "\r\n")
	}

	return video, nil
}

// FindOne finds a video by URI
func (r *VideoRepository) FindOne(ctx context.Context, uri string) (*repository.Video, error) {
	// Clean URI (remove leading slash if present)
	cleanURI := strings.TrimPrefix(uri, "/")
	
	// Look up ID from URI
	id, exists := r.uriIndex[cleanURI]
	if !exists {
		return nil, fmt.Errorf("video not found: %s", uri)
	}

	video, exists := r.videos[id]
	if !exists {
		return nil, fmt.Errorf("video data not found: %s", id)
	}

	// Return a copy to prevent modification
	result := *video
	return &result, nil
}

// FindAll returns all videos sorted by URI
func (r *VideoRepository) FindAll(ctx context.Context) ([]repository.Video, error) {
	// Convert map to slice
	videos := make([]repository.Video, 0, len(r.videos))
	for _, video := range r.videos {
		videos = append(videos, *video)
	}

	// Sort by URI
	sort.Slice(videos, func(i, j int) bool {
		return videos[i].URI < videos[j].URI
	})

	return videos, nil
}
package markdown

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/maxfacts/maxfacts/pkg/repository"
	"gopkg.in/yaml.v3"
)

// Ensure RecipeRepository implements the interface
var _ repository.RecipeRepository = &RecipeRepository{}

// RecipeRepository provides file-based recipe operations
type RecipeRepository struct {
	recipeDir string
	uriIndex  map[string]string // URI -> RecipeID mapping
	recipes   map[string]*repository.Recipe // RecipeID -> Recipe (cache)
}

// NewRecipeRepository creates a new file-based recipe repository
func NewRecipeRepository(recipeDir string) (*RecipeRepository, error) {
	repo := &RecipeRepository{
		recipeDir: recipeDir,
		uriIndex:  make(map[string]string),
		recipes:   make(map[string]*repository.Recipe),
	}

	// Load all recipes and build index from files directly
	if err := repo.loadAllRecipes(); err != nil {
		return nil, fmt.Errorf("failed to load recipes: %w", err)
	}

	return repo, nil
}

// loadAllRecipes loads all recipes from markdown files (including subdirectories) and builds the URI index
func (r *RecipeRepository) loadAllRecipes() error {
	return filepath.WalkDir(r.recipeDir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// Skip directories and non-markdown files
		if d.IsDir() || !strings.HasSuffix(d.Name(), ".md") {
			return nil
		}

		// Calculate recipe ID from relative path
		relPath, err := filepath.Rel(r.recipeDir, path)
		if err != nil {
			fmt.Printf("Warning: failed to get relative path for %s: %v\n", path, err)
			return nil
		}
		
		recipeID := strings.TrimSuffix(relPath, ".md")
		// Convert back slashes to forward slashes for consistent recipe IDs
		recipeID = strings.ReplaceAll(recipeID, "\\", "/")
		
		recipe, err := r.loadRecipeFromFile(path, recipeID)
		if err != nil {
			// Log error but continue loading other recipes
			fmt.Printf("Warning: failed to load recipe %s: %v\n", recipeID, err)
			return nil
		}

		r.recipes[recipeID] = recipe
		
		// Build URI index entry from the loaded recipe
		if recipe.URI != "" {
			r.uriIndex[recipe.URI] = recipeID
		}
		return nil
	})
}

// loadRecipeFromFile loads a single recipe from a markdown file
func (r *RecipeRepository) loadRecipeFromFile(filePath string, recipeID string) (*repository.Recipe, error) {
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

	// Create recipe from frontmatter
	recipe := &repository.Recipe{
		ID:       getString(fm, "id"),
		RecipeID: recipeID,
		Title:    getString(fm, "title"),
		Tags:     getStringArray(fm, "tags"),
		URI:      "help/oral-food/recipes/" + recipeID, // Build URI from recipe ID
	}

	// Handle complex fields
	if val, exists := fm["description"]; exists {
		recipe.Description = val
	}
	if val, exists := fm["ingredients"]; exists {
		recipe.Ingredients = val
	}
	if val, exists := fm["method"]; exists {
		recipe.Method = val
	}
	if val, exists := fm["variations"]; exists {
		recipe.Variations = val
	}
	if val, exists := fm["tip"]; exists {
		recipe.Tip = val
	}

	// Handle dates
	recipe.UpdatedAt = getTime(fm, "updated_at")
	recipe.CreatedAt = getTime(fm, "created_at")

	return recipe, nil
}

// FindAll returns all recipes sorted by title
func (r *RecipeRepository) FindAll(ctx context.Context) ([]repository.Recipe, error) {
	// Convert map to slice
	recipes := make([]repository.Recipe, 0, len(r.recipes))
	for _, recipe := range r.recipes {
		recipes = append(recipes, *recipe)
	}

	// Sort by title
	sort.Slice(recipes, func(i, j int) bool {
		return recipes[i].Title < recipes[j].Title
	})

	return recipes, nil
}

// FindOne finds a recipe by recipe ID (not MongoDB ID)
func (r *RecipeRepository) FindOne(ctx context.Context, id string) (*repository.Recipe, error) {
	// The id parameter here is the recipe ID from the URL path
	// e.g., "butternut-squash-mousse"
	recipe, exists := r.recipes[id]
	if !exists {
		return nil, fmt.Errorf("recipe not found: %s", id)
	}

	// Return a copy to prevent modification
	result := *recipe
	return &result, nil
}

// parseGenericFrontmatter parses YAML frontmatter from markdown content
func parseGenericFrontmatter(content string) (map[string]interface{}, string, error) {
	// Check if content starts with frontmatter delimiter
	if !strings.HasPrefix(content, "---\n") {
		return nil, content, nil
	}

	// Find the end of frontmatter
	scanner := bufio.NewScanner(strings.NewReader(content))
	var frontmatterLines []string
	var foundEnd bool
	lineNum := 0

	for scanner.Scan() {
		lineNum++
		line := scanner.Text()
		
		if lineNum == 1 {
			continue // Skip first "---"
		}
		
		if line == "---" {
			foundEnd = true
			break
		}
		
		frontmatterLines = append(frontmatterLines, line)
	}

	if !foundEnd {
		return nil, "", fmt.Errorf("frontmatter end delimiter not found")
	}

	// Parse YAML
	frontmatterContent := strings.Join(frontmatterLines, "\n")
	var fm map[string]interface{}
	if err := yaml.Unmarshal([]byte(frontmatterContent), &fm); err != nil {
		return nil, "", fmt.Errorf("failed to parse YAML frontmatter: %w", err)
	}

	// Get remaining content
	bodyStart := strings.Index(content, "\n---\n")
	if bodyStart == -1 {
		return fm, "", nil
	}
	bodyStart += 5 // Skip past "\n---\n"
	
	body := ""
	if bodyStart < len(content) {
		body = content[bodyStart:]
	}

	return fm, body, nil
}

// Helper functions to extract values from frontmatter
func getString(fm map[string]interface{}, key string) string {
	if val, ok := fm[key]; ok {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return ""
}

func getStringArray(fm map[string]interface{}, key string) []string {
	if val, ok := fm[key]; ok {
		// Handle []interface{} type
		if arr, ok := val.([]interface{}); ok {
			result := make([]string, 0, len(arr))
			for _, item := range arr {
				if str, ok := item.(string); ok {
					result = append(result, str)
				}
			}
			return result
		}
		// Handle []string type directly
		if arr, ok := val.([]string); ok {
			return arr
		}
	}
	return nil
}

func getTime(fm map[string]interface{}, key string) time.Time {
	if val, ok := fm[key]; ok {
		if str, ok := val.(string); ok {
			if t, err := time.Parse(time.RFC3339, str); err == nil {
				return t
			}
		}
		// Handle time.Time type directly
		if t, ok := val.(time.Time); ok {
			return t
		}
	}
	return time.Time{}
}
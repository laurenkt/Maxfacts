package markdown

import (
	"context"
	"encoding/csv"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/maxfacts/maxfacts/pkg/repository"
	"gopkg.in/yaml.v3"
)

// RecipeWriter implements repository.RecipeWriter for markdown files
type RecipeWriter struct {
	outputDir string
}

// NewRecipeWriter creates a new markdown recipe writer
func NewRecipeWriter(outputDir string) (*RecipeWriter, error) {
	// Create output directory if it doesn't exist
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create output directory: %w", err)
	}
	
	return &RecipeWriter{
		outputDir: outputDir,
	}, nil
}

// WriteOne writes a single recipe item to a markdown file
func (w *RecipeWriter) WriteOne(ctx context.Context, recipe *repository.Recipe) error {
	if recipe.RecipeID == "" {
		return fmt.Errorf("recipe ID is empty")
	}
	
	// Use the RecipeID as filename, handling slashes by creating directories
	filename := fmt.Sprintf("%s.md", recipe.RecipeID)
	fullPath := filepath.Join(w.outputDir, filename)
	
	// Create directory structure if recipe ID contains slashes
	dir := filepath.Dir(fullPath)
	if dir != w.outputDir {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("failed to create directory %s: %w", dir, err)
		}
	}
	
	// Convert to markdown
	markdown := convertRecipeToMarkdown(recipe)
	
	// Write to file
	if err := os.WriteFile(fullPath, []byte(markdown), 0644); err != nil {
		return fmt.Errorf("failed to write file %s: %w", filename, err)
	}
	
	return nil
}

// WriteIndex writes the URI-to-ID index CSV file for recipes
func (w *RecipeWriter) WriteIndex(ctx context.Context, recipes []repository.Recipe) error {
	// Sort recipes by URI for consistent ordering
	sort.Slice(recipes, func(i, j int) bool {
		return recipes[i].URI < recipes[j].URI
	})
	
	// Create CSV file
	csvPath := "data/markdown/index_recipes.csv"
	csvFile, err := os.Create(csvPath)
	if err != nil {
		return fmt.Errorf("failed to create CSV file: %w", err)
	}
	defer csvFile.Close()
	
	csvWriter := csv.NewWriter(csvFile)
	defer csvWriter.Flush()
	
	// Write CSV header
	if err := csvWriter.Write([]string{"uri", "recipe_id"}); err != nil {
		return fmt.Errorf("failed to write CSV header: %w", err)
	}
	
	// Write recipe data
	for _, recipe := range recipes {
		if err := csvWriter.Write([]string{recipe.URI, recipe.RecipeID}); err != nil {
			return fmt.Errorf("failed to write CSV row for %s: %w", recipe.URI, err)
		}
	}
	
	return nil
}

// convertRecipeToMarkdown converts a recipe item to markdown with YAML frontmatter
func convertRecipeToMarkdown(recipe *repository.Recipe) string {
	var sb strings.Builder
	
	// Add frontmatter
	sb.WriteString("---\n")
	sb.WriteString(fmt.Sprintf("id: %s\n", recipe.ID))
	sb.WriteString(fmt.Sprintf("recipe_id: %s\n", recipe.RecipeID))
	sb.WriteString(fmt.Sprintf("title: %s\n", recipe.Title))
	
	// Tags as YAML array
	if len(recipe.Tags) > 0 {
		sb.WriteString("tags:\n")
		for _, tag := range recipe.Tags {
			sb.WriteString(fmt.Sprintf("  - %s\n", tag))
		}
	}
	
	// Complex fields - serialize as YAML
	if recipe.Description != nil {
		yamlBytes, _ := yaml.Marshal(map[string]interface{}{"description": recipe.Description})
		lines := strings.Split(string(yamlBytes), "\n")
		for _, line := range lines {
			if line != "" && line != "---" {
				sb.WriteString(line + "\n")
			}
		}
	}
	
	if recipe.Ingredients != nil {
		yamlBytes, _ := yaml.Marshal(map[string]interface{}{"ingredients": recipe.Ingredients})
		lines := strings.Split(string(yamlBytes), "\n")
		for _, line := range lines {
			if line != "" && line != "---" {
				sb.WriteString(line + "\n")
			}
		}
	}
	
	if recipe.Method != nil {
		yamlBytes, _ := yaml.Marshal(map[string]interface{}{"method": recipe.Method})
		lines := strings.Split(string(yamlBytes), "\n")
		for _, line := range lines {
			if line != "" && line != "---" {
				sb.WriteString(line + "\n")
			}
		}
	}
	
	if recipe.Variations != nil {
		yamlBytes, _ := yaml.Marshal(map[string]interface{}{"variations": recipe.Variations})
		lines := strings.Split(string(yamlBytes), "\n")
		for _, line := range lines {
			if line != "" && line != "---" {
				sb.WriteString(line + "\n")
			}
		}
	}
	
	if recipe.Tip != nil {
		yamlBytes, _ := yaml.Marshal(map[string]interface{}{"tip": recipe.Tip})
		lines := strings.Split(string(yamlBytes), "\n")
		for _, line := range lines {
			if line != "" && line != "---" {
				sb.WriteString(line + "\n")
			}
		}
	}
	
	if !recipe.UpdatedAt.IsZero() {
		sb.WriteString(fmt.Sprintf("updated_at: %s\n", recipe.UpdatedAt.Format(time.RFC3339)))
	}
	
	if !recipe.CreatedAt.IsZero() {
		sb.WriteString(fmt.Sprintf("created_at: %s\n", recipe.CreatedAt.Format(time.RFC3339)))
	}
	
	sb.WriteString("---\n\n")
	
	// Recipes don't have body content in the current model
	
	return sb.String()
}
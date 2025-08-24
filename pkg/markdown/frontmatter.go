package markdown

import (
	"bufio"
	"fmt"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

// Content represents a markdown file with frontmatter
type Content struct {
	// Frontmatter fields
	ID                string    `yaml:"id"`
	URI               string    `yaml:"uri"`
	Title             string    `yaml:"title"`
	Type              string    `yaml:"type"`
	Body              string    `yaml:"body,omitempty"`
	Description       string    `yaml:"description,omitempty"`
	Surtitle          string    `yaml:"surtitle,omitempty"`
	RedirectURI       string    `yaml:"redirect_uri,omitempty"`
	Hide              bool      `yaml:"hide"`
	FurtherReadingURI string    `yaml:"further_reading_uri,omitempty"`
	HasSublist        bool      `yaml:"has_sublist"`
	Authorship        string    `yaml:"authorship,omitempty"`
	Order             int       `yaml:"order"`
	UpdatedAt         time.Time `yaml:"updated_at,omitempty"`
	CreatedAt         time.Time `yaml:"created_at,omitempty"`
	
	// Content body (after frontmatter)
	MarkdownBody string `yaml:"-"`
}

// ParseFrontmatter parses a markdown file with YAML frontmatter
func ParseFrontmatter(content string) (*Content, error) {
	// Check if content starts with frontmatter delimiter
	if !strings.HasPrefix(content, "---\n") {
		return nil, fmt.Errorf("no frontmatter found")
	}

	// Find the end of frontmatter
	scanner := bufio.NewScanner(strings.NewReader(content))
	var frontmatterLines []string
	var bodyLines []string
	inFrontmatter := false
	frontmatterEnded := false

	for scanner.Scan() {
		line := scanner.Text()
		
		if line == "---" {
			if !inFrontmatter {
				// Start of frontmatter
				inFrontmatter = true
				continue
			} else {
				// End of frontmatter
				frontmatterEnded = true
				continue
			}
		}

		if !frontmatterEnded && inFrontmatter {
			frontmatterLines = append(frontmatterLines, line)
		} else if frontmatterEnded {
			bodyLines = append(bodyLines, line)
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error scanning content: %w", err)
	}

	if !frontmatterEnded {
		return nil, fmt.Errorf("frontmatter not properly closed")
	}

	// Parse YAML frontmatter
	var result Content
	frontmatterYAML := strings.Join(frontmatterLines, "\n")
	if err := yaml.Unmarshal([]byte(frontmatterYAML), &result); err != nil {
		return nil, fmt.Errorf("error parsing frontmatter YAML: %w", err)
	}

	// Set the markdown body
	result.MarkdownBody = strings.Join(bodyLines, "\n")

	return &result, nil
}
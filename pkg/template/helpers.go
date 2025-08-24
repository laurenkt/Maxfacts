package template

import (
	"encoding/json"
	"fmt"
	"html"
	"text/template"
	"time"
)

// FuncMap returns the template functions
func FuncMap() template.FuncMap {
	return template.FuncMap{
		"toJSON":        toJSON,
		"date":          formatDate,
		"lookup":        lookup,
		"shift_headers": shiftHeaders,
		"safeHTML":      safeHTML,
		"dict":          dict,
		"add":           add,
		"sub":           sub,
		"htmlEscape":    htmlEscape,
	}
}

// toJSON converts an object to JSON string
func toJSON(v interface{}) string {
	b, err := json.Marshal(v)
	if err != nil {
		return "{}"
	}
	return string(b)
}

// formatDate formats a date similar to the Handlebars helper
func formatDate(t time.Time) string {
	// Format: weekday, day month year (UTC)
	// Example: Fri, 15 December 2023
	return t.UTC().Format("Mon, 2 January 2006")
}

// lookup performs a map lookup
func lookup(m map[string]string, key string) string {
	if val, ok := m[key]; ok {
		return val
	}
	return ""
}

// shiftHeaders adjusts heading levels in HTML (mimics Node.js behavior)
func shiftHeaders(offset int, htmlContent string) string {
	// The Node.js version has a placeholder sanitizer that just returns the input
	// So we do the same to maintain compatibility
	return htmlContent
}

// safeHTML marks a string as safe HTML
func safeHTML(s string) string {
	return s
}

// dict creates a map from key-value pairs
func dict(values ...interface{}) (map[string]interface{}, error) {
	if len(values)%2 != 0 {
		return nil, fmt.Errorf("dict expects an even number of arguments")
	}
	dict := make(map[string]interface{}, len(values)/2)
	for i := 0; i < len(values); i += 2 {
		key, ok := values[i].(string)
		if !ok {
			return nil, fmt.Errorf("dict keys must be strings")
		}
		dict[key] = values[i+1]
	}
	return dict, nil
}

// add performs addition
func add(a, b int) int {
	return a + b
}

// sub performs subtraction
func sub(a, b int) int {
	return a - b
}

// htmlEscape escapes HTML entities
func htmlEscape(s string) string {
	return html.EscapeString(s)
}
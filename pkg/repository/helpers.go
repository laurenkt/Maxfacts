package repository

import (
	"regexp"
	"strings"
	"golang.org/x/net/html"
)

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

// ExtractText recursively extracts text from an HTML node
func ExtractText(n *html.Node) string {
	if n.Type == html.TextNode {
		return n.Data
	}
	
	var text string
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		text += ExtractText(c)
	}
	return text
}
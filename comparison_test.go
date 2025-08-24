package main

import (
	"cmp"
	"context"
	"flag"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"github.com/laurenkt/gohtmldiff"
	"github.com/maxfacts/maxfacts/handlers"
	"github.com/maxfacts/maxfacts/pkg/mongodb"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/mongo"
)

var (
	testDB             *mongo.Database
	testRouter         *mux.Router
	testSitemapHandler *handlers.SitemapHandler
	testAll            = flag.Bool("all", false, "Test all URLs from sitemap instead of just configured endpoints")
	testOnly           = flag.String("only", "", "Test only a specific URL path (e.g., -only /help)")
)

// ComparisonResult holds the results of comparing a single URL
type ComparisonResult struct {
	Path            string
	Index           int
	TotalCount      int
	LocalHTML       string
	LocalStatus     int
	ReferenceHTML   string
	ReferenceStatus int
	LocalError      error
	ReferenceError  error
}

// Test endpoints to compare
var testEndpoints = []string{
	"/diagnosis/tests",
	"/",
	"/diagnosis/a-z/cancer/mouth-cancer",
	"/diagnosis/drugs/further-reading",
	"/help/oral-food/recipes",
	"/help/physiotherapy/videos/tmj",
	"/map.xml",
	"/feedback",
	"/treatment/radiotherapy/feedback",
	"/page/that/doesnt/exist",
	"/help/oral-food/recipes/almond--amaretto-semifreddo",
	"/legal",
	"/coming-soon",
	"/treatment/other/medication/miscellaneous",
	"/help/oral-food/recipes/pea-dumplings-with-cucumber/mint-yogurt",
	//"/search",
}

// Test binary endpoints to compare
var testBinaryEndpoints = []string{
	"/favicon.ico",
	"/images/circle-scaled.png",
}

// TestMain sets up the test environment
func TestMain(m *testing.M) {
	// Setup test database connection
	mongoURI := cmp.Or(os.Getenv("MONGO_URI"), "localhost:27017/maxfacts")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongodb.Connect(ctx, mongoURI)
	if err != nil {
		fmt.Printf("Failed to connect to MongoDB: %v\n", err)
		os.Exit(1)
	}
	defer client.Disconnect(context.Background())

	testDB = client.Database("maxfacts")

	// Use the same router setup as main.go
	testRouter = SetupRouter(testDB)

	// Initialize sitemap handler for shared URL collection
	testSitemapHandler = handlers.NewSitemapHandler(testDB)

	// Run tests
	code := m.Run()
	os.Exit(code)
}

// TestURLComparison compares local and reference outputs
// Use -all flag to test all URLs from sitemap, -only to test a specific URL, otherwise tests configured endpoints
func TestURLComparison(t *testing.T) {
	referenceURL := cmp.Or(os.Getenv("REFERENCE_URL"), "http://localhost:8080")

	var paths []string

	if *testOnly != "" {
		// Test only the specified URL
		paths = []string{*testOnly}
		t.Logf("Testing only URL: %s", *testOnly)
	} else if *testAll {
		// Get all URLs from sitemap
		ctx := context.Background()
		var err error
		paths, err = testSitemapHandler.CollectAllURLs(ctx)
		require.NoError(t, err, "Failed to collect URLs from database")

		// Sort alphabetically for consistent ordering
		sort.Strings(paths)

		t.Logf("Testing all %d URLs from sitemap", len(paths))
	} else {
		// Use configured test endpoints
		paths = testEndpoints
		t.Logf("Testing %d configured endpoints", len(paths))
	}

	// Test using futures pattern for parallel execution with ordered results
	testURLsWithFutures(t, paths, referenceURL)
}

// testURLsWithFutures tests URLs using parallel fetching with ordered results
func testURLsWithFutures(t *testing.T, paths []string, referenceURL string) {
	// Create futures pattern: slice of channels for ordered processing
	const maxConcurrency = 20
	const rateLimit = 25 * time.Millisecond

	semaphore := make(chan struct{}, maxConcurrency)
	rateLimiter := time.NewTicker(rateLimit)
	defer rateLimiter.Stop()

	futures := make([]<-chan *ComparisonResult, len(paths))

	// Dispatch all requests immediately, each returning a future
	for i, path := range paths {
		// Create a channel for this specific result
		future := make(chan *ComparisonResult, 1)
		futures[i] = future

		// Launch goroutine to fetch and send result
		go func(index int, urlPath string, resultChan chan<- *ComparisonResult) {
			// Acquire semaphore to limit concurrency
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			// Wait for rate limiter tick (blocks until allowed)
			<-rateLimiter.C

			result := &ComparisonResult{
				Path:       urlPath,
				Index:      index,
				TotalCount: len(paths),
			}

			// Fetch local response
			result.LocalHTML, result.LocalStatus, result.LocalError = getLocalResponse(urlPath)

			// Fetch reference response
			result.ReferenceHTML, result.ReferenceStatus, result.ReferenceError = getReferenceResponse(referenceURL + urlPath)

			// Send result and close channel
			resultChan <- result
			close(resultChan)
		}(i, path, future)
	}

	// Process results in order as they become available
	processedCount := 0
	for i, future := range futures {
		// Block on this future until result is available
		result := <-future

		// Check for fetch errors
		if result.LocalError != nil {
			t.Fatalf("Failed to get local response for %s (URL %d/%d): %v",
				result.Path, i+1, result.TotalCount, result.LocalError)
		}
		if result.ReferenceError != nil {
			t.Fatalf("Failed to get reference response for %s (URL %d/%d): %v",
				result.Path, i+1, result.TotalCount, result.ReferenceError)
		}

		// Compare status codes
		if result.LocalStatus != result.ReferenceStatus {
			t.Fatalf("Status code mismatch for %s (URL %d/%d): got %d, expected %d",
				result.Path, i+1, result.TotalCount, result.LocalStatus, result.ReferenceStatus)
		}

		// Compare HTML content only for 200 responses
		if result.LocalStatus == 200 && result.ReferenceStatus == 200 {
			compareHTMLResponses(t, result)
		}

		processedCount++
	}

	t.Logf("Completed comparison of %d URLs", processedCount)
}

// Original endpoint test preserved as separate focused test
func TestConfiguredEndpoints(t *testing.T) {
	// Skip if running all tests or testing a specific URL
	if *testAll || *testOnly != "" {
		t.Skip("Skipping configured endpoints test when -all or -only flag is set")
	}

	referenceURL := cmp.Or(os.Getenv("REFERENCE_URL"), "http://localhost:8080")

	for _, endpoint := range testEndpoints {
		t.Run(fmt.Sprintf("endpoint_%s", strings.ReplaceAll(endpoint, "/", "_")), func(t *testing.T) {
			// Get local response
			localHTML, localStatus, err := getLocalResponse(endpoint)
			require.NoError(t, err, "Failed to get local response for %s", endpoint)

			// Get reference response
			referenceHTML, referenceStatus, err := getReferenceResponse(referenceURL + endpoint)
			require.NoError(t, err, "Failed to get reference response for %s", endpoint)

			// Compare status codes first
			assert.Equal(t, referenceStatus, localStatus, "Status codes differ for endpoint %s", endpoint)

			// Only compare content if both have the same status code
			if referenceStatus == localStatus {
				// Normalize both responses for comparison
				normalizedLocal := normalizeHTML(localHTML)
				normalizedReference := normalizeHTML(referenceHTML)

				// Compare using gohtmldiff for better HTML comparison
				if diff, err := (&gohtmldiff.Differ{
					IgnoreWhitespace: true,
					CollapseBranches: true,
				}).Diff(normalizedReference, normalizedLocal); err != nil {
					t.Errorf("Failed to compare HTML for endpoint %s: %v", endpoint, err)
				} else if diff != "" {
					t.Errorf("HTML content differs for endpoint %s:\n%s", endpoint, diff)
				}
			}
		})
	}
}

// TestBinaryEndpointComparison compares binary files between local and reference
func TestBinaryEndpointComparison(t *testing.T) {
	referenceURL := cmp.Or(os.Getenv("REFERENCE_URL"), "http://localhost:8080")

	for _, endpoint := range testBinaryEndpoints {
		t.Run(fmt.Sprintf("binary_endpoint_%s", strings.ReplaceAll(endpoint, "/", "_")), func(t *testing.T) {
			// Get local response
			localData, localStatus, err := getLocalBinaryResponse(endpoint)
			require.NoError(t, err, "Failed to get local response for %s", endpoint)

			// Get reference response
			referenceData, referenceStatus, err := getReferenceBinaryResponse(referenceURL + endpoint)
			require.NoError(t, err, "Failed to get reference response for %s", endpoint)

			// Compare status codes
			assert.Equal(t, referenceStatus, localStatus, "Status codes differ for endpoint %s", endpoint)

			// Compare lengths
			assert.Equal(t, len(referenceData), len(localData), "Content lengths differ for endpoint %s", endpoint)

			// Compare binary content without showing diff
			contentMatch := len(localData) == len(referenceData) &&
				(len(localData) == 0 || string(localData) == string(referenceData))
			assert.Truef(t, contentMatch, "Binary content differs for endpoint %s (local: %d bytes, reference: %d bytes)",
				endpoint, len(localData), len(referenceData))
		})
	}
}

// getLocalResponse gets the response from our local Go handlers
func getLocalResponse(path string) (string, int, error) {
	req, err := http.NewRequest("GET", path, nil)
	if err != nil {
		return "", 0, err
	}

	// Create response recorder
	rr := httptest.NewRecorder()

	// Serve the request
	testRouter.ServeHTTP(rr, req)

	return rr.Body.String(), rr.Code, nil
}

// getReferenceResponse gets the response from the reference URL
func getReferenceResponse(url string) (string, int, error) {
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	resp, err := client.Get(url)
	if err != nil {
		return "", 0, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", resp.StatusCode, err
	}

	return string(body), resp.StatusCode, nil
}

// getLocalBinaryResponse gets binary response from our local Go handlers
func getLocalBinaryResponse(path string) ([]byte, int, error) {
	req, err := http.NewRequest("GET", path, nil)
	if err != nil {
		return nil, 0, err
	}

	// Create response recorder
	rr := httptest.NewRecorder()

	// Serve the request
	testRouter.ServeHTTP(rr, req)

	return rr.Body.Bytes(), rr.Code, nil
}

// getReferenceBinaryResponse gets binary response from the reference URL
func getReferenceBinaryResponse(url string) ([]byte, int, error) {
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	resp, err := client.Get(url)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, err
	}

	return body, resp.StatusCode, nil
}

// compareHTMLResponses compares HTML content and reports differences
func compareHTMLResponses(t *testing.T, result *ComparisonResult) {
	// Normalize both responses for comparison
	normalizedLocal := normalizeHTML(result.LocalHTML)
	normalizedReference := normalizeHTML(result.ReferenceHTML)

	// Compare using gohtmldiff for better HTML comparison
	if diff, err := (&gohtmldiff.Differ{
		IgnoreWhitespace: true,
		CollapseBranches: true,
	}).Diff(normalizedReference, normalizedLocal); err != nil {
		t.Fatalf("Failed to compare HTML for URL %s (URL %d/%d): %v",
			result.Path, result.Index+1, result.TotalCount, err)
	} else if diff != "" {
		t.Fatalf("HTML content differs for URL %s (URL %d/%d):\n%s",
			result.Path, result.Index+1, result.TotalCount, diff)
	}
}

// normalizeHTML normalizes HTML for comparison by removing dynamic content
func normalizeHTML(html string) string {
	return html
}

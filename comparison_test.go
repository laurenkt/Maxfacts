package main

import (
	"cmp"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"github.com/laurenkt/gohtmldiff"
	"github.com/maxfacts/maxfacts/pkg/mongodb"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/mongo"
)

var (
	testDB     *mongo.Database
	testRouter *mux.Router
)

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

	// Run tests
	code := m.Run()
	os.Exit(code)
}

// TestEndpointComparison compares local and reference outputs
func TestEndpointComparison(t *testing.T) {
	referenceURL := cmp.Or(os.Getenv("REFERENCE_URL"), "http://localhost:8080")

	for _, endpoint := range testEndpoints {
		t.Run(fmt.Sprintf("endpoint_%s", strings.ReplaceAll(endpoint, "/", "_")), func(t *testing.T) {
			// Get local response
			localHTML, err := getLocalResponse(endpoint)
			require.NoError(t, err, "Failed to get local response for %s", endpoint)

			// Get reference response
			referenceHTML, err := getReferenceResponse(referenceURL + endpoint)
			require.NoError(t, err, "Failed to get reference response for %s", endpoint)

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
func getLocalResponse(path string) (string, error) {
	req, err := http.NewRequest("GET", path, nil)
	if err != nil {
		return "", err
	}

	// Create response recorder
	rr := httptest.NewRecorder()

	// Serve the request
	testRouter.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		return "", fmt.Errorf("unexpected status code: %d, body: %s", rr.Code, rr.Body.String())
	}

	return rr.Body.String(), nil
}

// getReferenceResponse gets the response from the reference URL
func getReferenceResponse(url string) (string, error) {
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	resp, err := client.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	return string(body), nil
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

// normalizeHTML normalizes HTML for comparison by removing dynamic content
func normalizeHTML(html string) string {
	return html
}

// TestLocalEndpointsHealth tests that all local endpoints return 200
func TestLocalEndpointsHealth(t *testing.T) {
	for _, endpoint := range testEndpoints {
		t.Run(fmt.Sprintf("health_%s", strings.ReplaceAll(endpoint, "/", "_")), func(t *testing.T) {
			req, err := http.NewRequest("GET", endpoint, nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			testRouter.ServeHTTP(rr, req)

			assert.Equal(t, http.StatusOK, rr.Code,
				"Expected 200 OK for endpoint %s, got %d", endpoint, rr.Code)

			// Basic content structure check
			body := rr.Body.String()
			if strings.HasSuffix(endpoint, ".xml") {
				// XML endpoints
				assert.Contains(t, body, "<?xml", "Response should contain XML declaration")
				assert.Contains(t, body, "</urlset>", "Response should be complete XML")
			} else {
				// HTML endpoints
				assert.Contains(t, body, "<html", "Response should contain HTML")
				assert.Contains(t, body, "</html>", "Response should be complete HTML")
			}
		})
	}
}

// TestReferenceEndpointsHealth tests that reference endpoints are accessible
func TestReferenceEndpointsHealth(t *testing.T) {
	referenceURL := cmp.Or(os.Getenv("REFERENCE_URL"), "http://localhost:8080")

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	for _, endpoint := range testEndpoints {
		t.Run(fmt.Sprintf("reference_health_%s", strings.ReplaceAll(endpoint, "/", "_")), func(t *testing.T) {
			url := referenceURL + endpoint
			resp, err := client.Get(url)
			require.NoError(t, err, "Failed to fetch reference URL %s", url)
			defer resp.Body.Close()

			assert.Equal(t, http.StatusOK, resp.StatusCode,
				"Expected 200 OK for reference endpoint %s, got %d", url, resp.StatusCode)
		})
	}
}

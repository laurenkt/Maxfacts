package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func TestDashboardSmokeTest(t *testing.T) {
	// Create test server with dashboard enabled
	handler := SetupRouter(nil, true)
	server := httptest.NewServer(handler)
	defer server.Close()

	tests := []struct {
		name string
		path string
	}{
		{"Dashboard overview", "/dashboard"},
		{"Directory listing", "/dashboard/directory"},
		{"New content form", "/dashboard/directory/new"},
		{"Broken links page", "/dashboard/directory/broken-links"},
		{"Unattributed content page", "/dashboard/directory/unattributed"},
		{"Edit content page", "/dashboard/directory/diagnosis"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp, err := http.Get(server.URL + tt.path)
			if err != nil {
				t.Fatalf("Failed to make request to %s: %v", tt.path, err)
			}
			defer resp.Body.Close()

			// Read the response body to check for errors
			body := make([]byte, 8192)
			n, _ := resp.Body.Read(body)
			bodyStr := string(body[:n])
			
			// Check if response contains error indicators
			if strings.Contains(bodyStr, "Internal server error") || 
			   strings.Contains(bodyStr, "Error rendering template") ||
			   resp.StatusCode >= 400 {
				t.Fatalf("Dashboard endpoint %s failed:\nStatus: %d\nBody contains error: %s", 
					tt.path, resp.StatusCode, bodyStr)
			}
			
			// Check that page actually has content beyond just headers
			if !strings.Contains(bodyStr, "<main>") || strings.Contains(bodyStr, "template:") {
				t.Fatalf("Dashboard endpoint %s appears broken:\nStatus: %d\nBody: %s", 
					tt.path, resp.StatusCode, bodyStr[:min(1000, len(bodyStr))])
			}
			
			t.Logf("✅ Dashboard endpoint %s working correctly", tt.path)
		})
	}
}

func contains(str, substr string) bool {
	return len(str) >= len(substr) && 
		   (str == substr || 
			len(str) > len(substr) && 
			(str[:len(substr)] == substr || 
			 str[len(str)-len(substr):] == substr || 
			 indexOfSubstring(str, substr) >= 0))
}

func indexOfSubstring(str, substr string) int {
	for i := 0; i <= len(str)-len(substr); i++ {
		if str[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}
package main

import (
	"os"
)

// GetIndexCSV reads the index CSV from the filesystem
// We don't use embed here since the file may not exist at compile time
func GetIndexCSV() (string, error) {
	data, err := os.ReadFile("data/markdown/index_uri.csv")
	if err != nil {
		return "", err
	}
	return string(data), nil
}
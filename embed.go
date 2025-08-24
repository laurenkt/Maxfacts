package main

import (
	_ "embed"
)

// Embedded content index
//go:embed data/markdown/index_uri.csv
var indexCSV string
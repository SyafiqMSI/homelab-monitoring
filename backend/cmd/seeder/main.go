package main

import (
	"flag"
	"log"
	"os"

	"github.com/homelab/backend/config"
	"github.com/homelab/backend/database"
)

func main() {
	// Command line flags
	seedCmd := flag.Bool("seed", false, "Run database seeders")
	resetCmd := flag.Bool("reset", false, "Reset database and run seeders (WARNING: deletes all data)")
	migrateCmd := flag.Bool("migrate", false, "Run database migrations only")

	flag.Parse()

	// Load configuration
	cfg := config.Load()

	// Connect to database
	_, err := database.Connect(cfg)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Handle commands
	switch {
	case *resetCmd:
		log.Println("WARNING: This will delete all data!")
		log.Println("Press Ctrl+C within 5 seconds to cancel...")

		// Give user time to cancel
		// time.Sleep(5 * time.Second)

		if err := database.ResetDatabase(); err != nil {
			log.Fatal("Failed to reset database:", err)
		}
		os.Exit(0)

	case *seedCmd:
		// Run migrations first
		if err := database.Migrate(); err != nil {
			log.Fatal("Failed to run migrations:", err)
		}

		if err := database.Seed(); err != nil {
			log.Fatal("Failed to seed database:", err)
		}
		os.Exit(0)

	case *migrateCmd:
		if err := database.Migrate(); err != nil {
			log.Fatal("Failed to run migrations:", err)
		}
		os.Exit(0)

	default:
		log.Println("Homelab Database CLI")
		log.Println("")
		log.Println("Usage:")
		log.Println("  go run cmd/seeder/main.go [command]")
		log.Println("")
		log.Println("Commands:")
		log.Println("  -seed      Run database seeders")
		log.Println("  -migrate   Run database migrations only")
		log.Println("  -reset     Reset database and run seeders (WARNING: deletes all data)")
		log.Println("")
		log.Println("Examples:")
		log.Println("  go run cmd/seeder/main.go -seed")
		log.Println("  go run cmd/seeder/main.go -migrate")
		log.Println("  go run cmd/seeder/main.go -reset")
	}
}

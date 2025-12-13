package database

import (
	"log"
	"os"

	"github.com/homelab/backend/models"
)

// Seed runs all seeders
func Seed() error {
	log.Println("Running database seeders...")

	if err := SeedAdminUser(); err != nil {
		return err
	}

	if err := SeedDemoDevices(); err != nil {
		return err
	}

	if err := SeedDemoServices(); err != nil {
		return err
	}

	log.Println("Database seeding completed")
	return nil
}

// SeedAdminUser creates default admin user if not exists
func SeedAdminUser() error {
	log.Println("  → Seeding admin user...")

	var count int64
	DB.Model(&models.User{}).Where("email = ?", "admin@homelab.local").Count(&count)

	if count == 0 {
		password := os.Getenv("ADMIN_PASSWORD")
		if password == "" {
			password = "admin123"
			log.Println("WARNING: Using default admin password 'admin123'. Please change this immediately!")
		}

		// Don't hash password here - BeforeCreate hook will handle it
		admin := models.User{
			Email:    "admin@homelab.local",
			Username: "admin",
			Password: password, // Will be hashed by BeforeCreate hook
			Name:     "Administrator",
			Role:     "admin",
			IsActive: true,
		}

		if err := DB.Create(&admin).Error; err != nil {
			return err
		}
		log.Println("    Admin user created: admin@homelab.local / admin123")
	} else {
		log.Println("    Admin user already exists, skipping...")
	}

	return nil
}

// SeedDemoDevices creates demo devices for testing
func SeedDemoDevices() error {
	log.Println("  Seeding demo devices...")

	// Check if demo data already exists
	var deviceCount int64
	DB.Model(&models.Device{}).Count(&deviceCount)

	if deviceCount > 0 {
		log.Println("    Demo data already exists, skipping...")
		return nil
	}

	// Get admin user ID
	var admin models.User
	if err := DB.Where("email = ?", "admin@homelab.local").First(&admin).Error; err != nil {
		log.Println("    Admin user not found, skipping demo data...")
		return nil
	}

	// Seed demo devices
	devices := []models.Device{
		{
			UserID:      admin.ID,
			Name:        "Gaming PC",
			IP:          "192.168.1.100",
			MAC:         "AA:BB:CC:DD:EE:01",
			Type:        "pc",
			Brand:       "Custom Build",
			Model:       "RTX 4090 Build",
			Icon:        "monitor",
			Location:    "Living Room",
			Description: "Main gaming and workstation PC",
			IsActive:    true,
		},
		{
			UserID:      admin.ID,
			Name:        "MacBook Pro",
			IP:          "192.168.1.101",
			MAC:         "AA:BB:CC:DD:EE:02",
			Type:        "laptop",
			Brand:       "Apple",
			Model:       "MacBook Pro 14",
			Icon:        "laptop",
			Location:    "Office",
			Description: "Work laptop",
			IsActive:    true,
		},
		{
			UserID:      admin.ID,
			Name:        "Home Server",
			IP:          "192.168.1.10",
			MAC:         "AA:BB:CC:DD:EE:03",
			Type:        "server",
			Brand:       "Dell",
			Model:       "PowerEdge R720",
			Icon:        "server",
			Location:    "Server Rack",
			Description: "Main homelab server",
			IsActive:    true,
		},
		{
			UserID:      admin.ID,
			Name:        "iPhone 15 Pro",
			IP:          "192.168.1.150",
			MAC:         "AA:BB:CC:DD:EE:04",
			Type:        "phone",
			Brand:       "Apple",
			Model:       "iPhone 15 Pro Max",
			Icon:        "smartphone",
			Location:    "Mobile",
			Description: "Personal phone",
			IsActive:    true,
		},
		{
			UserID:      admin.ID,
			Name:        "Front Door Camera",
			IP:          "192.168.1.200",
			MAC:         "AA:BB:CC:DD:EE:05",
			Type:        "cctv",
			Brand:       "Hikvision",
			Model:       "DS-2CD2143G2",
			Icon:        "camera",
			Location:    "Front Door",
			Description: "Front entrance security camera",
			IsActive:    true,
		},
		{
			UserID:      admin.ID,
			Name:        "Main Router",
			IP:          "192.168.1.1",
			MAC:         "AA:BB:CC:DD:EE:06",
			Type:        "router",
			Brand:       "Ubiquiti",
			Model:       "Dream Machine Pro",
			Icon:        "router",
			Location:    "Server Rack",
			Description: "Main network router",
			IsActive:    true,
		},
	}

	for _, device := range devices {
		if err := DB.Create(&device).Error; err != nil {
			log.Printf("    Failed to create device %s: %v\n", device.Name, err)
		}
	}
	log.Printf("    Created %d demo devices\n", len(devices))

	return nil
}

// SeedDemoServices creates demo services for testing
func SeedDemoServices() error {
	log.Println("  Seeding demo services...")

	// Check if demo data already exists
	var serviceCount int64
	DB.Model(&models.ServiceConfig{}).Count(&serviceCount)

	if serviceCount > 0 {
		log.Println("    Services already exist, skipping...")
		return nil
	}

	// Get admin user ID
	var admin models.User
	if err := DB.Where("email = ?", "admin@homelab.local").First(&admin).Error; err != nil {
		log.Println("    Admin user not found, skipping services...")
		return nil
	}

	// Seed demo services based on user's actual homelab
	services := []models.ServiceConfig{
		// Media & Entertainment
		{
			UserID:        admin.ID,
			Name:          "Immich Photos",
			URL:           "https://photos.syafiqibra.site",
			Method:        "GET",
			Icon:          "image",
			Category:      "media",
			Description:   "Self-hosted photo and video backup",
			CheckInterval: 60,
			Timeout:       10,
			ExpectedCode:  200,
			IsActive:      true,
		},
		{
			UserID:        admin.ID,
			Name:          "Immich Photos (Safira)",
			URL:           "https://photos-safira.syafiqibra.site",
			Method:        "GET",
			Icon:          "image",
			Category:      "media",
			Description:   "Safira's photo backup",
			CheckInterval: 60,
			Timeout:       10,
			ExpectedCode:  200,
			IsActive:      true,
		},
		{
			UserID:        admin.ID,
			Name:          "Viseron",
			URL:           "https://viseron.syafiqibra.site",
			Method:        "GET",
			Icon:          "video",
			Category:      "media",
			Description:   "CCTV NVR and video analytics",
			CheckInterval: 60,
			Timeout:       10,
			ExpectedCode:  200,
			IsActive:      true,
		},
		{
			UserID:        admin.ID,
			Name:          "MediaMTX",
			URL:           "https://stream.syafiqibra.site",
			Method:        "GET",
			Icon:          "radio",
			Category:      "media",
			Description:   "RTSP/RTMP streaming server",
			CheckInterval: 60,
			Timeout:       10,
			ExpectedCode:  200,
			IsActive:      true,
		},

		// Storage & Backup
		{
			UserID:        admin.ID,
			Name:          "Nextcloud",
			URL:           "https://drive.syafiqibra.site",
			Method:        "GET",
			Icon:          "cloud",
			Category:      "storage",
			Description:   "Self-hosted cloud storage",
			CheckInterval: 60,
			Timeout:       10,
			ExpectedCode:  200,
			IsActive:      true,
		},
		{
			UserID:        admin.ID,
			Name:          "Filebrowser",
			URL:           "https://files.syafiqibra.site",
			Method:        "GET",
			Icon:          "folder",
			Category:      "storage",
			Description:   "Web file manager",
			CheckInterval: 60,
			Timeout:       10,
			ExpectedCode:  200,
			IsActive:      true,
		},

		// Development & DevOps
		{
			UserID:        admin.ID,
			Name:          "Portainer",
			URL:           "https://portainer.syafiqibra.site",
			Method:        "GET",
			Icon:          "container",
			Category:      "development",
			Description:   "Docker container management",
			CheckInterval: 60,
			Timeout:       10,
			ExpectedCode:  200,
			IsActive:      true,
		},
		{
			UserID:        admin.ID,
			Name:          "Komodo",
			URL:           "https://komodo.syafiqibra.site",
			Method:        "GET",
			Icon:          "terminal",
			Category:      "development",
			Description:   "Container orchestration",
			CheckInterval: 60,
			Timeout:       10,
			ExpectedCode:  200,
			IsActive:      true,
		},
		{
			UserID:        admin.ID,
			Name:          "Webtop",
			URL:           "https://desktop.syafiqibra.site",
			Method:        "GET",
			Icon:          "monitor",
			Category:      "development",
			Description:   "Web-based Linux desktop",
			CheckInterval: 60,
			Timeout:       10,
			ExpectedCode:  200,
			IsActive:      true,
		},

		// Automation
		{
			UserID:        admin.ID,
			Name:          "n8n",
			URL:           "https://n8n.syafiqibra.site",
			Method:        "GET",
			Icon:          "workflow",
			Category:      "automation",
			Description:   "Workflow automation platform",
			CheckInterval: 60,
			Timeout:       10,
			ExpectedCode:  200,
			IsActive:      true,
		},
		{
			UserID:        admin.ID,
			Name:          "WA Bot",
			URL:           "https://wabot.syafiqibra.site",
			Method:        "GET",
			Icon:          "message-circle",
			Category:      "automation",
			Description:   "WhatsApp bot automation",
			CheckInterval: 60,
			Timeout:       10,
			ExpectedCode:  200,
			IsActive:      true,
		},

		// Database
		{
			UserID:        admin.ID,
			Name:          "PostgreSQL",
			URL:           "192.168.1.10",
			Method:        "TCP",
			Port:          5432,
			Icon:          "database",
			Category:      "database",
			Description:   "Main PostgreSQL database",
			CheckInterval: 60,
			Timeout:       10,
			IsActive:      true,
		},
		{
			UserID:        admin.ID,
			Name:          "MySQL",
			URL:           "192.168.1.10",
			Method:        "TCP",
			Port:          3306,
			Icon:          "database",
			Category:      "database",
			Description:   "MySQL database server",
			CheckInterval: 60,
			Timeout:       10,
			IsActive:      true,
		},

		// Productivity
		{
			UserID:        admin.ID,
			Name:          "OJK Admin",
			URL:           "https://ojk-admin.syafiqibra.site",
			Method:        "GET",
			Icon:          "clipboard",
			Category:      "productivity",
			Description:   "OJK Admin Panel",
			CheckInterval: 60,
			Timeout:       10,
			ExpectedCode:  200,
			IsActive:      true,
		},
		{
			UserID:        admin.ID,
			Name:          "OJK Responden",
			URL:           "https://ojk-responden.syafiqibra.site",
			Method:        "GET",
			Icon:          "users",
			Category:      "productivity",
			Description:   "OJK Responden Portal",
			CheckInterval: 60,
			Timeout:       10,
			ExpectedCode:  200,
			IsActive:      true,
		},
		{
			UserID:        admin.ID,
			Name:          "ERP Frontend",
			URL:           "https://erp.syafiqibra.site",
			Method:        "GET",
			Icon:          "briefcase",
			Category:      "productivity",
			Description:   "ERP System Frontend",
			CheckInterval: 60,
			Timeout:       10,
			ExpectedCode:  200,
			IsActive:      true,
		},
		{
			UserID:        admin.ID,
			Name:          "SOAP App",
			URL:           "https://soap.syafiqibra.site",
			Method:        "GET",
			Icon:          "globe",
			Category:      "productivity",
			Description:   "SOAP Application",
			CheckInterval: 60,
			Timeout:       10,
			ExpectedCode:  200,
			IsActive:      true,
		},
	}

	for _, service := range services {
		if err := DB.Create(&service).Error; err != nil {
			log.Printf("    Failed to create service %s: %v\n", service.Name, err)
		}
	}
	log.Printf("    Created %d demo services\n", len(services))

	return nil
}

// ResetDatabase drops all tables and recreates them
func ResetDatabase() error {
	log.Println("Resetting database...")

	// Drop tables
	if err := DB.Migrator().DropTable(
		&models.Session{},
		&models.ServiceConfig{},
		&models.Device{},
		&models.User{},
	); err != nil {
		return err
	}

	log.Println("  → Tables dropped")

	// Recreate tables
	if err := Migrate(); err != nil {
		return err
	}

	// Seed data
	if err := Seed(); err != nil {
		return err
	}

	log.Println("Database reset completed")
	return nil
}

// SeedIfEmpty runs seeder only if database is empty
func SeedIfEmpty() error {
	var userCount int64
	DB.Model(&models.User{}).Count(&userCount)

	if userCount == 0 {
		return Seed()
	}

	log.Println("Database already has data, skipping seeder")
	return nil
}

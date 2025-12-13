package database

import (
	"log"

	"github.com/homelab/backend/config"
	"github.com/homelab/backend/models"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB is the global database connection
var DB *gorm.DB

// Connect establishes a connection to the database
func Connect(cfg *config.Config) (*gorm.DB, error) {
	var err error

	// Configure GORM logger
	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	}

	if cfg.GinMode == "release" {
		gormConfig.Logger = logger.Default.LogMode(logger.Silent)
	}

	// Connect based on DB_CONNECTION type
	if cfg.IsMySQL() {
		log.Println("Connecting to MySQL database...")
		DB, err = gorm.Open(mysql.Open(cfg.GetMySQLDSN()), gormConfig)
	} else {
		log.Println("Connecting to PostgreSQL database...")
		DB, err = gorm.Open(postgres.Open(cfg.GetPostgresDSN()), gormConfig)
	}

	if err != nil {
		return nil, err
	}

	log.Println("Database connected successfully")
	return DB, nil
}

// Migrate runs database migrations
func Migrate() error {
	log.Println("Running database migrations...")

	err := DB.AutoMigrate(
		&models.User{},
		&models.Session{},
		&models.Device{},
		&models.ServiceConfig{},
	)

	if err != nil {
		return err
	}

	log.Println("Database migrations completed")
	return nil
}

// GetDB returns the database instance
func GetDB() *gorm.DB {
	return DB
}

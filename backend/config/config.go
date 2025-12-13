package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the application
type Config struct {
	// Server
	Port    string
	GinMode string

	// Database
	DBConnection string // mysql or postgres
	DBHost       string
	DBPort       string
	DBUser       string
	DBPassword   string
	DBName       string

	// JWT
	JWTSecret      string
	JWTExpiryHours int

	// CORS
	FrontendURL string
}

// Global config instance
var AppConfig *Config

// Load reads configuration from environment variables
func Load() *Config {
	// Load .env file if exists
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	jwtSecret := getEnv("JWT_SECRET", "")
	if jwtSecret == "" {
		if getEnv("GIN_MODE", "debug") == "release" {
			log.Fatal("FATAL: JWT_SECRET environment variable must be set in production/release mode")
		}
		jwtSecret = "homelab-default-dev-secret-do-not-use-in-prod"
		log.Println("WARNING: JWT_SECRET is not set, using default insecure secret")
	}

	config := &Config{
		Port:         getEnv("PORT", "8080"),
		GinMode:      getEnv("GIN_MODE", "debug"),
		DBConnection: getEnv("DB_CONNECTION", ""),
		DBHost:       getEnv("DB_HOST", ""),
		DBPort:       getEnv("DB_PORT", ""),
		DBUser:       getEnv("DB_USER", ""),
		DBPassword:   getEnv("DB_PASSWORD", ""),
		DBName:       getEnv("DB_NAME", ""),
		JWTSecret:    jwtSecret,
		FrontendURL:  getEnv("FRONTEND_URL", "http://localhost:3000"),
	}

	// Parse JWT expiry hours
	expiryHours, err := strconv.Atoi(getEnv("JWT_EXPIRY_HOURS", "24"))
	if err != nil {
		expiryHours = 24
	}
	config.JWTExpiryHours = expiryHours

	AppConfig = config
	return config
}

// getEnv gets an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

// GetMySQLDSN returns the MySQL connection string
func (c *Config) GetMySQLDSN() string {
	return c.DBUser + ":" + c.DBPassword + "@tcp(" + c.DBHost + ":" + c.DBPort + ")/" + c.DBName + "?charset=utf8mb4&parseTime=True&loc=Local"
}

// GetPostgresDSN returns the PostgreSQL connection string
func (c *Config) GetPostgresDSN() string {
	return "host=" + c.DBHost +
		" user=" + c.DBUser +
		" password=" + c.DBPassword +
		" dbname=" + c.DBName +
		" port=" + c.DBPort +
		" sslmode=disable" +
		" TimeZone=Asia/Jakarta"
}

// IsMySQl returns true if using MySQL
func (c *Config) IsMySQL() bool {
	return c.DBConnection == "mysql"
}

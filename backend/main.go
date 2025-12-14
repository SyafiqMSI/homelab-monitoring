package main

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/homelab/backend/config"
	"github.com/homelab/backend/database"
	"github.com/homelab/backend/handlers"
	"github.com/homelab/backend/middleware"
	"github.com/homelab/backend/services"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func main() {
	// Load configuration
	cfg := config.Load()

	// Set Gin mode
	gin.SetMode(cfg.GinMode)

	// Connect to database
	_, err := database.Connect(cfg)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Run migrations
	if err := database.Migrate(); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	// Seed database if empty
	if err := database.SeedIfEmpty(); err != nil {
		log.Println("Warning: Failed to seed database:", err)
	}

	// Initialize router
	r := gin.Default()

	// CORS configuration
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.FrontendURL, "http://localhost:3000", "http://127.0.0.1:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Initialize services
	authService := services.NewAuthService()
	metricsService := services.NewMetricsService()
	dockerService := services.NewDockerService()
	deviceService := services.NewDeviceService()
	serviceConfigService := services.NewServiceConfigService()
	networkService := services.NewNetworkService()

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	metricsHandler := handlers.NewMetricsHandler(metricsService)
	dockerHandler := handlers.NewDockerHandler(dockerService)
	deviceHandler := handlers.NewDeviceHandler(deviceService)
	serviceHandler := handlers.NewServiceHandler(serviceConfigService)
	networkHandler := handlers.NewNetworkHandler(networkService)
	terminalHandler := handlers.NewTerminalHandler()

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"timestamp": time.Now(),
		})
	})

	// API routes
	api := r.Group("/api")
	{
		// Auth routes (public)
		auth := api.Group("/auth")
		{

			auth.POST("/login", authHandler.Login)
		}

		// Protected auth routes
		authProtected := api.Group("/auth")
		authProtected.Use(middleware.AuthMiddleware(authService))
		{
			authProtected.POST("/logout", authHandler.Logout)
			authProtected.GET("/profile", authHandler.GetProfile)
			authProtected.PUT("/profile", authHandler.UpdateProfile)
			authProtected.PUT("/password", authHandler.ChangePassword)
			authProtected.GET("/validate", authHandler.ValidateToken)
		}

		// Public metrics (for demo, can be protected)
		api.GET("/metrics", metricsHandler.GetSystemMetrics)
		api.GET("/metrics/cpu", metricsHandler.GetCPUMetrics)
		api.GET("/metrics/memory", metricsHandler.GetMemoryMetrics)
		api.GET("/metrics/disk", metricsHandler.GetDiskMetrics)
		api.GET("/metrics/network", metricsHandler.GetNetworkMetrics)
		api.GET("/metrics/history", metricsHandler.GetMetricsHistory)

		// Protected routes - require authentication
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(authService))
		{
			// Docker containers
			protected.GET("/containers", dockerHandler.GetContainers)
			protected.GET("/containers/:id", dockerHandler.GetContainer)
			protected.POST("/containers/:id/start", dockerHandler.StartContainer)
			protected.POST("/containers/:id/stop", dockerHandler.StopContainer)
			protected.POST("/containers/:id/restart", dockerHandler.RestartContainer)

			// Devices
			protected.GET("/devices", deviceHandler.GetDevices)
			protected.GET("/devices/types", deviceHandler.GetDeviceTypes)
			protected.GET("/devices/:id", deviceHandler.GetDevice)
			protected.POST("/devices", deviceHandler.CreateDevice)
			protected.PUT("/devices/:id", deviceHandler.UpdateDevice)
			protected.DELETE("/devices/:id", deviceHandler.DeleteDevice)
			protected.GET("/devices/:id/ping", deviceHandler.PingDevice)
			protected.POST("/devices/:id/wake", deviceHandler.WakeDevice)

			// Services
			protected.GET("/services", serviceHandler.GetServices)
			protected.GET("/services/categories", serviceHandler.GetCategories)
			protected.GET("/services/:id", serviceHandler.GetService)
			protected.POST("/services", serviceHandler.CreateService)
			protected.PUT("/services/:id", serviceHandler.UpdateService)
			protected.DELETE("/services/:id", serviceHandler.DeleteService)
			protected.GET("/services/:id/health", serviceHandler.CheckServiceHealth)

			// Network Tools
			protected.GET("/network/ping", networkHandler.GetPing)
			protected.GET("/network/speedtest", networkHandler.GetSpeedTest)
		}
	}

	// WebSocket for real-time metrics (with optional auth)
	r.GET("/ws/metrics", middleware.OptionalAuthMiddleware(authService), func(c *gin.Context) {
		handleWebSocket(c, metricsService)
	})

	// WebSocket for terminal (requires auth)
	r.GET("/ws/terminal", middleware.AuthMiddleware(authService), terminalHandler.HandleTerminalWS)

	log.Printf("Homelab Backend starting on :%s", cfg.Port)
	log.Printf("Frontend URL: %s", cfg.FrontendURL)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func handleWebSocket(c *gin.Context, metricsService *services.MetricsService) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}
	defer conn.Close()

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			metrics, err := metricsService.GetSystemMetrics()
			if err != nil {
				log.Println("Error getting metrics:", err)
				continue
			}
			if err := conn.WriteJSON(metrics); err != nil {
				log.Println("WebSocket write error:", err)
				return
			}
		}
	}
}

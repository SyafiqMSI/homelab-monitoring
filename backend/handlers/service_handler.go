package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/homelab/backend/middleware"
	"github.com/homelab/backend/models"
	"github.com/homelab/backend/services"
)

// ServiceHandler handles service-related HTTP requests
type ServiceHandler struct {
	serviceConfigService *services.ServiceConfigService
}

// NewServiceHandler creates a new ServiceHandler
func NewServiceHandler(serviceConfigService *services.ServiceConfigService) *ServiceHandler {
	return &ServiceHandler{
		serviceConfigService: serviceConfigService,
	}
}

// GetServices returns all services for the current user
// Use ?refresh=true to check all services status (slower)
func (h *ServiceHandler) GetServices(c *gin.Context) {
	userID := middleware.GetUserID(c)
	refresh := c.Query("refresh") == "true"

	var result []services.ServiceStatus
	var err error

	if refresh {
		result, err = h.serviceConfigService.GetServices(userID)
	} else {
		result, err = h.serviceConfigService.GetServicesBasic(userID)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetService returns a single service
func (h *ServiceHandler) GetService(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid service ID"})
		return
	}

	service, err := h.serviceConfigService.GetService(uint(id), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, service)
}

// CreateService creates a new service
func (h *ServiceHandler) CreateService(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var req models.ServiceConfig
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	service, err := h.serviceConfigService.CreateService(userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, service)
}

// UpdateService updates a service
func (h *ServiceHandler) UpdateService(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid service ID"})
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	service, err := h.serviceConfigService.UpdateService(uint(id), userID, updates)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, service)
}

// DeleteService deletes a service
func (h *ServiceHandler) DeleteService(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid service ID"})
		return
	}

	if err := h.serviceConfigService.DeleteService(uint(id), userID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "service deleted"})
}

// CheckServiceHealth checks the health of a service
func (h *ServiceHandler) CheckServiceHealth(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid service ID"})
		return
	}

	status, err := h.serviceConfigService.CheckServiceHealth(uint(id), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, status)
}

// GetCategories returns available service categories
func (h *ServiceHandler) GetCategories(c *gin.Context) {
	categories := []map[string]string{
		{"value": "media", "label": "Media & Entertainment", "icon": "play"},
		{"value": "storage", "label": "Storage & Backup", "icon": "hard-drive"},
		{"value": "network", "label": "Network & Security", "icon": "shield"},
		{"value": "monitoring", "label": "Monitoring & Logs", "icon": "activity"},
		{"value": "productivity", "label": "Productivity", "icon": "briefcase"},
		{"value": "development", "label": "Development", "icon": "code"},
		{"value": "database", "label": "Database", "icon": "database"},
		{"value": "automation", "label": "Automation", "icon": "zap"},
		{"value": "communication", "label": "Communication", "icon": "message-circle"},
		{"value": "other", "label": "Other", "icon": "grid"},
	}
	c.JSON(http.StatusOK, categories)
}
